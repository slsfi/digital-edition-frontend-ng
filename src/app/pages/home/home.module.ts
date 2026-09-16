import { NgModule } from '@angular/core';

import { HomePageRoutingModule } from './home-routing.module';
import { HomePage } from './home.page';


@NgModule({
  imports: [
    HomePage,
    HomePageRoutingModule
  ],
})
export class HomePageModule {}
