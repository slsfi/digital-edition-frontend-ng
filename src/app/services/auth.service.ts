import { HttpClient } from '@angular/common/http';
import { inject, Injectable, LOCALE_ID, signal } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, catchError, filter, finalize, map, Observable, of, shareReplay, take, throwError } from 'rxjs';

import { config } from '@config';
import {
  BackendAuthErrorCode,
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  LoginRequest,
  LoginResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  RefreshTokenResponse
} from '@models/auth.models';
import {
  AuthRedirectStorageService,
  AUTH_REDIRECT_MARKER_QUERY_PARAM,
  AUTH_REDIRECT_MARKER_VALUE
} from '@services/auth-redirect-storage.service';
import { AuthTokenStorageService } from '@services/auth-token-storage.service';

const MAX_RETURN_URL_LENGTH = 2000;
const AUTH_EMAIL_STORAGE_KEY = 'auth_email';
const DEFAULT_SESSION_VALIDATION_TTL_MS = 2 * 60 * 1000;

export type LoginErrorCode = 'no_credentials' | 'email_not_verified' | 'invalid_credentials' | 'request_failed';
export type ForgotPasswordErrorCode = 'no_credentials' | 'invalid_credentials' | 'request_failed';
export type ResetPasswordErrorCode = 'no_credentials' | 'password_too_short' | 'invalid_link' | 'request_failed';
type ResolvedAuthErrorCode = LoginErrorCode | ForgotPasswordErrorCode | ResetPasswordErrorCode;
type AuthErrorResolverMap<TErrorCode extends ResolvedAuthErrorCode> = {
  backend: Partial<Record<BackendAuthErrorCode, TErrorCode>>;
  status: Partial<Record<number, TErrorCode>>;
  fallback: TErrorCode;
};

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
  private readonly localeId = inject(LOCALE_ID);
  private readonly router = inject(Router);
  private readonly redirectStorage = inject(AuthRedirectStorageService);
  private readonly tokenStorage = inject(AuthTokenStorageService);

  private readonly _isAuthenticated = signal<boolean>(false);
  readonly isAuthenticated = this._isAuthenticated.asReadonly();
  private readonly _loginError = signal<LoginErrorCode | null>(null);
  readonly loginError = this._loginError.asReadonly();
  private readonly _forgotPasswordError = signal<ForgotPasswordErrorCode | null>(null);
  readonly forgotPasswordError = this._forgotPasswordError.asReadonly();
  private readonly _passwordResetRequested = signal<boolean>(false);
  readonly passwordResetRequested = this._passwordResetRequested.asReadonly();
  private readonly _resetPasswordError = signal<ResetPasswordErrorCode | null>(null);
  readonly resetPasswordError = this._resetPasswordError.asReadonly();
  private readonly _passwordResetCompleted = signal<boolean>(false);
  readonly passwordResetCompleted = this._passwordResetCompleted.asReadonly();
  private readonly _authenticatedEmail = signal<string | null>(null);
  readonly authenticatedEmail = this._authenticatedEmail.asReadonly();
  private readonly loginErrorResolverMap: AuthErrorResolverMap<LoginErrorCode> = {
    backend: {
      NO_CREDENTIALS: 'no_credentials',
      EMAIL_NOT_VERIFIED: 'email_not_verified',
      INCORRECT_CREDENTIALS: 'invalid_credentials'
    },
    status: {
      401: 'invalid_credentials'
    },
    fallback: 'request_failed'
  };
  private readonly forgotPasswordErrorResolverMap: AuthErrorResolverMap<ForgotPasswordErrorCode> = {
    backend: {
      NO_CREDENTIALS: 'no_credentials',
      INVALID_CREDENTIALS: 'invalid_credentials'
    },
    status: {
      400: 'invalid_credentials'
    },
    fallback: 'request_failed'
  };
  private readonly resetPasswordErrorResolverMap: AuthErrorResolverMap<ResetPasswordErrorCode> = {
    backend: {
      NO_CREDENTIALS: 'no_credentials',
      PASSWORD_TOO_SHORT: 'password_too_short'
    },
    status: {
      401: 'invalid_link',
      422: 'invalid_link'
    },
    fallback: 'request_failed'
  };

  private backendBaseURL: string = this.resolveBackendBaseURL();
  private backendAuthBaseURL: string = this.resolveBackendAuthBaseURL();
  private sessionValidationTTLms: number = this.resolveSessionValidationTTLms();
  private lastSessionValidationAt: number | null = null;
  private sessionValidationInFlight$: Observable<boolean> | null = null;
  private refreshTokenInProgress = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

  /**
   * Initializes base URL formatting and initial auth state from stored token.
   */
  constructor() {
    const accessToken = this.getAccessToken();
    const refreshToken = this.getRefreshToken();
    const hasCompleteStoredSession = accessToken !== null && refreshToken !== null;

    this._isAuthenticated.set(hasCompleteStoredSession);
    if (hasCompleteStoredSession) {
      this._authenticatedEmail.set(this.getStorageItem(AUTH_EMAIL_STORAGE_KEY));
    } else {
      this.clearAuthState(false);
    }
  }

  /**
   * Executes login request and stores received tokens on success.
   *
   * Current behavior:
   * - On success: persist tokens, navigate to returnUrl/account, mark authenticated.
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
        const normalizedEmail = email.trim();
        this.setStorageItem('access_token', access_token);
        this.setStorageItem('refresh_token', refresh_token);
        this.setStorageItem(AUTH_EMAIL_STORAGE_KEY, normalizedEmail);
        this._authenticatedEmail.set(normalizedEmail);
        this.markSessionValidatedNow();
        this.router.navigateByUrl(this.resolvePostLoginRedirectURL(redirectURL));
        this._isAuthenticated.set(true);
      },
      error: (error) => {
        this.clearAuthState(false);
        this._loginError.set(this.resolveAuthErrorCode(error, this.loginErrorResolverMap));
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
   * Requests a password reset email for the provided user address.
   */
  requestPasswordReset(email: string): void {
    this._forgotPasswordError.set(null);
    this._passwordResetRequested.set(false);
    const normalizedEmail = email.trim();
    const url = `${this.backendAuthBaseURL}auth/forgot_password`;
    const body: ForgotPasswordRequest = {
      email: normalizedEmail,
      language: this.resolveAuthRequestLanguage()
    };
    this.http.post<ForgotPasswordResponse>(url, body).subscribe({
      next: () => {
        this._passwordResetRequested.set(true);
      },
      error: (error) => {
        const errorCode = this.resolveAuthErrorCode(error, this.forgotPasswordErrorResolverMap);
        if (errorCode === 'request_failed') {
          this._forgotPasswordError.set(errorCode);
          return;
        }

        // Treat account-existence errors as successful request initiation to avoid
        // exposing whether an email address is registered.
        this._forgotPasswordError.set(null);
        this._passwordResetRequested.set(true);
      }
    });
  }

  /**
   * Clears password reset request feedback state.
   */
  clearForgotPasswordState(): void {
    this._forgotPasswordError.set(null);
    this._passwordResetRequested.set(false);
  }

  /**
   * Submits a new password using a password reset JWT token.
   */
  resetPassword(jwtToken: string, password: string): void {
    this._resetPasswordError.set(null);
    this._passwordResetCompleted.set(false);

    const normalizedToken = jwtToken.trim();
    if (!normalizedToken) {
      this._resetPasswordError.set('invalid_link');
      return;
    }

    const url = `${this.backendAuthBaseURL}auth/reset_password`;
    const headers = { Authorization: `Bearer ${normalizedToken}` };
    const body: ResetPasswordRequest = { password };
    this.http.post<ResetPasswordResponse>(url, body, { headers }).subscribe({
      next: () => {
        this._passwordResetCompleted.set(true);
        this.logout();
        this.router.navigateByUrl('/login?passwordReset=success');
      },
      error: (error) => {
        this._resetPasswordError.set(this.resolveAuthErrorCode(error, this.resetPasswordErrorResolverMap));
      }
    });
  }

  /**
   * Clears password reset completion and error state.
   */
  clearResetPasswordState(): void {
    this._resetPasswordError.set(null);
    this._passwordResetCompleted.set(false);
  }

  /**
   * Validates current backend session with throttling and request deduplication.
   *
   * Behavior:
   * - Returns cached success when the previous validation is still fresh.
   * - Reuses one in-flight validation request for concurrent callers.
   * - On backend 401, clears auth state and propagates the error.
   */
  validateSessionIfStale(ttlMs: number = this.sessionValidationTTLms): Observable<boolean> {
    const normalizedTtlMs = Number.isFinite(ttlMs) && ttlMs > 0 ? ttlMs : 0;
    const now = Date.now();
    if (normalizedTtlMs > 0 && this.lastSessionValidationAt !== null && now - this.lastSessionValidationAt < normalizedTtlMs) {
      return of(true);
    }

    if (this.sessionValidationInFlight$) {
      return this.sessionValidationInFlight$;
    }

    const url = `${this.backendBaseURL}session/validate`;
    const validationRequest$ = this.http.get<{ authenticated?: boolean }>(url).pipe(
      map(() => {
        this.markSessionValidatedNow();
        this._isAuthenticated.set(true);
        return true;
      }),
      catchError((error) => {
        if ((error as { status?: unknown } | null)?.status === 401) {
          this.clearAuthState(true);
        }
        return throwError(() => error);
      }),
      finalize(() => {
        this.sessionValidationInFlight$ = null;
      }),
      shareReplay({ bufferSize: 1, refCount: false })
    );

    this.sessionValidationInFlight$ = validationRequest$;
    return validationRequest$;
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
          this.markSessionValidatedNow();
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
   * Resolves API backend base URL from config.
   */
  private resolveBackendBaseURL(): string {
    const backendBaseURL = config?.app?.backendBaseURL;
    if (!backendBaseURL) {
      return '';
    }

    return backendBaseURL.endsWith('/') ? backendBaseURL : `${backendBaseURL}/`;
  }

  /**
   * Resolves auth-specific backend base URL from config.
   *
   * Priority:
   * 1) app.auth.backendAuthBaseURL
   * 2) root origin extracted from app.backendBaseURL
   */
  private resolveBackendAuthBaseURL(): string {
    const backendAuthBaseURL = config?.app?.auth?.backendAuthBaseURL;
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
   * 4) account route (`/account`)
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

    return '/account';
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

  private resolveAuthErrorCode<TErrorCode extends ResolvedAuthErrorCode>(
    error: unknown,
    resolverMap: AuthErrorResolverMap<TErrorCode>
  ): TErrorCode {
    const backendErrorCode = this.getBackendAuthErrorCode(error);
    if (backendErrorCode !== null) {
      const mappedBackendErrorCode = resolverMap.backend[backendErrorCode];
      if (mappedBackendErrorCode !== undefined) {
        return mappedBackendErrorCode;
      }
    }

    const status = (error as { status?: unknown } | null)?.status;
    if (typeof status === 'number') {
      const mappedStatusErrorCode = resolverMap.status[status];
      if (mappedStatusErrorCode !== undefined) {
        return mappedStatusErrorCode;
      }
    }

    return resolverMap.fallback;
  }

  private getBackendAuthErrorCode(error: unknown): BackendAuthErrorCode | null {
    const err = (error as { error?: { err?: unknown } } | null)?.error?.err;
    return this.isBackendAuthErrorCode(err) ? err : null;
  }

  private isBackendAuthErrorCode(value: unknown): value is BackendAuthErrorCode {
    return (
      value === 'NO_CREDENTIALS' ||
      value === 'EMAIL_NOT_VERIFIED' ||
      value === 'INCORRECT_CREDENTIALS' ||
      value === 'INVALID_CREDENTIALS' ||
      value === 'PASSWORD_TOO_SHORT' ||
      value === 'USER_ALREADY_EXISTS'
    );
  }

  private resolveAuthRequestLanguage(): string {
    return this.localeId.split('-')[0]?.toLowerCase();
  }

  private resolveSessionValidationTTLms(): number {
    const configuredTTLms = config?.app?.auth?.sessionValidationTTLms;
    return (
      typeof configuredTTLms === 'number' &&
      Number.isFinite(configuredTTLms) &&
      configuredTTLms >= 0
    )
      ? configuredTTLms
      : DEFAULT_SESSION_VALIDATION_TTL_MS;
  }

  private markSessionValidatedNow(): void {
    this.lastSessionValidationAt = Date.now();
  }

  private resetSessionValidationState(): void {
    this.lastSessionValidationAt = null;
    this.sessionValidationInFlight$ = null;
  }

  private clearAuthState(clearRedirectTarget: boolean): void {
    this.resetSessionValidationState();
    this.removeStorageItem('access_token');
    this.removeStorageItem('refresh_token');
    this.removeStorageItem(AUTH_EMAIL_STORAGE_KEY);
    this._isAuthenticated.set(false);
    this._authenticatedEmail.set(null);
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
