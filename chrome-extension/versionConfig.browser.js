/**
 * MATA Extension Version Configuration (Browser Version)
 * 
 * This is a non-module version of versionConfig.js for direct inclusion in HTML.
 * It has no export statements and directly sets the global variable.
 * Modified to work in both regular browser context and service worker context.
 */

// The single source of truth for the extension version
const EXTENSION_VERSION = '1.7.5';

// Set the version on the appropriate global object based on context
// Service workers use 'self' instead of 'window'
(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this)).EXTENSION_VERSION = EXTENSION_VERSION;