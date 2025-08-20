<script>
  import { onMount } from 'svelte';
  import { writable } from 'svelte/store';
  import { Download, X, Smartphone, Star, Shield, Zap } from 'lucide-svelte';

  export let autoShow = true;
  export let showDelay = 3000; // Show after 3 seconds
  export let dismissable = true;

  let showPrompt = false;
  let deferredPrompt = null;
  let isInstallable = false;
  let isIOS = false;
  let isStandalone = false;

  // Features to highlight
  const features = [
    { icon: Zap, text: 'Instant loading', desc: 'Lightning fast startup' },
    { icon: Shield, text: 'Offline access', desc: 'Work without internet' },
    { icon: Star, text: 'Native feel', desc: 'App-like experience' }
  ];

  onMount(() => {
    // Detect iOS
    isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    
    // Check if already installed
    isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.navigator.standalone === true;

    if (isStandalone) return; // Don't show if already installed

    // Listen for install prompt
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt = e;
      isInstallable = true;
      
      if (autoShow) {
        setTimeout(() => {
          showPrompt = true;
        }, showDelay);
      }
    });

    // Check if app was successfully installed
    window.addEventListener('appinstalled', () => {
      showPrompt = false;
      deferredPrompt = null;
      
      // Show success message
      showSuccessMessage();
    });

    // Auto-show for iOS users (can't detect install prompt)
    if (isIOS && autoShow && !isStandalone) {
      setTimeout(() => {
        showPrompt = true;
      }, showDelay);
    }
  });

  async function handleInstall() {
    if (!deferredPrompt && !isIOS) return;

    if (isIOS) {
      // Show iOS install instructions
      showIOSInstructions();
      return;
    }

    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        console.log('PWA install accepted');
      } else {
        console.log('PWA install dismissed');
      }
      
      deferredPrompt = null;
      showPrompt = false;
      
    } catch (error) {
      console.error('Install prompt failed:', error);
    }
  }

  function handleDismiss() {
    if (!dismissable) return;
    
    showPrompt = false;
    
    // Don't show again for 7 days (only in browser environment)
    if (typeof window !== 'undefined' && typeof localStorage !== 'undefined') {
      const dismissedUntil = Date.now() + (7 * 24 * 60 * 60 * 1000);
      localStorage.setItem('installPromptDismissed', dismissedUntil.toString());
    }
  }

  function showIOSInstructions() {
    const modal = document.createElement('div');
    modal.className = 'ios-install-modal';
    modal.innerHTML = `
      <div class="ios-install-content">
        <div class="ios-install-header">
          <h3>📱 Install NoteVault</h3>
          <button class="ios-close">×</button>
        </div>
        <div class="ios-install-body">
          <p>To install NoteVault on your iOS device:</p>
          <div class="ios-steps">
            <div class="ios-step">
              <div class="ios-step-number">1</div>
              <div class="ios-step-text">
                Tap the <strong>Share</strong> button 
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
                </svg>
              </div>
            </div>
            <div class="ios-step">
              <div class="ios-step-number">2</div>
              <div class="ios-step-text">Scroll down and tap <strong>"Add to Home Screen"</strong></div>
            </div>
            <div class="ios-step">
              <div class="ios-step-number">3</div>
              <div class="ios-step-text">Tap <strong>"Add"</strong> to confirm</div>
            </div>
          </div>
        </div>
      </div>
    `;

    modal.querySelector('.ios-close').onclick = () => {
      modal.remove();
      showPrompt = false;
    };

    document.body.appendChild(modal);
  }

  function showSuccessMessage() {
    const toast = document.createElement('div');
    toast.className = 'install-success-toast';
    toast.innerHTML = `
      <div class="toast-content">
        <span class="toast-icon">🎉</span>
        <span class="toast-text">NoteVault installed successfully!</span>
      </div>
    `;

    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-show');
    }, 100);

    setTimeout(() => {
      toast.classList.remove('toast-show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Check if dismissed recently
  function isDismissedRecently() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return false;
    }
    
    const dismissedUntil = localStorage.getItem('installPromptDismissed');
    if (!dismissedUntil) return false;
    
    return Date.now() < parseInt(dismissedUntil);
  }

  // Don't show if dismissed recently
  $: if (isDismissedRecently()) {
    showPrompt = false;
  }
</script>

{#if showPrompt && !isStandalone}
  <div class="install-prompt" class:ios={isIOS}>
    <div class="install-prompt-content">
      <!-- App Icon and Title -->
      <div class="install-header">
        <div class="install-icon">
          <img src="/icons/icon-72x72.png" alt="NoteVault" />
        </div>
        <div class="install-title">
          <h3>Install NoteVault</h3>
          <p>Get the full app experience</p>
        </div>
        {#if dismissable}
          <button class="install-dismiss" on:click={handleDismiss}>
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>

      <!-- Features -->
      <div class="install-features">
        {#each features as feature}
          <div class="feature-item">
            <svelte:component this={feature.icon} class="w-4 h-4" />
            <div class="feature-text">
              <span class="feature-title">{feature.text}</span>
              <span class="feature-desc">{feature.desc}</span>
            </div>
          </div>
        {/each}
      </div>

      <!-- Install Button -->
      <div class="install-actions">
        <button class="install-btn" on:click={handleInstall}>
          {#if isIOS}
            <Smartphone class="w-4 h-4" />
            <span>Install Instructions</span>
          {:else}
            <Download class="w-4 h-4" />
            <span>Install App</span>
          {/if}
        </button>
        
        {#if dismissable}
          <button class="install-later" on:click={handleDismiss}>
            Maybe later
          </button>
        {/if}
      </div>

      <!-- Benefits -->
      <div class="install-benefits">
        <p class="benefits-text">
          📱 Works offline • 🚀 Faster loading • 🔒 More secure • 📝 Better editing experience
        </p>
      </div>
    </div>
  </div>
{/if}

<style>
  .install-prompt {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -4px 20px rgba(0, 0, 0, 0.15);
    z-index: 1000;
    animation: slideUp 0.3s ease;
  }

  .install-prompt.ios {
    bottom: env(safe-area-inset-bottom, 0);
  }

  .install-prompt-content {
    padding: 1.5rem 1rem 1rem;
    max-width: 480px;
    margin: 0 auto;
  }

  .install-header {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .install-icon {
    flex-shrink: 0;
  }

  .install-icon img {
    width: 48px;
    height: 48px;
    border-radius: 12px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  }

  .install-title {
    flex: 1;
    min-width: 0;
  }

  .install-title h3 {
    font-size: 1.125rem;
    font-weight: 700;
    color: var(--color-text-primary);
    margin: 0 0 0.25rem 0;
  }

  .install-title p {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
    margin: 0;
  }

  .install-dismiss {
    flex-shrink: 0;
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 8px;
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .install-dismiss:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .install-features {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1.5rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .feature-item :global(svg) {
    color: var(--color-primary);
    flex-shrink: 0;
  }

  .feature-text {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .feature-title {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--color-text-primary);
  }

  .feature-desc {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
  }

  .install-actions {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .install-btn {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 1rem;
    border: none;
    border-radius: 0.75rem;
    background: var(--color-primary);
    color: white;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    min-height: 48px;
  }

  .install-btn:hover {
    background: var(--color-primary-hover);
    transform: translateY(-1px);
  }

  .install-later {
    padding: 1rem;
    border: none;
    border-radius: 0.75rem;
    background: transparent;
    color: var(--color-text-secondary);
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s ease;
    white-space: nowrap;
  }

  .install-later:hover {
    background: var(--color-bg-secondary);
    color: var(--color-text-primary);
  }

  .install-benefits {
    text-align: center;
    padding-top: 0.5rem;
    border-top: 1px solid var(--color-border);
  }

  .benefits-text {
    font-size: 0.75rem;
    color: var(--color-text-secondary);
    margin: 0;
    line-height: 1.4;
  }

  /* iOS Install Modal */
  :global(.ios-install-modal) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(4px);
    z-index: 2000;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1rem;
  }

  :global(.ios-install-content) {
    background: var(--color-bg-primary);
    border-radius: 1rem;
    max-width: 400px;
    width: 100%;
    max-height: 80vh;
    overflow-y: auto;
  }

  :global(.ios-install-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid var(--color-border);
  }

  :global(.ios-install-header h3) {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0;
    color: var(--color-text-primary);
  }

  :global(.ios-close) {
    width: 32px;
    height: 32px;
    border: none;
    border-radius: 50%;
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    font-size: 1.25rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.ios-install-body) {
    padding: 1.5rem;
  }

  :global(.ios-steps) {
    margin-top: 1rem;
  }

  :global(.ios-step) {
    display: flex;
    align-items: flex-start;
    gap: 1rem;
    margin-bottom: 1rem;
    padding: 1rem;
    background: var(--color-bg-secondary);
    border-radius: 0.75rem;
  }

  :global(.ios-step-number) {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: var(--color-primary);
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  :global(.ios-step-text) {
    font-size: 0.875rem;
    color: var(--color-text-primary);
    line-height: 1.5;
  }

  :global(.ios-step-text svg) {
    display: inline;
    margin: 0 0.25rem;
    vertical-align: -2px;
  }

  /* Success Toast */
  :global(.install-success-toast) {
    position: fixed;
    top: 2rem;
    left: 50%;
    transform: translateX(-50%) translateY(-100px);
    background: var(--color-success);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 0.75rem;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    z-index: 2000;
    opacity: 0;
    transition: all 0.3s ease;
  }

  :global(.install-success-toast.toast-show) {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }

  :global(.toast-content) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.toast-icon) {
    font-size: 1.25rem;
  }

  :global(.toast-text) {
    font-weight: 600;
    font-size: 0.875rem;
  }

  /* Animations */
  @keyframes slideUp {
    from {
      transform: translateY(100%);
      opacity: 0;
    }
    to {
      transform: translateY(0);
      opacity: 1;
    }
  }

  /* Mobile optimizations */
  @media (max-width: 480px) {
    .install-prompt-content {
      padding: 1rem;
    }

    .install-actions {
      flex-direction: column;
      gap: 0.75rem;
    }

    .install-later {
      padding: 0.75rem;
      text-align: center;
    }
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .install-prompt {
      border-top-color: #374151;
    }

    .install-icon img {
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
    }
  }
</style>