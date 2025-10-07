#!/bin/bash
#
# MATA Extension Version Update Script
#
# This script updates the version number in all necessary files.
# Run this script whenever you need to update the extension version.
#

# Check if a version argument was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <new_version>"
  echo "Example: $0 1.5.68"
  exit 1
fi

NEW_VERSION="$1"
echo "Updating extension version to $NEW_VERSION..."

# 1. Update the central version config file
cat > ./chrome-extension/versionConfig.js << EOF
/**
 * MATA Extension Version Configuration
 * 
 * This is the central configuration file for the extension version.
 * Update only this file when changing the version number.
 */

// The single source of truth for the extension version
export const EXTENSION_VERSION = '$NEW_VERSION';

// Export as both named and default export for maximum compatibility
export default EXTENSION_VERSION;
EOF

echo "✅ Updated versionConfig.js to version $NEW_VERSION"

# 2. Update the manifest.json file
# First, read the manifest file
MANIFEST_PATH="./chrome-extension/manifest.json"
if [ -f "$MANIFEST_PATH" ]; then
  # Use jq if available for proper JSON manipulation
  if command -v jq >/dev/null 2>&1; then
    jq ".version = \"$NEW_VERSION\"" "$MANIFEST_PATH" > "$MANIFEST_PATH.tmp" && mv "$MANIFEST_PATH.tmp" "$MANIFEST_PATH"
    echo "✅ Updated manifest.json to version $NEW_VERSION using jq"
  else
    # Use sed as a fallback (less reliable for JSON)
    sed -i "s/\"version\": \"[0-9]*\.[0-9]*\.[0-9]*\"/\"version\": \"$NEW_VERSION\"/" "$MANIFEST_PATH"
    echo "✅ Updated manifest.json to version $NEW_VERSION using sed"
  fi
else
  echo "❌ manifest.json not found at $MANIFEST_PATH"
fi

# 3. Update version comments in sharedBackupHandler.js
BACKUP_HANDLER_PATH="./chrome-extension/sharedBackupHandler.js"
if [ -f "$BACKUP_HANDLER_PATH" ]; then
  sed -i "s/Version: [0-9]*\.[0-9]*\.[0-9]*/Version: $NEW_VERSION/" "$BACKUP_HANDLER_PATH"
  echo "✅ Updated version comment in sharedBackupHandler.js"
else
  echo "❌ sharedBackupHandler.js not found at $BACKUP_HANDLER_PATH"
fi

# 4. Update version comments in storageBackup.js
STORAGE_BACKUP_PATH="./chrome-extension/storageBackup.js"
if [ -f "$STORAGE_BACKUP_PATH" ]; then
  sed -i "s/Version: [0-9]*\.[0-9]*\.[0-9]*/Version: $NEW_VERSION/" "$STORAGE_BACKUP_PATH"
  echo "✅ Updated version comment in storageBackup.js"
else
  echo "❌ storageBackup.js not found at $STORAGE_BACKUP_PATH"
fi

echo ""
echo "Version update complete! The extension is now at version $NEW_VERSION."
echo "Make sure to rebuild the extension and reload it in Chrome to apply the changes."