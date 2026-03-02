import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';

import { AuthService } from '@services/auth.service';

const MINIMUM_PASSWORD_LENGTH = 12;

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;

  if (typeof password !== 'string' || typeof confirmPassword !== 'string') {
    return null;
  }

  if (!password || !confirmPassword) {
    return null;
  }

  return password === confirmPassword ? null : { password_mismatch: true };
}

@Component({
  selector: 'page-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private readonly jwtToken: string = this.route.snapshot.queryParamMap.get('jwt')?.trim() ?? '';

  readonly form = this.formBuilder.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(MINIMUM_PASSWORD_LENGTH)]],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator });
  readonly resetPasswordError = this.authService.resetPasswordError;
  readonly passwordResetCompleted = this.authService.passwordResetCompleted;

  constructor() {
    this.scrubJwtFromAddressBar();
  }

  attemptPasswordReset(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { password } = this.form.getRawValue();
    this.authService.resetPassword(this.jwtToken, password);
  }

  clearFeedbackState(): void {
    this.authService.clearResetPasswordState();
  }

  private scrubJwtFromAddressBar(): void {
    const windowRef = this.document.defaultView;
    if (!windowRef) {
      return;
    }

    try {
      const url = new URL(windowRef.location.href);
      if (!url.searchParams.has('jwt')) {
        return;
      }

      url.searchParams.delete('jwt');
      const query = url.searchParams.toString();
      const sanitizedUrl = `${url.pathname}${query ? `?${query}` : ''}${url.hash}`;
      windowRef.history.replaceState(windowRef.history.state, '', sanitizedUrl);
    } catch {
      // Ignore parsing/history errors; reset flow can proceed with in-memory token.
    }
  }
}
