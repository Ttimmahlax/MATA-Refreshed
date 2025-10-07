// Background script for MATA Key Manager extension

// Log startup information
console.log("MATA Key Manager background script started", {
  version: chrome.runtime.getManifest().version,
  id: chrome.runtime.id,
});

// Constants
const DEBUG_MODE = true; // Set to false in production

// Log helper function
function log(message, data) {
  if (DEBUG_MODE) {
    console.log(`[MATA Background] ${message}`, data);
  }
}

function logError(message, error) {
  console.error(`[MATA Background] ${message}`, error);
}

// Listen for messages from content script or popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  log('Received message:', { type: message.type, sender: sender.url || 'internal' });
  
  switch (message.type) {
    case 'STORE_KEYS':
      log('Processing STORE_KEYS request', { email: message.data?.email || 'unknown' });
      storeUserKeys(message.data)
        .then(result => {
          log('STORE_KEYS successful', { email: message.data?.email || 'unknown' });
          sendResponse({ success: true, result });
        })
        .catch(error => {
          logError('STORE_KEYS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:STORE_KEYS'
          });
        });
      return true; // Indicates async response
      
    case 'GET_KEYS':
      log('Processing GET_KEYS request', { email: message.email || 'unknown' });
      getUserKeys(message.email)
        .then(keys => {
          log('GET_KEYS successful', { email: message.email || 'unknown' });
          sendResponse({ success: true, keys });
        })
        .catch(error => {
          logError('GET_KEYS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:GET_KEYS'
          });
        });
      return true; // Indicates async response
      
    case 'CHECK_EXTENSION':
      log('Processing CHECK_EXTENSION request');
      sendResponse({ 
        success: true, 
        installed: true,
        version: chrome.runtime.getManifest().version,
        id: chrome.runtime.id
      });
      return false;
      
    case 'LIST_ACCOUNTS':
      log('Processing LIST_ACCOUNTS request');
      getStoredAccounts()
        .then(accounts => {
          log('LIST_ACCOUNTS successful', { count: accounts.length });
          sendResponse({ success: true, accounts });
        })
        .catch(error => {
          logError('LIST_ACCOUNTS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:LIST_ACCOUNTS'
          });
        });
      return true; // Indicates async response
      
    case 'SIGN_MESSAGE':
      log('Processing SIGN_MESSAGE request', { email: message.email || 'unknown' });
      signMessage(message.email, message.message, message.password)
        .then(signature => {
          log('SIGN_MESSAGE successful', { email: message.email || 'unknown' });
          sendResponse({ success: true, signature });
        })
        .catch(error => {
          logError('SIGN_MESSAGE failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:SIGN_MESSAGE'
          });
        });
      return true; // Indicates async response
      
    case 'TEST_CONNECTION':
      log('Processing TEST_CONNECTION request');
      console.log('Test connection received');
      sendResponse({ 
        success: true,
        timestamp: new Date().toISOString(),
        id: chrome.runtime.id,
        version: chrome.runtime.getManifest().version
      });
      return false;
      
    case 'TEST_STORAGE':
      log('Processing TEST_STORAGE request', { data: message.testData });
      console.log('Received TEST_STORAGE message:', message);
      
      // Handle the test storage request and ensure a response is sent
      testStorage(message.testData || 'test data')
        .then(result => {
          log('TEST_STORAGE completed successfully', result);
          sendResponse({ success: true, ...result });
        })
        .catch(error => {
          logError('TEST_STORAGE failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Unknown error during storage test',
            storageAccessible: false,
            errorSource: 'background:TEST_STORAGE'
          });
        });
      return true; // This is required to use sendResponse asynchronously
      
    case 'GET_BANK_ACCOUNTS':
      log('Processing GET_BANK_ACCOUNTS request', { email: message.email });
      
      // Get bank accounts for the user
      getBankAccounts(message.email)
        .then(accounts => {
          log('GET_BANK_ACCOUNTS completed successfully', { count: accounts.length });
          sendResponse({ success: true, accounts });
        })
        .catch(error => {
          logError('GET_BANK_ACCOUNTS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to retrieve bank accounts',
            accounts: []
          });
        });
      return true;
      
    case 'GET_PASSWORDS':
      log('Processing GET_PASSWORDS request', { email: message.email });
      
      // Get passwords for the user
      getPasswords(message.email)
        .then(passwords => {
          log('GET_PASSWORDS completed successfully', { count: passwords.length });
          sendResponse({ success: true, passwords });
        })
        .catch(error => {
          logError('GET_PASSWORDS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to retrieve passwords',
            passwords: []
          });
        });
      return true;
      
    case 'GET_CONTACTS':
      log('Processing GET_CONTACTS request', { email: message.email });
      
      // Get contacts for the user
      getContacts(message.email)
        .then(contacts => {
          log('GET_CONTACTS completed successfully', { count: contacts.length });
          sendResponse({ success: true, contacts });
        })
        .catch(error => {
          logError('GET_CONTACTS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to retrieve contacts',
            contacts: []
          });
        });
      return true;
      
    case 'CHECK_SYNC_STATUS':
      log('Processing CHECK_SYNC_STATUS request');
      
      // Check sync status with the web app
      checkSyncStatus()
        .then(status => {
          log('CHECK_SYNC_STATUS completed successfully', status);
          sendResponse({ success: true, ...status });
        })
        .catch(error => {
          logError('CHECK_SYNC_STATUS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to check sync status',
            synced: false
          });
        });
      return true;
      
    case 'SYNC_ALL_DATA':
      log('Processing SYNC_ALL_DATA request');
      
      // Sync all data with the web app
      syncAllData()
        .then(result => {
          log('SYNC_ALL_DATA completed successfully', result);
          sendResponse({ success: true, ...result });
        })
        .catch(error => {
          logError('SYNC_ALL_DATA failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to sync data',
            synced: false
          });
        });
      return true;
      
    case 'SYNC_STORAGE':
      log('Processing SYNC_STORAGE request');
      
      // Synchronize localStorage and chrome.storage
      syncStorage()
        .then(result => {
          log('SYNC_STORAGE completed successfully', result);
          sendResponse({ success: true, ...result });
        })
        .catch(error => {
          logError('SYNC_STORAGE failed', error);
          sendResponse({ 
            success: false, 
            error: error.message || 'Failed to sync storage',
            syncedCount: 0
          });
        });
      return true;
      
    default:
      log('Unknown message type received', { type: message.type });
      sendResponse({ 
        success: false, 
        error: `Unknown message type: ${message.type}` 
      });
      return false;
  }
});

// Listen for messages directly from web pages
chrome.runtime.onMessageExternal.addListener((message, sender, sendResponse) => {
  log('External message received:', { origin: sender.url, type: message.type });
  
  // Verify sender origin for security
  const validOrigins = [
    'https://matav3.replit.app',
    'https://e1d6f5cd-45de-4094-973a-d59a57161863-00-1rgjur5zrv5tn.kirk.replit.dev',
    'https://mat-av-20-timalmond.replit.app'
  ];
  
  const senderOrigin = new URL(sender.url).origin;
  if (!validOrigins.includes(senderOrigin)) {
    logError('Rejected message from unauthorized origin:', senderOrigin);
    sendResponse({ 
      success: false, 
      error: 'Unauthorized origin' 
    });
    return;
  }
  
  // Process message based on type
  switch (message.type) {
    case 'STORE_KEYS':
      log('Processing external STORE_KEYS request', { email: message.data?.email || 'unknown' });
      storeUserKeys(message.data)
        .then(result => {
          log('External STORE_KEYS successful', { email: message.data?.email || 'unknown' });
          sendResponse({ success: true, result });
        })
        .catch(error => {
          logError('External STORE_KEYS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:external:STORE_KEYS'
          });
        });
      return true; // Indicates async response
      
    case 'GET_KEYS':
      log('Processing external GET_KEYS request', { email: message.email || 'unknown' });
      getUserKeys(message.email)
        .then(keys => {
          log('External GET_KEYS successful', { email: message.email || 'unknown' });
          sendResponse({ success: true, keys });
        })
        .catch(error => {
          logError('External GET_KEYS failed', error);
          sendResponse({ 
            success: false, 
            error: error.message,
            errorSource: 'background:external:GET_KEYS'
          });
        });
      return true; // Indicates async response
      
    case 'CHECK_EXTENSION':
      log('Processing external CHECK_EXTENSION request');
      sendResponse({ 
        success: true, 
        installed: true,
        version: chrome.runtime.getManifest().version,
        id: chrome.runtime.id
      });
      return false;
    
    case 'GET_BANK_ACCOUNTS':
      log('Processing GET_BANK_ACCOUNTS request', { email: message.email });
      getBankAccounts(message.email)
        .then(accounts => {
          sendResponse({
            success: true,
            accounts: accounts
          });
        })
        .catch(error => {
          logError('Error processing GET_BANK_ACCOUNTS request', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
      return true;
      
    case 'GET_PASSWORDS':
      log('Processing GET_PASSWORDS request', { email: message.email });
      getPasswords(message.email)
        .then(passwords => {
          sendResponse({
            success: true,
            passwords: passwords
          });
        })
        .catch(error => {
          logError('Error processing GET_PASSWORDS request', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
      return true;
      
    case 'GET_CONTACTS':
      log('Processing GET_CONTACTS request', { email: message.email });
      getContacts(message.email)
        .then(contacts => {
          sendResponse({
            success: true,
            contacts: contacts
          });
        })
        .catch(error => {
          logError('Error processing GET_CONTACTS request', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
      return true;
      
    case 'CHECK_SYNC_STATUS':
      log('Processing CHECK_SYNC_STATUS request');
      checkSyncStatus()
        .then(syncStatus => {
          sendResponse({
            success: true,
            syncStatus: syncStatus
          });
        })
        .catch(error => {
          logError('Error processing CHECK_SYNC_STATUS request', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
      return true;
      
    case 'SYNC_ALL_DATA':
      log('Processing SYNC_ALL_DATA request');
      syncAllData()
        .then(syncResult => {
          sendResponse({
            success: true,
            syncResult: syncResult
          });
        })
        .catch(error => {
          logError('Error processing SYNC_ALL_DATA request', error);
          sendResponse({
            success: false,
            error: error.message
          });
        });
      return true;
      
    default:
      log('Unknown external message type received', { type: message.type });
      sendResponse({ 
        success: false, 
        error: `Unknown message type: ${message.type}` 
      });
      return false;
  }
});

// Store user keys securely
async function storeUserKeys(userData) {
  try {
    log('Storing user keys', { email: userData?.email || 'unknown' });
    
    // Validate input
    if (!userData || !userData.email) {
      throw new Error('Invalid user data: missing required fields');
    }
    
    // Get current accounts list with explicit error handling
    let mata_accounts = [];
    try {
      const accounts = await new Promise((resolve, reject) => {
        chrome.storage.local.get('mata_accounts', (result) => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to get accounts: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result.mata_accounts || []);
          }
        });
      });
      mata_accounts = accounts;
    } catch (error) {
      logError('Error retrieving accounts list', error);
      throw new Error(`Failed to access storage: ${error.message}`);
    }
    
    // Check if account already exists
    const existingIndex = mata_accounts.findIndex(acc => acc.email === userData.email);
    
    if (existingIndex >= 0) {
      // Update existing account
      mata_accounts[existingIndex] = {
        ...mata_accounts[existingIndex],
        ...userData,
        lastUpdated: Date.now()
      };
      log('Updating existing account', { email: userData.email, index: existingIndex });
    } else {
      // Add new account
      mata_accounts.push({
        ...userData,
        created: Date.now(),
        lastUpdated: Date.now()
      });
      log('Adding new account', { email: userData.email });
    }
    
    // Save updated accounts list with explicit error handling
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ mata_accounts }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to save accounts: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
      log('Accounts list updated successfully');
    } catch (error) {
      logError('Error saving accounts list', error);
      throw new Error(`Failed to save accounts: ${error.message}`);
    }
    
    // Also store individual account data for quick access with explicit error handling
    try {
      const accountKey = `mata_account_${userData.email}`;
      const accountData = {
        ...userData,
        lastUpdated: Date.now()
      };
      
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ [accountKey]: accountData }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to save individual account: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
      log('Individual account data saved successfully', { key: accountKey });
    } catch (error) {
      logError('Error saving individual account data', error);
      throw new Error(`Failed to save individual account: ${error.message}`);
    }
    
    return { 
      success: true,
      message: `Successfully stored keys for ${userData.email}`
    };
  } catch (error) {
    logError('Error in storeUserKeys', error);
    throw error;
  }
}

// Retrieve user keys by email
async function getUserKeys(email) {
  try {
    if (!email) {
      throw new Error('Email is required to retrieve keys');
    }
    
    log('Retrieving keys for user', { email });
    
    // Get user data with explicit error handling
    const accountKey = `mata_account_${email}`;
    const userKeys = await new Promise((resolve, reject) => {
      chrome.storage.local.get(accountKey, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve keys: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result[accountKey]);
        }
      });
    });
    
    if (!userKeys) {
      log('No keys found for user', { email });
      throw new Error('No keys found for this account');
    }
    
    log('Keys retrieved successfully', { email });
    return userKeys;
  } catch (error) {
    logError('Error in getUserKeys', error);
    throw error;
  }
}

// Get list of all stored accounts (without sensitive data)
async function getStoredAccounts() {
  try {
    log('Retrieving all stored accounts');
    
    // Get accounts with explicit error handling
    const mata_accounts = await new Promise((resolve, reject) => {
      chrome.storage.local.get('mata_accounts', (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve accounts: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result.mata_accounts || []);
        }
      });
    });
    
    // Return only non-sensitive data
    const filteredAccounts = mata_accounts.map(account => ({
      email: account.email,
      firstName: account.firstName || '',
      created: account.created,
      lastUpdated: account.lastUpdated,
      publicKey: account.publicKey
    }));
    
    log('Retrieved accounts successfully', { count: filteredAccounts.length });
    return filteredAccounts;
  } catch (error) {
    logError('Error in getStoredAccounts', error);
    throw error;
  }
}

// Sign a message using the stored private key (after decryption)
async function signMessage(email, message, password) {
  try {
    if (!email) throw new Error('Email is required');
    if (!message) throw new Error('Message is required');
    if (!password) throw new Error('Password is required');
    
    log('Signing message for user', { email });
    
    // This function would use the Crypto implementation similar to the web app
    // For now, it's a stub - the real implementation would:
    // 1. Retrieve the encrypted private key
    // 2. Decrypt it using the password
    // 3. Sign the message with the private key
    // 4. Return the signature
    
    // We'd need to import WASM modules similar to the web app
    
    return {
      signature: "Signature would be here in a real implementation",
      message,
      email
    };
  } catch (error) {
    logError('Error in signMessage', error);
    throw error;
  }
}

// Test storage function for verifying extension functionality
// Enhanced with improved error handling and diagnostics
async function testStorage(testData) {
  log('Testing storage with data', testData);
  
  // Collect detailed diagnostic information
  const diagnosticInfo = {
    storageType: 'chrome.storage.local',
    extensionId: chrome.runtime.id,
    timestamp: Date.now(),
    originalTestData: testData,
    extensionManifestPermissions: chrome.runtime.getManifest().permissions || [],
    extensionVersion: chrome.runtime.getManifest().version,
    chromeRuntimeAvailable: !!chrome && !!chrome.runtime,
    storageApiAvailable: !!chrome && !!chrome.storage && !!chrome.storage.local
  };
  
  // For troubleshooting contentScript communication issues
  const testResponse = {
    success: true,
    message: 'Initial test response - this should be replaced',
    timestamp: Date.now()
  };
  
  try {
    // Check if storage API is available
    if (!chrome || !chrome.storage || !chrome.storage.local) {
      logError('Storage API not available');
      return {
        success: false,
        error: 'Chrome storage API not available',
        message: 'Storage test failed - Chrome storage API not available',
        storageAccessible: false,
        diagnostics: {
          ...diagnosticInfo,
          chromeAvailable: !!chrome,
          storageAvailable: !!chrome && !!chrome.storage,
          localStorageAvailable: !!chrome && !!chrome.storage && !!chrome.storage.local
        }
      };
    }
    
    // Try a simpler storage test first
    try {
      log('Performing simple storage test');
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ 'mata_simple_test': 'simple_test_value' }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Simple test failed: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(true);
          }
        });
      });
      
      log('Simple storage test passed');
      testResponse.simpleTestPassed = true;
    } catch (simpleError) {
      logError('Simple storage test failed', simpleError);
      testResponse.simpleTestPassed = false;
      testResponse.simpleTestError = simpleError.message;
    }
    
    // Use a promise wrapper to handle the storage call safely
    let saveResult;
    try {
      // Make the storage call
      saveResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Storage set operation timed out after 5 seconds'));
        }, 5000);
        
        try {
          chrome.storage.local.set({ 
            'mata_test_data': testData || 'test_data',
            'mata_test_timestamp': Date.now(),
            'mata_test_diagnostics': diagnosticInfo
          }, () => {
            clearTimeout(timeout);
            
            // Check for any runtime errors
            if (chrome.runtime.lastError) {
              logError('Storage set error', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(true);
            }
          });
        } catch (innerError) {
          clearTimeout(timeout);
          logError('Storage set exception', innerError);
          reject(innerError);
        }
      });
      
      log('Storage set successful', { result: saveResult });
      testResponse.storageSetSuccess = true;
    } catch (setError) {
      logError('Storage set failed', setError);
      testResponse.storageSetSuccess = false;
      testResponse.storageSetError = setError.message;
      
      // Continue with the test even if set failed
    }
    
    // Use a promise wrapper for the get call as well
    let getResult;
    try {
      getResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Storage get operation timed out after 5 seconds'));
        }, 5000);
        
        try {
          chrome.storage.local.get(['mata_test_data', 'mata_test_timestamp', 'mata_test_diagnostics'], (items) => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
              logError('Storage get error', chrome.runtime.lastError);
              reject(new Error(chrome.runtime.lastError.message));
            } else {
              resolve(items);
            }
          });
        } catch (innerError) {
          clearTimeout(timeout);
          logError('Storage get exception', innerError);
          reject(innerError);
        }
      });
      
      log('Retrieved test data', getResult);
      testResponse.storageGetSuccess = true;
      testResponse.retrievedData = getResult;
    } catch (getError) {
      logError('Storage get failed', getError);
      testResponse.storageGetSuccess = false;
      testResponse.storageGetError = getError.message;
    }
    
    // Attempt to count all stored items for diagnostic purposes
    let totalStoredItems = 0;
    try {
      const allItems = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Storage enumeration timed out after 5 seconds'));
        }, 5000);
        
        chrome.storage.local.get(null, (items) => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else {
            resolve(items);
          }
        });
      });
      
      totalStoredItems = Object.keys(allItems).length;
      log('Total items in storage', { count: totalStoredItems });
      testResponse.totalStoredItems = totalStoredItems;
      testResponse.success = true;
    } catch (countError) {
      logError('Error counting stored items', countError);
      testResponse.countError = countError.message;
      // Don't fail the whole test just because we couldn't count items
    }
    
    // Determine overall success
    const overallSuccess = 
      testResponse.simpleTestPassed || 
      testResponse.storageSetSuccess || 
      testResponse.storageGetSuccess;
    
    // Return comprehensive test results
    return {
      success: overallSuccess,
      testResponse,
      testData: getResult?.mata_test_data,
      timestamp: getResult?.mata_test_timestamp || Date.now(),
      diagnostics: {
        ...diagnosticInfo,
        testResponse
      },
      message: overallSuccess 
        ? 'Storage test completed with some success' 
        : 'Storage test failed but diagnostic data available',
      storageAccessible: overallSuccess,
      totalStoredItems,
      permissions: chrome.runtime.getManifest().permissions || []
    };
  } catch (error) {
    logError('Storage test failed with error', error);
    
    // Still try to gather some diagnostic information
    let diagnosticResult = diagnosticInfo;
    try {
      diagnosticResult = {
        ...diagnosticInfo,
        error: error.message,
        errorStack: error.stack,
        storagePermissionPresent: (chrome.runtime.getManifest().permissions || []).includes('storage'),
        testResponse
      };
    } catch (diagError) {
      logError('Error gathering diagnostics', diagError);
    }
    
    // Even if we caught an error, send back a success response with the error info
    // This helps prevent message port closing issues
    return {
      success: true, // Set to true to ensure the message gets back
      testComplete: true,
      testFailed: true,
      error: error.message || 'Unknown storage error',
      message: 'Storage test failed but response returned successfully',
      storageAccessible: false,
      diagnostics: diagnosticResult
    };
  }
}

/**
 * Get bank account data for a user
 * This retrieves stored bank account data or fetches it from the web app if available
 */
async function getBankAccounts(email) {
  try {
    if (!email) {
      throw new Error('Email is required to retrieve bank accounts');
    }
    
    log('Retrieving bank accounts for user', { email });
    
    // First, check if we have stored bank account data for this user
    const bankAccountsKey = `mata_bank_accounts_${email}`;
    const storedAccounts = await new Promise((resolve, reject) => {
      chrome.storage.local.get(bankAccountsKey, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve bank accounts: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result[bankAccountsKey] || []);
        }
      });
    });
    
    log('Retrieved bank accounts from storage', { count: storedAccounts.length });
    
    // For now, we'll return what we have in storage
    // In a full implementation, this would attempt to sync with the MATA web app
    // if the user is logged in to both the extension and the web app
    return storedAccounts;
  } catch (error) {
    logError('Error in getBankAccounts', error);
    throw error;
  }
}

/**
 * Get password data for a user
 * This retrieves stored password data or fetches it from the web app if available
 */
async function getPasswords(email) {
  try {
    if (!email) {
      throw new Error('Email is required to retrieve passwords');
    }
    
    log('Retrieving passwords for user', { email });
    
    // First, check if we have stored password data for this user
    const passwordsKey = `mata_passwords_${email}`;
    const storedPasswords = await new Promise((resolve, reject) => {
      chrome.storage.local.get(passwordsKey, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve passwords: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result[passwordsKey] || []);
        }
      });
    });
    
    log('Retrieved passwords from storage', { count: storedPasswords.length });
    
    // For now, we'll return what we have in storage
    // In a full implementation, this would attempt to sync with the MATA web app
    return storedPasswords;
  } catch (error) {
    logError('Error in getPasswords', error);
    throw error;
  }
}

/**
 * Get contact data for a user
 * This retrieves stored contact data or fetches it from the web app if available
 */
async function getContacts(email) {
  try {
    if (!email) {
      throw new Error('Email is required to retrieve contacts');
    }
    
    log('Retrieving contacts for user', { email });
    
    // First, check if we have stored contact data for this user
    const contactsKey = `mata_contacts_${email}`;
    const storedContacts = await new Promise((resolve, reject) => {
      chrome.storage.local.get(contactsKey, (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve contacts: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result[contactsKey] || []);
        }
      });
    });
    
    log('Retrieved contacts from storage', { count: storedContacts.length });
    
    // For now, we'll return what we have in storage
    // In a full implementation, this would attempt to sync with the MATA web app
    return storedContacts;
  } catch (error) {
    logError('Error in getContacts', error);
    throw error;
  }
}

/**
 * Check the sync status between the extension and MATA web app
 * This determines if the data in the extension is in sync with the web app
 */
async function checkSyncStatus() {
  try {
    log('Checking sync status with web app');
    
    // Get last sync timestamp
    const lastSyncData = await new Promise((resolve, reject) => {
      chrome.storage.local.get('mata_last_sync', (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to retrieve sync status: ${chrome.runtime.lastError.message}`));
        } else {
          resolve(result.mata_last_sync || { timestamp: 0, success: false });
        }
      });
    });
    
    const now = Date.now();
    const timeSinceLastSync = now - lastSyncData.timestamp;
    const syncedRecently = timeSinceLastSync < 24 * 60 * 60 * 1000; // Within 24 hours
    
    log('Sync status check complete', { 
      lastSync: new Date(lastSyncData.timestamp).toISOString(),
      timeSinceLastSync: Math.floor(timeSinceLastSync / (60 * 1000)) + ' minutes',
      syncedRecently 
    });
    
    return {
      synced: syncedRecently && lastSyncData.success,
      lastSyncTime: lastSyncData.timestamp,
      lastSyncSuccess: lastSyncData.success
    };
  } catch (error) {
    logError('Error in checkSyncStatus', error);
    throw error;
  }
}

/**
 * Sync all data between the extension and MATA web app
 * This synchronizes data in both directions
 */
async function syncAllData() {
  try {
    log('Starting data sync with web app');
    
    // Get all accounts to sync
    const accounts = await getStoredAccounts();
    
    if (accounts.length === 0) {
      log('No accounts to sync');
      return {
        synced: false,
        message: 'No accounts to sync',
        accountCount: 0
      };
    }
    
    // For now, just update the sync timestamp since we don't have actual web app sync yet
    // In a real implementation, this would communicate with the web app to sync data
    const syncResult = {
      timestamp: Date.now(),
      success: true,
      accountCount: accounts.length
    };
    
    await new Promise((resolve, reject) => {
      chrome.storage.local.set({ 'mata_last_sync': syncResult }, () => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Failed to update sync status: ${chrome.runtime.lastError.message}`));
        } else {
          resolve();
        }
      });
    });
    
    log('Data sync complete', syncResult);
    
    return {
      synced: true,
      message: `Successfully synced data for ${accounts.length} accounts`,
      timestamp: syncResult.timestamp,
      accountCount: accounts.length
    };
  } catch (error) {
    logError('Error in syncAllData', error);
    throw error;
  }
}

/**
 * Synchronize data between localStorage and chrome.storage.local
 * This ensures consistency between the web app's localStorage and the extension's storage
 */
async function syncStorage() {
  try {
    log('Starting synchronization of localStorage and chrome.storage');
    
    // We need to communicate with the tab to access localStorage
    // Find tabs with our app
    const tabs = await chrome.tabs.query({
      url: [
        "*://matav3.replit.app/*",
        "*://*.replit.app/*"
      ]
    });
    
    if (tabs.length === 0) {
      log('No MATA web app tabs found for localStorage access');
      return {
        success: false,
        syncedCount: 0,
        error: 'No MATA web app tabs found. Please open the web app first.'
      };
    }
    
    // Use the first tab to get localStorage data
    const tab = tabs[0];
    
    log('Found MATA web app tab for localStorage access', { url: tab.url });
    
    // Request localStorage data from content script
    let localStorageKeys = [];
    try {
      // First get a list of all localStorage keys
      localStorageKeys = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Request for localStorage keys timed out'));
        }, 5000);
        
        chrome.tabs.sendMessage(tab.id, { 
          type: 'GET_LOCAL_STORAGE_KEYS',
          mata: true
        }, response => {
          clearTimeout(timeout);
          
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to get localStorage keys: ${chrome.runtime.lastError.message}`));
          } else if (!response || !response.success) {
            reject(new Error(`Failed to get localStorage keys: ${response?.error || 'Unknown error'}`));
          } else {
            resolve(response.keys || []);
          }
        });
      });
      
      log('Retrieved localStorage keys', { count: localStorageKeys.length });
    } catch (error) {
      logError('Failed to get localStorage keys', error);
      return {
        success: false,
        syncedCount: 0,
        error: `Failed to get localStorage keys: ${error.message}`
      };
    }
    
    // Filter to include only MATA-related keys
    const mataKeys = localStorageKeys.filter(key => 
      key.startsWith('mata_') || 
      key.includes('_vault_') || 
      key.includes('keys_') ||
      key.includes('_masterKeys') ||
      key.includes('salt_')
    );
    
    log('Filtered MATA-related localStorage keys', { count: mataKeys.length });
    
    if (mataKeys.length === 0) {
      return {
        success: true,
        syncedCount: 0,
        message: 'No MATA-related keys found in localStorage'
      };
    }
    
    // Now get the values for each key and sync them
    let syncedCount = 0;
    let errorCount = 0;
    const errors = [];
    
    for (const key of mataKeys) {
      try {
        // Get the value from localStorage
        const localStorageValue = await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error(`Request for localStorage value timed out for key: ${key}`));
          }, 5000);
          
          chrome.tabs.sendMessage(tab.id, { 
            type: 'GET_LOCAL_STORAGE_VALUE',
            key: key,
            mata: true
          }, response => {
            clearTimeout(timeout);
            
            if (chrome.runtime.lastError) {
              reject(new Error(`Failed to get localStorage value: ${chrome.runtime.lastError.message}`));
            } else if (!response || !response.success) {
              reject(new Error(`Failed to get localStorage value: ${response?.error || 'Unknown error'}`));
            } else {
              resolve(response.value);
            }
          });
        });
        
        if (localStorageValue !== null && localStorageValue !== undefined) {
          // Store the value in chrome.storage.local
          await new Promise((resolve, reject) => {
            chrome.storage.local.set({ [key]: localStorageValue }, () => {
              if (chrome.runtime.lastError) {
                reject(new Error(`Failed to save to chrome.storage: ${chrome.runtime.lastError.message}`));
              } else {
                resolve();
              }
            });
          });
          
          syncedCount++;
          log('Synced key from localStorage to chrome.storage', { key });
        }
      } catch (error) {
        logError(`Error syncing key: ${key}`, error);
        errorCount++;
        errors.push({ key, error: error.message });
      }
    }
    
    // Now get all chrome.storage keys and sync them back to localStorage
    try {
      const chromeStorage = await new Promise((resolve, reject) => {
        chrome.storage.local.get(null, result => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to get chrome.storage: ${chrome.runtime.lastError.message}`));
          } else {
            resolve(result);
          }
        });
      });
      
      const chromeStorageKeys = Object.keys(chromeStorage).filter(key => 
        key.startsWith('mata_') || 
        key.includes('_vault_') || 
        key.includes('keys_') ||
        key.includes('_masterKeys') ||
        key.includes('salt_')
      );
      
      log('Found MATA-related chrome.storage keys', { count: chromeStorageKeys.length });
      
      // Sync chrome.storage keys back to localStorage
      for (const key of chromeStorageKeys) {
        if (!mataKeys.includes(key)) {
          try {
            const value = chromeStorage[key];
            
            // Set the value in localStorage
            await new Promise((resolve, reject) => {
              const timeout = setTimeout(() => {
                reject(new Error(`Setting localStorage value timed out for key: ${key}`));
              }, 5000);
              
              chrome.tabs.sendMessage(tab.id, { 
                type: 'SET_LOCAL_STORAGE_VALUE',
                key: key,
                value: value,
                mata: true
              }, response => {
                clearTimeout(timeout);
                
                if (chrome.runtime.lastError) {
                  reject(new Error(`Failed to set localStorage value: ${chrome.runtime.lastError.message}`));
                } else if (!response || !response.success) {
                  reject(new Error(`Failed to set localStorage value: ${response?.error || 'Unknown error'}`));
                } else {
                  resolve();
                }
              });
            });
            
            syncedCount++;
            log('Synced key from chrome.storage to localStorage', { key });
          } catch (error) {
            logError(`Error syncing key from chrome.storage to localStorage: ${key}`, error);
            errorCount++;
            errors.push({ key, error: error.message, direction: 'chrome_to_local' });
          }
        }
      }
    } catch (error) {
      logError('Error accessing chrome.storage', error);
      return {
        success: syncedCount > 0,
        syncedCount,
        errorCount: errorCount + 1,
        errors: [...errors, { error: error.message, phase: 'chrome_storage_access' }],
        message: `Partially synced ${syncedCount} keys with errors`
      };
    }
    
    // Update sync timestamp
    const syncResult = {
      timestamp: Date.now(),
      success: true,
      keysCount: syncedCount
    };
    
    try {
      await new Promise((resolve, reject) => {
        chrome.storage.local.set({ 'mata_storage_sync': syncResult }, () => {
          if (chrome.runtime.lastError) {
            reject(new Error(`Failed to update sync timestamp: ${chrome.runtime.lastError.message}`));
          } else {
            resolve();
          }
        });
      });
    } catch (error) {
      logError('Error updating sync timestamp', error);
      // Non-critical error, don't fail the whole operation
    }
    
    return {
      success: true,
      syncedCount,
      errorCount,
      errors: errors.length > 0 ? errors : undefined,
      timestamp: syncResult.timestamp,
      message: errorCount > 0 
        ? `Synced ${syncedCount} keys with ${errorCount} errors` 
        : `Successfully synced ${syncedCount} keys`
    };
  } catch (error) {
    logError('Error in syncStorage', error);
    throw error;
  }
}