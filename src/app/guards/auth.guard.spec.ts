import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';

import {
  AuthRedirectStorageService,
  AUTH_REDIRECT_MARKER_QUERY_PARAM,
  AUTH_REDIRECT_MARKER_VALUE
} from '@services/auth-redirect-storage.service';
import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const isAuthenticated = signal<boolean>(false);
  let authRedirectStorage: jasmine.SpyObj<Pick<AuthRedirectStorageService, 'storeReturnUrl' | 'consumeReturnUrl'>>;

  function asUrl(value: unknown): string | null {
    return value instanceof UrlTree ? value.toString() : null;
  }

  function runGuard(url: string): unknown {
    return executeGuard({} as any, { url } as any);
  }

  describe('when auth feature is disabled', () => {
    beforeEach(() => {
      isAuthenticated.set(false);
      authRedirectStorage = jasmine.createSpyObj<
        Pick<AuthRedirectStorageService, 'storeReturnUrl' | 'consumeReturnUrl'>
      >('AuthRedirectStorageService', ['storeReturnUrl', 'consumeReturnUrl']);
      authRedirectStorage.storeReturnUrl.and.returnValue(true);
      authRedirectStorage.consumeReturnUrl.and.returnValue(null);
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: AUTH_ENABLED, useValue: false },
          { provide: AuthService, useValue: { isAuthenticated } },
          { provide: AuthRedirectStorageService, useValue: authRedirectStorage }
        ]
      });
    });

    it('is a no-op and always allows', () => {
      const protectedResult = runGuard('/collection/123/text');
      const loginResult = runGuard('/login');

      expect(protectedResult).toBe(true);
      expect(loginResult).toBe(true);
    });
  });

  describe('when auth feature is enabled', () => {
    beforeEach(() => {
      isAuthenticated.set(false);
      authRedirectStorage = jasmine.createSpyObj<
        Pick<AuthRedirectStorageService, 'storeReturnUrl' | 'consumeReturnUrl'>
      >('AuthRedirectStorageService', ['storeReturnUrl', 'consumeReturnUrl']);
      authRedirectStorage.storeReturnUrl.and.returnValue(true);
      authRedirectStorage.consumeReturnUrl.and.returnValue(null);
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: AUTH_ENABLED, useValue: true },
          { provide: AuthService, useValue: { isAuthenticated } },
          { provide: AuthRedirectStorageService, useValue: authRedirectStorage }
        ]
      });
    });

    it('allows protected route when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/collection/123/text');

      expect(result).toBe(true);
    });

    it('redirects protected route to /login when unauthenticated', () => {
      const result = runGuard('/collection/123/text');

      expect(authRedirectStorage.storeReturnUrl).toHaveBeenCalledWith('/collection/123/text');
      expect(asUrl(result)).toBe(`/login?${AUTH_REDIRECT_MARKER_QUERY_PARAM}=${AUTH_REDIRECT_MARKER_VALUE}`);
    });

    it('falls back to legacy returnUrl query param when marker storage fails', () => {
      authRedirectStorage.storeReturnUrl.and.returnValue(false);

      const result = runGuard('/collection/123/text');

      expect(asUrl(result)).toBe('/login?returnUrl=%2Fcollection%2F123%2Ftext');
    });

    it('allows /login when unauthenticated', () => {
      const result = runGuard('/login');

      expect(result).toBe(true);
    });

    it('redirects /login to / when authenticated and returnUrl is missing', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login');

      expect(asUrl(result)).toBe('/');
    });

    it('redirects /login to returnUrl when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login?returnUrl=%2Fsearch');

      expect(asUrl(result)).toBe('/search');
    });

    it('redirects /login marker flow to stored URL when authenticated', () => {
      isAuthenticated.set(true);
      authRedirectStorage.consumeReturnUrl.and.returnValue('/collection/123/text');

      const result = runGuard(`/login?${AUTH_REDIRECT_MARKER_QUERY_PARAM}=${AUTH_REDIRECT_MARKER_VALUE}`);

      expect(authRedirectStorage.consumeReturnUrl).toHaveBeenCalledTimes(1);
      expect(asUrl(result)).toBe('/collection/123/text');
    });

    it('ignores non-matching marker value and uses legacy returnUrl when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login?rt=unexpected&returnUrl=%2Fsearch');

      expect(authRedirectStorage.consumeReturnUrl).not.toHaveBeenCalled();
      expect(asUrl(result)).toBe('/search');
    });

    it('falls back to / when stored marker URL is missing or invalid', () => {
      isAuthenticated.set(true);
      authRedirectStorage.consumeReturnUrl.and.returnValue('//evil.example');

      const result = runGuard(`/login?${AUTH_REDIRECT_MARKER_QUERY_PARAM}=${AUTH_REDIRECT_MARKER_VALUE}`);

      expect(asUrl(result)).toBe('/');
    });

    it('ignores unsafe returnUrl and redirects /login to / when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login?returnUrl=%2F%2Fevil.example');

      expect(asUrl(result)).toBe('/');
    });

    it('ignores login-loop returnUrl and redirects /login to / when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login?returnUrl=%2Flogin%3FreturnUrl%3D%252Fsearch');

      expect(asUrl(result)).toBe('/');
    });

    it('ignores too-long returnUrl and redirects /login to / when authenticated', () => {
      isAuthenticated.set(true);
      const longReturnUrl = `/${'a'.repeat(2001)}`;

      const result = runGuard(`/login?returnUrl=${encodeURIComponent(longReturnUrl)}`);

      expect(asUrl(result)).toBe('/');
    });
  });
});
