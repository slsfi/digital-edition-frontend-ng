import { NgModule } from '@angular/core';

import { AccountPageRoutingModule } from './account-routing.module';
import { AccountPage } from './account.page';

@NgModule({
  imports: [
    AccountPage,
    AccountPageRoutingModule
  ]
})
export class AccountPageModule {}
