#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');
const { performance } = require('node:perf_hooks');
const { setTimeout: delay } = require('node:timers/promises');

const DEFAULT_ROUTES = [
  '/sv/',
  '/sv/collection/216/introduction',
  '/sv/collection/216/text/20280',
  '/sv/collection/211/text/20210',
];

/*
 * SSR benchmark utility.
 *
 * Usage:
 *   npm run bench:ssr -- [options] [route ...]
 *
 * Supported CLI arguments:
 *   --runs <n> | --runs=<n>
 *     Number of benchmark requests per route (default: 3).
 *
 *   --port <n> | --port=<n>
 *     Port used when starting dist/app/proxy-server.js (default: 4201).
 *
 *   --route <path> | --route=<path>
 *     Add a single route. Can be repeated.
 *
 *   --routes <csv> | --routes=<csv>
 *     Add multiple comma-separated routes.
 *
 *   [route ...]
 *     Positional routes are also accepted (e.g. /sv/ /sv/collection/216/text/20280).
 *
 *   --skip-start
 *     Do not start proxy-server.js; benchmark an already running SSR server.
 *
 *   --base-url <url> | --base-url=<url>
 *     Base URL to benchmark. Default: http://127.0.0.1:<port>.
 *
 *   --startup-timeout-ms <n> | --startup-timeout-ms=<n>
 *     Max wait time for server startup in milliseconds (default: 30000).
 *
 *   --request-timeout-ms <n> | --request-timeout-ms=<n>
 *     Per-request timeout in milliseconds (default: 120000).
 *
 *   --help | -h
 *     Show help text.
 *
 * Examples:
 *   npm run bench:ssr
 *   npm run bench:ssr -- --runs=5
 *   npm run bench:ssr -- --routes=/sv/,/sv/collection/216/introduction
 *   npm run bench:ssr -- /sv/ /sv/collection/216/text/20280
 *   npm run bench:ssr -- --skip-start --base-url=http://127.0.0.1:4201
 */
function printHelp() {
  console.log(`
SSR benchmark utility

Usage:
  npm run bench:ssr -- [options] [route ...]

Options:
  --runs <n> | --runs=<n>                    Number of runs per route (default: 3)
  --port <n> | --port=<n>                    Port for proxy-server.js when auto-starting (default: 4201)
  --route <path> | --route=<path>            Add one route (repeatable)
  --routes <csv> | --routes=<csv>            Add comma-separated routes
  --skip-start                               Benchmark an already running SSR server
  --base-url <url> | --base-url=<url>        Base URL (default: http://127.0.0.1:<port>)
  --startup-timeout-ms <n>                   Startup wait timeout in ms (default: 30000)
  --request-timeout-ms <n>                   Request timeout in ms (default: 120000)
  --help, -h                                 Show this help

Examples:
  npm run bench:ssr
  npm run bench:ssr -- --runs=5
  npm run bench:ssr -- --routes=/sv/,/sv/collection/216/introduction
  npm run bench:ssr -- /sv/ /sv/collection/216/text/20280
  npm run bench:ssr -- --skip-start --base-url=http://127.0.0.1:4201
`.trim());
}

function parseArgs(argv) {
  const opts = {
    runs: 3,
    port: 4201,
    startupTimeoutMs: 30000,
    requestTimeoutMs: 120000,
    routes: [...DEFAULT_ROUTES],
    skipStart: false,
    baseUrl: '',
    help: false,
  };

  const routes = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === '--help' || arg === '-h') {
      opts.help = true;
      continue;
    }

    if (arg === '--skip-start') {
      opts.skipStart = true;
      continue;
    }

    if (arg.startsWith('--runs=')) {
      opts.runs = Number(arg.split('=')[1]);
      continue;
    }
    if (arg === '--runs' && argv[i + 1]) {
      opts.runs = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--port=')) {
      opts.port = Number(arg.split('=')[1]);
      continue;
    }
    if (arg === '--port' && argv[i + 1]) {
      opts.port = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--startup-timeout-ms=')) {
      opts.startupTimeoutMs = Number(arg.split('=')[1]);
      continue;
    }
    if (arg === '--startup-timeout-ms' && argv[i + 1]) {
      opts.startupTimeoutMs = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--request-timeout-ms=')) {
      opts.requestTimeoutMs = Number(arg.split('=')[1]);
      continue;
    }
    if (arg === '--request-timeout-ms' && argv[i + 1]) {
      opts.requestTimeoutMs = Number(argv[++i]);
      continue;
    }

    if (arg.startsWith('--route=')) {
      routes.push(arg.slice('--route='.length));
      continue;
    }
    if (arg === '--route' && argv[i + 1]) {
      routes.push(argv[++i]);
      continue;
    }

    if (arg.startsWith('--routes=')) {
      const fromArg = arg
        .slice('--routes='.length)
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      routes.push(...fromArg);
      continue;
    }
    if (arg === '--routes' && argv[i + 1]) {
      const fromArg = argv[++i]
        .split(',')
        .map((r) => r.trim())
        .filter(Boolean);
      routes.push(...fromArg);
      continue;
    }

    if (arg.startsWith('--base-url=')) {
      opts.baseUrl = arg.slice('--base-url='.length);
      continue;
    }
    if (arg === '--base-url' && argv[i + 1]) {
      opts.baseUrl = argv[++i];
      continue;
    }

    if (!arg.startsWith('--')) {
      routes.push(arg);
    }
  }

  if (routes.length > 0) {
    opts.routes = routes;
  }

  if (!Number.isFinite(opts.runs) || opts.runs < 1) {
    throw new Error('Invalid --runs value');
  }
  if (!Number.isFinite(opts.port) || opts.port < 1) {
    throw new Error('Invalid --port value');
  }
  if (!Number.isFinite(opts.startupTimeoutMs) || opts.startupTimeoutMs < 1000) {
    throw new Error('Invalid --startup-timeout-ms value');
  }
  if (!Number.isFinite(opts.requestTimeoutMs) || opts.requestTimeoutMs < 1000) {
    throw new Error('Invalid --request-timeout-ms value');
  }

  return opts;
}

function normalizeRoute(route) {
  if (!route) return '/';
  return route.startsWith('/') ? route : `/${route}`;
}

function getUrl(baseUrl, route) {
  return `${baseUrl.replace(/\/+$/, '')}${normalizeRoute(route)}`;
}

async function fetchWithTiming(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const started = performance.now();

  try {
    const res = await fetch(url, { signal: controller.signal });
    const body = await res.arrayBuffer();
    const elapsedMs = performance.now() - started;
    return {
      status: res.status,
      ms: elapsedMs,
      bytes: body.byteLength,
      error: '',
    };
  } catch (error) {
    const elapsedMs = performance.now() - started;
    return {
      status: 'ERR',
      ms: elapsedMs,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function waitForServer(baseUrl, readyRoute, startupTimeoutMs, requestTimeoutMs) {
  const started = performance.now();

  while (performance.now() - started < startupTimeoutMs) {
    const result = await fetchWithTiming(
      getUrl(baseUrl, readyRoute),
      Math.min(requestTimeoutMs, 5000),
    );
    if (result.status !== 'ERR') {
      return;
    }
    await delay(300);
  }

  throw new Error(`SSR server did not start within ${startupTimeoutMs} ms`);
}

function routeSummary(resultsForRoute) {
  const values = resultsForRoute.map((r) => r.ms);
  const sorted = [...values].sort((a, b) => a - b);
  const avg = values.reduce((a, b) => a + b, 0) / values.length;
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const mid = Math.floor(sorted.length / 2);
  const median =
    sorted.length % 2 === 1
      ? sorted[mid]
      : (sorted[mid - 1] + sorted[mid]) / 2;

  return { avg, min, max, median };
}

function fmtMs(ms) {
  return Number(ms.toFixed(2));
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    printHelp();
    return;
  }

  const repoRoot = path.resolve(__dirname, '..');
  const baseUrl = opts.baseUrl || `http://127.0.0.1:${opts.port}`;
  const routes = opts.routes.map(normalizeRoute);
  const serverEntrypoint = path.join(repoRoot, 'dist', 'app', 'proxy-server.js');

  if (!opts.skipStart && !fs.existsSync(serverEntrypoint)) {
    throw new Error(
      `Missing ${serverEntrypoint}. Run "npm run build:ssr" first.`,
    );
  }

  let serverProc = null;

  const stopServer = () => {
    if (serverProc && !serverProc.killed) {
      serverProc.kill('SIGTERM');
    }
  };

  process.on('SIGINT', () => {
    stopServer();
    process.exit(130);
  });
  process.on('SIGTERM', () => {
    stopServer();
    process.exit(143);
  });

  if (!opts.skipStart) {
    serverProc = spawn(process.execPath, [serverEntrypoint], {
      cwd: repoRoot,
      env: { ...process.env, PORT: String(opts.port) },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    serverProc.stdout.on('data', () => {});
    serverProc.stderr.on('data', () => {});

    await waitForServer(
      baseUrl,
      routes[0] || '/sv/',
      opts.startupTimeoutMs,
      opts.requestTimeoutMs,
    );
  }

  try {
    const results = [];

    for (const route of routes) {
      for (let run = 1; run <= opts.runs; run++) {
        const result = await fetchWithTiming(
          getUrl(baseUrl, route),
          opts.requestTimeoutMs,
        );
        results.push({
          route,
          run,
          status: result.status,
          ms: fmtMs(result.ms),
          bytes: result.bytes,
          error: result.error,
        });
      }
    }

    console.log(`Base URL: ${baseUrl}`);
    console.log(`Runs per route: ${opts.runs}`);
    console.table(
      results.map((r) => ({
        route: r.route,
        run: r.run,
        status: r.status,
        ms: r.ms,
        bytes: r.bytes,
        error: r.error,
      })),
    );

    const grouped = new Map();
    for (const row of results) {
      if (!grouped.has(row.route)) grouped.set(row.route, []);
      grouped.get(row.route).push(row);
    }

    const summary = [];
    for (const [route, rows] of grouped.entries()) {
      const stats = routeSummary(rows);
      summary.push({
        route,
        avg_ms: fmtMs(stats.avg),
        median_ms: fmtMs(stats.median),
        min_ms: fmtMs(stats.min),
        max_ms: fmtMs(stats.max),
      });
    }

    console.log('Summary');
    console.table(summary);
  } finally {
    stopServer();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
