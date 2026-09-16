import { NgModule } from '@angular/core';

import { PageNotFoundPageRoutingModule } from './page-not-found-routing.module';
import { PageNotFoundPage } from './page-not-found.page';


@NgModule({
  imports: [
    PageNotFoundPage,
    PageNotFoundPageRoutingModule
  ]
})
export class PageNotFoundPageModule {}
