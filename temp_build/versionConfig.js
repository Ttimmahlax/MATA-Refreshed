/**
 * MATA Extension Version Configuration (Simplified)
 * 
 * This is the central configuration file for the extension version.
 * Update only this file when changing the version number.
 */

// The single source of truth for the extension version
const EXTENSION_VERSION = '1.6.5';

// Check if we're in a browser, service worker, or Node.js environment
if (typeof self !== 'undefined') {
  // Browser or Service Worker environment
  try {
    self.EXTENSION_VERSION = EXTENSION_VERSION;
  } catch (e) {
    console.error('Error setting EXTENSION_VERSION on global object:', e);
  }
} else if (typeof window !== 'undefined') {
  // Browser environment (fallback): set the version on the window object
  try {
    window.EXTENSION_VERSION = EXTENSION_VERSION;
  } catch (e) {
    console.error('Error setting window.EXTENSION_VERSION:', e);
  }
} else {
  // Node.js environment: no need to set window/self property
  console.log(`MATA Extension Version: ${EXTENSION_VERSION}`);
}

// For module imports
export { EXTENSION_VERSION };
export default EXTENSION_VERSION;