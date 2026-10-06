import { FactoryProvider, inject } from '@angular/core';
import type { Request } from 'express';

import { APPLICATION_REQUEST_CONTEXT, ApplicationRequestContext } from '../app/tokens/request-context.token';
import { getRequestOrigin } from '../app/utils/request-origin';
import { REQUEST } from '../express.tokens';

type ExpressContextRequest = Pick<Request, 'url' | 'originalUrl' | 'headers' | 'protocol'>;

/** Keeps Express-specific request handling at the Stage 1 server boundary. */
export function createExpressRequestContext(request?: ExpressContextRequest | null): ApplicationRequestContext | null {
  if (!request) return null;

  const userAgent = request.headers?.['user-agent'];
  return {
    // Express removes the locale mount from url; preserve that routing behavior.
    url: request.url || request.originalUrl,
    publicOrigin: getRequestOrigin(request),
    userAgent: userAgent ? String(userAgent) : undefined
  };
}

export function provideExpressRequestContext(): FactoryProvider {
  return {
    provide: APPLICATION_REQUEST_CONTEXT,
    useFactory: () => createExpressRequestContext(inject(REQUEST, { optional: true }))
  };
}
