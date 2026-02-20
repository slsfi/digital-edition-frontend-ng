# Development

This document contains notes and tips on the development of the app.


## Run locally on Windows

### Remote Docker image of app

To locally run a prebuilt Docker image, which has been pushed to an image repository like GitHub Packages or DockerHub:

1. Start [Docker Desktop][docker_desktop] and log in with your credentials.
2. In PowerShell, `cd` into the app repository folder.
3. Run

```bash
docker run -it -p 4201:4201 --rm ghcr.io/slsfi/digital-edition-frontend-ng:main
```

where you should replace `ghcr.io/slsfi/digital-edition-frontend-ng:main` with the URL to the remote image you want to run.

4. Open your browser on <http://localhost:4201/>.

### Local Docker image of app

To first build and then run a Docker image of a local copy of the repository on your own machine:

1. Start [Docker Desktop][docker_desktop] and log in with your credentials.
2. In PowerShell, `cd` into the app repository folder.
3. Run

```bash
docker build -t digital-edition-frontend-ng:test .
```

(notice the dot at the end) to build the image from the current directory, where `digital-edition-frontend-ng:test` is the name and tag of the image. You can choose a different name and tag if you wish. Add `--no-cache` only when troubleshooting or when you want to force a fully fresh build.

4. Run

```bash
docker run -it -p 4201:4201 --rm digital-edition-frontend-ng:test
```

to run the image. If you built the image with a different name and tag in step 3, replace `digital-edition-frontend-ng:test` with your chosen `name:tag`.

5. Open your browser on <http://localhost:4201/>.

### nginx in front of app image

In production, nginx is run in a Docker container in front of the app container so nginx, which is more performant than Node.js, can server static files. To run the app in this setup locally:

1. Start [Docker Desktop][docker_desktop] and log in with your credentials.
2. In PowerShell, `cd` into the app repository folder.
3. Run

```bash
docker build -t digital-edition-frontend-ng:test .
```

(notice the dot at the end) to build the image from the current directory, where `digital-edition-frontend-ng:test` is the name and tag of the image. You can choose a different name and tag if you wish. Add `--no-cache` only when troubleshooting or when you want to force a fully fresh build.

4. Replace the URL of `image` in the `web` service in [`compose.yml`][docker_compose_file] with `digital-edition-frontend-ng:test` (or the `name:tag` you built the image with in step 3). **Do not commit this change!**
5. Run

```bash
docker compose up -d
```

6. Open your browser on <http://localhost:2089/> (the port of the nginx service defined in [`compose.yml`][docker_compose_file]).
7. Undo the changes in [`compose.yml`][docker_compose_file].
8. When you are done testing, stop the Docker containers in Docker Desktop and delete all containers and volumes that were created. Alternatively you can do this in the terminal by running

```bash
docker compose down --volumes
```



## Node.js version and building using GitHub Actions

The Node.js Docker-image tag can be passed as a build argument to `Dockerfile` using the argument `NODE_IMAGE_TAG`. `Dockerfile` sets a default value for the argument if it is not passed.

By default the app is built using GitHub Actions according to the workflow defined in `.github/workflows/docker-build-and-push.yml`, but you can also define your own build workflow. The workflow sets up a Docker Buildx builder using `docker/setup-buildx-action` and then runs the build with `docker/build-push-action` (BuildKit), passing `NODE_IMAGE_TAG` to `Dockerfile` and using `pull: true` so base image layers are refreshed by the builder.

The workflow also runs `docker pull node:${NODE_IMAGE_TAG}` before the build. This is intentional for explicitness and log visibility.

When updating which Node.js image is used for the build, remember to update both `docker-build-and-push.yml` and `Dockerfile`.



## Router preloading strategy

The app uses a platform-specific router preloading strategy:

- **Browser**: lazy routes are preloaded by default on good networks (when idle), unless route data overrides this behavior.
- **Server (SSR)**: no route preloading (`NoPreloading`).

Implementation files:

- [`src/app/services/router-preloading-strategy.service.ts`](../src/app/services/router-preloading-strategy.service.ts)
- [`src/app/app-routing.module.ts`](../src/app/app-routing.module.ts)
- [`src/app/app.routes.ts`](../src/app/app.routes.ts)
- [`src/app/app.routes.generated.ts`](../src/app/app.routes.generated.ts)
- [`src/app/app.module.ts`](../src/app/app.module.ts)
- [`src/app/app.server.module.ts`](../src/app/app.server.module.ts)

Route-level preload behavior is set with route `data.preload` in `app.routes.ts`:

- `'eager'`: preload as soon as router preloading runs.
- `'idle'`: preload when browser is idle.
- `'idle-if-fast'`: preload when browser is idle and network is considered good.
- missing: defaults to `'idle-if-fast'`.
- `'off'`: no preloading.

`'idle-if-fast'` currently means:

- do **not** preload if `navigator.connection.saveData === true`
- do **not** preload if `navigator.connection.effectiveType` is `slow-2g`, `2g`, or `3g`
- if `navigator.connection` is unavailable, preload is allowed

Current route policy:

- default for lazy routes: `idle-if-fast`
- optional per-route overrides: `eager`, `idle`, or `off`



## Feature-based route generation

The app can generate routes at build time based on values in [`src/assets/config/config.ts`](../src/assets/config/config.ts).

- Canonical routes source (edited by developers): [`src/app/app.routes.ts`](../src/app/app.routes.ts)
- Generated file: [`src/app/app.routes.generated.ts`](../src/app/app.routes.generated.ts)
- Generator script: [`prebuild-generate-routes.js`](../prebuild-generate-routes.js)
- npm command: `npm run generate-routes`

Feature toggle in config:

- `app.prebuild.featureBasedRoutes` (default: `false`)
- when `false`, the generated routes include all default lazy routes
- when `true`, the generated routes include only feature-enabled lazy routes
- filtering is path-based in `prebuild-generate-routes.js`; any new route not listed in the filter map remains included by default

Build behavior:

- development builds/serve use `src/app/app.routes.ts` directly (all routes enabled)
- production builds replace `src/app/app.routes.ts` with `src/app/app.routes.generated.ts` using Angular `fileReplacements`
- `build:ssr` runs `generate-routes` explicitly before the production build

If you run production Angular CLI commands directly, run `npm run generate-routes` first.

Parser smoke tests:

- Test script: [`scripts/test-prebuild-generate-routes.js`](../scripts/test-prebuild-generate-routes.js)
- npm command: `npm run test:routes-parser`
- run these tests after changes to `prebuild-generate-routes.js` and after route syntax refactors in `src/app/app.routes.ts`



## Dependencies

The app is built on Angular and uses many web components from Ionic. It also has a few other essential dependencies, which are briefly described below.


### `@angular`

The Angular documentation is available on <https://angular.dev/>.

At it’s root, the Angular app uses NgModules, even though all components except `pages` use the standalone API. This is because currently, another dependency, `Ionic`, doesn’t support the Angular standalone API for SSR apps.

#### Updating Angular

Run

```bash
ng update @angular/cli @angular/core
```

For more detailed instructions see <https://angular.dev/cli/update>.

When updating to a new major version of Angular:

1. See the interactive [Angular update guide][angular_update_guide].
2. Update Angular dependencies in `package.json`/`package-lock.json` (for example via `ng update`). The Docker build installs dependencies from the lockfile using `npm ci`, so there is no separate Angular version argument in [`Dockerfile`][dockerfile] to update.


### `@ionic`

The Ionic Framework documentation is available on <https://ionicframework.com/docs/>

#### Updating Ionic

Run

```bash
npm install @ionic/angular @ionic/angular-server
```


### [`express`][npm_express]

Framework for running a web server in Node.js. This library is required by Angular to enable server-side rendering.


### [`htmlparser2`][npm_htmlparser2]

SSR-compatible HTML/XML parser, used in a few places in the app to parse HTML from the backend.


### [`ionicons`][npm_ionicons]

Iconset especially intended to be used with Ionic.


### [`marked`][npm_marked]

SSR-compatible Markdown parser. Parses Markdown to HTML. Any HTML in the Markdown is passed through as it is.


### [`marked-custom-heading-id`][npm_marked-custom-heading-id]

An extension to `marked` supporting adding custom ids to headings in the [Markdown Extended Syntax](https://www.markdownguide.org/extended-syntax/#heading-ids): `# heading {#custom-id}`.


### [`marked-footnote`][npm_marked-footnote]

An extension to `marked` supporting [GFM footnotes](https://docs.github.com/en/get-started/writing-on-github/getting-started-with-writing-and-formatting-on-github/basic-writing-and-formatting-syntax#footnotes) in Markdown.


### [`rxjs`][npm_rxjs]

Reactive extensions library. Used internally by Angular and heavily in the app for handling Observables.


### [`tslib`][npm_tslib]

Runtime library for TypeScript containing all of the TypeScript helper functions. Required by Angular.


### [`zone.js`][npm_zone.js]

Library for execution contexts (”zones”) that persist across async tasks. Required by Angular.


### [`browser-sync`][npm_browser-sync] (devDependency)

Required by the Angular builders.


### [`gzipper`][npm_gzipper] (devDependency)

Library for compressing files. Used in `Dockerfile` in a post-build step to create compressed (gzip) versions of static files. It’s configured in the `compress` script in `package.json`.


### [`ng-extract-i18n-merge`][npm_ng-extract-i18n-merge] (devDependency)

Library for extracting and merging i18n xliff translation files for Angular projects. This library extends the default Angular CLI, and is used to sort the keys in the xliff translation files. Used when running the `extract-i18n` script in `package.json` to create the xliff translation files for the app.


### `jasmine` and `karma`

Angular testing frameworks, not in use.



## SSR smoke test (localhost)

Use the SSR smoke test to verify that selected routes return expected server-rendered HTML in the initial response.

- Test script: [`scripts/test-ssr-smoke.js`](../scripts/test-ssr-smoke.js)
- npm command: `npm run test:ssr:smoke`
- Default base URL: `http://localhost:4201`

Recommended workflow:

1. Build and start the SSR app:

```bash
npm run build:ssr
npm run serve:ssr
```

2. In another terminal, run:

```bash
npm run test:ssr:smoke
```

Optional arguments:

- `--base-url=<url>` to target another local host/port.
- `--timeout-ms=<number>` to change per-request timeout.

Example:

```bash
npm run test:ssr:smoke -- --base-url=http://localhost:4201 --timeout-ms=5000
```

What the smoke test validates per route:

- HTTP status is `200`.
- `Content-Type` contains `text/html`.
- Expected SSR HTML snippets or patterns are present in the raw response body.

Updating checks:

- Edit `TEST_CASES` in [`scripts/test-ssr-smoke.js`](../scripts/test-ssr-smoke.js) when expected content changes.
- Prefer deterministic snippets that are stable across builds.
- Use regex checks when HTML attribute order can vary.



## SSR benchmark (localhost)

Use the SSR benchmark to measure response-time performance of server-rendered routes (cold and warm runs).

- Test script: [`scripts/benchmark-ssr.js`](../scripts/benchmark-ssr.js)
- npm commands: `npm run bench:ssr`, `npm run bench:ssr:build`
- Default base URL: `http://127.0.0.1:4201`

Recommended workflow:

1. Build and run benchmark in one command:

```bash
npm run bench:ssr:build
```

2. Or, if you already built SSR output, run only the benchmark:

```bash
npm run bench:ssr
```

3. Or benchmark an already running SSR server:

```bash
npm run bench:ssr -- --skip-start --base-url=http://127.0.0.1:4201
```

Optional arguments:

- `--warm-runs=<number>` (or `--runs=<number>`) to set warm requests per route.
- `--route=<path>` or `--routes=<comma,separated,paths>` to target specific routes.
- `--port=<number>` to set the auto-started server port.
- `--base-url=<url>` to target another host/port.
- `--startup-timeout-ms=<number>` to adjust server startup wait time.
- `--request-timeout-ms=<number>` to adjust per-request timeout.
- `--skip-start` to benchmark without starting `dist/app/proxy-server.js`.

Example:

```bash
npm run bench:ssr -- --warm-runs=8 --routes=/sv/,/sv/collection/216/text/20280
```

What the benchmark reports:

- Per-request timing table with status, elapsed milliseconds, and response size.
- Cold run summary (run 1 per route).
- Warm run summary with `avg`, `median`, `p95`, `min`, and `max`.




[angular_update_guide]: https://update.angular.io/
[docker_compose_file]: ../compose.yml
[docker_desktop]: https://www.docker.com/products/docker-desktop/
[dockerfile]: ../Dockerfile
[npm_epubjs]: https://www.npmjs.com/package/epubjs
[npm_express]: https://www.npmjs.com/package/express
[npm_htmlparser2]: https://www.npmjs.com/package/htmlparser2
[npm_ionicons]: https://www.npmjs.com/package/ionicons
[npm_marked]: https://www.npmjs.com/package/marked
[npm_marked-custom-heading-id]: https://www.npmjs.com/package/marked-custom-heading-id
[npm_marked-footnote]: https://www.npmjs.com/package/marked-footnote
[npm_rxjs]: https://www.npmjs.com/package/rxjs
[npm_tslib]: https://www.npmjs.com/package/tslib
[npm_zone.js]: https://www.npmjs.com/package/zone.js
[npm_browser-sync]: https://www.npmjs.com/package/browser-sync
[npm_gzipper]: https://www.npmjs.com/package/gzipper
[npm_ng-extract-i18n-merge]: https://www.npmjs.com/package/ng-extract-i18n-merge
