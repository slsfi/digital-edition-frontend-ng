import { Component, inject, OnDestroy } from '@angular/core';
import { ActivatedRoute, PRIMARY_OUTLET, Router } from '@angular/router';
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
  private readonly router = inject(Router);
  private flowMode: PasswordFlowMode = 'forgot';

  get isChangePasswordMode(): boolean {
    return this.flowMode === 'change';
  }

  get backRoute(): string {
    return this.isChangePasswordMode ? '/account' : '/login';
  }

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]]
  });
  readonly forgotPasswordError = this.authService.forgotPasswordError;
  readonly passwordResetRequested = this.authService.passwordResetRequested;

  constructor() {
    this.syncFlowModeFromRoute();
    this.prefillAuthenticatedEmailForChangeMode();
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

  ionViewWillEnter(): void {
    this.syncFlowModeFromRoute();
    this.prefillAuthenticatedEmailForChangeMode();
  }

  ngOnDestroy(): void {
    this.authService.clearForgotPasswordState();
  }

  private syncFlowModeFromRoute(): void {
    this.flowMode = this.resolveFlowModeFromRoute();
  }

  private prefillAuthenticatedEmailForChangeMode(): void {
    if (!this.isChangePasswordMode) {
      return;
    }

    const authenticatedEmail = this.authService.authenticatedEmail();
    if (authenticatedEmail) {
      this.form.controls.email.setValue(authenticatedEmail);
    }
  }

  private resolveFlowModeFromRoute(): PasswordFlowMode {
    const modeFromUrlSegments = this.resolveFlowModeFromUrlSegments();
    if (modeFromUrlSegments !== null) {
      return modeFromUrlSegments;
    }

    for (const activatedRoute of [...this.route.pathFromRoot].reverse()) {
      const routeMode = activatedRoute.snapshot.data?.['passwordFlowMode'];
      if (routeMode === 'change' || routeMode === 'forgot') {
        return routeMode;
      }
    }

    // Fallback: infer mode from the matched route path when route data is not
    // available on the current activated route chain.
    for (const activatedRoute of [...this.route.pathFromRoot].reverse()) {
      const routePath = activatedRoute.snapshot.routeConfig?.path;
      if (routePath === 'change-password') {
        return 'change';
      }
      if (routePath === 'forgot-password') {
        return 'forgot';
      }
    }

    return 'forgot';
  }

  private resolveFlowModeFromUrlSegments(): PasswordFlowMode | null {
    try {
      const urlTree = this.router.parseUrl(this.router.url);
      const urlSegments = urlTree.root.children[PRIMARY_OUTLET]?.segments?.map((segment) => segment.path) ?? [];
      if (urlSegments.includes('change-password')) {
        return 'change';
      }
      if (urlSegments.includes('forgot-password')) {
        return 'forgot';
      }
      return null;
    } catch {
      return null;
    }
  }
}
