import { NgModule } from '@angular/core';

import { LoginPageRoutingModule } from './login-routing.module';
import { LoginPage } from './login.page';

@NgModule({
  imports: [
    LoginPage,
    LoginPageRoutingModule
  ]
})
export class LoginPageModule {}
