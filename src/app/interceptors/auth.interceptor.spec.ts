import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from '@services/auth.service';
import { AUTH_ENABLED } from '@tokens/auth.tokens';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let authService: jasmine.SpyObj<Pick<AuthService, 'getAccessToken' | 'getRefreshToken' | 'refreshToken' | 'logout'>>;
  let router: jasmine.SpyObj<Pick<Router, 'navigate'>>;

  beforeEach(() => {
    authService = jasmine.createSpyObj<Pick<AuthService, 'getAccessToken' | 'getRefreshToken' | 'refreshToken' | 'logout'>>(
      'AuthService',
      ['getAccessToken', 'getRefreshToken', 'refreshToken', 'logout']
    );
    router = jasmine.createSpyObj<Pick<Router, 'navigate'>>('Router', ['navigate']);
    router.navigate.and.resolveTo(true);
    authService.getRefreshToken.and.returnValue('refresh-token');

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AUTH_ENABLED, useValue: true },
        { provide: AuthService, useValue: authService },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('adds bearer token for non-auth requests when token exists', () => {
    authService.getAccessToken.and.returnValue('abc-token');

    http.get('/api/content').subscribe();

    const req = httpMock.expectOne('/api/content');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc-token');
    req.flush({ ok: true });
  });

  it('does not add bearer token for /auth/ requests', () => {
    authService.getAccessToken.and.returnValue('abc-token');

    http.post('/auth/login', {}).subscribe();

    const req = httpMock.expectOne('/auth/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ ok: true });
  });

  it('refreshes token and retries request on 401 for non-refresh endpoint', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(of('new-token'));

    http.get('/api/protected').subscribe();

    const firstReq = httpMock.expectOne('/api/protected');
    expect(firstReq.request.headers.get('Authorization')).toBe('Bearer expired-token');
    firstReq.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    const retryReq = httpMock.expectOne('/api/protected');
    expect(retryReq.request.headers.get('Authorization')).toBe('Bearer new-token');
    retryReq.flush({ ok: true });

    expect(authService.refreshToken).toHaveBeenCalledTimes(1);
  });

  it('does not try to refresh when /auth/login returns 401', () => {
    authService.getAccessToken.and.returnValue('expired-token');

    let receivedError: any;
    http.post('/auth/login', { email: 'u', password: 'p' }).subscribe({
      error: (error) => {
        receivedError = error;
      }
    });

    const loginReq = httpMock.expectOne('/auth/login');
    expect(loginReq.request.headers.has('Authorization')).toBeFalse();
    loginReq.flush({ message: 'invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(receivedError).toEqual(jasmine.objectContaining({ status: 401 }));
  });

  it('does not try to refresh when refresh token is missing', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.getRefreshToken.and.returnValue(null);

    let receivedError: any;
    http.get('/api/protected').subscribe({
      error: (error) => {
        receivedError = error;
      }
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.refreshToken).not.toHaveBeenCalled();
    expect(authService.logout).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
    expect(receivedError).toEqual(jasmine.objectContaining({ status: 401 }));
  });

  it('logs out and redirects to /login when refresh returns 401', () => {
    authService.getAccessToken.and.returnValue('expired-token');
    authService.refreshToken.and.returnValue(
      throwError(() => ({ status: 401 }))
    );

    let receivedError: any;
    http.get('/api/protected').subscribe({
      error: (error) => {
        receivedError = error;
      }
    });

    const firstReq = httpMock.expectOne('/api/protected');
    firstReq.flush({ message: 'unauthorized' }, { status: 401, statusText: 'Unauthorized' });

    expect(authService.logout).toHaveBeenCalledTimes(1);
    expect(router.navigate).toHaveBeenCalledWith(['/login'], { replaceUrl: true });
    expect(receivedError).toEqual(jasmine.objectContaining({ status: 401 }));
  });
});
