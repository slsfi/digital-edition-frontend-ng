import { TestBed } from '@angular/core/testing';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';
import { BehaviorSubject, firstValueFrom, isObservable } from 'rxjs';

import { authGuard } from './auth.guard';
import { AuthService } from '@services/auth.service';

describe('authGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => authGuard(...guardParameters));
  const isAuthenticated$ = new BehaviorSubject<boolean>(false);

  function asUrl(value: unknown): string | null {
    return value instanceof UrlTree ? value.toString() : null;
  }

  async function runGuard(url: string): Promise<unknown> {
    const result = executeGuard({} as any, { url } as any);

    if (isObservable(result)) {
      return firstValueFrom(result);
    }

    if (result instanceof Promise) {
      return result;
    }

    return result as unknown;
  }

  beforeEach(() => {
    isAuthenticated$.next(false);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { isAuthenticated$ }
        }
      ]
    });
  });

  it('allows protected route when authenticated', async () => {
    isAuthenticated$.next(true);

    const result = await runGuard('/collection/123/text');

    expect(result).toBe(true);
  });

  it('redirects protected route to /login when unauthenticated', async () => {
    const result = await runGuard('/collection/123/text');

    expect(asUrl(result)).toBe('/login');
  });

  it('allows /login when unauthenticated', async () => {
    const result = await runGuard('/login');

    expect(result).toBe(true);
  });

  it('redirects /login to / when authenticated', async () => {
    isAuthenticated$.next(true);

    const result = await runGuard('/login');

    expect(asUrl(result)).toBe('/');
  });

  it('treats /login with query params as login route', async () => {
    isAuthenticated$.next(true);

    const result = await runGuard('/login?next=%2Fsearch');

    expect(asUrl(result)).toBe('/');
  });
});
