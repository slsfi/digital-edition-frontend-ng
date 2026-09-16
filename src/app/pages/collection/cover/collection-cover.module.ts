import { NgModule } from '@angular/core';

import { CollectionCoverPageRoutingModule } from './collection-cover-routing.module';
import { CollectionCoverPage } from './collection-cover.page';

@NgModule({
  imports: [
    CollectionCoverPage,
    CollectionCoverPageRoutingModule
  ],
})
export class CollectionCoverPageModule {}
