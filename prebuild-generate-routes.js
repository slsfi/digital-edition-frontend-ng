const fs = require('fs');
const path = require('path');
const common = require('./prebuild-common-fns');

const configFilepath = 'src/assets/config/config.ts';
const sourceRoutesFilepath = 'src/app/app.routes.ts';
const outputFilepath = 'src/app/app.routes.generated.ts';

generateRoutes();

/**
 * Generates the app routes file used by AppRoutingModule.
 *
 * If app.prebuild.featureBasedRoutes is true in config.ts, feature flags
 * in config determine which lazy route imports are included in the file.
 * If false, all default routes are included.
 */
function generateRoutes() {
  const config = common.getConfig(configFilepath);

  if (!config) {
    console.error('Unable to generate routes: could not read config.');
    process.exit(1);
  }

  const sourceContent = fs.readFileSync(path.join(__dirname, sourceRoutesFilepath), 'utf-8');
  const featureBasedRoutes = config.app?.prebuild?.featureBasedRoutes ?? false;

  if (!featureBasedRoutes) {
    fs.writeFileSync(path.join(__dirname, outputFilepath), sourceContent);
    console.log('Copied app routes file (feature-based mode: false).');
    return;
  }

  const sourceRouteBlocks = extractRouteBlocks(sourceContent);
  const includeByPath = common.getRouteIncludeByPath(config);

  const filteredRoutes = sourceRouteBlocks.filter((routeBlock) => {
    const routePath = getRoutePath(routeBlock);
    if (!routePath) {
      return true;
    }

    const include = includeByPath[routePath];
    return include === undefined ? true : include;
  });

  const fileContent = renderRoutesFile(filteredRoutes, featureBasedRoutes);

  fs.writeFileSync(path.join(__dirname, outputFilepath), fileContent);
  console.log(
    `Generated app routes file (${filteredRoutes.length} routes, feature-based mode: ${featureBasedRoutes}).`
  );
}

function extractRouteBlocks(sourceContent) {
  const routesBody = extractRoutesArrayBody(sourceContent);
  const routeBlocks = [];

  let inString = false;
  let stringQuote = '';
  let escapeNext = false;
  let objectDepth = 0;
  let objectStart = -1;

  for (let i = 0; i < routesBody.length; i++) {
    const char = routesBody[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '{') {
      if (objectDepth === 0) {
        objectStart = i;
      }
      objectDepth += 1;
      continue;
    }

    if (char === '}') {
      objectDepth -= 1;
      if (objectDepth === 0 && objectStart >= 0) {
        routeBlocks.push(routesBody.slice(objectStart, i + 1).trim());
        objectStart = -1;
      }
    }
  }

  return routeBlocks;
}

function extractRoutesArrayBody(sourceContent) {
  const startMatch = sourceContent.match(/export\s+const\s+routes\s*:\s*Routes\s*=\s*\[/);

  if (!startMatch || startMatch.index === undefined) {
    console.error(`Unable to parse routes from ${sourceRoutesFilepath}.`);
    process.exit(1);
  }

  const bodyStart = startMatch.index + startMatch[0].length;
  let inString = false;
  let stringQuote = '';
  let escapeNext = false;
  let bracketDepth = 1;

  for (let i = bodyStart; i < sourceContent.length; i++) {
    const char = sourceContent[i];

    if (inString) {
      if (escapeNext) {
        escapeNext = false;
      } else if (char === '\\') {
        escapeNext = true;
      } else if (char === stringQuote) {
        inString = false;
      }
      continue;
    }

    if (char === '\'' || char === '"' || char === '`') {
      inString = true;
      stringQuote = char;
      continue;
    }

    if (char === '[') {
      bracketDepth += 1;
      continue;
    }

    if (char === ']') {
      bracketDepth -= 1;
      if (bracketDepth === 0) {
        return sourceContent.slice(bodyStart, i);
      }
    }
  }

  console.error(`Unable to locate the end of routes array in ${sourceRoutesFilepath}.`);
  process.exit(1);
}

function getRoutePath(routeBlock) {
  const pathMatch = routeBlock.match(/path:\s*'([^']+)'/);
  return pathMatch ? pathMatch[1] : null;
}

function renderRoutesFile(routes, featureBasedRoutes) {
  const routeEntries = routes
    .map(route => indentBlock(normalizeRouteBlockIndentation(route), 2))
    .join(',\n');

  return `import { Routes } from '@angular/router';

/**
 * AUTO-GENERATED FILE. DO NOT EDIT MANUALLY.
 * Source: prebuild-generate-routes.js
 * Route definitions source: ${sourceRoutesFilepath}
 * Feature-based route filtering: ${featureBasedRoutes}
 */
export const routes: Routes = [
${routeEntries}
];
`;
}

function indentBlock(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value
    .split('\n')
    .map(line => `${prefix}${line}`)
    .join('\n');
}

function normalizeRouteBlockIndentation(routeBlock) {
  const lines = routeBlock.split('\n');

  if (lines.length <= 1) {
    return routeBlock;
  }

  const linesAfterFirst = lines.slice(1);
  const nonEmptyLines = linesAfterFirst.filter(line => line.trim().length > 0);

  if (!nonEmptyLines.length) {
    return routeBlock;
  }

  const minIndent = nonEmptyLines.reduce((min, line) => {
    const leadingWhitespace = line.match(/^\s*/)?.[0].length ?? 0;
    return Math.min(min, leadingWhitespace);
  }, Number.POSITIVE_INFINITY);

  const normalizedLines = [
    lines[0],
    ...linesAfterFirst.map(line => line.slice(Math.min(minIndent, line.length)))
  ];

  return normalizedLines.join('\n');
}
