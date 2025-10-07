/**
 * Manifest Version Updater
 * 
 * This script updates the manifest.json file with the version from versionConfig.js
 * Run it as part of your build process to keep the manifest version in sync.
 */

import fs from 'fs';
import path from 'path';
import { EXTENSION_VERSION } from './versionConfig.js';

// Path to the manifest file
const manifestPath = path.join(process.cwd(), 'chrome-extension', 'manifest.json');

try {
  // Read the manifest file
  const manifestData = fs.readFileSync(manifestPath, 'utf8');
  const manifest = JSON.parse(manifestData);
  
  // Update the version
  manifest.version = EXTENSION_VERSION;
  
  // Write back to the file
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  
  console.log(`Successfully updated manifest.json to version ${EXTENSION_VERSION}`);
} catch (error) {
  console.error('Error updating manifest version:', error);
  process.exit(1);
}