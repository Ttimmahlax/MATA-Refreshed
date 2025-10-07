// MATA Key Manager Extension - Popup Script v1.0.7

document.addEventListener('DOMContentLoaded', initialize);

// DOM Elements
let accountsList;
let bankAccountsList;
let passwordsList;
let contactsList;
let totalBalanceDisplay;
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
  
  // Attempt to get the active user email
  activeUserEmail = await getActiveUserEmail();
  console.log('Initial activeUserEmail check:', activeUserEmail);
  
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
  testConnectionBtn = document.getElementById('test-connection-btn');
  testStorageBtn = document.getElementById('test-storage-btn');
  testSyncBtn = document.getElementById('test-sync-btn');
  refreshStorageBtn = document.getElementById('refresh-storage-btn');
  runSyncBtn = document.getElementById('run-sync-btn');
  testResultsDiv = document.getElementById('test-results');
  localStorageKeysList = document.getElementById('localStorage-keys');
  chromeStorageKeysList = document.getElementById('chrome-storage-keys');
  comparisonDetailsContent = document.getElementById('comparison-details-content');
  statusMessage = document.getElementById('status-message');
  
  // Set up sidebar navigation
  setupSidebarNavigation();
  
  // Set up event listeners for UI interaction
  setupEventListeners();
  
  // Update version display
  const versionEl = document.querySelector('.version');
  if (versionEl) {
    versionEl.textContent = `v${chrome.runtime.getManifest().version}`;
  }
  
  // Add extension ID display for easy reference during development
  const footerEl = document.querySelector('footer');
  if (footerEl) {
    const idElement = document.createElement('div');
    idElement.className = 'extension-id';
    idElement.textContent = `Extension ID: ${chrome.runtime.id}`;
    footerEl.appendChild(idElement);
  }
  
  // Set up button click handlers
  if (exportKeysBtn) {
    exportKeysBtn.addEventListener('click', handleExportKeys);
  }
  
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
  if (testConnectionBtn) {
    testConnectionBtn.addEventListener('click', handleTestConnection);
  }
  
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

// Get the active user email from storage
async function getActiveUserEmail() {
  try {
    // First try to get from chrome.storage
    const lastActiveEmailKey = 'mata_active_user';
    const result = await new Promise(resolve => {
      chrome.storage.local.get(lastActiveEmailKey, (result) => {
        resolve(result[lastActiveEmailKey] || null);
      });
    });
    
    if (result) {
      console.log('Found active user in chrome.storage:', result);
      return result;
    }
    
    // If not found in chrome.storage, try to get accounts and use the first one
    const response = await sendMessageToBackground({ type: 'LIST_ACCOUNTS' });
    if (response && response.success && response.accounts && response.accounts.length > 0) {
      const email = response.accounts[0].email;
      console.log('Using first account as active user:', email);
      
      // Save this as the active user for next time
      chrome.storage.local.set({ [lastActiveEmailKey]: email });
      return email;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting active user email:', error);
    return null;
  }
}

// Load all data for the new UI tabs
async function loadAllData() {
  try {
    // Show loading state
    showLoadingState();
    
    // If we don't have an active user email yet, try to get it
    if (!activeUserEmail) {
      activeUserEmail = await getActiveUserEmail();
      console.log('Active user email for data loading:', activeUserEmail);
    }
    
    // Check if we have a valid email before proceeding
    if (!activeUserEmail) {
      console.error('No active user email available. Cannot load data.');
      showNoUserState();
      return;
    }
    
    // Request data from background script for all three sections
    const [bankAccountsResponse, passwordsResponse, contactsResponse] = await Promise.all([
      sendMessageToBackground({ type: 'GET_BANK_ACCOUNTS', email: activeUserEmail }),
      sendMessageToBackground({ type: 'GET_PASSWORDS', email: activeUserEmail }),
      sendMessageToBackground({ type: 'GET_CONTACTS', email: activeUserEmail })
    ]);
    
    // Process bank accounts data
    if (bankAccountsResponse && bankAccountsResponse.success) {
      bankAccounts = bankAccountsResponse.accounts || [];
      renderBankAccounts(bankAccounts);
      updateBankAccountsSummary();
    }
    
    // Process passwords data
    if (passwordsResponse && passwordsResponse.success) {
      passwords = passwordsResponse.passwords || [];
      renderPasswords(passwords);
    }
    
    // Process contacts data
    if (contactsResponse && contactsResponse.success) {
      contacts = contactsResponse.contacts || [];
      renderContacts(contacts);
    }
    
    // Hide loading state
    hideLoadingState();
    
  } catch (error) {
    console.error('Error loading data:', error);
    showErrorState(error.message);
  }
}

// Show state when no user is logged in
function showNoUserState() {
  const noUserHtml = `
    <div class="no-user-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
        <circle cx="12" cy="7" r="4"></circle>
      </svg>
      <h3>No User Account Found</h3>
      <p>Please log in to MATA web application first to access your data.</p>
      <button class="open-mata-btn">Open MATA Web App</button>
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
    btn.addEventListener('click', () => {
      chrome.tabs.create({ url: 'https://matav3.replit.app' });
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
  const errorHtml = `
    <div class="error-state">
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="12"></line>
        <line x1="12" y1="16" x2="12.01" y2="16"></line>
      </svg>
      <p>Error loading data: ${message}</p>
      <button class="retry-btn">Retry</button>
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
    
    // Display accounts or show empty state
    if (accounts.length === 0) {
      showEmptyState();
    } else {
      renderAccounts(accounts);
    }
    
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
  accountsList.innerHTML = `
    <div class="empty-state">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="icon">
        <circle cx="12" cy="12" r="10"></circle>
        <path d="M12 8v4"></path>
        <path d="M12 16h.01"></path>
      </svg>
      <p class="empty-state-text">No accounts found</p>
    </div>
  `;
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
  
  if (accounts.length === 0) {
    bankAccountsList.innerHTML = `
      <div class="empty-state">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="2" y="5" width="20" height="14" rx="2"></rect>
          <line x1="2" y1="10" x2="22" y2="10"></line>
        </svg>
        <p>No bank accounts found</p>
      </div>
    `;
    return;
  }
  
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
  
  if (passwords.length === 0) {
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
  
  passwords.forEach(password => {
    const passwordElement = document.createElement('div');
    passwordElement.className = 'password-card';
    
    // Format the last updated date
    const formattedDate = new Date(password.lastUpdated).toLocaleDateString();
    
    // Get the favicon for the website
    const faviconUrl = getFaviconUrl(password.website);
    
    passwordElement.innerHTML = `
      <div class="password-header">
        <div class="password-site">
          <img src="${faviconUrl}" alt="${password.name}" class="site-favicon">
          <span class="site-name">${password.name}</span>
        </div>
        <div class="password-strength ${password.strength || 'medium'}">
          <span class="strength-badge">${password.strength || 'medium'}</span>
        </div>
      </div>
      <div class="password-details">
        <div class="password-username">${password.username}</div>
        <div class="password-website">${password.website || ''}</div>
      </div>
      <div class="password-actions">
        <button class="copy-username-btn" data-username="${password.username}" title="Copy Username">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
          </svg>
        </button>
        <button class="copy-password-btn" data-id="${password.id}" title="Copy Password">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
          </svg>
        </button>
        <button class="view-password-btn" data-id="${password.id}" title="View Password">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
      </div>
    `;
    
    // Add event listeners for actions
    passwordElement.querySelector('.copy-username-btn').addEventListener('click', (e) => {
      const username = e.currentTarget.getAttribute('data-username');
      copyToClipboard(username);
    });
    
    passwordElement.querySelector('.copy-password-btn').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      copyPasswordToClipboard(id);
    });
    
    passwordElement.querySelector('.view-password-btn').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      viewPassword(id);
    });
    
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
  
  const filteredPasswords = passwords.filter(p => 
    p.name.toLowerCase().includes(searchTerm) || 
    p.username.toLowerCase().includes(searchTerm) || 
    (p.website && p.website.toLowerCase().includes(searchTerm))
  );
  
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
  
  const filteredPasswords = passwords.filter(p => 
    p.name.toLowerCase().includes(searchTerm) || 
    p.username.toLowerCase().includes(searchTerm) || 
    (p.website && p.website.toLowerCase().includes(searchTerm))
  ).slice(0, 5); // Show only top 5 results
  
  if (filteredPasswords.length === 0) {
    quickPasswordResults.innerHTML = `
      <div class="no-results">No passwords found</div>
    `;
    return;
  }
  
  quickPasswordResults.innerHTML = '';
  
  filteredPasswords.forEach(password => {
    const passwordElement = document.createElement('div');
    passwordElement.className = 'quick-password-item';
    
    // Get the favicon for the website
    const faviconUrl = getFaviconUrl(password.website);
    
    passwordElement.innerHTML = `
      <div class="password-item-info">
        <img src="${faviconUrl}" alt="${password.name}" class="site-favicon">
        <div class="password-item-details">
          <div class="password-item-name">${password.name}</div>
          <div class="password-item-username">${password.username}</div>
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
    passwordElement.querySelector('.copy-password-btn').addEventListener('click', (e) => {
      const id = e.currentTarget.getAttribute('data-id');
      copyPasswordToClipboard(id);
    });
    
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
    const password = passwords.find(p => p.id === passwordId);
    
    if (!password) {
      throw new Error('Password not found');
    }
    
    // In a real implementation, we would request the decrypted password
    // from the background script for security reasons
    const response = await sendMessageToBackground({
      type: 'GET_PASSWORD',
      id: passwordId
    });
    
    if (!response.success) {
      throw new Error(response.error || 'Failed to retrieve password');
    }
    
    // Copy to clipboard
    await copyToClipboard(response.password);
    
  } catch (error) {
    console.error('Error copying password:', error);
    alert(`Error: ${error.message}`);
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
  
  if (contacts.length === 0) {
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
  
  contacts.forEach(contact => {
    const contactElement = document.createElement('div');
    contactElement.className = 'contact-card';
    
    // Get initials for avatar if no image provided
    const initials = getInitials(contact.name);
    
    contactElement.innerHTML = `
      <div class="contact-avatar">
        ${contact.avatar 
          ? `<img src="${contact.avatar}" alt="${contact.name}" class="avatar-img">`
          : `<div class="avatar-initial">${initials}</div>`
        }
      </div>
      <div class="contact-details">
        <div class="contact-name">${contact.name}</div>
        <div class="contact-info">
          ${contact.email ? `<div class="contact-email">${contact.email}</div>` : ''}
          ${contact.phone ? `<div class="contact-phone">${contact.phone}</div>` : ''}
        </div>
      </div>
      <div class="contact-actions">
        <button class="contact-action-btn" data-id="${contact.id}" data-action="view" title="View Contact">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
            <circle cx="12" cy="12" r="3"></circle>
          </svg>
        </button>
        ${contact.email ? `
          <button class="contact-action-btn" data-email="${contact.email}" data-action="email" title="Send Email">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
            </svg>
          </button>
        ` : ''}
        ${contact.phone ? `
          <button class="contact-action-btn" data-phone="${contact.phone}" data-action="call" title="Call">
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
        openEmailClient(email);
      });
    }
    
    const callBtn = contactElement.querySelector('[data-action="call"]');
    if (callBtn) {
      callBtn.addEventListener('click', (e) => {
        const phone = e.currentTarget.getAttribute('data-phone');
        openPhoneClient(phone);
      });
    }
    
    contactsList.appendChild(contactElement);
  });
}

// Handle contact search
function handleContactSearch(e) {
  const searchTerm = e.target.value.toLowerCase();
  
  const filteredContacts = contacts.filter(c => 
    c.name.toLowerCase().includes(searchTerm) || 
    (c.email && c.email.toLowerCase().includes(searchTerm)) || 
    (c.phone && c.phone.toLowerCase().includes(searchTerm)) ||
    (c.company && c.company.toLowerCase().includes(searchTerm))
  );
  
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
  alert("Import functionality will allow users to import previously exported keys");
  // In a real implementation, this would:
  // 1. Ask the user to select a file
  // 2. Ask for the password used to encrypt it
  // 3. Decrypt the data
  // 4. Store in extension storage
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
        // Check if a tab with our app is open
        const tabs = await chrome.tabs.query({
          url: [
            "*://matav3.replit.app/*",
            "*://*.replit.app/*"
          ]
        });
        
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
  // Check if we have a valid email before making the request
  if (!activeUserEmail) {
    console.error('Cannot refresh bank accounts: No active user email');
    alert('Please log in to MATA web application first to access your data.');
    return;
  }

  const spinner = document.createElement('div');
  spinner.className = 'spinner-overlay';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  sendMessageToBackground({ type: 'GET_BANK_ACCOUNTS', email: activeUserEmail, refresh: true })
    .then(response => {
      if (response && response.success) {
        bankAccounts = response.accounts || [];
        renderBankAccounts(bankAccounts);
        updateBankAccountsSummary();
      }
    })
    .catch(error => {
      console.error('Error refreshing bank accounts:', error);
      showErrorState('Failed to refresh bank accounts: ' + error.message);
    })
    .finally(() => {
      document.body.removeChild(spinner);
    });
}

function refreshPasswords() {
  // Check if we have a valid email before making the request
  if (!activeUserEmail) {
    console.error('Cannot refresh passwords: No active user email');
    alert('Please log in to MATA web application first to access your data.');
    return;
  }

  const spinner = document.createElement('div');
  spinner.className = 'spinner-overlay';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  sendMessageToBackground({ type: 'GET_PASSWORDS', email: activeUserEmail, refresh: true })
    .then(response => {
      if (response && response.success) {
        passwords = response.passwords || [];
        renderPasswords(passwords);
      }
    })
    .catch(error => {
      console.error('Error refreshing passwords:', error);
      showErrorState('Failed to refresh passwords: ' + error.message);
    })
    .finally(() => {
      document.body.removeChild(spinner);
    });
}

function refreshContacts() {
  // Check if we have a valid email before making the request
  if (!activeUserEmail) {
    console.error('Cannot refresh contacts: No active user email');
    alert('Please log in to MATA web application first to access your data.');
    return;
  }

  const spinner = document.createElement('div');
  spinner.className = 'spinner-overlay';
  spinner.innerHTML = '<div class="spinner"></div>';
  document.body.appendChild(spinner);
  
  sendMessageToBackground({ type: 'GET_CONTACTS', email: activeUserEmail, refresh: true })
    .then(response => {
      if (response && response.success) {
        contacts = response.contacts || [];
        renderContacts(contacts);
      }
    })
    .catch(error => {
      console.error('Error refreshing contacts:', error);
      showErrorState('Failed to refresh contacts: ' + error.message);
    })
    .finally(() => {
      document.body.removeChild(spinner);
    });
}

// Handle adding new items
function handleAddPassword() {
  // This would show a modal to add a new password
  console.log('Add new password');
  alert('Add new password functionality will be implemented here');
}

function handleAddContact() {
  // This would show a modal to add a new contact
  console.log('Add new contact');
  alert('Add new contact functionality will be implemented here');
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

// Handle export keys
function handleExportKeys() {
  // This would show a modal to export keys
  console.log('Export keys');
  alert('Export keys functionality will be implemented here');
}

// Handle download extension
function handleDownloadExtension() {
  // This would redirect to download the extension
  console.log('Download extension');
  chrome.tabs.create({ url: 'https://matav3.replit.app/download-extension' });
}

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        console.error('Error communicating with background script:', chrome.runtime.lastError);
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

// Handle test storage button click
async function handleTestStorage() {
  if (!testResultsDiv) return;
  
  testResultsDiv.innerHTML = `
    <div class="test-running">
      <div class="spinner"></div>
      <p>Testing storage...</p>
    </div>
  `;
  
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
      testResultsDiv.innerHTML = `
        <div class="test-success">
          <h4>Storage Test: ✅ Success</h4>
          <p>Successfully stored and retrieved test data:</p>
          <pre>${JSON.stringify(response, null, 2)}</pre>
          <p>Extension ID: ${chrome.runtime.id}</p>
        </div>
      `;
    } else {
      testResultsDiv.innerHTML = `
        <div class="test-error">
          <h4>Storage Test: ❌ Failed</h4>
          <p>Failed to test storage functionality.</p>
          <p>Error: ${response ? response.error : 'Unknown error'}</p>
        </div>
      `;
    }
  } catch (error) {
    testResultsDiv.innerHTML = `
      <div class="test-error">
        <h4>Storage Test Failed</h4>
        <p>${error.message}</p>
      </div>
    `;
  }
}

// Handle sync now button click
async function handleSyncNow() {
  try {
    if (testResultsDiv) {
      testResultsDiv.innerHTML = `
        <div class="test-running">
          <div class="spinner"></div>
          <p>Synchronizing storage...</p>
        </div>
      `;
    }

    // Run sync between localStorage and chrome.storage
    const response = await sendMessageToBackground({ 
      type: 'SYNC_STORAGE'
    });
    
    if (response && response.success) {
      if (testResultsDiv) {
        testResultsDiv.innerHTML = `
          <div class="test-success">
            <h4>Sync Complete: ✅ Success</h4>
            <p>Successfully synchronized ${response.syncedCount || 0} keys.</p>
            <p>Time: ${new Date().toLocaleTimeString()}</p>
          </div>
        `;
      }
      
      // Refresh the storage comparison display
      loadStorageComparison();
    } else {
      if (testResultsDiv) {
        testResultsDiv.innerHTML = `
          <div class="test-error">
            <h4>Sync Failed: ❌ Error</h4>
            <p>${response && response.error ? response.error : 'Unknown error'}</p>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error syncing storage:', error);
    if (testResultsDiv) {
      testResultsDiv.innerHTML = `
        <div class="test-error">
          <h4>Sync Failed: ❌ Error</h4>
          <p>${error.message}</p>
        </div>
      `;
    }
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

// Send message to background script
function sendMessageToBackground(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, response => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}