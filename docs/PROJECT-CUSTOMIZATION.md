# Project customization

This guide is for maintainers configuring an edition fork of the base app. Start with the four [project setup steps](../README.md#setting-up-a-project), then use the files and settings below to adapt the app to the edition. Keep edition-specific settings, styles, and assets concentrated in these locations so updates from the base repository remain easier to merge.

The [base-app development notes](DEVELOPMENT.md) cover architecture, implementation, dependency maintenance, and developer testing. This guide covers the existing customization options; it is not yet a complete reference for every configuration field. When upgrading an existing v3 fork, follow the [v3-to-v4 upgrade guide](upgrade-guides/upgrade-to-v4.md) as well.

## Project customization files

Keep a fork's settings and styles in `src/project/`, and its static files in `public/`. The usual customization points are:

| Location | What a project fork changes |
| --- | --- |
| [`src/project/config.ts`](../src/project/config.ts) | Edition settings, enabled features, menus, authentication, SSR options, and public/backend origins. Application imports continue to use `@config`. |
| [`src/project/global-overrides.scss`](../src/project/global-overrides.scss) | Additional global styles and overrides to base CSS variables and page/component styles. Loaded after the base styles. |
| [`src/styles.scss`](../src/styles.scss) | Comment out unused shared style/font bundles. |
| [`src/theme/_inc-global-tei.scss`](../src/theme/_inc-global-tei.scss) | Select the TEI feature styles required by the edition; see [theming](THEMING.md#tei-styles) for the alternate v2 entry. |
| `public/assets/{images,files,ebooks,fonts}/` | Add or replace public edition assets. Keep URLs such as `assets/images/...` in configuration and templates. |
| [`public/favicon.ico`](../public/favicon.ico) | Replace the favicon. The former `assets/icon/favicon.ico` URL remains available as a build-time alias. |
| [`src/index.html`](../src/index.html) | Document-level resources, such as external font-provider snippets. |
| [`angular.json`](../angular.json) | Configure the edition's build locales. |
| [`src/locale/`](../src/locale/) | Edit translations for enabled locales. |
| [`public/robots.txt`](../public/robots.txt) | Adjust crawler instructions when needed; it is served at `/robots.txt`. |

`public/sitemap.txt` and `public/static-html/collection-toc/` are generator outputs. Their generation is described [below](#generated-public-content).

## Edition settings and content

Review [`config.ts`](../src/project/config.ts) before running the edition. The base configuration contains example project data; replace it with the fork's own identifiers, content, and URLs.

| Configuration area | What to review |
| --- | --- |
| `app.projectNameDB` and `app.projectId` | The edition's backend project identifiers. |
| `app.backendBaseURL` | The digital edition API used for content requests. |
| `app.siteURLOrigin` | The public site origin used for generated URLs and SSR metadata. Use the deployed public origin, including its intended HTTP/HTTPS scheme. |
| `collections`, `articles`, and `ebooks` | Collection selection/order, article entries, ebook files, and related content settings. |
| `page`, `component`, and `modal` | Page behavior, navigation, content views, search options, and dialogs. |
| `app.openGraphMetaTags` and `page.home` | Social-share images, the home-page banner, and localized image descriptions. |

Configuration is compiled into the app; rebuild the production output after changing it. It is not a runtime environment file. Do not put secrets or credentials in it. Backend content, search indices, and file endpoints must correspond to the configured edition; a frontend setting does not provision those services.

### Navigation and enabled features

Use `component.mainSideMenu.items` to select the main navigation items, and `component.topMenu` to select the top-menu buttons. Review the corresponding content settings as well: for example, articles need entries in `articles`, ebooks need entries in `ebooks`, and collections use `collections.order`. Collection front-matter views are selected with `collections.frontMatterPages`.

With feature-based route filtering disabled, hiding a menu item changes navigation but leaves its route available. Use [feature-based route generation](#feature-based-route-generation) to omit supported inactive production routes, and [authentication](#authentication) when content requires access control.

### Feature-based route generation

`app.prebuild.featureBasedRoutes` defaults to `false`. In that mode, generated production routes retain the canonical route set. Set it to `true` to filter supported top-level routes according to the edition's feature/content settings.

The filtering rules use menu flags and related content settings. For example, the ebook route requires both `component.mainSideMenu.items.ebooks` and at least one `ebooks` entry; search remains included when either its side-menu item or the top-menu search button is enabled. Custom top-level routes without a filtering rule remain included. Route filtering is not an authorization mechanism.

`npm run build:ssr` generates the route artifacts before building. During development, the browser uses the canonical routes, so check the production build to verify that inactive routes were omitted. `npm start` and `npm run start:fi` generate server-rendering metadata before serving; after changing feature/auth configuration while a server is running, run `npm run generate-routes` and restart the development server. Generate routes first when invoking Angular build/serve commands directly.

The generated route files are build outputs. Do not edit them to customize the edition. Changes to route declarations or to the filtering rules are source development, documented in [route-generation internals](DEVELOPMENT.md#feature-based-route-generation).

## Public assets and crawler documents

Add edition files under `public/assets/` and reference their public URL rather than their source location. For example, `public/assets/images/banner.jpg` is referenced as `assets/images/banner.jpg`, not `public/assets/images/banner.jpg`. Angular copies public files into each emitted locale's browser output. Locale-prefixed asset requests use that locale's copy; unprefixed requests use the configured default locale.

Replace `public/favicon.ico` for the edition's favicon. Both the current `favicon.ico` URL and the compatibility `assets/icon/favicon.ico` URL are emitted from that file. Font selection and source references are covered in the [theming guide](THEMING.md).

Edit `public/robots.txt` when crawler rules need to differ for the edition. The deployed crawler documents are available at the website root as `/robots.txt` and `/sitemap.txt`, independent of the locale prefixes used by application pages. See [deployment](DEPLOYMENT.md#deployment) for default-locale serving and nginx configuration.

### Generated public content

| Setting | Command | Output |
| --- | --- | --- |
| `app.prebuild.sitemap` | `npm run generate-sitemap` | `public/sitemap.txt`, containing page URLs for the configured default language. |
| `app.prebuild.staticCollectionMenus` | `npm run generate-static-collection-menus` | Locale-specific collection TOC fragments under `public/static-html/collection-toc/`. |

Run the generators before building when their corresponding flags are enabled. Docker invokes both generators automatically; a local `npm run build:ssr` does not. Collection-menu generation is skipped when authentication is enabled or `app.ssr.collectionSideMenu` renders the menu dynamically. The generators fetch edition content from the configured backend, so that backend must be reachable when generation runs.

Regenerate these files after changing relevant content, languages, or configuration. Generated collection menus are ignored by Git. If generation is disabled or skipped, review existing output rather than assuming it was removed: files left in `public/` are still copied by the build. For protected content, follow the [authentication guide](AUTHENTICATION.md#static-collection-menus-in-auth-mode) when reviewing static menus.

## Theming

Use the [theming guide](THEMING.md) for CSS variables, global overrides, style/font bundle selection, TEI styles, external fonts, images, and theme validation. Keep most edition-specific styles in `src/project/global-overrides.scss`; the detailed styling instructions belong in that guide.

## Internationalization

Internationalization is part of project customization. A dedicated guide for adding languages, translation workflows, and multilingual content has not yet been written. Until then, the main configuration points are:

- `app.i18n.languages` and `app.i18n.defaultLanguage` in `config.ts` select the app's language choices and default language.
- `angular.json` selects the translated build locales, translation files, and URL `subPath` values. These must agree with the edition's language configuration.
- `src/locale/` contains the translation files. `npm run extract-i18n` extracts and merges messages; review the resulting translation changes.
- Localized configuration values, such as image descriptions, need entries for the edition's enabled languages. Backend multilingual-content settings must match the edition's data.

The base app emits Swedish and Finnish. Its `aa` locale is the technical source locale, not the public default language. Development serves one locale at `/`; production serves the configured locale subpaths and uses the configured default language for unprefixed requests. See [deployment](DEPLOYMENT.md#deployment) for that serving contract.

## Authentication

Authentication is optional and disabled in the base configuration. Follow the [authentication guide](AUTHENTICATION.md) to enable it in a fork, configure backend endpoints, protect the intended routes, and validate login/session behavior. That guide also covers the consequences for SSR, sitemaps, and static collection menus.

## Validate and deploy the edition

Use the [README's local setup](../README.md#development-setup) to install dependencies and preview changes. Check the edition's enabled page types, navigation, images/downloads, languages, and responsive theme. Configuration and asset changes also need a production build: development serves one locale and does not apply production route filtering.

Generate the required public content, then run `npm run build:ssr` and `npm run serve:ssr`. Check locale-prefixed and unprefixed URLs, root crawler documents, and any protected routes. The base SSR smoke fixtures use base-app content; use a cases file for the edition's routes and expected content as described in the [smoke-test reference](DEVELOPMENT.md#ssr-smoke-test-local-or-remote).

Use [updating, building and deployment](DEPLOYMENT.md) for releases, Docker/nginx, proxy settings, and rollback. Use [upgrade guides](upgrade-guides/) for changes between major base-app releases.
