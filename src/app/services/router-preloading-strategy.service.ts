import { Injectable } from '@angular/core';
import { NoPreloading, PreloadAllModules, PreloadingStrategy, Route } from '@angular/router';
import { Observable } from 'rxjs';


/**
 * Provides router preloading behavior in a platform-specific way.
 *
 * Why this abstraction exists:
 * - Browser: preload lazy routes after navigation.
 * - Server (SSR): skip preloading to avoid extra render-time work.
 */
export abstract class RouterPreloadingStrategyService implements PreloadingStrategy {
  abstract preload(route: Route, load: () => Observable<any>): Observable<any>;
}

/**
 * Browser implementation:
 * uses Angular's PreloadAllModules strategy.
 */
@Injectable()
export class BrowserRouterPreloadingStrategyService
  extends RouterPreloadingStrategyService {
  private readonly strategy = new PreloadAllModules();

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return this.strategy.preload(route, load);
  }
}

/**
 * Server implementation:
 * uses Angular's NoPreloading strategy.
 */
@Injectable()
export class ServerRouterPreloadingStrategyService
  extends RouterPreloadingStrategyService {
  private readonly strategy = new NoPreloading();

  preload(route: Route, load: () => Observable<any>): Observable<any> {
    return this.strategy.preload(route, load);
  }
}
