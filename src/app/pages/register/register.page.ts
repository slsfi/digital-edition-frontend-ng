import { computed, Component, inject, OnDestroy } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { FormBuilder, Validators } from '@angular/forms';
import { startWith } from 'rxjs';

import { config } from '@config';
import { getAuthRedirectNavigationQueryParams } from '@services/auth-redirect-url.utils';
import {
  getPasswordFieldValidators,
  PASSWORD_COMPLEXITY_ERROR_KEY,
  passwordMatchValidator
} from '@services/auth-password.utils';
import { AuthService } from '@services/auth.service';

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

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', getPasswordFieldValidators()],
    confirmPassword: ['', [Validators.required]],
    acceptTermsOfUse: [false, this.showTermsOfUse ? [Validators.requiredTrue] : []],
    acceptPrivacyPolicy: [false, this.showPrivacyPolicy ? [Validators.requiredTrue] : []]
  }, { validators: passwordMatchValidator() });
  private readonly formState = toSignal(this.form.events.pipe(startWith(null)), { initialValue: null });
  readonly passwordComplexityErrorKey = PASSWORD_COMPLEXITY_ERROR_KEY;
  readonly emailRequiredError = computed(() => this.hasControlError('email', 'required'));
  readonly emailInvalidError = computed(() => this.hasControlError('email', 'email'));
  readonly passwordRequirementsError = computed(() => {
    this.formState();
    const passwordControl = this.form.controls.password;

    return passwordControl.touched
      && (passwordControl.hasError('minlength') || passwordControl.hasError(this.passwordComplexityErrorKey));
  });
  readonly passwordMismatchError = computed(() => {
    this.formState();
    return this.form.hasError('password_mismatch');
  });
  readonly acceptTermsOfUseRequiredError = computed(() => this.hasControlError('acceptTermsOfUse', 'required'));
  readonly acceptPrivacyPolicyRequiredError = computed(() => this.hasControlError('acceptPrivacyPolicy', 'required'));
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

    const { email, password } = this.form.getRawValue();
    this.authService.register(email.trim(), password);
  }

  clearFeedbackState(): void {
    this.authService.clearRegisterState();
  }

  private hasControlError(controlName: 'email' | 'acceptTermsOfUse' | 'acceptPrivacyPolicy', errorKey: string): boolean {
    this.formState();
    const control = this.form.controls[controlName];

    return control.touched && control.hasError(errorKey);
  }
}
