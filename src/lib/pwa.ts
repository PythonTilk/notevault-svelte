/**
 * PWA (Progressive Web App) Utilities
 * 
 * Handles service worker registration, offline storage,
 * background sync, and push notifications.
 */

import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// PWA state stores
export const isOnline = writable(true);
export const isInstallable = writable(false);
export const isInstalled = writable(false);
export const swRegistration = writable<ServiceWorkerRegistration | null>(null);
export const updateAvailable = writable(false);

// PWA installation prompt
let deferredPrompt: any = null;

/**
 * Initialize PWA functionality
 */
export async function initializePWA() {
  if (!browser || !('serviceWorker' in navigator)) {
    console.log('PWA not supported in this environment');
    return;
  }

  // Register service worker
  await registerServiceWorker();
  
  // Set up offline detection
  setupOfflineDetection();
  
  // Set up install prompt handling
  setupInstallPrompt();
  
  // Set up background sync
  setupBackgroundSync();
  
  // Check if already installed
  checkInstallationStatus();
  
  console.log('PWA initialized successfully');
}

/**
 * Register service worker
 */
async function registerServiceWorker() {
  try {
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    swRegistration.set(registration);
    
    // Check for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            updateAvailable.set(true);
            console.log('New service worker available');
          }
        });
      }
    });
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', handleServiceWorkerMessage);
    
    console.log('Service worker registered successfully');
  } catch (error) {
    console.error('Service worker registration failed:', error);
  }
}

/**
 * Handle messages from service worker
 */
function handleServiceWorkerMessage(event: MessageEvent) {
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SYNC_COMPLETE':
      console.log('Background sync completed:', payload);
      break;
    case 'CACHE_UPDATED':
      console.log('Cache updated:', payload);
      break;
  }
}

/**
 * Set up offline detection
 */
function setupOfflineDetection() {
  function updateOnlineStatus() {
    isOnline.set(navigator.onLine);
  }
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  updateOnlineStatus();
}

/**
 * Set up install prompt handling
 */
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    isInstallable.set(true);
    console.log('PWA install prompt available');
  });
  
  window.addEventListener('appinstalled', () => {
    isInstalled.set(true);
    isInstallable.set(false);
    deferredPrompt = null;
    console.log('PWA installed successfully');
  });
}

/**
 * Set up background sync
 */
function setupBackgroundSync() {
  if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
    console.log('Background sync supported');
  }
}

/**
 * Check if PWA is already installed
 */
function checkInstallationStatus() {
  // Check display mode
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
  const isFullscreen = window.matchMedia('(display-mode: fullscreen)').matches;
  
  if (isStandalone || isFullscreen) {
    isInstalled.set(true);
  }
}

/**
 * Trigger PWA installation
 */
export async function installPWA(): Promise<boolean> {
  if (!deferredPrompt) {
    console.log('No install prompt available');
    return false;
  }
  
  try {
    deferredPrompt.prompt();
    const result = await deferredPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      console.log('User accepted PWA installation');
      isInstallable.set(false);
      deferredPrompt = null;
      return true;
    } else {
      console.log('User declined PWA installation');
      return false;
    }
  } catch (error) {
    console.error('Error during PWA installation:', error);
    return false;
  }
}

/**
 * Update service worker
 */
export async function updateServiceWorker() {
  const registration = await navigator.serviceWorker.getRegistration();
  if (registration?.waiting) {
    registration.waiting.postMessage({ type: 'SKIP_WAITING' });
    window.location.reload();
  }
}

/**
 * Offline Storage Management
 */
export class OfflineStorage {
  private dbName = 'notevault-offline';
  private version = 1;
  private db: IDBDatabase | null = null;

  async init() {
    if (!browser || !('indexedDB' in window)) {
      throw new Error('IndexedDB not supported');
    }

    return new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores
        if (!db.objectStoreNames.contains('notes')) {
          const notesStore = db.createObjectStore('notes', { keyPath: 'id' });
          notesStore.createIndex('workspace', 'workspaceId', { unique: false });
          notesStore.createIndex('modified', 'lastModified', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('files')) {
          const filesStore = db.createObjectStore('files', { keyPath: 'id' });
          filesStore.createIndex('workspace', 'workspaceId', { unique: false });
        }
        
        if (!db.objectStoreNames.contains('analytics')) {
          db.createObjectStore('analytics', { keyPath: 'id', autoIncrement: true });
        }
        
        if (!db.objectStoreNames.contains('sync-queue')) {
          const syncStore = db.createObjectStore('sync-queue', { keyPath: 'id', autoIncrement: true });
          syncStore.createIndex('type', 'type', { unique: false });
          syncStore.createIndex('timestamp', 'timestamp', { unique: false });
        }
      };
    });
  }

  async storeNote(note: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['notes'], 'readwrite');
    const store = transaction.objectStore('notes');
    
    await store.put({
      ...note,
      lastModified: Date.now(),
      offline: true
    });
  }

  async getNotes(workspaceId?: string) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['notes'], 'readonly');
    const store = transaction.objectStore('notes');
    
    if (workspaceId) {
      const index = store.index('workspace');
      return await this.getAllFromIndex(index, workspaceId);
    }
    
    return await this.getAll(store);
  }

  async storeFile(file: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['files'], 'readwrite');
    const store = transaction.objectStore('files');
    
    await store.put({
      ...file,
      lastModified: Date.now(),
      offline: true
    });
  }

  async queueSync(type: string, data: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    
    await store.add({
      type,
      data,
      timestamp: Date.now(),
      retries: 0
    });
  }

  async getSyncQueue() {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sync-queue'], 'readonly');
    const store = transaction.objectStore('sync-queue');
    
    return await this.getAll(store);
  }

  async removeSyncItem(id: number) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['sync-queue'], 'readwrite');
    const store = transaction.objectStore('sync-queue');
    
    await store.delete(id);
  }

  async trackAnalytics(event: any) {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['analytics'], 'readwrite');
    const store = transaction.objectStore('analytics');
    
    await store.add({
      ...event,
      timestamp: Date.now()
    });
  }

  private getAll(store: IDBObjectStore): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  private getAllFromIndex(index: IDBIndex, key: any): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const request = index.getAll(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}

/**
 * Background Sync Manager
 */
export class BackgroundSyncManager {
  private storage = new OfflineStorage();

  async registerSync(tag: string) {
    if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
    }
  }

  async syncOfflineData() {
    const queue = await this.storage.getSyncQueue();
    
    for (const item of queue) {
      try {
        await this.processSyncItem(item);
        await this.storage.removeSyncItem(item.id);
      } catch (error) {
        console.error('Sync failed for item:', item.id, error);
        // Could implement retry logic here
      }
    }
  }

  private async processSyncItem(item: any) {
    switch (item.type) {
      case 'note':
        await this.syncNote(item.data);
        break;
      case 'file':
        await this.syncFile(item.data);
        break;
      case 'analytics':
        await this.syncAnalytics(item.data);
        break;
    }
  }

  private async syncNote(noteData: any) {
    const response = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(noteData)
    });
    
    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status}`);
    }
  }

  private async syncFile(fileData: any) {
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('metadata', JSON.stringify(fileData.metadata));
    
    const response = await fetch('/api/files/upload', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      throw new Error(`File sync failed: ${response.status}`);
    }
  }

  private async syncAnalytics(analyticsData: any) {
    const response = await fetch('/api/analytics/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(analyticsData)
    });
    
    if (!response.ok) {
      throw new Error(`Analytics sync failed: ${response.status}`);
    }
  }
}

/**
 * Push Notification Manager
 */
export class PushNotificationManager {
  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }

  async subscribeToPush(): Promise<PushSubscription | null> {
    const registration = await navigator.serviceWorker.ready;
    
    try {
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(
          process.env.PUBLIC_VAPID_KEY || ''
        )
      });
      
      // Send subscription to server
      await this.sendSubscriptionToServer(subscription);
      
      return subscription;
    } catch (error) {
      console.error('Error subscribing to push notifications:', error);
      return null;
    }
  }

  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  private async sendSubscriptionToServer(subscription: PushSubscription) {
    await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription)
    });
  }
}

// Create global instances
export const offlineStorage = new OfflineStorage();
export const backgroundSync = new BackgroundSyncManager();
export const pushNotifications = new PushNotificationManager();