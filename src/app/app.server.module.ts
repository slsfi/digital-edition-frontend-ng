import { NgModule } from '@angular/core';
import { provideHttpClient, withFetch, withInterceptors } from '@angular/common/http';
import { ServerModule } from '@angular/platform-server';
import { IonicServerModule } from '@ionic/angular-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import { authInterceptor } from '@interceptors/auth.interceptor';
import {
  RouteStateSourceService,
  ServerRouteStateSourceService
} from '@services/route-state-source.service';
import {
  CollectionTextViewsQueryParamSyncService,
  ServerCollectionTextViewsQueryParamSyncService
} from '@services/collection-text-views-query-param-sync.service';
import {
  AuthTokenStorageService,
  ServerAuthTokenStorageService
} from '@services/auth-token-storage.service';
import {
  RouterNavigationSourceService,
  ServerRouterNavigationSourceService
} from '@services/router-navigation-source.service';
import {
  RouterPreloadingStrategyService,
  ServerRouterPreloadingStrategyService
} from '@services/router-preloading-strategy.service';


@NgModule({
  imports: [
    AppModule,
    ServerModule,
    IonicServerModule,
  ],
  providers: [
    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor])
    ),
    {
      provide: RouteStateSourceService,
      useClass: ServerRouteStateSourceService
    },
    {
      provide: CollectionTextViewsQueryParamSyncService,
      useClass: ServerCollectionTextViewsQueryParamSyncService
    },
    {
      provide: RouterNavigationSourceService,
      useClass: ServerRouterNavigationSourceService
    },
    {
      provide: AuthTokenStorageService,
      useClass: ServerAuthTokenStorageService
    },
    {
      provide: RouterPreloadingStrategyService,
      useClass: ServerRouterPreloadingStrategyService
    }
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
