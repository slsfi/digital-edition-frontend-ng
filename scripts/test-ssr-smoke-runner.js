const assert = require('node:assert/strict');
const { execFile } = require('node:child_process');
const fs = require('node:fs');
const http = require('node:http');
const os = require('node:os');
const path = require('node:path');
const { promisify } = require('node:util');
const { getTestCases, getRenderingErrors, runCheck, runTest } = require('./test-ssr-smoke');

const execFileAsync = promisify(execFile);

const ssrHtml = '<app-root ng-server-context="ssr"><page-home>Rendered content</page-home></app-root>';
const csrHtml = '<app-root></app-root>';

async function main() {
  assert.deepEqual(getRenderingErrors(ssrHtml, 'ssr'), []);
  assert.deepEqual(getRenderingErrors(csrHtml, 'csr'), []);
  assert.deepEqual(getRenderingErrors('<h1>404 Not Found</h1>', 'none'), []);
  assert.ok(getRenderingErrors(csrHtml, 'ssr').length);
  assert.ok(getRenderingErrors(ssrHtml, 'csr').length);
  assert.ok(getRenderingErrors('<app-root ng-server-context="ssr"></app-root>', 'ssr').length);
  assert.ok(getRenderingErrors('<app-root>Protected data</app-root>', 'csr').length);
  assert.ok(getRenderingErrors(csrHtml + '<script id="app-state">{"secret":"protected"}</script>', 'csr').length);
  assert.ok(getRenderingErrors(csrHtml, 'none').length);
  console.log('PASS: rendering checks reject CSR-for-SSR, protected SSR-for-CSR, and Angular static responses');

  const cases = [
    { name: 'Public', route: '/', checks: [{ type: 'includes', value: 'Rendered content' }] },
    { name: 'Protected', route: '/collection/203/text/20217', authProtected: true, checks: [{ type: 'includes', value: 'Protected data' }] },
    { name: 'Account', route: '/account', authOnly: true },
  ];
  const disabled = getTestCases(false, cases);
  const enabled = getTestCases(true, cases);
  assert.equal(disabled[1].renderMode, 'ssr');
  assert.equal(disabled[2].expectedStatus, 404);
  assert.equal(enabled[0].renderMode, 'ssr');
  assert.deepEqual(enabled[0].checks, cases[0].checks);
  assert.equal(enabled[1].renderMode, 'csr');
  assert.deepEqual(enabled[1].checks, []);
  assert.equal(enabled[2].expectedStatus, 200);
  assert.equal(enabled[2].renderMode, 'csr');
  console.log('PASS: auth expectations preserve public SSR and switch protected routes to CSR');

  assert.equal(runCheck(ssrHtml, { type: 'regex', value: /<page-home\b/ }, '').passed, true);
  assert.equal(runCheck(ssrHtml, { type: 'regex', value: /<page-missing\b/ }, '').passed, false);
  for (const value of ['<page-home', '(a+)+$', '/(a|aa)+$/', '/(?=a)a/', '/(?<word>a)\\k<word>/', { source: '<page-home' }]) {
    const result = runCheck(ssrHtml, { type: 'regex', value }, '');
    assert.equal(result.passed, false);
    assert.match(result.reason, /RegExp literal/);
  }
  assert.equal(runCheck('<p>(a+)+$</p>', { type: 'includes', value: '(a+)+$' }, '').passed, true);
  console.log('PASS: regex checks accept code-owned literals and reject external patterns; includes remains literal');

  // Exercise both HTTP implementations so redirect following and dropped Host
  // headers cannot hide a broken default-language or proxy-origin contract.
  const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Vary', 'User-Agent');
    if (req.url === '/redirect') {
      res.writeHead(302, { Location: '/rendered' });
      res.end();
    } else if (req.url === '/shell') {
      res.end(csrHtml);
    } else {
      res.end(ssrHtml + `<p>${req.headers.host}</p>`);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  try {
    const testCase = { name: 'Fixture', route: '/rendered', renderMode: 'ssr', checks: [] };
    assert.equal((await runTest(baseUrl, 5000, testCase)).passed, true);
    assert.equal((await runTest(baseUrl, 5000, { ...testCase, route: '/shell' })).passed, false);
    const redirected = await runTest(baseUrl, 5000, { ...testCase, route: '/redirect' });
    assert.equal(redirected.status, 302);
    assert.equal(redirected.passed, false);
    const forwarded = await runTest(baseUrl, 5000, {
      ...testCase,
      headers: { Host: 'edition.example', 'X-Forwarded-Proto': 'https' },
      checks: [{ description: 'Explicit Host was sent', type: 'includes', value: '<p>edition.example</p>' }],
    });
    assert.equal(forwarded.passed, true);
    console.log('PASS: raw HTTP checks reject redirects/shells and preserve explicit proxy Host headers');

    // Exercise --cases-file through the CLI, including rejection before HTTP.
    const fixtureDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ssr-smoke-cases-'));
    const fixtureFile = path.join(fixtureDirectory, 'cases.json');
    const script = path.join(__dirname, 'test-ssr-smoke.js');
    const args = ['--base-url', baseUrl, '--cases-file', fixtureFile];
    try {
      fs.writeFileSync(fixtureFile, JSON.stringify([{
        name: 'JSON fixture', route: '/rendered',
        checks: [{ type: 'includes', value: 'Rendered content' }],
      }]));
      const valid = await execFileAsync(process.execPath, [script, ...args], { timeout: 10000 });
      assert.match(valid.stdout, /Passed: 1/);
      assert.match(valid.stdout, /Failed: 0/);

      for (const field of ['checks', 'csrChecks']) {
        fs.writeFileSync(fixtureFile, JSON.stringify([{
          name: 'Untrusted pattern', route: '/',
          [field]: [{ type: 'regex', value: '/(a|aa)+$/' }],
        }]));
        await assert.rejects(
          execFileAsync(process.execPath, [script, '--base-url', 'http://127.0.0.1:0', '--cases-file', fixtureFile], { timeout: 10000 }),
          error => error.code === 1
            && /JSON case files support only includes checks/.test(error.stderr)
            && !/Request failed/.test(error.stdout)
        );
      }
      console.log('PASS: JSON CLI cases accept literal checks and reject regex in both rendering modes before HTTP');
    } finally {
      fs.unlinkSync(fixtureFile);
      fs.rmdirSync(fixtureDirectory);
    }
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
