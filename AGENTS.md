# Repository Guidelines

This repository contains the base frontend for SLS digital editions: an Angular web app with server-side rendering (SSR).  
It is intended to be forked per edition/project, with most behavior controlled through configuration (primarily [`src/project/config.ts`](src/project/config.ts)).
When contributing, changes must be reusable and config-driven; project-specific hardcoding is not allowed in this base repository.

## Project Structure & Module Organization
- Browser and server entry points are `src/main.ts` and `src/main.server.ts`.
- The custom Express SSR entry is `src/server.ts`.
- Shared application providers live in `src/app/app.config.ts`; server-specific providers and overrides live in `src/app/app.config.server.ts`.
- `src/app/` contains application code:
  - `components/` reusable UI components.
  - `pages/` route entry pages and lazy standalone `Routes` arrays (`*.routes.ts`) where needed.
  - `services/`, `guards/`, `interceptors/`, `tokens/`, `models/`.
- `src/project/config.ts` is the main feature/config switchboard (auth, SSR, prebuild flags, menus, etc.); `src/project/global-overrides.scss` contains fork-specific styles. `src/styles.scss` selects shared global style/font bundles.
- `public/` contains copied static assets, root crawler documents, and generated static HTML. Keep public URLs independent of source file paths; generators write sitemap/menu outputs here before building.
- Route artifacts are generated at build time:
  - canonical developer-edited routes: `src/app/app.routes.ts`
  - generated production routes: `src/app/app.routes.generated.ts`
  - generated Angular server-rendering modes: `src/app/app.routes.server.generated.ts` (consumed by the server providers)
- Build/helper scripts live in repo root (`prebuild-*.js`).
- Documentation lives in `docs/`: `PROJECT-CUSTOMIZATION.md` guides edition forks, `THEMING.md` covers styling, `DEPLOYMENT.md` covers operations, and `DEVELOPMENT.md` covers base-app architecture and development. Keep fork configuration instructions out of the development notes.

## Architecture Guardrails
- Keep the application standalone. Do not introduce application, server, page, or routing NgModules.
- Import Ionic components as standalone components rather than through `IonicModule`. `importProvidersFrom(IonicServerModule)` in the server configuration is the intentional application-level NgModule bridge.
- Keep the application zoneless. Do not add Zone.js, `provideZoneChangeDetection()`, or another compatibility provider as a workaround; expose asynchronous template state through signals, inputs, the `async` pipe, or another Angular notification mechanism.
- Keep builds on `@angular/build:application` with `AngularNodeAppEngine` and the `dist/app` output contract. Do not reintroduce split browser/server builders, legacy SSR targets, or `@angular-devkit/build-angular`. Keep the Express static/probe short-circuits before the SSR limiter and dynamic handler; use the fork's configured locale paths and default language.
- Generate server render modes from the canonical routes and feature/auth configuration: protected routes use `RenderMode.Client` when auth is enabled, and public routes use `RenderMode.Server`. Keep Angular prerendering out of unrelated changes and production critical CSS inlining disabled (`inlineCritical: false`).
- Application services consume `APPLICATION_REQUEST_CONTEXT` for app-relative request URL, public origin, and user agent. Keep Angular Web `REQUEST` adapters under `src/ssr/` rather than injecting Express requests into application services. HTTP status changes use Angular's nullable `RESPONSE_INIT`.
- Do not enable client hydration as part of unrelated work. Keep unit tests on Angular's `@angular/build:unit-test` builder with Vitest and jsdom; do not add Jasmine/Karma dependencies or a manual TestBed bootstrap.
- Register application-owned Ionicons centrally in `src/ionicons-polyfill.ts`; do not add component-local `addIcons()` registrations.
- See `docs/DEVELOPMENT.md` for the detailed architecture rationale and migration notes.

## Build, Test, and Development Commands
- `npm ci` - clean dependency install from `package-lock.json`; supported Node/npm versions are declared in `package.json`.
- `npm start` - generate route metadata and run the Swedish Angular development server with SSR; `npm run start:fi` serves Finnish.
- `npm test` - run Angular/Vitest unit tests in watch mode in an interactive terminal.
- `npm run test:ci` - run the Angular/Vitest unit test suite once with jsdom.
- `npm run test:source-encoding` - validate source-file encoding and BOM usage.
- `npm run test:routes-parser` - smoke tests for route parser/generator logic.
- `npm run test:static-collection-menus` - verify static collection-menu generation and shared prebuild fetch retry behavior.
- `npm run build:ssr` - generate routes + integrated browser/server production build.
- `npm run serve:ssr` - run the built ESM SSR entry `dist/app/server/server.mjs`.
- `npm run test:ssr:smoke` - verify key SSR responses against a running SSR app.
- `npm run test:ssr:checks` - verify SSR smoke-runner rendering and HTTP checks without a running app.
- `npm run test:ssr:server` - build SSR, then verify Express middleware from the emitted server entry with a render spy, covering short-circuits, caching, limiting, locale paths, and proxy trust.
- `npm run test:ssr:benchmark` - verify benchmark auto-start, alternate runtime entries, and process cleanup.
- `npm run test:build-output` - verify configured locale browser directories and the runtime entry after building.
- `npm run ssr-start` - build SSR and serve in one command.
- `npm run generate-routes` - regenerate route artifacts from config.
- `npm run bench:ssr:build` - build and benchmark SSR performance.

## Coding Style & Naming Conventions
- Use TypeScript + Angular templates/SCSS; follow existing style (2-space indentation, concise comments).
- Use braces for `if` blocks. A one-line `if` is allowed only when its body is a `return` statement.
- Keep files and selectors in kebab-case; classes/interfaces in PascalCase.
- Use established suffixes (`*.service.ts`, `*.guard.ts`, `*.interceptor.ts`).
- Prefer existing path aliases (for example `@services`, `@components`, `@config`).
- Keep behavior config-driven; hardcoding fork-specific values is not allowed.

## Testing Guidelines
- Angular unit tests use Vitest + jsdom through Angular CLI and live in `src/**/*.spec.ts`. Add or update specs for changed components, pages, services, guards, interceptors, configuration, and routes as appropriate. The builder initializes TestBed and inherits application polyfills; `src/test-setup.ts` restores spies and real timers after each test. Preserve typed service fakes and real signal properties.
- Use `npm test` while developing and `npm run test:ci` for a single-run verification before PRs.
- Script-based checks complement the unit suite: use `test:source-encoding` for source encoding, `test:routes-parser` for route-generation/parser changes, and `test:ssr:smoke` for SSR behavior.
- Run `test:static-collection-menus` after changing `prebuild-generate-static-collection-menus.js` or shared fetch retry behavior in `prebuild-common-fns.js`.
- When changing `app.routes.ts` or lazy `*.routes.ts` files, update/run the Angular route-recognition specs; also run `test:routes-parser` when generator-facing route syntax changes.
- For SSR changes, run `build:ssr`, start the built app with `serve:ssr`, then run `test:ssr:smoke` (or point the smoke test at another running environment with `--base-url`).

## Commit & Pull Request Guidelines
- Follow conventional commits seen in history (for example `feat(ssr): ...`, `fix(auth): ...`, `docs: ...`).
- Keep commits focused to one logical change.
- PRs should include:
  - summary of behavior change and rationale,
  - config/deployment impact (especially `src/project/config.ts` and SSR/auth flags),
  - verification steps and commands run,
  - screenshots for UI changes when relevant.
- Update `CHANGELOG.md` and docs for user-visible or operational changes.

## Security & Configuration Tips
- Do not commit secrets in config or environment files.
- Auth is optional and disabled by default; forks enabling auth must validate SSR/auth behavior explicitly.
- Edit `src/app/app.routes.ts` as the canonical route source. Do not manually edit `src/app/app.routes.generated.ts` or `src/app/app.routes.server.generated.ts`; regenerate them with the repository scripts.
