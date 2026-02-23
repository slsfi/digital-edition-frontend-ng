import { CanMatchFn } from '@angular/router';

import { config } from '@config';

/**
 * Exposes auth-only routes (for example `/login`) only when auth feature is enabled.
 */
export const authFeatureEnabledMatchGuard: CanMatchFn = () => {
  return config?.app?.auth?.enabled === true;
};
