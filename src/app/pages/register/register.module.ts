import { NgModule } from '@angular/core';

import { RegisterPageRoutingModule } from './register-routing.module';
import { RegisterPage } from './register.page';

@NgModule({
  imports: [
    RegisterPage,
    RegisterPageRoutingModule
  ]
})
export class RegisterPageModule {}
