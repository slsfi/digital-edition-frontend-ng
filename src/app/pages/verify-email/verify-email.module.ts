import { NgModule } from '@angular/core';

import { VerifyEmailPageRoutingModule } from './verify-email-routing.module';
import { VerifyEmailPage } from './verify-email.page';

@NgModule({
  imports: [
    VerifyEmailPage,
    VerifyEmailPageRoutingModule
  ]
})
export class VerifyEmailPageModule {}
