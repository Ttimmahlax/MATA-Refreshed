# Service Worker Compatibility Guide for MATA Extension

## Background

Chrome extensions using Manifest V3 run background scripts as service workers rather than as persistent background pages. This change requires modifications to code that previously relied on browser-specific objects like `window`.

## Key Differences in Service Worker Environment

1. **No `window` object**: Service workers run in a different context than normal browser windows and don't have access to `window`.
2. **Use `self` instead**: In service workers, the global object is referenced via `self` instead of `window`.
3. **Limited DOM access**: Service workers can't directly access the DOM.
4. **No direct access to `document`**: The `document` object is not available in service workers.
5. **Different lifecycle**: Service workers can be terminated and restarted by the browser at any time.

## Fixes Implemented

### Global Context Detection

Throughout the codebase, we've implemented context detection to ensure compatibility across environments:

```javascript
(typeof self !== 'undefined' ? self : (typeof window !== 'undefined' ? window : this))
```

This pattern checks first for `self` (service worker), then falls back to `window` (browser context), and finally to `this` as a last resort.

### Updated Files

1. **emailUtils.js**: 
   - Changed global variable bindings from `window.*` to the context detection pattern above
   - Ensures email sanitization works in all environments

2. **versionConfig.js** and **versionConfig.browser.js**: 
   - Updated global object detection for version information
   - Added multi-context support for version access

3. **contentScript.js**:
   - Enhanced marker injection function with robust DOM readiness checks
   - Added retry mechanisms for when the DOM is not immediately available
   - Implemented better error handling for DOM operations

### Enhanced Message Handling

For service worker communication, we've improved the message handling system:

- Added `FIND_MATA_TABS` message type to reliably detect MATA web app tabs from the service worker
- Implemented specialized tab detection in background.js using the `findMataTabs` function from mataConfig.js
- Added proper response handling with error management for all message types
- Ensured all message handlers return promises that properly resolve, even during service worker termination
- Added robust error handling throughout the message passing system

### DOM Operations

For content scripts that need to manipulate the DOM:

- Added explicit checks for document readiness
- Implemented retry mechanisms with `DOMContentLoaded` event listeners
- Added fallback with `setTimeout` for cases where DOM elements might be created dynamically
- Enhanced error handling for failed DOM operations

## Testing Recommendations

When testing the extension, verify these scenarios:

1. Extension installation in Chrome with Manifest V3 support
2. Extension functionality after a browser restart
3. Extension behavior when multiple MATA web app tabs are open
4. Extension synchronization after service worker termination and restart
5. Proper handling of critical encryption files in all scenarios
6. Popup functionality when no MATA web app tabs are open
7. Real-time detection of MATA web app tabs being opened or closed
8. Proper retrieval of active user email via the new isWebAppAvailable function
9. Message handling reliability during rapid tab switching
10. Recovery behavior when network errors or timeouts occur during message passing

## Future Considerations

- Keep monitoring Chrome's Service Worker implementation for changes
- Consider using more modern APIs like the Storage Access API for more robust data handling
- Implement more sophisticated lifecycle management for service worker termination/restart scenarios
- Implement a standardized message passing protocol with typed responses
- Add periodic tab detection to handle cases where MATA web app tabs are opened after extension initialization
- Consider implementing a shared worker for additional reliability during service worker termination
- Enhance error reporting and telemetry for better debugging of service worker issues
- Add automated testing for service worker compatibility scenarios