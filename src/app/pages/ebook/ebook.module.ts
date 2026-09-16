import { NgModule } from '@angular/core';

import { EbookPageRoutingModule } from './ebook-routing.module';
import { EbookPage } from './ebook.page';


@NgModule({
  imports: [
    EbookPage,
    EbookPageRoutingModule,
  ]
})
export class EbookPageModule {}
