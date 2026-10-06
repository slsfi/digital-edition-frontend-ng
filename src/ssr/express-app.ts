import express, { type RequestHandler } from 'express';
import rateLimit from 'express-rate-limit';
import { join } from 'node:path';

import type { ServerLocale } from './server-locales';

export interface SsrAppOptions {
  locales: readonly ServerLocale[];
  defaultLocale: ServerLocale;
  trustProxyHops: number;
  trustedProxyAddresses: string[];
  rateLimitWindowMs: number;
  rateLimitLimit: number;
  render: RequestHandler;
}

/**
 * Creates the static-file and probe middleware for one locale's browser output.
 *
 * Existing files, missing known static extensions, missing static HTML, and DevTools probes
 * return before Angular rendering. Unmatched application routes, including ebook PDF paths, fall
 * through to the next handler. Mount this router at the locale's URL prefix.
 *
 * @param browserFolder Locale browser directory containing the files to serve.
 * @returns A router retaining the public-file, asset, and hashed-output cache policies.
 */
function staticFiles(browserFolder: string): express.Router {
  const router = express.Router();

  // Serve generated static HTML with a one-day cache, without directory indexes or redirects.
  router.use('/static-html', express.static(join(browserFolder, 'static-html'), {
    maxAge: '1d', index: false, redirect: false
  }));

  // Missing static HTML must return here so Angular's wildcard 404 page is not bootstrapped.
  router.use('/static-html', (_req, res) => res.status(404).send('File not found'));

  // Unversioned public files must be revalidated rather than cached for a year.
  router.get(['/robots.txt', '/sitemap.txt', '/favicon.ico'], express.static(browserFolder, { maxAge: 0 }));

  // Public assets may change without filename hashes, so retain their shorter one-day cache.
  router.use('/assets', express.static(join(browserFolder, 'assets'), {
    maxAge: '1d', index: false, redirect: false
  }));

  // Other browser output is intended to be hashed and can use long-term caching.
  router.use(express.static(browserFolder, { maxAge: '1y', index: false, redirect: false }));

  // Missing images, fonts, media, PDFs, and similar files should return a fast 404
  // without reaching Angular or consuming SSR limiter capacity.
  const staticExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.avif', '.ico',
    '.woff', '.woff2', '.ttf', '.otf', '.eot',
    '.mp4', '.webm', '.mp3', '.wav', '.ogg', '.pdf', '.txt'
  ]);
  router.use((req, res, next) => {
    const pathname = req.url.split(/[?#]/, 1)[0].toLowerCase();
    const ext = pathname.slice(pathname.lastIndexOf('.'));
    // Ebook URLs can end in .pdf while still being application routes.
    if (staticExtensions.has(ext) && !pathname.startsWith('/ebook/')) {
      res.status(404).send('File with ' + ext + ' extension not found');
      return;
    }
    next();
  });

  // Chrome's DevTools probe needs no rendering and must not consume the SSR rate-limit quota.
  router.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => res.status(204).end());
  return router;
}

/**
 * Assembles the Express pipeline around the supplied Angular render handler.
 *
 * Establish proxy trust and filter forwarding headers first. Locale-specific and default
 * static routers then handle files, fast 404s, and probes before dynamic requests reach
 * the SSR rate limiter and renderer. Dynamic responses vary by User-Agent.
 *
 * @param options Locale directories, proxy trust, rate limits, and the final render handler.
 * @returns The configured Express app without starting a network listener.
 */
export function createSsrApp(options: SsrAppOptions): express.Express {
  const server = express();

  // Resolve req.ip through trusted proxy addresses and the configured hop limit.
  // The default two-hop deployment is HAProxy -> nginx -> Node; see docs/DEPLOYMENT.md.
  server.set('trust proxy', options.trustedProxyAddresses);
  const trustAddress = server.get('trust proxy fn') as (address: string) => boolean;
  server.set('trust proxy', (address: string, hop: number) => hop < options.trustProxyHops && trustAddress(address));

  // Only trusted immediate peers may supply forwarding headers. Retain the host,
  // protocol, and client-IP headers used by this deployment before Angular resolves its URL.
  server.use((req, _res, next) => {
    const trustedPeer = options.trustProxyHops > 0 && trustAddress(req.socket.remoteAddress ?? '');
    for (const name of Object.keys(req.headers)) {
      if ((name === 'forwarded' || name.startsWith('x-forwarded-')) &&
        (!trustedPeer || !['x-forwarded-host', 'x-forwarded-proto', 'x-forwarded-for'].includes(name))) {
        delete req.headers[name];
      }
    }
    next();
  });

  // Serve each emitted locale's browser directory at its configured URL prefix.
  // Match longer prefixes first so nested locale paths are handled by their own router.
  for (const locale of [...options.locales].sort((a, b) => b.path.length - a.path.length)) {
    if (locale.path) {
      server.use('/' + locale.path, staticFiles(locale.browserFolder));
    }
  }
  const defaultStaticFiles = staticFiles(options.defaultLocale.browserFolder);

  // Unprefixed static requests use the configured default locale. Skip requests that
  // already passed through a locale router, preserving dynamic fall-through such as ebooks.
  server.use('/' + options.defaultLocale.basePath, (req, res, next) => {
    const pathname = req.baseUrl + req.path;
    if (options.locales.some(locale => locale.path &&
      (pathname === '/' + locale.path || pathname.startsWith('/' + locale.path + '/')))) {
      next();
      return;
    }
    defaultStaticFiles(req, res, next);
  });

  // Limit only dynamic render requests: served files, fast static 404s, and probes
  // have already returned. Limits are configurable through SSR_RATE_LIMIT_* in src/server.ts.
  server.use(rateLimit({
    windowMs: options.rateLimitWindowMs,
    limit: options.rateLimitLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: 'Too many requests, please try again later.'
  }));
  // Final catch-all for Angular SSR, client-rendered routes, and application 404 pages.
  server.use((req, res, next) => {
    // Mobile and desktop SSR output differs, so response caches must vary by user agent.
    res.vary('User-Agent');
    return options.render(req, res, next);
  });
  return server;
}
