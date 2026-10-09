# Frontend App of the SLS Digital Edition Platform

[`digital-edition-frontend-ng`][digital-edition-frontend-ng] is the frontend application of the [SLS][SLS] platform for building digital edition web apps. It supports features typically found in digital scholarly editions, like reading texts, manuscripts, facsimiles and commentaries in parallel views, as well as media collection libraries, indices of named entities and keywords, and an integrated PDF-viewer.

Internationalization and server-side rendering are supported out of the box, meaning that your web app will be fully indexable by search engines and readable by AI bots. The frontend app utilizes a responsive design and works on both desktop and mobile devices. Many features of the user interface are easily configurable, and theming is straightforward.

The app also supports optional authentication-guarded routing and a token-based authentication flow for forks that need protected content.

See the instructions below for [setting up a project](#setting-up-a-project) and the [project customization guide](docs/PROJECT-CUSTOMIZATION.md).

Examples of digital editions employing this frontend app include:

- [Zacharias Topelius Skrifter][topelius]
- [Historiska recept][historiskarecept]
- [Edvard Westermarck. Letters, Articles, and Field Studies][westermarck]
- [The Writings of Tove Jansson][jansson]

The app is built on [Angular][angular] and uses [Ionic][ionic] web components.

<p>
  <a href="https://github.com/angular/angular"><img alt="Angular version badge" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fslsfi%2Fdigital-edition-frontend-ng%2Fmain%2Fpackage-lock.json&query=%24%5B'packages'%5D%5B'node_modules%2F%40angular%2Fcore'%5D%5B'version'%5D&prefix=v&logo=angular&logoColor=%23fff&label=Angular%20Core&color=%23dd0031"></a>
  &nbsp;
  <a href="https://github.com/ionic-team/ionic-framework"><img alt="Ionic version badge" src="https://img.shields.io/badge/dynamic/json?url=https%3A%2F%2Fraw.githubusercontent.com%2Fslsfi%2Fdigital-edition-frontend-ng%2Fmain%2Fpackage-lock.json&query=%24%5B'packages'%5D%5B'node_modules%2F%40ionic%2Fcore'%5D%5B'version'%5D&prefix=v&logo=ionic&logoColor=%23fff&label=Ionic&color=%23176bff"></a>
</p>

<hr>


## Changelog

[Learn about the latest improvements][changelog].


## Setting Up a Project

1. Create a fork of [`digital-edition-frontend-ng`][digital-edition-frontend-ng]. Only include the `main` branch.

2. Rename the fork's `main` branch to `base`, `shared` or something similar.

3. Create a new branch from the renamed branch and name it `production`, `prod` or something similar.

Continue with the [project customization guide](docs/PROJECT-CUSTOMIZATION.md), starting by making the production branch the default and configuring the repository rulesets, then adapting the edition's settings, assets, and languages.

The `base` branch of the forked repository must **never** be manually modified. It must be kept as a clone of the original ”upstream” `main` branch in [`digital-edition-frontend-ng`][digital-edition-frontend-ng]. When the upstream `main` branch is updated, you can sync the updates to the `base` branch in your forked repository. You can then merge the `base` branch into your `production` branch.

This workflow enables updates to the app in the original, upstream repository to be easily distributed to forked project repositories.


## Documentation

- [Project customization](docs/PROJECT-CUSTOMIZATION.md).
- [Updating, building and deployment](docs/DEPLOYMENT.md).
- [Base-app development](docs/DEVELOPMENT.md).
- [Breaking changes for project forks](docs/breaking-changes/README.md).


## Development Setup

### Prerequisites

1. Install [Node.js][node.js] which includes [npm][npm]. The app requires Node `^24.15.0` and npm `>=11.16.0`; Docker and CI are configured to use Node `24`. Check both versions with:

```
node --version
npm --version
```

2. [Clone][clone_repository] the repository locally and `cd` into the folder. On Windows you can use [GitHub Desktop][github_desktop] or [Git Bash][git_bash] (see [tutorial on Git Bash][gith_bash_tutorial]).

3. Install project dependencies:

```
npm install
```

The local Angular CLI from `node_modules` is used by the npm scripts.

### Running locally

#### Development Server

To generate route metadata and serve the Swedish application with development SSR and automatic source updates, run:

```
npm run start
```

Open your browser on http://localhost:4200/. Use `npm run start:fi` for Finnish. Each development server serves one locale at `/`; production serves the configured locale prefixes. Template and component/global style edits use hot updates where supported, while other source edits reload the page. See [development-server behavior](docs/DEVELOPMENT.md#angular-development-server).

#### Production Server-Side Rendered App

To generate route metadata and build the production browser and server bundles for the configured locales, run:

```
npm run build:ssr
```

Then, to start the built production SSR server, run:

```
npm run serve:ssr
```

Open your browser on http://localhost:4201/. This server runs the compiled output from `dist/app/`. After changing source files, stop the server, rebuild, and start it again for the changes to take effect.

See [building and deployment](docs/DEPLOYMENT.md#building) for the localized output layout and Docker/nginx workflow.

### Testing

Run `npm test` for unit tests in interactive watch mode, or `npm run test:ci` for a single run before a PR or in CI. Angular uses Vitest with jsdom; the unit suite does not require Chrome. See [testing](docs/DEVELOPMENT.md#testing) for script-based route, SSR, and output checks.


## Earlier version

[`digital-edition-frontend-ng`][digital-edition-frontend-ng] is an updated version of [`digital_edition_web`][digital_edition_web], which is an outdated Ionic 3 / Angular 5 frontend app.


## About the SLS Digital Edition Platform

The platform consists of an [Angular frontend app][digital-edition-frontend-ng], a [Flask-driven REST API][digital_edition_api], a [backend search app][digital_edition_search] run by the Elastic (ELK) Stack, a [template for a backend files repository][digital_edition_required_files_template] and a [database template][digital_edition_db]. There is also a [tool for creating commentaries][digital_edition_commentary] to texts in [TEI-XML][TEI] format.


[angular]: https://angular.dev/
[angular_cli]: https://angular.dev/cli
[changelog]: CHANGELOG.md
[clone_repository]: https://docs.github.com/en/repositories/creating-and-managing-repositories/cloning-a-repository
[digital-edition-frontend-ng]: https://github.com/slsfi/digital-edition-frontend-ng
[digital_edition_api]: https://github.com/slsfi/digital_edition_api
[digital_edition_commentary]: https://github.com/slsfi/digital_edition_commentary
[digital_edition_db]: https://github.com/slsfi/digital_edition_db
[digital_edition_required_files_template]: https://github.com/slsfi/digital_edition_required_files_template
[digital_edition_search]: https://github.com/slsfi/digital_edition_search
[digital_edition_web]: https://github.com/slsfi/digital_edition_web
[git_bash]: https://gitforwindows.org/
[gith_bash_tutorial]: https://www.atlassian.com/git/tutorials/git-bash
[github_desktop]: https://desktop.github.com/
[historiskarecept]: https://historiskarecept.sls.fi/
[ionic]: https://ionicframework.com/
[jansson]: https://jansson.sls.fi/en/
[node.js]: https://nodejs.org/
[npm]: https://www.npmjs.com/get-npm
[SLS]: https://www.sls.fi/en
[TEI]: https://tei-c.org/
[topelius]: https://topelius.sls.fi/
[westermarck]: https://westermarck.sls.fi/en/
