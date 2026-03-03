import { Component, inject, OnDestroy } from '@angular/core';
import { FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '@services/auth.service';

@Component({
  selector: 'page-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });
  readonly forgotPasswordError = this.authService.forgotPasswordError;
  readonly passwordResetRequested = this.authService.passwordResetRequested;

  attemptPasswordRecovery(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email } = this.form.getRawValue();
    this.authService.requestPasswordReset(email.trim());
  }

  clearFeedbackState(): void {
    this.authService.clearForgotPasswordState();
  }

  ionViewWillLeave(): void {
    this.authService.clearForgotPasswordState();
  }

  ngOnDestroy(): void {
    this.authService.clearForgotPasswordState();
  }
}
