const fs = require('fs');
const path = require('path');

const localeDir = path.join(__dirname, '..', 'src', 'locale');
const bomPrefix = Buffer.from([0xef, 0xbb, 0xbf]);
const utf8Decoder = new TextDecoder('utf-8', { fatal: true });

function isUtf8(buffer) {
  try {
    utf8Decoder.decode(buffer);
    return true;
  } catch {
    return false;
  }
}

const files = fs
  .readdirSync(localeDir)
  .filter(fileName => fileName.endsWith('.xlf'))
  .sort();

if (!files.length) {
  console.error(`No .xlf files found in ${localeDir}`);
  process.exit(1);
}

const issues = [];

for (const fileName of files) {
  const fullPath = path.join(localeDir, fileName);
  const fileBuffer = fs.readFileSync(fullPath);

  if (fileBuffer.subarray(0, 3).equals(bomPrefix)) {
    issues.push(`${fileName}: contains UTF-8 BOM (must be UTF-8 without BOM)`);
  }

  if (!isUtf8(fileBuffer)) {
    issues.push(`${fileName}: is not valid UTF-8`);
  }
}

if (issues.length) {
  console.error('Locale encoding check failed:');
  for (const issue of issues) {
    console.error(`- ${issue}`);
  }
  process.exit(1);
}

console.log(`Locale encoding check passed (${files.length} .xlf files).`);
