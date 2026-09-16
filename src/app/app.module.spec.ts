import { ProviderToken, Type } from '@angular/core';

import { config } from '@config';
import { authInterceptor } from '@interceptors/auth.interceptor';
import {
  AuthRedirectStorageService,
  BrowserAuthRedirectStorageService
} from '@services/auth-redirect-storage.service';
import {
  AuthTokenStorageService,
  BrowserAuthTokenStorageService
} from '@services/auth-token-storage.service';
import {
  BrowserCollectionTextViewsQueryParamSyncService,
  CollectionTextViewsQueryParamSyncService
} from '@services/collection-text-views-query-param-sync.service';
import {
  BrowserFacsimileImageService,
  FacsimileImageService
} from '@services/facsimile-image.service';
import {
  BrowserRouteStateSourceService,
  RouteStateSourceService
} from '@services/route-state-source.service';
import {
  BrowserRouterNavigationSourceService,
  RouterNavigationSourceService
} from '@services/router-navigation-source.service';
import {
  BrowserRouterPreloadingStrategyService,
  RouterPreloadingStrategyService
} from '@services/router-preloading-strategy.service';
import { AppComponent } from './app.component';
import { AppModule } from './app.module';

type PlatformProviderExpectation = {
  token: ProviderToken<unknown>;
  browser: Type<unknown>;
};

type ClassProviderRecord = {
  provide: ProviderToken<unknown>;
  useClass: Type<unknown>;
};

type ValueProviderRecord = {
  useValue: unknown;
};

const platformProviderExpectations: PlatformProviderExpectation[] = [
  {
    token: RouteStateSourceService,
    browser: BrowserRouteStateSourceService
  },
  {
    token: CollectionTextViewsQueryParamSyncService,
    browser: BrowserCollectionTextViewsQueryParamSyncService
  },
  {
    token: RouterNavigationSourceService,
    browser: BrowserRouterNavigationSourceService
  },
  {
    token: AuthTokenStorageService,
    browser: BrowserAuthTokenStorageService
  },
  {
    token: AuthRedirectStorageService,
    browser: BrowserAuthRedirectStorageService
  },
  {
    token: RouterPreloadingStrategyService,
    browser: BrowserRouterPreloadingStrategyService
  },
  {
    token: FacsimileImageService,
    browser: BrowserFacsimileImageService
  }
];

describe('AppModule provider configuration', () => {
  // Metadata inspection keeps this baseline test focused on provider wiring
  // without bootstrapping the legacy root module and router.
  const providers = getModuleProviders(AppModule);

  it('selects browser implementations for platform-specific services', () => {
    for (const expectation of platformProviderExpectations) {
      const provider = providers.find((candidate): candidate is ClassProviderRecord =>
        isClassProvider(candidate) && candidate.provide === expectation.token
      );

      expect(provider?.useClass)
        .withContext(expectation.browser.name)
        .toBe(expectation.browser);
    }
  });

  it('registers the auth interceptor only when auth is configured', () => {
    const flattenedProviders = flattenProviders(providers);
    const authInterceptorRegistered = flattenedProviders.some((provider) =>
      isValueProvider(provider) && provider.useValue === authInterceptor
    );

    expect(authInterceptorRegistered).toBe(config.app.auth?.enabled === true);
  });

  it('declares and bootstraps the root component', () => {
    const moduleDefinition = (
      AppModule as typeof AppModule & {
        ɵmod?: { bootstrap?: unknown[]; declarations?: unknown[] };
      }
    ).ɵmod;

    expect(moduleDefinition?.declarations).toContain(AppComponent);
    expect(moduleDefinition?.bootstrap).toContain(AppComponent);
  });
});

function getModuleProviders(moduleType: Type<unknown>): unknown[] {
  const injectorDefinition = (
    moduleType as Type<unknown> & { ɵinj?: { providers?: unknown[] } }
  ).ɵinj;

  if (!injectorDefinition) {
    throw new Error(`No injector definition found for ${moduleType.name}`);
  }
  return injectorDefinition.providers ?? [];
}

function flattenProviders(providers: unknown[]): unknown[] {
  return providers.flatMap((provider) => {
    if (Array.isArray(provider)) {
      return flattenProviders(provider);
    }

    if (provider && typeof provider === 'object' && 'ɵproviders' in provider) {
      const nestedProviders = (provider as { ɵproviders: unknown[] }).ɵproviders;
      return [provider, ...flattenProviders(nestedProviders)];
    }

    return [provider];
  });
}

function isClassProvider(provider: unknown): provider is ClassProviderRecord {
  return !!provider &&
    typeof provider === 'object' &&
    'provide' in provider &&
    'useClass' in provider;
}

function isValueProvider(provider: unknown): provider is ValueProviderRecord {
  return !!provider &&
    typeof provider === 'object' &&
    'useValue' in provider;
}
