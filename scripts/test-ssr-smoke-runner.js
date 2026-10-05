const assert = require('node:assert/strict');
const http = require('node:http');
const { getTestCases, getRenderingErrors, runTest } = require('./test-ssr-smoke');

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
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
