import { Component, inject } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { config } from '@config';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'page-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false
})
export class LoginPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]]
  });
  readonly loginError = this.authService.loginError;
  readonly showTermsLink: boolean = config.component?.mainSideMenu?.items?.termsOfUse === true;
  readonly showPrivacyPolicyLink: boolean = config.component?.mainSideMenu?.items?.privacyPolicy === true;

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.authService.login(email.trim(), password);
  }

  clearAuthError(): void {
    this.authService.clearLoginError();
  }
}
