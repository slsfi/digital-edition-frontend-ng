import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, map, Observable, take, throwError } from 'rxjs';

import { config } from '@config';
import { LoginRequest, LoginResponse, RefreshTokenResponse } from '@models/auth.models';
import { AuthTokenStorageService } from '@services/auth-token-storage.service';

const MAX_RETURN_URL_LENGTH = 2000;

/**
 * Authentication state + token lifecycle service.
 *
 * Responsibilities:
 * - Keep in-memory auth state (`isAuthenticated` signal).
 * - Perform login and refresh-token requests.
 * - Persist/remove tokens through a platform-specific storage abstraction.
 *
 * SSR note:
 * This service does not access browser globals directly. Token persistence is
 * delegated to AuthTokenStorageService so browser/server behavior can differ.
 */
@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  private readonly _isAuthenticated = signal<boolean>(false);
  readonly isAuthenticated = this._isAuthenticated.asReadonly();

  private backendAuthBaseURL: string = this.resolveBackendAuthBaseURL();
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  /**
   * Initializes base URL formatting and initial auth state from stored token.
   */
  constructor() {
    this._isAuthenticated.set(this.getAccessToken() !== null);
  }

  /**
   * Executes login request and stores received tokens on success.
   *
   * Current behavior:
   * - On success: persist tokens, navigate to returnUrl/root, mark authenticated.
   * - On error: clear auth state via logout().
   */
  login(email: string, password: string, redirectURL?: string): void {
    const url = `${this.backendAuthBaseURL}auth/login`;
    const body: LoginRequest = { email, password };
    this.http.post<LoginResponse>(url, body).subscribe({
      next: (response) => {
        const { access_token, refresh_token } = response;
        this.setStorageItem('access_token', access_token);
        this.setStorageItem('refresh_token', refresh_token);
        this.router.navigateByUrl(this.resolvePostLoginRedirectURL(redirectURL));
        this._isAuthenticated.set(true);
      },
      error: () => {
        this.logout();
      }
    });
  }

  /**
   * Requests a new access token using the refresh token.
   *
   * Concurrency behavior:
   * - If a refresh request is already in progress, subsequent callers wait for
   *   the next token emitted by refreshTokenSubject.
   * - Otherwise this method starts one refresh request and broadcasts result.
   */
  refreshToken(): Observable<string> {
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1)
      );
    } else {
      this.refreshTokenInProgress = true;
      // Start a fresh refresh cycle so waiters cannot receive a stale token.
      this.refreshTokenSubject.next(null);
      let refreshCompleted = false;
      const url = `${this.backendAuthBaseURL}auth/refresh`;
      const headers = { Authorization: `Bearer ${this.getRefreshToken()}` };
      return this.http.post<RefreshTokenResponse>(url, null, { headers }).pipe(
        map((response) => {
          refreshCompleted = true;
          const { access_token } = response;
          this.setStorageItem('access_token', access_token);
          this.refreshTokenSubject.next(access_token);
          this._isAuthenticated.set(true);
          return access_token;
        }),
        catchError((error) => {
          refreshCompleted = true;
          // Propagate refresh failure to concurrent waiters and reset subject.
          this.refreshTokenSubject.error(error);
          this.refreshTokenSubject = new BehaviorSubject<string | null>(null);
          this.logout();
          return throwError(() => error);
        }),
        finalize(() => {
          this.refreshTokenInProgress = false;
          if (!refreshCompleted) {
            this.refreshTokenSubject.error(
              new Error('Refresh token request was canceled before completion.')
            );
            this.refreshTokenSubject = new BehaviorSubject<string | null>(null);
          }
        })
      );
    }
  }

  /**
   * Clears auth tokens and updates in-memory auth state.
   */
  logout(): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this._isAuthenticated.set(false);
  }

  /**
   * Returns currently stored access token, or null if unavailable.
   */
  getAccessToken(): string | null {
    return this.getStorageItem('access_token');
  }

  /**
   * Returns currently stored refresh token, or null if unavailable.
   */
  getRefreshToken(): string | null {
    return this.getStorageItem('refresh_token');
  }

  /**
   * Persists one token key/value through platform-specific storage.
   */
  private setStorageItem(key: string, value: string): void {
    this.tokenStorage.setItem(key, value);
  }

  /**
   * Resolves auth base URL from config.
   *
   * Priority:
   * 1) app.backendAuthBaseURL
   * 2) root origin extracted from app.backendBaseURL
   */
  private resolveBackendAuthBaseURL(): string {
    const backendAuthBaseURL = config?.app?.backendAuthBaseURL;
    if (backendAuthBaseURL) {
      return backendAuthBaseURL.endsWith('/') ? backendAuthBaseURL : `${backendAuthBaseURL}/`;
    }

    const backendBaseURL = config?.app?.backendBaseURL;
    if (!backendBaseURL) {
      return '';
    }

    try {
      const parsed = new URL(backendBaseURL);
      return `${parsed.protocol}//${parsed.host}/`;
    } catch {
      return '';
    }
  }

  /**
   * Resolves post-login navigation target.
   *
   * Priority:
   * 1) redirectURL argument (if valid)
   * 2) `returnUrl` query parameter on current router URL (if valid)
   * 3) root route (`/`)
   */
  private resolvePostLoginRedirectURL(redirectURL?: string): string {
    const safeRedirectURL = this.getSafeInternalRedirectURL(redirectURL);
    if (safeRedirectURL) {
      return safeRedirectURL;
    }

    const returnURLFromRoute = this.getReturnURLFromCurrentRoute();
    if (returnURLFromRoute) {
      return returnURLFromRoute;
    }

    return '/';
  }

  private getReturnURLFromCurrentRoute(): string | null {
    try {
      const urlTree = this.router.parseUrl(this.router.url);
      const returnUrl = urlTree.queryParams?.['returnUrl'];
      return this.getSafeInternalRedirectURL(returnUrl);
    } catch {
      return null;
    }
  }

  /**
   * Returns valid app-internal redirect path or null.
   *
   * Rules:
   * - Must start with `/`
   * - Must not start with `//` (protocol-relative external target)
   * - Must be <= MAX_RETURN_URL_LENGTH
   * - Must be parseable by Angular router
   */
  private getSafeInternalRedirectURL(value: unknown): string | null {
    if (typeof value !== 'string') {
      return null;
    }

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
      this.router.parseUrl(value);
    } catch {
      return null;
    }

    return value;
  }

  /**
   * Reads one token value from platform-specific storage.
   */
  private getStorageItem(key: string): string | null {
    return this.tokenStorage.getItem(key);
  }

  /**
   * Removes one token key from platform-specific storage.
   */
  private removeStorageItem(key: string): void {
    this.tokenStorage.removeItem(key);
  }

}
