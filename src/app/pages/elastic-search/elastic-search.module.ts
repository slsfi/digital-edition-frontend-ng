import { NgModule } from '@angular/core';

import { ElasticSearchPageRoutingModule } from './elastic-search-routing.module';
import { ElasticSearchPage } from './elastic-search.page';


@NgModule({
  imports: [
    ElasticSearchPage,
    ElasticSearchPageRoutingModule
  ]
})
export class ElasticSearchPageModule {}
