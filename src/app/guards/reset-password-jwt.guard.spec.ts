import { TestBed } from '@angular/core/testing';
import { CanActivateFn, UrlTree, provideRouter } from '@angular/router';

import { resetPasswordJwtGuard } from './reset-password-jwt.guard';

describe('resetPasswordJwtGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) =>
    TestBed.runInInjectionContext(() => resetPasswordJwtGuard(...guardParameters));

  function asUrl(value: unknown): string | null {
    return value instanceof UrlTree ? value.toString() : null;
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([])
      ]
    });
  });

  it('allows route when jwt query parameter exists', () => {
    const result = executeGuard(
      { queryParamMap: { get: () => 'valid-token' } } as any,
      {} as any
    );

    expect(result).toBe(true);
  });

  it('redirects to forgot-password when jwt query parameter is missing', () => {
    const result = executeGuard(
      { queryParamMap: { get: () => null } } as any,
      {} as any
    );

    expect(asUrl(result)).toBe('/forgot-password');
  });

  it('redirects to forgot-password when jwt query parameter is empty', () => {
    const result = executeGuard(
      { queryParamMap: { get: () => '   ' } } as any,
      {} as any
    );

    expect(asUrl(result)).toBe('/forgot-password');
  });
});
