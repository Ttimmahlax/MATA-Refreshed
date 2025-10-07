# MATA Chrome Extension Management Guide

## Overview
The MATA Chrome Extension provides secure data synchronization between the browser and web application. This guide explains how to maintain and update the extension.

## Extension Structure
- Source code is located in: `./chrome-extension/`
- The downloadable ZIP file is at: `./public/mata-extension-fixed-v1.6.0.zip`
- Extension version: 1.6.0

## Keeping the ZIP File Updated
Whenever changes are made to the extension source code, follow these steps to ensure the ZIP file is updated:

1. Make your changes to the extension files in the source directory
2. Run the build script to update the ZIP file:
   ```
   ./build-extension.sh
   ```
3. Test the updated extension by downloading and installing it

## Automatic Updates
The build script (`build-extension.sh`) does the following:
- Creates a temporary working directory
- Copies all extension files from the source directory
- Creates a ZIP archive from these files
- Moves the ZIP to the correct location in the public folder
- Cleans up temporary files

## Important Guidelines
1. Always update the ZIP file after making changes to the extension code
2. Keep version numbers consistent across manifest.json and the ZIP filename
3. Test the extension thoroughly after any changes

## Debugging Extension Issues
- Add `?extension_debug=true` to any URL to show the extension debug banner
- Check the browser console for extension-related logs
- Manually extract and inspect the ZIP file to verify its contents

## Key Export and Import Guidelines
The extension supports key export functionality:

1. **Export Keys**: Users can export their entire vault data to a secure, encrypted ZIP file
   - Access through the Settings tab in the extension popup
   - The export includes all user keys, passwords, accounts, and contacts
   - The file is compatible with the web app's import functionality

2. **Import Keys**: For security and consistency reasons, key imports are only available through the web application
   - Users should be directed to use the web app for importing their backed-up keys
   - This ensures proper validation and consistent key restoration

## Shared Backup Handler
The extension uses a unified backup/restore system shared with the web application:

- **sharedBackupHandler.js**: Central utility for consistent backup operations
  - Used by both the Chrome extension and web application
  - Ensures backward and forward compatibility of backup formats
  - Performs intelligent data categorization and restoration
  - Handles different storage formats seamlessly

Key functions:
- `createBackupZip()`: Creates consistent backup archive with categorized data
- `processBackupZip()`: Extracts and validates backup data for restoration
- `categorizeStorageData()`: Organizes data into logical groups for better recovery

## Security Considerations
- The extension handles sensitive user data and encryption keys
- Always maintain proper isolation between users
- Test for potential cross-user access issues
- Backup files contain sensitive data and should be stored securely