/**
 * MATA Extension - Content Script
 * 
 * This script runs in the context of web pages matching the URL patterns
 * defined in the manifest.json file. It facilitates communication between
 * the web page and the extension.
 * 
 * Primary responsibilities:
 * 1. Provide access to localStorage from the extension
 * 2. Allow the web app to detect if the extension is installed
 * 3. Handle communication between web app and extension
 * 4. Sync critical encryption files between localStorage and chrome.storage
 */

// Constants for app communication
const EXTENSION_CONNECTED_FLAG = 'mata_extension_connected';
const MATA_APP_EVENT = 'MATA_APP_EVENT';
const EXTENSION_RESPONSE_EVENT = 'MATA_EXTENSION_RESPONSE';

// Initialize - add flags to window, fix for broken extension communication
(function initialize() {
  console.log('[MATA Extension] Initializing on:', window.location.href);
  
  try {
    // Add a flag to window to let web app know extension is installed
    window[EXTENSION_CONNECTED_FLAG] = true;
    
    // Add extension ID to window for easy access from web app
    window.MATA_EXTENSION_ID = chrome.runtime.id;
    
    // Add other flags to improve detection reliability
    window._mataExtensionInstalled = true;
    window._mataExtensionTimestamp = Date.now();
    
    // Immediately check for active user and keys in localStorage and cache them
    // This fixes the critical issue with active user and keys retrieval
    try {
      // First, cache the active user
      const activeUser = localStorage.getItem('mata_active_user');
      if (activeUser) {
        console.log('[MATA Extension] Found active user in localStorage:', activeUser);
        window._mataActiveUser = activeUser;
        
        // Cache the keys and salt for the active user
        const sanitizedEmail = activeUser.replace(/[@.]/g, '_');
        const keysKey = `mata_keys_${sanitizedEmail}`;
        const saltKey = `mata_salt_${sanitizedEmail}`;
        
        // Initialize our caches
        window._mataLocalKeys = window._mataLocalKeys || {};
        window._mataLocalSalts = window._mataLocalSalts || {};
        
        // Get and cache keys
        const keysStr = localStorage.getItem(keysKey);
        if (keysStr) {
          try {
            const keys = JSON.parse(keysStr);
            window._mataLocalKeys[keysKey] = keys;
            console.log('[MATA Extension] Cached keys for active user:', sanitizedEmail);
          } catch (e) {
            console.warn('[MATA Extension] Error parsing keys for active user:', e);
            // Still save the raw string
            window._mataLocalKeys[keysKey] = keysStr;
          }
        }
        
        // Get and cache salt
        const saltStr = localStorage.getItem(saltKey);
        if (saltStr) {
          window._mataLocalSalts[saltKey] = saltStr;
          console.log('[MATA Extension] Cached salt for active user:', sanitizedEmail);
        }
        
        // Immediately sync this to chrome.storage for better reliability
        chrome.runtime.sendMessage({ 
          type: 'SET_LOCAL_STORAGE_VALUE',
          key: 'mata_active_user',
          value: activeUser
        }, response => {
          console.log('[MATA Extension] Active user synced to chrome.storage:', response);
        });
        
        // Also sync keys and salt
        if (keysStr) {
          chrome.runtime.sendMessage({ 
            type: 'SET_LOCAL_STORAGE_VALUE',
            key: keysKey,
            value: keysStr
          });
        }
        
        if (saltStr) {
          chrome.runtime.sendMessage({ 
            type: 'SET_LOCAL_STORAGE_VALUE',
            key: saltKey,
            value: saltStr
          });
        }
      } else {
        console.log('[MATA Extension] No active user found in localStorage');
      }
    } catch (userError) {
      console.warn('[MATA Extension] Error accessing active user:', userError);
    }
    
    // Setup a heartbeat to keep the service worker alive
    window._mataExtensionHeartbeatInterval = setInterval(() => {
      try {
        // First check if chrome.runtime is available
        if (!chrome.runtime) {
          console.warn('[MATA Extension] Runtime not available during heartbeat');
          // Mark as disconnected
          window._mataExtensionConnected = false;
          localStorage.setItem('mata_extension_connected', 'false');
          // Try to reconnect
          dispatchExtensionReadyEvent();
          return;
        }
        
        // Send a heartbeat message to keep the service worker alive
        chrome.runtime.sendMessage({ 
          type: 'HEARTBEAT', 
          timestamp: Date.now(),
          url: window.location.href,
          connectionStatus: window._mataExtensionConnected
        }, (response) => {
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message;
            console.warn('[MATA Extension] Heartbeat error:', errorMessage);
            
            // Mark as disconnected
            window._mataExtensionConnected = false;
            try {
              localStorage.setItem('mata_extension_connected', 'false');
              localStorage.setItem('mata_extension_last_error', errorMessage);
              localStorage.setItem('mata_extension_error_timestamp', Date.now().toString());
            } catch (e) {
              // Not critical if this fails
            }
            
            // Check for context invalidation
            const isContextInvalidated = errorMessage.includes('Extension context invalidated') || 
                                        errorMessage.includes('context invalidated');
            
            if (isContextInvalidated) {
              console.log('[MATA Extension] Context invalidated detected in heartbeat, attempting recovery...');
              // Try to reestablish connection
              dispatchExtensionReadyEvent();
              // Also try to sync critical files after a short delay
              setTimeout(syncCriticalFiles, 1000);
            } else {
              // For other errors just try to reconnect
              dispatchExtensionReadyEvent();
            }
          } else if (response && response.success) {
            // Update timestamp
            window._mataExtensionLastHeartbeat = Date.now();
            // Update flags in window
            window._mataExtensionConnected = true;
            window._mataExtensionTimestamp = Date.now();
            
            // Store the active extension status in localStorage as a backup
            try {
              localStorage.setItem('mata_extension_connected', 'true');
              localStorage.setItem('mata_extension_timestamp', Date.now().toString());
              localStorage.removeItem('mata_extension_last_error');
            } catch (e) {
              // Not critical if this fails
            }
            
            // If we were previously disconnected, run a sync
            if (!window._mataLastConnectionStatus && window._mataExtensionConnected) {
              console.log('[MATA Extension] Connection restored, syncing critical files');
              setTimeout(syncCriticalFiles, 500);
            }
            
            // Record last status for comparison on next heartbeat
            window._mataLastConnectionStatus = window._mataExtensionConnected;
          }
        });
      } catch (e) {
        console.error('[MATA Extension] Error in heartbeat:', e);
        
        // Check if this is a context invalidation error
        const isContextInvalidated = e.message.includes('Extension context invalidated') || 
                                    e.message.includes('context invalidated');
        
        // Mark as disconnected
        window._mataExtensionConnected = false;
        
        try {
          localStorage.setItem('mata_extension_connected', 'false');
          localStorage.setItem('mata_extension_last_error', e.message);
          localStorage.setItem('mata_extension_error_timestamp', Date.now().toString());
        } catch (localStorageError) {
          // Not critical if this fails
        }
        
        if (isContextInvalidated) {
          console.log('[MATA Extension] Context invalidation exception in heartbeat, attempting recovery...');
          // Try to reestablish connection
          setTimeout(() => {
            dispatchExtensionReadyEvent();
            // Also try to sync critical files again after a short delay
            setTimeout(syncCriticalFiles, 1000);
          }, 500);
        } else {
          // For other errors just try a simple reconnect
          dispatchExtensionReadyEvent();
        }
      }
    }, 15000); // Send heartbeat every 15 seconds to keep service worker alive (reduced from 25s)
    
    console.log('[MATA Extension] Set extension flags:', {
      [EXTENSION_CONNECTED_FLAG]: true,
      MATA_EXTENSION_ID: chrome.runtime.id,
      _mataExtensionInstalled: true,
      _mataExtensionTimestamp: Date.now()
    });
    
    // Also dispatch an event when extension is ready
    dispatchExtensionReadyEvent();
  } catch (error) {
    console.error('[MATA Extension] Error during initialization:', error);
  }
  
  // Function to dispatch extension ready event
  function dispatchExtensionReadyEvent() {
    try {
      // Check if runtime is available
      if (!chrome.runtime) {
        console.warn('[MATA Extension] Cannot dispatch ready event - runtime not available');
        // Mark as disconnected
        window._mataExtensionConnected = false;
        try {
          localStorage.setItem('mata_extension_connected', 'false');
          localStorage.setItem('mata_extension_last_error', 'Runtime not available during ready event');
        } catch (e) {
          // Non-critical if this fails
        }
        return;
      }
      
      // Get current extension info
      let extensionInfo = {};
      try {
        extensionInfo = {
          version: chrome.runtime.getManifest().version,
          id: chrome.runtime.id,
          timestamp: new Date().toISOString(),
          url: window.location.href,
          recoveryAttempt: window._mataExtensionRecoveryAttempts || 0
        };
        
        // Increment recovery counter
        window._mataExtensionRecoveryAttempts = (window._mataExtensionRecoveryAttempts || 0) + 1;
      } catch (infoError) {
        console.error('[MATA Extension] Failed to get extension info:', infoError);
        extensionInfo = {
          timestamp: new Date().toISOString(),
          url: window.location.href,
          error: infoError.message,
          recoveryAttempt: window._mataExtensionRecoveryAttempts || 0
        };
      }
      
      // Dispatch event to notify web app
      window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
        detail: { 
          type: 'EXTENSION_READY',
          success: true,
          data: extensionInfo
        }
      }));
      
      // Update connection status
      window._mataExtensionConnected = true;
      window._mataExtensionTimestamp = Date.now();
      
      // Store connection info in localStorage as backup
      try {
        localStorage.setItem('mata_extension_connected', 'true');
        localStorage.setItem('mata_extension_timestamp', Date.now().toString());
        localStorage.setItem('mata_extension_recovery_attempts', String(window._mataExtensionRecoveryAttempts || 0));
      } catch (storageError) {
        // Non-critical if this fails
      }
      
      console.log('[MATA Extension] Dispatched EXTENSION_READY event:', extensionInfo);
      
      // Also attempt a storage sync after reconnection
      try {
        // Sync after a short delay to allow background script to initialize
        setTimeout(() => {
          console.log('[MATA Extension] Triggering critical files sync after reconnection');
          syncCriticalFiles();
        }, 1000);
      } catch (syncError) {
        console.error('[MATA Extension] Failed to trigger sync after reconnection:', syncError);
      }
    } catch (eventError) {
      console.error('[MATA Extension] Failed to dispatch ready event:', eventError);
      
      // Mark as disconnected but still try to recover
      window._mataExtensionConnected = false;
      try {
        localStorage.setItem('mata_extension_connected', 'false');
        localStorage.setItem('mata_extension_last_error', eventError.message);
      } catch (e) {
        // Non-critical if this fails
      }
    }
  }
})();

// Set up communication with the background script
setupListeners();

// Special marker to indicate extension is present
injectExtensionMarker();

// Perform sync of critical files on page load
syncCriticalFiles();

// Set up periodic context validation checks to catch invalidation early
setInterval(() => {
  try {
    // Simple check if runtime exists and we can access manifest
    if (!chrome.runtime) {
      console.warn('[MATA Extension] Periodic check: Runtime not available');
      window._mataExtensionConnected = false;
      dispatchExtensionReadyEvent();
      return;
    }
    
    // Try to access runtime to see if context is valid
    try {
      const id = chrome.runtime.id;
      const manifest = chrome.runtime.getManifest();
      
      // If we get here, context is valid
      if (!window._mataExtensionConnected) {
        console.log('[MATA Extension] Periodic check: Connection restored');
        window._mataExtensionConnected = true;
        dispatchExtensionReadyEvent();
        setTimeout(syncCriticalFiles, 500);
      }
    } catch (runtimeError) {
      console.warn('[MATA Extension] Periodic check: Runtime error:', runtimeError.message);
      
      // Check if this is a context invalidation error
      const isContextInvalidated = runtimeError.message.includes('Extension context invalidated') || 
                                  runtimeError.message.includes('context invalidated');
      
      if (isContextInvalidated || !window._mataExtensionConnected) {
        console.log('[MATA Extension] Periodic check: Context invalid, attempting recovery');
        window._mataExtensionConnected = false;
        dispatchExtensionReadyEvent();
      }
    }
  } catch (error) {
    console.error('[MATA Extension] Error in periodic context check:', error);
  }
}, 10000); // Check every 10 seconds

/**
 * Set up event listeners for messaging
 */
function setupListeners() {
  // Listen for messages from the extension's background script
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    console.log('[MATA Extension] Content script received message:', message.action);
    
    try {
      // Handle different message types from background script
      switch (message.action) {
        case 'getLocalStorage':
          const storedValue = localStorage.getItem(message.key);
          sendResponse({ 
            success: true, 
            value: storedValue,
            valueExists: storedValue !== null,
            timestamp: Date.now()
          });
          break;
          
        case 'setLocalStorage':
          localStorage.setItem(message.key, message.value);
          sendResponse({ 
            success: true,
            timestamp: Date.now()
          });
          break;
          
        case 'removeLocalStorage':
          localStorage.removeItem(message.key);
          sendResponse({ 
            success: true,
            timestamp: Date.now()
          });
          break;
          
        case 'getAllLocalStorage':
          const allStorage = {};
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            allStorage[key] = localStorage.getItem(key);
          }
          sendResponse({ 
            success: true, 
            storage: allStorage,
            timestamp: Date.now()
          });
          break;
          
        case 'findAllUserEmails':
          try {
            // Use the existing function to find all user emails
            const usersList = findAllUserEmails();
            
            // Transform from Set to Array if needed
            const usersArray = Array.from(usersList);
            
            // Log what we found for debugging
            console.log(`[MATA Extension] Found ${usersArray.length} users in localStorage: ${usersArray.join(', ')}`);
            
            // Try to convert sanitized emails back to original format if possible
            const unsanitizedUsers = usersArray.map(user => {
              // Replace underscores with @ and . if they look like sanitized emails
              if (user.includes('_')) {
                try {
                  // Basic heuristic: if it has underscores and looks like email pattern
                  const parts = user.split('_');
                  if (parts.length >= 3) { // likely has at least one @ and one .
                    let email = '';
                    for (let i = 0; i < parts.length; i++) {
                      if (i === 0) {
                        email += parts[i]; // first part
                      } else if (i === 1) {
                        email += '@' + parts[i]; // second part after @
                      } else {
                        email += '.' + parts[i]; // remaining parts after dots
                      }
                    }
                    
                    // Very basic validation that it looks email-ish
                    if (email.includes('@') && email.includes('.')) {
                      return email;
                    }
                  }
                } catch (e) {
                  // If unsanitization fails, just return the original
                  console.warn('[MATA Extension] Error unsanitizing email:', e);
                }
              }
              return user; // return as-is if not sanitized or unsanitization fails
            });
            
            sendResponse({ 
              success: true, 
              users: unsanitizedUsers,
              sanitizedUsers: usersArray,
              timestamp: Date.now()
            });
          } catch (findUsersError) {
            console.error('[MATA Extension] Error finding user emails:', findUsersError);
            sendResponse({ 
              success: false, 
              error: findUsersError.message,
              timestamp: Date.now()
            });
          }
          break;
          
        case 'triggerCriticalSync':
          // Run the sync of critical files
          syncCriticalFiles();
          sendResponse({ 
            success: true, 
            message: 'Sync initiated',
            timestamp: Date.now()
          });
          break;
          
        default:
          sendResponse({ 
            success: false, 
            error: `Unknown action: ${message.action}`,
            timestamp: Date.now()
          });
      }
    } catch (error) {
      console.error('[MATA Extension] Error handling message:', error);
      sendResponse({ 
        success: false, 
        error: error.message,
        timestamp: Date.now()
      });
    }
    
    // Return true to indicate we will send a response asynchronously
    return true;
  });

  // Listen for messages from the web app via custom events
  window.addEventListener('message', (event) => {
    // Only accept messages from the same origin (the web app)
    if (event.source != window) return;
    
    // Check if the message is for our extension
    if (!event.data || !event.data.type || !event.data.type.startsWith('MATA_EXTENSION_')) {
      return;
    }
    
    console.log('[MATA Extension] Content script received web message:', event.data.type);
    
    // Relay messages to the background script
    try {
      const requestId = event.data.requestId;
      
      // Check if context is valid before sending message
      if (!chrome.runtime) {
        console.error('[MATA Extension] Chrome runtime not available');
        window.postMessage({
          type: 'MATA_EXTENSION_RESPONSE',
          requestId: requestId,
          success: false,
          error: 'Extension runtime not available',
          errorCode: 'RUNTIME_UNAVAILABLE'
        }, '*');
        
        // Try to reinitialize the extension
        setTimeout(() => {
          console.log('[MATA Extension] Attempting to reinitialize after runtime error');
          dispatchExtensionReadyEvent();
        }, 500);
        return;
      }
      
      try {
        chrome.runtime.sendMessage(event.data, (response) => {
          // Check for errors
          if (chrome.runtime.lastError) {
            const errorMessage = chrome.runtime.lastError.message;
            console.error('[MATA Extension] Error sending message to background:', errorMessage);
            
            // Check for context invalidation specifically
            const isContextInvalidated = errorMessage.includes('Extension context invalidated') || 
                                        errorMessage.includes('context invalidated');
            
            window.postMessage({
              type: 'MATA_EXTENSION_RESPONSE',
              requestId: requestId,
              success: false,
              error: errorMessage,
              errorCode: isContextInvalidated ? 'CONTEXT_INVALIDATED' : 'RUNTIME_ERROR'
            }, '*');
            
            // If context was invalidated, attempt recovery
            if (isContextInvalidated) {
              console.log('[MATA Extension] Context invalidated, attempting recovery...');
              // Reset flags
              window._mataExtensionConnected = false;
              
              // Try to reestablish connection
              setTimeout(() => {
                console.log('[MATA Extension] Attempting to reconnect after context invalidation');
                dispatchExtensionReadyEvent();
                // Also try to sync critical files again after a short delay
                setTimeout(syncCriticalFiles, 1000);
              }, 500);
            }
            return;
          }
          
          // Forward the response back to the web app
          window.postMessage({
            type: 'MATA_EXTENSION_RESPONSE',
            requestId: requestId,
            ...response
          }, '*');
        });
      } catch (sendError) {
        console.error('[MATA Extension] Exception sending message to background:', sendError);
        
        // Check if this is a context invalidation error
        const isContextInvalidated = sendError.message.includes('Extension context invalidated') || 
                                    sendError.message.includes('context invalidated');
        
        window.postMessage({
          type: 'MATA_EXTENSION_RESPONSE',
          requestId: requestId,
          success: false,
          error: sendError.message,
          errorCode: isContextInvalidated ? 'CONTEXT_INVALIDATED' : 'SEND_ERROR'
        }, '*');
        
        // If context was invalidated, attempt recovery
        if (isContextInvalidated) {
          console.log('[MATA Extension] Context invalidated exception, attempting recovery...');
          // Reset flags
          window._mataExtensionConnected = false;
          
          // Try to reestablish connection
          setTimeout(() => {
            console.log('[MATA Extension] Attempting to reconnect after context invalidation exception');
            dispatchExtensionReadyEvent();
            // Also try to sync critical files again after a short delay
            setTimeout(syncCriticalFiles, 1000);
          }, 500);
        }
      }
    } catch (error) {
      console.error('[MATA Extension] Error handling web message:', error);
      
      // Send error response back to web app
      if (event.data.requestId) {
        window.postMessage({
          type: 'MATA_EXTENSION_RESPONSE',
          requestId: event.data.requestId,
          success: false,
          error: error.message,
          errorCode: 'PROCESSING_ERROR'
        }, '*');
      }
    }
  });
  
  // Listen for the MATA_APP_EVENT from the web app
  window.addEventListener(MATA_APP_EVENT, function(event) {
    // Extract message data from custom event
    const customEvent = /** @type {CustomEvent} */ (event);
    const detail = customEvent.detail;
    
    if (!detail || !detail.type) {
      console.error('[MATA Extension] Received MATA_APP_EVENT without type');
      return;
    }
    
    console.log(`[MATA Extension] Received app event: ${detail.type}`, { 
      detail, 
      dataType: typeof detail.data,
      hasData: !!detail.data,
      dataKeys: detail.data ? Object.keys(detail.data) : [],
      hasNestedKeys: detail.data && detail.data.keys,
      hasEmail: detail.data && detail.data.email,
      nestedEmail: detail.data && detail.data.keys && detail.data.keys.email,
      stringified: JSON.stringify(detail).substring(0, 500) // limit size
    });
    
    // Every time we get an event from app, update connection timestamp
    try {
      localStorage.setItem('extension_last_active', Date.now().toString());
    } catch (e) {
      // Non-critical if this fails
    }
    
    // Process the message
    try {
      const requestId = detail.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Check if we can handle certain requests directly for better performance
      // GET_KEYS - Direct handler to bypass the background script
      if (detail.type === 'GET_KEYS') {
        // First, determine which email to use
        let email = null;
        
        // Try to get email from message data
        if (detail.data && detail.data.email) {
          email = detail.data.email;
        } else {
          // Try to get active user from localStorage or window cache
          const activeUser = window._mataActiveUser || localStorage.getItem('mata_active_user');
          if (activeUser) {
            email = activeUser;
            console.log('[MATA Extension] Using active user for keys:', email);
          }
        }
        
        if (email) {
          const sanitizedEmail = email.replace(/[@.]/g, '_');
          const keysKey = `mata_keys_${sanitizedEmail}`;
          const saltKey = `mata_salt_${sanitizedEmail}`;

          // Refreshed cache
          try {
            // Initialize cache if needed
            window._mataLocalKeys = window._mataLocalKeys || {};
            window._mataLocalSalts = window._mataLocalSalts || {};
            
            // Get keys from localStorage directly
            const keysStr = localStorage.getItem(keysKey);
            if (keysStr) {
              console.log('[MATA Extension] Found keys in localStorage for', sanitizedEmail);
              try {
                // Try to parse as JSON
                window._mataLocalKeys[keysKey] = JSON.parse(keysStr);
              } catch (e) {
                // Store as string if parsing fails
                window._mataLocalKeys[keysKey] = keysStr;
              }
            }
            
            // Get salt from localStorage
            const saltStr = localStorage.getItem(saltKey);
            if (saltStr) {
              console.log('[MATA Extension] Found salt in localStorage for', sanitizedEmail);
              window._mataLocalSalts[saltKey] = saltStr;
            }
          } catch (cacheError) {
            console.warn('[MATA Extension] Error refreshing key cache:', cacheError);
          }
          
          // Try window cache now - it may have just been refreshed
          if (window._mataLocalKeys && window._mataLocalKeys[keysKey]) {
            console.log('[MATA Extension] Responding directly with cached keys for GET_KEYS');
            
            // Prepare keys with salt included
            let keys = window._mataLocalKeys[keysKey];
            
            // If we have a salt in a separate cache, add it to the keys
            if (window._mataLocalSalts && window._mataLocalSalts[saltKey] && 
                (typeof keys === 'object') && !keys.salt) {
              keys = { 
                ...keys, 
                salt: window._mataLocalSalts[saltKey]
              };
            }
            
            window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
              detail: {
                requestId,
                success: true,
                keys: keys,
                source: 'direct_content_script'
              }
            }));
            console.log('[MATA Extension] GET_KEYS successfully handled by content script');
            return;
          }
          
          // Try direct localStorage as a second fallback
          const storedKeysStr = localStorage.getItem(keysKey);
          if (storedKeysStr) {
            try {
              const storedKeys = JSON.parse(storedKeysStr);
              console.log('[MATA Extension] Using direct localStorage keys');
              
              // Get salt to include if available
              const storedSalt = localStorage.getItem(saltKey);
              const keysWithSalt = storedSalt && typeof storedKeys === 'object' && !storedKeys.salt 
                ? { ...storedKeys, salt: storedSalt } 
                : storedKeys;
              
              window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                detail: {
                  requestId,
                  success: true,
                  keys: keysWithSalt,
                  source: 'direct_localStorage'
                }
              }));
              console.log('[MATA Extension] GET_KEYS successfully handled from localStorage');
              return;
            } catch (e) {
              console.error('[MATA Extension] Error parsing localStorage keys:', e);
            }
          }
          
          // If we have an email but no keys found, attempt to look for keys in alternate formats
          const alternateFormats = [
            email,                                 // original email as-is
            email.replace(/[^a-zA-Z0-9]/g, '_'),  // all non-alphanumeric replaced with _
            email.toLowerCase().trim()             // lowercased and trimmed
          ];
          
          for (const format of alternateFormats) {
            const altKey = `mata_keys_${format}`;
            if (altKey === keysKey) continue; // Skip if same as the original
            
            // Try window cache
            if (window._mataLocalKeys && window._mataLocalKeys[altKey]) {
              console.log(`[MATA Extension] Found keys in alternate format: ${format}`);
              window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                detail: {
                  requestId,
                  success: true,
                  keys: window._mataLocalKeys[altKey],
                  source: 'alternate_format_window_cache'
                }
              }));
              return;
            }
            
            // Try localStorage
            const altStoredStr = localStorage.getItem(altKey);
            if (altStoredStr) {
              try {
                const altStored = JSON.parse(altStoredStr);
                console.log(`[MATA Extension] Found keys in alternate localStorage format: ${format}`);
                window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                  detail: {
                    requestId,
                    success: true,
                    keys: altStored,
                    source: 'alternate_format_localStorage'
                  }
                }));
                return;
              } catch (e) {
                console.error(`[MATA Extension] Error parsing alternate keys for ${format}:`, e);
              }
            }
          }
        }
        
        // If we reach here, we couldn't handle the GET_KEYS request directly
        console.log('[MATA Extension] Could not handle GET_KEYS directly, forwarding to background');
      }
      
      // Handle GET_LOCAL_STORAGE_VALUE directly
      if (detail.type === 'GET_LOCAL_STORAGE_VALUE' && detail.messageData && detail.messageData.key) {
        const key = detail.messageData.key;
        console.log(`[MATA Extension] Direct handling GET_LOCAL_STORAGE_VALUE for ${key}`);
        
        // Handle direct localStorage access for critical values
        if (key === 'mata_active_user' && window._mataActiveUser !== undefined) {
          console.log('[MATA Extension] Using cached active user value:', window._mataActiveUser);
          window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
            detail: {
              requestId,
              success: true,
              value: window._mataActiveUser,
              source: 'direct_access'
            }
          }));
          return;
        }
        
        // Handle direct access for keys
        if (key.startsWith('mata_keys_') && window._mataLocalKeys && window._mataLocalKeys[key]) {
          console.log('[MATA Extension] Using cached keys from window object');
          window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
            detail: {
              requestId,
              success: true,
              value: JSON.stringify(window._mataLocalKeys[key]),
              source: 'direct_access'
            }
          }));
          return;
        }
        
        // Handle direct access for salts
        if (key.startsWith('mata_salt_') && window._mataLocalSalts && window._mataLocalSalts[key]) {
          console.log('[MATA Extension] Using cached salt from window object');
          window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
            detail: {
              requestId,
              success: true,
              value: window._mataLocalSalts[key],
              source: 'direct_access'
            }
          }));
          return;
        }
        
        // If not in window cache, try localStorage
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) {
          console.log('[MATA Extension] Using direct localStorage access for:', key);
          window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
            detail: {
              requestId,
              success: true,
              value: storedValue,
              source: 'direct_localStorage'
            }
          }));
          return;
        }
      }
      
      // Forward the message to the background script
      console.log('[MATA Extension] Preparing message to send to background:', {
        type: detail.type,
        requestId,
        dataType: typeof detail.data,
        directEmail: detail.data && detail.data.email,
        hasKeys: detail.data && detail.data.keys,
        nestedEmail: detail.data && detail.data.keys && detail.data.keys.email,
        dataKeys: detail.data ? Object.keys(detail.data) : []
      });
      
      try {
        // If this is STORE_KEYS, make sure we extract the email from the nested structure
        if (detail.type === 'STORE_KEYS' && detail.data && detail.data.keys && detail.data.keys.email) {
          console.log('[MATA Extension] Extracting email from nested keys for STORE_KEYS');
          
          // Store keys directly in window cache to ensure they're available immediately
          try {
            const email = detail.data.keys.email;
            const sanitizedEmail = email.replace(/[@.]/g, '_');
            const keysKey = `mata_keys_${sanitizedEmail}`;
            window._mataLocalKeys = window._mataLocalKeys || {};
            window._mataLocalKeys[keysKey] = detail.data.keys;
            console.log('[MATA Extension] Cached keys in window for:', keysKey);
          } catch (e) {
            console.error('[MATA Extension] Error caching keys in window:', e);
          }
          
          // Explicitly add the email at the top level to avoid the "No email provided" error
          chrome.runtime.sendMessage({
            ...detail,
            email: detail.data.keys.email, // Extract email from nested structure
            requestId
          }, (response) => {
            // Handle response from background script
            if (chrome.runtime.lastError) {
              console.error('[MATA Extension] Error from background:', chrome.runtime.lastError);
              
              // Try to respond anyway with the keys we cached
              if (window._mataLocalKeys) {
                const email = detail.data.keys.email;
                const sanitizedEmail = email.replace(/[@.]/g, '_');
                const keysKey = `mata_keys_${sanitizedEmail}`;
                
                if (window._mataLocalKeys[keysKey]) {
                  console.log('[MATA Extension] Background error, but responding with cached keys');
                  window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                    detail: {
                      requestId,
                      success: true,
                      source: 'window_cache_fallback'
                    }
                  }));
                  return;
                }
              }
              
              // Dispatch error response event
              window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                detail: {
                  requestId,
                  success: false,
                  error: chrome.runtime.lastError.message,
                  errorSource: 'background'
                }
              }));
              return;
            }
            
            // Dispatch success response event
            window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
              detail: {
                ...response,
                requestId
              }
            }));
          });
        } else {
          // Handle all other message types
          console.log('[MATA Extension] Sending standard message to background');
          chrome.runtime.sendMessage({
            ...detail,
            requestId
          }, (response) => {
            // Handle response from background script
            if (chrome.runtime.lastError) {
              console.error('[MATA Extension] Error from background:', chrome.runtime.lastError);
              
              // For GET_KEYS, try to directly handle it from the content script first
              if (detail.type === 'GET_KEYS') {
                // First, determine which email to use
                let email = null;
                
                // Try to get email from message data
                if (detail.data && detail.data.email) {
                  email = detail.data.email;
                } else {
                  // Try to get active user from localStorage or window cache
                  const activeUser = window._mataActiveUser || localStorage.getItem('mata_active_user');
                  if (activeUser) {
                    email = activeUser;
                    console.log('[MATA Extension] Using active user for keys:', email);
                  }
                }
                
                if (email) {
                  const sanitizedEmail = email.replace(/[@.]/g, '_');
                  const keysKey = `mata_keys_${sanitizedEmail}`;
                  const saltKey = `mata_salt_${sanitizedEmail}`;

                  // Refreshed cache
                  try {
                    // Initialize cache if needed
                    window._mataLocalKeys = window._mataLocalKeys || {};
                    window._mataLocalSalts = window._mataLocalSalts || {};
                    
                    // Get keys from localStorage directly
                    const keysStr = localStorage.getItem(keysKey);
                    if (keysStr) {
                      console.log('[MATA Extension] Found keys in localStorage for', sanitizedEmail);
                      try {
                        // Try to parse as JSON
                        window._mataLocalKeys[keysKey] = JSON.parse(keysStr);
                      } catch (e) {
                        // Store as string if parsing fails
                        window._mataLocalKeys[keysKey] = keysStr;
                      }
                    }
                    
                    // Get salt from localStorage
                    const saltStr = localStorage.getItem(saltKey);
                    if (saltStr) {
                      console.log('[MATA Extension] Found salt in localStorage for', sanitizedEmail);
                      window._mataLocalSalts[saltKey] = saltStr;
                    }
                  } catch (cacheError) {
                    console.warn('[MATA Extension] Error refreshing key cache:', cacheError);
                  }
                  
                  // Try window cache now - it may have just been refreshed
                  if (window._mataLocalKeys && window._mataLocalKeys[keysKey]) {
                    console.log('[MATA Extension] Responding directly with cached keys for GET_KEYS');
                    
                    // Prepare keys with salt included
                    let keys = window._mataLocalKeys[keysKey];
                    
                    // If we have a salt in a separate cache, add it to the keys
                    if (window._mataLocalSalts && window._mataLocalSalts[saltKey] && 
                        (typeof keys === 'object') && !keys.salt) {
                      keys = { 
                        ...keys, 
                        salt: window._mataLocalSalts[saltKey]
                      };
                    }
                    
                    window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                      detail: {
                        requestId,
                        success: true,
                        keys: window._mataLocalKeys[keysKey],
                        source: 'window_cache_fallback'
                      }
                    }));
                    return;
                  }
                  
                  // Try direct localStorage as a second fallback
                  const storedKeysStr = localStorage.getItem(keysKey);
                  if (storedKeysStr) {
                    try {
                      const storedKeys = JSON.parse(storedKeysStr);
                      console.log('[MATA Extension] Background error, but responding with localStorage keys');
                      window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                        detail: {
                          requestId,
                          success: true,
                          keys: storedKeys,
                          source: 'localStorage_fallback'
                        }
                      }));
                      return;
                    } catch (e) {
                      console.error('[MATA Extension] Error parsing localStorage keys:', e);
                    }
                  }
                  
                  // If we have an email but no keys found, attempt to look for keys in alternate formats
                  const alternateFormats = [
                    email,                                 // original email as-is
                    email.replace(/[^a-zA-Z0-9]/g, '_'),  // all non-alphanumeric replaced with _
                    email.toLowerCase().trim()             // lowercased and trimmed
                  ];
                  
                  for (const format of alternateFormats) {
                    const altKey = `mata_keys_${format}`;
                    if (altKey === keysKey) continue; // Skip if same as the original
                    
                    // Try window cache
                    if (window._mataLocalKeys && window._mataLocalKeys[altKey]) {
                      console.log(`[MATA Extension] Found keys in alternate format: ${format}`);
                      window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                        detail: {
                          requestId,
                          success: true,
                          keys: window._mataLocalKeys[altKey],
                          source: 'alternate_format_window_cache'
                        }
                      }));
                      return;
                    }
                    
                    // Try localStorage
                    const altStoredStr = localStorage.getItem(altKey);
                    if (altStoredStr) {
                      try {
                        const altStored = JSON.parse(altStoredStr);
                        console.log(`[MATA Extension] Found keys in alternate localStorage format: ${format}`);
                        window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                          detail: {
                            requestId,
                            success: true,
                            keys: altStored,
                            source: 'alternate_format_localStorage'
                          }
                        }));
                        return;
                      } catch (e) {
                        console.error(`[MATA Extension] Error parsing alternate keys for ${format}:`, e);
                      }
                    }
                  }
                }
                
                // If we reach here, we failed to find keys
                console.log('[MATA Extension] Failed to find keys in any format');
              }
              
              // Dispatch error response event
              window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
                detail: {
                  requestId,
                  success: false,
                  error: chrome.runtime.lastError.message,
                  errorSource: 'background'
                }
              }));
              return;
            }
            
            // Dispatch success response event
            window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
              detail: {
                ...response,
                requestId
              }
            }));
          });
        }
      } catch (err) {
        console.error('[MATA Extension] Error sending message to background:', err);
        
        // Dispatch error event
        window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
          detail: {
            requestId,
            success: false,
            error: err.message,
            errorSource: 'contentScript:sendMessage'
          }
        }));
      }
    } catch (err) {
      console.error('[MATA Extension] Error processing app event:', err);
      
      // Dispatch error event
      window.dispatchEvent(new CustomEvent(EXTENSION_RESPONSE_EVENT, {
        detail: {
          requestId: detail.requestId,
          success: false,
          error: err.message,
          errorSource: 'contentScript'
        }
      }));
    }
  });
  
  // Notify the page that the extension is available
  window.dispatchEvent(new CustomEvent('mata_extension_available', {
    detail: {
      version: chrome.runtime.getManifest().version
    }
  }));
  
  // Log successful initialization
  console.log('[MATA Extension] Content script initialized');
}

/**
 * Inject a physical DOM element that can be reliably detected by the web application
 * This is a critical function to improve extension detection reliability
 * The web app will search for this element to verify extension presence
 */
function injectExtensionMarker() {
  // Create a function that will run when either document is ready or when body becomes available
  const tryInjectMarker = () => {
    try {
      // Check if marker already exists
      if (document.getElementById('mata-extension-marker')) {
        return true; // already exists
      }
      
      // Check if body exists
      if (!document.body) {
        console.log('[MATA Extension] Body not ready yet, will retry marker injection');
        return false; // signal that we need to try again
      }
      
      // Create a hidden div with a specific ID that the web app can detect
      const marker = document.createElement('div');
      marker.id = 'mata-extension-marker';
      
      // Add critical attributes for detection and identification
      marker.setAttribute('data-extension-id', chrome.runtime.id);
      marker.setAttribute('data-extension-version', chrome.runtime.getManifest().version);
      marker.setAttribute('data-timestamp', Date.now().toString());
      
      // Make completely invisible but still detectable
      marker.style.cssText = 'position:absolute; width:0; height:0; opacity:0; pointer-events:none;';
      
      // Add to the DOM
      document.body.appendChild(marker);
      
      // Let the app know extension is available via an event
      try {
        window.dispatchEvent(new CustomEvent('mata_extension_available', {
          detail: {
            version: chrome.runtime.getManifest().version,
            id: chrome.runtime.id,
            timestamp: Date.now()
          }
        }));
      } catch (eventError) {
        console.error('[MATA Extension] Error dispatching extension available event:', eventError);
      }
      
      console.log('[MATA Extension] Marker element injected successfully with ID:', chrome.runtime.id);
      return true; // signal success
    } catch (error) {
      console.error('[MATA Extension] Error injecting marker element:', error);
      return false; // signal failure
    }
  };
  
  // First attempt
  if (!tryInjectMarker()) {
    // If immediate injection fails, wait for document to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        console.log('[MATA Extension] DOM loaded, attempting marker injection');
        tryInjectMarker();
      });
    } else {
      // If DOM is already loaded but still no body, try again with a delay
      console.log('[MATA Extension] Setting up retry timer for marker injection');
      setTimeout(() => {
        tryInjectMarker();
      }, 500);
    }
  }
  
  // As a backup, also try again when DOM is fully loaded
  if (document.readyState !== 'complete') {
    window.addEventListener('load', () => {
      console.log('[MATA Extension] Window loaded, ensuring extension marker exists');
      tryInjectMarker();
    });
  }
}

/**
 * Sync critical encryption files from localStorage to chrome.storage
 * This specifically targets mata_active_user, mata_salt_* and mata_keys_* files
 * with exact format preservation (no transformations)
 */
function syncCriticalFiles() {
  try {
    console.log('[MATA Extension] Starting sync of critical encryption files...');
    
    // Create an object to hold all keys and values
    const criticalFiles = {};
    let syncCount = 0;
    
    // 1. First get mata_active_user
    const activeUser = localStorage.getItem('mata_active_user');
    if (activeUser) {
      criticalFiles['mata_active_user'] = activeUser;
      syncCount++;
      console.log('[MATA Extension] Found active user:', activeUser);
      
      // Also add a direct flag for immediate access
      window._mataActiveUser = activeUser;
    }
    
    // 2. Find all mata_salt_* and mata_keys_* files
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      
      // Skip if not one of our target patterns
      if (!key || (!key.startsWith('mata_salt_') && !key.startsWith('mata_keys_'))) {
        continue;
      }
      
      // Get value from localStorage
      const value = localStorage.getItem(key);
      if (value !== null) {
        criticalFiles[key] = value;
        syncCount++;
        console.log('[MATA Extension] Found critical file:', key);
        
        // Store keys directly on window for direct access as backup
        // This helps prevent timeouts when accessing through messages
        if (key.startsWith('mata_keys_')) {
          try {
            const parsed = JSON.parse(value);
            window._mataLocalKeys = window._mataLocalKeys || {};
            window._mataLocalKeys[key] = parsed;
          } catch (e) {
            console.error('[MATA Extension] Failed to parse keys for window cache:', e);
          }
        }
        
        // Also cache salts directly
        if (key.startsWith('mata_salt_')) {
          window._mataLocalSalts = window._mataLocalSalts || {};
          window._mataLocalSalts[key] = value;
        }
      }
    }
    
    // If we found any critical files, send them to the background script to save in chrome.storage
    if (syncCount > 0) {
      // We'll break this into smaller batches to avoid timeout issues
      const keys = Object.keys(criticalFiles);
      const batchSize = 3; // Process 3 files at a time
      
      // Process files in batches
      for (let i = 0; i < keys.length; i += batchSize) {
        const batchKeys = keys.slice(i, i + batchSize);
        const batchFiles = {};
        
        batchKeys.forEach(key => {
          batchFiles[key] = criticalFiles[key];
        });
        
        console.log(`[MATA Extension] Syncing batch ${i/batchSize + 1} with keys:`, batchKeys);
        
        // Send this batch to background script
        try {
          chrome.runtime.sendMessage({
            type: 'SYNC_CRITICAL_FILES',
            files: batchFiles,
            count: batchKeys.length,
            batch: i/batchSize + 1,
            totalBatches: Math.ceil(keys.length / batchSize)
          }, (response) => {
            if (chrome.runtime.lastError) {
              console.error('[MATA Extension] Error syncing batch files:', chrome.runtime.lastError);
              return;
            }
            
            if (response && response.success) {
              console.log(`[MATA Extension] Successfully synced batch ${response.batch || '?'} of ${response.totalBatches || '?'}`);
            } else {
              console.error('[MATA Extension] Failed to sync batch files:', response?.error || 'Unknown error');
            }
          });
        } catch (batchError) {
          console.error('[MATA Extension] Error sending batch to background script:', batchError);
          // Continue with next batch - non-fatal error
        }
      }
    } else {
      console.log('[MATA Extension] No critical files found to sync');
    }
    
    // Set up listener for localStorage changes to keep files in sync
    window.addEventListener('storage', (event) => {
      // Only handle changes to mata_active_user, mata_salt_*, or mata_keys_*
      if (!event.key || (!event.key.startsWith('mata_salt_') && 
          !event.key.startsWith('mata_keys_') && 
          event.key !== 'mata_active_user')) {
        return;
      }
      
      console.log(`[MATA Extension] Detected change in critical file: ${event.key}`);
      
      // Create an object with just this key
      const updateFile = {};
      updateFile[event.key] = event.newValue;
      
      // Send to background script
      try {
        chrome.runtime.sendMessage({
          type: 'SYNC_CRITICAL_FILES',
          files: updateFile,
          count: 1
        });
      } catch (eventError) {
        console.error('[MATA Extension] Error sending storage event update to background script:', eventError);
        // Non-fatal error, can be ignored
      }
    });
    
    // After syncing the critical files, try to backup IndexedDB data
    backupIndexedDB();
    
  } catch (error) {
    console.error('[MATA Extension] Error in syncCriticalFiles:', error);
  }
}

/**
 * Backup critical data from IndexedDB to chrome.storage.local
 * This exports key data from IndexedDB databases and sends it to the extension
 * for backup in chrome.storage.local
 */
function backupIndexedDB() {
  try {
    console.log('[MATA Extension] Starting IndexedDB backup...');
    
    // Find all user emails from localStorage
    const userEmails = findAllUserEmails();
    if (userEmails.length === 0) {
      console.log('[MATA Extension] No users found, skipping IndexedDB backup');
      return;
    }
    
    console.log(`[MATA Extension] Found ${userEmails.length} users to back up: ${userEmails.join(', ')}`);
    
    // Get the active user to prioritize in backup
    const activeUser = localStorage.getItem('mata_active_user');
    
    // Queue up backup operations for all users, starting with active user
    const backupQueue = [...userEmails];
    
    // Move active user to front of queue if it exists
    if (activeUser && backupQueue.includes(activeUser)) {
      backupQueue.splice(backupQueue.indexOf(activeUser), 1);
      backupQueue.unshift(activeUser);
    }
    
    // Process one user at a time
    processNextUserBackup(backupQueue);
  } catch (error) {
    console.error('[MATA Extension] Error in backupIndexedDB:', error);
  }
}

/**
 * Find all user emails in localStorage by looking for mata_keys_* and mata_salt_* patterns
 * @returns {string[]} Array of user email addresses
 */
function findAllUserEmails() {
  const users = new Set();
  const keyPattern = /^mata_keys_(.+)$/;
  const saltPattern = /^mata_salt_(.+)$/;
  
  // Scan localStorage for user-related entries
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key) continue;
    
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
  
  return Array.from(users);
}

/**
 * Process backup for the next user in the queue
 * @param {string[]} userQueue - Queue of users to process
 * @param {number} index - Current index in the queue (default: 0)
 */
function processNextUserBackup(userQueue, index = 0) {
  if (index >= userQueue.length) {
    console.log('[MATA Extension] Completed backup for all users');
    return;
  }
  
  const currentUser = userQueue[index];
  console.log(`[MATA Extension] Starting backup for user ${currentUser} (${index + 1}/${userQueue.length})`);
  
  // Back up databases for this user
  backupUserDatabases(currentUser, () => {
    // Process next user when this one is done
    processNextUserBackup(userQueue, index + 1);
  });
}

/**
 * Back up IndexedDB databases for a specific user
 * @param {string} userEmail - The user email to back up
 * @param {Function} onComplete - Callback when backup is complete
 */
function backupUserDatabases(userEmail, onComplete) {
  // Open all known MATA IndexedDB databases
  const databaseList = ['mata-vault', 'mata-identity', 'mata-keys'];
  const backupData = {};
  
  // Track ready databases
  let readyDatabases = 0;
  
  // Process each database
  databaseList.forEach(dbName => {
    const request = indexedDB.open(dbName);
    
    request.onerror = (event) => {
      console.error(`[MATA Extension] Error opening IndexedDB ${dbName}:`, event.target.error);
      trackProgress();
    };
    
    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log(`[MATA Extension] Successfully opened IndexedDB ${dbName}, version ${db.version}`);
      
      // Create a container for this database's backup data
      backupData[dbName] = {
        version: db.version,
        stores: {},
        objectStores: Array.from(db.objectStoreNames)
      };
      
      // Track how many object stores we need to process
      let totalStores = db.objectStoreNames.length;
      let processedStores = 0;
      
      // If no object stores, mark database as processed
      if (totalStores === 0) {
        trackProgress();
        return;
      }
      
      // Process each object store in the database
      Array.from(db.objectStoreNames).forEach(storeName => {
        // Only backup critical stores - filter out anything that's not essential
        // This is to keep the backup size manageable
        if (!isCriticalObjectStore(dbName, storeName)) {
          console.log(`[MATA Extension] Skipping non-critical store ${storeName} in ${dbName}`);
          processedStores++;
          checkAllStoresProcessed();
          return;
        }
        
        // Limit the backup to small metadata only for large stores
        const shouldLimitToMetadata = shouldLimitStoreToMetadata(dbName, storeName);
        
        try {
          const transaction = db.transaction(storeName, 'readonly');
          const store = transaction.objectStore(storeName);
          
          // Create a container for this store's data
          backupData[dbName].stores[storeName] = {
            keyPath: store.keyPath,
            autoIncrement: store.autoIncrement,
            indices: Array.from(store.indexNames),
            records: []
          };
          
          // Set a limit on the number of records to back up
          const MAX_RECORDS = shouldLimitToMetadata ? 25 : 100;
          let recordCount = 0;
          
          // Get all records from the store, filtering for current user if appropriate
          const cursorRequest = store.openCursor();
          
          cursorRequest.onerror = (event) => {
            console.error(`[MATA Extension] Error in cursor for ${storeName}:`, event.target.error);
            processedStores++;
            checkAllStoresProcessed();
          };
          
          cursorRequest.onsuccess = (event) => {
            const cursor = event.target.result;
            
            if (cursor && recordCount < MAX_RECORDS) {
              // Check if record belongs to current user (using email or sanitized email)
              // Only filter if the store might contain data for multiple users
              const record = cursor.value;
              const shouldIncludeRecord = !isMultiUserStore(dbName, storeName) || 
                recordBelongsToUser(record, userEmail, dbName, storeName);
              
              if (shouldIncludeRecord) {
                recordCount++;
                
                // Process the record based on the store type
                let recordToStore;
                
                if (shouldLimitToMetadata) {
                  // For large data stores, only store metadata
                  recordToStore = extractMetadata(dbName, storeName, record);
                } else {
                  // For small data stores, store the complete record
                  recordToStore = record;
                }
                
                // Add the processed record to our backup
                backupData[dbName].stores[storeName].records.push({
                  key: cursor.key,
                  value: recordToStore
                });
              }
              
              // Continue to the next record
              cursor.continue();
            } else {
              // No more records or reached limit
              console.log(`[MATA Extension] Backed up ${recordCount} records from ${storeName} in ${dbName} for user ${userEmail}`);
              processedStores++;
              checkAllStoresProcessed();
            }
          };
          
          // Helper to check if all stores have been processed
          function checkAllStoresProcessed() {
            if (processedStores >= totalStores) {
              // All stores in this database have been processed
              trackProgress();
            }
          }
        } catch (storeError) {
          console.error(`[MATA Extension] Error accessing store ${storeName}:`, storeError);
          processedStores++;
          checkAllStoresProcessed();
        }
      });
    };
    
    request.onupgradeneeded = (event) => {
      // This shouldn't happen during backup, but handle it just in case
      console.warn(`[MATA Extension] Upgrade needed for ${dbName}, this shouldn't happen during backup`);
      const db = event.target.result;
      db.close();
      trackProgress();
    };
    
    // Helper to track overall database progress
    function trackProgress() {
      readyDatabases++;
      
      // Check if all databases have been processed
      if (readyDatabases >= databaseList.length) {
        // All databases have been processed, send the backup to the background script
        sendBackupToExtension(backupData, userEmail, onComplete);
      }
    }
  });
}

/**
 * Determine if a store might contain data for multiple users
 * @param {string} dbName - Database name
 * @param {string} storeName - Store name
 * @returns {boolean} - True if the store might contain data for multiple users
 */
function isMultiUserStore(dbName, storeName) {
  // These stores typically contain data for all users
  const multiUserStores = ['users', 'accounts', 'sessions', 'global', 'config'];
  
  return multiUserStores.some(pattern => 
    storeName.toLowerCase().includes(pattern)
  );
}

/**
 * Check if a record belongs to the specified user
 * @param {Object} record - The record to check
 * @param {string} userEmail - User email to check against
 * @param {string} dbName - Database name for context
 * @param {string} storeName - Store name for context
 * @returns {boolean} - True if the record belongs to the user
 */
function recordBelongsToUser(record, userEmail, dbName, storeName) {
  if (!record || typeof record !== 'object') {
    return false;
  }
  
  // Normalized user email (original and sanitized forms)
  const normalizedEmail = userEmail.toLowerCase();
  const sanitizedEmail = userEmail.replace(/[@.]/g, '_').toLowerCase();
  
  // Check common user identifier fields
  for (const field of ['email', 'user', 'userId', 'userEmail', 'owner', 'ownerId']) {
    if (record[field]) {
      const fieldValue = String(record[field]).toLowerCase();
      if (fieldValue === normalizedEmail || fieldValue === sanitizedEmail) {
        return true;
      }
    }
  }
  
  // Check for user ID in the record key or in a 'user_id' field
  for (const field of ['id', 'key', 'uuid']) {
    if (record[field] && 
        (String(record[field]).includes(normalizedEmail) || 
         String(record[field]).includes(sanitizedEmail))) {
      return true;
    }
  }
  
  // Check for namespace matches in keys for vault-type stores
  if (dbName === 'mata-vault' && record.namespace) {
    if (record.namespace.startsWith(`user_${sanitizedEmail}_`) || 
        record.namespace.includes(normalizedEmail)) {
      return true;
    }
  }
  
  // If we can't determine ownership, include it for critical stores
  if (isCriticalStoreForAllUsers(dbName, storeName)) {
    return true;
  }
  
  return false;
}

/**
 * Determine if a store is critical and should be backed up for all users
 * @param {string} dbName - Database name
 * @param {string} storeName - Store name
 * @returns {boolean} - Whether the store is critical for all users
 */
function isCriticalStoreForAllUsers(dbName, storeName) {
  // These stores are considered critical for all users and should always be backed up
  return (dbName === 'mata-keys' && storeName === 'keys') || 
         (dbName === 'mata-identity' && storeName === 'metadata') ||
         (storeName === 'settings') || 
         (storeName === 'config');
}

/**
 * Determine if an object store should be backed up
 * @param {string} dbName - Database name
 * @param {string} storeName - Object store name
 * @returns {boolean} - Whether the store should be backed up
 */
function isCriticalObjectStore(dbName, storeName) {
  // Filter for critical stores only
  // We only need to back up stores that contain essential encryption and authentication data
  
  // Special patterns for critical stores
  const criticalStorePatterns = [
    'keys', 'metadata', 'users', 'auth', 'sessions', 'config', 'settings', 'salt'
  ];
  
  // Check if the store name contains any critical patterns
  return criticalStorePatterns.some(pattern => storeName.toLowerCase().includes(pattern));
}

/**
 * Determine if we should only back up metadata for a store (large stores)
 * @param {string} dbName - Database name
 * @param {string} storeName - Object store name
 * @returns {boolean} - Whether to limit backup to metadata
 */
function shouldLimitStoreToMetadata(dbName, storeName) {
  // Define stores that typically contain large amounts of data
  const largeDataStores = [
    'bank_accounts', 'contacts', 'transactions', 'passwords',
    'documents', 'files', 'images', 'attachments'
  ];
  
  // Check if the store name matches any large data store patterns
  return largeDataStores.some(pattern => storeName.toLowerCase().includes(pattern));
}

/**
 * Extract just metadata from a record to keep backup size manageable
 * @param {string} dbName - Database name
 * @param {string} storeName - Object store name
 * @param {Object} record - The full record
 * @returns {Object} - Extracted metadata
 */
function extractMetadata(dbName, storeName, record) {
  // If record is not an object or is null, return as is
  if (!record || typeof record !== 'object') {
    return record;
  }
  
  // Create a metadata-only version of the record
  const metadata = {};
  
  // Extract common ID fields
  ['id', 'key', 'uuid', 'email', 'name', 'type'].forEach(field => {
    if (record[field] !== undefined) {
      metadata[field] = record[field];
    }
  });
  
  // Extract metadata field if present
  if (record.metadata && typeof record.metadata === 'object') {
    metadata.metadata = record.metadata;
  }
  
  // Extract timestamps and simple fields
  Object.keys(record).forEach(key => {
    // Include timestamps
    if (key.includes('time') || key.includes('date') || key.includes('created') || key.includes('updated')) {
      metadata[key] = record[key];
    }
    
    // Include simple value types (not objects or arrays)
    const value = record[key];
    if (
      value !== null && 
      typeof value !== 'object' && 
      typeof value !== 'function' &&
      !key.includes('password') && // Skip password fields for security
      !key.includes('key') && // Skip key fields as they're likely large
      !key.includes('token') // Skip tokens for security
    ) {
      metadata[key] = value;
    }
  });
  
  return metadata;
}

/**
 * Send the IndexedDB backup data to the extension's background script
 * @param {Object} backupData - The backup data
 * @param {string} userEmail - The user email
 * @param {Function} onComplete - Callback function when complete (optional)
 */
function sendBackupToExtension(backupData, userEmail, onComplete) {
  try {
    console.log(`[MATA Extension] Sending IndexedDB backup to extension for user ${userEmail}...`);
    
    // Create a backup object with metadata
    const backup = {
      timestamp: Date.now(),
      user: userEmail,
      data: backupData
    };
    
    // Send the backup to the background script
    try {
      chrome.runtime.sendMessage({
        type: 'BACKUP_INDEXEDDB',
        backup: backup
      }, (response) => {
        // Check for chrome.runtime.lastError first
        if (chrome.runtime.lastError) {
          console.error(`[MATA Extension] Error in IndexedDB backup:`, chrome.runtime.lastError);
          // Continue with onComplete despite error
          if (typeof onComplete === 'function') {
            onComplete();
          }
          return;
        }
        
        if (response && response.success) {
          console.log(`[MATA Extension] IndexedDB backup successful for user ${userEmail}:`, response.message);
        } else {
          console.error(`[MATA Extension] IndexedDB backup failed for user ${userEmail}:`, response?.error || 'Unknown error');
        }
        
        // Call the onComplete callback if provided
        if (typeof onComplete === 'function') {
          onComplete();
        }
      });
    } catch (sendError) {
      console.error(`[MATA Extension] Error sending IndexedDB backup for user ${userEmail}:`, sendError);
        
      // Call the onComplete callback even if there was an error
      if (typeof onComplete === 'function') {
        onComplete();
      }
    }
  } catch (error) {
    console.error(`[MATA Extension] Error in sendBackupToExtension for user ${userEmail}:`, error);
    
    // Call the onComplete callback even if there was an error
    if (typeof onComplete === 'function') {
      onComplete();
    }
  }
}

// Listen for history state changes (SPA navigation)
window.addEventListener('popstate', () => {
  console.log('[MATA Extension] Navigation detected (popstate), syncing critical files...');
  syncCriticalFiles();
});

// Additional capture for SPA routing library navigation
const originalPushState = history.pushState;
history.pushState = function(...args) {
  const result = originalPushState.apply(this, args);
  console.log('[MATA Extension] Navigation detected (pushState), syncing critical files...');
  syncCriticalFiles();
  return result;
};

const originalReplaceState = history.replaceState;
history.replaceState = function(...args) {
  const result = originalReplaceState.apply(this, args);
  console.log('[MATA Extension] Navigation detected (replaceState), syncing critical files...');
  syncCriticalFiles();
  return result;
};

// Set interval to periodically check for critical files (every 30 seconds)
setInterval(syncCriticalFiles, 30000);

// If document is already loaded, inject marker immediately
if (document.readyState === 'complete' || document.readyState === 'interactive') {
  injectExtensionMarker();
  // Wait a short time for page to fully initialize before syncing
  setTimeout(syncCriticalFiles, 1000);
} else {
  // Otherwise wait for DOMContentLoaded
  document.addEventListener('DOMContentLoaded', () => {
    injectExtensionMarker();
    setTimeout(syncCriticalFiles, 1000);
  });
}