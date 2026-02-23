import { HttpClient } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, map, Observable, take, throwError } from 'rxjs';

import { config } from '@config';
import { LoginRequest, LoginResponse, RefreshTokenResponse } from '@models/auth.models';
import {
  AuthRedirectStorageService,
  AUTH_REDIRECT_MARKER_QUERY_PARAM,
  AUTH_REDIRECT_MARKER_VALUE
} from '@services/auth-redirect-storage.service';
import { AuthTokenStorageService } from '@services/auth-token-storage.service';

const MAX_RETURN_URL_LENGTH = 2000;

export type LoginErrorCode = 'invalid_credentials' | 'request_failed';

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
  private readonly redirectStorage = inject(AuthRedirectStorageService);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  private readonly _isAuthenticated = signal<boolean>(false);
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  private readonly _loginError = signal<LoginErrorCode | null>(null);
  readonly loginError = this._loginError.asReadonly();

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
   * - On error: clear auth tokens/state but preserve redirect intent so users
   *   can retry credentials and still land on intended page.
   */
  login(email: string, password: string, redirectURL?: string): void {
    this._loginError.set(null);
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
      error: (error) => {
        this.clearAuthState(false);
        this._loginError.set(error?.status === 401 ? 'invalid_credentials' : 'request_failed');
      }
    });
  }

  /**
   * Clears the current login error state.
   */
  clearLoginError(): void {
    this._loginError.set(null);
  }

  /**
   * Requests a new access token using the refresh token.
   *
   * Concurrency behavior:
   * - If a refresh request is already in progress, subsequent callers wait for
   *   the next token emitted by refreshTokenSubject.
   * - Otherwise this method starts one refresh request and broadcasts result.
   *
   * Defensive behavior:
   * - If no refresh token is available, this method fails fast, logs out, and
   *   does not issue a network request.
   */
  refreshToken(): Observable<string> {
    if (this.refreshTokenInProgress) {
      return this.refreshTokenSubject.pipe(
        filter((token): token is string => token !== null),
        take(1)
      );
    } else {
      const refreshToken = this.getRefreshToken();
      if (!refreshToken) {
        this.logout();
        return throwError(() => new Error('Refresh token is missing.'));
      }

      this.refreshTokenInProgress = true;
      // Start a fresh refresh cycle so waiters cannot receive a stale token.
      this.refreshTokenSubject.next(null);
      let refreshCompleted = false;
      const url = `${this.backendAuthBaseURL}auth/refresh`;
      const headers = { Authorization: `Bearer ${refreshToken}` };
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
   *
   * Stale redirect targets are always cleared to avoid carrying redirect intent
   * across explicit logout/login boundaries.
   */
  logout(): void {
    this.clearAuthState(true);
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
   * 1) marker-based stored return URL (if marker present and target valid)
   * 2) redirectURL argument (if valid)
   * 3) `returnUrl` query parameter on current router URL (if valid)
   * 4) root route (`/`)
   */
  private resolvePostLoginRedirectURL(redirectURL?: string): string {
    const returnURLFromMarker = this.getReturnURLFromRedirectMarker();
    if (returnURLFromMarker) {
      return returnURLFromMarker;
    }

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

  /**
   * Resolves post-login target from marker-based redirect flow.
   *
   * Behavior:
   * - Reads current URL query params and checks for expected redirect marker
   *   value (`rt=1`).
   * - If marker exists, consumes one-time stored redirect target from
   *   AuthRedirectStorageService.
   * - Validates consumed target using getSafeInternalRedirectURL.
   *
   * Returns null when marker is missing, storage has no value, parsing fails,
   * or the consumed target is unsafe/invalid.
   */
  private getReturnURLFromRedirectMarker(): string | null {
    try {
      const urlTree = this.router.parseUrl(this.router.url);
      const marker = urlTree.queryParams?.[AUTH_REDIRECT_MARKER_QUERY_PARAM];
      if (!this.hasRedirectMarker(marker)) {
        return null;
      }

      const returnUrl = this.redirectStorage.consumeReturnUrl();
      return this.getSafeInternalRedirectURL(returnUrl);
    } catch {
      return null;
    }
  }

  /**
   * Resolves post-login target from legacy `returnUrl` query parameter.
   *
   * This keeps backward compatibility for old links/bookmarks and for contexts
   * where marker storage is unavailable.
   */
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
   * Returns true only when a redirect marker query parameter has the expected
   * marker value.
   *
   * Marker value is treated as a presence flag only; redirect target safety is
   * validated separately.
   */
  private hasRedirectMarker(value: unknown): boolean {
    return value === AUTH_REDIRECT_MARKER_VALUE;
  }

  private clearAuthState(clearRedirectTarget: boolean): void {
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this._isAuthenticated.set(false);
    if (clearRedirectTarget) {
      this.redirectStorage.clearReturnUrl();
    }
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
