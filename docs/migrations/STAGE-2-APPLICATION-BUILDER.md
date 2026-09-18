# Stage 2 plan: Angular application builder migration

Stage 2 migrates the application from Angular's deprecated Webpack-based <code>browser</code>/<code>server</code> build pipeline to the integrated <code>application</code> builder.

Stage 1 established the standalone, zoneless application architecture while deliberately retaining the old builders, <code>CommonEngine</code>, the existing output layout, and non-hydrated SSR. Stage 2 changes the build system and server runtime while preserving application behavior as far as practical.

The plan is structured so that preparatory changes can be committed and tested independently. The actual builder cutover is the one intentionally atomic step: <code>angular.json</code>, server bootstrapping, server rendering configuration, TypeScript configuration, and npm build scripts must agree at that point.

Review Angular's current migration guidance again immediately before implementation because the migration schematic and builder options can evolve:

- https://angular.dev/tools/cli/build-system-migration
- https://angular.dev/best-practices/performance/ssr
- https://angular.dev/api/ssr/node/AngularNodeAppEngine
- https://angular.dev/guide/i18n/deploy

---

## Stage 2 goals

Primary goal:

- Replace the Webpack-based <code>browser</code> and <code>server</code> builders with Angular's integrated <code>application</code> builder.

Supporting goals:

- Replace <code>CommonEngine</code> with <code>AngularNodeAppEngine</code>.
- Make the application server fully ESM-compatible.
- Replace the Express middleware workaround for auth-protected CSR routes with Angular server routes using <code>RenderMode.Client</code>.
- Use <code>RenderMode.Server</code> for routes that continue to use runtime SSR.
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
- <code>importProvidersFrom(IonicServerModule)</code> as the intentional Ionic server-provider bridge.
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

Do **not** add Angular prerendering/SSG merely because the <code>application</code> builder supports it. Stage 2 should use runtime SSR plus explicit CSR routes. The app's existing static HTML generation remains separate.

Do **not** migrate the Karma test target to application-builder mode as part of Stage 2. If Angular later makes that mode the appropriate stable default, handle it independently.

Do **not** silently change the behavior of unprefixed URLs. Today the Node proxy serves the default language for requests without a locale prefix. If the integrated i18n server would instead redirect based on <code>Accept-Language</code>, preserve the existing behavior during Stage 2 unless that behavior change is reviewed explicitly.

---

## Migration-critical current behavior

Stage 2 starts from these Stage 1 assumptions:

- Browser entry: <code>src/main.ts</code>.
- Server bootstrap entry: <code>src/main.server.ts</code>.
- Custom Express server: <code>server.ts</code>.
- Browser build output: <code>dist/app/browser/{sv,fi}</code>.
- Server build output: <code>dist/app/server/{sv,fi}/main.js</code>.
- Runtime launcher: <code>dist/app/proxy-server.js</code>.
- <code>proxy-server.js</code> loads one compiled server bundle per locale and mounts:
  - <code>/sv</code>,
  - <code>/fi</code>,
  - Swedish as the unprefixed default.
- <code>server.ts</code> uses <code>CommonEngine</code> and passes request-level providers manually.
- Auth-protected routes are detected from generated top-level route metadata and are served as a CSR shell by Express middleware.
- nginx serves static browser files from the <code>dist/app/browser</code> volume and proxies dynamic requests to the Node app.
- <code>build:ssr</code> currently runs route generation, a browser production build, a separate server production build, and <code>postbuild-copy-files.js</code>.
- <code>serve:ssr</code> currently starts <code>dist/app/proxy-server.js</code>.

Stage 2 must account for all of these contracts rather than treating <code>angular.json</code> as the only migration surface.

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

- <code>/sv/</code>
- <code>/sv/collection/203/introduction</code>
- <code>/sv/index/persons</code>
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
- Record the current <code>dist/app</code> tree.
- Confirm generated route artifacts are cleanly reproducible.
- Confirm <code>CommonEngine</code> is still the active runtime.
- Confirm hydration is not configured.
- Confirm the working tree is clean after generation/build commands.

Record specifically:

- filenames under <code>dist/app/server</code>,
- locale directory layout,
- browser output layout,
- unprefixed URL behavior,
- <code>/sv</code> and <code>/fi</code> behavior,
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
  - <code>/static-html</code> missing-file behavior,
  - root/default-language behavior.
- Add or extend unit coverage for public-origin resolution.
- Add focused tests for auth-protected path extraction from route generation.
- Cover auth disabled and auth enabled.
- Cover feature-based route filtering together with auth-protected path extraction.
- Add tests that prove parameterized auth paths are preserved in generated metadata.

Where practical, add a small build-output assertion script that verifies only stable output contracts such as:

- <code>dist/app/browser</code> exists,
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

- Change the Docker runtime command to start the app through the npm <code>serve:ssr</code> script rather than directly hard-coding <code>dist/app/proxy-server.js</code>.
- Update <code>scripts/benchmark-ssr.js</code> so its auto-start path uses the canonical SSR start command rather than assuming <code>dist/app/proxy-server.js</code>.
- Keep <code>serve:ssr</code> itself unchanged in this commit, so behavior remains identical.
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

The current <code>CommonEngine</code> path injects an Express <code>Request</code> using the repository-owned <code>src/express.tokens.ts</code>. The integrated Angular SSR runtime exposes a standard Web <code>Request</code> through Angular's SSR request context.

Prepare for that API boundary before switching builders.

Work:

- Introduce a small application-level request-context abstraction rather than letting Angular application services depend directly on Express.
- Keep the abstraction limited to values the app actually needs, for example:
  - request URL/path,
  - public origin,
  - user-agent.
- Refactor direct Express request consumers:
  - <code>PlatformService</code>,
  - <code>DocumentHeadService</code>,
  - <code>ServerRouterNavigationSourceService</code>,
  - request-origin helpers as appropriate.
- Keep the current Stage 1 server implementation working by providing the abstraction from the existing Express request token.
- Preserve browser behavior.
- Preserve canonical/Open Graph URL behavior.
- Preserve user-agent-based mobile/desktop detection.
- Do not switch to Angular's built-in SSR <code>REQUEST</code> token yet unless the current <code>CommonEngine</code> path provides exactly the required semantics and tests prove it.

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

Prepare the future <code>RenderMode</code> configuration while the existing Express CSR-shell workaround is still active.

Extend route generation so the same canonical route source controls browser routing and server rendering mode.

Preferred design:

- Continue generating <code>app.routes.generated.ts</code>.
- During the transition, continue generating <code>auth-protected-route-paths.generated.ts</code>.
- Add a generated server-route artifact, for example <code>src/app/app.routes.server.generated.ts</code>.
- Add the new generated artifact to <code>.gitignore</code>.

The generated server routes should represent:

- auth-disabled mode:
  - wildcard fallback -> <code>RenderMode.Server</code>.
- auth-enabled mode:
  - every included top-level auth-protected route -> <code>RenderMode.Client</code>,
  - wildcard fallback -> <code>RenderMode.Server</code>.

Rules:

- Client-rendered routes must appear before the wildcard server route.
- Feature-based route filtering must be applied before server routes are generated.
- Routes excluded from the production browser route set must not reappear in server rendering metadata.
- Parameterized paths must remain parameterized.
- Do not introduce <code>RenderMode.Prerender</code>.
- Keep the existing auth-protected path output until the new runtime is active.

Tests:

- Auth disabled -> no client server-routes.
- Auth enabled -> correct client server-routes.
- Feature filtering + auth enabled.
- Parameterized collection routes.
- <code>index/:type</code>.
- Lazy top-level paths.
- Wildcard <code>RenderMode.Server</code> is always last.
- A second generation produces no changes.

Verify:

- <code>npm run test:routes-parser</code>.
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
- <code>main</code> -> <code>browser</code>,
- integrated <code>server</code> option,
- <code>ssr.entry</code>,
- <code>outputMode</code>,
- <code>prerender</code>,
- output-path structure,
- removed legacy builder options,
- removal of separate <code>server</code>, <code>serve-ssr</code>, and <code>prerender</code> targets,
- TypeScript config merge,
- <code>esModuleInterop</code>,
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

Make ESM-safe TypeScript changes that are harmless under the Stage 1 builders before changing <code>angular.json</code>.

Work:

- Enable <code>esModuleInterop</code> in shared TypeScript configuration if the current migration schematic requires it.
- Audit application/server imports for CommonJS-call assumptions.
- Prefer ESM-compatible imports for packages used by server code.
- Check Node built-in imports.
- Check code for:
  - <code>require(...)</code>,
  - <code>__filename</code>,
  - <code>__dirname</code>,
  - <code>__non_webpack_require__</code>,
  - Webpack-specific globals or comments.
- Do not remove the current <code>server.ts</code> main-module logic yet if doing so would break the old server builder.
- Do not set <code>"type": "module"</code> in <code>package.json</code> merely to force ESM. Let the application builder emit the required server module format.

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

Do not split it into intermediate commits that leave <code>ng build</code> or SSR structurally broken.

### 8.1 Convert the build target

Change the application build target to the current stable application builder recommended by the installed Angular CLI.

Expected direction:

~~~json
"builder": "@angular/build:application"
~~~

Use the exact builder identifier produced/recommended by the migration rehearsal if it differs.

Translate existing options rather than re-creating configuration from scratch.

Expected changes include:

- rename <code>main</code> to <code>browser</code>,
- add <code>server: "src/main.server.ts"</code>,
- add <code>ssr.entry</code> pointing to <code>server.ts</code>,
- use <code>outputMode: "server"</code>,
- explicitly keep Angular prerendering disabled,
- retain <code>index</code>,
- retain assets,
- retain styles,
- retain localization,
- retain file replacements,
- retain translation warning/error behavior,
- retain production budgets,
- retain output hashing,
- retain <code>inlineCritical: false</code>,
- remove obsolete options such as <code>buildOptimizer</code> and <code>vendorChunk</code>.

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

- <code>server</code>,
- <code>serve-ssr</code>,
- <code>prerender</code>.

Keep the normal development <code>serve</code> target and point its configurations at the application build target.

Verify Swedish and Finnish development configurations independently because the development server supports one locale at a time.

### 8.3 Merge server TypeScript configuration

Follow the current Angular migration output.

Expected direction:

- merge required <code>tsconfig.server.json</code> settings into <code>tsconfig.app.json</code>,
- ensure browser and server entry files are included correctly,
- retain Node and localization types where required,
- retain extended diagnostics,
- remove <code>tsconfig.server.json</code> only after the integrated build succeeds.

Do not weaken strict compiler settings as a migration shortcut.

### 8.4 Wire Angular server routes

Update <code>app.config.server.ts</code> to use the integrated SSR provider from <code>@angular/ssr</code> with the generated server routes.

Expected shape:

~~~typescript
provideServerRendering(
  withRoutes(serverRoutes)
)
~~~

Retain:

- <code>IonicServerModule</code> bridge,
- all server-specific service overrides.

Do not add hydration providers.

### 8.5 Replace CommonEngine with AngularNodeAppEngine

Rewrite the Angular rendering boundary in <code>server.ts</code> to use:

- <code>AngularNodeAppEngine</code>,
- <code>createNodeRequestHandler</code>,
- <code>writeResponseToNodeResponse</code>,
- <code>isMainModule(import.meta.url)</code> or the current CLI-recommended equivalent.

Requirements:

- no <code>CommonEngine</code>,
- no <code>__non_webpack_require__</code>,
- no CommonJS main-module assumptions,
- server entry must be valid ESM,
- export the Node request handler expected by Angular CLI tooling,
- start the Express listener only when the emitted server entry is executed directly.

Keep custom Express behavior that is still required:

- trust-proxy configuration,
- SSR rate limiting,
- <code>/static-html</code> behavior,
- special static-file handling,
- Chrome DevTools probe bypass,
- cache policy where Node directly serves files,
- <code>Vary: User-Agent</code> behavior if still required,
- allowed-host behavior,
- configured public-origin behavior.

Do not duplicate static-file work unnecessarily if <code>AngularNodeAppEngine</code> handles a case equivalently; remove old middleware only after tests prove behavior is preserved.

### 8.6 Swap the request-context adapter

Replace the Stage 1 Express-request adapter introduced in step 4 with an adapter backed by Angular's built-in SSR request context.

Use Angular's standard Web <code>Request</code> semantics inside Angular application code.

Verify canonical URLs, Open Graph URLs, request path, locale stripping, user-agent, and forwarded host/protocol behavior.

After this works, the repository-owned Express injection token should no longer be needed by application services.

### 8.7 Replace auth CSR middleware with RenderMode.Client

The generated server-route configuration now owns render mode.

Remove the Express middleware branch that manually sends the client index for auth-protected routes.

Verify:

- auth-protected routes use <code>RenderMode.Client</code>,
- public routes use <code>RenderMode.Server</code>,
- route filtering and auth feature flags remain synchronized,
- no protected SSR HTML leaks.

### 8.8 Update npm scripts

Expected end state:

- <code>build:ssr</code>:
  - generate routes,
  - run one integrated production <code>ng build</code>,
  - no separate <code>ng run app:server:production</code>.
- <code>serve:ssr</code>:
  - execute the emitted server entry produced by the application builder.
- <code>ssr-start</code>:
  - remains build + serve.
- <code>bench:ssr:build</code>:
  - remains build + benchmark.

Remove <code>postbuild-copy-files.js</code> from the build flow.

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
- <code>npm run generate-routes</code> followed by a second generation produces no diff.

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

- <code>proxy-server.js</code>,
- <code>postbuild-copy-files.js</code>,
- <code>tsconfig.server.json</code>,
- old <code>CommonEngine</code>-specific comments,
- old Webpack-specific main-module comments,
- obsolete <code>auth-protected-route-paths.generated.ts</code> if the generated server-route file fully replaces it,
- <code>src/express.tokens.ts</code> if nothing still consumes it.

Update:

- <code>.gitignore</code> generated artifact list,
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

Treat localization as its own checkpoint because the old runtime explicitly started one server bundle per locale, while <code>AngularNodeAppEngine</code> manages localized applications differently.

Required behavior:

- <code>/sv/...</code> serves Swedish.
- <code>/fi/...</code> serves Finnish.
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
- <code>robots.txt</code>,
- <code>sitemap.txt</code>,
- both locale prefixes,
- no prefix.

If Angular's automatic i18n server behavior introduces an <code>Accept-Language</code> redirect for unprefixed URLs, do not accept that silently. Add the smallest Express-level compatibility behavior necessary to preserve the existing default-language contract, or document and approve a deliberate change separately.

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

Do not require production <code>server.ts</code> middleware behavior from <code>ng serve</code>; Angular's development SSR path can differ from executing the built server entry. Production server behavior is validated by the full SSR and container gates.

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

- Confirm <code>npm run compress</code> still targets the correct browser directory.
- Confirm gzip files are produced where nginx expects them.
- Confirm the Docker build copies the complete new output.
- Confirm the final image contains all runtime dependencies required by the emitted server bundle.
- Confirm Docker starts through <code>npm run serve:ssr</code>.
- Confirm the nginx volume points to the correct browser output directory.
- Confirm <code>nginx.conf</code> can still serve hashed JS/CSS/fonts, locale assets, <code>static-html</code>, and root robots/sitemap fallback.
- Confirm GitHub Actions requires no builder-specific changes beyond normal Docker build behavior.
- Confirm production dependency installation with <code>npm ci --omit=dev</code> is still sufficient for the emitted server runtime.

If the application builder bundles a dependency that was previously required at runtime, do not remove that dependency from <code>package.json</code> unless it is truly unused by source/runtime code.

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

- <code>featureBasedRoutes: false</code>.
- <code>featureBasedRoutes: true</code>.
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
- <code>/static-html</code>.

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
- <code>AngularNodeAppEngine</code> instead of <code>CommonEngine</code>,
- integrated browser/server build,
- server route modes,
- auth-protected <code>RenderMode.Client</code>,
- public <code>RenderMode.Server</code>,
- final output layout,
- ESM server entry.

Remove the completed application-builder migration TODO.

Keep the separate hydration TODO.

### AGENTS.md

Update architecture guardrails:

- application builder is now the required architecture,
- <code>AngularNodeAppEngine</code> is the SSR engine,
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

- The application build target uses Angular's integrated <code>application</code> builder.
- There is no separate legacy <code>server</code> build target.
- There is no legacy <code>serve-ssr</code> builder target.
- There is no legacy <code>prerender</code> builder target.
- <code>build:ssr</code> performs a single integrated Angular production build after route generation.
- Obsolete Webpack-only builder options are removed.

## Server runtime

- <code>CommonEngine</code> is no longer used.
- <code>AngularNodeAppEngine</code> is the rendering engine.
- The server entry is ESM-compatible.
- No <code>__non_webpack_require__</code>, <code>__filename</code>, <code>__dirname</code>, or other CommonJS-only server assumptions remain unless intentionally isolated in non-application tooling.
- The emitted server entry can be started through <code>npm run serve:ssr</code>.
- Custom Express middleware still preserves required static, rate-limit, proxy, and cache behavior.

## Rendering modes

- Server routes are generated/configured from the same production route/configuration inputs used by browser routing.
- Auth-disabled mode uses SSR for normal routes.
- Auth-enabled protected routes use <code>RenderMode.Client</code>.
- Public routes use <code>RenderMode.Server</code>.
- The old Express CSR-shell route matcher is removed.
- No unintended <code>RenderMode.Prerender</code> is introduced.

## Request handling

- Application services no longer depend directly on Express <code>Request</code>.
- Angular SSR request context supplies request-specific URL/header information.
- Canonical and Open Graph URL behavior is preserved.
- User-agent-based mobile/desktop SSR behavior is preserved.

## Localization

- Swedish and Finnish production output both work.
- <code>/sv</code> and <code>/fi</code> routing work.
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
