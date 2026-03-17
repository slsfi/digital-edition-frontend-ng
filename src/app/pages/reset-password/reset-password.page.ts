import { Component, inject, OnDestroy } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';

import {
  getPasswordFieldValidators,
  PASSWORD_COMPLEXITY_ERROR_KEY,
  passwordMatchValidator
} from '@services/auth-password.utils';
import { AuthService } from '@services/auth.service';

@Component({
  selector: 'page-reset-password',
  templateUrl: './reset-password.page.html',
  styleUrls: ['./reset-password.page.scss'],
  standalone: false
})
export class ResetPasswordPage implements OnDestroy {
  private readonly document = inject(DOCUMENT);
  private readonly route = inject(ActivatedRoute);
  private readonly formBuilder = inject(FormBuilder);
  private readonly authService = inject(AuthService);
  private jwtToken = '';

  readonly form = this.formBuilder.nonNullable.group({
    password: ['', getPasswordFieldValidators()],
    confirmPassword: ['', [Validators.required]]
  }, { validators: passwordMatchValidator() });
  readonly passwordComplexityErrorKey = PASSWORD_COMPLEXITY_ERROR_KEY;
  readonly resetPasswordError = this.authService.resetPasswordError;
  readonly passwordResetCompleted = this.authService.passwordResetCompleted;
  readonly passwordResetInProgress = this.authService.passwordResetInProgress;

  ionViewWillEnter(): void {
    this.initializeResetState();
  }

  ionViewWillLeave(): void {
    this.authService.clearResetPasswordState();
  }

  ngOnDestroy(): void {
    this.authService.clearResetPasswordState();
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

  private initializeResetState(): void {
    this.authService.clearResetPasswordState();
    const jwtTokenFromFragment = this.resolveJwtTokenFromFragment(this.route.snapshot.fragment);
    if (!jwtTokenFromFragment) {
      return;
    }

    this.jwtToken = jwtTokenFromFragment;
    this.scrubJwtFromAddressBar();
  }

  private scrubJwtFromAddressBar(): void {
    const windowRef = this.document.defaultView;
    if (!windowRef) {
      return;
    }

    try {
      const url = new URL(windowRef.location.href);
      const rawFragment = url.hash.startsWith('#') ? url.hash.slice(1) : url.hash;
      const fragmentParams = new URLSearchParams(rawFragment);
      if (!fragmentParams.has('jwt')) {
        return;
      }

      fragmentParams.delete('jwt');
      const fragment = fragmentParams.toString();
      const sanitizedUrl = `${url.pathname}${url.search}${fragment ? `#${fragment}` : ''}`;
      windowRef.history.replaceState(windowRef.history.state, '', sanitizedUrl);
    } catch {
      // Ignore parsing/history errors; reset flow can proceed with in-memory token.
    }
  }

  private resolveJwtTokenFromFragment(fragment: string | null): string {
    if (typeof fragment !== 'string') {
      return '';
    }

    const normalizedFragment = fragment.startsWith('#') ? fragment.slice(1) : fragment;
    return new URLSearchParams(normalizedFragment).get('jwt')?.trim() ?? '';
  }
}
