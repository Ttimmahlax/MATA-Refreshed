/**
 * Extension Configuration
 * 
 * This file centralizes all extension-related constants and configuration
 * for the server side to make version updates and other changes simpler
 * and more consistent.
 * 
 * This is the JavaScript version for ESM imports from non-TypeScript files
 */

// Define the version here to avoid import issues
// This must match the version in ../chrome-extension/versionConfig.js
const EXTENSION_VERSION = '1.7.5';

// Extension download filename
export const EXTENSION_FILENAME = `mata-extension-fixed-v${EXTENSION_VERSION}.zip`;

// Extension download URL path
export const EXTENSION_DOWNLOAD_URL = `/${EXTENSION_FILENAME}`;

// Function to get the file path for the current version
export function getExtensionFilePath() {
  return `public/${EXTENSION_FILENAME}`;
}

// Function to get extension version with 'v' prefix
export function getExtensionVersionString() {
  return `v${EXTENSION_VERSION}`;
}