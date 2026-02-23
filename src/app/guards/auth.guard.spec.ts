import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';

import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';
import { authGuard } from './auth.guard';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const isAuthenticated = signal<boolean>(false);

  function asUrl(value: unknown): string | null {
    return value instanceof UrlTree ? value.toString() : null;
  }

  function runGuard(url: string): unknown {
    return executeGuard({} as any, { url } as any);
  }

  describe('when auth feature is disabled', () => {
    beforeEach(() => {
      isAuthenticated.set(false);
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: AUTH_ENABLED, useValue: false },
          { provide: AuthService, useValue: { isAuthenticated } }
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
      TestBed.configureTestingModule({
        providers: [
          provideRouter([]),
          { provide: AUTH_ENABLED, useValue: true },
          { provide: AuthService, useValue: { isAuthenticated } }
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

      expect(asUrl(result)).toBe('/login');
    });

    it('allows /login when unauthenticated', () => {
      const result = runGuard('/login');

      expect(result).toBe(true);
    });

    it('redirects /login to / when authenticated', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login');

      expect(asUrl(result)).toBe('/');
    });

    it('treats /login with query params as login route', () => {
      isAuthenticated.set(true);

      const result = runGuard('/login?next=%2Fsearch');

      expect(asUrl(result)).toBe('/');
    });
  });
});
