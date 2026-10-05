import { Injector } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { config } from '../assets/config/config';
import { APPLICATION_REQUEST_CONTEXT } from '../app/tokens/request-context.token';
import { REQUEST } from '../express.tokens';
import { createExpressRequestContext, provideExpressRequestContext } from './express-request-context';

type ContextRequest = NonNullable<Parameters<typeof createExpressRequestContext>[0]>;

function createRequest(
  url = '/fi/collection/203/introduction?view=readingtext',
  headers: ContextRequest['headers'] = { host: 'localhost:4201' },
  protocol = 'http',
  originalUrl = url
): ContextRequest {
  return { url, headers, protocol, originalUrl };
}

describe('Express request-context adapter', () => {
  let originalSiteOrigin: unknown;

  beforeEach(() => {
    originalSiteOrigin = config.app.siteURLOrigin;
    config.app.siteURLOrigin = 'https://edition.example';
  });

  afterEach(() => {
    config.app.siteURLOrigin = originalSiteOrigin;
  });

  it('preserves locale-prefixed paths, query strings, and escaped characters', () => {
    const context = createExpressRequestContext(createRequest('/fi/about/a%20b?search=a%2Bb'));

    expect(context?.url).toBe('/fi/about/a%20b?search=a%2Bb');
    expect(context?.publicOrigin).toBe('http://localhost:4201');
  });

  it('keeps the mounted Express URL ahead of the original locale-prefixed URL', () => {
    const context = createExpressRequestContext(createRequest(
      '/collection/203/introduction?menu=open', { host: 'localhost:4201' }, 'http',
      '/sv/collection/203/introduction?menu=open'
    ));

    expect(context?.url).toBe('/collection/203/introduction?menu=open');
  });

  it('falls back to the original URL when the mounted URL is empty', () => {
    expect(createExpressRequestContext(createRequest('', {}, 'http', '/fi/?menu=open'))?.url)
      .toBe('/fi/?menu=open');
  });

  it('keeps the configured public HTTPS origin over internal proxy HTTP', () => {
    const context = createExpressRequestContext(createRequest('/fi/', {
      host: 'internal.example:4201',
      'x-forwarded-host': 'edition.example',
      'x-forwarded-proto': 'http'
    }));

    expect(context?.publicOrigin).toBe('https://edition.example');
  });

  it('honors forwarded host and protocol chains for a different public host', () => {
    const context = createExpressRequestContext(createRequest('/sv/', {
      host: 'internal.example:4201',
      'x-forwarded-host': ['preview.example:8443, internal.example'],
      'x-forwarded-proto': 'https, http'
    }));

    expect(context?.publicOrigin).toBe('https://preview.example:8443');
  });

  it('propagates the complete user agent and copies scalar values from the request', () => {
    const request = createRequest('/fi/', { host: 'localhost:4201', 'user-agent': 'Mobile, browser/1.0' });
    const context = createExpressRequestContext(request);
    request.url = '/sv/';
    request.headers['user-agent'] = 'Desktop';
    request.headers.host = 'edition.example';

    expect(context).toEqual({ url: '/fi/', publicOrigin: 'http://localhost:4201', userAgent: 'Mobile, browser/1.0' });
  });

  it('leaves missing origin and user agent unset rather than inventing request data', () => {
    expect(createExpressRequestContext(createRequest('/sv/', {})))
      .toEqual({ url: '/sv/', publicOrigin: undefined, userAgent: undefined });
  });

  it('returns null when no Express request is available', () => {
    expect(createExpressRequestContext()).toBeNull();
    expect(createExpressRequestContext(null)).toBeNull();
    TestBed.configureTestingModule({ providers: [provideExpressRequestContext()] });
    expect(TestBed.inject(APPLICATION_REQUEST_CONTEXT)).toBeNull();
  });

  it('resolves the legacy token from the parent and isolates contexts between render injectors', () => {
    const firstParent = Injector.create({ providers: [{ provide: REQUEST, useValue: createRequest('/sv/', {
      host: 'localhost:4201', 'user-agent': 'Desktop'
    }) }] });
    const secondParent = Injector.create({ providers: [{ provide: REQUEST, useValue: createRequest('/fi/', {
      host: 'edition.example', 'user-agent': 'Mobile'
    }) }] });
    const first = Injector.create({ parent: firstParent, providers: [provideExpressRequestContext()] });
    const second = Injector.create({ parent: secondParent, providers: [provideExpressRequestContext()] });

    expect(first.get(APPLICATION_REQUEST_CONTEXT))
      .toEqual({ url: '/sv/', publicOrigin: 'http://localhost:4201', userAgent: 'Desktop' });
    expect(second.get(APPLICATION_REQUEST_CONTEXT))
      .toEqual({ url: '/fi/', publicOrigin: 'https://edition.example', userAgent: 'Mobile' });
  });
});
