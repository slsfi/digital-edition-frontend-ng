# Updating, building and deployment


## Prerequisites

Set up a forked repository for your app according to the instructions for [setting up a new project][set_up_project]. These instructions only apply to forked repositories, and assume that it is the `production` branch which is to be updated, built and deployed. However, the same instructions apply to any other branch, for instance a `dev` branch, – just exchange any mentions of `production` with the target branch name.

Use the [project customization guide](PROJECT-CUSTOMIZATION.md) to configure edition features, assets, languages, and styling before building. This guide covers updating, releasing, and operating the configured fork.


## Updating from the base app, [digital-edition-frontend-ng][digital-edition-frontend-ng]

1. Switch to the `base` branch.
2. Select `Sync fork` to update the `base` branch with the latest changes from the original, upstream repository [digital-edition-frontend-ng][digital-edition-frontend-ng].
3. Merge the changes from the `base` branch to the `production` branch and resolve any conflicts.

It’s recommended not to synchronise unreleased changes from the upstream repository, but to wait for them to be included in a release. The base app uses semantic versioning.

For an upgrade from v3 to v4, follow the dedicated [fork upgrade guide](upgrade-guides/upgrade-to-v4.md) before using these general build and deployment instructions.


## Building

A GitHub Actions [workflow][build_workflow] for automated builds is included in the repository. It automatically builds and pushes a new [Docker image][docker_image_reference] of the app on pushes to `main`, on pushed tags, and when manually triggered (`workflow_dispatch`). When creating a new release tag, name the tag based on the version of the base app and append it with a branch identifier and an incremental build number.

For example, if the base app is on version `1.0.2`, the release targets the `production` branch and this is the first build for this version in the `production` branch, the release should be tagged `1.0.2-production.1`. The next release should be tagged `1.0.2-production.2` (build number incremented by 1), provided that the base app remains on `1.0.2` and the release targets the `production` branch. When the semantic version of the base app changes, the build number is reset to 1, for instance: `1.1.0-production.1`.

The Docker images built this way are pushed to and stored in the [GitHub Container Registry][ghcr_docs].

The production build command `npm run build:ssr` runs route generation and one integrated `@angular/build:application` build for the browser and server. Route filtering follows the settings described in [project customization](PROJECT-CUSTOMIZATION.md#feature-based-route-generation).

The integrated application build emits browser files under `dist/app/browser/<locale subPath>` and the ESM runtime at `dist/app/server/server.mjs`. `npm run serve:ssr` starts it on port 4201 (or `PORT`). Browser CSR shells are named `index.csr.html`. Docker and benchmarks use the canonical npm command; emitted locales and their URL subpaths are configured in `angular.json`.

| Production output | Purpose |
| --- | --- |
| `dist/app/server/server.mjs` | Express entry with Angular's localized application dispatch. |
| `dist/app/server/<locale subPath>/main.server.mjs` and adjacent chunks/manifests | Localized Angular server application and its runtime dependencies. |
| `dist/app/browser/<locale subPath>/index.csr.html` | Client-rendered shell used for auth-protected routes when auth is enabled. |
| `dist/app/browser/<locale subPath>/` | Browser bundles, compiled `media/` resources, and copied public files (`assets/`, `static-html/`, favicon, robots, and sitemap). |

`<locale subPath>` is Angular's configured output/URL subpath, which can differ from the locale code. The base emits Swedish and Finnish; `aa` is the technical source locale, not a production output. Angular uses runtime SSR for public routes, with critical CSS inlining and client hydration disabled. Generated static collection menus are independent of Angular prerendering.

The [`Dockerfile`][dockerfile] installs from the lockfile with `npm ci`, generates the sitemap/static menus, builds both applications, and compresses browser output. The final image contains production dependencies and runs the SSR entry as a non-root user. Local `build:ssr` does not run the sitemap/menu generators or compression; invoke those commands separately when validating the complete deployment output locally.

**Important!** Before creating a new release, push a commit that updates:

1. the image tag in [`compose.yml`][docker_compose_file] to the release tag you are going to use,
2. the version property in [`package.json`][package_json] and [`package-lock.json`][package-lock_json] with the release tag (recommended: run `npm version --no-git-tag-version <release-tag>` so both files are updated without changing dependency versions),
3. the [changelog][changelog].

If you edit `package.json` manually instead, run `npm install --package-lock-only` to synchronize lockfile metadata. Avoid using plain `npm install` just to update the lockfile, unless you intentionally want dependency resolution changes.


## Deployment

You can start a Docker container of the app from an image created in the step above by using the [`docker run`][docker_run_reference] command.

The Docker runtime starts SSR through `npm run serve:ssr`. Keep that script aligned with the compiled server entry when customizing a fork's runtime; Docker and benchmark auto-start both use it.

However, for easier configuration and better performance it is recommended to use [Docker Compose][docker_compose_reference] and the provided Compose file [`compose.yml`][docker_compose_file]. The Compose file defines an [nginx][nginx] web server to be used for serving static files in front of Node ([`nginx.conf`][nginx_conf]). This increases performance.

The application builder processes Sass font references and emits hashed fonts under `dist/app/browser/<locale subPath>/media/`. nginx gives those fonts the same one-year immutable caching as emitted JS/CSS bundles. Locale assets and generated `static-html` menus retain one-day caching. `npm run compress` creates `.gz` siblings for the included text/SVG/icon/TTF/OTF file types of at least 1,300 bytes throughout `dist/app/browser`, removing gzip files larger than the originals, for nginx's `gzip_static` delivery. WOFF/WOFF2 are already compressed and excluded from this command. Dynamic SSR HTML is not precompressed; on-the-fly nginx compression remains optional in `nginx.conf`.

Node serves unprefixed pages and public files from `app.i18n.defaultLanguage`, falling back to the first emitted locale when the configured default is absent. Set nginx's `$default_locale` to that locale's emitted subpath as well; nginx does not read the TypeScript configuration. Root `/robots.txt` and `/sitemap.txt` use the default locale's copied files. HTTP does not redirect unprefixed requests based on `Accept-Language`. In the base app, Angular's browser bootstrap subsequently normalizes unprefixed routes under the Swedish `/sv/` base href.

The Node SSR app uses app-level request limiting for dynamic render requests. Limits can be tuned with environment variables (or by modifying in [`src/server.ts`](../src/server.ts)):

- `SSR_RATE_LIMIT_WINDOW_MS` (default: `60000`): length of one rate-limit window in milliseconds (60 seconds by default).
- `SSR_RATE_LIMIT_LIMIT` (default: `1200`): maximum number of dynamic render requests allowed per resolved request IP (`req.ip`) during one window (default: 1200 requests per 60 seconds, after which requests are answered with HTTP `429` until the window resets).

The request IP used by the limiter depends on Express proxy trust settings. Configure this in [`src/project/config.ts`][config_ts]:

- `app.ssr.trustProxyHops` (default: `2`): number of trusted proxy hops when resolving `req.ip` for SSR rate limiting. Value `2` is correct when the app runs behind one upstream reverse proxy (for example HAProxy) in front of nginx (`reverse proxy -> nginx -> Node/Express SSR app`). If the app is reached directly through nginx (no extra reverse proxy), set this to `1`. If the app is reached directly by Node/Express (no proxy), set this to `0`. If the proxy chain is longer, increase the value accordingly.
- `app.ssr.trustedProxyAddresses` (default: `["loopback", "linklocal", "uniquelocal"]`): trusted proxy IPs/subnets, using Express's named ranges, individual addresses, or CIDRs. The hop limit and address allowlist both apply to the forwarded client-IP chain. Set this to the actual trusted proxy addresses for your deployment; include public proxy IPs explicitly when needed. An empty list disables proxy trust. Node accepts `X-Forwarded-Host` and `X-Forwarded-Proto` only from a trusted immediate peer with a nonzero hop limit. The middleware checks only those two origin headers; Express handles client-IP trust and Angular filters unsupported forwarding headers, including `Forwarded` and `X-Forwarded-Prefix`. Direct requests from untrusted addresses cannot override the public origin or limiter client IP with forwarding headers.

In the standard HAProxy -> nginx -> Node deployment, nginx is the only peer connecting to Node. The application peer check is additional protection for alternate deployment paths; trusted proxies must still sanitize incoming headers. It performs an IP/subnet comparison against a trust function compiled at startup, with no scan of all request headers or per-request network lookup.

The nginx config preserves an incoming `X-Forwarded-Proto` header when the app runs behind an upstream TLS-terminating proxy, and falls back to nginx's own `$scheme` when that header is absent. SSR URL generation also treats `app.siteURLOrigin` as authoritative when the request host matches the configured public host, so canonical and Open Graph URLs keep the configured HTTPS origin even if an internal proxy hop uses HTTP.

Angular's host allowlist includes loopback hosts and the hostname from `app.siteURLOrigin`; additional deployment hosts can be supplied through comma-separated `NG_ALLOWED_HOSTS`. Trusted upstream proxies must overwrite client-supplied origin headers before forwarding them to Node.

**Important!** nginx gets access to the static files through a [Docker volume][docker_volume_reference], which is defined in [`compose.yml`][docker_compose_file]. Since volumes persist even if the container itself is deleted, and the content of a volume is not updated when the image is updated, you need to run

```
docker compose pull && docker compose down --volumes && docker compose up -d
```

when you wish to redeploy the app with an updated image. This removes all existing containers and volumes before recreating the app.


## Roll-back to earlier version

In case the deployed app needs to be rolled back to an earlier version, push a commit that updates:

1. the image tag in [`compose.yml`][docker_compose_file] to the tag of the selected previous release,
2. the [changelog][changelog] with information about the roll-back under the ”Unreleased” section.

Then redeploy the app.

**Important!** Do not create a new release when rolling back to an earlier version.



[build_workflow]: ../.github/workflows/docker-build-and-push.yml
[changelog]: ../CHANGELOG.md
[config_ts]: ../src/project/config.ts
[digital-edition-frontend-ng]: https://github.com/slsfi/digital-edition-frontend-ng
[docker_compose_file]: ../compose.yml
[docker_compose_reference]: https://docs.docker.com/compose/
[docker_image_reference]: https://docs.docker.com/build/building/packaging/
[docker_run_reference]: https://docs.docker.com/engine/reference/run/
[docker_volume_reference]: https://docs.docker.com/storage/volumes/
[dockerfile]: ../Dockerfile
[ghcr_docs]: https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
[nginx]: https://www.nginx.com/
[nginx_conf]: ../nginx.conf
[package_json]: ../package.json
[package-lock_json]: ../package-lock.json
[set_up_project]: https://github.com/slsfi/digital-edition-frontend-ng#setting-up-a-project
