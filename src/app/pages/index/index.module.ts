import { NgModule } from '@angular/core';

import { IndexPageRoutingModule } from './index-routing.module';
import { IndexPage } from './index.page';


@NgModule({
  imports: [
    IndexPage,
    IndexPageRoutingModule
  ]
})
export class IndexPageModule {}
