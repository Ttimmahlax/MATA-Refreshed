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
// Simplified getUserData implementation to directly check and fall back to defaults
// This replaces the complex nested implementation with a more reliable approach
async function getSimplifiedUserData(email, dataType, forceSync = false) {
  // Default values for different data types
  const defaultValues = {
    'active_user': null,
    'salt': {},
    'keys': {},
    'bank_accounts': [],
    'passwords': [],
    'contacts': []
  };

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
      // STRICT USER ISOLATION: No longer fallback to first available user
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
  
  // For all other data types, return default values immediately
  // This simplifies the process and ensures we don't get caught in complex error states
  return defaultValues[dataType] || [];
}

// Override the original getUserData with our simplified version
// This is a temporary fix to stabilize the extension
const originalGetUserData = getUserData;
window.getUserData = getSimplifiedUserData;

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
  
  // OPTIMIZATION: Direct identity loading with timeout protection
  // This goes straight to loading active user and retrieving identity data
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Starting direct identity loading...`);
  
  // Start a timer to measure load time
  const startTime = Date.now();
  
  // Fast path: Check for active user directly
  chrome.storage.local.get(['mata_active_user'], async (userData) => {
    const loadTime = Date.now() - startTime;
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Active user lookup completed in ${loadTime}ms`);
    
    const activeUser = userData.mata_active_user;
    
    if (activeUser) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user: ${activeUser}`);
    } else {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user found in chrome.storage`);
    }
    
    // Also start the full identity loading process in parallel with timeout protection
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("loadUserIdentity timed out")), 5000);
    });
    
    try {
      // Race the identity loading against a timeout
      await Promise.race([loadUserIdentity(), timeoutPromise]);
    } catch (error) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Identity loading error/timeout:`, error);
      // We'll continue with the cached values we already displayed
    }
  });
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
  
  // Use the simplified implementation to get active user
  activeUserEmail = await getSimplifiedUserData(null, 'active_user');
  
  // If no active user was found, check if we have users but don't automatically select one
  if (!activeUserEmail) {
    try {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user found initially, checking available accounts...`);
      
      // Check for available accounts but don't automatically select one (STRICT USER ISOLATION)
      const allUsers = await getAllAccounts();
      
      if (allUsers && allUsers.length > 0) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${allUsers.length} existing users, but enforcing STRICT ISOLATION - not auto-selecting any user.`);
        // We intentionally don't set activeUserEmail here to enforce strict user isolation
      }
    } catch (error) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in fallback user search:`, error);
    }
  }
  
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
      // Store the user's first name in a global variable for other parts of the UI to use
      window.currentUserFirstName = null;
      
      window.updateFooterWithFirstName = function(firstName) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] updateFooterWithFirstName called with: ${firstName || 'no name'}`);
        
        // Store the name in a global variable for other parts of the UI
        window.currentUserFirstName = firstName || 'User';
        
        // Always get a fresh reference to the element - don't rely on possibly stale references
        const footer = document.querySelector('footer');
        if (!footer) {
          console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not find footer element!`);
          return;
        }
        
        // First try to find the element using the expected selector
        let elemToUpdate = footer.querySelector('.security-status span');
        
        if (!elemToUpdate) {
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not find .security-status span, trying alternative selectors...`);
          
          // Try just .security-status without span
          const securityStatus = footer.querySelector('.security-status');
          if (securityStatus) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found .security-status container`);
            
            // See if it already has any direct text content
            if (securityStatus.childNodes.length === 0 || 
                (securityStatus.childNodes.length === 1 && securityStatus.childNodes[0].nodeType === Node.TEXT_NODE)) {
              // Just use the container directly
              elemToUpdate = securityStatus;
            } else {
              // Create a span inside it
              elemToUpdate = document.createElement('span');
              securityStatus.appendChild(elemToUpdate);
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Created new span inside .security-status`);
            }
          } else {
            // Create both the container and span
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Creating new .security-status element in footer`);
            const securityStatus = document.createElement('div');
            securityStatus.className = 'security-status';
            
            elemToUpdate = document.createElement('span');
            securityStatus.appendChild(elemToUpdate);
            footer.appendChild(securityStatus);
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Created new .security-status with span in footer`);
          }
        }
        
        // Now update the text content
        if (elemToUpdate) {
          elemToUpdate.textContent = `Set Yourself Free, ${firstName || 'User'}`;
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updated footer with name: ${firstName || 'User'}`);
        } else {
          console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not find or create security status element to update!`);
        }
      };
    } else {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No .security-status span found in footer!`);
    }
  } else {
    console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No footer element found!`);
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
 * 
 * Now using our dedicated simplified implementation for enhanced reliability
 */
async function getUserData(email, dataType, forceSync = false) {
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting user data with simplified implementation: ${dataType} for ${email}`);
  
  try {
    // Use our simplified implementation for reliability
    return await getSimplifiedUserData(email, dataType, forceSync);
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in simplified getUserData:`, error);
    
    // Return appropriate default values based on data type
    if (dataType === 'active_user') {
      return null;
    } else if (dataType === 'salt' || dataType === 'keys') {
      return {};
    } else {
      return [];
    }
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
    // FIRST: Check if data exists in chrome.storage.local before trying other methods
    // This prioritizes direct extension storage over web app localStorage
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Checking chrome.storage.local first for ${dataType}`);
    try {
      const storageResult = await new Promise(resolve => {
        chrome.storage.local.get([mataStorageKey, legacyStorageKey], result => {
          resolve(result);
        });
      });
      
      // Try mata key format first
      if (storageResult && storageResult[mataStorageKey]) {
        const data = storageResult[mataStorageKey];
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with mata key format`);
        
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object') {
          // If it's an object with items array, extract that
          if (data.items && Array.isArray(data.items)) {
            return data.items;
          }
          // For keys data, just return the object directly
          if (dataType === 'keys' || dataType === 'salt' || dataType === 'active_user') {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Returning object data for ${dataType} from chrome.storage`);
            return data;
          }
        }
      }
      
      // Try legacy key format as fallback
      if (storageResult && storageResult[legacyStorageKey]) {
        const data = storageResult[legacyStorageKey];
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${dataType} in chrome.storage with legacy key format`);
        
        if (Array.isArray(data)) {
          return data;
        } else if (data && typeof data === 'object') {
          // If it's an object with items array, extract that
          if (data.items && Array.isArray(data.items)) {
            return data.items;
          }
          // For keys data, just return the object directly
          if (dataType === 'keys' || dataType === 'salt' || dataType === 'active_user') {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Returning object data for ${dataType} from chrome.storage`);
            return data;
          }
        }
      }
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] ${dataType} not found in chrome.storage, continuing to other methods`);
    } catch (storageError) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error accessing chrome.storage:`, storageError);
    }
    
    // SECOND: For keys dataType, try directly using the GET_KEYS API
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
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] GET_KEYS was unsuccessful, falling back to localStorage methods`);
        }
      } catch (keysError) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error calling GET_KEYS API:`, keysError);
      }
    }
    
    // THIRD: Try to get from localStorage via content script, trying both key formats
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
      // Log with appropriate context based on data type
      if (dataType === 'active_user') {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No active user found in localStorage or response was not successful`);
      } else if (dataType === 'salt' || dataType === 'keys') {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No ${dataType} data found in localStorage or response was not successful - will try other methods`);
      } else {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No ${dataType} data found in localStorage or response was not successful`);
      }
    }
    
    // If local storage failed or we need to force sync, try directly using background.js methods
    if (forceSync || !response || !response.success || !response.value) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Falling back to direct background API for ${dataType}`);
      
      // Direct background API method - simplified for maintenance
      // Only support GET_KEYS and GET_PASSWORDS (for compatibility)
      let requestType = dataType === 'keys' ? 'GET_KEYS' : 'GET_PASSWORDS';
      
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
    
    // Return appropriate default value based on data type
    if (dataType === 'active_user') {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] All attempts to get ${dataType} failed, returning null`);
      return null;
    } else if (dataType === 'salt' || dataType === 'keys') {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] All attempts to get ${dataType} failed, returning empty object`);
      return {};
    } else {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] All attempts to get ${dataType} failed, returning empty array`);
      return [];
    }
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error retrieving ${dataType}:`, error);
    
    // Return appropriate default value based on data type even when exception occurs
    if (dataType === 'active_user') {
      return null;
    } else if (dataType === 'salt' || dataType === 'keys') {
      return {};
    } else {
      return [];
    }
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
  
  // Keys and salt can be objects, other data types should be arrays
  if (dataType !== 'keys' && dataType !== 'salt' && !Array.isArray(data)) {
    throw new Error(`Data must be an array for ${dataType}`);
  }
  
  // For keys and salt, check if it's an object
  if ((dataType === 'keys' || dataType === 'salt') && (typeof data !== 'object')) {
    throw new Error(`Data must be an object for ${dataType}`);
  }
  
  // Generate both key formats for maximum compatibility
  const sanitizedEmail = sanitizeEmail(email);
  const mataStorageKey = `mata_${sanitizedEmail}_${dataType === 'bank_accounts' ? 'bankaccounts' : dataType}`;
  const legacyStorageKey = getUserDataKey(email, dataType);
  
  // Determine the size of data for logging (handle both arrays and objects)
  const dataSize = Array.isArray(data) ? 
    `${data.length} items` : 
    (dataType === 'keys' || dataType === 'salt') ? 
      'object' : 'data';
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Saving ${dataType} ${dataSize} with keys:`, {
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
  // Use our simplified implementation to avoid complex error cases
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting active user email with simplified implementation...`);
  return await getSimplifiedUserData(null, 'active_user');
}

/**
 * Load and display user identity (DID and firstName)
 * This is a dedicated function to make sure we handle this critical data properly
 * It first tries the enhanced getUserDIDAndName function, then falls back to alternative methods
 * @returns {Promise<{publicKey: string|null, firstName: string|null}>}
 */
async function loadUserIdentity() {
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Starting loadUserIdentity with STRICT USER ISOLATION...`);
  
  // Store results for return
  const result = { 
    publicKey: null, 
    firstName: null,
    loadedFrom: null,
    activeUser: null
  };

  try {
    // DIRECT PATH: Try to get active user directly from chrome.storage.local
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] DIRECT PATH: Getting active user...`);
    
    // Get active user
    const userActiveData = await new Promise(resolve => {
      chrome.storage.local.get(['mata_active_user'], resolve);
    });
    
    let activeUserEmail = userActiveData.mata_active_user;
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] DIRECT PATH: Active user: ${activeUserEmail || 'none'}`);
    
    // Proceed with normal flow
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting keys for active user for strict isolation...`);
    
    // If no active user in chrome.storage, try to get it from localStorage
    if (!activeUserEmail) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] No active user in chrome.storage, checking localStorage...`);
      try {
        const response = await sendMessageToBackground({
          type: 'GET_LOCAL_STORAGE_VALUE',
          key: 'mata_active_user'
        });
        
        if (response?.success && response?.value) {
          try {
            activeUserEmail = JSON.parse(response.value);
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user in localStorage: ${activeUserEmail}`);
            
            // Save to chrome.storage.local for future use
            chrome.storage.local.set({mata_active_user: activeUserEmail}, () => {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Saved active user to chrome.storage: ${activeUserEmail}`);
            });
          } catch (e) {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing active user from localStorage:`, e);
          }
        }
      } catch (e) {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error getting active user from localStorage:`, e);
      }
    }
    
    // Store the active user in the result
    result.activeUser = activeUserEmail;
    
    // APPROACH 1: Use our comprehensive enhanced function with active user context
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying getUserDIDAndName with active user: ${activeUserEmail || 'none'}...`);
    const userIdentityData = await getUserDIDAndName();
    
    if (userIdentityData.publicKey || userIdentityData.firstName) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] getUserDIDAndName succeeded with: publicKey: ${userIdentityData.publicKey?.substring(0, 8)}..., firstName: ${userIdentityData.firstName}`);
      result.publicKey = userIdentityData.publicKey;
      result.firstName = userIdentityData.firstName;
      result.loadedFrom = 'getUserDIDAndName';
      
      // We're no longer caching identity data in chrome.storage
      // Instead we'll directly access it from mata_keys_* each time
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Using direct identity data from userIdentityData`);
      
      
      // Update the UI with the data we found
      if (userIdentityData.publicKey) {
        updateUserDid(userIdentityData.publicKey);
      }
      
      if (userIdentityData.firstName && window.updateFooterWithFirstName) {
        window.updateFooterWithFirstName(userIdentityData.firstName);
      }
      
      // If we got both values, we can return early
      if (userIdentityData.publicKey && userIdentityData.firstName) {
        return result;
      }
    } else {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] getUserDIDAndName didn't find any data`);
    }
    
    // APPROACH 2: If we didn't get full data from getUserDIDAndName, try LIST_ACCOUNTS
    // BUT with STRICT USER ISOLATION - only use data for active user
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying LIST_ACCOUNTS approach with STRICT USER ISOLATION...`);
    try {
      const accountsResponse = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
      
      if (accountsResponse?.success && accountsResponse?.accounts?.length > 0) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${accountsResponse.accounts.length} accounts`);
        
        // STRICT USER ISOLATION: Only use active user account if available
        if (activeUserEmail) {
          const account = accountsResponse.accounts.find(acc => acc.email === activeUserEmail);
          
          if (account) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found account for active user: ${account.email}`);
            
            // Update publicKey if needed
            if (!result.publicKey && account.publicKey) {
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating publicKey from account: ${account.publicKey.substring(0, 8)}...`);
              result.publicKey = account.publicKey;
              result.loadedFrom = result.loadedFrom || 'LIST_ACCOUNTS (active user)';
              updateUserDid(account.publicKey);
              
              // Cache in chrome.storage.local
              chrome.storage.local.set({mata_cache_did: account.publicKey}, () => {
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Cached DID in chrome.storage.local from LIST_ACCOUNTS`);
              });
            }
            
            // Update firstName if needed
            if (!result.firstName && (account.firstName || account.name)) {
              const name = account.firstName || account.name;
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating firstName from account: ${name}`);
              result.firstName = name;
              result.loadedFrom = result.loadedFrom || 'LIST_ACCOUNTS (active user)';
              
              if (window.updateFooterWithFirstName) {
                window.updateFooterWithFirstName(name);
              }
              
              // Cache in chrome.storage.local
              chrome.storage.local.set({mata_cache_firstname: name}, () => {
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Cached firstName in chrome.storage.local from LIST_ACCOUNTS (active user)`);
              });
            }
          } else {
            console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No account found for active user: ${activeUserEmail}`);
          }
        } else {
          // STRICT USER ISOLATION: No active user, and we will NOT fall back to first account anymore
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No active user set. STRICT ISOLATION enforced - no fallback to first available account.`);
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${accountsResponse.accounts.length} accounts, but none will be used without explicit active user selection.`);
          // We intentionally do not set any values to enforce strict isolation
        }
      } else {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] LIST_ACCOUNTS didn't return any accounts`);
      }
    } catch (err) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in LIST_ACCOUNTS approach:`, err);
    }
    
    // APPROACH 3: Last resort - check for direct keys in chrome.storage.local
    if (!result.publicKey || !result.firstName) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying direct chrome.storage.local key checks...`);
      
      // Keys that might contain identity info
      const keysToCheck = [
        'user_profile',
        'mata_identity',
        'mata_user_profile',
        'user_identity',
        'user_info',
        'user_data',
        'mata_user'
      ];
      
      const storageData = await new Promise(resolve => {
        chrome.storage.local.get(keysToCheck, resolve);
      });
      
      // Check each key for useful data
      for (const key of keysToCheck) {
        if (storageData[key]) {
          try {
            // Parse if it's a string
            const data = typeof storageData[key] === 'string' 
              ? JSON.parse(storageData[key]) 
              : storageData[key];
            
            // Try to extract publicKey if needed
            if (!result.publicKey) {
              const foundKey = data.publicKey || 
                (data.user && data.user.publicKey) || 
                data.did || 
                (data.user && data.user.did);
              
              if (foundKey) {
                result.publicKey = foundKey;
                result.loadedFrom = result.loadedFrom || `chrome.storage.${key}`;
                updateUserDid(foundKey);
                
                // Cache in chrome.storage.local
                chrome.storage.local.set({mata_cache_did: foundKey}, () => {
                  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Cached DID in chrome.storage.local from direct storage approach`);
                });
              }
            }
            
            // Try to extract firstName if needed
            if (!result.firstName) {
              const foundName = data.firstName || 
                (data.user && data.user.firstName) ||
                data.name ||
                (data.user && data.user.name) ||
                data.username ||
                (data.user && data.user.username);
              
              if (foundName) {
                result.firstName = foundName;
                result.loadedFrom = result.loadedFrom || `chrome.storage.${key}`;
                
                if (window.updateFooterWithFirstName) {
                  window.updateFooterWithFirstName(foundName);
                }
                
                // Cache in chrome.storage.local
                chrome.storage.local.set({mata_cache_firstname: foundName}, () => {
                  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Cached firstName in chrome.storage.local from direct storage approach`);
                });
              }
            }
          } catch (err) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing ${key} data:`, err);
          }
        }
      }
    }
    
    // Log final result
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] loadUserIdentity complete. Found: publicKey: ${result.publicKey?.substring(0, 8) || 'null'}..., firstName: ${result.firstName || 'null'}, from: ${result.loadedFrom || 'no source'}`);
    
    return result;
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in loadUserIdentity:`, error);
    return result;
  }
}

// Load all data for the new UI tabs
async function loadAllData() {
  try {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Starting loadAllData function`);
    
    // Show loading state
    showLoadingState();
    
    // FIRST PRIORITY: Load user identity information ASAP
    // This ensures the DID and firstName are displayed as soon as possible
    // This function handles all the complex logic of finding this data
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Loading user identity first...`);
    await loadUserIdentity();
    
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

// Handle export keys - Updated to match web app format
async function handleExportKeys() {
  console.log(`[MATA v${window.EXTENSION_VERSION}] Exporting keys in web app compatible format`);
  
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
    // Import JSZip (already included in the extension)
    // This is imported via the popup.html script tag
    if (!JSZip) {
      throw new Error('JSZip library not available');
    }
    
    // Create a new zip file
    const zip = new JSZip();
    
    // Track whether we included IndexedDB data in the backup
    let includedIndexedDB = false;
    
    // Get the active user email for targeted backup
    if (!activeUserEmail) {
      // Try to get active user if not already set
      activeUserEmail = await getSimplifiedUserData(null, 'active_user');
      if (!activeUserEmail) {
        console.log('No active user found, will create a general backup');
      } else {
        console.log(`Active user for backup: ${activeUserEmail}`);
      }
    }
    
    // Add a README file exactly like the web app does
    zip.file("README.txt", `MATA Keys Backup
Created: ${new Date().toLocaleString()}
${activeUserEmail ? `User: ${activeUserEmail}` : ''}

This zip file contains data from your MATA Chrome extension${activeUserEmail ? ` for user ${activeUserEmail}` : ''}.
${activeUserEmail ? 'It includes both localStorage keys and IndexedDB data for complete restoration.' : 'It includes localStorage keys.'}
To restore this data, please use the "Import Backup" feature in the MATA web application.
`);

    // Get all data from chrome.storage.local for categorization
    await new Promise((resolve, reject) => {
      chrome.storage.local.get(null, async (items) => {
        if (chrome.runtime.lastError) {
          reject(new Error(`Error getting chrome.storage data: ${chrome.runtime.lastError.message}`));
          return;
        }
        
        try {
          // Prepare categorized data objects just like the web app
          const userData = {};
          const passwordData = {};
          const contactData = {};
          const bankAccountData = {};
          const settingsData = {};
          const miscData = {};
          
          // If a specific user email is provided, sanitize it for key matching
          const sanitizedTargetEmail = activeUserEmail ? 
            sanitizeEmail(activeUserEmail) : 
            undefined;
          
          console.log(`Creating backup${activeUserEmail ? ` for user ${activeUserEmail} (sanitized: ${sanitizedTargetEmail})` : ' for all users'}`);
          
          // Categorize items from chrome.storage.local
          for (const [key, value] of Object.entries(items)) {
            // Skip non-MATA keys
            if (!key.startsWith('mata_') && 
                !key.includes('_vault_') && 
                !key.includes('keys_') &&
                !key.includes('_keys') &&
                !key.includes('masterKeys') &&
                !key.includes('salt_')) {
              continue;
            }
            
            // If a specific user is targeted, only include keys for that user
            if (sanitizedTargetEmail) {
              // For user-specific backup, only include keys relevant to that user
              const shouldIncludeKey = 
                // Include keys with the user's email
                key === `mata_keys_${sanitizedTargetEmail}` || 
                key === `mata_salt_${sanitizedTargetEmail}` ||
                // Include user-specific vaults
                key.includes(`user_${sanitizedTargetEmail}`) ||
                // Include global MATA settings
                key.startsWith('mata_setting') ||
                key === 'mata_active_user';
                
              if (!shouldIncludeKey) continue;
            }
            
            // Categorize data the same way as the web app
            if (key.includes('user_') || key.includes('keys_') || key.includes('salt_')) {
              userData[key] = value;
            } else if (key.includes('password')) {
              passwordData[key] = value;
            } else if (key.includes('contact')) {
              contactData[key] = value;
            } else if (key.includes('bank') || key.includes('account')) {
              bankAccountData[key] = value;
            } else if (key.includes('setting') || key.includes('config')) {
              settingsData[key] = value;
            } else {
              miscData[key] = value;
            }
          }
          
          // Add all data to the zip in the same format as the web app
          zip.file("all-keys.json", JSON.stringify({ 
            ...userData,
            passwordData,
            contactData,
            bankAccountData,
            settingsData,
            miscData
          }, null, 2));
          
          // Add categorized files following the web app format
          if (Object.keys(userData).length > 0) {
            zip.file("user-data.json", JSON.stringify(userData, null, 2));
          }
          
          if (Object.keys(passwordData).length > 0) {
            zip.file("password-data.json", JSON.stringify(passwordData, null, 2));
          }
          
          if (Object.keys(contactData).length > 0) {
            zip.file("contact-data.json", JSON.stringify(contactData, null, 2));
          }
          
          if (Object.keys(bankAccountData).length > 0) {
            zip.file("bank-account-data.json", JSON.stringify(bankAccountData, null, 2));
          }
          
          if (Object.keys(settingsData).length > 0) {
            zip.file("settings-data.json", JSON.stringify(settingsData, null, 2));
          }
          
          if (Object.keys(miscData).length > 0) {
            zip.file("misc-data.json", JSON.stringify(miscData, null, 2));
          }
          
          // If a specific user email is available, include IndexedDB backup
          if (activeUserEmail) {
            try {
              console.log(`Retrieving IndexedDB backup for user ${activeUserEmail}`);
              
              // Trigger the content script to initiate a backup process
              // We need to send a message to any MATA tab to trigger the content script
              // First find all MATA tabs
              const findTabsResponse = await sendMessageToBackground({
                type: 'FIND_MATA_TABS'
              });
              
              if (findTabsResponse?.success && findTabsResponse.tabs && findTabsResponse.tabs.length > 0) {
                console.log(`Found ${findTabsResponse.tabs.length} MATA tabs to trigger backup`);
                
                // Send message to the first available MATA tab
                const tab = findTabsResponse.tabs[0];
                
                try {
                  // Send message to the tab to trigger IndexedDB backup
                  const contentResponse = await new Promise((resolve) => {
                    chrome.tabs.sendMessage(tab.id, {
                      type: 'TRIGGER_INDEXEDDB_BACKUP',
                      user: activeUserEmail
                    }, (response) => {
                      if (chrome.runtime.lastError) {
                        console.warn('Error sending message to content script:', chrome.runtime.lastError);
                        resolve({ success: false, error: chrome.runtime.lastError.message });
                      } else {
                        resolve(response || { success: false, error: 'No response' });
                      }
                    });
                  });
                  
                  if (contentResponse?.success) {
                    console.log('Content script successfully triggered IndexedDB backup');
                    
                    // Wait a moment for the backup to complete
                    console.log('Waiting for backup to complete...');
                    await new Promise(resolve => setTimeout(resolve, 1500));
                    
                    // Now retrieve the backup data
                    const retrieveResponse = await sendMessageToBackground({
                      type: 'GET_INDEXEDDB_BACKUP',
                      user: activeUserEmail
                    });
                    
                    if (retrieveResponse?.success && retrieveResponse.data) {
                      console.log(`Retrieved IndexedDB backup data for user ${activeUserEmail}`);
                      
                      // Create an indexeddb folder in the zip
                      const indexeddbFolder = zip.folder("indexeddb");
                      
                      // Use the retrieved backup data
                      const indexedDBData = retrieveResponse.data;
                      
                      // Add IndexedDB data to the zip file in the same format as the web app
                      if (indexeddbFolder && indexedDBData) {
                        // Store raw IndexedDB data
                        indexeddbFolder.file(`indexeddb-data.json`, JSON.stringify(indexedDBData, null, 2));
                        
                        // Add separate files for each database if we have database-level data
                        if (typeof indexedDBData === 'object' && indexedDBData !== null) {
                          for (const [dbName, dbData] of Object.entries(indexedDBData)) {
                            if (!dbData) continue;
                            
                            // Create a folder for this database
                            const dbFolder = indexeddbFolder.folder(dbName);
                            if (dbFolder) {
                              // Add database metadata
                              const version = dbData?.version;
                              const objectStores = dbData?.objectStores || [];
                              
                              dbFolder.file('db-info.json', JSON.stringify({
                                name: dbName,
                                version: version,
                                objectStores: objectStores
                              }, null, 2));
                              
                              // Add stores data if available
                              if (dbData?.stores) {
                                // Create a stores folder
                                const storesFolder = dbFolder.folder('stores');
                                if (storesFolder) {
                                  // Add each store's data as a separate file
                                  for (const [storeName, storeData] of Object.entries(dbData.stores)) {
                                    if (storeData) {
                                      storesFolder.file(`${storeName}.json`, JSON.stringify(storeData, null, 2));
                                    }
                                  }
                                }
                              }
                            }
                          }
                        }
                        
                        includedIndexedDB = true;
                        console.log(`Successfully added IndexedDB data to the backup`);
                      }
                    } else {
                      console.warn('Failed to retrieve IndexedDB backup data:', 
                        retrieveResponse?.error || 'No data returned');
                    }
                  } else {
                    console.warn('Content script failed to initiate backup:', 
                      contentResponse?.error || 'Unknown error');
                      
                    // Fall back to direct retrieval if content script failed but we might have data from before
                    console.log('Attempting to retrieve existing backup data...');
                    const fallbackResponse = await sendMessageToBackground({
                      type: 'GET_INDEXEDDB_BACKUP',
                      user: activeUserEmail
                    });
                    
                    if (fallbackResponse?.success && fallbackResponse.data) {
                      console.log(`Retrieved existing IndexedDB backup for ${activeUserEmail}`);
                      // Same processing as above - duplicate but for clarity
                      const indexeddbFolder = zip.folder("indexeddb");
                      const indexedDBData = fallbackResponse.data;
                      
                      if (indexeddbFolder && indexedDBData) {
                        indexeddbFolder.file(`indexeddb-data.json`, JSON.stringify(indexedDBData, null, 2));
                        // ... similar processing as above
                        includedIndexedDB = true;
                        console.log(`Successfully added existing IndexedDB data to the backup`);
                      }
                    }
                  }
                } catch (tabError) {
                  console.error('Error communicating with content script:', tabError);
                }
              } else {
                console.warn('No MATA tabs found to trigger IndexedDB backup');
                
                // Try to directly create the backup from popup using the background script
                // This alternative approach sends a message directly to the background script
                console.log('Attempting direct backup through background script...');
                
                // Try to get any previously saved backup
                const directResponse = await sendMessageToBackground({
                  type: 'GET_INDEXEDDB_BACKUP',
                  user: activeUserEmail
                });
                
                if (directResponse?.success && directResponse.data) {
                  console.log(`Retrieved existing IndexedDB backup for ${activeUserEmail}`);
                  
                  const indexeddbFolder = zip.folder("indexeddb");
                  const indexedDBData = directResponse.data;
                  
                  if (indexeddbFolder && indexedDBData) {
                    indexeddbFolder.file(`indexeddb-data.json`, JSON.stringify(indexedDBData, null, 2));
                    includedIndexedDB = true;
                    console.log(`Successfully added existing IndexedDB data to the backup`);
                  }
                } else {
                  console.warn('No existing IndexedDB backup found and no tabs to trigger new backup');
                }
              }
            } catch (idbError) {
              console.error('Error handling IndexedDB backup:', idbError);
            }
          }
          
          // Generate timestamp for the filename - same format as web app
          const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
          
          // Add user information to filename if available - same format as web app
          const userPart = activeUserEmail ? 
            `-${sanitizeEmail(activeUserEmail).replace(/_/g, '-')}` : 
            '';
          
          // Add a special suffix if we included IndexedDB data - same as web app
          const typeSuffix = includedIndexedDB ? '-full' : '';
          
          // Generate the zip file
          const zipBlob = await zip.generateAsync({ type: 'blob' });
          
          // Create a filename that matches web app format
          const filename = `mata-keys-backup${userPart}${typeSuffix}-${timestamp}.zip`;
          
          // Create a download link and click it
          const url = URL.createObjectURL(zipBlob);
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
          
          console.log('Keys exported successfully in web app compatible format');
          
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
          
          resolve();
        } catch (error) {
          reject(error);
        }
      });
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
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] updateUserDid called with: ${publicKey ? publicKey.substring(0, 8) + '...' : 'null or undefined'}`);
  
  try {
    // Early exit if no publicKey provided, but don't hide UI elements yet (try to find them first)
    if (!publicKey) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No public key provided to updateUserDid`);
    }
    
    // Always get fresh element references to avoid stale DOM references
    // Find the did-text element - this should exist in the DOM already
    didTextElement = document.querySelector('.did-text');
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for .did-text element: ${didTextElement ? 'found' : 'not found'}`);
    
    // Find the copy button
    copyDidBtn = document.querySelector('#copy-did-btn');
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for #copy-did-btn element: ${copyDidBtn ? 'found' : 'not found'}`);
    
    // Find the copy and check icons within the button
    if (copyDidBtn) {
      copyIcon = copyDidBtn.querySelector('.copy-icon');
      checkIcon = copyDidBtn.querySelector('.check-icon');
      
      // Add click handler if it doesn't have one
      if (!copyDidBtn.hasAttribute('data-initialized')) {
        copyDidBtn.addEventListener('click', handleCopyDid);
        copyDidBtn.setAttribute('data-initialized', 'true');
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Added click handler to copy button`);
      }
    }
    
    // If elements weren't found, try alternative approaches
    if (!didTextElement) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] didTextElement not found with primary selector, trying alternatives...`);
      // Try several potential selectors
      const selectors = ['#did-text', '[data-did-display]', '.did-container .text', '.user-did span'];
      
      for (const selector of selectors) {
        didTextElement = document.querySelector(selector);
        if (didTextElement) {
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found didTextElement with selector: ${selector}`);
          break;
        }
      }
      
      // If still not found, try to locate the parent container and then find within it
      if (!didTextElement) {
        const didContainer = document.querySelector('#user-did-display') || document.querySelector('.user-did');
        if (didContainer) {
          didTextElement = didContainer.querySelector('span') || didContainer.querySelector('div');
          if (didTextElement) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found didTextElement within container`);
          }
        }
      }
      
      // Last resort - create the element if it doesn't exist
      if (!didTextElement) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not find didTextElement with any known selector`);
        
        // Try to find the user-did container
        const didContainer = document.querySelector('#user-did-display') || document.querySelector('.user-did');
        
        if (didContainer) {
          // Create new did-text element inside the container
          didTextElement = document.createElement('span');
          didTextElement.className = 'did-text';
          didTextElement.style.display = 'inline-block';
          
          // Insert it at the beginning of the container
          didContainer.insertBefore(didTextElement, didContainer.firstChild);
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Created new didTextElement in existing container`);
        } else {
          // If no container exists, try to add to header
          const header = document.querySelector('header .left-group');
          if (header) {
            const didContainer = document.createElement('div');
            didContainer.className = 'user-did';
            didContainer.id = 'user-did-display';
            
            didTextElement = document.createElement('span');
            didTextElement.className = 'did-text';
            
            didContainer.appendChild(didTextElement);
            header.appendChild(didContainer);
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Created new did container and didTextElement`);
          } else {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not find header to add didTextElement`);
          }
        }
      }
    }
    
    // Similarly try to find or create the copy button
    if (!copyDidBtn && didTextElement) {
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] copyDidBtn not found, trying to find or create...`);
      
      // Try to find the button near the did-text element
      const didContainer = didTextElement.closest('#user-did-display') || didTextElement.closest('.user-did');
      
      if (didContainer) {
        copyDidBtn = didContainer.querySelector('button') || didContainer.querySelector('.copy-did-btn');
      }
      
      // If still not found, create one
      if (!copyDidBtn) {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Creating new copyDidBtn element`);
        
        copyDidBtn = document.createElement('button');
        copyDidBtn.id = 'copy-did-btn';
        copyDidBtn.className = 'copy-did-btn';
        copyDidBtn.innerHTML = `
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="copy-icon">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" 
            stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="check-icon hidden">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;
        
        copyDidBtn.addEventListener('click', handleCopyDid);
        copyDidBtn.setAttribute('data-initialized', 'true');
        
        // Try to add it to the did container if it exists
        if (didContainer) {
          didContainer.appendChild(copyDidBtn);
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Added new copyDidBtn to did container`);
        } else if (didTextElement.parentNode) {
          // Otherwise add it after the didTextElement
          didTextElement.parentNode.insertBefore(copyDidBtn, didTextElement.nextSibling);
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Added new copyDidBtn after didTextElement`);
        }
        
        // Update the icon references
        copyIcon = copyDidBtn.querySelector('.copy-icon');
        checkIcon = copyDidBtn.querySelector('.check-icon');
      }
    }
    
    // Exit if we still don't have the required elements
    if (!didTextElement) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Missing didTextElement, cannot update DID display`);
      return;
    }
    
    // Exit if no publicKey was provided
    if (!publicKey) {
      if (didTextElement) didTextElement.style.display = 'none';
      if (copyDidBtn) copyDidBtn.style.display = 'none';
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Hiding DID elements due to missing publicKey`);
      return;
    }
    
    // Ensure publicKey is a string
    const publicKeyStr = String(publicKey);
    
    // Format the DID - "did:mata:[publicKey]" 
    const fullDid = `did:mata:${publicKeyStr}`;
    
    // For display, we truncate the middle to show only first 8 and last 8 chars
    let truncatedDid = fullDid;
    if (publicKeyStr.length > 16) {
      try {
        truncatedDid = `did:mata:${publicKeyStr.slice(0, 8)}...${publicKeyStr.slice(-8)}`;
      } catch (error) {
        console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error truncating DID:`, error);
        // Fall back to the full DID if truncation fails
        truncatedDid = fullDid;
      }
    }
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Updating DID display: ${truncatedDid}`);
    
    // Store the full DID for copy operation
    if (copyDidBtn) {
      copyDidBtn.dataset.did = fullDid;
    }
    
    // Update the display text
    didTextElement.textContent = truncatedDid;
    
    // Show the DID elements
    didTextElement.style.display = 'inline-block';
    if (copyDidBtn) copyDidBtn.style.display = 'inline-flex';
    
    // Also update any other DID elements on the page (there might be multiple)
    const allDidElements = document.querySelectorAll('.did-text');
    if (allDidElements.length > 1) {
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${allDidElements.length} DID elements, updating all...`);
      allDidElements.forEach(element => {
        if (element !== didTextElement) { // Skip the one we already updated
          element.textContent = truncatedDid;
          element.style.display = 'inline-block';
        }
      });
    }
    
    // Update user name in footer if we have it
    const userFirstName = window.currentUserFirstName;
    if (userFirstName) {
      updateFooterWithFirstName(userFirstName);
    }
    
    return true; // Success
  } catch (error) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in updateUserDid:`, error);
    return false; // Failure
  }
}

/**
 * Directly fetch user's DID and firstName from chrome.storage.local
 * This function specifically extracts data from the mata_keys_* entries
 * @returns {Promise<{publicKey: string|null, firstName: string|null}>}
 */
/**
 * Enhanced function to get user's DID (publicKey) and firstName from multiple storage locations
 * This function uses a more comprehensive approach to find the data wherever it might be stored
 */
async function getUserDIDAndName() {
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Starting enhanced getUserDIDAndName function...`);
  return new Promise(async (resolve) => {
    // Default result if we can't find the data
    const defaultResult = { publicKey: null, firstName: null };
    
    try {
      // PERFORMANCE: Check for active user and target the specific key rather than getting ALL storage 
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Getting active user for direct targeted retrieval...`);
      
      const userDataPromise = new Promise(resolve => {
        chrome.storage.local.get(['mata_active_user'], async (result) => {
          const activeUser = result.mata_active_user;
          
          if (activeUser) {
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user: ${activeUser}`);
            
            // Sanitize email and create targeted key
            const sanitizedEmail = typeof window.sanitizeEmail === 'function' 
              ? window.sanitizeEmail(activeUser) 
              : activeUser.replace(/[@.]/g, '_');
              
            const keysKey = `mata_keys_${sanitizedEmail}`;
            
            // Get just this specific key instead of all storage
            chrome.storage.local.get([keysKey], (keysResult) => {
              const keysData = keysResult[keysKey];
              
              if (keysData) {
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found keys for active user`);
                try {
                  // Parse if needed
                  const parsedData = typeof keysData === 'string' ? JSON.parse(keysData) : keysData;
                  
                  // Quick extraction of critical fields with early return
                  const userData = { publicKey: null, firstName: null };
                  
                  // Direct properties
                  userData.publicKey = parsedData.publicKey || null;
                  userData.firstName = parsedData.firstName || parsedData.name || null;
                  
                  // Nested in user object
                  if (parsedData.user) {
                    userData.publicKey = userData.publicKey || parsedData.user.publicKey || null;
                    userData.firstName = userData.firstName || parsedData.user.firstName || parsedData.user.name || null;
                  }
                  
                  // Nested in keys object
                  if (parsedData.keys) {
                    userData.publicKey = userData.publicKey || parsedData.keys.publicKey || null;
                    userData.firstName = userData.firstName || parsedData.keys.firstName || parsedData.keys.name || null;
                  }
                  
                  // Check for other common property names
                  userData.publicKey = userData.publicKey || parsedData.did || parsedData.userPublicKey || null;
                  userData.firstName = userData.firstName || parsedData.username || null;
                  
                  if (userData.publicKey || userData.firstName) {
                    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Fast path found data: publicKey: ${userData.publicKey?.substring(0, 8)}..., firstName: ${userData.firstName}`);
                    resolve(userData);
                    return;
                  }
                } catch (err) {
                  console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing fast path keys:`, err);
                }
              }
              
              // If we get here, we need to try the slow path
              resolve(null);
            });
          } else {
            // No active user, can't use fast path
            resolve(null);
          }
        });
      });
      
      // Race the fast path against a 600ms timeout
      const fastPathResult = await Promise.race([
        userDataPromise,
        new Promise(resolve => setTimeout(() => resolve(null), 600))
      ]);
      
      if (fastPathResult) {
        // Fast path succeeded, return results
        return resolve(fastPathResult);
      }
      
      // If fast path fails or times out, continue with the full approach
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Fast path failed or timed out, continuing with full storage scan...`);
      
      // Get all data from chrome.storage (slow but comprehensive)
      const allStorageData = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Got all storage data, keys: ${Object.keys(allStorageData).join(', ')}`);
      
      // Find mata_active_user
      let activeUserEmail = allStorageData.mata_active_user;
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Active user from chrome.storage: ${activeUserEmail || 'none'}`);
      
      // Find all mata_keys_* entries
      const keysEntries = Object.keys(allStorageData).filter(key => key.startsWith('mata_keys_'));
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found ${keysEntries.length} mata_keys_* entries in chrome.storage`);
      
      // If we have the active user email, prioritize that keys entry
      let targetKeysEntry = null;
      let keysData = null;
      
      if (activeUserEmail) {
        // Sanitize the email for storage key format
        const sanitizedEmail = sanitizeEmail ? sanitizeEmail(activeUserEmail) : activeUserEmail.replace(/[@.]/g, '_');
        const expectedKeysKey = `mata_keys_${sanitizedEmail}`;
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for ${expectedKeysKey} in storage`);
        
        if (allStorageData[expectedKeysKey]) {
          targetKeysEntry = expectedKeysKey;
          keysData = allStorageData[expectedKeysKey];
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found keys for active user: ${targetKeysEntry}`);
        }
      }
      
      // STRICT USER ISOLATION: Only use keys for the active user
      // If we couldn't find keys for active user AND we have no active user set yet,
      // we'll try to find the active user from other sources before using another user's data
      if (!keysData && !activeUserEmail) {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No active user or keys found, trying to determine active user...`);
        
        // Try to get active user from localStorage via content script
        try {
          const response = await sendMessageToBackground({
            type: 'GET_LOCAL_STORAGE_VALUE',
            key: 'mata_active_user'
          });
          
          if (response?.success && response?.value) {
            try {
              activeUserEmail = JSON.parse(response.value);
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found active user in localStorage: ${activeUserEmail}`);
              
              // Store it in chrome.storage for future use
              chrome.storage.local.set({mata_active_user: activeUserEmail}, () => {
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Saved active user to chrome.storage: ${activeUserEmail}`);
              });
              
              // Now try to get the keys for this user
              if (activeUserEmail) {
                const sanitizedEmail = sanitizeEmail ? sanitizeEmail(activeUserEmail) : activeUserEmail.replace(/[@.]/g, '_');
                const expectedKeysKey = `mata_keys_${sanitizedEmail}`;
                
                if (allStorageData[expectedKeysKey]) {
                  targetKeysEntry = expectedKeysKey;
                  keysData = allStorageData[expectedKeysKey];
                  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found keys for active user from localStorage: ${targetKeysEntry}`);
                }
              }
            } catch (e) {
              console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing active user from localStorage:`, e);
            }
          }
        } catch (e) {
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Error getting active user from localStorage:`, e);
        }
      }
      
      // STRICT USER ISOLATION MODE - NO FALLBACK
      // We do not fall back to first available user anymore to prevent data isolation issues
      if (!keysData && !activeUserEmail && keysEntries.length > 0) {
        console.warn(`[DEBUG v${window.EXTENSION_VERSION}] WARNING: No active user found. STRICT ISOLATION enforced - no fallback to first available user.`);
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Available keys entries: ${keysEntries.length}, but none will be used without active user.`);
        // We intentionally do not set any values to enforce strict isolation
      }
      
      // Try to parse the keysData if it's a string
      let parsedKeysData = keysData;
      if (typeof keysData === 'string') {
        try {
          parsedKeysData = JSON.parse(keysData);
          console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully parsed keys data as JSON`);
        } catch (e) {
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Failed to parse keys data as JSON: ${e.message}`);
        }
      }
      
      // Data collection object to accumulate data from different sources
      const userData = {
        publicKey: null,
        firstName: null
      };
      
      // APPROACH 2: If we have an email, check the mata_keys_* entry
      if (activeUserEmail) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for user data with email: ${activeUserEmail}`);
        
        // Sanitize the email for the storage key
        const sanitizedEmail = window.sanitizeEmail ? window.sanitizeEmail(activeUserEmail) : activeUserEmail.replace(/[@.]/g, '_');
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Sanitized email: ${sanitizedEmail}`);
        
        const keysKey = `mata_keys_${sanitizedEmail}`;
        
        // Get the user's keys from storage
        const keysResult = await new Promise(resolve => {
          chrome.storage.local.get(keysKey, resolve);
        });
        
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Keys result:`, keysResult);
        
        const keysData = keysResult[keysKey];
        if (keysData) {
          // Extract data from keys
          try {
            // Parse the keys data if it's a string
            const parsedData = typeof keysData === 'string' ? JSON.parse(keysData) : keysData;
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Parsed data structure:`, Object.keys(parsedData));
            
            // Keys might be stored in different formats, check all possible paths
            // Direct properties
            userData.publicKey = userData.publicKey || parsedData.publicKey || null;
            userData.firstName = userData.firstName || parsedData.firstName || null;
            
            // Nested in user object
            if (parsedData.user) {
              userData.publicKey = userData.publicKey || parsedData.user.publicKey || null;
              userData.firstName = userData.firstName || parsedData.user.firstName || parsedData.user.name || null;
            }
            
            // Nested in keys object
            if (parsedData.keys) {
              userData.publicKey = userData.publicKey || parsedData.keys.publicKey || null;
              userData.firstName = userData.firstName || parsedData.keys.firstName || parsedData.keys.name || null;
            }
            
            // Check for other common property names
            userData.publicKey = userData.publicKey || parsedData.did || parsedData.userPublicKey || null;
            userData.firstName = userData.firstName || parsedData.name || parsedData.username || null;
            
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found data in ${keysKey}: publicKey: ${userData.publicKey?.substring(0, 8)}..., firstName: ${userData.firstName}`);
          } catch (err) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing user keys data:`, err);
          }
        } else {
          console.warn(`[DEBUG v${window.EXTENSION_VERSION}] No keys found in ${keysKey}`);
        }
        
        // Also check user_data_* entry which might have profile info
        const userDataKey = `user_data_${sanitizedEmail}`;
        const userDataResult = await new Promise(resolve => {
          chrome.storage.local.get(userDataKey, resolve);
        });
        
        const profileData = userDataResult[userDataKey];
        if (profileData) {
          try {
            // Parse if it's a string
            const parsedProfile = typeof profileData === 'string' ? JSON.parse(profileData) : profileData;
            
            // Only set if we haven't found these values yet
            userData.publicKey = userData.publicKey || parsedProfile.publicKey || (parsedProfile.user && parsedProfile.user.publicKey) || (parsedProfile.keys && parsedProfile.keys.publicKey);
            userData.firstName = userData.firstName || parsedProfile.firstName || parsedProfile.name || 
              (parsedProfile.user && (parsedProfile.user.firstName || parsedProfile.user.name)) ||
              (parsedProfile.keys && (parsedProfile.keys.firstName || parsedProfile.keys.name));
            
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found data in ${userDataKey}: firstName: ${userData.firstName}`);
          } catch (err) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing profile data:`, err);
          }
        }
      }
      
      // APPROACH 3: Check common user data keys that might exist in storage
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Checking common user data keys...`);
      const commonUserKeys = [
        'user_profile',
        'mata_user_profile',
        'mata_identity',
        'user_identity',
        'user_info',
        'mata_user_info',
        'user_data',
        'mata_user'
      ];
      
      // Get all these keys at once
      const commonKeysResult = await new Promise(resolve => {
        chrome.storage.local.get(commonUserKeys, resolve);
      });
      
      // Check each key for user data
      for (const key of commonUserKeys) {
        const data = commonKeysResult[key];
        if (data) {
          try {
            // Parse if it's a string
            const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
            
            // Only update if we don't already have these values
            userData.publicKey = userData.publicKey || parsedData.publicKey || 
              (parsedData.user && parsedData.user.publicKey) ||
              (parsedData.keys && parsedData.keys.publicKey);
              
            userData.firstName = userData.firstName || parsedData.firstName || parsedData.name || 
              (parsedData.user && (parsedData.user.firstName || parsedData.user.name)) ||
              (parsedData.keys && (parsedData.keys.firstName || parsedData.keys.name));
            
            console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found data in ${key}: firstName: ${userData.firstName}, publicKey: ${userData.publicKey?.substring(0, 8)}...`);
          } catch (err) {
            console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error parsing data from ${key}:`, err);
          }
        }
      }
      
      // APPROACH 4: Directly look for keys_* and user_* entries by enumerating all storage
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Checking all storage entries...`);
      const allStorage = await new Promise(resolve => {
        chrome.storage.local.get(null, resolve);
      });
      
      // Check each key for potential user data
      for (const key of Object.keys(allStorage)) {
        // Only check keys that might contain user data
        if (key.startsWith('mata_keys_') || key.startsWith('user_') || key.includes('profile') || key.includes('account')) {
          const data = allStorage[key];
          if (data) {
            try {
              // Parse if it's a string
              const parsedData = typeof data === 'string' ? JSON.parse(data) : data;
              
              // Only update if we don't already have these values
              userData.publicKey = userData.publicKey || parsedData.publicKey || 
                (parsedData.user && parsedData.user.publicKey) ||
                (parsedData.keys && parsedData.keys.publicKey);
                
              userData.firstName = userData.firstName || parsedData.firstName || parsedData.name || 
                (parsedData.user && (parsedData.user.firstName || parsedData.user.name)) ||
                (parsedData.keys && (parsedData.keys.firstName || parsedData.keys.name));
              
              if (userData.publicKey || userData.firstName) {
                console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found data in ${key}: firstName: ${userData.firstName}, publicKey: ${userData.publicKey?.substring(0, 8)}...`);
              }
            } catch (err) {
              // Not critical, just continue
            }
          }
        }
      }
      
      // APPROACH 5: Last attempt - query accounts list from background
      if (!userData.publicKey || !userData.firstName) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Trying accounts list as last resort...`);
        try {
          const accountsResponse = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
          if (accountsResponse?.success && accountsResponse?.accounts && accountsResponse.accounts.length > 0) {
            // Try to find the account for our active user
            const account = activeUserEmail 
              ? accountsResponse.accounts.find(acc => acc.email === activeUserEmail) 
              : accountsResponse.accounts[0]; // Or just take the first one
              
            if (account) {
              // Only update if we don't already have these values
              userData.publicKey = userData.publicKey || account.publicKey;
              userData.firstName = userData.firstName || account.firstName || account.name;
              
              console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found data in accounts list: firstName: ${userData.firstName}, publicKey: ${userData.publicKey?.substring(0, 8)}...`);
            }
          }
        } catch (err) {
          console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error getting accounts list:`, err);
        }
      }
      
      // If we found any data, return it
      if (userData.publicKey || userData.firstName) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Successfully found user data: publicKey: ${userData.publicKey?.substring(0, 8)}..., firstName: ${userData.firstName}`);
        return resolve(userData);
      }
      
      console.warn(`[DEBUG v${window.EXTENSION_VERSION}] Could not find user data in any storage location`);
      return resolve(defaultResult);
    } catch (error) {
      console.error(`[DEBUG v${window.EXTENSION_VERSION}] Error in getUserDIDAndName:`, error);
      return resolve(defaultResult);
    }
  });
}

// Handle copy DID button click
function handleCopyDid() {
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] handleCopyDid called`);
  
  // Always get fresh references to DOM elements
  if (!copyDidBtn) {
    copyDidBtn = document.querySelector('#copy-did-btn') || document.querySelector('.copy-did-btn');
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for copy button: ${copyDidBtn ? 'found' : 'not found'}`);
  }
  
  if (!copyDidBtn) {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] No copy button found to handle click`);
    return;
  }
  
  // Get the DID from the button's data attribute
  const didToCopy = copyDidBtn.dataset.did;
  if (!didToCopy) {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] No DID found in button data attribute, looking for alternatives...`);
    
    // Try to find it from the text element
    const didText = document.querySelector('.did-text');
    if (didText && didText.textContent && didText.textContent.trim() !== '') {
      // This might include "did:mata:" prefix and "..." in the middle
      // If we find those patterns, try to extract the full DID from DOM
      const didMatch = didText.textContent.match(/^did:mata:(.+)$/);
      if (didMatch) {
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found DID in text element, using that instead`);
        navigator.clipboard.writeText(didText.textContent).then(() => {
          showCopySuccess();
        }).catch(err => {
          console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not copy DID from text: `, err);
        });
        return;
      }
    }
    
    // If we get here, we couldn't find a valid DID to copy
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] No valid DID available yet to copy, checking for cached DID...`);
    
    // Try to get the cached DID from chrome.storage.local
    chrome.storage.local.get('mata_cache_did', function(result) {
      if (result.mata_cache_did) {
        // We found a cached DID, use that
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] Found cached DID, using that for copy operation`);
        navigator.clipboard.writeText(result.mata_cache_did).then(() => {
          showCopySuccess();
          
          // Also update the UI with the cached DID
          updateUserDid(result.mata_cache_did);
        }).catch(err => {
          console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not copy cached DID: `, err);
          showCopyMessage("Error copying DID");
        });
      } else {
        // No cached DID, try to load user identity
        console.log(`[DEBUG v${window.EXTENSION_VERSION}] No cached DID, trying to load user identity...`);
        
        // Try to load the user identity immediately to populate the DID
        loadUserIdentity().then(() => {
          // If the DID becomes available after loading, show a subtle indication instead of an error
          const didTextAfterLoad = document.querySelector('.did-text');
          if (didTextAfterLoad && didTextAfterLoad.textContent && didTextAfterLoad.textContent.includes('did:mata:')) {
            // Subtle indication that the DID is now available
            showCopyMessage("DID is now available");
          } else {
            // Still no DID, show subtle message without error
            showCopyMessage("DID not available yet");
          }
        });
      }
    });
    
    return;
  }
  
  console.log(`[DEBUG v${window.EXTENSION_VERSION}] Copying DID: ${didToCopy.substring(0, 15)}...`);
  
  // Get references to the icons if not already set
  if (!copyIcon || !checkIcon) {
    copyIcon = copyDidBtn.querySelector('.copy-icon');
    checkIcon = copyDidBtn.querySelector('.check-icon');
    
    // If we still can't find the icons, try alternative class names
    if (!copyIcon) {
      copyIcon = copyDidBtn.querySelector('svg:not(.check-icon)') || copyDidBtn.querySelector('svg:first-child');
    }
    
    if (!checkIcon) {
      checkIcon = copyDidBtn.querySelector('.hidden') || copyDidBtn.querySelector('svg:last-child');
    }
    
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Looking for icons: copyIcon=${!!copyIcon}, checkIcon=${!!checkIcon}`);
  }
  
  // Copy to clipboard
  navigator.clipboard.writeText(didToCopy).then(() => {
    showCopySuccess();
  }).catch(err => {
    console.error(`[DEBUG v${window.EXTENSION_VERSION}] Could not copy DID: `, err);
  });
  
  // Helper function to show success state
  function showCopySuccess() {
    // Show success state if we have the icons
    if (copyIcon && checkIcon) {
      // Handle both display:none/block and visibility:hidden/visible patterns
      if (checkIcon.classList.contains('hidden')) {
        copyIcon.classList.add('hidden');
        checkIcon.classList.remove('hidden');
      } else {
        copyIcon.style.display = 'none';
        checkIcon.style.display = 'block';
      }
      
      console.log(`[DEBUG v${window.EXTENSION_VERSION}] Showing success state for copy`);
      
      // Reset after 2 seconds
      setTimeout(() => {
        if (checkIcon.classList.contains('hidden') === false) {
          copyIcon.classList.remove('hidden');
          checkIcon.classList.add('hidden');
        } else {
          copyIcon.style.display = 'block';
          checkIcon.style.display = 'none';
        }
      }, 2000);
    } else {
      // If we don't have icon references, try changing the button text as fallback
      copyDidBtn.setAttribute('data-original-text', copyDidBtn.textContent || '');
      copyDidBtn.textContent = 'Copied!';
      
      // Reset after 2 seconds
      setTimeout(() => {
        const originalText = copyDidBtn.getAttribute('data-original-text');
        if (originalText) {
          copyDidBtn.textContent = originalText;
        }
      }, 2000);
    }
  }
  
  // Helper function to show informational messages instead of errors
  function showCopyMessage(message) {
    console.log(`[DEBUG v${window.EXTENSION_VERSION}] Showing copy message: ${message}`);
    
    // If we have a button but no icons yet, use text-based feedback
    if (copyDidBtn) {
      copyDidBtn.setAttribute('data-original-text', copyDidBtn.textContent || '');
      copyDidBtn.textContent = message;
      
      // Reset after 2 seconds
      setTimeout(() => {
        const originalText = copyDidBtn.getAttribute('data-original-text');
        if (originalText) {
          copyDidBtn.textContent = originalText;
        }
      }, 2000);
    }
    
    // Also try to indicate status in the DID display area if it exists
    const didText = document.querySelector('.did-text');
    if (didText && !didText.textContent.includes('did:mata:')) {
      const originalText = didText.textContent;
      const originalStyle = didText.style.color;
      
      // Apply a subtle style change to indicate status
      didText.textContent = message;
      didText.style.color = '#888'; // Light gray to indicate informational status
      
      // Reset after 2 seconds or when new data arrives
      setTimeout(() => {
        // Only reset if it still has our message (might have been updated by data loading)
        if (didText.textContent === message) {
          didText.textContent = originalText;
          didText.style.color = originalStyle;
        }
      }, 2000);
    }
  }
}