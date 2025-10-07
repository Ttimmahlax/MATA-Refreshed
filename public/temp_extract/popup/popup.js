// MATA Key Manager Extension - Popup Script
// Uses central version configuration from versionConfig.js

// Use the version set by versionConfig.browser.js
// It's already available globally via the script tag in popup.html

// We'll implement new storage and sync functionality
// This file needs to be updated after implementing core functionality

document.addEventListener('DOMContentLoaded', initialize);

// DOM Elements
let accountsList;
let bankAccountsList;
let passwordsList;
let contactsList;
let totalBalanceDisplay;
let footerElement;
let bankAccountsCountDisplay;
let sidebarToggle;
let sidebar;
let exportKeysBtn;
let downloadExtensionBtn;
let refreshBankAccountsBtn;
let refreshPasswordsBtn;
let refreshContactsBtn;
let quickPasswordSearch;
let passwordSearch;
let contactSearch;
let quickPasswordResults;
let autoLockSelect;
let requirePasswordToggle;
let dataSyncToggle;
let addPasswordBtn;
let addContactBtn;
let didTextElement;
let copyDidBtn;
let copyIcon;
let checkIcon;

// State
let bankAccounts = [];
let passwords = [];
let contacts = [];
let currentTab = 'bank-accounts'; // Default tab
let sidebarExpanded = false;
let activeUserEmail = null; // Track the active user's email

// Initialize popup
async function initialize() {
  // Get DOM elements for the new UI
  bankAccountsList = document.getElementById('bank-accounts-list');
  passwordsList = document.getElementById('passwords-list');
  contactsList = document.getElementById('contacts-list');
  totalBalanceDisplay = document.getElementById('total-balance');
  bankAccountsCountDisplay = document.getElementById('bank-accounts-count');
  sidebarToggle = document.getElementById('sidebar-toggle');
  sidebar = document.querySelector('.sidebar');
  
  // Set extension version from global window.EXTENSION_VERSION
  const versionElement = document.getElementById('extension-version');
  if (versionElement) {
    versionElement.textContent = window.EXTENSION_VERSION;
  }
  
  // Get MATA logo link element for web app navigation
  const mataLogoLink = document.getElementById('mata-logo-link');
  if (mataLogoLink) {
    mataLogoLink.addEventListener('click', async () => {
      try {
        // Open MATA web app - implementation directly here instead of importing
        // Find existing MATA tab or create a new one
        chrome.tabs.query({url: ["*://mat-av-20-timalmond.replit.app/*", "*://*.replit.app/*"]}, (tabs) => {
          if (tabs && tabs.length > 0) {
            // Focus existing tab
            chrome.tabs.update(tabs[0].id, {active: true});
          } else {
            // Create new tab
            chrome.tabs.create({url: "https://mat-av-20-timalmond.replit.app/"});
          }
          window.close(); // Close the popup after opening the app
        });
      } catch (error) {
        console.error('Error opening MATA web app:', error);
      }
    });
    mataLogoLink.style.cursor = 'pointer'; // Ensure it visually appears clickable
  }
  
  // Attempt to get the active user email
  activeUserEmail = await getActiveUserEmail();
  console.log('Initial activeUserEmail check:', activeUserEmail);
  
  // Get DID display elements
  didTextElement = document.querySelector('.did-text');
  copyDidBtn = document.getElementById('copy-did-btn');
  if (copyDidBtn) {
    copyIcon = copyDidBtn.querySelector('.copy-icon');
    checkIcon = copyDidBtn.querySelector('.check-icon');
    copyDidBtn.addEventListener('click', handleCopyDid);
  }
  
  // Get buttons
  exportKeysBtn = document.getElementById('export-keys-btn');
  downloadExtensionBtn = document.getElementById('download-extension-btn');
  refreshBankAccountsBtn = document.getElementById('refresh-bank-accounts');
  refreshPasswordsBtn = document.getElementById('refresh-passwords');
  refreshContactsBtn = document.getElementById('refresh-contacts');
  
  // Get search inputs
  quickPasswordSearch = document.getElementById('quick-password-search');
  passwordSearch = document.getElementById('password-search');
  contactSearch = document.getElementById('contact-search');
  quickPasswordResults = document.getElementById('quick-password-results');
  
  // Get settings elements
  autoLockSelect = document.getElementById('auto-lock');
  requirePasswordToggle = document.getElementById('require-password');
  dataSyncToggle = document.getElementById('data-sync');
  
  // Get action buttons
  addPasswordBtn = document.getElementById('add-password-btn');
  addContactBtn = document.getElementById('add-contact-btn');
  
  // Legacy elements for backwards compatibility
  accountsList = document.getElementById('accounts-list');
  // The following elements have been removed from the HTML but kept here for backwards compatibility
  // testConnectionBtn = document.getElementById('test-connection-btn');
  // testStorageBtn = document.getElementById('test-storage-btn');
  // testSyncBtn = document.getElementById('test-sync-btn');
  // refreshStorageBtn = document.getElementById('refresh-storage-btn');
  // runSyncBtn = document.getElementById('run-sync-btn');
  // testResultsDiv = document.getElementById('test-results');
  // localStorageKeysList = document.getElementById('localStorage-keys');
  // chromeStorageKeysList = document.getElementById('chrome-storage-keys');
  // comparisonDetailsContent = document.getElementById('comparison-details-content');
  // statusMessage = document.getElementById('status-message');
  
  // Set up sidebar navigation
  setupSidebarNavigation();
  
  // Set up event listeners for UI interaction
  setupEventListeners();
  
  // Set up contact modal functionality
  setupContactModal();
  
  // Update version display
  const versionEl = document.querySelector('.version');
  if (versionEl) {
    versionEl.textContent = `v${window.EXTENSION_VERSION}`;
  }
  
  // Update footer with user's first name
  const footerEl = document.querySelector('footer');
  if (footerEl) {
    // Remove the Extension ID element since we don't need it anymore
    const securityStatusEl = footerEl.querySelector('.security-status span');
    if (securityStatusEl) {
      // Store the text we need to update - will be set once we have user data
      window.updateFooterWithFirstName = function(firstName) {
        if (securityStatusEl) {
          securityStatusEl.textContent = `Set Yourself Free, ${firstName || 'User'}`;
        }
      };
    }
  }
  
  // Set up button click handlers
  if (exportKeysBtn) {
    exportKeysBtn.addEventListener('click', handleExportKeys);
  }
  
  // Import keys functionality has been removed
  
  if (downloadExtensionBtn) {
    downloadExtensionBtn.addEventListener('click', handleDownloadExtension);
  }
  
  // Load initial data
  try {
    await loadAllData();
  } catch (error) {
    console.error('Error loading data:', error);
  }
  
  // Legacy button setup
  // These elements have been removed from the HTML, so we don't need to set up event listeners
  // The code is left commented for reference
  /*
  if (testStorageBtn) {
    testStorageBtn.addEventListener('click', handleTestStorage);
  }
  
  if (testSyncBtn) {
    testSyncBtn.addEventListener('click', handleSyncNow);
  }
  
  if (refreshStorageBtn) {
    refreshStorageBtn.addEventListener('click', loadStorageComparison);
  }
  
  if (runSyncBtn) {
    runSyncBtn.addEventListener('click', handleSyncNow);
  }
  */
}

// Set up sidebar navigation
function setupSidebarNavigation() {
  const sidebarItems = document.querySelectorAll('.sidebar-item');
  const tabContents = document.querySelectorAll('.tab-content');
  
  // Setup sidebar toggle button
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      sidebarExpanded = !sidebarExpanded;
      if (sidebarExpanded) {
        sidebar.classList.add('expanded');
      } else {
        sidebar.classList.remove('expanded');
      }
    });
  }
  
  // Hover event to expand sidebar
  if (sidebar) {
    sidebar.addEventListener('mouseenter', () => {
      sidebar.classList.add('expanded');
    });
    
    sidebar.addEventListener('mouseleave', () => {
      if (!sidebarExpanded) {
        sidebar.classList.remove('expanded');
      }
    });
  }
  
  // Setup tab switching
  sidebarItems.forEach(item => {
    item.addEventListener('click', () => {
      // Remove active class from all buttons and contents
      sidebarItems.forEach(i => i.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));
      
      // Add active class to clicked button and corresponding content
      item.classList.add('active');
      const tabId = item.getAttribute('data-tab');
      currentTab = tabId;
      document.getElementById(`${tabId}-tab`).classList.add('active');
    });
  });
}

// Set up event listeners for UI interaction
function setupEventListeners() {
  // Password categories have been removed as requested
  // Default to showing all passwords
  
  // Add refresh button functionality
  if (refreshBankAccountsBtn) {
    refreshBankAccountsBtn.addEventListener('click', refreshBankAccounts);
  }
  
  if (refreshPasswordsBtn) {
    refreshPasswordsBtn.addEventListener('click', refreshPasswords);
  }
  
  if (refreshContactsBtn) {
    refreshContactsBtn.addEventListener('click', refreshContacts);
  }
  
  // Add search functionality
  if (quickPasswordSearch) {
    quickPasswordSearch.addEventListener('input', handleQuickPasswordSearch);
  }
  
  if (passwordSearch) {
    passwordSearch.addEventListener('input', handlePasswordSearch);
  }
  
  if (contactSearch) {
    contactSearch.addEventListener('input', handleContactSearch);
  }
  
  // Add buttons for adding new items
  if (addPasswordBtn) {
    addPasswordBtn.addEventListener('click', handleAddPassword);
  }
  
  if (addContactBtn) {
    addContactBtn.addEventListener('click', handleAddContact);
  }
  
  // Password modal functionality
  const passwordModal = document.getElementById('password-modal');
  const closePasswordModalBtn = document.getElementById('close-password-modal');
  const cancelPasswordBtn = document.getElementById('cancel-password-btn');
  const passwordForm = document.getElementById('password-form');
  
  // Close modal buttons
  if (closePasswordModalBtn) {
    closePasswordModalBtn.addEventListener('click', closePasswordModal);
  }
  
  if (cancelPasswordBtn) {
    cancelPasswordBtn.addEventListener('click', closePasswordModal);
  }
  
  // Password visibility toggle
  const togglePasswordBtn = document.querySelector('.toggle-password-visibility');
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', togglePasswordVisibility);
  }
  
  // Password form submission
  if (passwordForm) {
    passwordForm.addEventListener('submit', handlePasswordSubmit);
  }
  
  // Close modal if clicking outside content
  if (passwordModal) {
    passwordModal.addEventListener('click', (e) => {
      if (e.target === passwordModal) {
        closePasswordModal();
      }
    });
  }
  // Save settings automatically when changed
  if (autoLockSelect) {
    autoLockSelect.addEventListener('change', saveSettings);
  }
  
  if (requirePasswordToggle) {
    requirePasswordToggle.addEventListener('change', saveSettings);
  }
  
  if (dataSyncToggle) {
    dataSyncToggle.addEventListener('change', saveSettings);
  }
}

// Load dashboard data
async function loadDashboardData() {
  try {
    // Request dashboard summary from background script
    const response = await sendMessageToBackground({ type: 'GET_DASHBOARD_DATA' });
    
    if (response && response.success) {
      updateDashboardUI(response.data);
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

/**
 * Helper function to sanitize email consistently for storage keys
 * This ensures we use the same pattern as the web app
 * This function uses the global sanitizeEmail from emailUtils.js
 */
function sanitizeEmail(email) {
  // Use the global window.sanitizeEmail function from emailUtils.js
  return window.sanitizeEmail(email);
}

/**
 * Helper function to get a consistent storage key for user data
 * This ensures we use the same format as the web app
 */
function getUserDataKey(email, dataType) {
  if (!email) return null;
  const sanitizedEmail = sanitizeEmail(email);
  return `user_${sanitizedEmail}_${dataType}`;
}

/**
 * Helper function to get user-specific data from storage in a consistent way
 * This works with both the web app's localStorage and the extension's chrome.storage
 */
async function getUserData(email, dataType, forceSync = false) {
  if (!email) {
    console.error(`Cannot get user data: No email provided for ${dataType}`);
    return [];
  }
  
  // Only process critical encryption files (mata_active_user, mata_salt_*, mata_keys_*)
  // Return empty arrays for other data types like passwords, bank_accounts, and contacts
  const isCriticalFile = dataType === 'active_user' || 
                         dataType === 'salt' || 
                         dataType === 'keys';
  
  if (!isCriticalFile) {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Skipping non-critical data type: ${dataType}`);
    return [];
  }
  
  // First, get the direct mata_* format key (used in background.js)
  const sanitizedEmail = sanitizeEmail(email);
  const mataStorageKey = `mata_${sanitizedEmail}_${dataType === 'bank_accounts' ? 'bankaccounts' : dataType}`;
  
  // Also get the legacy user_* format key for backward compatibility
  const legacyStorageKey = getUserDataKey(email, dataType);
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting ${dataType} data with keys:`, { 
    mataKey: mataStorageKey, 
    legacyKey: legacyStorageKey 
  });
  
  try {
    // First, for keys dataType, try directly using the GET_KEYS API
    if (dataType === 'keys') {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Attempting to get keys directly via GET_KEYS API`);
      try {
        const keysResponse = await sendMessageToBackground({
          type: 'GET_KEYS',
          email: email
        });
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] GET_KEYS response:`, keysResponse);
        
        if (keysResponse && keysResponse.success && keysResponse.keys) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully retrieved keys via direct API`);
          return keysResponse.keys;
        } else {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] GET_KEYS was unsuccessful, falling back to storage methods`);
        }
      } catch (keysError) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error calling GET_KEYS API:`, keysError);
      }
    }
    
    // Try to get from localStorage via content script, trying both key formats
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Attempting to get ${dataType} from localStorage via content script`);
    
    // Try with mata_* key first
    let response = await sendMessageToBackground({
      type: 'GET_LOCAL_STORAGE_VALUE',
      key: mataStorageKey
    });
    
    // If no data found with mata_* key, try with user_* key
    if (!response?.success || !response?.value) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] No data found with mata_* key, trying legacy key`);
      response = await sendMessageToBackground({
        type: 'GET_LOCAL_STORAGE_VALUE',
        key: legacyStorageKey
      });
    }
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] localStorage response for ${dataType}:`, response);
    
    if (response && response.success && response.value) {
      try {
        const parsedData = JSON.parse(response.value);
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully parsed localStorage data for ${dataType}:`, {
          isArray: Array.isArray(parsedData),
          length: Array.isArray(parsedData) ? parsedData.length : 'N/A',
          firstItemKeys: Array.isArray(parsedData) && parsedData.length > 0 ? Object.keys(parsedData[0]) : 'N/A'
        });
        
        // Update chrome.storage with this value to keep them in sync
        // Store under both key formats for maximum compatibility
        try {
          const storageUpdate = { 
            [mataStorageKey]: parsedData,
            [legacyStorageKey]: parsedData 
          };
          
          chrome.storage.local.set(storageUpdate, () => {
            if (chrome.runtime.lastError) {
              console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error updating chrome.storage from localStorage`, chrome.runtime.lastError);
            } else {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully synced ${dataType} to chrome.storage using both key formats`);
            }
          });
        } catch (storageError) {
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error syncing to chrome.storage:`, storageError);
          // Continue anyway since we already have the data
        }
        
        // Ensure we return the correct format
        if (Array.isArray(parsedData)) {
          return parsedData;
        } else {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Data found in localStorage for ${dataType} and it's an object`);
          // If we found object data (expected for keys), return it directly
          if (parsedData && typeof parsedData === 'object') {
            // If it has an items array inside, extract that for backward compatibility
            if (parsedData.items && Array.isArray(parsedData.items)) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found items array inside object, using that for ${dataType}`);
              return parsedData.items;
            }
            // Otherwise return the object itself (for keys, salt)
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Returning object data for ${dataType}`);
            return parsedData;
          }
        }
      } catch (error) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing ${dataType} data from localStorage:`, error);
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Raw value from localStorage:`, response.value);
      }
    } else {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No ${dataType} data found in localStorage or response was not successful`);
    }
    
    // If local storage failed or we need to force sync, try directly using background.js methods
    if (forceSync || !response || !response.success || !response.value) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Falling back to direct background API for ${dataType}`);
      
      // Direct background API method
      let requestType = 'GET_PASSWORDS';
      if (dataType === 'contacts') {
        requestType = 'GET_CONTACTS';
      } else if (dataType === 'bank_accounts') {
        requestType = 'GET_BANK_ACCOUNTS';
      } else if (dataType === 'keys') {
        requestType = 'GET_KEYS';
      }
      
      const directResponse = await sendMessageToBackground({
        type: requestType,
        email: email
      });
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Direct API response for ${dataType}:`, directResponse);
      
      if (directResponse && !directResponse.error) {
        // Handle different response formats based on data type
        if (dataType === 'keys' && directResponse.keys) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Retrieved keys object using direct API`);
          return directResponse.keys;
        } else if (directResponse.items && Array.isArray(directResponse.items)) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Retrieved ${directResponse.items.length} ${dataType} items using direct API`);
          
          // Automatically sync back to localStorage for future consistency
          try {
            // Update both key formats
            await sendMessageToBackground({
              type: 'SET_LOCAL_STORAGE_VALUE',
              key: mataStorageKey,
              value: JSON.stringify(directResponse.items)
            });
            
            await sendMessageToBackground({
              type: 'SET_LOCAL_STORAGE_VALUE',
              key: legacyStorageKey,
              value: JSON.stringify(directResponse.items)
            });
            
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully synced ${dataType} to localStorage with both key formats`);
          } catch (syncError) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Failed to sync ${dataType} to localStorage:`, syncError);
          }
          
          return directResponse.items;
        }
      } else if (directResponse && directResponse.error) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in direct background request:`, directResponse.error);
      }
    }
    
    // Last resort: try chrome.storage with both key formats
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying chrome.storage as last resort for ${dataType}`);
    
    try {
      // Get from chrome.storage with both key formats
      const storageResult = await new Promise(resolve => {
        chrome.storage.local.get([mataStorageKey, legacyStorageKey], result => {
          resolve(result);
        });
      });
      
      // Try mata key first
      if (storageResult && storageResult[mataStorageKey]) {
        const data = storageResult[mataStorageKey];
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with mata key:`, data);
        
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object') {
          // If it's an object with items array, extract that
          if (data.items && Array.isArray(data.items)) {
            return data.items;
          }
          // For keys data, just return the object directly
          if (dataType === 'keys' || dataType === 'salt') {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Returning object data for ${dataType}`);
            return data;
          }
        }
      }
      
      // Then legacy key
      if (storageResult && storageResult[legacyStorageKey]) {
        const data = storageResult[legacyStorageKey];
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with legacy key:`, data);
        
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object') {
          // If it's an object with items array, extract that
          if (data.items && Array.isArray(data.items)) {
            return data.items;
          }
          // For keys data, just return the object directly
          if (dataType === 'keys' || dataType === 'salt') {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Returning object data for ${dataType}`);
            return data;
          }
        }
      }
    } catch (storageError) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error accessing chrome.storage:`, storageError);
    }
    
    // For active_user, try one more direct approach as a last resort
    if (dataType === 'active_user') {
      try {
        // Try to get directly from localStorage via web API
        const activeUser = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            { 
              type: 'GET_LOCAL_STORAGE_VALUE',
              messageData: { key: 'mata_active_user' } 
            },
            (response) => {
              if (chrome.runtime.lastError) {
                console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Runtime error getting active_user:`, chrome.runtime.lastError);
                resolve(null);
                return;
              }
              resolve(response && response.success ? response.value : null);
            }
          );
          
          // Set a timeout just in case to avoid hanging
          setTimeout(() => {
            resolve(null);
          }, 2000);
        });
        
        if (activeUser) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active_user via direct localStorage call:`, activeUser);
          return activeUser;
        }
        
        // If no active user, try to find any account in local storage
        if (!activeUser) {
          const allAccounts = await getAllAccounts();
          if (allAccounts && allAccounts.length > 0) {
            const firstAccount = allAccounts[0];
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user found, using first account:`, firstAccount);
            return firstAccount;
          }
        }
      } catch (directError) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in direct active_user retrieval:`, directError);
      }
    }
    
    // Return empty array as default
    console.warn(`[DEBUG v${window.EXTENSION_VERSION}] All attempts to get ${dataType} failed, returning empty array`);
    return [];
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error retrieving ${dataType}:`, error);
    return [];
  }
}

/**
 * Helper function to save user-specific data to storage in a consistent way
 * This ensures data is synced between localStorage and chrome.storage
 */
/**
 * Helper function to get all accounts from both storage and web app
 * @returns {Promise<Array<string>>} Array of account emails
 */
async function getAllAccounts() {
  try {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting all accounts...`);
    
    // First try to get accounts from the extension background script
    try {
      const response = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
      
      if (response && response.success && Array.isArray(response.accounts)) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${response.accounts.length} accounts from extension`);
        return response.accounts;
      } else {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] No accounts found in LIST_ACCOUNTS response`);
      }
    } catch (extensionError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error getting accounts from extension:`, extensionError);
    }
    
    // If that fails, check chrome.storage.local for mata_keys_* patterns
    try {
      // Get all keys from chrome.storage
      const allStorage = await new Promise(resolve => {
        chrome.storage.local.get(null, (items) => {
          if (chrome.runtime.lastError) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error getting all storage:`, chrome.runtime.lastError);
            resolve({});
          } else {
            resolve(items || {});
          }
        });
      });
      
      // Look for keys matching mata_keys_*
      const keyPattern = /^mata_keys_(.+)$/;
      const accounts = [];
      
      for (const key in allStorage) {
        const match = key.match(keyPattern);
        if (match && match[1]) {
          // Replace underscores back to @ and . for email format
          let email = match[1];
          try {
            // First underscore becomes @, remaining become .
            const atIndex = email.indexOf('_');
            if (atIndex !== -1) {
              email = email.substring(0, atIndex) + '@' + email.substring(atIndex + 1).replace(/_/g, '.');
            }
            accounts.push(email);
          } catch (e) {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error converting email format:`, e);
            // Use as is
            accounts.push(email);
          }
        }
      }
      
      if (accounts.length > 0) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${accounts.length} accounts from storage keys`);
        return accounts;
      }
    } catch (storageError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error scanning storage for accounts:`, storageError);
    }
    
    // As a last resort, try to check localStorage directly for mata_salt_* patterns
    try {
      const response = await sendMessageToBackground({ 
        type: 'SYNC_CRITICAL_FILES' 
      });
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Force sync result:`, response);
      
      // Request the sync results
      const syncResponse = await sendMessageToBackground({
        type: 'GET_DASHBOARD_DATA'
      });
      
      if (syncResponse && syncResponse.success && syncResponse.accounts) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${syncResponse.accounts.length} accounts from dashboard data`);
        return syncResponse.accounts.map(acc => acc.email || acc);
      }
    } catch (syncError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error syncing critical files:`, syncError);
    }
    
    // If we still have no accounts, return empty array
    console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No accounts found after all attempts`);
    return [];
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in getAllAccounts:`, error);
    return [];
  }
}

async function saveUserData(email, dataType, data) {
  if (!email) {
    throw new Error('Email is required to save user data');
  }
  
  if (!Array.isArray(data)) {
    throw new Error(`Data must be an array for ${dataType}`);
  }
  
  // Generate both key formats for maximum compatibility
  const sanitizedEmail = sanitizeEmail(email);
  const mataStorageKey = `mata_${sanitizedEmail}_${dataType === 'bank_accounts' ? 'bankaccounts' : dataType}`;
  const legacyStorageKey = getUserDataKey(email, dataType);
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Saving ${data.length} ${dataType} items with keys:`, {
    mataKey: mataStorageKey,
    legacyKey: legacyStorageKey
  });
  
  try {
    // Save with both key formats
    const jsonData = JSON.stringify(data);
    
    // First try with mata_* key
    const mataResponse = await sendMessageToBackground({
      type: 'SET_LOCAL_STORAGE_VALUE',
      key: mataStorageKey,
      value: jsonData
    });
    
    if (!mataResponse || !mataResponse.success) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to save ${dataType} with mata_ key, trying legacy key`);
    }
    
    // Also try with user_* key for backward compatibility
    const legacyResponse = await sendMessageToBackground({
      type: 'SET_LOCAL_STORAGE_VALUE',
      key: legacyStorageKey,
      value: jsonData
    });
    
    if (!legacyResponse || !legacyResponse.success) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to save ${dataType} with legacy key`);
    }
    
    // If both failed, throw an error
    if ((!mataResponse || !mataResponse.success) && (!legacyResponse || !legacyResponse.success)) {
      throw new Error(`Failed to save ${dataType} to localStorage with any key format`);
    }
    
    // Save to chrome.storage.local for redundancy
    try {
      const storageUpdate = {
        [mataStorageKey]: data,
        [legacyStorageKey]: data
      };
      
      await new Promise(resolve => {
        chrome.storage.local.set(storageUpdate, () => {
          if (chrome.runtime.lastError) {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error saving to chrome.storage:`, chrome.runtime.lastError);
          }
          resolve();
        });
      });
    } catch (storageError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to save ${dataType} to chrome.storage:`, storageError);
      // Continue anyway as localStorage is the primary storage
    }
    
    // Force a sync to ensure data is consistent across all storage systems
    try {
      await sendMessageToBackground({ type: 'SYNC_STORAGE' });
    } catch (syncError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Force sync failed:`, syncError);
      // Not critical, continue
    }
    
    return true;
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error saving ${dataType}:`, error);
    throw error;
  }
}

// Get the active user email from storage
/**
 * Check if any MATA web app tab is open and available
 * This uses the FIND_MATA_TABS message type to communicate with background.js
 * @returns {Promise<boolean>} Whether the MATA web app is available in any tab
 */
async function isWebAppAvailable() {
  try {
    console.log('Checking if MATA web app is available in any tab');
    
    // Send message to background script to find MATA tabs
    const response = await sendMessageToBackground({
      type: 'FIND_MATA_TABS'
    });
    
    if (response && response.success && response.count > 0) {
      console.log(`Found ${response.count} MATA web app tabs`);
      return true;
    }
    
    console.log('No MATA web app tabs found');
    return false;
  } catch (error) {
    console.error('Error checking for MATA web app availability:', error);
    return false;
  }
}

async function getActiveUserEmail() {
  try {
    const lastActiveEmailKey = 'mata_active_user';
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting active user email...`);
    
    // Try multiple approaches to get the active user, with fallbacks for each method
    
    // Approach 1: Get directly from localStorage via background script
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Approach 1: Getting active user from localStorage via background script`);
      
      // First check if the web app is available in any tab
      const webAppAvailable = await isWebAppAvailable();
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Web app available in tabs:`, webAppAvailable);
      
      if (webAppAvailable) {
        // Request the active user directly from localStorage through background.js
        const localStorageResponse = await sendMessageToBackground({ 
          type: 'GET_LOCAL_STORAGE_VALUE',
          key: lastActiveEmailKey
        });
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] GET_LOCAL_STORAGE_VALUE response:`, localStorageResponse);
        
        if (localStorageResponse?.success && localStorageResponse?.value) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user directly in localStorage:`, localStorageResponse.value);
          
          // Also update chrome.storage with this value to keep them in sync
          await new Promise(resolve => {
            chrome.storage.local.set({ [lastActiveEmailKey]: localStorageResponse.value }, resolve);
          });
          
          return localStorageResponse.value;
        } else {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] No user found in localStorage or error:`, localStorageResponse?.error);
          
          // If localStorage access failed but web app is available,
          // try to force sync critical files
          try {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Web app is available but active user not found, forcing sync`);
            await sendMessageToBackground({ type: 'SYNC_CRITICAL_FILES' });
            
            // Try again after sync
            const syncResult = await sendMessageToBackground({ 
              type: 'GET_LOCAL_STORAGE_VALUE',
              key: lastActiveEmailKey
            });
            
            if (syncResult?.success && syncResult?.value) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user after forced sync:`, syncResult.value);
              
              // Also update chrome.storage
              await new Promise(resolve => {
                chrome.storage.local.set({ [lastActiveEmailKey]: syncResult.value }, resolve);
              });
              
              return syncResult.value;
            }
          } catch (syncError) {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error during forced sync:`, syncError);
          }
        }
      } else {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Web app not available in any tab, skipping localStorage approach`);
      }
    } catch (directError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to get mata_active_user directly from localStorage:`, directError);
    }
    
    // Approach 2: Try sync and check chrome.storage
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Approach 2: Trying sync and checking chrome.storage`);
      
      // Force a full sync to ensure we have the most recent data
      try {
        await sendMessageToBackground({ type: 'SYNC_STORAGE' });
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Forced storage sync to update mata_active_user`);
      } catch (syncError) {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Storage sync failed, will try to use existing data:`, syncError);
      }
      
      // Now get the value from chrome.storage
      const result = await new Promise(resolve => {
        chrome.storage.local.get(lastActiveEmailKey, (result) => {
          resolve(result[lastActiveEmailKey] || null);
        });
      });
      
      if (result) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user in chrome.storage after sync:`, result);
        return result;
      }
    } catch (storageError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error accessing chrome.storage for active user:`, storageError);
    }
    
    // NEW APPROACH: Use the getAllAccounts function to get all available accounts
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] NEW APPROACH: Getting all accounts to determine active user`);
      const accounts = await getAllAccounts();
      
      if (accounts && accounts.length > 0) {
        // Use the first account as active user
        const firstAccount = accounts[0];
        const email = typeof firstAccount === 'string' ? firstAccount : (firstAccount.email || null);
        
        if (email) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Setting first account as active user:`, email);
          
          // Store this in chrome.storage
          await new Promise(resolve => {
            chrome.storage.local.set({ [lastActiveEmailKey]: email }, resolve);
          });
          
          // Try to update localStorage
          try {
            await sendMessageToBackground({
              type: 'SET_LOCAL_STORAGE_VALUE',
              key: lastActiveEmailKey,
              value: email
            });
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updated localStorage with new active user`);
          } catch (storageError) {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not update localStorage with active user:`, storageError);
          }
          
          return email;
        }
      } else {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] No accounts found with getAllAccounts`);
      }
    } catch (allAccountsError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error using getAllAccounts:`, allAccountsError);
    }
    
    // Approach 3: Check for accounts data
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Approach 3: Checking mata_accounts for a default user`);
      
      // Try both formats of accounts data
      const accountKeys = ['mata_accounts', 'user_accounts'];
      
      for (const accountKey of accountKeys) {
        const accountsData = await new Promise(resolve => {
          chrome.storage.local.get([accountKey], (result) => {
            resolve(result[accountKey] || null);
          });
        });
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Checking ${accountKey}:`, accountsData);
        
        if (accountsData) {
          // Handle both array format and object format
          let accounts = accountsData;
          
          // Parse if it's a string
          if (typeof accounts === 'string') {
            try {
              accounts = JSON.parse(accounts);
            } catch (e) {
              console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to parse ${accountKey} as JSON:`, e);
              continue;
            }
          }
          
          // Check if it's an array or has an items property
          if (Array.isArray(accounts) && accounts.length > 0) {
            // Take the first account as the active user
            const firstAccount = accounts[0];
            const firstAccountEmail = firstAccount.email;
            
            if (firstAccountEmail) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Setting first account as active user:`, firstAccountEmail);
              // Store this in chrome.storage
              await new Promise(resolve => {
                chrome.storage.local.set({ [lastActiveEmailKey]: firstAccountEmail }, resolve);
              });
              
              // Try to update localStorage via background script
              try {
                await sendMessageToBackground({
                  type: 'SET_LOCAL_STORAGE_VALUE',
                  key: lastActiveEmailKey,
                  value: firstAccountEmail
                });
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updated localStorage with new active user`);
              } catch (storageError) {
                console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not update localStorage with active user:`, storageError);
              }
              
              return firstAccountEmail;
            }
          } else if (accounts?.items && Array.isArray(accounts.items) && accounts.items.length > 0) {
            // Handle object with items array format
            const firstAccount = accounts.items[0];
            const firstAccountEmail = firstAccount.email;
            
            if (firstAccountEmail) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Setting first account as active user from items array:`, firstAccountEmail);
              // Store this in chrome.storage
              await new Promise(resolve => {
                chrome.storage.local.set({ [lastActiveEmailKey]: firstAccountEmail }, resolve);
              });
              
              // Try to update localStorage
              try {
                await sendMessageToBackground({
                  type: 'SET_LOCAL_STORAGE_VALUE',
                  key: lastActiveEmailKey,
                  value: firstAccountEmail
                });
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updated localStorage with new active user`);
              } catch (storageError) {
                console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not update localStorage with active user:`, storageError);
              }
              
              return firstAccountEmail;
            }
          }
        }
      }
    } catch (accountsError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error getting accounts data for fallback active user:`, accountsError);
    }
    
    // Approach 4: Last resort - check all keys in storage looking for user data
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Approach 4: Scanning all storage keys for user data`);
      
      const allStorage = await new Promise(resolve => {
        chrome.storage.local.get(null, (result) => {
          resolve(result || {});
        });
      });
      
      // Look for keys that might contain user data
      const userKeys = Object.keys(allStorage).filter(key => 
        key.includes('_passwords') || 
        key.includes('_contacts') || 
        key.includes('_bankaccounts') ||
        key.includes('_salt_') ||
        key.includes('_keys_') ||
        key.includes('user_')
      );
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found potential user keys:`, userKeys);
      
      if (userKeys.length > 0) {
        // Extract email from key pattern: mata_user@example_com_passwords
        // or user_user@example_com_passwords
        const keyParts = userKeys[0].split('_');
        let email = null;
        
        if (keyParts.length >= 2) {
          // Try to reconstruct the email
          // This is a best-effort approach
          if (keyParts[0] === 'mata' || keyParts[0] === 'user') {
            // Remove the first part and the last part (data type)
            const emailParts = keyParts.slice(1, -1);
            // Re-insert @ and . characters
            email = emailParts.join('_').replace(/_/g, function(match, offset) {
              // First _ becomes @, others become .
              return offset === 0 ? '@' : '.';
            });
            
            if (email && email.includes('@')) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Inferred active user from storage keys:`, email);
              
              // Store this in both storages
              await new Promise(resolve => {
                chrome.storage.local.set({ [lastActiveEmailKey]: email }, resolve);
              });
              
              try {
                await sendMessageToBackground({
                  type: 'SET_LOCAL_STORAGE_VALUE',
                  key: lastActiveEmailKey,
                  value: email
                });
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updated localStorage with inferred active user`);
              } catch (error) {
                console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not update localStorage with inferred user:`, error);
              }
              
              return email;
            }
          }
        }
      }
    } catch (scanError) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error scanning storage for user data:`, scanError);
    }
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user found after all approaches`);
    return null;
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error getting active user email:`, error);
    return null;
  }
}

// Load all data for the new UI tabs
async function loadAllData() {
  try {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Starting loadAllData function`);
    
    // Show loading state
    showLoadingState();
    
    // If we don't have an active user email yet, try to get it
    if (!activeUserEmail) {
      activeUserEmail = await getActiveUserEmail();
      if (activeUserEmail) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Active user email for data loading:`, activeUserEmail);
      } else {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user email found`);
      }
    }
    
    // Check if we have a valid email before proceeding
    if (!activeUserEmail) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] No active user email available. Cannot load data.`);
      showNoUserState();
      hideLoadingState(); // Make sure loading indicators are hidden
      return;
    }
    
    // Method 1: First try to directly get DID and firstName from chrome.storage.local
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Directly fetching user DID and name from storage`);
      const userData = await getUserDIDAndName();
      
      if (userData.firstName && window.updateFooterWithFirstName) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating footer with firstName from storage: ${userData.firstName}`);
        window.updateFooterWithFirstName(userData.firstName);
      }
      
      if (userData.publicKey) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating DID from storage: ${userData.publicKey?.substring(0, 8)}...`);
        updateUserDid(userData.publicKey);
      }
    } catch (storageError) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error getting user data from storage:`, storageError);
    }
    
    // Method 2 (Fallback): If direct storage access failed, try LIST_ACCOUNTS from background
    if (!didTextElement.textContent) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying LIST_ACCOUNTS fallback for user data`);
      const accountsResponse = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
      if (accountsResponse && accountsResponse.success && accountsResponse.accounts) {
        const userAccount = accountsResponse.accounts.find(account => account.email === activeUserEmail);
        if (userAccount) {
          // Update footer with first name if available
          if (userAccount.firstName && window.updateFooterWithFirstName) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating footer with firstName from accounts: ${userAccount.firstName}`);
            window.updateFooterWithFirstName(userAccount.firstName);
          }
          
          // Update DID display if available
          if (userAccount.publicKey) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating DID from accounts: ${userAccount.publicKey?.substring(0, 8)}...`);
            updateUserDid(userAccount.publicKey);
          }
        }
      }
    }
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Requesting data for email:`, activeUserEmail);
    
    // Only sync critical encryption files (mata_active_user, mata_salt_*, mata_keys_*)
    // For passwords, bank accounts, and contacts, just use empty arrays
    
    // Set empty arrays for non-critical data
    bankAccounts = [];
    passwords = [];
    contacts = [];
    
    // Sync critical files - but only if needed
    // Since we've already tried direct chrome.storage access above, we only need to
    // sync if that failed or was incomplete
    try {
      // Check if direct chrome.storage access was successful
      const directAccessSuccessful = didTextElement && didTextElement.textContent;
      
      if (!directAccessSuccessful) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Direct storage access wasn't fully successful, syncing critical files for: ${activeUserEmail}`);
        
        // Get active user data first
        await getUserData(activeUserEmail, 'active_user');
        
        // Then salt and keys
        await getUserData(activeUserEmail, 'salt');
        await getUserData(activeUserEmail, 'keys');
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Critical files synced successfully`);
      } else {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using direct storage access data - skipping additional sync`);
      }
    } catch (syncError) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error syncing critical files:`, syncError);
    }
    
    // Render empty UI states for data
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using empty bank accounts data`);
    renderBankAccounts(bankAccounts);
    updateBankAccountsSummary();
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using empty passwords data`);
    renderPasswords(passwords);
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using empty contacts data`);
    renderContacts(contacts);
    
    // Hide loading state
    hideLoadingState();
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Data loading complete`);
    
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error loading data:`, error);
    showErrorState(error.message);
  }
}

// Show state when no user is logged in
function showNoUserState() {
  // Import the version from mataConfig.js
  let versionText = '';
  try {
    // Try to use the imported version, but fall back to a hardcoded one if needed
    versionText = `<div class="version-text">MATA Extension v${window.EXTENSION_VERSION}</div>`;
  } catch (e) {
    versionText = '<div class="version-text">MATA Extension v1.4.6</div>';
  }
  
  const noUserHtml = `
    <div class="no-user-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <h3>No User Account Found</h3>
      <p>Please log in to MATA web application first to access your data.</p>
      <button class="open-mata-btn">Open MATA Web App</button>
      ${versionText}
    </div>
  `;
  
  if (bankAccountsList) {
    bankAccountsList.innerHTML = noUserHtml;
  }
  
  if (passwordsList) {
    passwordsList.innerHTML = noUserHtml;
  }
  
  if (contactsList) {
    contactsList.innerHTML = noUserHtml;
  }
  
  // Add event listener to open MATA buttons
  document.querySelectorAll('.open-mata-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      try {
        // Open the MATA web app directly without importing
        chrome.tabs.query({url: ["*://mat-av-20-timalmond.replit.app/*", "*://*.replit.app/*"]}, (tabs) => {
          if (tabs && tabs.length > 0) {
            // Focus existing tab
            chrome.tabs.update(tabs[0].id, {active: true});
          } else {
            // Create new tab
            chrome.tabs.create({url: "https://mat-av-20-timalmond.replit.app/"});
          }
        });
      } catch (error) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error opening MATA web app:`, error);
        // Fallback to direct URL if something goes wrong
        chrome.tabs.create({ url: 'https://mat-av-20-timalmond.replit.app/' });
      }
    });
  });
}

// Show loading state in the UI
function showLoadingState() {
  if (bankAccountsList) {
    bankAccountsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading bank accounts...</p>
      </div>
    `;
  }
  
  if (passwordsList) {
    passwordsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading passwords...</p>
      </div>
    `;
  }
  
  if (contactsList) {
    contactsList.innerHTML = `
      <div class="loading-state">
        <div class="spinner"></div>
        <p>Loading contacts...</p>
      </div>
    `;
  }
}

// Hide loading state
function hideLoadingState() {
  // This function is called after data is loaded and rendered
  // Additional UI cleanup if needed
}

// Show error state
function showErrorState(message) {
  // Import the version from mataConfig.js
  let versionText = '';
  try {
    // Try to use the imported version, but fall back to a hardcoded one if needed
    versionText = `<div class="version-text">MATA Extension v${window.EXTENSION_VERSION}</div>`;
  } catch (e) {
    versionText = '<div class="version-text">MATA Extension v1.4.6</div>';
  }
  
  const errorHtml = `
    <div class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>Error loading data: ${message}</p>
      <button class="retry-btn">Retry</button>
      ${versionText}
    </div>
  `;
  
  if (bankAccountsList) {
    bankAccountsList.innerHTML = errorHtml;
  }
  
  if (passwordsList) {
    passwordsList.innerHTML = errorHtml;
  }
  
  if (contactsList) {
    contactsList.innerHTML = errorHtml;
  }
  
  // Add retry button functionality
  document.querySelectorAll('.retry-btn').forEach(btn => {
    btn.addEventListener('click', loadAllData);
  });
}

// Update dashboard UI with data
function updateDashboardUI(data) {
  // This would update the dashboard cards with real data from the user's vaults
  // For now we just implement dummy updates
  
  // Update identity card
  if (data && data.user) {
    document.getElementById('identity-user').textContent = data.user.email || '--';
    document.getElementById('identity-pubkey').textContent = 
      (data.user.publicKey && data.user.publicKey.substring(0, 20) + '...') || '--';
  }
  
  // Update sync status
  const syncDot = document.getElementById('sync-status-dot');
  const syncText = document.getElementById('sync-status-text');
  
  if (data && data.syncStatus) {
    if (data.syncStatus === 'synced') {
      syncDot.style.backgroundColor = 'var(--success-color)';
      syncText.textContent = 'Fully Synced';
    } else if (data.syncStatus === 'partial') {
      syncDot.style.backgroundColor = 'var(--warning-color)';
      syncText.textContent = 'Partially Synced';
    } else {
      syncDot.style.backgroundColor = 'var(--error-color)';
      syncText.textContent = 'Not Synced';
    }
  }
}

// Load accounts from storage
async function loadAccounts() {
  try {
    // Request accounts list from background script
    const response = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to load accounts');
    }
    
    const accounts = response.accounts;
    
    // Display accounts
    // Always render accounts, no empty state needed
    renderAccounts(accounts);
    
  } catch (error) {
    console.error('Error loading accounts:', error);
    accountsList.innerHTML = `
      <div class="error-state">
        <p>Error loading accounts: ${error.message}</p>
      </div>
    `;
  }
}

// Render accounts list
function renderAccounts(accounts) {
  accountsList.innerHTML = '';
  
  accounts.forEach(account => {
    const accountElement = document.createElement('div');
    accountElement.className = 'account-card';
    
    const formattedDate = new Date(account.lastUpdated).toLocaleString();
    
    accountElement.innerHTML = `
      <div class="account-info">
        <div class="account-email">${account.email}</div>
        <div class="account-name">${account.firstName || 'User'}</div>
      </div>
      <div class="account-actions">
        <button class="view-btn" data-email="${account.email}" title="View Details">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        <button class="copy-btn" data-pubkey="${account.publicKey}" title="Copy Public Key">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
            <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
          </svg>
        </button>
      </div>
    `;
    
    // If this is the active account, update the footer with the user's first name
    if (activeUserEmail === account.email && window.updateFooterWithFirstName) {
      window.updateFooterWithFirstName(account.firstName);
    }
    
    // Add event listeners to the buttons
    accountElement.querySelector('.view-btn').addEventListener('click', () => {
      viewAccountDetails(account.email);
    });
    
    accountElement.querySelector('.copy-btn').addEventListener('click', (e) => {
      const publicKey = e.currentTarget.getAttribute('data-pubkey');
      copyToClipboard(publicKey);
    });
    
    accountsList.appendChild(accountElement);
  });
}

// Show empty state when no accounts
function showEmptyState() {
  // Just clear the accounts list without showing an empty state message
  accountsList.innerHTML = '';
}

// View account details
async function viewAccountDetails(email) {
  try {
    // In a real implementation, this would show a modal with account details
    console.log("Viewing details for:", email);
    
    // For demonstration purposes, we'll just log the keys
    const response = await sendMessageToBackground({ 
      type: 'GET_KEYS', 
      email: email 
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to retrieve account details');
    }
    
    // Here we would display a modal with the account details
    // But for security, we should not expose sensitive data in the popup
    alert(`Viewing details for ${email}`);
    
  } catch (error) {
    console.error('Error viewing account details:', error);
    alert(`Error: ${error.message}`);
  }
}

// Render bank accounts list
function renderBankAccounts(accounts) {
  if (!bankAccountsList) return;
  
  // Always display the empty message as requested
  bankAccountsList.innerHTML = `
    <div class="list-empty-message">
      <p>No bank accounts yet</p>
    </div>
  `;
  
  // Update counts for UI
  document.getElementById('bank-accounts-count').textContent = '0';
  document.getElementById('total-balance').textContent = '$0.00';
  
  return;
  
  // The code below is now unreachable - left for reference but will never run
  // -------------------------------------------------------------------------
  bankAccountsList.innerHTML = '';
  
  accounts.forEach(account => {
    const accountElement = document.createElement('div');
    accountElement.className = 'bank-account-card';
    
    // Format the balance with proper currency symbol and decimal places
    const formattedBalance = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: account.isoCurrencyCode || 'USD',
      minimumFractionDigits: 2
    }).format(account.availableBalance || 0);
    
    // Get the proper icon for account type
    const accountTypeIcon = getAccountTypeIcon(account.accountType);
    
    accountElement.innerHTML = `
      <div class="bank-account-header">
        <div class="bank-account-institution">
          <img src="${getInstitutionLogo(account)}" alt="${account.institutionName || 'Bank'}" class="institution-logo">
          <span>${account.institutionName || 'Bank'}</span>
        </div>
        <div class="bank-account-type">
          <span class="account-type-badge ${account.accountType}">${account.accountType}</span>
        </div>
      </div>
      <div class="bank-account-details">
        <div class="bank-account-name">${account.accountName}</div>
        <div class="bank-account-number">${maskAccountNumber(account.accountNumber)}</div>
      </div>
      <div class="bank-account-balance">
        <div class="balance-amount">${formattedBalance}</div>
        <div class="balance-label">Available Balance</div>
      </div>
      <div class="bank-account-actions">
        <button class="view-transactions-btn" data-account-id="${account.id}" title="View Transactions">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"></polyline>
            <polyline points="16 7 22 7 22 13"></polyline>
          </svg>
          <span>Transactions</span>
        </button>
      </div>
    `;
    
    // Add event listeners for actions
    accountElement.querySelector('.view-transactions-btn').addEventListener('click', () => {
      viewBankTransactions(account.id);
    });
    
    bankAccountsList.appendChild(accountElement);
  });
}

// Update bank accounts summary (total balance, count, etc.)
function updateBankAccountsSummary() {
  if (!totalBalanceDisplay || !bankAccountsCountDisplay) return;
  
  // Calculate total balance across all accounts
  const totalBalance = bankAccounts.reduce((sum, account) => {
    return sum + (account.availableBalance || 0);
  }, 0);
  
  // Format the total with proper currency
  const formattedTotal = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2
  }).format(totalBalance);
  
  // Update the summary displays
  totalBalanceDisplay.textContent = formattedTotal;
  bankAccountsCountDisplay.textContent = `${bankAccounts.length} Account${bankAccounts.length !== 1 ? 's' : ''}`;
}

// Mask account number for display (show only last 4 digits)
function maskAccountNumber(accountNumber) {
  if (!accountNumber) return 'xxxx';
  
  // Only show the last 4 digits
  const lastFour = accountNumber.slice(-4);
  return `•••• ${lastFour}`;
}

// Get account type icon
function getAccountTypeIcon(accountType) {
  switch (accountType) {
    case 'checking':
      return 'credit-card';
    case 'savings':
      return 'piggy-bank';
    case 'credit':
      return 'credit-card';
    case 'investment':
      return 'trending-up';
    case 'loan':
      return 'dollar-sign';
    case 'mortgage':
      return 'home';
    default:
      return 'credit-card';
  }
}

// Get institution logo
function getInstitutionLogo(account) {
  // In a real implementation, this would return actual logos
  // For now, we'll use a placeholder
  return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjIiIHk9IjMiIHdpZHRoPSIyMCIgaGVpZ2h0PSIxOCIgcng9IjIiIHJ5PSIyIj48L3JlY3Q+PHBhdGggZD0iTTIgOGgyMCI+PC9wYXRoPjxwYXRoIGQ9Ik0xOCAxMmE0IDQgMCAwIDEtOCAwIj48L3BhdGg+PC9zdmc+';
}

// View bank account transactions
function viewBankTransactions(accountId) {
  console.log('Viewing transactions for account:', accountId);
  // This function would show a modal with the transactions
  alert(`Viewing transactions for account ${accountId}`);
}

// Render passwords list
function renderPasswords(passwords) {
  if (!passwordsList) return;
  
  if (!passwords || passwords.length === 0) {
    passwordsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
          <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
        </svg>
        <p>No passwords found</p>
      </div>
    `;
    return;
  }
  
  passwordsList.innerHTML = '';
  
  // Enhanced logging in debug mode
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Rendering ${passwords.length} passwords`);
  if (passwords.length > 0) {
    // Log a sample password to help debugging (with password value removed)
    const samplePassword = { ...passwords[0] };
    if (samplePassword.password) samplePassword.password = '***REDACTED***';
    if (samplePassword.data && samplePassword.data.password) samplePassword.data.password = '***REDACTED***';
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Sample password structure:`, samplePassword);
  }
  
  // First ensure all password objects are properly formatted
  const normalizedPasswords = passwords.map(password => {
    if (!password) return null;
    
    // Extract data fields from different possible locations
    const data = password.data || {};
    const metadata = password.metadata || {};
    
    // Create a normalized password object that works for our UI
    return {
      // Generate unique ID if missing - this powers the copy/view buttons
      id: password.id || metadata.id || `password_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      // Use name from any available source
      name: password.name || metadata.name || 'Unnamed Password',
      // Use website from any available source
      website: password.website || data.website || '',
      // Use username from any available source
      username: password.username || data.username || '',
      // Use password value from any available source
      password: password.password || data.password || '',
      // Use notes from any available source
      notes: password.notes || data.notes || '',
      // Use timestamp from any available source
      lastUpdated: password.lastUpdated || metadata.updatedAt || Date.now(),
      // Use strength from any available source
      strength: password.strength || data.strength || 'medium',
      // Preserve original data
      data: data,
      metadata: metadata
    };
  }).filter(Boolean); // Remove any null items
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Normalized ${normalizedPasswords.length} passwords for rendering`);
  
  normalizedPasswords.forEach(password => {
    // Ensure these values are sanitized for HTML insertion
    const name = password.name ? password.name.replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unnamed';
    const website = password.website ? password.website.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const username = password.username ? password.username.replace(/</g, '&lt;').replace(/>/g, '&gt;') : '';
    const passwordId = password.id;
    
    const lastUpdated = password.lastUpdated || Date.now();
    const strength = password.strength || 'medium';
                    
    const passwordElement = document.createElement('div');
    passwordElement.className = 'password-card';
    
    // Format the last updated date
    const formattedDate = new Date(lastUpdated).toLocaleDateString();
    
    // Get the favicon for the website
    const faviconUrl = getFaviconUrl(website);
    
    passwordElement.innerHTML = `
      <div class="password-header">
        <div class="password-site">
          <img src="${faviconUrl}" alt="${name}" class="site-favicon">
          <span class="site-name">${name}</span>
        </div>
        <div class="password-strength ${strength}">
          <span class="strength-badge">${strength}</span>
        </div>
      </div>
      <div class="password-details">
        <div class="password-username">${username || 'No username'}</div>
        <div class="password-website">${website || 'No website'}</div>
      </div>
      <div class="password-actions">
        <button class="copy-username-btn" data-username="${username}" title="Copy Username">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
        <button class="copy-password-btn" data-id="${passwordId}" title="Copy Password">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="view-password-btn" data-id="${passwordId}" title="View Password">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    `;
    
    // Add event listeners for actions
    const copyUsernameBtn = passwordElement.querySelector('.copy-username-btn');
    if (copyUsernameBtn) {
      copyUsernameBtn.addEventListener('click', (e) => {
        const username = e.currentTarget.getAttribute('data-username');
        if (username) {
          copyToClipboard(username);
        } else {
          console.error('No username found to copy');
        }
      });
    }
    
    const copyPasswordBtn = passwordElement.querySelector('.copy-password-btn');
    if (copyPasswordBtn) {
      copyPasswordBtn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (id) {
          copyPasswordToClipboard(id);
        } else {
          console.error('No password ID found to copy');
        }
      });
    }
    
    const viewPasswordBtn = passwordElement.querySelector('.view-password-btn');
    if (viewPasswordBtn) {
      viewPasswordBtn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (id) {
          viewPassword(id);
        } else {
          console.error('No password ID found to view');
        }
      });
    }
    
    passwordsList.appendChild(passwordElement);
  });
}

// Filter passwords based on category
function filterPasswords(category) {
  if (!passwordsList) return;
  
  // Since categories are removed, we now just show all passwords
  // We're keeping the function for backward compatibility
  renderPasswords(passwords);
}

// Handle password search
function handlePasswordSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  const filteredPasswords = passwords.filter(password => {
    // Extract name from either direct property or metadata
    const name = password.name || 
                (password.metadata && password.metadata.name) || 
                '';
    
    // Extract username from either direct property or nested data
    const username = password.username || 
                   (password.data && password.data.username) || 
                   '';
    
    // Extract website from either direct property or nested data
    const website = password.website || 
                  (password.data && password.data.website) || 
                  '';
    
    // Return true if any field includes the search term
    return name.toLowerCase().includes(searchTerm) || 
           username.toLowerCase().includes(searchTerm) || 
           website.toLowerCase().includes(searchTerm);
  });
  
  renderPasswords(filteredPasswords);
}

// Handle quick password search
function handleQuickPasswordSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  if (!quickPasswordResults) return;
  
  if (!searchTerm) {
    quickPasswordResults.innerHTML = '';
    return;
  }
  
  // Use normalized filtering to handle both web app and extension formats
  const filteredPasswords = passwords.filter(password => {
    // Extract name from either direct property or metadata
    const name = password.name || 
                (password.metadata && password.metadata.name) || 
                '';
    
    // Extract username from either direct property or nested data
    const username = password.username || 
                   (password.data && password.data.username) || 
                   '';
    
    // Extract website from either direct property or nested data
    const website = password.website || 
                  (password.data && password.data.website) || 
                  '';
    
    // Return true if any field includes the search term
    return name.toLowerCase().includes(searchTerm) || 
           username.toLowerCase().includes(searchTerm) || 
           website.toLowerCase().includes(searchTerm);
  }).slice(0, 5); // Show only top 5 results
  
  if (filteredPasswords.length === 0) {
    quickPasswordResults.innerHTML = `
      <div class="no-results">No passwords found</div>
    `;
    return;
  }
  
  quickPasswordResults.innerHTML = '';
  
  filteredPasswords.forEach(password => {
    // Extract normalized data from either format
    const name = password.name || 
                (password.metadata && password.metadata.name) || 
                'Unnamed';
    
    const username = password.username || 
                   (password.data && password.data.username) || 
                   '';
    
    const website = password.website || 
                  (password.data && password.data.website) || 
                  '';
                  
    const passwordElement = document.createElement('div');
    passwordElement.className = 'quick-password-item';
    
    // Get the favicon for the website
    const faviconUrl = getFaviconUrl(website);
    
    passwordElement.innerHTML = `
      <div class="password-item-info">
        <img src="${faviconUrl}" alt="${name}" class="site-favicon">
        <div class="password-item-details">
          <div class="password-item-name">${name}</div>
          <div class="password-item-username">${username || 'No username'}</div>
        </div>
      </div>
      <div class="password-item-actions">
        <button class="copy-password-btn" data-id="${password.id}" title="Copy Password">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
      </div>
    `;
    
    // Add event listener for copy button
    const copyBtn = passwordElement.querySelector('.copy-password-btn');
    if (copyBtn) {
      copyBtn.addEventListener('click', (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (id) {
          copyPasswordToClipboard(id);
        } else {
          console.error('No password ID found to copy');
        }
      });
    }
    
    quickPasswordResults.appendChild(passwordElement);
  });
}

// Get favicon URL for a website
function getFaviconUrl(website) {
  if (!website) return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjExIiB3aWR0aD0iMTgiIGhlaWdodD0iMTEiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxwYXRoIGQ9Ik03IDExVjdhNSA1IDAgMCAxIDEwIDB2NCI+PC9wYXRoPjwvc3ZnPg==';
  
  try {
    const url = new URL(website);
    return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
  } catch (error) {
    // If not a valid URL, try to construct one
    if (!website.startsWith('http')) {
      website = 'https://' + website;
    }
    
    try {
      const url = new URL(website);
      return `https://www.google.com/s2/favicons?domain=${url.hostname}&sz=64`;
    } catch (error) {
      // If still not valid, return default icon
      return 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiPjxyZWN0IHg9IjMiIHk9IjExIiB3aWR0aD0iMTgiIGhlaWdodD0iMTEiIHJ4PSIyIiByeT0iMiI+PC9yZWN0PjxwYXRoIGQ9Ik03IDExVjdhNSA1IDAgMCAxIDEwIDB2NCI+PC9wYXRoPjwvc3ZnPg==';
    }
  }
}

// Copy password to clipboard
async function copyPasswordToClipboard(passwordId) {
  try {
    // Find the password object in our array
    const passwordObj = passwords.find(p => p.id === passwordId);
    
    if (!passwordObj) {
      throw new Error('Password not found');
    }
    
    // Show a loading indicator
    const loadingToast = document.createElement('div');
    loadingToast.className = 'toast loading';
    loadingToast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spinner">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 6v6l4 2"></path>
      </svg>
      <span>Retrieving password...</span>
    `;
    document.body.appendChild(loadingToast);
    
    // Add CSS for spinner animation if not already present
    if (!document.querySelector('style#spinner-style')) {
      const style = document.createElement('style');
      style.id = 'spinner-style';
      style.textContent = `
        .spinner {
          animation: spin 1.5s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }
    
    // Determine which password format we're dealing with (web app vs. extension)
    // Support both direct properties and nested data structure
    
    // First, try to get the password directly using the GET_PASSWORD message
    // This should work for both new and legacy passwords
    const response = await sendMessageToBackground({
      type: 'GET_PASSWORD',
      id: passwordId,
      // Also send the email to help with lookup if needed
      email: activeUserEmail
    });
    
    // Remove the loading indicator
    document.body.removeChild(loadingToast);
    
    if (response && response.success && response.password) {
      // Copy to clipboard
      await copyToClipboard(response.password);
      
      // Show success notification
      const successToast = document.createElement('div');
      successToast.className = 'toast success';
      successToast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
          <polyline points="22 4 12 14.01 9 11.01"></polyline>
        </svg>
        <span>Password copied to clipboard</span>
      `;
      document.body.appendChild(successToast);
      
      // Remove after delay
      setTimeout(() => {
        document.body.removeChild(successToast);
      }, 2000);
      
      return;
    }
    
    // If GET_PASSWORD failed, try to extract the password directly from the object
    // Note: This is less secure but necessary for compatibility
    
    // Try each possible location for the password value
    let passwordValue = null;
    
    // Direct property (legacy extension format)
    if (passwordObj.password) {
      passwordValue = passwordObj.password;
    } 
    // Nested in data (web app format)
    else if (passwordObj.data && passwordObj.data.password) {
      passwordValue = passwordObj.data.password;
    }
    // Try legacy meta format (some versions stored it differently)
    else if (passwordObj.meta && passwordObj.meta.password) {
      passwordValue = passwordObj.meta.password;
    }
    
    if (!passwordValue) {
      throw new Error('Password value not found in the password object');
    }
    
    // Copy to clipboard
    await copyToClipboard(passwordValue);
    
    // Show success notification
    const successToast = document.createElement('div');
    successToast.className = 'toast success';
    successToast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
        <polyline points="22 4 12 14.01 9 11.01"></polyline>
      </svg>
      <span>Password copied to clipboard</span>
    `;
    document.body.appendChild(successToast);
    
    // Remove after delay
    setTimeout(() => {
      document.body.removeChild(successToast);
    }, 2000);
    
  } catch (error) {
    console.error('Error copying password:', error);
    
    // Show error notification
    const errorToast = document.createElement('div');
    errorToast.className = 'toast error';
    errorToast.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <span>Error: ${error.message}</span>
    `;
    document.body.appendChild(errorToast);
    
    // Remove after delay
    setTimeout(() => {
      document.body.removeChild(errorToast);
    }, 3000);
  }
}

// View password details
function viewPassword(passwordId) {
  console.log('Viewing password:', passwordId);
  // This function would show a modal with the password details
  alert(`Viewing password ${passwordId}`);
}

// Render contacts list
function renderContacts(contacts) {
  if (!contactsList) return;
  
  if (!contacts || contacts.length === 0) {
    contactsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <p>No contacts found</p>
      </div>
    `;
    return;
  }
  
  contactsList.innerHTML = '';
  
  // Enhanced logging in debug mode
  console.log(`Rendering ${contacts.length} contacts`);
  if (contacts.length > 0) {
    // Log a sample contact to help debugging
    console.log('Sample contact structure:', contacts[0]);
  }
  
  contacts.forEach(contact => {
    // Handle both web app and extension contact formats by normalizing the data
    // This is critical for cross-compatibility between extension and web app
    
    // Extract name from either direct property or metadata
    const name = contact.name || 
                (contact.metadata && contact.metadata.name) || 
                'Unnamed';
    
    // Extract email from either direct property or nested data
    const email = contact.email || 
                (contact.data && contact.data.email) || 
                '';
    
    // Extract phone from either direct property or nested data
    const phone = contact.phone || 
                (contact.data && contact.data.phone) || 
                '';
    
    // Extract avatar from either direct property or nested data
    const avatar = contact.avatar || 
                 (contact.data && contact.data.avatar) || 
                 null;
    
    // Extract address from either direct property or nested data
    const address = contact.address || 
                   (contact.data && contact.data.address) || 
                   '';
                   
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';
    
    // Get initials for avatar if no image provided
    const initials = getInitials(name);
    
    contactElement.innerHTML = `
      <div class="contact-avatar">
        ${avatar 
          ? `<img src="${avatar}" alt="${name}" class="avatar-img">`
          : `<div class="avatar-initial" style="background-color: ${getAvatarColor(name)}">${initials}</div>`
        }
      </div>
      <div class="contact-details">
        <div class="contact-name">${name}</div>
        <div class="contact-info">
          ${email ? `
            <div class="contact-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                <polyline points="22,6 12,13 2,6"></polyline>
              </svg>
              <span>${email}</span>
            </div>` : ''}
          ${phone ? `
            <div class="contact-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
              </svg>
              <span>${phone}</span>
            </div>` : ''}
          ${address ? `
            <div class="contact-item">
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3"></circle>
              </svg>
              <span class="address-text">${address}</span>
            </div>` : ''}
        </div>
      </div>
      <div class="contact-actions">
        <button class="contact-action-btn" data-id="${contact.id}" data-action="view" title="View Contact">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        ${email ? `
          <button class="contact-action-btn" data-email="${email}" data-action="email" title="Send Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </button>
        ` : ''}
        ${phone ? `
          <button class="contact-action-btn" data-phone="${phone}" data-action="call" title="Call">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
            </svg>
          </button>
        ` : ''}
      </div>
    `;
    
    // Add event listeners for actions
    const viewBtn = contactElement.querySelector('[data-action="view"]');
    if (viewBtn) {
      viewBtn.addEventListener('click', () => {
        viewContact(contact.id);
      });
    }
    
    const emailBtn = contactElement.querySelector('[data-action="email"]');
    if (emailBtn) {
      emailBtn.addEventListener('click', (e) => {
        const email = e.currentTarget.getAttribute('data-email');
        if (email) {
          openEmailClient(email);
        } else {
          console.error('No email found to open mail client');
        }
      });
    }
    
    const callBtn = contactElement.querySelector('[data-action="call"]');
    if (callBtn) {
      callBtn.addEventListener('click', (e) => {
        const phone = e.currentTarget.getAttribute('data-phone');
        if (phone) {
          openPhoneClient(phone);
        } else {
          console.error('No phone number found to open phone client');
        }
      });
    }
    
    contactsList.appendChild(contactElement);
  });
}

// Handle contact search
function handleContactSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  const filteredContacts = contacts.filter(contact => {
    // Extract data from either direct property or nested structure
    const name = contact.name || 
                (contact.metadata && contact.metadata.name) || 
                '';
    
    const email = contact.email || 
                (contact.data && contact.data.email) || 
                '';
    
    const phone = contact.phone || 
                (contact.data && contact.data.phone) || 
                '';
    
    const company = contact.company || 
                  (contact.data && contact.data.company) || 
                  '';
                  
    const address = contact.address || 
                   (contact.data && contact.data.address) || 
                   '';
    
    // Return true if any field includes the search term
    return name.toLowerCase().includes(searchTerm) || 
           email.toLowerCase().includes(searchTerm) || 
           phone.toLowerCase().includes(searchTerm) ||
           company.toLowerCase().includes(searchTerm) ||
           address.toLowerCase().includes(searchTerm);
  });
  
  renderContacts(filteredContacts);
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?';
  
  const nameParts = name.split(' ');
  if (nameParts.length === 1) {
    return nameParts[0].charAt(0).toUpperCase();
  }
  
  return (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
}

// Generate a consistent avatar color from a name
function getAvatarColor(name) {
  if (!name) return '#64748b'; // Default to secondary color
  
  // Generate a hash code from the name
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  // Define an array of pleasing colors that match our theme
  const colors = [
    '#4f46e5', // Primary color (indigo)
    '#8884ef', // Primary light
    '#3730a3', // Primary dark
    '#10b981', // Success color (emerald)
    '#f59e0b', // Warning color (amber)
    '#06b6d4', // Cyan
    '#8b5cf6', // Violet
    '#ec4899', // Pink
    '#0ea5e9', // Light blue
    '#6366f1'  // Indigo
  ];
  
  // Use the hash to select a color
  const colorIndex = Math.abs(hash) % colors.length;
  return colors[colorIndex];
}

// View contact details
function viewContact(contactId) {
  console.log('Viewing contact:', contactId);
  // This function would show a modal with the contact details
  alert(`Viewing contact ${contactId}`);
}

// Open email client
function openEmailClient(email) {
  window.open(`mailto:${email}`);
}

// Open phone client
function openPhoneClient(phone) {
  window.open(`tel:${phone}`);
}

// Copy text to clipboard
function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .then(() => {
      // Show a temporary success message
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.textContent = 'Copied to clipboard!';
      document.body.appendChild(toast);
      
      // Remove the toast after a delay
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 2000);
    })
    .catch(err => {
      console.error('Failed to copy text: ', err);
      alert('Failed to copy to clipboard');
    });
}

// Handle export button click
function handleExport() {
  alert("Export functionality will allow users to securely export their keys");
  // In a real implementation, this would:
  // 1. Ask for a password to encrypt the backup
  // 2. Get all account data from storage
  // 3. Encrypt it with the password
  // 4. Download as a file
}

// Handle import button click
function handleImport() {
  // Use the directly imported importBackupData function
  alert("For security reasons, please use the MATA web app to import data.");
  
  // Redirect to web app with import instruction
  if (confirm("Would you like to open the MATA web app to import your data?")) {
    chrome.tabs.create({ url: "https://matav3.replit.app/import" });
  }
}

// Handle settings button click
function handleSettings() {
  alert("Settings would allow users to configure extension behavior");
  // In a real implementation, this would show a settings panel
}

// Handle test connection button click
async function handleTestConnection() {
  if (!testResultsDiv) return;
  
  testResultsDiv.innerHTML = `
    <div class="test-running">
      <div class="spinner"></div>
      <p>Testing connection...</p>
    </div>
  `;
  
  try {
    // Test internal connection
    const internalResponse = await sendMessageToBackground({ 
      type: 'TEST_CONNECTION' 
    });
    
    // Display test results
    if (internalResponse && internalResponse.success) {
      testResultsDiv.innerHTML = `
        <div class="test-success">
          <h4>Internal Connection Test: ✅ Success</h4>
          <p>Extension ID: ${chrome.runtime.id}</p>
          <p>Time: ${new Date().toLocaleTimeString()}</p>
        </div>
        <div class="test-separator"></div>
        <div class="test-running">
          <div class="spinner"></div>
          <p>Testing with MATA application...</p>
        </div>
      `;
      
      // Now test if we can communicate with our web app
      try {
        // Check if a tab with our app is open using the shared config
        const tabs = await findMataTabs();
        
        if (tabs.length === 0) {
          testResultsDiv.innerHTML += `
            <div class="test-warning">
              <h4>External Connection Test: ⚠️ No MATA app detected</h4>
              <p>Please open the MATA web application to test communication.</p>
              <button id="open-mata-btn" class="action-btn">Open MATA</button>
            </div>
          `;
          
          document.getElementById('open-mata-btn').addEventListener('click', () => {
            chrome.tabs.create({ url: 'https://matav3.replit.app' });
          });
          
        } else {
          // Send message to the first tab with our app
          const tab = tabs[0];
          chrome.tabs.sendMessage(tab.id, { 
            type: 'CHECK_EXTENSION_CONNECTION',
            from: 'popup',
            extensionId: chrome.runtime.id,
            timestamp: Date.now()
          }, response => {
            if (chrome.runtime.lastError) {
              testResultsDiv.innerHTML += `
                <div class="test-warning">
                  <h4>External Connection Test: ⚠️ Content script not active</h4>
                  <p>Extension is installed but content script is not active on the MATA page.</p>
                  <p>Error: ${chrome.runtime.lastError.message}</p>
                  <p>Try refreshing the MATA web application.</p>
                </div>
              `;
            } else if (response && response.success) {
              testResultsDiv.innerHTML += `
                <div class="test-success">
                  <h4>External Connection Test: ✅ Success</h4>
                  <p>Successfully connected to MATA application at: ${tab.url}</p>
                  <p>Response: ${response.message}</p>
                </div>
              `;
            } else {
              testResultsDiv.innerHTML += `
                <div class="test-error">
                  <h4>External Connection Test: ❌ Failed</h4>
                  <p>Communication with MATA application failed.</p>
                  <p>Please refresh the MATA web application and try again.</p>
                </div>
              `;
            }
          });
        }
      } catch (error) {
        testResultsDiv.innerHTML += `
          <div class="test-error">
            <h4>External Connection Test: ❌ Error</h4>
            <p>${error.message}</p>
          </div>
        `;
      }
    } else {
      testResultsDiv.innerHTML = `
        <div class="test-error">
          <h4>Internal Connection Test: ❌ Failed</h4>
          <p>Could not communicate with background script.</p>
          <p>Try reloading the extension.</p>
        </div>
      `;
    }
  } catch (error) {
    testResultsDiv.innerHTML = `
      <div class="test-error">
        <h4>Test Failed</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Handle refresh buttons
function refreshBankAccounts() {
  // No need to refresh - we're permanently showing the empty state
  if (bankAccountsList) {
    // Always display the empty message
    bankAccountsList.innerHTML = `
      <div class="list-empty-message">
        <p>No bank accounts yet</p>
      </div>
    `;
    
    // Update counts for UI
    if (document.getElementById('bank-accounts-count')) {
      document.getElementById('bank-accounts-count').textContent = '0';
    }
    
    if (document.getElementById('total-balance')) {
      document.getElementById('total-balance').textContent = '$0.00';
    }
  }
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Bank accounts feature disabled in extension`);
}

function refreshPasswords() {
  // Check if we have a valid email before making the request
  if (!activeUserEmail) {
    console.error('Cannot refresh passwords: No active user email');
    alert('Please log in to MATA web application first to access your data.');
    return;
  }

  // Show spinner for better user experience
  const spinner = document.createElement('div');
  spinner.className = 'spinner-overlay';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  // No need to fetch passwords data - display empty state
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Password feature disabled in extension`);
  
  // Use setTimeout to simulate a refresh for better UX
  setTimeout(() => {
    // Remove spinner
    document.body.removeChild(spinner);
    
    // Set empty data and update UI
    passwords = [];
    renderPasswords(passwords);
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using empty passwords array`);
  }, 500);
  
  // The block below is for when an actual refresh is needed for critical files
  // Currently commented out as we don't need to refresh passwords
  /*
  // Only sync critical encryption files
  Promise.all([
    getUserData(activeUserEmail, 'active_user', true),
    getUserData(activeUserEmail, 'salt', true),
    getUserData(activeUserEmail, 'keys', true)
  ])
    .then(() => {
      // Success handling would go here
    })
    .catch(error => {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error refreshing passwords:`, error);
      showErrorState('Failed to refresh passwords: ' + error.message);
      document.body.removeChild(spinner);
    });
  */
}

function refreshContacts() {
  // Check if we have a valid email before making the request
  if (!activeUserEmail) {
    console.error('Cannot refresh contacts: No active user email');
    alert('Please log in to MATA web application first to access your data.');
    return;
  }

  // Show spinner for better user experience
  const spinner = document.createElement('div');
  spinner.className = 'spinner-overlay';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  // No need to fetch contacts data - display empty state
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Contacts feature disabled in extension`);
  
  // Use setTimeout to simulate a refresh for better UX
  setTimeout(() => {
    // Remove spinner
    document.body.removeChild(spinner);
    
    // Set empty data and update UI
    contacts = [];
    renderContacts(contacts);
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using empty contacts array`);
  }, 500);
}

// Handle adding new items
function handleAddPassword() {
  // Show password modal for adding new password
  const modal = document.getElementById('password-modal');
  const form = document.getElementById('password-form');
  const modalTitle = document.getElementById('password-modal-title');
  
  // Reset form
  form.reset();
  
  // Set modal title for new password
  modalTitle.textContent = 'Add New Password';
  
  // Clear hidden ID field if it exists
  const hiddenIdField = document.getElementById('password-id');
  if (hiddenIdField) {
    hiddenIdField.value = '';
  }
  
  // Show modal
  modal.classList.add('active');
  
  // Focus on first field
  document.getElementById('password-website').focus();
  
  console.log('Password modal opened for adding new password');
}

// Close the password modal
function closePasswordModal() {
  const modal = document.getElementById('password-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Toggle password visibility in the form
function togglePasswordVisibility() {
  const passwordInput = document.getElementById('password-value');
  const eyeIcon = document.querySelector('.eye-icon');
  const eyeOffIcon = document.querySelector('.eye-off-icon');
  
  if (passwordInput.type === 'password') {
    passwordInput.type = 'text';
    eyeIcon.classList.add('hidden');
    eyeOffIcon.classList.remove('hidden');
  } else {
    passwordInput.type = 'password';
    eyeIcon.classList.remove('hidden');
    eyeOffIcon.classList.add('hidden');
  }
}

// Handle password form submission - mirroring web app implementation
async function handlePasswordSubmit(e) {
  e.preventDefault();
  
  // Get form values
  const website = document.getElementById('password-website').value.trim();
  const name = document.getElementById('password-name').value.trim();
  const username = document.getElementById('password-username').value.trim();
  const passwordValue = document.getElementById('password-value').value;
  const notes = document.getElementById('password-notes').value.trim();
  
  // Validate form (basic validation)
  if (!website || !name || !passwordValue) {
    alert('Please fill in all required fields (Website, Name, and Password)');
    return;
  }
  
  try {
    // Show loading state in save button
    const saveBtn = document.getElementById('save-password-btn');
    const originalBtnText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    // Get active user email for storing the password
    const userEmail = activeUserEmail;
    
    if (!userEmail) {
      throw new Error('No active user found. Please log in to the MATA web app first.');
    }
    
    // CRITICAL: Use the exact same format as the web app
    const PASSWORD_ID_PREFIX = 'credential_';
    const LEGACY_PASSWORD_ID_PREFIX = 'password_';
    const PASSWORD_ITEM_TYPE = 'password';
    
    // Get hidden ID field if it exists (for updates)
    const hiddenIdField = document.getElementById('password-id');
    const existingId = hiddenIdField && hiddenIdField.value ? hiddenIdField.value : null;
    
    // Create a consistent password object matching web app structure
    const passwordData = {
      // Use consistent ID format that matches web app
      id: existingId || `${PASSWORD_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      // User-entered data
      name: name,
      website: website,
      username: username,
      password: passwordValue,
      notes: notes,
      // Additional fields for consistency with web app
      favorite: false,
      category: '',
      tags: [],
      lastUpdated: Date.now()
    };
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Creating/updating password with ID: ${passwordData.id}`);
    
    // Define rich metadata for better searching and organization (matching web app)
    const metadata = {
      name: passwordData.name,
      description: passwordData.website || "",
      // CRITICAL: Always explicitly set the type for proper identification
      type: PASSWORD_ITEM_TYPE,
      tags: passwordData.tags || [],
      searchTerms: [
        passwordData.name, 
        passwordData.username, 
        passwordData.category || "",
        passwordData.website || "",
        // Add explicit search terms to identify this as a password
        "password",
        "credential"
      ].filter(Boolean),
      favorite: passwordData.favorite || false,
      // Use WASM encryption method to match web app
      encryptionMethod: 'wasm'
    };
    
    // First, get existing passwords using our helper function
    const existingPasswords = await getUserData(userEmail, 'passwords') || [];
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Retrieved ${existingPasswords.length} existing passwords`);
    
    // Check if password already exists (by ID)
    const existingIndex = existingPasswords.findIndex(p => p.id === passwordData.id);
    
    if (existingIndex >= 0) {
      // Update existing password
      existingPasswords[existingIndex] = {
        ...passwordData,
        metadata: metadata
      };
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating existing password with ID: ${passwordData.id}`);
    } else {
      // Add new password
      existingPasswords.push({
        ...passwordData,
        metadata: metadata
      });
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Adding new password with ID: ${passwordData.id}`);
    }
    
    // Save passwords using our helper function that ensures consistency
    await saveUserData(userEmail, 'passwords', existingPasswords);
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Password saved successfully and synced with web app`);
    
    // Close modal
    closePasswordModal();
    
    // Refresh passwords list
    refreshPasswords();
    
    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = 'Password saved successfully!';
    document.body.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error saving password:`, error);
    alert(`Error saving password: ${error.message}`);
  } finally {
    // Reset button state
    const saveBtn = document.getElementById('save-password-btn');
    saveBtn.textContent = 'Save Password';
    saveBtn.disabled = false;
  }
}

function handleAddContact() {
  // Show the contact modal
  const contactModal = document.getElementById('contact-modal');
  if (contactModal) {
    contactModal.classList.add('active');
    // Reset form
    const contactForm = document.getElementById('contact-form');
    if (contactForm) contactForm.reset();
    // Set modal title to "Add New Contact"
    const modalTitle = document.getElementById('contact-modal-title');
    if (modalTitle) modalTitle.textContent = 'Add New Contact';
  }
}

// Handle settings
function saveSettings() {
  // Get settings values
  const autoLockValue = autoLockSelect ? autoLockSelect.value : '15';
  const requirePasswordValue = requirePasswordToggle ? requirePasswordToggle.checked : true;
  const dataSyncValue = dataSyncToggle ? dataSyncToggle.checked : true;
  
  // Save settings to storage
  sendMessageToBackground({
    type: 'SAVE_SETTINGS',
    settings: {
      autoLock: autoLockValue,
      requirePassword: requirePasswordValue,
      dataSync: dataSyncValue
    }
  })
    .then(response => {
      if (response && response.success) {
        // Show success message
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = 'Settings saved!';
        document.body.appendChild(toast);
        
        // Remove the toast after a delay
        setTimeout(() => {
          document.body.removeChild(toast);
        }, 2000);
      }
    })
    .catch(error => {
      console.error('Error saving settings:', error);
      alert(`Error: ${error.message}`);
    });
}

// Load settings
function loadSettings() {
  sendMessageToBackground({ type: 'GET_SETTINGS' })
    .then(response => {
      if (response && response.success && response.settings) {
        // Apply settings to UI
        if (autoLockSelect && response.settings.autoLock) {
          autoLockSelect.value = response.settings.autoLock;
        }
        
        if (requirePasswordToggle && response.settings.requirePassword !== undefined) {
          requirePasswordToggle.checked = response.settings.requirePassword;
        }
        
        if (dataSyncToggle && response.settings.dataSync !== undefined) {
          dataSyncToggle.checked = response.settings.dataSync;
        }
      }
    })
    .catch(error => {
      console.error('Error loading settings:', error);
    });
}

// Setup contact modal functionality
function setupContactModal() {
  const contactModal = document.getElementById('contact-modal');
  const closeContactModalBtn = document.getElementById('close-contact-modal');
  const cancelContactBtn = document.getElementById('cancel-contact-btn');
  const contactForm = document.getElementById('contact-form');
  
  // Close modal functions
  if (closeContactModalBtn) {
    closeContactModalBtn.addEventListener('click', closeContactModal);
  }
  
  if (cancelContactBtn) {
    cancelContactBtn.addEventListener('click', closeContactModal);
  }
  
  // Handle form submission
  if (contactForm) {
    contactForm.addEventListener('submit', handleContactSubmit);
  }
  
  // Close modal when clicking outside
  if (contactModal) {
    contactModal.addEventListener('click', (e) => {
      if (e.target === contactModal) {
        closeContactModal();
      }
    });
  }
}

// Close contact modal
function closeContactModal() {
  const modal = document.getElementById('contact-modal');
  if (modal) {
    modal.classList.remove('active');
  }
}

// Handle contact form submission - mirroring web app implementation
async function handleContactSubmit(e) {
  e.preventDefault();
  
  // Get form values
  const name = document.getElementById('contact-name').value.trim();
  const email = document.getElementById('contact-email').value.trim();
  const phone = document.getElementById('contact-phone').value.trim();
  const address = document.getElementById('contact-address').value.trim();
  const notes = document.getElementById('contact-notes').value.trim();
  
  // Validate form
  if (!name) {
    alert('Please enter a name for the contact');
    return;
  }
  
  try {
    // Show loading state
    const saveBtn = document.getElementById('save-contact-btn');
    const originalBtnText = saveBtn.textContent;
    saveBtn.textContent = 'Saving...';
    saveBtn.disabled = true;
    
    // Get active user email
    const userEmail = activeUserEmail;
    if (!userEmail) {
      throw new Error('No active user found. Please log in to the MATA web app first.');
    }
    
    // CRITICAL: Use the exact same format as the web app
    const CONTACT_ID_PREFIX = 'contact_';
    const CONTACT_ITEM_TYPE = 'contact';
    
    // Get hidden ID field if it exists (for updates)
    const hiddenIdField = document.getElementById('contact-id');
    const existingId = hiddenIdField && hiddenIdField.value ? hiddenIdField.value : null;
    
    // Create a consistent contact object matching web app structure
    const contactData = {
      // Use consistent ID format that matches web app
      id: existingId || `${CONTACT_ID_PREFIX}${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      // User-entered data
      name: name,
      email: email || '',
      phone: phone || '',
      address: address || '',
      notes: notes || '',
      // Additional fields for consistency with web app
      favorite: false,
      group: '',
      tags: [],
      lastUpdated: Date.now()
    };
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Creating/updating contact with ID: ${contactData.id}`);
    
    // Define rich metadata for better searching and organization (matching web app)
    const metadata = {
      name: contactData.name,
      description: contactData.email || contactData.phone || "",
      // CRITICAL: Always explicitly set the type for proper identification
      type: CONTACT_ITEM_TYPE,
      tags: contactData.tags || [],
      searchTerms: [
        contactData.name,
        contactData.email,
        contactData.phone,
        contactData.address,
        // Add explicit search terms to identify this as a contact
        "contact",
        "person"
      ].filter(Boolean),
      favorite: contactData.favorite || false,
      // Use WASM encryption method to match web app
      encryptionMethod: 'wasm'
    };
    
    // First, get existing contacts using our helper function
    const existingContacts = await getUserData(userEmail, 'contacts') || [];
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Retrieved ${existingContacts.length} existing contacts`);
    
    // Check if contact already exists (by ID)
    const existingIndex = existingContacts.findIndex(c => c.id === contactData.id);
    
    if (existingIndex >= 0) {
      // Update existing contact
      existingContacts[existingIndex] = {
        ...contactData,
        metadata: metadata
      };
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating existing contact with ID: ${contactData.id}`);
    } else {
      // Add new contact
      existingContacts.push({
        ...contactData,
        metadata: metadata
      });
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Adding new contact with ID: ${contactData.id}`);
    }
    
    // Save contacts using our helper function that ensures consistency
    await saveUserData(userEmail, 'contacts', existingContacts);
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Contact saved successfully and synced with web app`);
    
    // Close modal
    closeContactModal();
    
    // Refresh contacts list
    refreshContacts();
    
    // Show success toast
    const toast = document.createElement('div');
    toast.className = 'toast success';
    toast.textContent = 'Contact saved successfully!';
    document.body.appendChild(toast);
    
    // Remove toast after delay
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error saving contact:`, error);
    alert(`Error saving contact: ${error.message}`);
  } finally {
    // Reset save button
    const saveBtn = document.getElementById('save-contact-btn');
    if (saveBtn) {
      saveBtn.textContent = 'Save Contact';
      saveBtn.disabled = false;
    }
  }
}

// Handle export keys
async function handleExportKeys() {
  console.log('Exporting all keys from chrome.storage.local');
  
  // Show a loading indicator
  const exportBtn = document.getElementById('export-keys-btn');
  if (exportBtn) {
    // Get the current button content before changing it
    const originalButtonHTML = exportBtn.innerHTML;
    
    // Store the original text as a data attribute
    exportBtn.dataset.originalText = originalButtonHTML;
    
    // Update button to show loading state
    exportBtn.innerHTML = `
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="loading-spinner">
        <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
      </svg>
      Exporting...
    `;
    
    // Add spinning animation to the SVG
    const style = document.createElement('style');
    style.textContent = `
      .loading-spinner {
        animation: spin 1.5s linear infinite;
      }
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }
  
  try {
    // Get all data from chrome.storage.local
    chrome.storage.local.get(null, async (items) => {
      if (chrome.runtime.lastError) {
        throw new Error(`Error getting chrome.storage data: ${chrome.runtime.lastError.message}`);
      }
      
      // Create a JSON blob and download it
      const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      // Get the current date for the filename
      const date = new Date();
      const dateString = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
      const timeString = `${date.getHours().toString().padStart(2, '0')}-${date.getMinutes().toString().padStart(2, '0')}`;
      
      // Create a filename with the active user's email if available
      let filename = `mata-keys-backup-${dateString}-${timeString}.json`;
      if (activeUserEmail) {
        const sanitizedEmail = sanitizeEmail(activeUserEmail).replace(/_/g, '-');
        filename = `mata-keys-backup-${sanitizedEmail}-${dateString}-${timeString}.json`;
      }
      
      // Create a download link and click it
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      console.log('Keys exported successfully');
      
      // Show a success message
      if (exportBtn) {
        exportBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          Exported!
        `;
        
        // Reset the button after 2 seconds
        setTimeout(() => {
          // Use the stored original text or fallback to a default
          const originalText = exportBtn.dataset.originalText || "Export All Keys";
          exportBtn.innerHTML = originalText;
        }, 2000);
      }
    });
  } catch (error) {
    console.error('Error exporting keys:', error);
    
    // Show error message
    if (exportBtn) {
      exportBtn.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <line x1="12" y1="8" x2="12" y2="12"></line>
          <line x1="12" y1="16" x2="12.01" y2="16"></line>
        </svg>
        Export Failed
      `;
      
      // Reset the button after 2 seconds
      setTimeout(() => {
        // Use the stored original text or fallback to a default
        const originalText = exportBtn.dataset.originalText || "Export All Keys";
        exportBtn.innerHTML = originalText;
      }, 2000);
    }
    
    // Show error in an alert
    alert(`Error exporting keys: ${error.message}`);
  }
}

// Handle import keys from backup file
// Import keys functionality has been removed
// Users should use the web app for importing keys

// Helper function to show notifications in the UI
function showNotification(title, type = 'info', message = '') {
  // Check if we already have a notification element
  let notificationContainer = document.querySelector('.notification-container');
  
  // Create it if it doesn't exist
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.className = 'notification-container';
    document.body.appendChild(notificationContainer);
    
    // Add styles for the notification
    const style = document.createElement('style');
    style.textContent = `
      .notification-container {
        position: fixed;
        top: 20px;
        right: 20px;
        z-index: 9999;
        max-width: 300px;
      }
      
      .notification {
        background-color: var(--surface-color);
        color: var(--text-color);
        border-left: 4px solid var(--primary-color);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        border-radius: 4px;
        padding: 12px 16px;
        margin-bottom: 10px;
        animation: slide-in 0.3s ease-out;
        position: relative;
      }
      
      .notification.success {
        border-left-color: #10b981;
      }
      
      .notification.warning {
        border-left-color: #f59e0b;
      }
      
      .notification.error {
        border-left-color: #ef4444;
      }
      
      .notification-title {
        font-weight: 600;
        margin-bottom: 4px;
      }
      
      .notification-message {
        font-size: 0.9rem;
        opacity: 0.9;
      }
      
      .notification-close {
        position: absolute;
        top: 8px;
        right: 8px;
        cursor: pointer;
        color: var(--text-muted);
      }
      
      @keyframes slide-in {
        from {
          transform: translateX(100%);
          opacity: 0;
        }
        to {
          transform: translateX(0);
          opacity: 1;
        }
      }
      
      @keyframes fade-out {
        from {
          transform: translateX(0);
          opacity: 1;
        }
        to {
          transform: translateX(100%);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
  
  // Create notification element
  const notification = document.createElement('div');
  notification.className = `notification ${type}`;
  notification.innerHTML = `
    <div class="notification-title">${title}</div>
    ${message ? `<div class="notification-message">${message}</div>` : ''}
    <div class="notification-close">×</div>
  `;
  
  // Add to container
  notificationContainer.appendChild(notification);
  
  // Set up close button
  const closeBtn = notification.querySelector('.notification-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      notification.style.animation = 'fade-out 0.3s ease-out forwards';
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
  }
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    if (notification.parentNode) { // Check if it's still in the DOM
      notification.style.animation = 'fade-out 0.3s ease-out forwards';
      setTimeout(() => {
        if (notification.parentNode) { // Check again before removing
          notification.remove();
        }
      }, 300);
    }
  }, 5000);
}

// Handle download extension
function handleDownloadExtension() {
  // This would redirect to download the extension
  console.log('Download extension');
  chrome.tabs.create({ url: 'https://matav3.replit.app/download-extension' });
}

// Send message to background script
// This function sends a message to the background script with a timeout
function sendMessageToBackground(message, timeout = 10000) {
  return new Promise((resolve, reject) => {
    // Set a timeout to reject the promise if we don't get a response
    const timeoutId = setTimeout(() => {
      reject(new Error(`Timeout after ${timeout}ms waiting for background script response`));
    }, timeout);
    
    // Send message to background script
    chrome.runtime.sendMessage(message, (response) => {
      // Clear the timeout since we got a response
      clearTimeout(timeoutId);
      
      // Check if there was an error with messaging
      if (chrome.runtime.lastError) {
        console.error('Error sending message to background script:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      
      // If we got a response but it indicates an error, reject with that error
      if (response && response.error) {
        reject(new Error(response.error));
        return;
      }
      
      // Otherwise resolve with the response
      resolve(response);
    });
  });
}

// Handle test storage button click
async function handleTestStorage() {
  // This function is for legacy support and testing purposes only
  // It's not currently being used in the UI as testResultsDiv is not present
  console.log('Storage test functionality is disabled in this version');
  
  try {
    // Generate test data
    const testData = {
      text: 'Test data from popup',
      timestamp: Date.now(),
      random: Math.random().toString(36).substring(2)
    };
    
    // Send test request to background script
    const response = await sendMessageToBackground({ 
      type: 'TEST_STORAGE',
      testData: JSON.stringify(testData)
    });
    
    if (response && response.success) {
      console.log('Storage Test: Success', {
        message: 'Successfully stored and retrieved test data',
        response: response,
        extensionId: chrome.runtime.id
      });
    } else {
      console.error('Storage Test: Failed', {
        message: 'Failed to test storage functionality',
        error: response ? response.error : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Storage Test Failed', error.message);
  }
}

// Handle sync now button click
async function handleSyncNow() {
  // This function is for legacy support and testing purposes only
  // It's not currently being used in the UI as testResultsDiv is not present
  console.log('Storage sync functionality is disabled in this version');
  
  try {
    // Run sync between localStorage and chrome.storage
    console.log('Starting storage sync process...');
    
    const response = await sendMessageToBackground({ 
      type: 'SYNC_STORAGE'
    });
    
    if (response && response.success) {
      console.log('Sync Complete: Success', {
        syncedCount: response.syncedCount || 0,
        time: new Date().toLocaleTimeString()
      });
    } else {
      console.error('Sync Failed: Error', {
        error: response && response.error ? response.error : 'Unknown error'
      });
    }
  } catch (error) {
    console.error('Error syncing storage:', error);
  }
}

// Load storage comparison data
async function loadStorageComparison() {
  if (!localStorageKeysList || !chromeStorageKeysList) return;
  
  // Show loading indicator
  if (statusMessage) {
    statusMessage.textContent = 'Loading storage data...';
    statusMessage.className = 'status-message loading';
  }
  
  localStorageKeysList.innerHTML = '<div class="loading">Loading localStorage keys...</div>';
  chromeStorageKeysList.innerHTML = '<div class="loading">Loading chrome.storage keys...</div>';
  
  try {
    // Clear the details panel
    if (comparisonDetailsContent) {
      comparisonDetailsContent.innerHTML = `
        <div class="empty-selection">
          <p>Select a key to view details</p>
        </div>
      `;
    }
    
    // Get all localStorage keys related to MATA
    localStorageData = {};
    const localStorageKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      // Filter to include only MATA-related keys
      if (key && (
          key.startsWith('mata_') || 
          key.includes('_vault_') || 
          key.includes('keys_') ||
          key.includes('_masterKeys') ||
          key.includes('salt_')
        )) {
        localStorageKeys.push(key);
        try {
          localStorageData[key] = localStorage.getItem(key);
        } catch (e) {
          localStorageData[key] = `[ERROR: ${e.message}]`;
        }
      }
    }
    
    // Get all chrome.storage.local keys related to MATA
    chromeStorageData = await new Promise(resolve => {
      chrome.storage.local.get(null, (result) => {
        resolve(result);
      });
    });
    
    const chromeStorageKeys = Object.keys(chromeStorageData).filter(key => 
      key.startsWith('mata_') || 
      key.includes('_vault_') || 
      key.includes('keys_') ||
      key.includes('_masterKeys') ||
      key.includes('salt_')
    );
    
    // Render the localStorage keys
    renderStorageKeys(localStorageKeysList, localStorageKeys, 'localStorage');
    
    // Render the chrome.storage keys
    renderStorageKeys(chromeStorageKeysList, chromeStorageKeys, 'chromeStorage');
    
    // Compare the keys and mark matches/mismatches
    await compareKeys(localStorageKeys, chromeStorageKeys);
    
    // Update status message to indicate loading completed
    if (statusMessage) {
      // Query selectors for counting keys with different statuses
      const matchCount = document.querySelectorAll('#localStorage-keys .match').length; 
      const mismatchCount = document.querySelectorAll('#localStorage-keys .mismatch').length;
      const localOnlyCount = document.querySelectorAll('.localStorage-only').length;
      const chromeOnlyCount = document.querySelectorAll('.chrome-only').length;
      
      statusMessage.textContent = `Loaded ${localStorageKeys.length + chromeOnlyCount} keys: ${matchCount} matching, ${mismatchCount} mismatched, ${localOnlyCount} localStorage-only, ${chromeOnlyCount} chrome-only`;
      statusMessage.className = 'status-message success';
      
      // Clear status message after a delay
      setTimeout(() => {
        if (statusMessage) {
          statusMessage.textContent = '';
          statusMessage.className = 'status-message';
        }
      }, 5000);
    }
    
  } catch (error) {
    console.error('Error loading storage comparison:', error);
    localStorageKeysList.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
    chromeStorageKeysList.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
    
    if (statusMessage) {
      statusMessage.textContent = `Error: ${error.message}`;
      statusMessage.className = 'status-message error';
    }
  }
}

// Render storage keys in a panel
function renderStorageKeys(panel, keys, sourceType) {
  if (!panel) return;
  
  if (keys.length === 0) {
    panel.innerHTML = '<div class="empty-state">No keys found</div>';
    return;
  }
  
  panel.innerHTML = '';
  
  // Sort keys alphabetically
  keys.sort();
  
  keys.forEach(key => {
    const keyRow = document.createElement('div');
    keyRow.className = 'key-row';
    keyRow.dataset.key = key;
    keyRow.dataset.source = sourceType;
    
    const keyName = document.createElement('div');
    keyName.className = 'key-name';
    keyName.textContent = key;
    
    keyRow.appendChild(keyName);
    panel.appendChild(keyRow);
    
    // Add click event listener
    keyRow.addEventListener('click', () => {
      selectKey(key, sourceType);
    });
  });
}

// Compare keys between localStorage and chrome.storage
async function compareKeys(localKeys, chromeKeys) {
  const localRows = document.querySelectorAll('#localStorage-keys .key-row');
  const chromeRows = document.querySelectorAll('#chrome-storage-keys .key-row');
  
  // Update status message if available
  if (statusMessage) {
    statusMessage.textContent = 'Comparing keys...';
    statusMessage.className = 'status-message info';
  }
  
  // Mark localStorage-only keys
  localRows.forEach(row => {
    const key = row.dataset.key;
    if (!chromeKeys.includes(key)) {
      row.classList.add('localStorage-only');
    }
  });
  
  // Mark chrome-only keys
  chromeRows.forEach(row => {
    const key = row.dataset.key;
    if (!localKeys.includes(key)) {
      row.classList.add('chrome-only');
    }
  });
  
  // Find common keys and check for value mismatches
  const commonKeys = localKeys.filter(key => chromeKeys.includes(key));
  
  for (const key of commonKeys) {
    const localValue = localStorage.getItem(key);
    
    const chromeValue = await new Promise(resolve => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
    
    const localRow = document.querySelector(`#localStorage-keys .key-row[data-key="${key}"]`);
    const chromeRow = document.querySelector(`#chrome-storage-keys .key-row[data-key="${key}"]`);
    
    if (localValue === chromeValue) {
      // Values match
      if (localRow) localRow.classList.add('match');
      if (chromeRow) chromeRow.classList.add('match');
    } else {
      // Values don't match
      if (localRow) localRow.classList.add('mismatch');
      if (chromeRow) chromeRow.classList.add('mismatch');
    }
  }
}

// Select a key and show details
async function selectKey(key, sourceType) {
  if (!comparisonDetailsContent) return;
  
  // Clear previous selection
  document.querySelectorAll('.key-row').forEach(row => {
    row.classList.remove('selected');
  });
  
  // Mark this key as selected
  document.querySelectorAll(`.key-row[data-key="${key}"]`).forEach(row => {
    row.classList.add('selected');
  });
  
  selectedKey = key;
  
  // Update status message
  if (statusMessage) {
    statusMessage.textContent = 'Loading key details...';
    statusMessage.className = 'status-message loading';
  }
  
  try {
    let localValue = null;
    let chromeValue = null;
    
    // Get values from both storages
    if (localStorage.getItem(key) !== null) {
      localValue = localStorage.getItem(key);
    }
    
    chromeValue = await new Promise(resolve => {
      chrome.storage.local.get(key, (result) => {
        resolve(result[key]);
      });
    });
    
    // Create a formatted display of the key details
    let detailsHTML = `
      <div class="key-metadata">
        <div class="key-metadata-item">
          <strong>Key:</strong> ${key}
        </div>
      </div>
    `;
    
    if (localValue !== null && chromeValue !== null) {
      const valuesMatch = localValue === chromeValue;
      
      detailsHTML += `
        <div class="key-value-comparison">
          <div class="value-panel">
            <h4>LocalStorage Value:</h4>
            <div class="key-content">${formatValue(localValue)}</div>
          </div>
          <div class="value-panel">
            <h4>Chrome Storage Value:</h4>
            <div class="key-content">${formatValue(chromeValue)}</div>
          </div>
        </div>
        <div class="key-metadata">
          <div class="key-metadata-item" style="color: ${valuesMatch ? 'var(--success-color)' : 'var(--error-color)'}">
            <strong>Match Status:</strong> ${valuesMatch ? 'Values Match ✓' : 'Values Differ ✗'}
          </div>
        </div>
      `;
    } else if (localValue !== null) {
      detailsHTML += `
        <div class="key-metadata">
          <div class="key-metadata-item" style="color: var(--warning-color)">
            <strong>Status:</strong> LocalStorage Only
          </div>
        </div>
        <div class="key-content">${formatValue(localValue)}</div>
      `;
    } else if (chromeValue !== null) {
      detailsHTML += `
        <div class="key-metadata">
          <div class="key-metadata-item" style="color: var(--warning-color)">
            <strong>Status:</strong> Chrome Storage Only
          </div>
        </div>
        <div class="key-content">${formatValue(chromeValue)}</div>
      `;
    }
    
    comparisonDetailsContent.innerHTML = detailsHTML;
    
    // Update status message
    if (statusMessage) {
      statusMessage.textContent = 'Key details loaded successfully';
      statusMessage.className = 'status-message success';
      
      // Clear status message after a delay
      setTimeout(() => {
        if (statusMessage) {
          statusMessage.textContent = '';
          statusMessage.className = 'status-message';
        }
      }, 3000);
    }
    
  } catch (error) {
    console.error('Error displaying key details:', error);
    comparisonDetailsContent.innerHTML = `<div class="error-state">Error: ${error.message}</div>`;
    
    if (statusMessage) {
      statusMessage.textContent = `Error: ${error.message}`;
      statusMessage.className = 'status-message error';
    }
  }
}

// Format a storage value for display
function formatValue(value) {
  if (value === null || value === undefined) {
    return '<em>null</em>';
  }
  
  // Try to parse as JSON
  try {
    const parsed = JSON.parse(value);
    
    // If it's an object, pretty print it
    if (typeof parsed === 'object' && parsed !== null) {
      // Truncate very long values
      const formatted = JSON.stringify(parsed, (key, value) => {
        if (typeof value === 'string' && value.length > 100) {
          return value.substring(0, 100) + '... (truncated)';
        }
        return value;
      }, 2);
      
      return syntaxHighlight(formatted);
    }
  } catch (e) {
    // Not JSON, just return as string
  }
  
  // If not JSON or parsing failed, treat as string
  if (typeof value === 'string' && value.length > 500) {
    return escapeHTML(value.substring(0, 500)) + '... (truncated)';
  }
  
  return escapeHTML(value);
}

// Syntax highlighting for JSON
function syntaxHighlight(json) {
  json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, function (match) {
    let cls = 'number';
    if (/^"/.test(match)) {
      if (/:$/.test(match)) {
        cls = 'key';
      } else {
        cls = 'string';
      }
    } else if (/true|false/.test(match)) {
      cls = 'boolean';
    } else if (/null/.test(match)) {
      cls = 'null';
    }
    return '<span class="' + cls + '">' + match + '</span>';
  });
}

// Escape HTML for display
function escapeHTML(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Update user DID display
function updateUserDid(publicKey) {
  if (!didTextElement || !copyDidBtn) return;
  
  // Format the DID - "did:mata:[publicKey]"
  const fullDid = `did:mata:${publicKey}`;
  
  // For display, we truncate the middle to show only first 8 and last 8 chars
  const truncatedDid = publicKey.length > 16 
    ? `did:mata:${publicKey.slice(0, 8)}...${publicKey.slice(-8)}`
    : fullDid;
  
  // Store the full DID for copy operation
  copyDidBtn.dataset.did = fullDid;
  
  // Update the display text
  didTextElement.textContent = truncatedDid;
  
  // Show the DID elements
  didTextElement.style.display = 'block';
  copyDidBtn.style.display = 'inline-flex';
}

/**
 * Directly fetch user's DID and firstName from chrome.storage.local
 * This function specifically extracts data from the mata_keys_* entries
 * @returns {Promise<{publicKey: string|null, firstName: string|null}>}
 */
async function getUserDIDAndName() {
  return new Promise((resolve) => {
    // Default result if we can't find the data
    const defaultResult = { publicKey: null, firstName: null };
    
    // First get the active user email
    chrome.storage.local.get('mata_active_user', (result) => {
      if (chrome.runtime.lastError) {
        console.error('Error getting active user:', chrome.runtime.lastError);
        return resolve(defaultResult);
      }
      
      let activeUserEmail = result.mata_active_user;
      if (!activeUserEmail) {
        console.warn('No active user found in chrome.storage');
        return resolve(defaultResult);
      }
      
      // Sanitize the email for the storage key
      const sanitizedEmail = window.sanitizeEmail(activeUserEmail);
      const keysKey = `mata_keys_${sanitizedEmail}`;
      
      // Get the user's keys from storage
      chrome.storage.local.get(keysKey, (keysResult) => {
        if (chrome.runtime.lastError) {
          console.error(`Error getting keys for ${activeUserEmail}:`, chrome.runtime.lastError);
          return resolve(defaultResult);
        }
        
        const userData = keysResult[keysKey];
        if (!userData) {
          console.warn(`No keys found for user ${activeUserEmail}`);
          return resolve(defaultResult);
        }
        
        // Extract the publicKey and firstName from the keys data
        try {
          // Parse the keys data if it's a string
          const parsedData = typeof userData === 'string' ? JSON.parse(userData) : userData;
          
          // Keys might be stored in different formats, check common patterns
          const publicKey = parsedData.publicKey || (parsedData.user && parsedData.user.publicKey) || null;
          const firstName = parsedData.firstName || (parsedData.user && parsedData.user.firstName) || null;
          
          console.log(`Found user data directly from storage: publicKey: ${publicKey?.substring(0, 8)}..., firstName: ${firstName}`);
          resolve({ publicKey, firstName });
        } catch (err) {
          console.error('Error parsing user keys data:', err);
          resolve(defaultResult);
        }
      });
    });
  });
}

// Handle copy DID button click
function handleCopyDid() {
  if (!copyDidBtn) return;
  
  const didToCopy = copyDidBtn.dataset.did;
  if (!didToCopy) return;
  
  // Copy to clipboard
  navigator.clipboard.writeText(didToCopy).then(() => {
    // Show success state
    if (copyIcon && checkIcon) {
      copyIcon.style.display = 'none';
      checkIcon.style.display = 'block';
      
      // Reset after 2 seconds
      setTimeout(() => {
        copyIcon.style.display = 'block';
        checkIcon.style.display = 'none';
      }, 2000);
    }
  }).catch(err => {
    console.error('Could not copy DID: ', err);
  });
}