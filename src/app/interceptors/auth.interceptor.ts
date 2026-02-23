import { inject } from '@angular/core';
import { HttpInterceptorFn } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError, switchMap, throwError } from 'rxjs';

import { AuthService } from '@services/auth.service';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const authToken = authService.getAccessToken();
  const isAuthEndpoint = req.url.includes('/auth/');
  let authReq = req;

  if (authToken && !isAuthEndpoint) {
    authReq = req.clone({
      setHeaders: {
        Authorization: `Bearer ${authToken}`
      }
    });
  }

  return next(authReq).pipe(
    catchError((err) => {
      const hasRefreshToken = !!authService.getRefreshToken();
      if (err.status === 401 && !isAuthEndpoint && hasRefreshToken) {
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
