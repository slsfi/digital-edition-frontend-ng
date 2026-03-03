import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Requires a non-empty `jwt` fragment parameter for the reset-password page.
 * Redirects to forgot-password when the token is missing.
 */
export const resetPasswordJwtGuard: CanActivateFn = (route) => {
  const fragment = typeof route.fragment === 'string' ? route.fragment : '';
  const normalizedFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
  const jwt = new URLSearchParams(normalizedFragment).get('jwt')?.trim() ?? '';

  if (jwt.length > 0) {
    return true;
  }

  return inject(Router).createUrlTree(['/forgot-password']);
};
