import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, take } from 'rxjs';

import { AuthService } from '@services/auth.service';

/**
 * Route guard for authentication-gated pages.
 *
 * Behavior:
 * - Authenticated users can access protected routes.
 * - Unauthenticated users are redirected to `/login`.
 * - Authenticated users trying to open `/login` are redirected to `/`.
 *
 * Redirects are returned as UrlTrees (instead of imperative navigation),
 * which is the recommended Angular guard pattern.
 */
export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.isAuthenticated$.pipe(
    take(1),
    map((isAuthenticated) => {
      const isLoginRoute = state.url === '/login' || state.url.startsWith('/login?');

      if (isLoginRoute) {
        if (isAuthenticated) {
          return router.createUrlTree(['/']); // User is authenticated, redirect to home and block the route
        } else {
          return true; // User is not authenticated, allow access to login
        }
      } else {
        if (isAuthenticated) {
          return true; // User is authenticated, allow access
        } else {
          return router.createUrlTree(['/login']); // User is not authenticated, redirect to login
        }
      }
    }
  ));
};
