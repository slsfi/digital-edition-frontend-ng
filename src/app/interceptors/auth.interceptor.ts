import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { config } from '@config';
import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';

const BACKEND_REQUEST_PREFIXES: string[] = resolveBackendRequestPrefixes();

/**
 * Authentication interceptor.
 *
 * Behavior summary:
 * - No-op when auth feature is disabled.
 * - Adds `Authorization: Bearer <access_token>` only for requests targeting
 *   configured backend URLs.
 * - Never adds bearer token for `/auth/*` endpoints.
 * - On backend 401 (excluding `/auth/*`), attempts one refresh flow and retries
 *   the original request with the new access token.
 */
export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const authEnabled = inject(AUTH_ENABLED);
  if (!authEnabled) {
    return next(req);
  }

  const router = inject(Router);
  const authService = inject(AuthService);
  const authToken = authService.getAccessToken();
  const isBackendRequest = isRequestToConfiguredBackend(req.url);
  const isAuthEndpoint = isBackendRequest && req.url.includes('/auth/');
  let authReq = req;

  if (authToken && isBackendRequest && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err) => {
      const hasRefreshToken = !!authService.getRefreshToken();
      if (err.status === 401 && isBackendRequest && !isAuthEndpoint && hasRefreshToken) {
        return authService.refreshToken().pipe(
          switchMap((access_token) => {
            const newAuthReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${access_token}`
              }
            });
            return next(newAuthReq);
          }),
          catchError((refreshError) => {
            if (refreshError.status === 401) {
              authService.logout();
              router.navigate(['/login'], { replaceUrl: true });
            }
            return throwError(() => refreshError);
          })
        );
      }
      return throwError(() => err);
    })
  );
};

/**
 * Normalized backend URL prefixes used to decide whether a request should be
 * treated as an application-backend request.
 */
function resolveBackendRequestPrefixes(): string[] {
  const candidates = [config?.app?.backendBaseURL, config?.app?.backendAuthBaseURL];
  const normalized = candidates
    .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .map((value) => (value.endsWith('/') ? value : `${value}/`));

  return Array.from(new Set(normalized));
}

/**
 * Returns true only when a request URL starts with one of the configured
 * backend URL prefixes.
 */
function isRequestToConfiguredBackend(url: string): boolean {
  return BACKEND_REQUEST_PREFIXES.some((prefix) => url.startsWith(prefix));
}
