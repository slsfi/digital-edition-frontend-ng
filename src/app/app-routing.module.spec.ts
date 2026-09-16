import {
  ExtraOptions,
  PreloadingStrategy,
  ROUTER_CONFIGURATION,
  ROUTES,
  RouterModule
} from '@angular/router';

import { RouterPreloadingStrategyService } from '@services/router-preloading-strategy.service';
import { AppRoutingModule } from './app-routing.module';
import { routes } from './app.routes';

type ProviderRecord = {
  provide?: unknown;
  useExisting?: unknown;
  useValue?: unknown;
};

type ModuleWithProvidersRecord = {
  ngModule: unknown;
  providers?: unknown[];
};

describe('AppRoutingModule configuration', () => {
  const routerProviders = getRouterProviders();

  it('preserves blocking navigation, empty-only parameter inheritance, and canonical routes', () => {
    const options = findProvider(ROUTER_CONFIGURATION).useValue as ExtraOptions;
    const configuredRoutes = findProvider(ROUTES).useValue;

    expect(options.initialNavigation).toBe('enabledBlocking');
    expect(options.paramsInheritanceStrategy).toBe('emptyOnly');
    expect(configuredRoutes).toBe(routes);
  });

  it('uses the application preloading strategy', () => {
    const provider = findProvider(PreloadingStrategy);

    expect(provider.useExisting).toBe(RouterPreloadingStrategyService);
  });

  function findProvider(token: unknown): ProviderRecord {
    const provider = routerProviders.find((candidate): candidate is ProviderRecord =>
      isProviderRecord(candidate) && candidate.provide === token
    );
    expect(provider).withContext(String(token)).toBeDefined();
    return provider as ProviderRecord;
  }
});

function getRouterProviders(): unknown[] {
  // Read the forRoot provider metadata without starting blocking initial
  // navigation in TestBed, which would outlive the test injector teardown.
  const injectorDefinition = (
    AppRoutingModule as typeof AppRoutingModule & {
      ɵinj?: { imports?: unknown[] };
    }
  ).ɵinj;

  if (!injectorDefinition) {
    throw new Error('No injector definition found for AppRoutingModule');
  }

  const imports = flattenValues(injectorDefinition.imports ?? []);
  const routerModuleWithProviders = imports.find((value): value is ModuleWithProvidersRecord =>
    isModuleWithProviders(value) && value.ngModule === RouterModule
  );
  if (!routerModuleWithProviders) {
    throw new Error('RouterModule.forRoot metadata not found');
  }

  return flattenValues(routerModuleWithProviders.providers ?? []);
}

function flattenValues(values: unknown[]): unknown[] {
  return values.flatMap((value) =>
    Array.isArray(value) ? flattenValues(value) : [value]
  );
}

function isModuleWithProviders(value: unknown): value is ModuleWithProvidersRecord {
  return !!value && typeof value === 'object' && 'ngModule' in value;
}

function isProviderRecord(value: unknown): value is ProviderRecord {
  return !!value && typeof value === 'object' && 'provide' in value;
}
