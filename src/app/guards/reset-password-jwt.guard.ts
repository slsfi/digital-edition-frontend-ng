import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

/**
 * Requires a non-empty `jwt` query parameter for the reset-password page.
 * Redirects to forgot-password when the token is missing.
 */
export const resetPasswordJwtGuard: CanActivateFn = (route) => {
  const jwt = route.queryParamMap.get('jwt');
  if (typeof jwt === 'string' && jwt.trim().length > 0) {
    return true;
  }

  return inject(Router).createUrlTree(['/forgot-password']);
};
