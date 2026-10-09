# Cross-cutting TODOs

This document tracks cross-cutting TODOs that should stay visible outside local code comments.

## nginx rate limiting for SSR backend

- nginx rate limiting is currently not enabled; app-level limiting is handled in `src/server.ts` (`express-rate-limit`).
- Consider re-enabling nginx edge rate limiting later for defense in depth.
- Why postponed: correct per-user limiting in nginx depends on verified real client IP forwarding/trust configuration across proxy chain(s) (for example LB/HAProxy/nginx). A wrong config can collapse many users into one bucket or trust spoofable headers.

## Main side menu articles wrapper label

- Current behavior: when `config.component.mainSideMenu.ungroupArticles` is `false`, the wrapper item for article children gets its title from the root markdown menu node for articles.
- In the same menu branch, individual article item titles are mapped from `config.articles`, so the wrapper-title source is inconsistent with the child item-title source.
- Future breaking change to consider: make the wrapper title app-owned and localized through the Angular XLF files (like other menu wrapper labels), instead of reading it from the markdown node.
- Reasoning: forks already customize localized XLF strings, so this keeps the menu label source consistent and avoids coupling the wrapper label to markdown menu metadata.

## TypeScript compiler follow-ups

Consider these changes to the shared [TypeScript configuration](../tsconfig.json):

- **Remove `strictPropertyInitialization: false`:** with `strict: true`, omitting this override enables the check. Some observable fields are assigned in lifecycle hooks rather than constructors. Give these fields an appropriate initial value or model their initially absent state before removing the override; avoid adding definite-assignment assertions solely to silence errors.
- **Enable `noPropertyAccessFromIndexSignature`:** define explicit types for [`src/project/config.ts`](../src/project/config.ts) and other affected dictionary values, then distinguish known properties from dynamic keys before enabling the check.
- **Remove `useDefineForClassFields: false`:** with `target: ES2022`, omitting this override enables standard class-field semantics and changes runtime initialization. Audit constructor, inheritance, and field initialization dependencies, then verify browser and SSR behavior before removing the override.
- **Review suppressed Angular diagnostics:** `nullishCoalescingNotNullable` and `optionalChainNotNullable` remain suppressed in the shared configuration. Align nullable types and template guards, then remove the suppressions when the warnings have been resolved.
- **Evaluate `skipLibCheck` only if declaration checking becomes a measured bottleneck:** retain dependency declaration checks for now. Compare build/test timings and any lost diagnostics before enabling it.

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
