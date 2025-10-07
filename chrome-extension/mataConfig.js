/**
 * MATA Extension Configuration
 * 
 * Central configuration file for MATA browser extension
 * Uses version from versionConfig.js
 */

// Access the version from the global scope (already set by versionConfig.browser.js which is imported by the background service worker)
// Note: In service worker context, we can't use ES modules, so we're using the global variable
// The variable is already defined in versionConfig.browser.js so we don't redeclare it here

/**
 * Get the current extension version
 * @returns {string} The extension version
 */
function getExtensionVersion() {
  // Access from the global scope since we're not declaring the constant locally
  return self.EXTENSION_VERSION || '1.7.5';
}

// Export functions to global scope since we can't use ES modules in service workers
self.getExtensionVersion = getExtensionVersion;

// All possible domains where the MATA web app might be running
const ALL_MATA_DOMAINS = [
  "https://*.replit.app/*", // Replit hosting domains
  "http://*.replit.app/*",  
  "https://*.vercel.app/*", // Vercel hosting domains
  "http://*.vercel.app/*",
  "https://*.netlify.app/*", // Netlify hosting domains
  "http://*.netlify.app/*",
  "https://mata-app.com/*",  // Potential production domains
  "https://app.mata-app.com/*",
  "http://localhost:*/*"     // Local development
];

// Primary MATA web app URL - the default app to open (use any repl domain)
const PRIMARY_MATA_WEB_APP_URL = "https://mata-wallet.replit.app/";

/**
 * Find all tabs that might be running the MATA web app
 * @returns {Promise<chrome.tabs.Tab[]>} Promise that resolves to an array of tabs
 */
async function findMataTabs() {
  return new Promise((resolve) => {
    chrome.tabs.query({
      url: ALL_MATA_DOMAINS
    }, (tabs) => {
      console.log(`[MATA Config] Found ${tabs.length} MATA web app tabs`);
      resolve(tabs);
    });
  });
}

/**
 * Open the MATA web app in a new tab or focus an existing tab if it's already open
 * @returns {Promise<chrome.tabs.Tab>} Promise that resolves to the tab object
 */
async function openMataWebApp() {
  try {
    // First check if we already have a tab open
    const existingTabs = await findMataTabs();
    
    if (existingTabs.length > 0) {
      // Focus the first existing tab
      await chrome.tabs.update(existingTabs[0].id, { active: true });
      return existingTabs[0];
    } else {
      // Create a new tab
      return new Promise((resolve) => {
        chrome.tabs.create({ url: PRIMARY_MATA_WEB_APP_URL }, (tab) => {
          resolve(tab);
        });
      });
    }
  } catch (error) {
    console.error('[MATA Config] Error opening MATA web app:', error);
    // Fall back to just creating a new tab
    return new Promise((resolve) => {
      chrome.tabs.create({ url: PRIMARY_MATA_WEB_APP_URL }, (tab) => {
        resolve(tab);
      });
    });
  }
}

// Export all functions and constants to global scope for service worker access
self.ALL_MATA_DOMAINS = ALL_MATA_DOMAINS;
self.PRIMARY_MATA_WEB_APP_URL = PRIMARY_MATA_WEB_APP_URL;
self.findMataTabs = findMataTabs;
self.openMataWebApp = openMataWebApp;