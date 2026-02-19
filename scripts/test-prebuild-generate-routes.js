const assert = require('assert');
const fs = require('fs');
const path = require('path');
const {
  extractRouteBlocks,
  extractRoutesArrayBody,
  getRoutePath,
  stripCommentsPreserveLiterals
} = require('../prebuild-generate-routes');

/**
 * Parser smoke tests for prebuild route generation.
 *
 * What this script does:
 * - Exercises key parsing helpers in `prebuild-generate-routes.js`.
 * - Verifies behavior for common edge cases (comments, quote styles, route extraction).
 * - Fails fast with a non-zero exit code if any assertion fails.
 *
 * What this script is NOT:
 * - Not a full unit test suite.
 * - Not an end-to-end production build test.
 *
 * How to run:
 * - Recommended npm command:
 *   `npm run test:routes-parser`
 * - Directly with Node:
 *   `node ./scripts/test-prebuild-generate-routes.js`
 *
 * Typical usage:
 * - Run after changes to `prebuild-generate-routes.js`.
 * - Run after route syntax refactors in `src/app/app.routes.ts`.
 */
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

test('extractRouteBlocks handles comments containing braces and brackets', () => {
  const source = `
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadChildren: () => import('./pages/home/home.module').then(m => m.HomePageModule)
  },
  // This comment contains } ] and should not break parsing.
  /* This block comment contains { [ ] } and should not break parsing. */
  {
    path: "content",
    data: {
      label: 'text'
    },
    // Inline comment with ] and }
    loadChildren: () => import('./pages/content/content.module').then(m => m.ContentPageModule)
  },
  {
    path: \`**\`,
    loadChildren: () => import('./pages/page-not-found/page-not-found.module').then(m => m.PageNotFoundPageModule)
  }
];
`;

  const blocks = extractRouteBlocks(source);
  assert.strictEqual(blocks.length, 3);
  assert.deepStrictEqual(blocks.map(getRoutePath), ['', 'content', '**']);
});

test('extractRoutesArrayBody ignores comments while finding closing bracket', () => {
  const source = `
import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'a',
    data: {
      note: 'literal ] text'
    } // ] in comment should be ignored
  }
];

const trailing = [1, 2, 3];
`;

  const body = extractRoutesArrayBody(source);
  assert.match(body, /path:\s*'a'/);
  assert.doesNotMatch(body, /const trailing/);
});

test('getRoutePath supports single, double and template literal paths', () => {
  assert.strictEqual(getRoutePath(`{ path: 'single' }`), 'single');
  assert.strictEqual(getRoutePath(`{ path: "double" }`), 'double');
  assert.strictEqual(getRoutePath(`{ path: \`template\` }`), 'template');
  assert.strictEqual(getRoutePath(`{ path: '' }`), '');
  assert.strictEqual(getRoutePath(`{ redirectTo: '' }`), null);
});

test('stripCommentsPreserveLiterals keeps string literals and length stable', () => {
  const source = `const a = "/* not a comment */"; // remove this
const b = '// also not a comment';
/* remove
   this block comment */
const c = \`template // text\`;`;
  const stripped = stripCommentsPreserveLiterals(source);

  assert.strictEqual(stripped.length, source.length);
  assert.match(stripped, /\/\* not a comment \*\//);
  assert.match(stripped, /'\/\/ also not a comment'/);
  assert.match(stripped, /`template \/\/ text`/);
  assert.doesNotMatch(stripped, /remove this/);
});

test('current app.routes.ts can be parsed into route blocks', () => {
  const routesPath = path.join(__dirname, '../src/app/app.routes.ts');
  const source = fs.readFileSync(routesPath, 'utf-8');
  const blocks = extractRouteBlocks(source);
  const paths = blocks.map(getRoutePath).filter((routePath) => routePath !== null);

  assert.ok(blocks.length > 0);
  assert.ok(paths.includes(''));
  assert.ok(paths.includes('**'));
});

let passed = 0;
for (const { name, fn } of tests) {
  try {
    fn();
    passed += 1;
    console.log(`PASS: ${name}`);
  } catch (error) {
    console.error(`FAIL: ${name}`);
    console.error(error);
    process.exit(1);
  }
}

console.log(`All parser smoke tests passed (${passed}/${tests.length}).`);
