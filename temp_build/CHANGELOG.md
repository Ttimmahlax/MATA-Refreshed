# MATA Extension Changelog

## Version 1.6.5 - March 31, 2025

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