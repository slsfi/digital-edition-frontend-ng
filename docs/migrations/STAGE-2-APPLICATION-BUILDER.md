# Stage 2 plan: Angular application builder migration

Stage 2 migrates the application from Angular's deprecated Webpack-based `browser`/`server` build pipeline to the integrated `application` builder.

Stage 1 established the standalone, zoneless application architecture while deliberately retaining the old builders, `CommonEngine`, the existing output layout, and non-hydrated SSR. Stage 2 changes the build system and server runtime while preserving application behavior as far as practical.

The plan is structured so that preparatory changes can be committed and tested independently. The actual builder cutover is the one intentionally atomic step: `angular.json`, server bootstrapping, server rendering configuration, TypeScript configuration, and npm build scripts must agree at that point.

Review Angular's current migration guidance again immediately before implementation because the migration schematic and builder options can evolve:

- https://angular.dev/tools/cli/build-system-migration
- https://angular.dev/best-practices/performance/ssr
- https://angular.dev/api/ssr/node/AngularNodeAppEngine
- https://angular.dev/guide/i18n/deploy

---

## Stage 2 goals

Primary goal:

- Replace the Webpack-based `browser` and `server` builders with Angular's integrated `application` builder.

Supporting goals:

- Replace `CommonEngine` with `AngularNodeAppEngine`.
- Make the application server fully ESM-compatible.
- Replace the Express middleware workaround for auth-protected CSR routes with Angular server routes using `RenderMode.Client`.
- Use `RenderMode.Server` for routes that continue to use runtime SSR.
- Preserve feature-based route generation and make it the source for generated server-rendering metadata as well.
- Keep the existing Docker/nginx deployment model working.
- Keep Swedish and Finnish localization behavior working.
- Preserve the current public URL structure and SEO behavior.
- Remove build artifacts and scripts that exist only for the old split browser/server build.

---

## Non-goals and invariants

Do not combine unrelated architectural migrations with Stage 2.

Keep all of the following unless a specific Stage 2 step says otherwise:

- Standalone application bootstrap.
- Zoneless change detection.
- Standalone Ionic component imports.
- `importProvidersFrom(IonicServerModule)` as the intentional Ionic server-provider bridge.
- Existing route URLs, route hierarchy, guards, route data, and lazy-loading behavior.
- Existing feature-based route filtering.
- Existing optional authentication model.
- Existing token storage strategy.
- Existing sitemap and static collection-menu generation.
- Existing nginx front-end and Docker deployment model.
- Existing SSR rate limiting and proxy trust configuration.
- Existing static-file cache policy unless the new runtime requires an equivalent implementation change.
- Existing canonical/Open Graph URL semantics.
- Existing source-language and translated-language behavior.
- Karma/Jasmine as the test runner during Stage 2.

Do **not** enable client hydration in Stage 2. Ionic's underlying Stencil components do not currently support Angular SSR hydration, and hydration must remain a separate migration.

Do **not** add Angular prerendering/SSG merely because the `application` builder supports it. Stage 2 should use runtime SSR plus explicit CSR routes. The app's existing static HTML generation remains separate.

Do **not** migrate the Karma test target to application-builder mode as part of Stage 2. If Angular later makes that mode the appropriate stable default, handle it independently.

Do **not** silently change the behavior of unprefixed URLs. Today the Node proxy serves the default language for requests without a locale prefix. If the integrated i18n server would instead redirect based on `Accept-Language`, preserve the existing behavior during Stage 2 unless that behavior change is reviewed explicitly.

---

## Migration-critical current behavior

Stage 2 starts from these Stage 1 assumptions:

- Browser entry: `src/main.ts`.
- Server bootstrap entry: `src/main.server.ts`.
- Custom Express server: `server.ts`.
- Browser build output: `dist/app/browser/{sv,fi}`.
- Server build output: `dist/app/server/{sv,fi}/main.js`.
- Runtime launcher: `dist/app/proxy-server.js`.
- `proxy-server.js` loads one compiled server bundle per locale and mounts:
  - `/sv`,
  - `/fi`,
  - Swedish as the unprefixed default.
- `server.ts` uses `CommonEngine` and passes request-level providers manually.
- Auth-protected routes are detected from generated top-level route metadata and are served as a CSR shell by Express middleware.
- nginx serves static browser files from the `dist/app/browser` volume and proxies dynamic requests to the Node app.
- `build:ssr` currently runs route generation, a browser production build, a separate server production build, and `postbuild-copy-files.js`.
- `serve:ssr` currently starts `dist/app/proxy-server.js`.

Stage 2 must account for all of these contracts rather than treating `angular.json` as the only migration surface.

---

# Test gates

Use these gates consistently so every commit has a clear stopping point.

## Fast gate

Before the builder cutover:

~~~powershell
npm run test:source-encoding
npm run test:routes-parser
npm run test:ci
npm run generate-routes
npx ng build --configuration development,sv
~~~

After the builder cutover, keep the same intent. If the exact development build command must change because of the new target configuration, update this plan and the development documentation at the same time.

## Full SSR gate

~~~powershell
npm run build:ssr
npm run serve:ssr
~~~

Then, from another terminal:

~~~powershell
npm run test:ssr:smoke
~~~

At minimum confirm server-rendered initial HTML for:

- `/sv/`
- `/sv/collection/203/introduction`
- `/sv/index/persons`
- one Finnish route.

Also confirm canonical URL, Open Graph URL, locale-specific HTML, HTTP status, and content type.

## Auth-rendering gate

Run with auth both disabled and enabled.

When auth is disabled:

- normal application routes continue to use SSR,
- auth-only routes remain unavailable according to current route guards/configuration.

When auth is enabled:

- routes currently identified as auth protected are client rendered,
- public routes continue to use SSR,
- protected routes do not leak protected server-rendered content,
- login/register/account behavior remains unchanged.

## Container gate

~~~powershell
docker build -t digital-edition-frontend-ng:stage2-test .
docker run -it -p 4201:4201 --rm digital-edition-frontend-ng:stage2-test
~~~

Then run the SSR smoke test against the container.

Also test the nginx front-end:

~~~powershell
docker compose up -d
~~~

Verify static assets, SSR routes, gzip-static behavior, forwarded protocol/host handling, and both locales.

## Manual browser gate

At relevant milestones test:

- Desktop and mobile navigation.
- Ionic outlet history and cached-page behavior.
- Side menus and loading bar.
- Collection navigation and text views.
- Search, index, media collection, and ebooks.
- Modals, popovers, filters, and image viewers.
- Authentication flows when enabled.
- Swedish and Finnish.
- Direct navigation and browser refresh on lazy routes.
- Unprefixed URLs and locale-prefixed URLs.

## Performance gate

Before Stage 2 starts, retain a benchmark result:

~~~powershell
npm run bench:ssr:build
~~~

Run the same benchmark after the migration. Treat the result as diagnostic rather than a rigid pass/fail threshold, but investigate material regressions before completing Stage 2.

---

# Commit-by-commit migration plan

## 1. Establish the Stage 2 baseline

Do not change runtime behavior yet.

Work:

- Run the fast gate.
- Run the full SSR gate.
- Run the auth-rendering gate.
- Run the container gate.
- Run the SSR benchmark and retain the result.
- Record the current `dist/app` tree.
- Confirm generated route artifacts are cleanly reproducible.
- Confirm `CommonEngine` is still the active runtime.
- Confirm hydration is not configured.
- Confirm the working tree is clean after generation/build commands.

Record specifically:

- filenames under `dist/app/server`,
- locale directory layout,
- browser output layout,
- unprefixed URL behavior,
- `/sv` and `/fi` behavior,
- static-file caching headers,
- CSR-shell response behavior for auth-protected routes.

Commit:

- No commit if no files change.
- If migration-specific baseline tests are added:

~~~text
test(migration): capture application-builder baseline
~~~

---

## 2. Add migration-specific regression coverage

Add coverage before touching the server runtime.

Work:

- Extend SSR smoke coverage so it can distinguish SSR output from the CSR shell.
- Add at least one Finnish route to automated SSR smoke coverage.
- Add regression coverage for:
  - canonical URL under direct requests,
  - canonical URL behind forwarded HTTPS,
  - Open Graph URL,
  - known missing static-file behavior,
  - `/static-html` missing-file behavior,
  - root/default-language behavior.
- Add or extend unit coverage for public-origin resolution.
- Add focused tests for auth-protected path extraction from route generation.
- Cover auth disabled and auth enabled.
- Cover feature-based route filtering together with auth-protected path extraction.
- Add tests that prove parameterized auth paths are preserved in generated metadata.

Where practical, add a small build-output assertion script that verifies only stable output contracts such as:

- `dist/app/browser` exists,
- both configured locale browser directories exist,
- the expected runtime server entry exists.

Do not make the test depend on hashed browser bundle names.

Verify:

- Fast gate.
- Full SSR gate.
- No intentional production behavior change.

Commit:

~~~text
test(migration): lock SSR and build-system contracts
~~~

---

## 3. Decouple runtime tooling from the legacy proxy filename

Prepare tooling so the server entry can change later without requiring every consumer to know its output filename.

Work:

- Change the Docker runtime command to start the app through the npm `serve:ssr` script rather than directly hard-coding `dist/app/proxy-server.js`.
- Update `scripts/benchmark-ssr.js` so its auto-start path uses the canonical SSR start command rather than assuming `dist/app/proxy-server.js`.
- Keep `serve:ssr` itself unchanged in this commit, so behavior remains identical.
- Keep the existing browser volume path and nginx configuration unchanged.

Verify:

- Fast gate.
- Full SSR gate.
- Benchmark still auto-starts the current SSR server.
- Container gate.

Commit:

~~~text
build(ssr): decouple tooling from proxy server filename
~~~

This commit should remain fully compatible with the Stage 1 builders.

---

## 4. Decouple application services from Express request objects

The current `CommonEngine` path injects an Express `Request` using the repository-owned `src/express.tokens.ts`. The integrated Angular SSR runtime exposes a standard Web `Request` through Angular's SSR request context.

Prepare for that API boundary before switching builders.

Work:

- Introduce a small application-level request-context abstraction rather than letting Angular application services depend directly on Express.
- Keep the abstraction limited to values the app actually needs, for example:
  - request URL/path,
  - public origin,
  - user-agent.
- Refactor direct Express request consumers:
  - `PlatformService`,
  - `DocumentHeadService`,
  - `ServerRouterNavigationSourceService`,
  - request-origin helpers as appropriate.
- Keep the current Stage 1 server implementation working by providing the abstraction from the existing Express request token.
- Preserve browser behavior.
- Preserve canonical/Open Graph URL behavior.
- Preserve user-agent-based mobile/desktop detection.
- Do not switch to Angular's built-in SSR `REQUEST` token yet unless the current `CommonEngine` path provides exactly the required semantics and tests prove it.

Tests:

- Server request URL with locale prefix.
- Query-string handling.
- Forwarded host/protocol.
- Configured public origin.
- Localhost fallback.
- User-agent propagation.
- Missing request context.
- Browser fallback behavior.

Verify:

- Fast gate.
- Full SSR gate.
- Canonical/Open Graph assertions.
- Mobile/desktop SSR mode parity.

Commit:

~~~text
refactor(ssr): isolate application request context
~~~

This creates an important seam: the builder-cutover commit should only need to replace the server-side adapter, not rewrite application services.

---

## 5. Generate Angular server-rendering route metadata

Prepare the future `RenderMode` configuration while the existing Express CSR-shell workaround is still active.

Extend route generation so the same canonical route source controls browser routing and server rendering mode.

Preferred design:

- Continue generating `app.routes.generated.ts`.
- During the transition, continue generating `auth-protected-route-paths.generated.ts`.
- Add a generated server-route artifact, for example `src/app/app.routes.server.generated.ts`.
- Add the new generated artifact to `.gitignore`.

The generated server routes should represent:

- auth-disabled mode:
  - wildcard fallback -> `RenderMode.Server`.
- auth-enabled mode:
  - every included top-level auth-protected route -> `RenderMode.Client`,
  - wildcard fallback -> `RenderMode.Server`.

Rules:

- Client-rendered routes must appear before the wildcard server route.
- Feature-based route filtering must be applied before server routes are generated.
- Routes excluded from the production browser route set must not reappear in server rendering metadata.
- Parameterized paths must remain parameterized.
- Do not introduce `RenderMode.Prerender`.
- Keep the existing auth-protected path output until the new runtime is active.

Tests:

- Auth disabled -> no client server-routes.
- Auth enabled -> correct client server-routes.
- Feature filtering + auth enabled.
- Parameterized collection routes.
- `index/:type`.
- Lazy top-level paths.
- Wildcard `RenderMode.Server` is always last.
- A second generation produces no changes.

Verify:

- `npm run test:routes-parser`.
- Fast gate.
- Full SSR gate using the old runtime.

Commit:

~~~text
feat(routes): generate server rendering modes
~~~

The new generated server-route file is intentionally unused by production until the builder cutover.

---

## 6. Rehearse Angular's official migration in a disposable worktree

Do this immediately before the real builder switch because Angular's migration schematic can change between releases.

Use a temporary branch or worktree and run:

~~~powershell
npx ng update @angular/cli --name use-application-builder
~~~

Do **not** merge the schematic output directly.

Use it as a reference to identify the exact changes required by the currently installed Angular version.

Review especially:

- final application-builder package/name,
- `main` -> `browser`,
- integrated `server` option,
- `ssr.entry`,
- `outputMode`,
- `prerender`,
- output-path structure,
- removed legacy builder options,
- removal of separate `server`, `serve-ssr`, and `prerender` targets,
- TypeScript config merge,
- `esModuleInterop`,
- generated server entry style,
- ESM changes,
- server-route configuration.

Compare the schematic output to this plan. Update the plan first if Angular has materially changed the recommended architecture.

Commit:

- No production commit.
- If the plan itself needs correcting:

~~~text
docs(migration): update Stage 2 plan for current Angular CLI
~~~

---

## 7. Prepare TypeScript for the ESM server build

Make ESM-safe TypeScript changes that are harmless under the Stage 1 builders before changing `angular.json`.

Work:

- Enable `esModuleInterop` in shared TypeScript configuration if the current migration schematic requires it.
- Audit application/server imports for CommonJS-call assumptions.
- Prefer ESM-compatible imports for packages used by server code.
- Check Node built-in imports.
- Check code for:
  - `require(...)`,
  - `__filename`,
  - `__dirname`,
  - `__non_webpack_require__`,
  - Webpack-specific globals or comments.
- Do not remove the current `server.ts` main-module logic yet if doing so would break the old server builder.
- Do not set `"type": "module"` in `package.json` merely to force ESM. Let the application builder emit the required server module format.

Useful audit:

~~~powershell
rg "require\(|__filename|__dirname|__non_webpack_require__|webpack" server.ts src
~~~

Verify:

- Fast gate.
- Full SSR gate using the old builder.

Commit:

~~~text
build(ssr): prepare server code for ESM output
~~~

If no safe pre-cutover changes are needed, skip this commit and keep ESM-only edits in the atomic cutover.

---

## 8. Atomic cutover to the application builder

This is the one deliberately larger commit.

Do not split it into intermediate commits that leave `ng build` or SSR structurally broken.

### 8.1 Convert the build target

Change the application build target to the current stable application builder recommended by the installed Angular CLI.

Expected direction:

~~~json
"builder": "@angular/build:application"
~~~

Use the exact builder identifier produced/recommended by the migration rehearsal if it differs.

Translate existing options rather than re-creating configuration from scratch.

Expected changes include:

- rename `main` to `browser`,
- add `server: "src/main.server.ts"`,
- add `ssr.entry` pointing to `server.ts`,
- use `outputMode: "server"`,
- explicitly keep Angular prerendering disabled,
- retain `index`,
- retain assets,
- retain styles,
- retain localization,
- retain file replacements,
- retain translation warning/error behavior,
- retain production budgets,
- retain output hashing,
- retain `inlineCritical: false`,
- remove obsolete options such as `buildOptimizer` and `vendorChunk`.

Prefer preserving the current top-level output directories:

~~~json
"outputPath": {
  "base": "dist/app",
  "browser": "browser",
  "server": "server"
}
~~~

Do not assume server bundle filenames or locale sub-layout will match Stage 1; verify the actual emitted tree.

### 8.2 Remove legacy Architect targets

The application builder integrates server building and SSR.

Remove obsolete dedicated targets after their behavior has been represented in the application build:

- `server`,
- `serve-ssr`,
- `prerender`.

Keep the normal development `serve` target and point its configurations at the application build target.

Verify Swedish and Finnish development configurations independently because the development server supports one locale at a time.

### 8.3 Merge server TypeScript configuration

Follow the current Angular migration output.

Expected direction:

- merge required `tsconfig.server.json` settings into `tsconfig.app.json`,
- ensure browser and server entry files are included correctly,
- retain Node and localization types where required,
- retain extended diagnostics,
- remove `tsconfig.server.json` only after the integrated build succeeds.

Do not weaken strict compiler settings as a migration shortcut.

### 8.4 Wire Angular server routes

Update `app.config.server.ts` to use the integrated SSR provider from `@angular/ssr` with the generated server routes.

Expected shape:

~~~typescript
provideServerRendering(
  withRoutes(serverRoutes)
)
~~~

Retain:

- `IonicServerModule` bridge,
- all server-specific service overrides.

Do not add hydration providers.

### 8.5 Replace CommonEngine with AngularNodeAppEngine

Rewrite the Angular rendering boundary in `server.ts` to use:

- `AngularNodeAppEngine`,
- `createNodeRequestHandler`,
- `writeResponseToNodeResponse`,
- `isMainModule(import.meta.url)` or the current CLI-recommended equivalent.

Requirements:

- no `CommonEngine`,
- no `__non_webpack_require__`,
- no CommonJS main-module assumptions,
- server entry must be valid ESM,
- export the Node request handler expected by Angular CLI tooling,
- start the Express listener only when the emitted server entry is executed directly.

Keep custom Express behavior that is still required:

- trust-proxy configuration,
- SSR rate limiting,
- `/static-html` behavior,
- special static-file handling,
- Chrome DevTools probe bypass,
- cache policy where Node directly serves files,
- `Vary: User-Agent` behavior if still required,
- allowed-host behavior,
- configured public-origin behavior.

Do not duplicate static-file work unnecessarily if `AngularNodeAppEngine` handles a case equivalently; remove old middleware only after tests prove behavior is preserved.

### 8.6 Swap the request-context adapter

Replace the Stage 1 Express-request adapter introduced in step 4 with an adapter backed by Angular's built-in SSR request context.

Use Angular's standard Web `Request` semantics inside Angular application code.

Verify canonical URLs, Open Graph URLs, request path, locale stripping, user-agent, and forwarded host/protocol behavior.

After this works, the repository-owned Express injection token should no longer be needed by application services.

### 8.7 Replace auth CSR middleware with RenderMode.Client

The generated server-route configuration now owns render mode.

Remove the Express middleware branch that manually sends the client index for auth-protected routes.

Verify:

- auth-protected routes use `RenderMode.Client`,
- public routes use `RenderMode.Server`,
- route filtering and auth feature flags remain synchronized,
- no protected SSR HTML leaks.

### 8.8 Update npm scripts

Expected end state:

- `build:ssr`:
  - generate routes,
  - run one integrated production `ng build`,
  - no separate `ng run app:server:production`.
- `serve:ssr`:
  - execute the emitted server entry produced by the application builder.
- `ssr-start`:
  - remains build + serve.
- `bench:ssr:build`:
  - remains build + benchmark.

Remove `postbuild-copy-files.js` from the build flow.

Do not guess the emitted server entry filename. Confirm it from actual build output and use that exact path.

### Cutover verification

Before committing, all of these must pass:

- Fast gate.
- Full SSR gate.
- Auth-rendering gate.
- Swedish route.
- Finnish route.
- Unprefixed/default-language route.
- Canonical/Open Graph assertions.
- Missing-static-file assertions.
- No hydration provider.
- `npm run generate-routes` followed by a second generation produces no diff.

Inspect the emitted output tree and record it for the next step.

Commit:

~~~text
build(ssr): migrate to Angular application builder
~~~

Do not proceed if the local production SSR workflow is not fully usable at this commit.

---

## 9. Remove legacy split-builder artifacts

Once the application-builder commit is stable, delete the old compatibility layer in a separate cleanup commit.

Candidates:

- `proxy-server.js`,
- `postbuild-copy-files.js`,
- `tsconfig.server.json`,
- old `CommonEngine`-specific comments,
- old Webpack-specific main-module comments,
- obsolete `auth-protected-route-paths.generated.ts` if the generated server-route file fully replaces it,
- `src/express.tokens.ts` if nothing still consumes it.

Update:

- `.gitignore` generated artifact list,
- route-generator tests,
- hard-coded output paths in scripts,
- comments referring to separate browser/server builder targets.

Audit:

~~~powershell
rg "CommonEngine|proxy-server|postbuild-copy-files|tsconfig.server|auth-protected-route-paths|__non_webpack_require__|browserTarget|serverTarget|serve-ssr" .
~~~

Review every remaining match; historical migration-plan references do not necessarily need removal.

Verify:

- Fast gate.
- Full SSR gate.

Commit:

~~~text
build(ssr): remove legacy split-builder artifacts
~~~

---

## 10. Stabilize localization and default-language serving

Treat localization as its own checkpoint because the old runtime explicitly started one server bundle per locale, while `AngularNodeAppEngine` manages localized applications differently.

Required behavior:

- `/sv/...` serves Swedish.
- `/fi/...` serves Finnish.
- Locale-specific browser assets resolve correctly.
- Direct navigation works.
- Browser refresh works.
- Canonical/hreflang/Open Graph URLs use the correct locale.
- Existing unprefixed/default-language behavior remains Swedish unless a deliberate breaking change is approved.

Test:

- root page,
- nested lazy route,
- collection route,
- missing route/404,
- static asset,
- `robots.txt`,
- `sitemap.txt`,
- both locale prefixes,
- no prefix.

If Angular's automatic i18n server behavior introduces an `Accept-Language` redirect for unprefixed URLs, do not accept that silently. Add the smallest Express-level compatibility behavior necessary to preserve the existing default-language contract, or document and approve a deliberate change separately.

Verify:

- Full SSR gate.
- Manual browser gate.
- Container gate.

Commit only if code/configuration changes are required:

~~~text
fix(i18n): preserve locale routing with application builder
~~~

If no changes are required, record the verification and continue without a commit.

---

## 11. Validate development-server behavior

The application builder changes the development build system and uses Angular's Vite-based development server integration.

Verify:

~~~powershell
npm start
npm run start:fi
~~~

Test:

- Swedish development server.
- Finnish development server.
- Lazy route loading.
- Global SCSS.
- Component SCSS.
- custom CSS.
- Ionicons SVG assets.
- source maps.
- file replacements where applicable.
- component/template/style HMR behavior.
- route generation expectations during development.

Do not require production `server.ts` middleware behavior from `ng serve`; Angular's development SSR path can differ from executing the built server entry. Production server behavior is validated by the full SSR and container gates.

Keep Karma/Jasmine unchanged unless the build migration exposes a specific incompatibility.

Also run:

~~~powershell
npm run extract-i18n
~~~

Confirm translation extraction behaves as expected and produces no unintended changes.

Commit only if development-server-specific fixes are required:

~~~text
fix(dev): align development server with application builder
~~~

---

## 12. Update Docker, nginx, compression, and CI for the final output contract

Prefer keeping:

~~~text
dist/app/browser
dist/app/server
~~~

as the top-level output directories so nginx's static volume and the compression script require minimal changes.

Do not preserve obsolete inner filenames merely for cosmetic compatibility.

Work:

- Confirm `npm run compress` still targets the correct browser directory.
- Confirm gzip files are produced where nginx expects them.
- Confirm the Docker build copies the complete new output.
- Confirm the final image contains all runtime dependencies required by the emitted server bundle.
- Confirm Docker starts through `npm run serve:ssr`.
- Confirm the nginx volume points to the correct browser output directory.
- Confirm `nginx.conf` can still serve hashed JS/CSS/fonts, locale assets, `static-html`, and root robots/sitemap fallback.
- Confirm GitHub Actions requires no builder-specific changes beyond normal Docker build behavior.
- Confirm production dependency installation with `npm ci --omit=dev` is still sufficient for the emitted server runtime.

If the application builder bundles a dependency that was previously required at runtime, do not remove that dependency from `package.json` unless it is truly unused by source/runtime code.

Verify:

- Container gate.
- Docker Compose + nginx.
- SSR smoke through nginx.
- Forwarded HTTPS headers.
- Rate limiting.
- Static caching.
- gzip-static delivery.

Commit:

~~~text
build(docker): align deployment with application builder
~~~

If the preparatory tooling and preserved output-path configuration mean no deployment files need changing, skip the commit but still run the full container gate.

---

## 13. Re-run the complete route/configuration matrix

Before documentation cleanup, run the complete migration matrix.

### Route generation

Verify:

- `featureBasedRoutes: false`.
- `featureBasedRoutes: true`.
- Generated browser routes.
- Generated server routes.
- Unknown top-level route handling.
- Wildcard route preservation.

### Authentication

Verify:

- auth disabled.
- auth enabled.
- auth-only routes.
- protected collection routes.
- account route.
- search/index/media protected routes.
- auth-protected server routes use CSR.
- public server routes use SSR.

### SSR/runtime

Verify:

- public SSR initial HTML.
- CSR shell for protected routes.
- configured allowed host.
- invalid host behavior.
- proxy trust.
- forwarded HTTPS.
- canonical/Open Graph URLs.
- user-agent mobile/desktop parity.
- rate limiting.
- missing static files.
- `/static-html`.

### Localization

Verify:

- Swedish.
- Finnish.
- default language.
- locale-prefixed direct navigation.
- unprefixed navigation.
- hreflang links.
- localized assets.

### Browser behavior

Run the full manual browser gate.

If fixes are required, commit them by subsystem rather than as one miscellaneous migration commit.

Example commits:

~~~text
fix(ssr): preserve proxy origin handling
fix(auth): align client render modes with generated routes
fix(i18n): preserve default-language routing
~~~

---

## 14. Compare build and runtime performance

Run:

~~~powershell
npm run bench:ssr:build
~~~

Compare with the Stage 2 baseline.

Also record:

- production build duration,
- browser initial bundle size,
- server bundle size,
- cold SSR timings,
- warm SSR timings.

The application builder is expected to improve the build pipeline, but Stage 2 should not claim a performance improvement unless measured in this repository.

Investigate material regressions before finalizing the migration.

Commit:

- No commit unless a justified optimization or benchmark-tool fix is required.

---

## 15. Update documentation and changelog

Only after the new runtime is stable, update the main documentation.

### docs/DEVELOPMENT.md

Update the Application architecture section:

- application builder instead of separate Webpack builders,
- `AngularNodeAppEngine` instead of `CommonEngine`,
- integrated browser/server build,
- server route modes,
- auth-protected `RenderMode.Client`,
- public `RenderMode.Server`,
- final output layout,
- ESM server entry.

Remove the completed application-builder migration TODO.

Keep the separate hydration TODO.

### AGENTS.md

Update architecture guardrails:

- application builder is now the required architecture,
- `AngularNodeAppEngine` is the SSR engine,
- server render modes are generated/config-driven,
- do not reintroduce split legacy builders,
- hydration remains out of scope unless explicitly requested.

### docs/DEPLOYMENT.md

Update:

- build command description,
- server start path/script,
- output layout if changed,
- Docker/runtime behavior if changed.

### README

Update only if developer setup/build commands or output assumptions changed.

### CHANGELOG.md

Document Stage 2 as a breaking build/deployment architecture change.

Commit:

~~~text
docs: document application builder architecture
~~~

---

# Stage 2 completion criteria

Stage 2 is complete only when all of the following are true.

## Build system

- The application build target uses Angular's integrated `application` builder.
- There is no separate legacy `server` build target.
- There is no legacy `serve-ssr` builder target.
- There is no legacy `prerender` builder target.
- `build:ssr` performs a single integrated Angular production build after route generation.
- Obsolete Webpack-only builder options are removed.

## Server runtime

- `CommonEngine` is no longer used.
- `AngularNodeAppEngine` is the rendering engine.
- The server entry is ESM-compatible.
- No `__non_webpack_require__`, `__filename`, `__dirname`, or other CommonJS-only server assumptions remain unless intentionally isolated in non-application tooling.
- The emitted server entry can be started through `npm run serve:ssr`.
- Custom Express middleware still preserves required static, rate-limit, proxy, and cache behavior.

## Rendering modes

- Server routes are generated/configured from the same production route/configuration inputs used by browser routing.
- Auth-disabled mode uses SSR for normal routes.
- Auth-enabled protected routes use `RenderMode.Client`.
- Public routes use `RenderMode.Server`.
- The old Express CSR-shell route matcher is removed.
- No unintended `RenderMode.Prerender` is introduced.

## Request handling

- Application services no longer depend directly on Express `Request`.
- Angular SSR request context supplies request-specific URL/header information.
- Canonical and Open Graph URL behavior is preserved.
- User-agent-based mobile/desktop SSR behavior is preserved.

## Localization

- Swedish and Finnish production output both work.
- `/sv` and `/fi` routing work.
- The approved default-language/unprefixed behavior works.
- Locale assets and SEO metadata are correct.

## Deployment

- Docker builds successfully.
- The production container starts successfully.
- nginx serves the new browser output correctly.
- gzip-static assets still work.
- Docker Compose deployment works.
- GitHub Actions Docker build works.

## Testing

- Unit tests pass.
- Route parser/generator tests pass.
- Source encoding test passes.
- Development builds pass.
- Production application build passes.
- SSR smoke tests pass.
- Auth-enabled and auth-disabled rendering matrix passes.
- Container and nginx gates pass.
- Manual browser gate passes.
- Benchmark comparison has been reviewed.

## Architecture

- Application remains standalone.
- Application remains zoneless.
- Ionic remains standalone except for the intentional server provider bridge.
- Hydration remains disabled.
- Stage 2 documentation is updated.
- The application-builder migration TODO is removed from the active TODO list.
