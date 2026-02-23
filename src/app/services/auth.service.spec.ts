import { HttpClient, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { DefaultUrlSerializer, Router, UrlTree } from '@angular/router';

import { AuthTokenStorageService } from '@services/auth-token-storage.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  let httpMock: HttpTestingController;
  let router: jasmine.SpyObj<Pick<Router, 'navigateByUrl' | 'parseUrl'>>;
  let tokenStorage: jasmine.SpyObj<Pick<AuthTokenStorageService, 'setItem' | 'getItem' | 'removeItem'>>;
  let tokenMap: Map<string, string>;

  function createService(): AuthService {
    return TestBed.inject(AuthService);
  }

  beforeEach(() => {
    tokenMap = new Map<string, string>();
    const urlSerializer = new DefaultUrlSerializer();

    router = jasmine.createSpyObj<Pick<Router, 'navigateByUrl' | 'parseUrl'>>('Router', ['navigateByUrl', 'parseUrl']);
    router.navigateByUrl.and.resolveTo(true);
    router.parseUrl.and.callFake((url: string): UrlTree => urlSerializer.parse(url));
    Object.defineProperty(router, 'url', { value: '/login', writable: true });

    tokenStorage = jasmine.createSpyObj<
      Pick<AuthTokenStorageService, 'setItem' | 'getItem' | 'removeItem'>
    >('AuthTokenStorageService', ['setItem', 'getItem', 'removeItem']);
    tokenStorage.setItem.and.callFake((key: string, value: string) => {
      tokenMap.set(key, value);
    });
    tokenStorage.getItem.and.callFake((key: string) => tokenMap.get(key) ?? null);
    tokenStorage.removeItem.and.callFake((key: string) => {
      tokenMap.delete(key);
    });

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router },
        { provide: AuthTokenStorageService, useValue: tokenStorage }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('initializes isAuthenticated as false when access token is missing', () => {
    const service = createService();

    expect(service.isAuthenticated()).toBeFalse();
  });

  it('initializes isAuthenticated as true when access token exists', () => {
    tokenMap.set('access_token', 'existing-access-token');

    const service = createService();

    expect(service.isAuthenticated()).toBeTrue();
  });

  it('sets tokens, navigates, and updates signal on successful login', () => {
    const service = createService();

    service.login('user@example.com', 'secret');

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/login'));
    request.flush({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      msg: 'ok',
      user_projects: []
    });

    expect(tokenMap.get('access_token')).toBe('access-token-1');
    expect(tokenMap.get('refresh_token')).toBe('refresh-token-1');
    expect(service.isAuthenticated()).toBeTrue();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('navigates to returnUrl query param after successful login when safe', () => {
    (router as unknown as { url: string }).url = '/login?returnUrl=%2Fcollection%2F123%2Ftext';
    const service = createService();

    service.login('user@example.com', 'secret');

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/login'));
    request.flush({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      msg: 'ok',
      user_projects: []
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/collection/123/text');
  });

  it('ignores unsafe returnUrl query param after successful login', () => {
    (router as unknown as { url: string }).url = '/login?returnUrl=%2F%2Fevil.example';
    const service = createService();

    service.login('user@example.com', 'secret');

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/login'));
    request.flush({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      msg: 'ok',
      user_projects: []
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('ignores login-loop returnUrl query param after successful login', () => {
    (router as unknown as { url: string }).url = '/login?returnUrl=%2Flogin%3FreturnUrl%3D%252Fsearch';
    const service = createService();

    service.login('user@example.com', 'secret');

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/login'));
    request.flush({
      access_token: 'access-token-1',
      refresh_token: 'refresh-token-1',
      msg: 'ok',
      user_projects: []
    });

    expect(router.navigateByUrl).toHaveBeenCalledWith('/');
  });

  it('clears auth state when login fails', () => {
    tokenMap.set('access_token', 'stale-access');
    tokenMap.set('refresh_token', 'stale-refresh');
    const service = createService();

    service.login('user@example.com', 'wrong-password');

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/login'));
    request.flush({ detail: 'invalid credentials' }, { status: 401, statusText: 'Unauthorized' });

    expect(service.isAuthenticated()).toBeFalse();
    expect(tokenMap.has('access_token')).toBeFalse();
    expect(tokenMap.has('refresh_token')).toBeFalse();
  });

  it('updates signal and access token on successful refresh', () => {
    tokenMap.set('refresh_token', 'refresh-token-1');
    const service = createService();
    let refreshedToken: string | undefined;

    service.refreshToken().subscribe((token) => {
      refreshedToken = token;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/refresh'));
    expect(request.request.headers.get('Authorization')).toBe('Bearer refresh-token-1');
    request.flush({
      msg: 'ok',
      access_token: 'access-token-2'
    });

    expect(refreshedToken).toBe('access-token-2');
    expect(tokenMap.get('access_token')).toBe('access-token-2');
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('uses a single refresh request for concurrent callers and resolves both', () => {
    tokenMap.set('refresh_token', 'refresh-token-1');
    const service = createService();
    let firstResult: string | undefined;
    let secondResult: string | undefined;

    service.refreshToken().subscribe((token) => {
      firstResult = token;
    });
    service.refreshToken().subscribe((token) => {
      secondResult = token;
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/refresh'));
    request.flush({
      msg: 'ok',
      access_token: 'access-token-3'
    });

    expect(firstResult).toBe('access-token-3');
    expect(secondResult).toBe('access-token-3');
  });

  it('does not replay stale refresh token to waiters in a new refresh cycle', () => {
    tokenMap.set('refresh_token', 'refresh-token-1');
    const service = createService();
    let firstCycleToken: string | undefined;
    let secondCyclePrimaryToken: string | undefined;
    let secondCycleWaiterToken: string | undefined;

    service.refreshToken().subscribe((token) => {
      firstCycleToken = token;
    });
    const firstCycleRequest = httpMock.expectOne((req) => req.url.endsWith('/auth/refresh'));
    firstCycleRequest.flush({
      msg: 'ok',
      access_token: 'access-token-old'
    });
    expect(firstCycleToken).toBe('access-token-old');

    service.refreshToken().subscribe((token) => {
      secondCyclePrimaryToken = token;
    });
    const secondCycleRequest = httpMock.expectOne((req) => req.url.endsWith('/auth/refresh'));

    service.refreshToken().subscribe((token) => {
      secondCycleWaiterToken = token;
    });

    expect(secondCycleWaiterToken).toBeUndefined();

    secondCycleRequest.flush({
      msg: 'ok',
      access_token: 'access-token-new'
    });

    expect(secondCyclePrimaryToken).toBe('access-token-new');
    expect(secondCycleWaiterToken).toBe('access-token-new');
  });

  it('propagates refresh errors to concurrent waiters and clears auth state', () => {
    tokenMap.set('access_token', 'access-token-1');
    tokenMap.set('refresh_token', 'refresh-token-1');
    const service = createService();
    let firstError: any;
    let secondError: any;

    service.refreshToken().subscribe({
      next: () => fail('expected first refresh subscriber to error'),
      error: (error) => {
        firstError = error;
      }
    });
    service.refreshToken().subscribe({
      next: () => fail('expected second refresh subscriber to error'),
      error: (error) => {
        secondError = error;
      }
    });

    const request = httpMock.expectOne((req) => req.url.endsWith('/auth/refresh'));
    request.flush({ detail: 'refresh failed' }, { status: 401, statusText: 'Unauthorized' });

    expect(firstError?.status).toBe(401);
    expect(secondError?.status).toBe(401);
    expect(service.isAuthenticated()).toBeFalse();
    expect(tokenMap.has('access_token')).toBeFalse();
    expect(tokenMap.has('refresh_token')).toBeFalse();
  });
});
