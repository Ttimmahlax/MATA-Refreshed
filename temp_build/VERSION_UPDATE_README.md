# MATA Extension Version Management

## Overview

This document explains the new centralized version management system for the MATA extension. We've implemented a single source of truth for the extension version to eliminate inconsistencies across files.

## Version Configuration

The extension version is now defined in a single location:

- `chrome-extension/versionConfig.js` - The central source of truth for the extension version

## How Version Updates Work

1. The version is defined once in `versionConfig.js`
2. All other files import this version using:
   ```javascript
   import { EXTENSION_VERSION } from './versionConfig.js';
   ```
3. When runtime access to the manifest is available, we verify that the manifest version matches the config version
4. Automated update scripts handle propagating version changes to all required files

## Updating the Version

To update the extension version:

1. Use the provided update script:
   ```bash
   # Using the Bash script
   ./chrome-extension/updateAllVersions.sh 1.5.68
   
   # OR using the Node.js script
   node chrome-extension/updateAllVersions.js 1.5.68
   ```

2. The script will:
   - Update the version in `versionConfig.js`
   - Update the version in `manifest.json`
   - Update version comments in related files

3. After running the script, rebuild the extension using the existing build tools.

## Manual Update (if needed)

If you need to manually update the version:

1. Edit `chrome-extension/versionConfig.js` and update the version number
2. Run either of the update scripts to ensure all files are in sync

## Benefits of the New System

- Single source of truth eliminates version inconsistencies
- Automatic validation checks when manifest version doesn't match config version
- Simplified version updates through automation
- Better debugging with clear version information in logs

## Files Using the Centralized Version

The following files now use the centralized version:

- `background.js` - Imports version from config and uses it for logging and message responses
- `dualStorageSync.js` - Uses version for logging and storage operations
- All other modules that previously had hard-coded versions

## Important Notes

- Always update version through the provided scripts
- Never hard-code version strings in new code - always import from `versionConfig.js`
- When adding new files that need version information, follow the import pattern shown above