# Breaking changes for project forks

These documents describe the breaking changes introduced in each major release of the base app, along with merge considerations and validation steps for project forks. Each document assumes the fork is on the latest release of the previous major version. For example, the v4 notes assume the latest v3 release as their starting point.

## Available documents

| Document | Assumed baseline |
| --- | --- |
| [v4 breaking changes and fork migration notes](v4.md) | Latest v3 release. |

The [fork update workflow](../DEPLOYMENT.md#updating-from-the-base-app-digital-edition-frontend-ng) syncs with the base app's current `main` branch. The release and baseline define the scope of each document; they do not provide a way to select intermediate releases. For forks on older versions, also review earlier breaking changes in the [changelog](../../CHANGELOG.md) and any available documents when merging the current upstream changes.

Documents for earlier major releases are not yet available. Check each document's release-status notes and use the final release notes and tagged source when upgrading a production fork.

## Related documentation

- [Project customization](../PROJECT-CUSTOMIZATION.md): current edition settings, customization files, and fork setup.
- [Updating, building and deployment](../DEPLOYMENT.md): routine upstream updates, releases, deployment, and rollback.
- [Changelog](../../CHANGELOG.md): changes included in each release.
- [Migration plans](../migrations/README.md): implementation plans and history for changes in the base app.
