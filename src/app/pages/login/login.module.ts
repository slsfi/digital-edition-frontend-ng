import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { IonicModule } from '@ionic/angular';

import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';

@NgModule({
  declarations: [
    LoginPage
  ],
  imports: [
    CommonModule,
    IonicModule,
    LoginPageRoutingModule
  ]
})
export class LoginPageModule {}
