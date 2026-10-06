# Cross-cutting TODOs

This document tracks cross-cutting TODOs that should stay visible outside local code comments.

## Remaining Stage 2 checkpoints

Current status:

- The standalone/zoneless application now uses the integrated application builder and `AngularNodeAppEngine`.
- Generated Angular server routes own auth-protected CSR shells through `RenderMode.Client`; the manual Express CSR workaround has been removed.
- i18n extraction now delegates to `@angular/build:extract-i18n` through the existing merge wrapper.
- Swedish/Finnish locale routing and Swedish-default unprefixed serving are verified in Node, the production Docker image, nginx, and browser navigation; no additional compatibility changes were needed in phase 11.
- Development SSR/HMR, source maps, startup route generation, nginx output caching, and the CI configuration are verified in phase 12. Both start commands now generate routes, and nginx caches emitted `media/` fonts immutably.
- The phase 13 Vitest rehearsal preserves all 267 tests across 44 spec files. The plan records the required typed-fake, signal, timer, locale, route-identity, and spy-cleanup conversions; the active runner remains Jasmine/Karma.
- Phase 14 adds the rehearsed Vitest/jsdom development dependencies. Clean installation and the pre-Vitest fast gate pass; the runner and test APIs remain unchanged for phase 15's atomic cutover.

See the [application-builder and Vitest migration plan](migrations/STAGE-2-APPLICATION-BUILDER.md) for the remaining checkpoints:

- Migrate Jasmine/Karma to Vitest in its dedicated phases; retain the existing test builder and plugins until then.

## nginx rate limiting for SSR backend

- nginx rate limiting is currently not enabled; app-level limiting is handled in `src/server.ts` (`express-rate-limit`).
- Consider re-enabling nginx edge rate limiting later for defense in depth.
- Why postponed: correct per-user limiting in nginx depends on verified real client IP forwarding/trust configuration across proxy chain(s) (for example LB/HAProxy/nginx). A wrong config can collapse many users into one bucket or trust spoofable headers.

## Main side menu articles wrapper label

- Current behavior: when `config.component.mainSideMenu.ungroupArticles` is `false`, the wrapper item for article children gets its title from the root markdown menu node for articles.
- In the same menu branch, individual article item titles are mapped from `config.articles`, so the wrapper-title source is inconsistent with the child item-title source.
- Future breaking change to consider: make the wrapper title app-owned and localized through the Angular XLF files (like other menu wrapper labels), instead of reading it from the markdown node.
- Reasoning: forks already customize localized XLF strings, so this keeps the menu label source consistent and avoids coupling the wrapper label to markdown menu metadata.

## Hydration migration

Current status:

- Client hydration is intentionally not enabled; no hydration provider is registered because Ionic's underlying Stencil components do not currently support SSR hydration with Angular. See [Application architecture](DEVELOPMENT.md#application-architecture) and [ionic-team/ionic-framework#30490](https://github.com/ionic-team/ionic-framework/issues/30490).
- `ngSkipHydration` is used only on Angular component hosts, never on plain HTML elements.
- Facsimile image viewers are explicitly marked with `ngSkipHydration` as a temporary safeguard.
- Media-collection thumbnails are also resolved through `FacsimileImageService`; in auth-enabled mode, browser `src` can become a blob URL after bootstrap.

Current temporary markers:

- [`src/app/components/collection-text-types/facsimiles/facsimiles.component.ts`](../src/app/components/collection-text-types/facsimiles/facsimiles.component.ts)
- [`src/app/dialogs/modals/fullscreen-image-viewer/fullscreen-image-viewer.modal.ts`](../src/app/dialogs/modals/fullscreen-image-viewer/fullscreen-image-viewer.modal.ts)
- [`src/app/components/gallery-thumb-image/gallery-thumb-image.component.ts`](../src/app/components/gallery-thumb-image/gallery-thumb-image.component.ts)
- [`src/app/app.component.html`](../src/app/app.component.html) (auth-enabled mode: `top-menu` and `main-side-menu` are marked with `ngSkipHydration`)

Related implementation notes:

- [`src/app/components/collection-text-types/facsimiles/facsimiles.component.ts`](../src/app/components/collection-text-types/facsimiles/facsimiles.component.ts)
- [`src/app/dialogs/modals/fullscreen-image-viewer/fullscreen-image-viewer.modal.ts`](../src/app/dialogs/modals/fullscreen-image-viewer/fullscreen-image-viewer.modal.ts)
- [`src/app/components/gallery-thumb-image/gallery-thumb-image.component.ts`](../src/app/components/gallery-thumb-image/gallery-thumb-image.component.ts)
- [`src/app/pages/media-collection/media-collection.page.ts`](../src/app/pages/media-collection/media-collection.page.ts)

Why:

- In auth-enabled mode, browser rendering may replace URL-based image `src` values with blob URLs after bootstrap.
- If hydration is enabled later, this can cause SSR/client DOM differences unless initial `src` is deterministic.
- This also applies to media-collection thumbnail images resolved via `FacsimileImageService`.

Exit criteria:

1. Hydration is enabled in the app.
2. Facsimile and media-collection image `src` initialization is made hydration-safe (deterministic SSR/client initial value).
3. Remove `ngSkipHydration` markers and remove/update the local TODO comments above.
