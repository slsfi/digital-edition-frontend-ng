import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from '@services/auth.service';

/**
 * Route guard for authentication-gated pages.
 *
 * Behavior:
 * - Authenticated users can access protected routes.
 * - Unauthenticated users are redirected to `/login`.
 * - Authenticated users trying to open `/login` are redirected to `/`.
 *
 * Auth state is read synchronously from AuthService's signal.
 *
 * Redirects are returned as UrlTrees (instead of imperative navigation),
 * which is the recommended Angular guard pattern.
 */
export const authGuard: CanActivateFn = (_route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const isAuthenticated = authService.isAuthenticated();
  const isLoginRoute = state.url === '/login' || state.url.startsWith('/login?');

  if (isLoginRoute) {
    return isAuthenticated
      ? router.createUrlTree(['/']) // User is authenticated, redirect to home and block the route
      : true; // User is not authenticated, allow access to login
  }

  return isAuthenticated
    ? true // User is authenticated, allow access
    : router.createUrlTree(['/login']); // User is not authenticated, redirect to login
};
