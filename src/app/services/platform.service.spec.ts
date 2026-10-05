import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { APPLICATION_REQUEST_CONTEXT, ApplicationRequestContext } from '@tokens/request-context.token';
import { PlatformService } from './platform.service';

function createService(platform: 'browser' | 'server', context?: ApplicationRequestContext): PlatformService {
  TestBed.configureTestingModule({
    providers: [
      { provide: PLATFORM_ID, useValue: platform },
      ...(context ? [{ provide: APPLICATION_REQUEST_CONTEXT, useValue: context }] : [])
    ]
  });
  return TestBed.inject(PlatformService);
}

describe('PlatformService request context', () => {
  for (const [userAgent, isMobile] of [
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/154.0', false],
    ['Mozilla/5.0 (iPhone) Mobile/15E148 Safari/604.1', true],
    ['Mozilla/5.0 (Linux; Android 15) Chrome/154.0', true],
    ['Mozilla/5.0 (iPad) Safari/604.1', true],
    ['Opera Mini/1.0', true],
    ['Edition crawler/1.0', false]
  ] as const) {
    it(`uses the server user agent ${userAgent}`, () => {
      expect(createService('server', { url: '/sv/', userAgent }).isMobile()).toBe(isMobile);
    });
  }

  it('defaults to desktop without a server context even if the browser user agent is mobile', () => {
    spyOnProperty(window.navigator, 'userAgent', 'get').and.returnValue('iPhone Mobile');
    expect(createService('server').isMobile()).toBeFalse();
  });

  it('defaults to desktop when the server context has no user agent', () => {
    expect(createService('server', { url: '/sv/' }).isMobile()).toBeFalse();
  });

  it('uses the browser navigator when no server context is provided', () => {
    spyOnProperty(window.navigator, 'userAgent', 'get').and.returnValue('Android Mobile');
    expect(createService('browser').isMobile()).toBeTrue();
  });

  it('uses the browser navigator even if a server context is accidentally present', () => {
    spyOnProperty(window.navigator, 'userAgent', 'get').and.returnValue('Desktop browser');
    expect(createService('browser', { url: '/sv/', userAgent: 'iPhone Mobile' }).isMobile()).toBeFalse();
  });
});
