/**
 * Enhanced PWA Features for Mobile Experience
 * 
 * Provides mobile-specific enhancements using modern web APIs
 * to bridge the gap between PWA and native app experience.
 */

class EnhancedPWA {
  constructor() {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      this.isSupported = this.getDefaultSupport();
      return;
    }
    
    this.isSupported = this.checkSupport();
    this.init();
  }

  /**
   * Get default support object for server-side rendering
   */
  getDefaultSupport() {
    return {
      vibration: false,
      webShare: false,
      speechRecognition: false,
      getUserMedia: false,
      backgroundFetch: false,
      webPush: false,
      paymentRequest: false,
      webBluetooth: false,
      wakeLock: false
    };
  }

  /**
   * Check browser support for enhanced PWA features
   */
  checkSupport() {
    // Additional safety check (should not be needed due to constructor check)
    if (typeof window === 'undefined' || typeof navigator === 'undefined') {
      return this.getDefaultSupport();
    }

    return {
      vibration: 'vibrate' in navigator,
      webShare: 'share' in navigator,
      speechRecognition: 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window,
      getUserMedia: 'mediaDevices' in navigator && 'getUserMedia' in navigator.mediaDevices,
      backgroundFetch: 'serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype,
      webPush: 'PushManager' in window,
      paymentRequest: 'PaymentRequest' in window,
      webBluetooth: 'bluetooth' in navigator,
      wakeLock: 'wakeLock' in navigator
    };
  }

  /**
   * Initialize enhanced PWA features
   */
  async init() {
    if (typeof window === 'undefined') return;

    // Initialize supported features
    if (this.isSupported.vibration) this.initHapticFeedback();
    if (this.isSupported.webShare) this.initAdvancedSharing();
    if (this.isSupported.speechRecognition) this.initVoiceInput();
    if (this.isSupported.getUserMedia) this.initCameraIntegration();
    if (this.isSupported.wakeLock) this.initWakeLock();

    // Register for advanced notifications
    this.initAdvancedNotifications();

    console.log('Enhanced PWA initialized with support:', this.isSupported);
  }

  /**
   * Haptic feedback for mobile interactions
   */
  initHapticFeedback() {
    this.haptic = {
      light: () => navigator.vibrate && navigator.vibrate(10),
      medium: () => navigator.vibrate && navigator.vibrate(20),
      heavy: () => navigator.vibrate && navigator.vibrate(50),
      success: () => navigator.vibrate && navigator.vibrate([100, 30, 100]),
      warning: () => navigator.vibrate && navigator.vibrate([50, 25, 50, 25, 50]),
      error: () => navigator.vibrate && navigator.vibrate([300])
    };
  }

  /**
   * Advanced sharing capabilities
   */
  initAdvancedSharing() {
    this.sharing = {
      shareNote: async (note) => {
        if (!navigator.share) return false;

        try {
          await navigator.share({
            title: note.title,
            text: note.content,
            url: window.location.origin + `/notes/${note.id}`
          });
          return true;
        } catch (error) {
          console.log('Share cancelled or failed:', error);
          return false;
        }
      },

      shareWorkspace: async (workspace) => {
        if (!navigator.share) return false;

        try {
          await navigator.share({
            title: `${workspace.name} - NoteVault Workspace`,
            text: workspace.description,
            url: window.location.origin + `/workspaces/${workspace.id}`
          });
          return true;
        } catch (error) {
          console.log('Share cancelled or failed:', error);
          return false;
        }
      },

      shareFile: async (file, content) => {
        if (!navigator.share) return false;

        try {
          const filesArray = [new File([content], file.name, { type: file.type })];
          await navigator.share({
            title: `${file.name} - NoteVault File`,
            files: filesArray
          });
          return true;
        } catch (error) {
          console.log('File share failed:', error);
          return false;
        }
      }
    };
  }

  /**
   * Voice input integration
   */
  initVoiceInput() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    this.voiceInput = {
      recognition: null,
      isListening: false,

      start: (callback, options = {}) => {
        if (this.voiceInput.isListening) return;

        this.voiceInput.recognition = new SpeechRecognition();
        this.voiceInput.recognition.continuous = options.continuous || false;
        this.voiceInput.recognition.interimResults = options.interimResults || true;
        this.voiceInput.recognition.lang = options.lang || 'en-US';

        this.voiceInput.recognition.onstart = () => {
          this.voiceInput.isListening = true;
          this.haptic?.light();
          callback({ type: 'start' });
        };

        this.voiceInput.recognition.onresult = (event) => {
          const results = Array.from(event.results);
          const transcript = results
            .map(result => result[0].transcript)
            .join('');
          
          const isFinal = results[results.length - 1].isFinal;
          
          callback({
            type: 'result',
            transcript,
            isFinal,
            confidence: results[results.length - 1][0].confidence
          });
        };

        this.voiceInput.recognition.onerror = (error) => {
          this.voiceInput.isListening = false;
          this.haptic?.error();
          callback({ type: 'error', error: error.error });
        };

        this.voiceInput.recognition.onend = () => {
          this.voiceInput.isListening = false;
          this.haptic?.light();
          callback({ type: 'end' });
        };

        this.voiceInput.recognition.start();
      },

      stop: () => {
        if (this.voiceInput.recognition && this.voiceInput.isListening) {
          this.voiceInput.recognition.stop();
        }
      }
    };
  }

  /**
   * Camera integration for document capture
   */
  initCameraIntegration() {
    this.camera = {
      captureImage: async (options = {}) => {
        try {
          const constraints = {
            video: {
              facingMode: options.facingMode || 'environment',
              width: { ideal: options.width || 1920 },
              height: { ideal: options.height || 1080 }
            }
          };

          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          return stream;
        } catch (error) {
          console.error('Camera access failed:', error);
          throw error;
        }
      },

      captureDocument: async () => {
        // Enhanced document capture with auto-cropping hints
        return this.camera.captureImage({
          facingMode: 'environment',
          width: 1920,
          height: 1080
        });
      },

      capturePhoto: async () => {
        // Standard photo capture
        return this.camera.captureImage({
          facingMode: 'user',
          width: 1280,
          height: 720
        });
      }
    };
  }

  /**
   * Wake lock to prevent screen sleep during long editing sessions
   */
  initWakeLock() {
    this.wakeLock = {
      lock: null,

      request: async () => {
        if (!('wakeLock' in navigator)) return false;

        try {
          this.wakeLock.lock = await navigator.wakeLock.request('screen');
          console.log('Screen wake lock acquired');
          return true;
        } catch (error) {
          console.error('Wake lock request failed:', error);
          return false;
        }
      },

      release: async () => {
        if (this.wakeLock.lock) {
          await this.wakeLock.lock.release();
          this.wakeLock.lock = null;
          console.log('Screen wake lock released');
        }
      }
    };

    // Auto-release on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && this.wakeLock.lock === null) {
        // Optionally re-request wake lock when returning to app
      }
    });
  }

  /**
   * Advanced notification features
   */
  async initAdvancedNotifications() {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;

    this.notifications = {
      permission: Notification.permission,

      requestPermission: async () => {
        if (Notification.permission === 'granted') return true;
        
        const permission = await Notification.requestPermission();
        this.notifications.permission = permission;
        return permission === 'granted';
      },

      showRichNotification: async (title, options = {}) => {
        if (!await this.notifications.requestPermission()) return false;

        const defaultOptions = {
          icon: '/icons/icon-192x192.png',
          badge: '/icons/badge-72x72.png',
          vibrate: [200, 100, 200],
          requireInteraction: false,
          ...options
        };

        // Use service worker for rich notifications
        if ('serviceWorker' in navigator) {
          const registration = await navigator.serviceWorker.ready;
          return registration.showNotification(title, defaultOptions);
        } else {
          return new Notification(title, defaultOptions);
        }
      },

      showProgress: async (title, progress, total) => {
        const percentage = Math.round((progress / total) * 100);
        return this.notifications.showRichNotification(title, {
          body: `${percentage}% complete`,
          progress: percentage,
          tag: 'progress',
          renotify: true
        });
      }
    };
  }

  /**
   * Mobile-specific gesture handlers
   */
  initGestureHandlers() {
    this.gestures = {
      // Double-tap to create note
      doubleTap: (element, callback) => {
        let lastTap = 0;
        element.addEventListener('touchstart', (e) => {
          const currentTime = new Date().getTime();
          const tapLength = currentTime - lastTap;
          
          if (tapLength < 500 && tapLength > 0) {
            e.preventDefault();
            this.haptic?.medium();
            callback(e);
          }
          lastTap = currentTime;
        });
      },

      // Long press for context menu
      longPress: (element, callback, duration = 500) => {
        let pressTimer;
        
        element.addEventListener('touchstart', (e) => {
          pressTimer = setTimeout(() => {
            this.haptic?.heavy();
            callback(e);
          }, duration);
        });

        element.addEventListener('touchend', () => {
          clearTimeout(pressTimer);
        });

        element.addEventListener('touchmove', () => {
          clearTimeout(pressTimer);
        });
      },

      // Swipe gestures
      swipe: (element, callbacks = {}) => {
        let startX, startY, distX, distY, startTime;
        const threshold = 100; // minimum distance
        const restraint = 100; // maximum perpendicular distance
        const allowedTime = 300; // maximum time allowed

        element.addEventListener('touchstart', (e) => {
          const touchobj = e.changedTouches[0];
          startX = touchobj.pageX;
          startY = touchobj.pageY;
          startTime = new Date().getTime();
        });

        element.addEventListener('touchend', (e) => {
          const touchobj = e.changedTouches[0];
          distX = touchobj.pageX - startX;
          distY = touchobj.pageY - startY;
          const elapsedTime = new Date().getTime() - startTime;

          if (elapsedTime <= allowedTime) {
            if (Math.abs(distX) >= threshold && Math.abs(distY) <= restraint) {
              this.haptic?.light();
              if (distX > 0 && callbacks.right) callbacks.right(e);
              else if (distX < 0 && callbacks.left) callbacks.left(e);
            } else if (Math.abs(distY) >= threshold && Math.abs(distX) <= restraint) {
              this.haptic?.light();
              if (distY < 0 && callbacks.up) callbacks.up(e);
              else if (distY > 0 && callbacks.down) callbacks.down(e);
            }
          }
        });
      }
    };
  }

  /**
   * Install prompt management
   */
  initInstallPrompt() {
    let deferredPrompt;

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      
      // Show custom install UI
      this.showInstallBanner();
    });

    this.installPrompt = {
      show: async () => {
        if (!deferredPrompt) return false;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        
        if (outcome === 'accepted') {
          this.haptic?.success();
        }
        
        deferredPrompt = null;
        return outcome === 'accepted';
      }
    };
  }

  /**
   * Show install banner
   */
  showInstallBanner() {
    // Create and show install banner UI
    const banner = document.createElement('div');
    banner.className = 'install-banner';
    banner.innerHTML = `
      <div class="install-banner-content">
        <span>📱 Install NoteVault for a better experience</span>
        <button class="install-btn">Install</button>
        <button class="dismiss-btn">×</button>
      </div>
    `;

    banner.querySelector('.install-btn').onclick = () => {
      this.installPrompt.show();
      banner.remove();
    };

    banner.querySelector('.dismiss-btn').onclick = () => {
      banner.remove();
    };

    document.body.appendChild(banner);

    // Auto-hide after 10 seconds
    setTimeout(() => {
      if (document.body.contains(banner)) {
        banner.remove();
      }
    }, 10000);
  }
}

// Initialize enhanced PWA (constructor handles SSR gracefully)
const enhancedPWA = new EnhancedPWA();

// Export both the instance and the class
export default enhancedPWA;
export { EnhancedPWA };