/**
 * NoteVault Service Worker
 * 
 * Provides offline functionality, background sync, push notifications,
 * and intelligent caching strategies for optimal performance.
 */

const CACHE_NAME = 'notevault-v1.0.0';
const RUNTIME_CACHE = 'notevault-runtime-v1.0.0';
const DATA_CACHE = 'notevault-data-v1.0.0';

// Assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/app.html',
  '/favicon.png',
  '/manifest.json',
  // Add more static assets as needed
];

// API endpoints to cache with different strategies
const API_CACHE_PATTERNS = {
  // Cache first - for user profile and settings
  cacheFirst: [
    /\/api\/auth\/me/,
    /\/api\/users\/\w+\/profile/,
    /\/api\/settings/
  ],
  // Network first - for real-time data
  networkFirst: [
    /\/api\/workspaces/,
    /\/api\/notes/,
    /\/api\/files/,
    /\/api\/chat/,
    /\/api\/analytics/
  ],
  // Stale while revalidate - for less critical data
  staleWhileRevalidate: [
    /\/api\/integrations/,
    /\/api\/bots/,
    /\/api\/webhooks/
  ]
};

// Install event - cache static assets
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        // Force activation of new service worker
        return self.skipWaiting();
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== RUNTIME_CACHE && 
                cacheName !== DATA_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        // Take control of all pages
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip cross-origin requests and non-GET requests for now
  if (url.origin !== location.origin || request.method !== 'GET') {
    return;
  }

  // Handle API requests with different strategies
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleAPIRequest(request));
    return;
  }

  // Handle static assets and pages
  event.respondWith(handleStaticRequest(request));
});

// API request handler with intelligent caching
async function handleAPIRequest(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Determine caching strategy
  let strategy = 'networkOnly';
  
  for (const [strategyName, patterns] of Object.entries(API_CACHE_PATTERNS)) {
    if (patterns.some(pattern => pattern.test(pathname))) {
      strategy = strategyName;
      break;
    }
  }

  switch (strategy) {
    case 'cacheFirst':
      return cacheFirst(request, DATA_CACHE);
    case 'networkFirst':
      return networkFirst(request, DATA_CACHE);
    case 'staleWhileRevalidate':
      return staleWhileRevalidate(request, DATA_CACHE);
    default:
      return networkOnly(request);
  }
}

// Static request handler
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  
  // For navigation requests, try network first, fallback to cache
  if (request.mode === 'navigate') {
    return networkFirst(request, CACHE_NAME, '/');
  }
  
  // For other static assets, use cache first
  return cacheFirst(request, CACHE_NAME);
}

// Caching strategies
async function cacheFirst(request, cacheName, fallbackUrl = null) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      // Update cache in background
      fetch(request).then(response => {
        if (response.status === 200) {
          cache.put(request, response.clone());
        }
      }).catch(() => {}); // Ignore fetch errors
      
      return cached;
    }
    
    const response = await fetch(request);
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    if (fallbackUrl) {
      const cache = await caches.open(cacheName);
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    throw error;
  }
}

async function networkFirst(request, cacheName, fallbackUrl = null) {
  try {
    const response = await fetch(request);
    
    if (response.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    
    throw error;
  }
}

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  // Start fetch in background
  const fetchPromise = fetch(request).then(response => {
    if (response.status === 200) {
      cache.put(request, response.clone());
    }
    return response;
  });
  
  // Return cached version immediately if available
  if (cached) {
    return cached;
  }
  
  // Otherwise wait for network
  return fetchPromise;
}

async function networkOnly(request) {
  return fetch(request);
}

// Background sync for offline actions
self.addEventListener('sync', event => {
  console.log('Background sync triggered:', event.tag);
  
  switch (event.tag) {
    case 'sync-offline-notes':
      event.waitUntil(syncOfflineNotes());
      break;
    case 'sync-offline-files':
      event.waitUntil(syncOfflineFiles());
      break;
    case 'sync-analytics':
      event.waitUntil(syncAnalytics());
      break;
  }
});

// Push notification handler
self.addEventListener('push', event => {
  console.log('Push message received');
  
  let notificationData = {
    title: 'NoteVault',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    requireInteraction: false,
    actions: []
  };

  if (event.data) {
    try {
      const data = event.data.json();
      notificationData = { ...notificationData, ...data };
    } catch (error) {
      console.error('Error parsing push data:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(notificationData.title, notificationData)
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('Notification clicked');
  
  event.notification.close();
  
  const { action, data } = event.notification;
  let url = '/';
  
  if (data && data.url) {
    url = data.url;
  } else if (action) {
    switch (action) {
      case 'view-note':
        url = data?.noteUrl || '/notes';
        break;
      case 'view-workspace':
        url = data?.workspaceUrl || '/workspaces';
        break;
      case 'view-file':
        url = data?.fileUrl || '/files';
        break;
    }
  }
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clientList => {
        // Focus existing window if available
        for (const client of clientList) {
          if (client.url.includes(url) && 'focus' in client) {
            return client.focus();
          }
        }
        
        // Open new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Share target handler
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  
  if (url.pathname === '/share' && event.request.method === 'POST') {
    event.respondWith(handleShareTarget(event.request));
  }
});

async function handleShareTarget(request) {
  try {
    const formData = await request.formData();
    const title = formData.get('title') || '';
    const text = formData.get('text') || '';
    const url = formData.get('url') || '';
    const files = formData.getAll('files');
    
    // Store shared data for the app to process
    const sharedData = {
      title,
      text,
      url,
      files: files.map(file => ({
        name: file.name,
        type: file.type,
        size: file.size
      })),
      timestamp: Date.now()
    };
    
    // Store in IndexedDB or send to main app
    await storeSharedData(sharedData);
    
    // Redirect to app with share intent
    return Response.redirect('/?share=true');
  } catch (error) {
    console.error('Error handling share target:', error);
    return Response.redirect('/');
  }
}

// Offline data sync functions
async function syncOfflineNotes() {
  console.log('Syncing offline notes...');
  
  try {
    const offlineNotes = await getOfflineData('notes');
    
    for (const note of offlineNotes) {
      try {
        const response = await fetch('/api/notes', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(note)
        });
        
        if (response.ok) {
          await removeOfflineData('notes', note.id);
          console.log('Synced offline note:', note.id);
        }
      } catch (error) {
        console.error('Failed to sync note:', note.id, error);
      }
    }
  } catch (error) {
    console.error('Error syncing offline notes:', error);
  }
}

async function syncOfflineFiles() {
  console.log('Syncing offline files...');
  // Implementation would handle file uploads
}

async function syncAnalytics() {
  console.log('Syncing analytics data...');
  
  try {
    const analyticsData = await getOfflineData('analytics');
    
    if (analyticsData.length > 0) {
      await fetch('/api/analytics/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analyticsData)
      });
      
      await clearOfflineData('analytics');
    }
  } catch (error) {
    console.error('Error syncing analytics:', error);
  }
}

// Utility functions for offline data management
async function getOfflineData(type) {
  // This would typically use IndexedDB
  return [];
}

async function removeOfflineData(type, id) {
  // Remove specific item from offline storage
}

async function clearOfflineData(type) {
  // Clear all offline data of specific type
}

async function storeSharedData(data) {
  // Store shared data for the app to process
  try {
    const cache = await caches.open(DATA_CACHE);
    const response = new Response(JSON.stringify(data));
    await cache.put('/shared-data', response);
  } catch (error) {
    console.error('Error storing shared data:', error);
  }
}

// Message handler for communication with main app
self.addEventListener('message', event => {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
    case 'GET_VERSION':
      event.ports[0].postMessage({ version: CACHE_NAME });
      break;
    case 'CLEAR_CACHE':
      clearAllCaches().then(() => {
        event.ports[0].postMessage({ success: true });
      });
      break;
    case 'REGISTER_SYNC':
      self.registration.sync.register(payload.tag);
      break;
  }
});

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
}

console.log('NoteVault Service Worker loaded successfully');