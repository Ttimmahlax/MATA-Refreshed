/**
 * Extension Configuration
 * 
 * This file centralizes all extension-related constants and configuration
 * for the server side to make version updates and other changes simpler
 * and more consistent.
 */

// The current extension version - KEEP IN SYNC WITH chrome-extension/versionConfig.js
export const EXTENSION_VERSION = "1.7.5";

// Extension download filename
export const EXTENSION_FILENAME = `mata-extension-fixed-v${EXTENSION_VERSION}.zip`;

// Extension download URL path
export const EXTENSION_DOWNLOAD_URL = `/${EXTENSION_FILENAME}`;

// Function to get the file path for the current version
export function getExtensionFilePath(): string {
  return `public/${EXTENSION_FILENAME}`;
}

// Function to get extension version with 'v' prefix
export function getExtensionVersionString(): string {
  return `v${EXTENSION_VERSION}`;
}