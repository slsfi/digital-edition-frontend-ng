#!/usr/bin/env node

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// Check stable output contracts without depending on hashed bundle filenames.
const repoRoot = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const options = { 'dist-root': 'dist/app' };
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--help' || args[i] === '-h') {
    console.log('Usage: npm run test:build-output -- [--dist-root <path>] [--locales <csv>] [--server-entry <path>]');
    process.exit(0);
  }
  const match = args[i].match(/^--(dist-root|locales|server-entry)(?:=(.*))?$/);
  assert.ok(match, `Unknown option: ${args[i]}`);
  const value = match[2] ?? args[++i];
  assert.ok(value && !value.startsWith('--'), `Missing value for --${match[1]}`);
  options[match[1]] = value;
}

const angular = JSON.parse(fs.readFileSync(path.join(repoRoot, 'angular.json'), 'utf8'));
const project = angular.projects.app;
const build = project.architect.build;
const localize = build.configurations.production?.localize ?? build.options.localize;
const locales = options.locales ? options.locales.split(',').map(locale => locale.trim()).filter(Boolean)
  : Array.isArray(localize) ? localize : Object.keys(project.i18n.locales);
assert.ok(locales.length, 'No production locales configured; pass --locales for a custom build');

const distRoot = path.resolve(repoRoot, options['dist-root']);
const browserRoot = path.join(distRoot, 'browser');
assert.ok(fs.existsSync(browserRoot) && fs.statSync(browserRoot).isDirectory(), `Missing browser output: ${browserRoot}`);
for (const locale of locales) {
  const subPath = project.i18n.locales[locale]?.subPath ?? locale;
  const directory = path.join(browserRoot, subPath);
  assert.ok(fs.existsSync(directory) && fs.statSync(directory).isDirectory(), `Missing ${locale} browser directory: ${directory}`);
  if (build.builder === '@angular/build:application') {
    assert.ok(fs.existsSync(path.join(directory, 'index.csr.html')), `Missing ${locale} CSR shell`);
    assert.ok(fs.existsSync(path.join(distRoot, 'server', subPath, 'main.server.mjs')), `Missing ${locale} server bundle`);
  }
}

// Follow the canonical launch script so changing the production entry only
// requires updating serve:ssr. An explicit entry is relative to --dist-root.
const scripts = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8')).scripts;
const launch = scripts['serve:ssr'].match(/^node\s+(?:"([^"]+)"|'([^']+)'|([^\s]+))\s*$/);
assert.ok(options['server-entry'] || launch, 'Cannot infer the Node entry from serve:ssr; pass --server-entry');
const entry = options['server-entry']
  || path.relative(path.join(repoRoot, 'dist/app'), path.resolve(repoRoot, launch[1] || launch[2] || launch[3]));
const serverEntry = path.resolve(distRoot, entry);
assert.ok(fs.existsSync(serverEntry) && fs.statSync(serverEntry).isFile(), `Missing runtime entry: ${serverEntry}`);

console.log(`Build output check passed (${locales.join(', ')}; runtime: ${path.relative(repoRoot, serverEntry)}).`);
