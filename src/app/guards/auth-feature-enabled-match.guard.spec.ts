import { TestBed } from '@angular/core/testing';

import { config } from '@config';
import { authFeatureEnabledMatchGuard } from './auth-feature-enabled-match.guard';

describe('authFeatureEnabledMatchGuard', () => {
  let previousAuthEnabled: boolean;

  beforeEach(() => {
    config.app.auth = config.app.auth || {};
    previousAuthEnabled = config?.app?.auth?.enabled === true;
  });

  afterEach(() => {
    config.app.auth.enabled = previousAuthEnabled;
  });

  it('returns false when auth feature is disabled', () => {
    config.app.auth.enabled = false;

    const result = TestBed.runInInjectionContext(() =>
      authFeatureEnabledMatchGuard({} as any, [] as any)
    );

    expect(result).toBe(false);
  });

  it('returns true when auth feature is enabled', () => {
    config.app.auth.enabled = true;

    const result = TestBed.runInInjectionContext(() =>
      authFeatureEnabledMatchGuard({} as any, [] as any)
    );

    expect(result).toBe(true);
  });
});
