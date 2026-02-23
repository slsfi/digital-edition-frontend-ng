import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';

const MAX_RETURN_URL_LENGTH = 2000;

/**
 * Route guard for authentication-gated pages.
 *
 * Behavior:
 * - Authenticated users can access protected routes.
 * - Unauthenticated users are redirected to `/login` with `returnUrl`.
 * - Authenticated users trying to open `/login` are redirected to `returnUrl`
 *   when present, otherwise to `/`.
 * - If `AUTH_ENABLED` is false, guard is a no-op and always allows.
 *
 * Auth state is read synchronously from AuthService's signal.
 *
 * Redirects are returned as UrlTrees (instead of imperative navigation),
 * which is the recommended Angular guard pattern.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authEnabled = inject(AUTH_ENABLED);
  if (!authEnabled) {
    return true;
  }

  const authService = inject(AuthService);
  const router = inject(Router);
  const isAuthenticated = authService.isAuthenticated();
  const isLoginRoute = state.url === '/login' || state.url.startsWith('/login?');
  const returnUrl = getSafeReturnUrl(router, state.url);

  if (isLoginRoute) {
    return isAuthenticated
      ? returnUrl
        ? router.parseUrl(returnUrl) // User is authenticated, redirect to requested route when available
        : router.createUrlTree(['/']) // User is authenticated, redirect to home and block the route
      : true; // User is not authenticated, allow access to login
  }

  return isAuthenticated
    ? true // User is authenticated, allow access
    : router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } }); // User is not authenticated, redirect to login
};

function getSafeReturnUrl(router: Router, currentUrl: string): string | null {
  try {
    const returnUrl = router.parseUrl(currentUrl).queryParams?.['returnUrl'];
    if (typeof returnUrl !== 'string') {
      return null;
    }

    // Avoid open redirects: only allow app-internal absolute paths.
    if (!returnUrl.startsWith('/') || returnUrl.startsWith('//')) {
      return null;
    }

    if (returnUrl === '/login' || returnUrl.startsWith('/login?') || returnUrl.startsWith('/login/')) {
      return null;
    }

    if (returnUrl.length > MAX_RETURN_URL_LENGTH) {
      return null;
    }

    try {
      router.parseUrl(returnUrl);
    } catch {
      return null;
    }

    return returnUrl;
  } catch {
    return null;
  }
}
