import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EXTENSION_VERSION } from './chrome-extension/versionConfig.js';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const EXTENSION_DIR = './chrome-extension';
const VERSION = EXTENSION_VERSION;

console.log(`Updating extension files to version ${VERSION}...`);

// Update manifest.json
const manifestPath = path.join(EXTENSION_DIR, 'manifest.json');
let manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version = VERSION;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`Updated manifest.json to version ${VERSION}`);

// Update background.js
const backgroundPath = path.join(EXTENSION_DIR, 'background.js');
let backgroundJs = fs.readFileSync(backgroundPath, 'utf8');
// Replace VERSION variable declaration
backgroundJs = backgroundJs.replace(
  /const VERSION = ["']([0-9]+\.[0-9]+\.[0-9]+)["'];/,
  `const VERSION = "${VERSION}"; // Automatically updated from extensionConfig`
);
fs.writeFileSync(backgroundPath, backgroundJs);
console.log(`Updated background.js to version ${VERSION}`);

// Update popup.js
const popupPath = path.join(EXTENSION_DIR, 'popup/popup.js');
let popupJs = fs.readFileSync(popupPath, 'utf8');
// Replace version in comments and debug logs
popupJs = popupJs.replace(
  /\/\/ MATA Key Manager Extension - Popup Script v([0-9]+\.[0-9]+\.[0-9]+)/,
  `// MATA Key Manager Extension - Popup Script v${VERSION}`
);
popupJs = popupJs.replace(
  /\[DEBUG v[0-9]+\.[0-9]+\.[0-9]+\]/g,
  `[DEBUG v${VERSION}]`
);
fs.writeFileSync(popupPath, popupJs);
console.log(`Updated popup.js to version ${VERSION}`);

console.log('All extension files have been updated successfully!');