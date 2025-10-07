/**
 * MATA Extension - Background Script
 * This script handles background processing and message passing for the MATA extension
 * 
 * Version: Set in versionConfig.browser.js which is imported below
 */

// Import version configuration
self.importScripts('versionConfig.browser.js');
// Import email utilities
self.importScripts('emailUtils.js');
// Import MATA configuration
self.importScripts('mataConfig.js');

// Initialize global state
const state = {
  initialized: false,
  userEmail: null,
  lastSyncTime: null
};

// Log with metadata for easier debugging
function log(message, data = null) {
  const timestamp = new Date().toISOString();
  const version = self.EXTENSION_VERSION || 'unknown';
  
  console.log(`[MATA v${version}] [${timestamp}] ${message}`, data || '');
}

// Log errors with metadata
function logError(message, error = null) {
  const timestamp = new Date().toISOString();
  const version = self.EXTENSION_VERSION || 'unknown';
  
  console.error(`[MATA v${version}] [ERROR ${timestamp}] ${message}`, error || '');
}

/**
 * Sanitize an email address for use as a storage key
 * Replaces @ and . characters with underscores for consistent key format
 * @param {string} email - The email address to sanitize
 * @returns {string} - The sanitized email
 */
function sanitizeEmail(email) {
  if (!email) return '';
  return email.replace(/[@.]/g, '_');
}

/**
 * Get all active MATA tabs based on common URL patterns
 * @returns {Promise<chrome.tabs.Tab[]>} Array of active MATA tabs
 */
async function getMataTabs() {
  try {
    // First try with specific URL patterns
    const tabs = await chrome.tabs.query({
      url: [
        "*://*.replit.app/*",
        "*://*.replit.dev/*", 
        "*://*.repl.co/*",
        "http://localhost/*", 
        "https://localhost/*"
      ]
    });
    
    if (tabs && tabs.length > 0) {
      log('Found MATA tabs using URL patterns:', tabs.length);
      return tabs;
    }
    
    // If no tabs found with URL patterns, try using active tab
    log('No MATA tabs found using URL patterns, trying active tab as fallback');
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (activeTabs && activeTabs.length > 0) {
      log('Using active tab as fallback:', activeTabs[0].url);
      return activeTabs;
    }
    
    // Last resort: get all tabs
    log('No active tabs found, getting all tabs as last resort');
    return chrome.tabs.query({});
  } catch (error) {
    logError('Error in getMataTabs', error);
    // Return empty array instead of throwing to avoid breaking callers
    return [];
  }
}

// Set up a wake lock to keep the service worker alive
let keepAliveIntervalId = null;

// Function to start the keep-alive mechanism
function startKeepAlive() {
  // Clear any existing interval
  if (keepAliveIntervalId) {
    clearInterval(keepAliveIntervalId);
  }
  
  // Keep the service worker alive with an internal heartbeat
  keepAliveIntervalId = setInterval(() => {
    log('Internal heartbeat to keep service worker alive');
    // Store timestamp to track service worker uptime
    chrome.storage.local.set({ 'mata_service_worker_heartbeat': Date.now() });
    
    // Try to find MATA tabs and refresh connection if needed
    getMataTabs().then(tabs => {
      if (tabs.length > 0) {
        log(`Found ${tabs.length} MATA tabs, sending ping to maintain connection`);
      }
    }).catch(err => {
      log('Error finding tabs in heartbeat:', err.message);
    });
  }, 20000); // Every 20 seconds
  
  log('Started keep-alive mechanism with interval ID:', keepAliveIntervalId);
}

// Start keep-alive immediately
startKeepAlive();

// Handler for messages from popup or content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Log incoming messages
  log('Received message:', { type: message.type, sender: sender.id || 'unknown' });
  
  // Handle different message types
  switch (message.type) {
    // Heartbeat message to keep service worker alive
    case 'HEARTBEAT':
      // Record when we last received a heartbeat
      const timestamp = Date.now();
      chrome.storage.local.set({ 'mata_last_heartbeat': timestamp });
      
      // Restart keep-alive if it stopped
      if (!keepAliveIntervalId) {
        startKeepAlive();
      }
      
      // Send immediate response to keep the connection active
      sendResponse({ 
        success: true, 
        timestamp: timestamp,
        serviceWorkerStatus: 'active',
        version: self.EXTENSION_VERSION || 'unknown'
      });
      break;
      
    // Get a value from localStorage via content script
    case 'GET_LOCAL_STORAGE_VALUE':
      handleGetLocalStorageValue(message, sendResponse);
      break;
      
    // Update localStorage via content script
    case 'SET_LOCAL_STORAGE_VALUE':
      handleSetLocalStorageValue(message, sendResponse);
      break;
      
    // Test storage functionality
    case 'TEST_STORAGE':
      handleTestStorage(message, sendResponse);
      break;
      
    // Sync storage between localStorage and chrome.storage
    case 'SYNC_STORAGE':
      handleSyncStorage(message, sendResponse);
      break;
      
    // Sync critical encryption files (mata_active_user, mata_salt_*, mata_keys_*)
    case 'SYNC_CRITICAL_FILES':
      handleSyncCriticalFiles(message, sendResponse);
      break;
      
    // Get dashboard data for the popup
    case 'GET_DASHBOARD_DATA':
      handleGetDashboardData(message, sendResponse);
      break;
      
    // Get user-specific data from storage
    case 'GET_USER_DATA':
      handleGetUserData(message, sendResponse);
      break;
      
    // Save user-specific data to storage
    case 'SAVE_USER_DATA':
      handleSaveUserData(message, sendResponse);
      break;
      
    // Get user settings
    case 'GET_SETTINGS':
      handleGetSettings(message, sendResponse);
      break;
      
    // Save user settings
    case 'SAVE_SETTINGS':
      handleSaveSettings(message, sendResponse);
      break;
      
    // List all accounts
    case 'LIST_ACCOUNTS':
      handleListAccounts(message, sendResponse);
      break;

    // Find MATA web app tabs
    case 'FIND_MATA_TABS':
      handleFindMataTabs(message, sendResponse);
      break;
      
    // Find all user emails in storage
    case 'FIND_ALL_USERS':
      handleFindAllUsers(message, sendResponse);
      break;
      
    // Handle IndexedDB backup
    case 'BACKUP_INDEXEDDB':
      handleBackupIndexedDB(message, sendResponse);
      break;
    
    // Handle retrieving a previously created IndexedDB backup
    case 'GET_INDEXEDDB_BACKUP':
      handleGetIndexedDBBackup(message, sendResponse);
      break;
      
    // Handle extension verification check
    case 'CHECK_EXTENSION':
      handleCheckExtension(message, sendResponse);
      break;
      
    // Handle storing encryption keys
    case 'STORE_KEYS':
      handleStoreKeys(message, sendResponse);
      break;
      
    // Get encryption keys for a user (used by client code)
    case 'GET_KEYS':
      handleGetKeys(message, sendResponse);
      break;
      
    // Handle password requests (now managed by web application)
    case 'GET_PASSWORDS':
      handleGetPasswords(message, sendResponse);
      break;
      
    // Unknown message type
    default:
      logError(`Unknown message type: ${message.type}`);
      sendResponse({ 
        success: false, 
        error: `Unknown message type: ${message.type}` 
      });
      break;
  }
  
  // Return true to indicate we'll respond asynchronously
  return true;
});

// Get a value from localStorage via content script
async function handleGetLocalStorageValue(message, sendResponse) {
  try {
    // Check if we have a valid key
    if (!message.key) {
      // Instead of throwing an error, provide a more graceful response
      log('No key provided in getMessage, using all keys');
      // Return all available localStorage items instead
      sendResponse({
        success: true,
        value: null,
        message: 'No specific key requested',
        timestamp: Date.now()
      });
      return;
    }
    
    // Determine if this is a critical key (used for encryption or user identity)
    const isCriticalKey = message.key === 'mata_active_user' || 
                          message.key.startsWith('mata_salt_') || 
                          message.key.startsWith('mata_keys_');
    
    // Log what we're doing with timestamps for better debugging
    log(`Getting value for key: ${message.key} (critical: ${isCriticalKey ? 'yes' : 'no'}, timestamp: ${new Date().toISOString()})`);
    
    // APPROACH 1: STORAGE-FIRST - try to get from chrome.storage.local first
    if (isCriticalKey) {
      log(`STORAGE-FIRST APPROACH: Checking chrome.storage.local first for ${message.key}`);
      
      try {
        // Wait for chrome.storage.local result with a promise
        const storageData = await new Promise((resolve) => {
          const timeout = setTimeout(() => {
            log(`Storage lookup timed out for ${message.key}`);
            resolve(null); // Resolve with null on timeout
          }, 1000); // 1 second timeout
          
          chrome.storage.local.get(message.key, (result) => {
            clearTimeout(timeout);
            resolve(result);
          });
        });
        
        // If we found the value in chrome.storage.local, return it immediately
        if (storageData && storageData[message.key] !== undefined) {
          const value = storageData[message.key];
          log(`Found value for ${message.key} in chrome.storage.local:`, value ? 'data exists' : 'null/undefined');
          
          // For critical data, convert object to string if needed since localStorage stores strings
          const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
          
          // Respond with success from chrome.storage
          sendResponse({
            success: true,
            value: stringValue,
            source: 'chrome.storage_primary',
            timestamp: Date.now()
          });
          
          // Even though we're returning from chrome.storage, try to update 
          // our stored value in the background to keep it fresh
          setTimeout(() => {
            refreshFromLocalStorage(message.key);
          }, 50);
          
          return true;
        }
        
        log(`${message.key} not found in chrome.storage.local, continuing to try localStorage`);
      } catch (storageError) {
        logError(`Error accessing chrome.storage for ${message.key}`, storageError);
        // Continue to localStorage approach on error
      }
    }
    
    // APPROACH 2: Try localStorage via content script with retry and timeout
    try {
      log(`APPROACH 2: Attempting to get ${message.key} from localStorage via content script`);
      await tryGetFromLocalStorage();
      return true; // Indicate we'll respond asynchronously
    } catch (localStorageError) {
      log(`Failed to get ${message.key} from localStorage:`, localStorageError.message);
      
      // For critical keys, try one last fallback to chrome.storage
      if (isCriticalKey) {
        log(`Final fallback: Checking chrome.storage.local again for ${message.key}`);
        chrome.storage.local.get(message.key, (result) => {
          if (result && result[message.key] !== undefined) {
            const value = result[message.key];
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
            
            sendResponse({
              success: true,
              value: stringValue,
              source: 'chrome.storage_last_resort',
              timestamp: Date.now(),
              error: localStorageError.message
            });
          } else {
            sendResponse({
              success: false,
              error: `All storage methods failed: ${localStorageError.message}`,
              timestamp: Date.now()
            });
          }
        });
        return true;
      }
      
      // For non-critical keys, just return the error
      sendResponse({
        success: false,
        error: localStorageError.message,
        timestamp: Date.now()
      });
      return true;
    }
    
    // Helper function to try getting the value from localStorage via content script
    async function tryGetFromLocalStorage() {
      // Get active MATA tabs using our helper function
      const tabs = await getMataTabs();
      
      if (tabs.length === 0) {
        // No MATA tabs open, throw an error to trigger fallback mechanisms
        throw new Error('No MATA web app tabs open to access localStorage');
      }
      
      // Set up a timeout promise for the content script request
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Content script request timed out after 2000ms'));
        }, 2000); // 2 second timeout
      });
      
      // Set up the content script message promise
      const messagePromise = new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getLocalStorage', key: message.key },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Tab communication error: ${chrome.runtime.lastError.message}`));
              return;
            }
            
            if (!response) {
              reject(new Error('No response from content script'));
              return;
            }
            
            if (!response.success) {
              reject(new Error(`Content script error: ${response.error || 'Unknown error'}`));
              return;
            }
            
            resolve(response);
          }
        );
      });
      
      // Race the message promise against the timeout
      const response = await Promise.race([messagePromise, timeoutPromise]);
      
      // If we got here, we have a successful response
      log(`Retrieved ${message.key} from localStorage successfully`);
      
      // Save to chrome.storage.local for critical keys to improve future access
      if (isCriticalKey && response.value) {
        try {
          // Try to parse the value if it's JSON
          let parsedValue = response.value;
          try {
            parsedValue = JSON.parse(response.value);
          } catch (e) {
            // Not JSON, use as is
          }
          
          log(`Saving ${message.key} to chrome.storage.local with fresh data`);
          chrome.storage.local.set({ 
            [message.key]: parsedValue,
            [`${message.key}_updated`]: Date.now() // Add timestamp to track when updated
          });
        } catch (e) {
          // Non-critical error, continue anyway
          log(`Error parsing or saving ${message.key} to chrome.storage:`, e.message);
        }
      }
      
      // Send the localStorage value
      sendResponse({
        success: true,
        value: response.value,
        source: 'localStorage',
        timestamp: Date.now()
      });
    }
  } catch (error) {
    logError('Critical error in handleGetLocalStorageValue', error);
    
    // For critical keys, try one more time with chrome.storage as last resort
    if (isCriticalKey) {
      try {
        log(`Critical error occurred, trying chrome.storage one last time for ${message.key}`);
        chrome.storage.local.get(message.key, (result) => {
          if (result && result[message.key] !== undefined) {
            const value = result[message.key];
            const stringValue = typeof value === 'object' ? JSON.stringify(value) : value;
            
            sendResponse({
              success: true,
              value: stringValue,
              source: 'chrome.storage_emergency',
              timestamp: Date.now(),
              criticalError: true
            });
          } else {
            sendResponse({ 
              success: false, 
              error: `Critical error: ${error.message}`,
              fallbackAttempted: true,
              timestamp: Date.now()
            });
          }
        });
        return true;
      } catch (finalError) {
        logError('Final emergency recovery attempt failed', finalError);
      }
    }
    
    // Ultimate fallback response
    sendResponse({ 
      success: false, 
      error: `Unrecoverable error: ${error.message}`,
      timestamp: Date.now()
    });
    return true;
  }
}

/**
 * Helper function to refresh critical data from localStorage in the background
 * This helps keep chrome.storage data fresh even when responding from cache
 */
async function refreshFromLocalStorage(key) {
  try {
    log(`Background refresh started for ${key}`);
    const tabs = await getMataTabs();
    
    if (tabs.length === 0) {
      log(`Background refresh failed for ${key}: No MATA tabs available`);
      return;
    }
    
    // Set up a timeout for the content script request
    const timeoutId = setTimeout(() => {
      log(`Background refresh timed out for ${key}`);
    }, 1500);
    
    chrome.tabs.sendMessage(
      tabs[0].id,
      { action: 'getLocalStorage', key: key },
      (response) => {
        clearTimeout(timeoutId);
        
        if (chrome.runtime.lastError) {
          log(`Background refresh failed for ${key}: ${chrome.runtime.lastError.message}`);
          return;
        }
        
        if (!response || !response.success) {
          log(`Background refresh failed for ${key}: ${response?.error || 'Unknown error'}`);
          return;
        }
        
        // We got a value, update chrome.storage
        if (response.value) {
          try {
            // Try to parse the value if it's JSON
            let parsedValue = response.value;
            try {
              parsedValue = JSON.parse(response.value);
            } catch (e) {
              // Not JSON, use as is
            }
            
            log(`Background refresh: Updating ${key} in chrome.storage.local with fresh data`);
            chrome.storage.local.set({ 
              [key]: parsedValue,
              [`${key}_updated`]: Date.now()
            });
          } catch (e) {
            log(`Error in background refresh for ${key}:`, e.message);
          }
        } else {
          log(`Background refresh for ${key}: No value found in localStorage`);
        }
      }
    );
  } catch (error) {
    log(`Background refresh failed for ${key}:`, error.message);
  }
}

// Set a value in localStorage via content script
async function handleSetLocalStorageValue(message, sendResponse) {
  try {
    // Check if we have valid data
    if (!message.key) {
      throw new Error('No key provided');
    }
    
    // For critical keys, always update chrome.storage.local regardless of tab status
    const isCriticalKey = message.key === 'mata_active_user' || 
                         message.key.startsWith('mata_salt_') || 
                         message.key.startsWith('mata_keys_');
    
    if (isCriticalKey) {
      log(`Updating critical key in chrome.storage.local: ${message.key}`);
      try {
        // Try to parse the value if it's JSON
        let parsedValue = message.value;
        try {
          parsedValue = JSON.parse(message.value);
        } catch (e) {
          // Not JSON, use as is
        }
        
        chrome.storage.local.set({ [message.key]: parsedValue }, () => {
          if (chrome.runtime.lastError) {
            logError(`Error saving to chrome.storage: ${chrome.runtime.lastError.message}`);
            // Continue anyway since this is just a backup
          } else {
            log(`Successfully saved ${message.key} to chrome.storage.local`);
          }
        });
      } catch (e) {
        // Non-critical error, continue anyway
        log(`Error parsing or saving ${message.key} to chrome.storage:`, e.message);
      }
    }
    
    // Get active MATA tabs using our helper function
    const tabs = await getMataTabs();
    
    if (tabs.length === 0) {
      // No MATA tabs open to set localStorage
      log('No MATA web app tabs open to access localStorage');
      
      // For critical keys, we can still return success if we saved to chrome.storage
      if (isCriticalKey) {
        log(`No tabs available, but saved critical key ${message.key} to chrome.storage.local`);
        sendResponse({
          success: true,
          source: 'chrome.storage_only',
          warning: 'Value only saved to chrome.storage.local, not to localStorage'
        });
        return;
      }
      
      // For non-critical keys, return failure
      sendResponse({
        success: false,
        error: 'No MATA web app tabs open to access localStorage'
      });
      return;
    }
    
    // Send a content script message to set the localStorage value
    chrome.tabs.sendMessage(
      tabs[0].id,
      { 
        action: 'setLocalStorage', 
        key: message.key,
        value: message.value
      },
      (response) => {
        if (chrome.runtime.lastError) {
          logError('Error setting localStorage value', chrome.runtime.lastError);
          
          // For critical keys, we might have saved to chrome.storage.local
          if (isCriticalKey) {
            log(`Tab communication failed, but critical key ${message.key} was saved to chrome.storage.local`);
            sendResponse({
              success: true,
              source: 'chrome.storage_only',
              warning: 'Value only saved to chrome.storage.local, not to localStorage',
              error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error'
            });
            return;
          }
          
          sendResponse({ 
            success: false, 
            error: chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error'
          });
          return;
        }
        
        if (response && response.success) {
          log(`Set localStorage value for key: ${message.key}`);
          sendResponse({
            success: true,
            source: isCriticalKey ? 'both' : 'localStorage'
          });
        } else {
          logError(`Failed to set localStorage value for key: ${message.key}`);
          
          // For critical keys, we might have saved to chrome.storage.local
          if (isCriticalKey) {
            log(`localStorage update failed, but critical key ${message.key} was saved to chrome.storage.local`);
            sendResponse({
              success: true,
              source: 'chrome.storage_only',
              warning: 'Value only saved to chrome.storage.local, not to localStorage',
              error: response ? response.error : 'Unknown error'
            });
            return;
          }
          
          sendResponse({
            success: false,
            error: response ? response.error : 'Unknown error'
          });
        }
      }
    );
  } catch (error) {
    logError('Error in handleSetLocalStorageValue', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Test storage functionality
async function handleTestStorage(message, sendResponse) {
  try {
    log('Running storage test');
    
    // Parse the test data from the message
    const testData = message.testData ? JSON.parse(message.testData) : {
      text: 'Test data generated in background script',
      timestamp: Date.now()
    };
    
    // Generate a unique test key
    const testKey = `mata_extension_test_${Date.now()}`;
    
    // Store in chrome.storage.local
    chrome.storage.local.set({ [testKey]: testData }, () => {
      if (chrome.runtime.lastError) {
        throw new Error(`Error storing in chrome.storage: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error'}`);
      }
      
      // Read from chrome.storage.local to verify
      chrome.storage.local.get(testKey, (result) => {
        if (chrome.runtime.lastError) {
          throw new Error(`Error retrieving from chrome.storage: ${chrome.runtime.lastError ? chrome.runtime.lastError.message : 'Unknown error'}`);
        }
        
        const retrievedData = result[testKey];
        
        if (!retrievedData) {
          throw new Error('Test data not found in chrome.storage.local');
        }
        
        // Clean up the test data
        chrome.storage.local.remove(testKey, () => {
          log('Test data cleanup complete');
        });
        
        log('Storage test successful', retrievedData);
        
        // Send success response
        sendResponse({
          success: true,
          message: 'Storage test completed successfully',
          data: retrievedData
        });
      });
    });
  } catch (error) {
    logError('Storage test failed', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Sync storage between localStorage and chrome.storage
/**
 * Handle storage synchronization between localStorage and chrome.storage.local
 * This ensures both storage systems have the same critical encryption and user data
 */
async function handleSyncStorage(message, sendResponse) {
  try {
    const syncStartTime = Date.now();
    log(`Starting storage sync... (timestamp: ${new Date(syncStartTime).toISOString()})`);
    
    // APPROACH 1: Try to get all users from chrome.storage first
    // This allows us to know which users we need to sync even if there's no active user
    log('APPROACH 1: Getting all existing users from chrome.storage');
    
    let existingUsers = [];
    try {
      // Get all keys from chrome.storage that might contain user data
      const allStorageData = await new Promise((resolve) => {
        chrome.storage.local.get(null, (result) => {
          resolve(result || {});
        });
      });
      
      // Find all keys that match the pattern mata_keys_* or mata_salt_*
      const userKeyPattern = /^mata_(keys|salt)_(.+)$/;
      
      // Extract user identifiers from all matching keys
      Object.keys(allStorageData).forEach(key => {
        const match = key.match(userKeyPattern);
        if (match && match[2]) {
          // Found a user identifier (could be sanitized email)
          const userIdentifier = match[2];
          
          // Only add if not already in the list
          if (!existingUsers.includes(userIdentifier)) {
            existingUsers.push(userIdentifier);
          }
        }
      });
      
      if (existingUsers.length > 0) {
        log(`Found ${existingUsers.length} existing users in chrome.storage: ${existingUsers.join(', ')}`);
      } else {
        log('No existing users found in chrome.storage');
      }
    } catch (storageError) {
      logError('Error accessing chrome.storage during sync', storageError);
      // Continue with sync attempt even if this fails
    }
    
    // APPROACH 2: Get active user and all users from localStorage
    log('APPROACH 2: Getting active user and all users from localStorage');
    
    // Get MATA tabs to access localStorage with a timeout
    const getTabsPromise = getMataTabs();
    const tabsTimeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Timeout getting MATA tabs for sync')), 2000);
    });
    
    let tabs;
    try {
      tabs = await Promise.race([getTabsPromise, tabsTimeoutPromise]);
    } catch (tabsError) {
      logError('Failed to get MATA tabs for sync', tabsError);
      
      // Even if we can't get tabs, try to sync based on existing users from chrome.storage
      if (existingUsers.length > 0) {
        log(`Can't access localStorage but we have ${existingUsers.length} known users, retrieving their data`);
        
        // Respond with partial success
        sendResponse({
          success: true,
          syncedCount: 0,
          partialSync: true,
          existingUsers: existingUsers.length,
          message: `No MATA web app tabs available, but identified ${existingUsers.length} existing users`,
          duration: Date.now() - syncStartTime
        });
        return true;
      }
      
      // No tabs and no existing users, we can't do any sync
      sendResponse({
        success: false,
        error: `No MATA web app tabs available: ${tabsError.message}`,
        duration: Date.now() - syncStartTime
      });
      return true;
    }
    
    if (tabs.length === 0) {
      log('No MATA web app tabs found to access localStorage');
      
      // Even if we can't get tabs, try to sync based on existing users from chrome.storage
      if (existingUsers.length > 0) {
        log(`No tabs available but we have ${existingUsers.length} known users, keeping their data`);
        
        // Respond with partial success
        sendResponse({
          success: true,
          syncedCount: 0,
          partialSync: true,
          existingUsers: existingUsers.length,
          message: `No MATA web app tabs available, but ${existingUsers.length} existing users maintained in storage`,
          duration: Date.now() - syncStartTime
        });
        return true;
      }
      
      sendResponse({
        success: false,
        error: 'No MATA web app tabs available to access localStorage',
        duration: Date.now() - syncStartTime
      });
      return true;
    }
    
    // STEP 1: Get active user from localStorage with timeout
    let activeUser = null;
    let localStorageUsers = [];
    
    try {
      // Create a promise to get the active user with timeout
      const getUserPromise = new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'getLocalStorage', key: 'mata_active_user' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Error getting active user: ${chrome.runtime.lastError.message}`));
            } else if (!response || !response.success) {
              reject(new Error('Failed to get active user from localStorage'));
            } else {
              resolve(response.value);
            }
          }
        );
      });
      
      const userTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout getting active user')), 2000);
      });
      
      // Race the promises
      activeUser = await Promise.race([getUserPromise, userTimeoutPromise]);
      
      if (activeUser) {
        log(`Found active user in localStorage: ${activeUser}`);
        
        // Store in chrome.storage.local right away
        await new Promise(resolve => {
          chrome.storage.local.set({ 
            'mata_active_user': activeUser,
            'mata_active_user_updated': Date.now()
          }, resolve);
        });
        
        // Add this user to our local list if not already there
        const sanitizedActiveUser = sanitizeEmail(activeUser);
        if (!localStorageUsers.includes(sanitizedActiveUser)) {
          localStorageUsers.push(sanitizedActiveUser);
        }
      } else {
        log('No active user found in localStorage');
      }
    } catch (activeUserError) {
      logError('Failed to get active user from localStorage', activeUserError);
      // Continue sync with existing users even if active user fetch fails
    }
    
    // STEP 2: Find all user emails in localStorage via content script
    try {
      // Ask the content script to find all users in localStorage
      const findUsersPromise = new Promise((resolve, reject) => {
        chrome.tabs.sendMessage(
          tabs[0].id,
          { action: 'findAllUserEmails' },
          (response) => {
            if (chrome.runtime.lastError) {
              reject(new Error(`Error finding users: ${chrome.runtime.lastError.message}`));
            } else if (!response || !response.success) {
              reject(new Error('Failed to find user emails in localStorage'));
            } else {
              resolve(response.users || []);
            }
          }
        );
      });
      
      const findUsersTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Timeout finding users')), 3000);
      });
      
      // Race the promises
      const foundUsers = await Promise.race([findUsersPromise, findUsersTimeoutPromise]);
      
      if (foundUsers && foundUsers.length > 0) {
        log(`Found ${foundUsers.length} users in localStorage: ${foundUsers.join(', ')}`);
        
        // Add these users to our local list if not already there
        foundUsers.forEach(email => {
          const sanitizedEmail = sanitizeEmail(email);
          if (!localStorageUsers.includes(sanitizedEmail)) {
            localStorageUsers.push(sanitizedEmail);
          }
        });
      } else {
        log('No users found in localStorage');
      }
    } catch (findUsersError) {
      logError('Failed to find users in localStorage', findUsersError);
      // Continue with what we have even if user search fails
    }
    
    // STEP 3: Merge users from both storage systems for complete sync
    const allUsers = [...new Set([...existingUsers, ...localStorageUsers])];
    
    if (allUsers.length === 0) {
      log('No users found in either storage system, nothing to sync');
      sendResponse({
        success: true,
        syncedCount: 0,
        message: 'No users found to sync',
        duration: Date.now() - syncStartTime
      });
      return true;
    }
    
    log(`Preparing to sync data for ${allUsers.length} users: ${allUsers.join(', ')}`);
    
    // STEP 4: Sync each user's keys and salt
    let syncedCount = activeUser ? 1 : 0; // Start with 1 if we synced active user
    let syncErrors = 0;
    const storageObj = activeUser ? {
      'mata_active_user': activeUser,
      'mata_active_user_updated': Date.now()
    } : {};
    
    // Create an array to track sync promises
    const syncPromises = [];
    
    // Process each user
    for (const userIdentifier of allUsers) {
      // Generate the keys for this user
      const keysKey = `mata_keys_${userIdentifier}`;
      const saltKey = `mata_salt_${userIdentifier}`;
      
      // Create a sync promise for this user
      const userSyncPromise = (async () => {
        try {
          log(`Syncing data for user: ${userIdentifier}`);
          
          // Try to get keys and salt from localStorage
          let keysFromLocalStorage = null;
          let saltFromLocalStorage = null;
          
          if (tabs.length > 0) {
            // Try to get keys from localStorage with timeout
            try {
              const keysPromise = new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: 'getLocalStorage', key: keysKey },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Tab error getting keys: ${chrome.runtime.lastError.message}`));
                    } else if (!response || !response.success) {
                      resolve(null); // No error, just no keys
                    } else {
                      resolve(response.value);
                    }
                  }
                );
              });
              
              const keysTimeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(null), 2000); // Just resolve with null on timeout
              });
              
              // Race the promises
              keysFromLocalStorage = await Promise.race([keysPromise, keysTimeoutPromise]);
              
              if (keysFromLocalStorage) {
                log(`Found keys in localStorage for ${userIdentifier}`);
              }
            } catch (keysError) {
              log(`Error getting keys for ${userIdentifier}: ${keysError.message}`);
            }
            
            // Try to get salt from localStorage with timeout
            try {
              const saltPromise = new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(
                  tabs[0].id,
                  { action: 'getLocalStorage', key: saltKey },
                  (response) => {
                    if (chrome.runtime.lastError) {
                      reject(new Error(`Tab error getting salt: ${chrome.runtime.lastError.message}`));
                    } else if (!response || !response.success) {
                      resolve(null); // No error, just no salt
                    } else {
                      resolve(response.value);
                    }
                  }
                );
              });
              
              const saltTimeoutPromise = new Promise((resolve) => {
                setTimeout(() => resolve(null), 2000); // Just resolve with null on timeout
              });
              
              // Race the promises
              saltFromLocalStorage = await Promise.race([saltPromise, saltTimeoutPromise]);
              
              if (saltFromLocalStorage) {
                log(`Found salt in localStorage for ${userIdentifier}`);
              }
            } catch (saltError) {
              log(`Error getting salt for ${userIdentifier}: ${saltError.message}`);
            }
          }
          
          // Try to get keys and salt from chrome.storage
          const chromeStorageData = await new Promise(resolve => {
            chrome.storage.local.get([keysKey, saltKey], resolve);
          });
          
          const keysFromChromeStorage = chromeStorageData[keysKey];
          const saltFromChromeStorage = chromeStorageData[saltKey];
          
          // Determine which values to use (localStorage takes precedence if available)
          const finalKeys = keysFromLocalStorage || keysFromChromeStorage;
          const finalSalt = saltFromLocalStorage || saltFromChromeStorage;
          
          // Update storage object with the data we want to save
          let userSyncedItems = 0;
          
          if (finalKeys) {
            try {
              // Parse the keys if they're a JSON string
              const parsedKeys = typeof finalKeys === 'string' ? 
                JSON.parse(finalKeys) : finalKeys;
                
              storageObj[keysKey] = parsedKeys;
              storageObj[`${keysKey}_updated`] = Date.now();
              userSyncedItems++;
            } catch (e) {
              log(`Error parsing keys for ${userIdentifier}: ${e.message}`);
              syncErrors++;
            }
          }
          
          if (finalSalt) {
            try {
              // Parse the salt if it's a JSON string
              const parsedSalt = typeof finalSalt === 'string' && 
                finalSalt.startsWith('{') ? 
                JSON.parse(finalSalt) : finalSalt;
                
              storageObj[saltKey] = parsedSalt;
              storageObj[`${saltKey}_updated`] = Date.now();
              userSyncedItems++;
            } catch (e) {
              log(`Error parsing salt for ${userIdentifier}: ${e.message}`);
              syncErrors++;
            }
          }
          
          syncedCount += userSyncedItems;
          return { userIdentifier, itemsSynced: userSyncedItems };
        } catch (userSyncError) {
          logError(`Failed to sync user ${userIdentifier}`, userSyncError);
          syncErrors++;
          return { userIdentifier, error: userSyncError.message };
        }
      })();
      
      // Add this user's sync promise to the array
      syncPromises.push(userSyncPromise);
    }
    
    // Wait for all user sync operations to complete, with overall timeout
    const allSyncPromise = Promise.all(syncPromises);
    const overallTimeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve('SYNC_TIMEOUT'), 10000); // 10 second overall timeout
    });
    
    const syncResult = await Promise.race([allSyncPromise, overallTimeoutPromise]);
    
    // If we got a timeout result
    if (syncResult === 'SYNC_TIMEOUT') {
      log('Overall sync operation timed out after 10 seconds, saving what we have');
    }
    
    // Save everything we've collected to chrome.storage.local
    if (Object.keys(storageObj).length > 0) {
      log(`Saving sync data for ${syncedCount} items to chrome.storage.local`);
      
      await new Promise(resolve => {
        chrome.storage.local.set(storageObj, () => {
          if (chrome.runtime.lastError) {
            logError(`Error saving sync data: ${chrome.runtime.lastError.message}`);
            syncErrors++;
          } else {
            log(`Successfully saved ${syncedCount} items to chrome.storage.local`);
          }
          resolve();
        });
      });
    }
    
    // Store sync stats
    await new Promise(resolve => {
      chrome.storage.local.set({
        'mata_last_sync': Date.now(),
        'mata_sync_item_count': syncedCount,
        'mata_sync_error_count': syncErrors,
        'mata_sync_duration': Date.now() - syncStartTime
      }, resolve);
    });
    
    // Send success response
    sendResponse({
      success: true,
      syncedCount: syncedCount,
      errorCount: syncErrors,
      usersProcessed: allUsers.length,
      message: `Synced ${syncedCount} items across ${allUsers.length} users with ${syncErrors} errors`,
      duration: Date.now() - syncStartTime
    });
    return true;
  } catch (error) {
    logError('Storage sync failed with critical error', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      timestamp: Date.now()
    });
    return true;
  }
}

/**
 * Handle extension verification check
 * This function responds to the extension verification check from the web app
 * Used to confirm that the extension is installed and functioning correctly
 * Also provides diagnostic information for troubleshooting
 */
async function handleCheckExtension(message, sendResponse) {
  try {
    log('Extension check received');
    
    // Get the extension version
    const version = self.EXTENSION_VERSION || 'unknown';
    log(`Extension version: ${version}`);
    
    // Gather basic diagnostic information
    const diagnostic = {
      timestamp: Date.now(),
      date: new Date().toISOString(),
      extension_id: chrome.runtime.id,
      manifest: chrome.runtime.getManifest() ? {
        version: chrome.runtime.getManifest().version,
        manifest_version: chrome.runtime.getManifest().manifest_version,
        name: chrome.runtime.getManifest().name,
        permissions: chrome.runtime.getManifest().permissions || []
      } : 'unavailable',
      runtime_info: {
        available_apis: [
          'storage' in chrome,
          'runtime' in chrome,
          'tabs' in chrome
        ].filter(Boolean).length,
        last_error: chrome.runtime.lastError ? chrome.runtime.lastError.message : null
      }
    };
    
    // Check if we have an active user
    chrome.storage.local.get('mata_active_user', (userData) => {
      if (userData.mata_active_user) {
        diagnostic.has_active_user = true;
        log(`Extension check with active user: ${userData.mata_active_user}`);
        
        // See if we have the user's encryption keys
        const sanitizedEmail = sanitizeEmail(userData.mata_active_user);
        const keysKey = `mata_keys_${sanitizedEmail}`;
        const saltKey = `mata_salt_${sanitizedEmail}`;
        
        chrome.storage.local.get([keysKey, saltKey], (keyData) => {
          diagnostic.has_keys = !!keyData[keysKey];
          diagnostic.has_salt = !!keyData[saltKey];
          
          continueWithStorageTest(diagnostic);
        });
      } else {
        diagnostic.has_active_user = false;
        log('Extension check with no active user');
        continueWithStorageTest(diagnostic);
      }
    });
    
    /**
     * Continue extension check with storage tests
     * @param {Object} diagnostic - Diagnostic information collected so far
     */
    function continueWithStorageTest(diagnostic) {
      // Perform a quick storage test to verify functionality
      const testKey = `mata_extension_check_${Date.now()}`;
      const testData = {
        timestamp: Date.now(),
        source: 'extension_check',
        data: message.data || null
      };
      
      // Store test data in chrome.storage.local
      chrome.storage.local.set({ [testKey]: testData }, () => {
        if (chrome.runtime.lastError) {
          const errorMsg = `Storage test failed: ${chrome.runtime.lastError.message}`;
          logError(errorMsg);
          diagnostic.storage_write = false;
          diagnostic.storage_error = chrome.runtime.lastError.message;
          
          sendResponse({ 
            success: false, 
            error: errorMsg,
            version: version,
            diagnostic: diagnostic
          });
          return;
        }
        
        diagnostic.storage_write = true;
        
        // Read back the test data
        chrome.storage.local.get(testKey, (result) => {
          if (chrome.runtime.lastError) {
            const errorMsg = `Storage retrieval failed: ${chrome.runtime.lastError.message}`;
            logError(errorMsg);
            diagnostic.storage_read = false;
            diagnostic.storage_error = chrome.runtime.lastError.message;
            
            sendResponse({ 
              success: false, 
              error: errorMsg,
              version: version,
              diagnostic: diagnostic
            });
            return;
          }
          
          // Verify data integrity
          if (!result[testKey]) {
            const errorMsg = `Storage verification failed: test data not found`;
            logError(errorMsg);
            diagnostic.storage_read = true;
            diagnostic.storage_integrity = false;
            
            sendResponse({ 
              success: false, 
              error: errorMsg,
              version: version,
              diagnostic: diagnostic
            });
            return;
          }
          
          diagnostic.storage_read = true;
          diagnostic.storage_integrity = true;
          
          // Clean up test data
          chrome.storage.local.remove(testKey);
          
          // Get additional diagnostics: check if we can find MATA tabs
          getMataTabs().then(tabs => {
            diagnostic.mata_tabs_count = tabs.length;
            diagnostic.has_mata_tabs = tabs.length > 0;
            
            // Get storage usage statistics
            getStorageQuota().then(quotaInfo => {
              diagnostic.storage_usage = quotaInfo;
              
              // All tests passed
              log('Extension check successful');
              sendResponse({
                success: true,
                version: version,
                timestamp: Date.now(),
                diagnostic: diagnostic,
                storage: {
                  working: true
                }
              });
            }).catch(err => {
              // Still return success if storage quota check fails
              diagnostic.storage_quota_error = err.message;
              
              log('Extension check successful (failed to get storage quota)');
              sendResponse({
                success: true,
                version: version,
                timestamp: Date.now(),
                diagnostic: diagnostic,
                storage: {
                  working: true
                }
              });
            });
          }).catch(err => {
            // Still return success if tab check fails
            diagnostic.mata_tabs_error = err.message;
            
            log('Extension check successful (failed to get MATA tabs)');
            sendResponse({
              success: true,
              version: version,
              timestamp: Date.now(),
              diagnostic: diagnostic,
              storage: {
                working: true
              }
            });
          });
        });
      });
    }
  } catch (error) {
    logError('Extension check failed', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      version: self.EXTENSION_VERSION || 'unknown',
      diagnostic: {
        error: error.message,
        stack: error.stack
      }
    });
  }
}

/**
 * Handle storing encryption keys
 * This function stores encryption keys for a user in chrome.storage.local
 * @param {Object} message - The message containing keys to store
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleStoreKeys(message, sendResponse) {
  try {
    log('Received request to store encryption keys');
    log('Message structure:', Object.keys(message));
    
    // Check if keys are nested inside message.keys
    const keysData = message.keys || {};
    
    // Validate we have the required data - either at top level or in keys object
    const email = message.email || keysData.email;
    if (!email) {
      log('Email missing in message structure:', { 
        hasTopLevelEmail: !!message.email,
        hasKeysObject: !!message.keys,
        keysHasEmail: !!(message.keys && message.keys.email)
      });
      throw new Error('No email provided for key storage');
    }
    
    // Use the keys from the proper location
    const keys = message.keys ? keysData : message;
    if (!keys) {
      throw new Error('No keys provided for storage');
    }
    
    log(`Found email in message: ${email}`);
    
    const userEmail = email;
    const sanitizedEmail = typeof sanitizeEmail === 'function' 
      ? sanitizeEmail(userEmail) 
      : userEmail.replace(/[@.]/g, '_');
    
    log(`Storing keys for user: ${userEmail} (sanitized: ${sanitizedEmail})`);
    
    // Create the storage keys
    const keysKey = `mata_keys_${sanitizedEmail}`;
    const saltKey = keys.salt ? `mata_salt_${sanitizedEmail}` : null;
    
    // Prepare the storage object
    const storageObj = {
      [keysKey]: keys
    };
    
    // Add salt if provided
    if (saltKey && keys.salt) {
      storageObj[saltKey] = keys.salt;
      log(`Adding salt for user: ${userEmail}`);
    }
    
    // Store active user (check both locations for the setActive flag)
    if (message.setActive || keys.setActive) {
      storageObj['mata_active_user'] = userEmail;
      log(`Setting ${userEmail} as active user`);
    }
    
    // Store the keys in chrome.storage.local
    chrome.storage.local.set(storageObj, () => {
      if (chrome.runtime.lastError) {
        const errorMsg = `Error storing keys: ${chrome.runtime.lastError.message}`;
        logError(errorMsg);
        sendResponse({
          success: false,
          error: errorMsg
        });
        return;
      }
      
      log(`Successfully stored keys for user: ${userEmail}`);
      
      // Send success response
      sendResponse({
        success: true,
        email: userEmail,
        sanitizedEmail: sanitizedEmail,
        message: `Successfully stored keys for user ${userEmail}`
      });
    });
  } catch (error) {
    logError('Error storing keys', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Sync critical encryption files from localStorage to chrome.storage
 * This specifically handles mata_active_user, mata_salt_* and mata_keys_* files
 * with exact format preservation (no transformations)
 */
async function handleSyncCriticalFiles(message, sendResponse) {
  try {
    log('Synchronizing critical encryption files...');
    
    // Validate the message
    if (!message.files || typeof message.files !== 'object') {
      throw new Error('No files provided for sync');
    }
    
    const files = message.files;
    const fileCount = Object.keys(files).length;
    
    if (fileCount === 0) {
      log('No critical files to sync');
      sendResponse({
        success: true,
        syncedCount: 0
      });
      return;
    }
    
    log(`Syncing ${fileCount} critical files:`, Object.keys(files));
    
    // Create an object for storing in chrome.storage
    const storageObj = {};
    
    // Track active user separately to process last (ensures keys are processed first)
    let activeUser = null;
    
    // Process all files except mata_active_user first (process in correct order)
    for (const [key, value] of Object.entries(files)) {
      // Skip active user for now
      if (key === 'mata_active_user') {
        activeUser = value;
        continue;
      }
      
      // Validate that this is one of our critical file types
      if (key.startsWith('mata_salt_') || key.startsWith('mata_keys_')) {
        // Handle potential format differences - localStorage stores as strings
        let processedValue = value;
        
        // If the value is a string that looks like JSON, try to parse it
        if (typeof value === 'string' && 
            ((value.startsWith('{') && value.endsWith('}')) || 
             (value.startsWith('[') && value.endsWith(']')))) {
          try {
            processedValue = JSON.parse(value);
            log(`Parsed JSON value for ${key}`);
          } catch (e) {
            // If parsing fails, keep as string
            log(`Failed to parse ${key} as JSON, keeping as string: ${e.message}`);
          }
        } 
        // If the value is an object, keep as is for chrome.storage
        else if (typeof value === 'object') {
          processedValue = value;
          log(`Keeping object value for ${key}`);
        }
        
        storageObj[key] = processedValue;
        log(`Adding ${key} to sync queue (${typeof processedValue})`);
      } else {
        log(`Skipping non-critical file: ${key}`);
      }
    }
    
    // Now process active user last
    if (activeUser !== null) {
      storageObj['mata_active_user'] = activeUser;
      log(`Adding mata_active_user to sync queue: ${activeUser}`);
      
      // If we have an active user, check if we have their keys
      if (typeof activeUser === 'string') {
        const sanitizedEmail = sanitizeEmail(activeUser);
        const keysKey = `mata_keys_${sanitizedEmail}`;
        const saltKey = `mata_salt_${sanitizedEmail}`;
        
        if (!(keysKey in storageObj) || !(saltKey in storageObj)) {
          // We're missing keys or salt for the active user, check if they're in chrome.storage
          log(`Missing keys or salt for active user, checking chrome.storage`);
          
          chrome.storage.local.get([keysKey, saltKey], (result) => {
            if (result[keysKey] && result[saltKey]) {
              log(`Found existing keys and salt for ${activeUser} in chrome.storage, no need to update`);
            } else {
              // Log what we're missing
              if (!result[keysKey]) log(`Missing keys for active user: ${keysKey}`);
              if (!result[saltKey]) log(`Missing salt for active user: ${saltKey}`);
            }
          });
        }
      }
    }
    
    // If we have any files to sync, save them to chrome.storage.local
    if (Object.keys(storageObj).length > 0) {
      chrome.storage.local.set(storageObj, () => {
        if (chrome.runtime.lastError) {
          const errorMsg = `Error syncing critical files: ${chrome.runtime.lastError.message}`;
          logError(errorMsg);
          sendResponse({
            success: false,
            error: errorMsg
          });
          return;
        }
        
        const syncedCount = Object.keys(storageObj).length;
        log(`Successfully synced ${syncedCount} critical files`);
        
        sendResponse({
          success: true,
          syncedCount: syncedCount,
          message: `Successfully synced ${syncedCount} files`
        });
      });
    } else {
      // No files were found to sync
      log('No critical files matched criteria for sync');
      sendResponse({
        success: true,
        syncedCount: 0,
        message: 'No critical files matched criteria for sync'
      });
    }
  } catch (error) {
    logError('Error syncing critical files', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get dashboard data for the popup
async function handleGetDashboardData(message, sendResponse) {
  try {
    log('Getting dashboard data');
    
    // This would normally retrieve data from storage
    // For now, send a placeholder response
    sendResponse({
      success: true,
      data: {
        passwordCount: 0,
        bankAccountsCount: 0,
        contactsCount: 0,
        totalBalance: 0
      }
    });
  } catch (error) {
    logError('Error getting dashboard data', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get user-specific data from storage
async function handleGetUserData(message, sendResponse) {
  try {
    log(`Getting ${message.dataType} for user: ${message.email}`);
    
    // This would normally retrieve user data from storage
    // For now, send a placeholder response
    sendResponse({
      success: true,
      data: []
    });
  } catch (error) {
    logError(`Error getting ${message.dataType} for user: ${message.email}`, error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Save user-specific data to storage
async function handleSaveUserData(message, sendResponse) {
  try {
    log(`Saving ${message.dataType} for user: ${message.email}`);
    
    // This would normally save user data to storage
    // For now, send a placeholder response
    sendResponse({
      success: true
    });
  } catch (error) {
    logError(`Error saving ${message.dataType} for user: ${message.email}`, error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Get user settings
async function handleGetSettings(message, sendResponse) {
  try {
    log('Getting user settings');
    
    // Retrieve settings from chrome.storage.local
    chrome.storage.local.get(['mata_settings'], (result) => {
      const settings = result.mata_settings || {
        autoLockMinutes: 5,
        requirePassword: true,
        dataSync: true
      };
      
      sendResponse({
        success: true,
        settings
      });
    });
  } catch (error) {
    logError('Error getting user settings', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Save user settings
async function handleSaveSettings(message, sendResponse) {
  try {
    log('Saving user settings');
    
    // Validate settings
    if (!message.settings) {
      throw new Error('No settings provided');
    }
    
    // Save settings to chrome.storage.local
    chrome.storage.local.set({ 'mata_settings': message.settings }, () => {
      if (chrome.runtime.lastError) {
        throw new Error(`Error saving settings: ${chrome.runtime.lastError.message}`);
      }
      
      sendResponse({
        success: true
      });
    });
  } catch (error) {
    logError('Error saving user settings', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// List all accounts
async function handleListAccounts(message, sendResponse) {
  try {
    log('Listing accounts');
    
    // This would normally retrieve accounts from storage
    // For now, send a placeholder response
    sendResponse({
      success: true,
      accounts: []
    });
  } catch (error) {
    logError('Error listing accounts', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Find MATA web app tabs
async function handleFindMataTabs(message, sendResponse) {
  try {
    log('Finding MATA web app tabs');
    
    // Use the exported findMataTabs function from mataConfig.js
    const tabs = await findMataTabs();
    
    log(`Found ${tabs.length} MATA web app tabs`);
    
    sendResponse({
      success: true,
      tabs: tabs,
      count: tabs.length
    });
  } catch (error) {
    logError('Error finding MATA web app tabs', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Find all user emails across available storage systems
 * This function discovers all user accounts by checking both chrome.storage and web app localStorage
 * @param {Object} message - The message object
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleFindAllUsers(message, sendResponse) {
  try {
    log('Finding all user emails from available storage sources');
    
    // Use our utility function to find all user emails
    const users = await findAllUserEmails();
    
    log(`Found ${users.length} user emails across all storage sources`);
    
    // Add additional diagnostic information if requested
    let diagnosticInfo = {};
    if (message.includeDiagnostics) {
      try {
        // Get storage usage statistics
        const storageInfo = await getStorageQuota();
        diagnosticInfo.storage = storageInfo;
        
        // Include active MATA tabs
        const tabs = await findMataTabs();
        diagnosticInfo.tabs = {
          count: tabs.length,
          urls: tabs.map(tab => tab.url)
        };
        
        // Check if we can find active user
        const activeUser = await new Promise(resolve => {
          chrome.storage.local.get('mata_active_user', result => {
            resolve(result.mata_active_user || null);
          });
        });
        diagnosticInfo.activeUser = activeUser;
        
        log('Included additional diagnostic information in response');
      } catch (diagError) {
        log('Error collecting diagnostic information:', diagError.message);
      }
    }
    
    // Send response with all the users we found
    sendResponse({
      success: true,
      users: users,
      count: users.length,
      timestamp: Date.now(),
      ...(message.includeDiagnostics ? { diagnostics: diagnosticInfo } : {})
    });
  } catch (error) {
    logError('Error finding all user emails', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      timestamp: Date.now()
    });
  }
}

// Initialize the extension
async function initialize() {
  try {
    log('Initializing background script');
    
    // Check if we're already initialized
    if (state.initialized) {
      log('Background script already initialized');
      
      // Even if already initialized, ensure keep-alive is running
      if (!keepAliveIntervalId) {
        log('Restarting keep-alive mechanism');
        startKeepAlive();
      }
      return;
    }
    
    // Mark as initialized
    state.initialized = true;
    
    // First load critical encryption data from storage
    loadCriticalDataFromStorage();
    
    // Start the keep-alive mechanism if not already running
    if (!keepAliveIntervalId) {
      log('Starting keep-alive mechanism during initialization');
      startKeepAlive();
    }
    
    // Record initialization in storage
    chrome.storage.local.set({
      'mata_service_worker_initialized': Date.now(),
      'mata_extension_version': self.EXTENSION_VERSION || 'unknown'
    });
    
    // Try to find active MATA tabs and send sync message
    setTimeout(() => {
      getMataTabs().then(tabs => {
        if (tabs.length > 0) {
          log(`Found ${tabs.length} active MATA tabs during startup`);
          // Send a message to each tab to ensure content scripts are running
          tabs.forEach(tab => {
            try {
              chrome.tabs.sendMessage(tab.id, { action: 'triggerCriticalSync' }, 
                response => {
                  if (chrome.runtime.lastError) {
                    log(`Couldn't reach content script in tab ${tab.id}:`, chrome.runtime.lastError.message);
                  } else if (response && response.success) {
                    log(`Successfully triggered sync in tab ${tab.id}`);
                  }
                }
              );
            } catch (e) {
              logError(`Error sending to tab ${tab.id}:`, e.message);
            }
          });
        } else {
          log('No active MATA tabs found during startup');
        }
      }).catch(e => {
        logError('Error finding MATA tabs during startup:', e);
      });
    }, 2000);
    
    // Get current version
    const version = self.EXTENSION_VERSION || 'unknown';
    log(`MATA Extension v${version} initialized`);
    
    // Check for first run or update
    chrome.storage.local.get(['mata_last_version'], async (result) => {
      const lastVersion = result.mata_last_version;
      
      if (!lastVersion) {
        // First run
        log('First run detected');
        onFirstRun();
      } else if (lastVersion !== version) {
        // Update
        log(`Update detected from v${lastVersion} to v${version}`);
        onUpdate(lastVersion, version);
      }
      
      // Save current version
      chrome.storage.local.set({ 'mata_last_version': version });
      
      // Try to find any MATA web app tabs and trigger critical file sync
      // Use timeout to make sure content scripts are loaded
      setTimeout(async () => {
        try {
          await tryInitialSync();
        } catch (syncError) {
          logError('Error during initial sync', syncError);
        }
      }, 2000); // 2 second delay to ensure content scripts are loaded
    });
  } catch (error) {
    logError('Error initializing background script', error);
  }
}

// Load critical encryption data from chrome.storage on startup
async function loadCriticalDataFromStorage() {
  try {
    log('Loading critical encryption data from chrome.storage.local...');
    
    // Get mata_active_user first to see which user is active
    chrome.storage.local.get('mata_active_user', (userData) => {
      const activeUser = userData.mata_active_user;
      
      if (activeUser) {
        log(`Found active user in storage: ${activeUser}`);
        
        // Sanitize the email for consistent key format
        const sanitizedEmail = typeof sanitizeEmail === 'function' 
          ? sanitizeEmail(activeUser) 
          : activeUser.replace(/[@.]/g, '_');
        
        // Get critical encryption keys for this user
        const keysKey = `mata_keys_${sanitizedEmail}`;
        const saltKey = `mata_salt_${sanitizedEmail}`;
        
        chrome.storage.local.get([keysKey, saltKey], (result) => {
          if (result[keysKey]) {
            log(`Found encryption keys for active user: ${activeUser}`);
          }
          
          if (result[saltKey]) {
            log(`Found salt for active user: ${activeUser}`);
          }
          
          log('Successfully loaded critical encryption data from storage');
        });
      } else {
        log('No active user found in storage');
        
        // Try to see if we have any user keys stored
        chrome.storage.local.get(null, (allStorage) => {
          const keyPattern = /^mata_keys_/;
          const userKeys = Object.keys(allStorage).filter(key => keyPattern.test(key));
          
          if (userKeys.length > 0) {
            log(`Found ${userKeys.length} user key entries in storage`);
          } else {
            log('No user keys found in storage');
          }
        });
      }
    });
  } catch (error) {
    logError('Error loading critical data from storage', error);
  }
}

// Attempt to trigger critical file sync from any open MATA web app tabs
async function tryInitialSync() {
  try {
    log('Attempting initial sync of critical files from any open MATA web app tabs...');
    
    // Get active MATA tabs using our helper function
    const tabs = await getMataTabs();
    
    if (tabs.length === 0) {
      log('No MATA web app tabs open for initial sync');
      
      // Even without tabs, we can check if we have active user data in chrome.storage
      chrome.storage.local.get('mata_active_user', (userData) => {
        const activeUser = userData.mata_active_user;
        
        if (activeUser) {
          log(`No tabs available, but found active user in storage: ${activeUser}`);
          
          // Get all storage keys for this user
          const sanitizedEmail = sanitizeEmail(activeUser);
          const keysKey = `mata_keys_${sanitizedEmail}`;
          const saltKey = `mata_salt_${sanitizedEmail}`;
          
          chrome.storage.local.get([keysKey, saltKey], (result) => {
            if (result[keysKey] && result[saltKey]) {
              log(`Found encryption keys and salt for active user: ${activeUser}`);
              log('Critical data is available in chrome.storage.local even without active tabs');
            } else {
              log(`Missing encryption data for active user: ${activeUser}`);
              if (!result[keysKey]) log(`Missing keys for active user: ${keysKey}`);
              if (!result[saltKey]) log(`Missing salt for active user: ${saltKey}`);
            }
          });
        } else {
          log('No active user found in storage and no open tabs for sync');
        }
      });
      
      return;
    }
    
    // Track sync success state
    let syncSucceeded = false;
    
    // For each tab, send a message to trigger the sync
    for (const tab of tabs) {
      log(`Triggering sync from tab: ${tab.id}`);
      
      try {
        // Send message with timeout promise
        const syncPromise = new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id, { action: 'triggerCriticalSync' }, (response) => {
            if (chrome.runtime.lastError) {
              log(`Tab ${tab.id} not ready for sync: ${chrome.runtime.lastError.message}`);
              resolve(false);
              return;
            }
            
            if (response && response.success) {
              log(`Successfully triggered sync from tab ${tab.id}`);
              syncSucceeded = true;
              resolve(true);
            } else {
              log(`Failed to trigger sync from tab ${tab.id}: ${response ? response.error : 'Unknown error'}`);
              resolve(false);
            }
          });
        });
        
        // Add timeout
        const timeoutPromise = new Promise((resolve) => {
          setTimeout(() => {
            log(`Sync request to tab ${tab.id} timed out after 5 seconds`);
            resolve(false);
          }, 5000);
        });
        
        // Wait for either success or timeout
        await Promise.race([syncPromise, timeoutPromise]);
        
        // If we've already succeeded with one tab, we can stop
        if (syncSucceeded) {
          log('Sync succeeded with at least one tab, no need to try more tabs');
          break;
        }
      } catch (tabError) {
        log(`Error sending message to tab ${tab.id}: ${tabError.message}`);
        // Continue to next tab
      }
    }
    
    // If sync didn't succeed with any tab, try backup approach
    if (!syncSucceeded) {
      log('Failed to sync with any tabs, checking for backup data in chrome.storage');
      
      chrome.storage.local.get('mata_active_user', (userData) => {
        const activeUser = userData.mata_active_user;
        
        if (activeUser) {
          log(`Found active user in storage: ${activeUser}`);
          // We have an active user, so check if we have their encryption keys
          const sanitizedEmail = sanitizeEmail(activeUser);
          log(`Active user ${activeUser} sanitized as ${sanitizedEmail}`);
          
          // This will be logged in loadCriticalDataFromStorage instead
        }
      });
    }
  } catch (error) {
    logError('Error in tryInitialSync', error);
  }
}

// Handle first run
function onFirstRun() {
  try {
    log('Running first-time setup');
    
    // Save default settings
    const defaultSettings = {
      autoLockMinutes: 5,
      requirePassword: true,
      dataSync: true
    };
    
    chrome.storage.local.set({ 'mata_settings': defaultSettings }, () => {
      if (chrome.runtime.lastError) {
        logError('Error saving default settings', chrome.runtime.lastError);
        return;
      }
      
      log('Default settings saved');
    });
  } catch (error) {
    logError('Error in onFirstRun', error);
  }
}

// Handle update
function onUpdate(oldVersion, newVersion) {
  try {
    log(`Handling update from v${oldVersion} to v${newVersion}`);
    
    // Future update handling logic would go here
  } catch (error) {
    logError('Error in onUpdate', error);
  }
}

/**
 * Handle IndexedDB backup request from content script
 * @param {Object} message - The message object containing the backup data
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleBackupIndexedDB(message, sendResponse) {
  try {
    // Make sure we have backup data
    if (!message.backup || !message.backup.data) {
      throw new Error('No backup data provided');
    }
    
    const backup = message.backup;
    const timestamp = backup.timestamp;
    const userEmail = backup.user;
    
    if (!userEmail) {
      throw new Error('No user email specified for backup');
    }
    
    log(`Received IndexedDB backup for user: ${userEmail}, timestamp: ${new Date(timestamp).toISOString()}`);
    
    // Generate key for the backup
    const backupKey = `mata_indexeddb_backup_${userEmail}`;
    
    // Calculate size of backup data
    const backupDataString = JSON.stringify(backup.data);
    const backupSize = new Blob([backupDataString]).size;
    const backupSizeMB = (backupSize / (1024 * 1024)).toFixed(2);
    
    log(`Backup size for user ${userEmail}: ${backupSizeMB} MB`);
    
    // Check storage quota and available space
    const storageQuota = await getStorageQuota();
    log(`Current storage usage: ${storageQuota.usedMB}MB / ${storageQuota.grantedMB}MB (${storageQuota.percentUsed}% used)`);
    
    // Check if backup is too large for the available space
    // We need to leave room for other data and other users
    const MAX_BACKUP_SIZE_PER_USER = 3 * 1024 * 1024; // 3MB per user
    let reducedData = backup.data;
    
    if (backupSize > MAX_BACKUP_SIZE_PER_USER) {
      log(`Backup for user ${userEmail} too large (${backupSizeMB} MB), reducing size by removing non-essential data`);
      
      // Implement size reduction strategy
      reducedData = reduceSizeForUser(backup.data, userEmail, MAX_BACKUP_SIZE_PER_USER);
      
      // Recalculate size
      const reducedDataString = JSON.stringify(reducedData);
      const reducedSize = new Blob([reducedDataString]).size;
      const reducedSizeMB = (reducedSize / (1024 * 1024)).toFixed(2);
      
      log(`Reduced backup size for user ${userEmail} to ${reducedSizeMB} MB`);
      
      // Send warning about data reduction
      sendResponse({
        success: true,
        warning: `Backup size reduced from ${backupSizeMB}MB to ${reducedSizeMB}MB for user ${userEmail} to fit within storage limits.`,
        backupSize: reducedSize,
        timestamp: timestamp
      });
    }
    
    // Create storage object with backup metadata
    const storageObj = {
      [backupKey]: {
        timestamp: timestamp,
        user: userEmail,
        size: backupSize,
        data: reducedData
      }
    };
    
    // Also store a list of all backups for easier management
    chrome.storage.local.get(['mata_indexeddb_backups'], (result) => {
      let backupList = result.mata_indexeddb_backups || {};
      
      // Update backup metadata
      backupList[userEmail] = {
        timestamp: timestamp,
        size: backupSize
      };
      
      // Add to our storage object
      storageObj['mata_indexeddb_backups'] = backupList;
      
      // Store everything in chrome.storage.local
      chrome.storage.local.set(storageObj, () => {
        if (chrome.runtime.lastError) {
          const errorMsg = `Error storing IndexedDB backup: ${chrome.runtime.lastError.message}`;
          logError(errorMsg);
          sendResponse({
            success: false,
            error: errorMsg
          });
          return;
        }
        
        log(`Successfully stored IndexedDB backup for ${userEmail}`);
        sendResponse({
          success: true,
          message: `Successfully backed up IndexedDB data for user ${userEmail}`,
          timestamp: timestamp,
          backupSize: backupSize
        });
      });
    });
  } catch (error) {
    logError('Error handling IndexedDB backup', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Handle retrieving a previously created IndexedDB backup
 * This function retrieves the backup data stored by handleBackupIndexedDB
 * @param {Object} message - Message containing user information
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleGetIndexedDBBackup(message, sendResponse) {
  try {
    // Validate message
    if (!message.user) {
      throw new Error('No user email specified for retrieving backup');
    }
    
    const userEmail = message.user;
    log(`Retrieving IndexedDB backup for user: ${userEmail}`);
    
    // Generate key for the backup
    const backupKey = `mata_indexeddb_backup_${userEmail}`;
    
    // Retrieve the backup from chrome.storage.local
    chrome.storage.local.get([backupKey], (result) => {
      if (chrome.runtime.lastError) {
        const errorMsg = `Error retrieving IndexedDB backup: ${chrome.runtime.lastError.message}`;
        logError(errorMsg);
        sendResponse({
          success: false,
          error: errorMsg
        });
        return;
      }
      
      // Check if the backup exists
      const backup = result[backupKey];
      if (!backup) {
        log(`No IndexedDB backup found for user ${userEmail}`);
        sendResponse({
          success: false,
          error: `No IndexedDB backup found for user ${userEmail}`
        });
        return;
      }
      
      log(`Successfully retrieved IndexedDB backup for ${userEmail}`);
      
      // Return the backup data
      sendResponse({
        success: true,
        message: `Successfully retrieved IndexedDB backup for user ${userEmail}`,
        data: backup.data,
        timestamp: backup.timestamp,
        size: backup.size
      });
    });
  } catch (error) {
    logError('Error retrieving IndexedDB backup', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

/**
 * Get current storage quota and usage
 * @returns {Promise<{usedMB: number, grantedMB: number, percentUsed: number}>} Storage quota information
 */
async function getStorageQuota() {
  return new Promise((resolve) => {
    chrome.storage.local.getBytesInUse(null, (bytesInUse) => {
      if (chrome.runtime.lastError) {
        // If there's an error, provide a reasonable estimate
        resolve({
          usedMB: 0,
          grantedMB: 5, // Default quota is 5MB
          percentUsed: 0
        });
        return;
      }
      
      // Default granted quota is 5MB, can be increased to 10MB with unlimitedStorage permission
      const grantedMB = 5;
      const usedMB = bytesInUse / (1024 * 1024);
      const percentUsed = (usedMB / grantedMB) * 100;
      
      resolve({
        usedMB: usedMB.toFixed(2),
        grantedMB: grantedMB,
        percentUsed: percentUsed.toFixed(1)
      });
    });
  });
}

/**
 * Reduce the size of backup data for a user
 * @param {Object} data - The backup data
 * @param {string} userEmail - The user email
 * @param {number} maxSize - Maximum size in bytes
 * @returns {Object} - Reduced data
 */
function reduceSizeForUser(data, userEmail, maxSize) {
  const reducedData = {};
  
  // Store DB structures for all databases
  for (const [dbName, dbData] of Object.entries(data)) {
    reducedData[dbName] = {
      version: dbData.version,
      objectStores: dbData.objectStores,
      stores: {}
    };
    
    // Set of critical stores we should prioritize
    const criticalStores = new Set([
      'keys', 'metadata', 'auth', 'sessions', 'settings', 'config'
    ]);
    
    // First pass: add critical stores
    for (const [storeName, storeData] of Object.entries(dbData.stores)) {
      if (criticalStores.has(storeName.toLowerCase())) {
        log(`Prioritizing critical store ${storeName} for user ${userEmail}`);
        reducedData[dbName].stores[storeName] = storeData;
      }
    }
    
    // Second pass: add non-critical stores with metadata only if there's space
    for (const [storeName, storeData] of Object.entries(dbData.stores)) {
      if (!criticalStores.has(storeName.toLowerCase())) {
        // Create a store entry with structure but limit or omit records
        reducedData[dbName].stores[storeName] = {
          keyPath: storeData.keyPath,
          autoIncrement: storeData.autoIncrement,
          indices: storeData.indices,
          records: [] // Start with empty records
        };
        
        // Add only metadata for each record (limited number)
        const MAX_RECORDS_PER_STORE = 10;
        for (let i = 0; i < Math.min(storeData.records.length, MAX_RECORDS_PER_STORE); i++) {
          const record = storeData.records[i];
          
          // Only include key and minimal metadata
          reducedData[dbName].stores[storeName].records.push({
            key: record.key,
            value: {
              id: record.value.id,
              name: record.value.name,
              type: record.value.type,
              metadata: true // Indicate this is a metadata-only record
            }
          });
        }
        
        // Add record count info
        if (storeData.records.length > MAX_RECORDS_PER_STORE) {
          reducedData[dbName].stores[storeName].truncated = true;
          reducedData[dbName].stores[storeName].totalRecords = storeData.records.length;
        }
      }
    }
  }
  
  return reducedData;
}

/**
 * Find all user emails from available storage sources
 * This function attempts to discover all user emails by checking both chrome.storage and web app localStorage
 * @returns {Promise<string[]>} Array of unique user emails found in storage
 */
async function findAllUserEmails() {
  const users = new Set();
  
  try {
    // First, get all keys from chrome.storage that match our patterns
    const chromeStorage = await new Promise(resolve => {
      chrome.storage.local.get(null, result => {
        resolve(result || {});
      });
    });
    
    log(`Scanning ${Object.keys(chromeStorage).length} chrome.storage keys for user emails`);
    
    // Scan for keys pattern in chrome.storage
    const keyPattern = /^mata_keys_(.+)$/;
    const saltPattern = /^mata_salt_(.+)$/;
    
    for (const key of Object.keys(chromeStorage)) {
      // Check for keys pattern
      const keysMatch = key.match(keyPattern);
      if (keysMatch && keysMatch[1]) {
        users.add(keysMatch[1]);
        continue;
      }
      
      // Check for salt pattern
      const saltMatch = key.match(saltPattern);
      if (saltMatch && saltMatch[1]) {
        users.add(saltMatch[1]);
      }
    }
    
    log(`Found ${users.size} users in chrome.storage`);
    
    // Now try to get additional users from content script localStorage
    const tabs = await getMataTabs();
    if (tabs.length > 0) {
      try {
        const response = await new Promise((resolve, reject) => {
          const timeoutId = setTimeout(() => {
            reject(new Error("Timeout getting user emails from content script"));
          }, 5000);
          
          chrome.tabs.sendMessage(tabs[0].id, { action: 'findAllUserEmails' }, 
            (response) => {
              clearTimeout(timeoutId);
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve(response);
              }
            }
          );
        });
        
        if (response && response.success && response.users && response.users.length > 0) {
          log(`Found ${response.users.length} additional users from content script: ${response.users.join(', ')}`);
          
          // Add these users to our set
          response.users.forEach(email => users.add(email));
          
          // Also add the sanitized versions if we have them
          if (response.sanitizedUsers && response.sanitizedUsers.length > 0) {
            response.sanitizedUsers.forEach(email => users.add(email));
          }
        }
      } catch (tabError) {
        logError('Error getting user emails from content script:', tabError);
      }
    }
  } catch (error) {
    logError('Error finding all user emails:', error);
  }
  
  // Convert to array before returning
  return Array.from(users);
}

/**
 * Get encryption keys for a user
 * This function retrieves encryption keys and salt for a user from chrome.storage.local or web app localStorage
 * @param {Object} message - The message containing the user email
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleGetKeys(message, sendResponse) {
  try {
    const startTime = Date.now();
    log(`Received request to get encryption keys at ${new Date(startTime).toISOString()}`);
    
    // Check if email is provided either directly or in nested data structure
    let userEmail = message.email;
    
    // If no email provided, try to use active user
    if (!userEmail) {
      log('No email directly provided, checking for active user');
      
      try {
        // Try to get active user from chrome.storage - this is our primary fallback
        const result = await new Promise(resolve => {
          chrome.storage.local.get('mata_active_user', result => {
            resolve(result.mata_active_user || null);
          });
        });
        
        if (result) {
          userEmail = result;
          log(`Using active user from chrome.storage: ${userEmail}`);
        } else {
          // Try to get from localStorage via content script
          const tabs = await getMataTabs();
          if (tabs.length > 0) {
            try {
              const response = await new Promise((resolve, reject) => {
                chrome.tabs.sendMessage(tabs[0].id, { action: 'getLocalStorage', key: 'mata_active_user' }, 
                  (response) => {
                    if (chrome.runtime.lastError) {
                      reject(chrome.runtime.lastError);
                    } else {
                      resolve(response);
                    }
                  }
                );
              });
              
              if (response && response.success && response.value) {
                userEmail = response.value;
                log(`Using active user from localStorage: ${userEmail}`);
                
                // Save this to chrome.storage for future use
                chrome.storage.local.set({ 'mata_active_user': userEmail }, () => {
                  log(`Saved active user to chrome.storage: ${userEmail}`);
                });
              }
            } catch (e) {
              log(`Error getting active user from tab: ${e.message}`);
            }
          }
        }
      } catch (e) {
        log(`Error finding active user: ${e.message}`);
      }
      
      // If still no email, check if data.user was provided
      if (!userEmail && message.data && message.data.user) {
        userEmail = message.data.user;
        log(`Using user from data field: ${userEmail}`);
      }
      
      // If we still don't have an email, try to find any available user accounts
      if (!userEmail) {
        log('No email directly provided, attempting to discover available users');
        try {
          const availableUsers = await findAllUserEmails();
          
          if (availableUsers && availableUsers.length > 0) {
            userEmail = availableUsers[0]; // Use the first available user
            log(`Using first available user: ${userEmail} (from ${availableUsers.length} total users found)`);
            
            // Save this as active_user for future reference
            chrome.storage.local.set({ 'mata_active_user': userEmail }, () => {
              log(`Saved discovered user ${userEmail} as active_user in chrome.storage`);
            });
          } else {
            log('No users could be discovered in any storage locations');
            sendResponse({
              success: false,
              error: 'No email provided and no users found in storage',
              errorType: 'no_email',
              keysFound: false,
              saltFound: false,
              timestamp: Date.now()
            });
            return;
          }
        } catch (findUsersError) {
          log(`Error finding available users: ${findUsersError.message}`);
          sendResponse({
            success: false,
            error: 'No email provided and error finding available users: ' + findUsersError.message,
            errorType: 'no_email',
            keysFound: false,
            saltFound: false,
            timestamp: Date.now()
          });
          return;
        }
      }
    }
    
    log(`Looking for keys for user: ${userEmail}`);
    
    // Try different email formats to maximize compatibility
    const sanitizedEmail = sanitizeEmail(userEmail);
    const formats = [
      sanitizedEmail,                            // standard format with @/. replaced by _
      userEmail,                                 // original email as-is
      userEmail.replace(/[^a-zA-Z0-9]/g, '_'),  // all non-alphanumeric replaced with _
      userEmail.toLowerCase().trim()             // lowercased and trimmed
    ];
    
    log(`Will try the following email formats: ${formats.join(', ')}`);
    
    // Keep track of all attempts
    const attempts = [];
    
    // Try each format
    for (const emailFormat of formats) {
      const keysKey = `mata_keys_${emailFormat}`;
      const saltKey = `mata_salt_${emailFormat}`;
      
      const attemptStartTime = Date.now();
      log(`Trying to get keys with format: ${emailFormat} (${keysKey}) at ${new Date(attemptStartTime).toISOString()}`);
      
      // Create a tracker object for this attempt and add to attempts array
      const attemptData = { 
        format: emailFormat, 
        keysKey, 
        saltKey, 
        startTime: attemptStartTime, 
        sources: [] 
      };
      attempts.push(attemptData);
      
      // Store a reference to the current attempt for use throughout this iteration
      let attemptTracker = attemptData;
      
      // First try chrome.storage.local
      try {
        log(`Checking chrome.storage for ${emailFormat}...`);
        const chromeStorageStartTime = Date.now();
        
        // We already have attemptTracker defined above, use it directly
        if (attemptTracker) {
          attemptTracker.sources.push({ 
            type: 'chrome.storage.start', 
            time: chromeStorageStartTime 
          });
        }
        
        const result = await new Promise((resolve) => {
          chrome.storage.local.get([keysKey, saltKey], (items) => {
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message });
            } else {
              resolve({ data: items });
            }
          });
        });
        
        // Update attempt with completion time
        if (attemptTracker) {
          attemptTracker.sources.push({ 
            type: 'chrome.storage.complete', 
            time: Date.now(),
            duration: Date.now() - chromeStorageStartTime
          });
        }
        
        if (result.error) {
          log(`Error accessing chrome.storage for ${emailFormat}: ${result.error}`);
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'chrome.storage.error', 
              error: result.error,
              time: Date.now()
            });
          }
          continue;
        }
        
        const keysData = result.data[keysKey];
        const saltData = result.data[saltKey];
        
        if (keysData) {
          const successTime = Date.now();
          const totalDuration = successTime - attemptStartTime;
          log(`Found keys for ${emailFormat} in chrome.storage! (took ${totalDuration}ms)`);
          
          // Record success in the attempt tracking - use our already defined attemptTracker
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'chrome.storage.success', 
              time: successTime,
              duration: totalDuration
            });
          }
          
          // Return the user keys
          let keys = keysData;
          
          // If salt is stored separately, add it to the keys object
          if (saltData && !keys.salt) {
            keys.salt = saltData;
          }
          
          // Make sure email is included
          if (!keys.email) {
            keys.email = userEmail;
          }
          
          sendResponse({
            success: true,
            keys: keys,
            source: 'chrome.storage',
            format: emailFormat,
            timestamp: successTime,
            duration: totalDuration
          });
          
          return;
        }
      } catch (storageError) {
        log(`Error checking chrome.storage for ${emailFormat}: ${storageError.message}`);
      }
      
      // If not found in chrome.storage, try localStorage
      try {
        log(`Checking localStorage for ${emailFormat}...`);
        const localStorageStartTime = Date.now();
        
        // Use our already defined attemptTracker for tracking
        if (attemptTracker) {
          attemptTracker.sources.push({ 
            type: 'localStorage.start', 
            time: localStorageStartTime 
          });
        }
        
        // Get MATA tabs
        const tabs = await getMataTabs();
        
        if (tabs.length === 0) {
          log('No MATA web app tabs found to access localStorage');
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'localStorage.no_tabs', 
              time: Date.now(),
              duration: Date.now() - localStorageStartTime
            });
          }
          continue;
        }
        
        // Try to get keys from localStorage via content script
        const response = await new Promise((resolve) => {
          chrome.tabs.sendMessage(
            tabs[0].id,
            { action: 'getLocalStorage', key: keysKey },
            (response) => {
              if (chrome.runtime.lastError) {
                resolve({ error: chrome.runtime.lastError.message });
              } else {
                resolve(response);
              }
            }
          );
        });
        
        // Update attempt with completion time
        if (attemptTracker) {
          attemptTracker.sources.push({ 
            type: 'localStorage.keys_request_complete', 
            time: Date.now(),
            duration: Date.now() - localStorageStartTime
          });
        }
        
        if (response.error) {
          log(`Error accessing localStorage for ${emailFormat}: ${response.error}`);
          // Track the localStorage error - use our attemptTracker
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'localStorage.error', 
              error: response.error,
              time: Date.now()
            });
          }
          continue;
        }
        
        if (response.success && response.value) {
          const successTime = Date.now();
          const totalDuration = successTime - localStorageStartTime;
          log(`Found keys for ${emailFormat} in localStorage! (took ${totalDuration}ms)`);
          
          // Record success in the attempt tracking using our attemptTracker
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'localStorage.keys_found', 
              time: successTime,
              duration: totalDuration
            });
          }
          
          // Parse the JSON if it's a string
          let keys;
          try {
            keys = typeof response.value === 'string' ? JSON.parse(response.value) : response.value;
          } catch (e) {
            log(`Error parsing keys for ${emailFormat}: ${e.message}`);
            if (attemptTracker) {
              attemptTracker.sources.push({ 
                type: 'localStorage.parse_error', 
                error: e.message,
                time: Date.now()
              });
            }
            continue;
          }
          
          // If we don't have salt in the keys, try to get it separately
          if (!keys.salt) {
            const saltResponse = await new Promise((resolve) => {
              chrome.tabs.sendMessage(
                tabs[0].id,
                { action: 'getLocalStorage', key: saltKey },
                (response) => {
                  if (chrome.runtime.lastError) {
                    resolve({ error: chrome.runtime.lastError.message });
                  } else {
                    resolve(response);
                  }
                }
              );
            });
            
            if (saltResponse.success && saltResponse.value) {
              try {
                // Try to parse the salt if it's a JSON string
                keys.salt = typeof saltResponse.value === 'string' ? 
                  (saltResponse.value.startsWith('{') ? JSON.parse(saltResponse.value) : saltResponse.value) : 
                  saltResponse.value;
              } catch (e) {
                // If parsing fails, use as-is
                keys.salt = saltResponse.value;
              }
            }
          }
          
          // Make sure email is included
          if (!keys.email) {
            keys.email = userEmail;
          }
          
          // Cache the keys in chrome.storage.local for future requests
          try {
            const storageData = {
              [keysKey]: keys
            };
            
            if (keys.salt) {
              storageData[saltKey] = keys.salt;
            }
            
            chrome.storage.local.set(storageData, () => {
              if (chrome.runtime.lastError) {
                log(`Error caching keys in chrome.storage: ${chrome.runtime.lastError.message}`);
              } else {
                log(`Successfully cached keys for ${emailFormat} in chrome.storage`);
              }
            });
          } catch (cacheError) {
            log(`Error preparing keys for caching: ${cacheError.message}`);
          }
          
          const responseTime = Date.now();
          const totalProcessingTime = responseTime - attemptStartTime;
          
          // Record final success in the attempt tracking
          if (attemptTracker) {
            attemptTracker.sources.push({ 
              type: 'localStorage.complete_success', 
              time: responseTime,
              totalDuration: totalProcessingTime
            });
          }
          
          sendResponse({
            success: true,
            keys: keys,
            source: 'localStorage',
            format: emailFormat,
            timestamp: responseTime,
            duration: totalProcessingTime
          });
          
          return;
        }
      } catch (localStorageError) {
        log(`Error checking localStorage for ${emailFormat}: ${localStorageError.message}`);
      }
    }
    
    // If we've tried all formats and still haven't found anything
    const failureTime = Date.now();
    const totalSearchTime = failureTime - startTime;
    
    log(`Could not find keys for user ${userEmail} in any storage or format after ${totalSearchTime}ms`);
    log('Attempted formats:', attempts);
    
    // Build a detailed diagnostic report
    const detailedAttempts = attempts.map(attempt => {
      return {
        format: attempt.format,
        keys: attempt.keysKey,
        salt: attempt.saltKey,
        duration: failureTime - attempt.startTime,
        sources: attempt.sources.map(s => ({
          type: s.type,
          time: s.time,
          duration: s.duration || null,
          error: s.error || null
        }))
      };
    });
    
    sendResponse({
      success: false,
      error: `Could not find keys for user ${userEmail}`,
      attempts: attempts.map(a => a.format),
      detailedAttempts: detailedAttempts,
      timestamp: failureTime,
      totalDuration: totalSearchTime
    });
  } catch (error) {
    logError('Error getting keys', error);
    sendResponse({ 
      success: false, 
      error: error.message,
      timestamp: Date.now() 
    });
  }
}

/**
 * Handle password requests (now managed by web application)
 * This function is maintained for backward compatibility with older popup code
 * @param {Object} message - The message containing the request data
 * @param {Function} sendResponse - Function to send response back to sender
 */
async function handleGetPasswords(message, sendResponse) {
  try {
    log('Password feature has been moved to the web application');
    log('Responding with empty passwords array for compatibility');
    
    // Simply return an empty array
    // Modern applications should use the web app to manage passwords
    sendResponse({
      success: true,
      passwords: [],
      message: 'Password management has been moved to the web application'
    });
  } catch (error) {
    logError('Error in handleGetPasswords', error);
    sendResponse({ 
      success: false, 
      error: error.message 
    });
  }
}

// Run initialization
initialize();