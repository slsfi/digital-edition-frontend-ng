import { NgModule } from '@angular/core';

import { ContentPage } from './content.page';
import { ContentPageRoutingModule } from './content-routing.module';


@NgModule({
  imports: [
    ContentPage,
    ContentPageRoutingModule
  ]
})
export class ContentPageModule { }
