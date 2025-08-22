<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { authStore, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { showCreateWorkspaceModal } from '$lib/stores/modals';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import CreateWorkspaceModal from '$lib/components/CreateWorkspaceModal.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';
  import { initializePWA, isOnline, isInstallable, updateAvailable, installPWA, updateServiceWorker } from '$lib/pwa';
  import InstallPrompt from '$lib/components/mobile/InstallPrompt.svelte';
  import enhancedPWA from '$lib/mobile/enhanced-pwa.js';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  
  // Command Palette state
  let showCommandPalette = false;

  // UI state for command palette functions
  let currentZoomLevel = 1.0;
  let sidebarVisible = true;
  let rightPanelVisible = false;
  let focusModeActive = false;

  onMount(async () => {
    authStore.checkAuth();
    
    if (browser) {
      // Initialize PWA functionality
      await initializePWA();
      setupPWAUI();
      
      // Initialize enhanced PWA features
      enhancedPWA.init();
      
      // Load saved zoom level
      const savedZoom = localStorage.getItem('notevault-zoom-level');
      if (savedZoom) {
        currentZoomLevel = parseFloat(savedZoom);
        applyZoom();
      }
      
      // Load UI state
      loadUIState();
    }
  });

  function setupPWAUI() {
    // Install banner handlers
    const installBanner = document.getElementById('pwa-install-banner');
    const installButton = document.getElementById('pwa-install-button');
    const installDismiss = document.getElementById('pwa-install-dismiss');

    if (installButton) {
      installButton.addEventListener('click', async () => {
        const success = await installPWA();
        if (success && installBanner) {
          installBanner.style.display = 'none';
        }
      });
    }

    if (installDismiss) {
      installDismiss.addEventListener('click', () => {
        if (installBanner) {
          installBanner.style.display = 'none';
        }
      });
    }

    // Update notification handler
    const updateButton = document.getElementById('update-button');
    if (updateButton) {
      updateButton.addEventListener('click', async () => {
        await updateServiceWorker();
      });
    }

    // Show/hide UI based on PWA state
    isInstallable.subscribe(installable => {
      if (installBanner) {
        installBanner.style.display = installable ? 'block' : 'none';
      }
    });

    isOnline.subscribe(online => {
      const offlineIndicator = document.getElementById('offline-indicator');
      if (offlineIndicator) {
        offlineIndicator.style.display = online ? 'none' : 'block';
      }
    });

    updateAvailable.subscribe(available => {
      const updateNotification = document.getElementById('update-available');
      if (updateNotification) {
        updateNotification.style.display = available ? 'block' : 'none';
      }
    });
  }
  
  function applyZoom() {
    if (!browser) return;
    
    document.documentElement.style.zoom = currentZoomLevel;
    
    // Save zoom level
    try {
      localStorage.setItem('notevault-zoom-level', currentZoomLevel.toString());
    } catch (e) {
      console.warn('Failed to save zoom level:', e);
    }
    
    // Show zoom indicator temporarily
    showZoomIndicator();
    
    // Dispatch zoom event for components that need it
    window.dispatchEvent(new CustomEvent('zoom-changed', { 
      detail: { level: currentZoomLevel } 
    }));
  }

  function showZoomIndicator() {
    // Create or update zoom indicator
    let indicator = document.querySelector('.zoom-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.className = 'zoom-indicator';
      document.body.appendChild(indicator);
    }
    
    const percentage = Math.round(currentZoomLevel * 100);
    indicator.textContent = `Zoom: ${percentage}%`;
    indicator.classList.add('show');
    
    // Hide after 2 seconds
    setTimeout(() => {
      indicator?.classList.remove('show');
    }, 2000);
  }

  function loadUIState() {
    if (!browser) return;
    
    try {
      const uiState = localStorage.getItem('notevault-ui-state');
      if (uiState) {
        const state = JSON.parse(uiState);
        sidebarVisible = state.sidebarVisible !== false; // default to true
        rightPanelVisible = state.rightPanelVisible || false;
        focusModeActive = state.focusModeActive || false;
      }
    } catch (e) {
      console.warn('Failed to load UI state:', e);
    }
  }

  function saveUIState() {
    if (!browser) return;
    
    try {
      const state = {
        sidebarVisible,
        rightPanelVisible,
        focusModeActive
      };
      localStorage.setItem('notevault-ui-state', JSON.stringify(state));
    } catch (e) {
      console.warn('Failed to save UI state:', e);
    }
  }

  // Auto-save UI state when it changes
  $: if (browser && (sidebarVisible !== undefined || rightPanelVisible !== undefined || focusModeActive !== undefined)) {
    saveUIState();
  }

  function handleCommandExecuted(event) {
    const { command } = event.detail;
    
    switch (command) {
      // Navigation commands
      case 'go-to-dashboard':
      case 'go-to-home':
        goto('/');
        break;
      case 'go-to-workspaces':
        goto('/');
        break;
      case 'go-to-chat':
        goto('/chat');
        break;
      case 'go-to-files':
        goto('/files');
        break;
      case 'go-to-calendar':
        goto('/calendar');
        break;
      case 'go-to-notifications':
        goto('/notifications');
        break;
      case 'go-to-admin':
        goto('/admin');
        break;
      
      // Action commands
      case 'new-workspace':
        showCreateWorkspaceModal.set(true);
        break;
      case 'new-note':
        goto('/?action=create-note');
        break;
      case 'upload-file':
        goto('/files?action=upload');
        break;
      case 'schedule-meeting':
        goto('/calendar?action=create-event');
        break;
        
      // Search commands
      case 'search-notes':
      case 'search-everything':
        goto('/search');
        break;
      case 'find-workspace':
        goto('/search?type=workspaces');
        break;
      case 'find-files':
        goto('/search?type=files');
        break;
      
      // Settings commands
      case 'open-settings':
        goto('/settings');
        break;
      case 'open-integrations':
        goto('/settings/integrations');
        break;
      case 'change-theme':
        goto('/settings?tab=appearance');
        break;
      case 'change-preferences':
        goto('/settings?tab=preferences');
        break;
        
      // UI commands
      case 'toggle-sidebar':
        sidebarVisible = !sidebarVisible;
        window.dispatchEvent(new CustomEvent('toggle-sidebar', { detail: { visible: sidebarVisible } }));
        break;
      case 'toggle-right-panel':
        rightPanelVisible = !rightPanelVisible;
        window.dispatchEvent(new CustomEvent('toggle-right-panel', { detail: { visible: rightPanelVisible } }));
        break;
      case 'focus-mode':
        focusModeActive = !focusModeActive;
        window.dispatchEvent(new CustomEvent('toggle-focus-mode', { detail: { active: focusModeActive } }));
        break;

      // Zoom commands
      case 'zoom-in':
        currentZoomLevel = Math.min(currentZoomLevel + 0.1, 3.0);
        applyZoom();
        break;
      case 'zoom-out':
        currentZoomLevel = Math.max(currentZoomLevel - 0.1, 0.5);
        applyZoom();
        break;
      case 'zoom-reset':
        currentZoomLevel = 1.0;
        applyZoom();
        break;
        
      // Help commands
      case 'show-help':
        window.open('https://docs.notevault.com', '_blank');
        break;
      case 'show-shortcuts':
        goto('/settings?tab=shortcuts');
        break;
      case 'show-about':
        goto('/settings?tab=about');
        break;
        
      default:
        console.log('Command not implemented:', command);
    }
  }

  $: {
    if (!$isLoading && !$isAuthenticated && !publicRoutes.includes($page.url.pathname)) {
      goto('/login');
    }
  }
</script>

<svelte:head>
  <title>NoteVault - Collaborative Workspace Platform</title>
  <meta name="description" content="A modern collaborative workspace platform with canvas notes, real-time chat, and file management." />
</svelte:head>

{#if $isLoading}
  <!-- Loading screen -->
  <div class="min-h-screen bg-dark-950 flex items-center justify-center">
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
        <span class="text-white font-bold text-xl">NV</span>
      </div>
      <div class="animate-pulse">
        <div class="h-2 bg-dark-800 rounded-full w-32 mx-auto"></div>
      </div>
    </div>
  </div>
{:else if $isAuthenticated}
  <!-- Authenticated layout with sidebar -->
  <div class="flex h-screen {focusModeActive ? 'focus-mode' : ''}">
    <Sidebar 
      bind:visible={sidebarVisible}
      {focusModeActive}
    />
    
    <main class="flex-1 flex flex-col min-h-0 overflow-hidden {focusModeActive ? 'focus-main' : ''}">
      <slot />
    </main>
    
    <!-- Right Panel (future feature) -->
    {#if rightPanelVisible}
      <div class="w-80 bg-dark-900 border-l border-dark-700 hidden lg:block">
        <!-- Right panel content -->
        <div class="p-4">
          <h3 class="text-lg font-semibold text-white mb-4">Inspector</h3>
          <p class="text-gray-400 text-sm">Additional information and tools will appear here.</p>
        </div>
      </div>
    {/if}
  </div>
  
  <!-- Command Palette (only for authenticated users) -->
  <CommandPalette 
    bind:isOpen={showCommandPalette}
    on:execute={handleCommandExecuted}
    on:close={() => showCommandPalette = false}
  />
  
  <!-- Global Create Workspace Modal -->
  <CreateWorkspaceModal />
{:else}
  <!-- Public layout without sidebar -->
  <div class="min-h-screen bg-dark-950">
    <slot />
  </div>
{/if}

<!-- Global Toast Notifications -->
<ToastContainer />

<!-- Mobile Install Prompt -->
<InstallPrompt autoShow={true} showDelay={5000} />

<style>
  :global(.focus-mode) {
    /* Focus mode styles - simplified interface */
  }

  :global(.focus-main) {
    /* Focus mode main content area */
    background: #0a0a0f;
  }

  /* Zoom indicator styles */
  :global(.zoom-indicator) {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 0, 0, 0.8);
    color: white;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 12px;
    z-index: 1000;
    opacity: 0;
    transition: opacity 0.3s ease;
    pointer-events: none;
  }

  :global(.zoom-indicator.show) {
    opacity: 1;
  }

  /* Smooth transitions for UI elements */
  :global(.sidebar-transition) {
    transition: transform 0.3s ease, width 0.3s ease;
  }

  :global(.panel-transition) {
    transition: transform 0.3s ease, opacity 0.3s ease;
  }

  /* Responsive zoom handling */
  @media (max-width: 768px) {
    :global(html[style*="zoom"]) {
      /* Disable zoom on mobile to prevent layout issues */
      zoom: 1 !important;
    }
  }
</style>