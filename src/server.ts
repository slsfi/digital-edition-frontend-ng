import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  createWebRequestFromNodeRequest,
  isMainModule,
  writeResponseToNodeResponse
} from '@angular/ssr/node';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import angularConfig from '../angular.json';
import { config } from './assets/config/config';
import { environment } from './environments/environment';
import { getConfiguredSiteHostname, getRequestOrigin } from './app/utils/request-origin';
import { createSsrApp } from './ssr/express-app';
import { getDefaultServerLocale, getServerLocales, localizeRequestUrl } from './ssr/server-locales';

// Express filters forwarding headers by peer trust before these reach Angular.
const proxyHeaders = ['x-forwarded-host', 'x-forwarded-proto'];

// Restrict SSR hosts to local development, the configured public site, and explicit
// deployment aliases supplied through NG_ALLOWED_HOSTS.
const allowedHosts = new Set(['localhost', '127.0.0.1', '[::1]']);
const configuredHost = getConfiguredSiteHostname();
if (configuredHost) {
  allowedHosts.add(configuredHost);
}
for (const host of (process.env['NG_ALLOWED_HOSTS'] ?? '').split(',').map(host => host.trim()).filter(Boolean)) {
  allowedHosts.add(host);
}

// One engine owns dispatch to the localized applications emitted by the integrated build.
const angularApp = new AngularNodeAppEngine({ allowedHosts: [...allowedHosts], trustProxyHeaders: proxyHeaders });
const browserFolder = resolve(dirname(fileURLToPath(import.meta.url)), '../browser');
// CLI development SSR has one in-memory app at the dev server's base path.
const localizedRuntime = environment.production || isMainModule(import.meta.url);
const locales = getServerLocales(angularConfig.projects.app, browserFolder, localizedRuntime);
const defaultLocale = getDefaultServerLocale(locales, config.app?.i18n?.defaultLanguage);

// The Express pipeline serves static files and probes before limiting dynamic requests.
// The exported app also supplies the Node request handler used by Angular CLI tooling.
export const app = createSsrApp({
  locales,
  defaultLocale,
  trustProxyHops: getInt(config.app?.ssr?.trustProxyHops, 2, 0),
  trustedProxyAddresses: config.app?.ssr?.trustedProxyAddresses ?? ['loopback', 'linklocal', 'uniquelocal'],
  rateLimitWindowMs: getInt(process.env['SSR_RATE_LIMIT_WINDOW_MS'], 60_000, 1),
  rateLimitLimit: getInt(process.env['SSR_RATE_LIMIT_LIMIT'], 1200, 1),
  render: async (req, res, next) => {
    try {
      // Adapt the sanitized Node request to Angular's Web Request API. Internally
      // prefix unlocalized URLs with the default locale while preserving the browser URL.
      const request = createWebRequestFromNodeRequest(req, proxyHeaders);
      const url = localizedRuntime ? localizeRequestUrl(new URL(request.url), locales, defaultLocale) : new URL(request.url);

      // Keep Angular's document location and SEO URLs on the public origin, including
      // configured HTTPS when nginx reaches Node over an internal HTTP connection.
      const origin = getRequestOrigin(req);
      const renderUrl = origin ? origin + url.pathname + url.search : url.href;
      const headers = new Headers(request.headers);
      // IP forwarding is consumed by Express; Angular trusts only host/protocol.
      headers.delete('x-forwarded-for');
      // Align the Host header with the resolved public URL instead of an internal proxy host.
      headers.set('host', new URL(renderUrl).host);

      // Generated server routes select public SSR or auth-protected CSR shells.
      // Critical CSS inlining remains disabled in angular.json's production optimization.
      const response = await angularApp.handle(new Request(renderUrl, new Request(request, { headers })));
      if (!response) {
        // Let Express handle requests that Angular does not support.
        next();
        return;
      }
      // Preserve User-Agent variation on Angular's response before its headers are
      // written to Express, including any other Vary values set by Angular.
      response.headers.append('Vary', 'User-Agent');
      await writeResponseToNodeResponse(response, res);
    } catch (error) {
      next(error);
    }
  }
});

/**
 * Reads an integer from a config value or environment-variable string.
 * Missing, invalid, fractional, or below-minimum values use the supplied fallback.
 *
 * @param value Raw setting to convert to a number.
 * @param fallback Default used when the setting is absent or invalid.
 * @param minimum Smallest accepted integer, inclusive.
 * @returns The validated integer or fallback.
 */
function getInt(value: unknown, fallback: number, minimum: number): number {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= minimum ? parsed : fallback;
}

// Start a listener only when the built entry is executed directly (npm run serve:ssr).
// Angular CLI can import the handler without opening a second server port.
if (isMainModule(import.meta.url)) {
  const port = process.env['PORT'] || 4201;
  app.listen(port, error => {
    if (error) {
      throw error;
    }
    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

export const reqHandler = createNodeRequestHandler(app);
