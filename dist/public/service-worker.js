// Service Worker for MATA Application
// Handles caching strategy and offline support

const CACHE_NAME = 'mata-app-v5';

// Application shell assets that should be cached for offline use
// Extended to include more assets for complete offline experience
const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/icon16.png',
  '/icon32.png',
  '/icon48.png',
  '/icon128.png',
  '/icon192.png',
  '/icon512.png',
  '/mata_auth_wasm.js',
  '/mata_auth_wasm_bg.wasm',
  '/offline.html',
  '/auth',
  '/dashboard',
  '/settings',
  '/wallet',
  '/account'
];

// Install event - cache the app shell for offline use
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing Service Worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching App Shell');
      return cache.addAll(APP_SHELL);
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating Service Worker...');
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== CACHE_NAME) {
          console.log('[Service Worker] Removing old cache', key);
          return caches.delete(key);
        }
      }));
    })
  );
  return self.clients.claim();
});

// Cache strategy: Network first, falling back to cache
// Critical for a vault application where latest data is important
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  
  // Skip cross-origin requests
  if (url.origin !== self.location.origin) {
    return;
  }
  
  // Skip any non-GET requests - only GET can be cached
  if (event.request.method !== 'GET') {
    // Skip HEAD requests - they can't be cached
    return;
  }
  
  // Handle API requests (GET only) - stale-while-revalidate strategy
  if (url.pathname.startsWith('/api')) {
    if (event.request.method === 'GET') {
      event.respondWith(
        caches.open(CACHE_NAME).then((cache) => {
          return fetch(event.request)
            .then((response) => {
              if (response.ok) {
                // Clone the response as it can only be consumed once
                const responseToCache = response.clone();
                cache.put(event.request, responseToCache);
              }
              return response;
            })
            .catch(() => {
              return cache.match(event.request)
                .then((cachedResponse) => {
                  if (cachedResponse) {
                    // Add a custom header to indicate this is from cache
                    const offlineResponse = new Response(
                      cachedResponse.body, 
                      { 
                        status: 200, 
                        headers: {
                          ...Object.fromEntries(cachedResponse.headers.entries()),
                          'X-MATA-Offline': 'true',
                          'Content-Type': 'application/json'
                        } 
                      }
                    );
                    return offlineResponse;
                  }
                  // Return empty array for collection endpoints when offline
                  if (url.pathname.includes('/api/bank-accounts') || 
                      url.pathname.includes('/api/bank-transactions')) {
                    return new Response(
                      JSON.stringify([]), 
                      { 
                        status: 200, 
                        headers: {
                          'Content-Type': 'application/json',
                          'X-MATA-Offline': 'true'
                        } 
                      }
                    );
                  }
                  
                  // Return offline indicator for user endpoint
                  if (url.pathname.includes('/api/user')) {
                    return new Response(
                      JSON.stringify({ offline: true }), 
                      { 
                        status: 200, 
                        headers: {
                          'Content-Type': 'application/json',
                          'X-MATA-Offline': 'true'
                        } 
                      }
                    );
                  }
                  
                  return null;
                });
            });
        })
      );
      return;
    }
  }
  
  // Special handling for manifest.json - always try network first
  if (url.pathname.endsWith('/manifest.json')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache successful response
          if (response && response.status === 200) {
            const responseToCache = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return response;
        })
        .catch(() => {
          // Fall back to cache if network fails
          return caches.match(event.request);
        })
    );
    return;
  }

  // For non-API requests, use a cache-first strategy
  // This ensures WASM files and other assets load quickly offline
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Return cached response immediately
        return cachedResponse;
      }
      
      // Otherwise, try the network
      return fetch(event.request)
        .then((response) => {
          // Only cache valid responses
          if (!response || response.status !== 200 || response.type !== 'basic' || event.request.method !== 'GET') {
            return response;
          }
          
          // Cache the response for future use
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // For navigation requests, return the main app shell (index.html)
          // This will load the app and then the offline indicator will show
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html').then(response => {
              if (response) {
                // Clone the response and add an offline header
                const offlineResponse = new Response(
                  response.body,
                  {
                    status: 200,
                    headers: {
                      ...Object.fromEntries(response.headers.entries()),
                      'X-MATA-Offline': 'true'
                    }
                  }
                );
                return offlineResponse;
              }
              return null;
            });
          }
          
          // Return null for other failed requests
          return null;
        });
    })
  );
});

// Handle messages from the client
self.addEventListener('message', (event) => {
  // Handle offline operation queueing
  if (event.data && event.data.type === 'QUEUE_OFFLINE_OPERATION') {
    console.log('[Service Worker] Queued offline operation:', event.data.operation);
    // In a real implementation, we might store this in IndexedDB
    // For now, we'll just acknowledge receipt
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'OFFLINE_OPERATION_QUEUED',
          operationId: `${event.data.operation.clientId}-${event.data.operation.queuedAt}`
        });
      });
    });
  }
});

// Handle background sync events
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-sync') {
    console.log('[Service Worker] Attempting background sync');
    event.waitUntil(syncOfflineOperations());
  }
});

// Function to process queued operations
async function syncOfflineOperations() {
  console.log('[Service Worker] Processing offline operations');
  // In a real implementation, we would:
  // 1. Retrieve operations from IndexedDB
  // 2. Process them in order
  // 3. Notify clients of completion
  
  // For now, just notify that we attempted sync
  self.clients.matchAll().then(clients => {
    clients.forEach(client => {
      client.postMessage({
        type: 'OFFLINE_SYNC_ATTEMPTED',
        success: true
      });
    });
  });
}