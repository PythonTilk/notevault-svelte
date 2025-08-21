<script>
  import { createEventDispatcher } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { slide } from 'svelte/transition';
  import { 
    Home, 
    MessageSquare, 
    FolderOpen, 
    Calendar, 
    Search, 
    Bell, 
    Settings, 
    Plus,
    Menu,
    X
  } from 'lucide-svelte';
  import enhancedPWA from '$lib/mobile/enhanced-pwa.js';

  const dispatch = createEventDispatcher();

  export let currentRoute = '/';
  export let notificationCount = 0;

  let showFullMenu = false;

  // Navigation items
  const navItems = [
    { 
      id: 'home', 
      label: 'Home', 
      icon: Home, 
      path: '/', 
      primary: true 
    },
    { 
      id: 'chat', 
      label: 'Chat', 
      icon: MessageSquare, 
      path: '/chat', 
      primary: true 
    },
    { 
      id: 'files', 
      label: 'Files', 
      icon: FolderOpen, 
      path: '/files', 
      primary: true 
    },
    { 
      id: 'search', 
      label: 'Search', 
      icon: Search, 
      path: '/search', 
      primary: true 
    },
    { 
      id: 'calendar', 
      label: 'Calendar', 
      icon: Calendar, 
      path: '/calendar', 
      primary: false 
    },
    { 
      id: 'notifications', 
      label: 'Notifications', 
      icon: Bell, 
      path: '/notifications', 
      badge: notificationCount > 0 ? notificationCount : null,
      primary: false 
    },
    { 
      id: 'settings', 
      label: 'Settings', 
      icon: Settings, 
      path: '/settings', 
      primary: false 
    }
  ];

  $: primaryItems = navItems.filter(item => item.primary);
  $: secondaryItems = navItems.filter(item => !item.primary);
  $: activeRoute = $page.url.pathname;

  function handleNavigate(item) {
    // Haptic feedback
    if (enhancedPWA.haptic) {
      enhancedPWA.haptic.light();
    }

    goto(item.path);
    dispatch('navigate', { path: item.path, item });
    
    // Close full menu if open
    showFullMenu = false;
  }

  function handleNewAction() {
    // Haptic feedback
    if (enhancedPWA.haptic) {
      enhancedPWA.haptic.medium();
    }

    dispatch('new-action');
  }

  function toggleFullMenu() {
    showFullMenu = !showFullMenu;
    
    // Haptic feedback
    if (enhancedPWA.haptic) {
      enhancedPWA.haptic.light();
    }
  }

  // Handle gestures for the navigation
  function handleSwipeUp(event) {
    if (enhancedPWA.gestures) {
      enhancedPWA.gestures.swipe(event.target, {
        up: () => {
          if (!showFullMenu) {
            toggleFullMenu();
          }
        }
      });
    }
  }
</script>

<nav class="mobile-navigation">
  <!-- Main Tab Bar -->
  <div class="mobile-tab-bar" use:handleSwipeUp>
    <!-- Primary Navigation Items -->
    {#each primaryItems as item}
      <button
        class="nav-item"
        class:active={activeRoute === item.path || activeRoute.startsWith(item.path + '/')}
        on:click={() => handleNavigate(item)}
        aria-label={item.label}
      >
        <div class="nav-icon">
          <svelte:component this={item.icon} class="w-6 h-6" />
          {#if item.badge}
            <span class="nav-badge">{item.badge > 99 ? '99+' : item.badge}</span>
          {/if}
        </div>
        <span class="nav-label">{item.label}</span>
      </button>
    {/each}

    <!-- New Action Button (Center) -->
    <button
      class="nav-item new-action"
      on:click={handleNewAction}
      aria-label="Create new"
    >
      <div class="nav-icon new-icon">
        <Plus class="w-6 h-6" />
      </div>
      <span class="nav-label">New</span>
    </button>

    <!-- Menu Button -->
    <button
      class="nav-item"
      class:active={showFullMenu}
      on:click={toggleFullMenu}
      aria-label="More options"
    >
      <div class="nav-icon">
        {#if showFullMenu}
          <X class="w-6 h-6" />
        {:else}
          <Menu class="w-6 h-6" />
        {/if}
      </div>
      <span class="nav-label">More</span>
    </button>
  </div>

  <!-- Expanded Menu -->
  {#if showFullMenu}
    <div class="mobile-full-menu" transition:slide={{ duration: 300 }}>
      <div class="menu-content">
        <div class="menu-header">
          <h3>Navigation</h3>
          <button class="menu-close" on:click={toggleFullMenu}>
            <X class="w-5 h-5" />
          </button>
        </div>
        
        <div class="menu-items">
          {#each secondaryItems as item}
            <button
              class="menu-item"
              class:active={activeRoute === item.path}
              on:click={() => handleNavigate(item)}
            >
              <svelte:component this={item.icon} class="w-5 h-5" />
              <span class="menu-item-label">{item.label}</span>
              {#if item.badge}
                <span class="menu-badge">{item.badge > 99 ? '99+' : item.badge}</span>
              {/if}
            </button>
          {/each}
        </div>

        <div class="menu-footer">
          <div class="menu-footer-text">
            Swipe up on the tab bar to open this menu
          </div>
        </div>
      </div>
    </div>
  {/if}

  <!-- Swipe Up Indicator -->
  {#if !showFullMenu}
    <div class="swipe-indicator">
      <div class="swipe-handle"></div>
    </div>
  {/if}
</nav>

<style>
  .mobile-navigation {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    z-index: 100;
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.1);
    padding-bottom: env(safe-area-inset-bottom, 0);
  }

  .mobile-tab-bar {
    display: flex;
    height: 70px;
    padding: 8px 4px 4px;
    background: var(--color-bg-primary);
  }

  .nav-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
    border: none;
    background: none;
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    border-radius: 12px;
    margin: 0 2px;
    position: relative;
    touch-action: manipulation;
  }

  .nav-item:active {
    transform: scale(0.95);
    background: var(--color-bg-hover);
  }

  .nav-item.active {
    color: var(--color-primary);
  }

  .nav-item.new-action {
    background: var(--color-primary);
    color: white;
    margin: 0 8px;
    border-radius: 16px;
  }

  .nav-item.new-action:active {
    transform: scale(0.9);
    background: var(--color-primary-hover);
  }

  .nav-icon {
    position: relative;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .new-icon {
    background: rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    padding: 4px;
  }

  .nav-badge {
    position: absolute;
    top: -4px;
    right: -8px;
    background: #ef4444;
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .nav-label {
    font-size: 11px;
    font-weight: 500;
    line-height: 1;
  }

  .mobile-full-menu {
    background: var(--color-bg-primary);
    border-top: 1px solid var(--color-border);
    max-height: 300px;
    overflow-y: auto;
  }

  .menu-content {
    padding: 16px;
  }

  .menu-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .menu-header h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-primary);
    margin: 0;
  }

  .menu-close {
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

  .menu-close:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .menu-items {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .menu-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 12px;
    border: none;
    border-radius: 12px;
    background: var(--color-bg-secondary);
    color: var(--color-text-secondary);
    cursor: pointer;
    transition: all 0.2s ease;
    width: 100%;
    text-align: left;
    position: relative;
  }

  .menu-item:hover {
    background: var(--color-bg-hover);
    color: var(--color-text-primary);
  }

  .menu-item:active {
    transform: scale(0.98);
  }

  .menu-item.active {
    background: var(--color-primary-light);
    color: var(--color-primary);
  }

  .menu-item-label {
    flex: 1;
    font-size: 16px;
    font-weight: 500;
  }

  .menu-badge {
    background: #ef4444;
    color: white;
    font-size: 12px;
    font-weight: 600;
    padding: 2px 8px;
    border-radius: 12px;
    min-width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .menu-footer {
    margin-top: 16px;
    padding-top: 16px;
    border-top: 1px solid var(--color-border);
  }

  .menu-footer-text {
    font-size: 12px;
    color: var(--color-text-tertiary);
    text-align: center;
    font-style: italic;
  }

  .swipe-indicator {
    position: absolute;
    top: -8px;
    left: 50%;
    transform: translateX(-50%);
    pointer-events: none;
  }

  .swipe-handle {
    width: 36px;
    height: 4px;
    background: var(--color-text-tertiary);
    border-radius: 2px;
    opacity: 0.5;
  }

  /* Animation classes for enhanced PWA */
  .nav-item.haptic-feedback {
    animation: hapticPulse 0.15s ease;
  }

  @keyframes hapticPulse {
    0% { transform: scale(1); }
    50% { transform: scale(0.95); }
    100% { transform: scale(1); }
  }

  /* Dark mode adjustments */
  @media (prefers-color-scheme: dark) {
    .mobile-navigation {
      border-top-color: #374151;
      box-shadow: 0 -2px 20px rgba(0, 0, 0, 0.3);
    }
    
    .nav-badge,
    .menu-badge {
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.5);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .nav-item,
    .menu-item,
    .mobile-full-menu {
      transition: none;
    }
    
    .hapticPulse {
      animation: none;
    }
  }

  /* High contrast mode */
  @media (prefers-contrast: high) {
    .mobile-navigation {
      border-top-width: 2px;
    }
    
    .nav-item,
    .menu-item {
      border: 1px solid var(--color-border);
    }
    
    .nav-badge,
    .menu-badge {
      border: 1px solid white;
    }
  }

  /* Landscape orientation adjustments */
  @media (orientation: landscape) and (max-height: 500px) {
    .mobile-tab-bar {
      height: 60px;
      padding: 4px 4px 2px;
    }
    
    .nav-label {
      font-size: 10px;
    }
    
    .mobile-full-menu {
      max-height: 200px;
    }
  }

  /* iPhone X and newer safe area handling */
  @supports (padding: max(0px)) {
    .mobile-navigation {
      padding-bottom: max(16px, env(safe-area-inset-bottom));
    }
  }
</style>