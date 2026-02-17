import { NgModule } from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { ServerModule } from '@angular/platform-server';
import { IonicServerModule } from '@ionic/angular-server';

import { AppModule } from './app.module';
import { AppComponent } from './app.component';
import {
  RouteStateSourceService,
  ServerRouteStateSourceService
} from '@services/route-state-source.service';
import {
  CollectionTextViewsQueryParamSyncService,
  ServerCollectionTextViewsQueryParamSyncService
} from '@services/collection-text-views-query-param-sync.service';


@NgModule({
  imports: [
    AppModule,
    ServerModule,
    IonicServerModule,
  ],
  providers: [
    provideHttpClient(withFetch()),
    {
      provide: RouteStateSourceService,
      useClass: ServerRouteStateSourceService
    },
    {
      provide: CollectionTextViewsQueryParamSyncService,
      useClass: ServerCollectionTextViewsQueryParamSyncService
    }
  ],
  bootstrap: [AppComponent],
})
export class AppServerModule {}
