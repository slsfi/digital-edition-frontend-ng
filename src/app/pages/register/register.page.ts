import { Component, inject, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { AbstractControl, FormBuilder, ValidationErrors, Validators } from '@angular/forms';

import { config } from '@config';
import { getAuthRedirectNavigationQueryParams } from '@services/auth-redirect-url.utils';
import { getPasswordFieldValidators, PASSWORD_COMPLEXITY_ERROR_KEY,
         passwordMatchValidator
        } from '@services/auth-password.utils';
import { AuthService } from '@services/auth.service';

const REGISTER_NAME_MAX_LENGTH = 255;

function requiredTrimmedTextValidator(control: AbstractControl<string | null>): ValidationErrors | null {
  const value = control.value;

  return typeof value === 'string' && value.trim().length > 0
    ? null
    : { required: true };
}

@Component({
  selector: 'page-register',
  templateUrl: './register.page.html',
  styleUrls: ['./register.page.scss'],
  standalone: false
})
export class RegisterPage implements OnDestroy {
  private readonly formBuilder = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  readonly showTermsOfUse: boolean = config.component?.mainSideMenu?.items?.termsOfUse === true;
  readonly showPrivacyPolicy: boolean = config.component?.mainSideMenu?.items?.privacyPolicy === true;
  readonly registerNameMaxLength = REGISTER_NAME_MAX_LENGTH;

  readonly form = this.formBuilder.nonNullable.group({
    name: ['', [requiredTrimmedTextValidator, Validators.maxLength(REGISTER_NAME_MAX_LENGTH)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', getPasswordFieldValidators()],
    confirmPassword: ['', [Validators.required]],
    acceptTermsOfUse: [false, this.showTermsOfUse ? [Validators.requiredTrue] : []],
    acceptPrivacyPolicy: [false, this.showPrivacyPolicy ? [Validators.requiredTrue] : []]
  }, { validators: passwordMatchValidator() });
  readonly passwordComplexityErrorKey = PASSWORD_COMPLEXITY_ERROR_KEY;
  readonly registerError = this.authService.registerError;
  readonly registrationCompleted = this.authService.registrationCompleted;

  get authRedirectNavigationQueryParams(): Record<string, unknown> {
    return getAuthRedirectNavigationQueryParams(this.router, this.router.url);
  }

  ionViewWillLeave(): void {
    this.authService.clearRegisterState();
  }

  ngOnDestroy(): void {
    this.authService.clearRegisterState();
  }

  attemptRegistration(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { name, email, password } = this.form.getRawValue();
    this.authService.register(name.trim(), email.trim(), password);
  }

  clearFeedbackState(): void {
    this.authService.clearRegisterState();
  }

  showControlError(controlName: 'name' | 'email' | 'acceptTermsOfUse' | 'acceptPrivacyPolicy', errorKey: string): boolean {
    const control = this.form.controls[controlName];

    return control.touched && control.hasError(errorKey);
  }

  showPasswordRequirementsError(): boolean {
    const passwordControl = this.form.controls.password;

    return passwordControl.touched
      && (passwordControl.hasError('minlength') || passwordControl.hasError(this.passwordComplexityErrorKey));
  }

  showPasswordMismatchError(): boolean {
    return this.form.hasError('password_mismatch');
  }
}
