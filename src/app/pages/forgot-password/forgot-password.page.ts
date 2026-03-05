import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';

import { AuthService } from '@services/auth.service';

type PasswordFlowMode = 'forgot' | 'change';

@Component({
  selector: 'page-forgot-password',
  templateUrl: './forgot-password.page.html',
  styleUrls: ['./forgot-password.page.scss'],
  standalone: false
})
export class ForgotPasswordPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly flowMode: PasswordFlowMode = this.resolveFlowMode();
  readonly isChangePasswordMode = this.flowMode === 'change';
  readonly backRoute = this.isChangePasswordMode ? '/account' : '/login';

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });
  readonly forgotPasswordError = this.authService.forgotPasswordError;
  readonly passwordResetRequested = this.authService.passwordResetRequested;

  constructor() {
    if (this.isChangePasswordMode) {
      const authenticatedEmail = this.authService.authenticatedEmail();
      if (authenticatedEmail) {
        this.form.controls.email.setValue(authenticatedEmail);
      }
    }
  }

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

  private resolveFlowMode(): PasswordFlowMode {
    const routeMode = this.route.parent?.snapshot.data?.['passwordFlowMode'];
    return routeMode === 'change' ? 'change' : 'forgot';
  }
}
