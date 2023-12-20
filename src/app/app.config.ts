import { ApplicationConfig, importProvidersFrom, mergeApplicationConfig } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideClientHydration } from '@angular/platform-browser';
import { PreloadAllModules, provideRouter, RouteReuseStrategy, withEnabledBlockingInitialNavigation, withPreloading } from '@angular/router';
import { IonicModule, IonicRouteStrategy } from '@ionic/angular';

import { routes } from './app.routes';


export const appConfigBase: ApplicationConfig = {
  providers: [
    provideHttpClient(withFetch()),
    provideRouter(
      routes,
      withPreloading(PreloadAllModules),
      withEnabledBlockingInitialNavigation()
    ),
    provideClientHydration(),
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy }
  ]
};

const ionicConfig: ApplicationConfig = {
  providers: [
    importProvidersFrom(
      IonicModule.forRoot({
        mode: 'md',
      })
    )
  ]
};

export const appConfig: ApplicationConfig = mergeApplicationConfig(ionicConfig, appConfigBase);
