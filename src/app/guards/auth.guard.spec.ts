import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';

import { config } from '@config';
import { authGuard } from './auth.guard';
import { AuthService } from '@services/auth.service';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const isAuthenticated = signal<boolean>(false);
  let previousAuthEnabled: boolean;

  function asUrl(value: unknown): string | null {
    return value instanceof UrlTree ? value.toString() : null;
  }

  function runGuard(url: string): unknown {
    return executeGuard({} as any, { url } as any);
  }

  beforeEach(() => {
    config.app.auth = config.app.auth || {};
    previousAuthEnabled = config?.app?.auth?.enabled === true;
    config.app.auth.enabled = true;
    isAuthenticated.set(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated }
        }
      ]
    });
  });

  afterEach(() => {
    config.app.auth.enabled = previousAuthEnabled;
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
