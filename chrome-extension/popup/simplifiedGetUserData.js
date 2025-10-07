/**
 * MATA Extension v1.7.2 - Simplified Data Retrieval Functions
 * 
 * This module provides simplified, more reliable implementations for 
 * critical data retrieval functions to address context invalidation
 * issues with the background service worker.
 * 
 * Updated in v1.7.2:
 * - Enhanced password retrieval via GET_PASSWORDS message type
 * - Added support for the new items array format in GET_PASSWORDS response
 * - Improved storage key handling and consistency
 * - Enhanced error handling and logging for better troubleshooting
 */

// Default values for different data types
const DEFAULT_VALUES = {
  'active_user': null,
  'salt': {},
  'keys': {},
  'bank_accounts': [],
  'passwords': [],
  'contacts': []
};

/**
 * Simplified getUserData implementation that prioritizes reliability over complexity
 * This function focuses on chrome.storage.local first and provides clear fallbacks
 * 
 * @param {string} email - The user email (optional for active_user)
 * @param {string} dataType - The type of data to retrieve (active_user, salt, keys, etc.)
 * @param {boolean} forceSync - Whether to force a sync with the web app (default: false)
 * @returns {Promise<any>} The requested data (object, array, or string depending on data type)
 */
async function getSimplifiedUserData(email, dataType, forceSync = false) {
  // Special case for active_user - if no email is provided, we're trying to get the active user itself
  if (dataType === 'active_user' && !email) {
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting active user with simplified approach...`);
      
      // First try chrome.storage.local directly
      const activeUserFromStorage = await new Promise(resolve => {
        chrome.storage.local.get(['mata_active_user'], result => {
          resolve(result.mata_active_user || null);
        });
      });
      
      if (activeUserFromStorage) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user in chrome.storage:`, activeUserFromStorage);
        return activeUserFromStorage;
      }
      
      // Second, try localStorage through background.js
      const localStorageResponse = await sendMessageToBackground({ 
        type: 'GET_LOCAL_STORAGE_VALUE',
        key: 'mata_active_user'
      });
      
      if (localStorageResponse?.success && localStorageResponse?.value) {
        const active_user = localStorageResponse.value;
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user in localStorage:`, active_user);
        
        // Save this to chrome.storage for future use
        await new Promise(resolve => {
          chrome.storage.local.set({ 'mata_active_user': active_user }, resolve);
        });
        
        return active_user;
      }
      
      // If we've reached here, no active user was found
      // STRICT USER ISOLATION: Don't automatically select a user anymore
      try {
        const accountsResponse = await sendMessageToBackground({
          type: 'LIST_ACCOUNTS'
        });
        
        if (accountsResponse?.success && accountsResponse?.accounts && accountsResponse.accounts.length > 0) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${accountsResponse.accounts.length} accounts, but enforcing STRICT ISOLATION - no fallback to first available user.`);
          // We intentionally don't set or return any active user to enforce strict isolation
        }
        
        // Last resort: try FIND_ALL_USERS just to log how many users exist
        const usersResponse = await sendMessageToBackground({
          type: 'FIND_ALL_USERS'
        });
        
        if (usersResponse?.success && usersResponse?.users && usersResponse.users.length > 0) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${usersResponse.users.length} users through FIND_ALL_USERS, but enforcing STRICT ISOLATION - no automatic selection.`);
          // We intentionally don't set or return any active user to enforce strict isolation
        }
      } catch (error) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error finding any users:`, error);
      }
      
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No active user found with simplified approach, returning null`);
      return null;
    } catch (error) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in active user retrieval:`, error);
      return null;
    }
  }
  
  // For all other data types, an email is required
  if (!email) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Cannot get ${dataType}: No email provided`);
    return DEFAULT_VALUES[dataType] || [];
  }
  
  try {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting ${dataType} for ${email} with simplified approach...`);
    
    // Generate storage keys in both formats for compatibility
    // Use the same sanitization logic as popup.js for consistency
    const sanitizedEmail = email.replace('@', '_').replace(/\./g, '_');
    const mataStorageKey = `mata_${sanitizedEmail}_${dataType === 'bank_accounts' ? 'bankaccounts' : dataType}`;
    const legacyStorageKey = `user_${email}_${dataType}`;
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for ${dataType} using keys:`, {
      mataKey: mataStorageKey,
      legacyKey: legacyStorageKey
    });
    
    // First try chrome.storage.local
    const storageResult = await new Promise(resolve => {
      chrome.storage.local.get([mataStorageKey, legacyStorageKey], result => {
        resolve(result);
      });
    });
    
    // Try mata key first
    if (storageResult && storageResult[mataStorageKey]) {
      const data = storageResult[mataStorageKey];
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with mata key`);
      
      if (dataType === 'keys' || dataType === 'salt') {
        return data; // For keys and salt, just return the object directly
      } else if (Array.isArray(data)) {
        return data; // For arrays (passwords, contacts, etc.), return the array
      }
    }
    
    // Then legacy key
    if (storageResult && storageResult[legacyStorageKey]) {
      const data = storageResult[legacyStorageKey];
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with legacy key`);
      
      if (dataType === 'keys' || dataType === 'salt') {
        return data; // For keys and salt, just return the object directly
      } else if (Array.isArray(data)) {
        return data; // For arrays (passwords, contacts, etc.), return the array
      }
    }
    
    // If we need to force sync or didn't find the data, try direct API call
    if (forceSync || (!storageResult[mataStorageKey] && !storageResult[legacyStorageKey])) {
      // For keys, use GET_KEYS message type
      if (dataType === 'keys') {
        const keysResponse = await sendMessageToBackground({
          type: 'GET_KEYS',
          email: email
        });
        
        if (keysResponse && keysResponse.keys) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Got keys using direct GET_KEYS API`);
          return keysResponse.keys;
        }
      } 
      // For passwords, use the backward-compatible GET_PASSWORDS handler
      else if (dataType === 'passwords') {
        const passwordsResponse = await sendMessageToBackground({
          type: 'GET_PASSWORDS',
          email: email
        });
        
        if (passwordsResponse && passwordsResponse.items && Array.isArray(passwordsResponse.items)) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Got passwords array using direct GET_PASSWORDS API`);
          return passwordsResponse.items;
        }
      }
    }
    
    // If all attempts failed, return default values
    console.warn(`[DEBUG v${window.EXTENSION_VERSION}] All attempts to get ${dataType} failed, returning default value`);
    return DEFAULT_VALUES[dataType] || [];
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error getting ${dataType}:`, error);
    return DEFAULT_VALUES[dataType] || [];
  }
}

/**
 * Simplified getActiveUserEmail implementation that uses the simplified getUserData function
 * This provides a more reliable way to get the active user email
 * 
 * @returns {Promise<string|null>} The active user email or null if not found
 */
async function getSimplifiedActiveUserEmail() {
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting active user email with simplified implementation...`);
  return await getSimplifiedUserData(null, 'active_user');
}

// Export the functions for use in other modules
window.getSimplifiedUserData = getSimplifiedUserData;
window.getSimplifiedActiveUserEmail = getSimplifiedActiveUserEmail;