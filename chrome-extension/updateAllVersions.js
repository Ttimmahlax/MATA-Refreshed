/**
 * MATA Extension Version Update Script
 *
 * This JavaScript version of the update script provides cross-platform support
 * Run this script whenever you need to update the extension version.
 * Usage: node updateAllVersions.js 1.5.68
 */

const fs = require('fs');
const path = require('path');

// Get new version from command line arguments
const newVersion = process.argv[2];

if (!newVersion) {
  console.error('Usage: node updateAllVersions.js <new_version>');
  console.error('Example: node updateAllVersions.js 1.5.68');
  process.exit(1);
}

// Validate version format (simple check)
if (!newVersion.match(/^\d+\.\d+\.\d+$/)) {
  console.error('Error: Version must be in format X.Y.Z (eg. 1.5.68)');
  process.exit(1);
}

console.log(`Updating extension version to ${newVersion}...`);

// Base directory for chrome extension
const extensionDir = path.join(__dirname);

// 1. Update the central version config file
const versionConfigPath = path.join(extensionDir, 'versionConfig.js');
const versionConfigContent = `/**
 * MATA Extension Version Configuration
 * 
 * This is the central configuration file for the extension version.
 * Update only this file when changing the version number.
 */

// The single source of truth for the extension version
export const EXTENSION_VERSION = '${newVersion}';

// Export as both named and default export for maximum compatibility
export default EXTENSION_VERSION;`;

fs.writeFileSync(versionConfigPath, versionConfigContent);
console.log(`✅ Updated versionConfig.js to version ${newVersion}`);

// 2. Update the manifest.json file
const manifestPath = path.join(extensionDir, 'manifest.json');
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifest.version = newVersion;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    console.log(`✅ Updated manifest.json to version ${newVersion}`);
  } catch (error) {
    console.error(`❌ Error updating manifest.json: ${error.message}`);
  }
} else {
  console.error(`❌ manifest.json not found at ${manifestPath}`);
}

// 3. Update version comments in other files
const filesToUpdate = [
  { 
    path: path.join(extensionDir, 'sharedBackupHandler.js'),
    pattern: /Version: \d+\.\d+\.\d+/g,
    replacement: `Version: ${newVersion}`
  },
  {
    path: path.join(extensionDir, 'storageBackup.js'),
    pattern: /Version: \d+\.\d+\.\d+/g,
    replacement: `Version: ${newVersion}`
  }
];

filesToUpdate.forEach(file => {
  if (fs.existsSync(file.path)) {
    try {
      let content = fs.readFileSync(file.path, 'utf8');
      content = content.replace(file.pattern, file.replacement);
      fs.writeFileSync(file.path, content);
      console.log(`✅ Updated version comment in ${path.basename(file.path)}`);
    } catch (error) {
      console.error(`❌ Error updating ${path.basename(file.path)}: ${error.message}`);
    }
  } else {
    console.error(`❌ File not found: ${file.path}`);
  }
});

console.log('\nVersion update complete! The extension is now at version', newVersion);
console.log('Make sure to rebuild the extension and reload it in Chrome to apply the changes.');