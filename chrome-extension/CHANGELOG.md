# MATA Extension Changelog

## Version 1.7.1 - April 12, 2025

### Storage Verification Enhancement
- Fixed "Storage verification failed: test data not found" errors by improving storage test logic
- Enhanced storage verification to continue operation even if the storage test has false negatives
- Improved diagnostic data collection for more accurate storage status reporting
- Added additional recovery mechanisms for extension verification checks
- Increased reliability of chrome.storage.local testing with more robust error handling

## Version 1.7.0 - April 10, 2025

### Enhanced User Isolation and Data Security
- Completely removed "first available user" fallback to prevent accidental data leakage
- Enhanced strict user isolation by removing automatic account selection in all scenarios
- Fixed potential privacy vulnerability where extension could show data from a different user
- Improved user switching security by enforcing explicit user selection
- Added detailed logging for available accounts without auto-selection for better diagnostics

## Version 1.6.9 - April 5, 2025

### Synchronization Reliability Improvements
- Enhanced version numbering for better tracking and compatibility
- Improved build process for more consistent extension package generation
- Added additional user login event listener for more reliable data synchronization
- Enhanced sync processes for better consistency across multiple user accounts
- Fixed edge cases in multi-user account handling

## Version 1.6.8 - April 5, 2025

### User Login Event Synchronization Enhancement
- Added dedicated event listener for 'user_login' events to ensure extension refreshes when a user logs in with a new account
- Implemented immediate data synchronization when login events are detected to ensure consistent data between web app and extension
- Enhanced user experience by automatically refreshing extension data after login operations
- Added double-sync pattern (immediate + delayed) to capture all localStorage changes during login process
- Improved multi-user experience by properly handling account switching events

### Identity Data Persistence and Caching Enhancements
- Implemented fast-path loading of user identity data through chrome.storage.local caching
- Added dedicated cache keys (mata_cache_did, mata_cache_firstname) for rapid identity data access
- Enhanced DID copy functionality to check cached keys when direct DID access isn't available
- Improved persistence of user identity information between popup sessions
- Added automatic caching of discovered identity data for future access
- Prioritized cached identity data over slower discovery methods for better performance
- Enhanced UI responsiveness by displaying cached identity data immediately at startup

## Version 1.6.7 - April 4, 2025

### DID Copy Button Error Handling Enhancements
- Fixed "No DID found to copy" error when clicking the copy button before DID is loaded
- Added elegant handling for missing DID data with informative feedback instead of errors
- Enhanced copy button to automatically try loading the DID if not initially available
- Improved visual feedback with status messages to indicate when DID becomes available
- Added graceful degradation when DID is not yet loaded without showing error messages

## Version 1.6.7 - April 3, 2025

### Performance Optimization and Recovery Timing Improvements
- Reduced critical recovery timing delays to improve responsiveness:
  - Context invalidation recovery: 1000ms → 500ms
  - Connection reestablishment: 500ms → 300ms  
  - Post-reconnection sync delay: 1000ms → 500ms
  - Page initialization sync: 1000ms → 500ms
- Enhanced recovery responsiveness for faster extension functionality restoration
- Improved synchronization timing for better performance under high-load conditions
- Optimized error detection and recovery processes to minimize user-visible disruptions

## Version 1.6.7 - April 2, 2025

### Strict User Isolation Enhancements
- Implemented robust user isolation for preventing cross-account data leakage
- Enhanced user identity retrieval to strictly respect active_user from chrome.storage.local
- Improved account list handling to prioritize active user data
- Fixed race conditions that could lead to different user's data being displayed
- Added isActive flag to account objects for better user context awareness
- Enhanced consistent prioritization of the active user across all components
- Improved storage key management to maintain strict separation between users

## Version 1.6.7 - April 1, 2025

### Enhanced User Identity Display and Security Status Improvements
- Fixed DID display and copy functionality in extension UI
- Enhanced security status element in footer to reliably show user's first name
- Improved robustness of getUserDIDAndName function with multiple fallback approaches
- Added better DOM element creation when UI elements are missing
- Fixed handling of various data formats and storage key patterns
- Improved copyDidBtn functionality with more reliable feedback

## Version 1.6.7 - March 31, 2025

### Security Status Element Fixes and User Identity Display Improvements
- Fixed critical issue with security status element not being found in the footer
- Improved updateFooterWithFirstName function with more reliable element selection
- Enhanced element reference handling to avoid stale DOM references
- Fixed inconsistent selectors between different parts of the code (.security-status vs .security-status span)
- Added additional validation for DID and name display to prevent UI inconsistencies
- Enhanced error recovery for handling missing or corrupted identity data
- Improved synchronization of identity information between web app and extension
- Fixed edge cases in user identity lookup process
- Enhanced compatibility with different data storage formats
- Added more comprehensive logging for troubleshooting identity display issues

### Account Data Retrieval Enhancements
- Fixed LIST_ACCOUNTS handler returning empty accounts array
- Implemented comprehensive user account discovery from multiple storage locations
- Added intelligent user identity extraction from various data formats
- Enhanced email recovery from sanitized storage keys
- Improved account data representation with consistent firstName and publicKey fields
- Added parallel account processing for better performance
- Enhanced error handling for account retrieval failures

## Version 1.6.6 - March 31, 2025

### Enhanced User Identity (DID and Name) Display
- Implemented comprehensive `getUserDIDAndName()` function to search across all possible storage locations
- Added new `loadUserIdentity()` function with multiple approaches for finding and displaying identity data
- Improved the `updateUserDid()` function with more robust element handling and error recovery
- Enhanced `updateFooterWithFirstName()` function with better error handling and reference tracking
- Added eager loading of user identity data at extension popup startup
- Updated `loadAllData()` to prioritize loading identity information first
- Added detailed logging for better debugging of identity display issues
- Improved handling of various data formats for DID and firstName fields

## Version 1.6.5 - March 31, 2025

### Simplified Data Retrieval Implementation
- Added new dedicated simplified retrieval functions for critical data access
- Implemented robust fallback system for active user detection
- Created simplified storage access module (simplifiedGetUserData.js) for reliability
- Reduced complexity of getUserData() and getActiveUserEmail() implementations
- Fixed complex dependency chains that were causing context invalidation failures
- Added better prioritization of chrome.storage.local over localStorage with clear separation
- Enhanced data retrieval with minimal dependencies on service worker

### Enhanced Navigation-based Synchronization
- Added page navigation detection via history API monitoring (pushState, replaceState, popstate)
- Implemented automatic synchronization on Single Page Application (SPA) route changes
- Fixed synchronization failures between page transitions in the web application
- Enhanced resilience during navigation events to ensure consistent data availability
- Maintained existing timing-based sync intervals for comprehensive coverage
- Improved web app detection markers for more reliable extension verification

### Improved Storage Access Reliability
- Modified popup.js to prioritize chrome.storage.local over localStorage for critical data access
- Fixed "No active user found" and "All attempts to get salt failed" errors in popup initialization
- Optimized data retrieval sequence to check all possible storage locations in order of reliability
- Enhanced error handling with more informative debugging messages
- Improved fallback mechanisms for users with restricted localStorage access

## Version 1.6.4 - March 31, 2025

### Critical Fixes for Service Worker Termination
- Fixed "Extension context invalidated" errors that occur when Chrome terminates the service worker
- Added enhanced context validation checks to detect invalid runtime before communication attempts
- Implemented automatic recovery mechanisms when context invalidation is detected
- Added multiple fallback paths for critical data access when background script isn't available
- Reduced heartbeat interval from 25 to 15 seconds to keep service worker alive longer
- Added periodic context validation check every 10 seconds to detect and recover from termination early
- Enhanced error reporting with specific error codes for better diagnostics
- Improved synchronization between localStorage and chrome.storage to ensure data consistency

### Performance Improvements
- Added direct content script data access for critical encryption keys to bypass background script
- Enhanced window cache to store frequently accessed data for improved performance
- Improved data structure handling for nested objects and array data types
- Added recovery attempt tracking for diagnostic purposes
- Enhanced error logging with more detailed context information
- Improved extension marker handling for better web app detection

## Version 1.6.3 - March 30, 2025

### Bug Fixes
- Fixed inconsistent storage synchronization between web app and extension
- Improved error handling for database access operations
- Enhanced recovery mechanisms for service worker termination
- Fixed issues with data availability after Chrome restarts the extension

## Version 1.6.0 - March 29, 2025

### User Interface Enhancements
- Added direct chrome.storage access for user DID and firstName display
- Improved popup initialization with prioritized chrome.storage access
- Added fallback mechanisms for retrieving user identity information
- Enhanced DID display with robust error handling and format standardization
- Optimized data loading sequence to reduce unnecessary synchronization

### Enhanced Data Backup and Recovery
- Added comprehensive multi-user IndexedDB backup functionality
- Implemented intelligent backup sizing with metadata-only options for large stores
- Added automatic user detection and prioritization for backup operations
- Implemented record filtering to ensure user-specific data privacy
- Added storage quota monitoring and management
- Enhanced backup reliability with sequential processing and error recovery

### Web App Connectivity Improvements
- Added FIND_MATA_TABS message type and handler for reliable tab detection
- Implemented isWebAppAvailable function in popup.js using the new message handler
- Fixed popup.js active user email retrieval by properly detecting MATA web app tabs
- Improved error handling during web app availability checks
- Enhanced service worker messaging with additional handlers

### Critical Service Worker Compatibility Updates
- Fixed service worker compatibility issues for Manifest V3
- Replaced window references with self for service worker context
- Enhanced global object detection in emailUtils.js and versionConfig.js
- Improved DOM marker injection with robust fallback mechanisms
- Added context detection code to support both service worker and browser environments
- Fixed initialization sequence for service worker lifecycles

## Version 1.5.81 - March 29, 2025

### Major Improvements
- Fixed critical communication issues between extension and web app
- Enhanced data synchronization between localStorage and chrome.storage
- Improved error handling and recovery mechanisms
- Added detailed logging for troubleshooting
- Updated URL patterns to work with all Replit.app domains
- Fixed various edge case bugs related to storage initialization
- Added comprehensive documentation for architecture and troubleshooting

### Bug Fixes
- Fixed "Receiving end does not exist" errors in message passing
- Resolved email sanitization inconsistencies for storage keys
- Fixed version reference errors in various components
- Enhanced fallback mechanisms when web app is not available
- Added multiple retry attempts for communication failures
- Improved data format handling to ensure consistency
- Fixed edge cases in user identification and selection
- Resolved storage synchronization timing issues

### New Features
- Added bidirectional communication through SET_LOCAL_STORAGE_VALUE handlers
- Enhanced export/import functionality for more reliable backups
- Added robust storage comparison tool for identifying synchronization issues
- Implemented graceful degradation for standalone mode operation
- Added storage format normalization to handle legacy data formats
- Enhanced error reporting and diagnostic tools
- Added automatic recovery from communication failures

### Technical Improvements
- Converted critical modules from ES modules to regular scripts for better compatibility
- Fixed global variable access issues across extension components
- Enhanced initialization sequence for more reliable startup
- Fixed timing issues in content script injection
- Improved detection of available web app tabs
- Enhanced handling of multi-user environments
- Implemented safer email sanitization for storage keys
- Added exponential backoff with jitter for communication retries
- Improved version detection and consistency across components

## Previous Versions

### Version 1.5.80 - March 15, 2025
- Initial implementation of the dual storage architecture
- Added web app communication bridge
- Implemented basic sync functionality
- Created extension popup interface with password, contact, and bank account management

### Version 1.5.79 - March 1, 2025
- Basic extension framework established
- Implemented content script injection
- Created background script with basic functionality
- Added manifest v3 support