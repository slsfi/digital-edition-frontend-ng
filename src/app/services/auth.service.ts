import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, map, Observable, take, throwError } from 'rxjs';

import { config } from '@config';
import { LoginRequest, LoginResponse, RefreshTokenResponse } from '@models/auth.models';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  isAuthenticated$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);

  private backendAuthBaseURL: string = config?.app?.backendAuthBaseURL ?? '';
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  constructor() {
    if (!this.backendAuthBaseURL.endsWith('/')) {
      this.backendAuthBaseURL = `${this.backendAuthBaseURL}/`;
    }

    if (this.getAccessToken()) {
      this.isAuthenticated$.next(true);
    } else {
      this.isAuthenticated$.next(false);
    }
  }

  login(email: string, password: string): void {
    const url = `${this.backendAuthBaseURL}auth/login`;
    const body: LoginRequest = { email, password };
    this.http.post<LoginResponse>(url, body).subscribe({
      next: (response) => {
        const { access_token, refresh_token } = response;
        localStorage.setItem('access_token', access_token);
        localStorage.setItem('refresh_token', refresh_token);
        this.router.navigate(['/']);
        this.isAuthenticated$.next(true);
      },
      error: () => {
        this.logout();
      }
    });
  }

  refreshToken(): Observable<string> {
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter(token => token !== null),
        take(1)
      );
    } else {
      this.refreshTokenInProgress = true;
      const url = `${this.backendAuthBaseURL}auth/refresh`;
      const headers = { Authorization: `Bearer ${this.getRefreshToken()}` };
      return this.http.post<RefreshTokenResponse>(url, null, { headers }).pipe(
        map((response) => {
          const { access_token } = response;
          localStorage.setItem('access_token', access_token);
          this.refreshTokenInProgress = false;
          this.refreshTokenSubject.next(access_token);
          return access_token;
        }),
        catchError((error) => {
          this.refreshTokenInProgress = false;
          this.logout();
          return throwError(() => error);
        })
      );
    }
  }

  logout(): void {
    localStorage.clear();
    this.isAuthenticated$.next(false);
  }

  getAccessToken(): string | null {
    return localStorage.getItem('access_token')
  }

  getRefreshToken(): string | null {
    return localStorage.getItem('refresh_token');
  }

}
