# Extension Version Update Process

This document outlines the steps needed to update the MATA extension version.

## Step 1: Update the Version in Configuration Files

1. Open `server/extensionConfig.js` and update the `EXTENSION_VERSION` constant:
   ```javascript
   export const EXTENSION_VERSION = "1.5.67"; // Update to new version
   ```

2. Open `client/src/lib/extensionConfig.ts` and make the same update:
   ```typescript
   export const EXTENSION_VERSION = "1.5.67"; // Update to new version
   ```

3. Update the central version config for the extension:
   ```javascript
   // In chrome-extension/versionConfig.js
   export const EXTENSION_VERSION = '1.5.67';
   ```

## Step 2: Update Extension Files

Run the update script to automatically update all version references in extension files:

```bash
node update-extension-version.js
```

This will update:
- `chrome-extension/manifest.json`
- `chrome-extension/background.js`
- `chrome-extension/popup/popup.js`

## Step 3: Build the Extension

Build the extension with the new version:

```bash
node build-extension.js
```

This will create a new ZIP file in the `public` directory with the new version number.

## Step 4: Verify the Update

1. Check that the ZIP file was created correctly:
   ```bash
   ls -la public/
   ```

2. Test that the server is serving the new version:
   ```bash
   curl -I http://localhost:5000/mata-extension-fixed-v1.5.67.zip
   ```

## Step 5: Update Old Version Redirects (Optional)

If you need to support redirecting old extension version requests to the new version, update the route handlers in `server/routes.ts` as needed.

## Step 6: Commit Changes and Deploy

Commit all your changes and deploy the updated application.