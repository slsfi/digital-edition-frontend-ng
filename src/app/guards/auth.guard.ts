import { inject } from '@angular/core';
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router';
import { catchError, map, of } from 'rxjs';

import {
  AuthRedirectStorageService,
  AUTH_REDIRECT_MARKER_QUERY_PARAM,
  AUTH_REDIRECT_MARKER_VALUE
} from '@services/auth-redirect-storage.service';
import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';

const MAX_RETURN_URL_LENGTH = 2000;

/**
 * Route guard for authentication-gated pages.
 *
 * Behavior:
 * - Authenticated users can access protected routes.
 * - For protected routes with `data.requiresSessionValidation === true`, the guard
 *   validates server-side session state before allowing navigation.
 * - Unauthenticated users are redirected to `/login` with a short marker query
 *   param, and intended target URL is stored in session-scoped storage.
 * - If marker storage is unavailable (for example SSR), guard falls back to
 *   legacy `returnUrl` query parameter.
 * - Authenticated users trying to open `/login` are redirected to stored target
 *   URL (when marker is present) or legacy `returnUrl`, otherwise to `/`.
 * - Session validation 401 errors are treated as unauthenticated and redirect to
 *   `/login`; non-401 probe errors are fail-open (navigation is allowed).
 * - If `AUTH_ENABLED` is false, guard is a no-op and always allows.
 *
 * Auth state is read synchronously from AuthService's signal, with optional
 * async server validation on routes that opt in.
 *
 * Redirects are returned as UrlTrees (instead of imperative navigation),
 * which is the recommended Angular guard pattern.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authEnabled = inject(AUTH_ENABLED);
  if (!authEnabled) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const authRedirectStorage = inject(AuthRedirectStorageService);
  const isAuthenticated = authService.isAuthenticated();
  const isLoginRoute = state.url === '/login' || state.url.startsWith('/login?') || state.url.startsWith('/login/');

  if (isLoginRoute) {
    if (!isAuthenticated) {
      return true; // User is not authenticated, allow access to login
    }

    const loginRouteRedirectURL = getSafeLoginRouteRedirectURL(router, authRedirectStorage, state.url);
    return loginRouteRedirectURL
      ? router.parseUrl(loginRouteRedirectURL) // User is authenticated, redirect to requested route when available
      : router.createUrlTree(['/']); // User is authenticated, redirect to home and block the route
  }

  if (isAuthenticated) {
    if (!requiresSessionValidation(route)) {
      return true; // User is authenticated, allow access
    }

    return authService.validateSessionIfStale().pipe(
      map(() => true),
      catchError((error) => {
        if ((error as { status?: unknown } | null)?.status === 401) {
          return of(createLoginRedirectUrlTree(router, authRedirectStorage, state.url));
        }

        // Fail-open for transient probe failures (network/backend errors).
        return of(true);
      })
    );
  }

  return createLoginRedirectUrlTree(router, authRedirectStorage, state.url);
};

function requiresSessionValidation(route: ActivatedRouteSnapshot): boolean {
  return route.data?.['requiresSessionValidation'] === true;
}

function createLoginRedirectUrlTree(
  router: Router,
  authRedirectStorage: AuthRedirectStorageService,
  targetUrl: string
): UrlTree {
  const safeTargetURL = getSafeInternalURL(router, targetUrl);
  if (safeTargetURL && authRedirectStorage.storeReturnUrl(safeTargetURL)) {
    return router.createUrlTree(['/login'], {
      queryParams: {
        [AUTH_REDIRECT_MARKER_QUERY_PARAM]: AUTH_REDIRECT_MARKER_VALUE
      }
    });
  }

  // Fallback for unsupported/unavailable storage contexts.
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: targetUrl } });
}

/**
 * Resolves a safe redirect target when the current route is `/login`.
 *
 * Resolution order:
 * 1) marker-based value from redirect storage (`rt=1`)
 * 2) legacy `returnUrl` query parameter
 *
 * All resolved candidates are validated by `getSafeInternalURL`.
 *
 * @param router Router used for URL parsing/validation.
 * @param authRedirectStorage Storage abstraction for marker-based redirect flow.
 * @param currentUrl Current login URL (may include query params).
 * @returns Safe internal redirect URL, or `null` if not available/invalid.
 */
function getSafeLoginRouteRedirectURL(
  router: Router,
  authRedirectStorage: AuthRedirectStorageService,
  currentUrl: string
): string | null {
  try {
    const queryParams = router.parseUrl(currentUrl).queryParams ?? {};
    const markerValue = queryParams[AUTH_REDIRECT_MARKER_QUERY_PARAM];
    if (hasRedirectMarker(markerValue)) {
      const storedReturnURL = authRedirectStorage.consumeReturnUrl();
      const safeStoredReturnURL = getSafeInternalURL(router, storedReturnURL);
      if (safeStoredReturnURL) {
        return safeStoredReturnURL;
      }
    }

    return getSafeInternalURL(router, queryParams['returnUrl']);
  } catch {
    return null;
  }
}

/**
 * Returns true only when the redirect marker query parameter has the expected
 * marker value.
 *
 * Marker values are intentionally treated as opaque presence flags. The exact
 * value is not security-sensitive because target validation happens separately.
 *
 * @param value Query parameter value to evaluate.
 * @returns `true` when value equals AUTH_REDIRECT_MARKER_VALUE.
 */
function hasRedirectMarker(value: unknown): boolean {
  return value === AUTH_REDIRECT_MARKER_VALUE;
}

/**
 * Validates an internal redirect URL candidate.
 *
 * Safety rules:
 * - must be a string
 * - must start with `/`
 * - must not start with `//` (protocol-relative external target)
 * - must not target `/login` (prevents redirect loops)
 * - must not exceed MAX_RETURN_URL_LENGTH
 * - must be parseable by Angular Router
 *
 * @param router Router used to validate parseability.
 * @param value Candidate URL to validate.
 * @returns The original URL when valid, otherwise `null`.
 */
function getSafeInternalURL(router: Router, value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  // Avoid open redirects: only allow app-internal absolute paths.
  if (!value.startsWith('/') || value.startsWith('//')) {
    return null;
  }

  if (value === '/login' || value.startsWith('/login?') || value.startsWith('/login/')) {
    return null;
  }

  if (value.length > MAX_RETURN_URL_LENGTH) {
    return null;
  }

  try {
    router.parseUrl(value);
  } catch {
    return null;
  }

  return value;
}
