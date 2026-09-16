import { NgModule } from '@angular/core';

import { AboutPage } from './about.page';
import { AboutPageRoutingModule } from './about-routing.module';

@NgModule({
  imports: [
    AboutPage,
    AboutPageRoutingModule,
  ]
})
export class AboutPageModule {}
