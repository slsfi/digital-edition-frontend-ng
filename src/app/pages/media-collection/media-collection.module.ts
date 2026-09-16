import { NgModule } from '@angular/core';

import { MediaCollectionPageRoutingModule } from './media-collection-routing.module';
import { MediaCollectionPage } from './media-collection.page';


@NgModule({
  imports: [
    MediaCollectionPage,
    MediaCollectionPageRoutingModule
  ],
})
export class MediaCollectionPageModule {}
