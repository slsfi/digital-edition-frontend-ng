import { Route } from '@angular/router';
import { of } from 'rxjs';

import {
  BrowserRouterPreloadingStrategyService,
  ServerRouterPreloadingStrategyService
} from './router-preloading-strategy.service';

describe('RouterPreloadingStrategyService', () => {
  it('preloads eager browser routes immediately', () => {
    const service = new BrowserRouterPreloadingStrategyService();
    const load = jasmine.createSpy('load').and.returnValue(of('loaded'));
    let result: string | undefined;

    service.preload({ data: { preload: 'eager' } } as Route, load)
      .subscribe((value) => result = value);

    expect(load).toHaveBeenCalledTimes(1);
    expect(result).toBe('loaded');
  });

  it('does not preload browser routes configured as off', () => {
    const service = new BrowserRouterPreloadingStrategyService();
    const load = jasmine.createSpy('load').and.returnValue(of('loaded'));

    service.preload({ data: { preload: 'off' } } as Route, load).subscribe();

    expect(load).not.toHaveBeenCalled();
  });

  it('never preloads routes on the server', () => {
    const service = new ServerRouterPreloadingStrategyService();
    const load = jasmine.createSpy('load').and.returnValue(of('loaded'));

    service.preload({ data: { preload: 'eager' } } as Route, load).subscribe();

    expect(load).not.toHaveBeenCalled();
  });
});
