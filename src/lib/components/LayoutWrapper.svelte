<script>
  import { currentLayout, panelVisibility, getLayoutCSSVars } from '$lib/stores/layout.js';
  import { onMount } from 'svelte';

  export let children;

  let layoutElement;
  
  // Reactive CSS variables based on current layout
  $: cssVars = getLayoutCSSVars($currentLayout);
  
  // Apply CSS variables to the layout element
  function updateCSSVars(element, vars) {
    if (!element) return;
    
    Object.entries(vars).forEach(([property, value]) => {
      element.style.setProperty(property, value);
    });
  }

  // Update CSS variables when layout changes
  $: if (layoutElement && cssVars) {
    updateCSSVars(layoutElement, cssVars);
  }

  onMount(() => {
    // Initial CSS variables setup
    if (layoutElement && cssVars) {
      updateCSSVars(layoutElement, cssVars);
    }
  });
</script>

<div 
  bind:this={layoutElement}
  class="layout-wrapper"
  class:sidebar-visible={$panelVisibility.sidebar}
  class:right-panel-visible={$panelVisibility.rightPanel}
  class:top-bar-visible={$panelVisibility.topBar}
  class:bottom-bar-visible={$panelVisibility.bottomBar}
>
  <slot />
</div>

<style>
  .layout-wrapper {
    display: grid;
    grid-template-areas: 
      "topbar topbar topbar"
      "sidebar main rightpanel"
      "bottombar bottombar bottombar";
    grid-template-columns: 
      var(--sidebar-width, 280px) 
      1fr 
      var(--right-panel-width, 320px);
    grid-template-rows: 
      var(--top-bar-height, 60px) 
      1fr 
      var(--bottom-bar-height, 40px);
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  /* Adjust grid when panels are hidden */
  .layout-wrapper:not(.sidebar-visible) {
    grid-template-columns: 
      0 
      1fr 
      var(--right-panel-width, 320px);
  }

  .layout-wrapper:not(.right-panel-visible) {
    grid-template-columns: 
      var(--sidebar-width, 280px) 
      1fr 
      0;
  }

  .layout-wrapper:not(.sidebar-visible):not(.right-panel-visible) {
    grid-template-columns: 0 1fr 0;
  }

  .layout-wrapper:not(.top-bar-visible) {
    grid-template-areas: 
      "sidebar main rightpanel"
      "bottombar bottombar bottombar";
    grid-template-rows: 
      1fr 
      var(--bottom-bar-height, 40px);
  }

  .layout-wrapper:not(.bottom-bar-visible) {
    grid-template-areas: 
      "topbar topbar topbar"
      "sidebar main rightpanel";
    grid-template-rows: 
      var(--top-bar-height, 60px) 
      1fr;
  }

  .layout-wrapper:not(.top-bar-visible):not(.bottom-bar-visible) {
    grid-template-areas: "sidebar main rightpanel";
    grid-template-rows: 1fr;
  }

  /* Individual panel styling */
  :global(.layout-wrapper .top-bar) {
    grid-area: topbar;
    display: var(--top-bar-display, flex);
    background-color: var(--color-surface);
    border-bottom: 1px solid var(--color-border);
    z-index: 50;
  }

  :global(.layout-wrapper .sidebar) {
    grid-area: sidebar;
    display: var(--sidebar-display, flex);
    background-color: var(--color-surface);
    border-right: 1px solid var(--color-border);
    z-index: 40;
    overflow-y: auto;
  }

  :global(.layout-wrapper .main-content) {
    grid-area: main;
    background-color: var(--color-background);
    overflow-y: auto;
    position: relative;
  }

  :global(.layout-wrapper .right-panel) {
    grid-area: rightpanel;
    display: var(--right-panel-display, flex);
    background-color: var(--color-surface);
    border-left: 1px solid var(--color-border);
    z-index: 40;
    overflow-y: auto;
  }

  :global(.layout-wrapper .bottom-bar) {
    grid-area: bottombar;
    display: var(--bottom-bar-display, flex);
    background-color: var(--color-surface);
    border-top: 1px solid var(--color-border);
    z-index: 50;
  }

  /* Responsive adjustments */
  @media (max-width: 768px) {
    .layout-wrapper {
      grid-template-areas: 
        "topbar"
        "main"
        "bottombar";
      grid-template-columns: 1fr;
      grid-template-rows: 
        var(--top-bar-height, 60px) 
        1fr 
        var(--bottom-bar-height, 40px);
    }

    .layout-wrapper:not(.top-bar-visible) {
      grid-template-areas: 
        "main"
        "bottombar";
      grid-template-rows: 
        1fr 
        var(--bottom-bar-height, 40px);
    }

    .layout-wrapper:not(.bottom-bar-visible) {
      grid-template-areas: 
        "topbar"
        "main";
      grid-template-rows: 
        var(--top-bar-height, 60px) 
        1fr;
    }

    .layout-wrapper:not(.top-bar-visible):not(.bottom-bar-visible) {
      grid-template-areas: "main";
      grid-template-rows: 1fr;
    }

    /* Hide sidebars on mobile by default */
    :global(.layout-wrapper .sidebar),
    :global(.layout-wrapper .right-panel) {
      display: none;
    }

    /* Show as overlay when needed */
    :global(.layout-wrapper .sidebar.mobile-overlay),
    :global(.layout-wrapper .right-panel.mobile-overlay) {
      position: fixed;
      top: var(--top-bar-height, 60px);
      bottom: var(--bottom-bar-height, 40px);
      width: 280px;
      display: flex;
      z-index: 100;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }

    :global(.layout-wrapper .sidebar.mobile-overlay) {
      left: 0;
    }

    :global(.layout-wrapper .right-panel.mobile-overlay) {
      right: 0;
    }
  }

  @media (max-width: 480px) {
    :global(.layout-wrapper .sidebar.mobile-overlay),
    :global(.layout-wrapper .right-panel.mobile-overlay) {
      width: 100vw;
      left: 0;
      right: 0;
    }
  }

  /* Smooth transitions */
  .layout-wrapper,
  :global(.layout-wrapper > *) {
    transition: all 0.25s ease-in-out;
  }

  /* Resize handles */
  :global(.layout-wrapper .resize-handle) {
    position: absolute;
    background-color: transparent;
    transition: background-color 0.2s ease;
    z-index: 60;
  }

  :global(.layout-wrapper .resize-handle:hover) {
    background-color: var(--color-primary);
    opacity: 0.5;
  }

  :global(.layout-wrapper .resize-handle.vertical) {
    width: 4px;
    height: 100%;
    cursor: ew-resize;
  }

  :global(.layout-wrapper .resize-handle.horizontal) {
    width: 100%;
    height: 4px;
    cursor: ns-resize;
  }

  :global(.layout-wrapper .sidebar .resize-handle) {
    right: -2px;
    top: 0;
  }

  :global(.layout-wrapper .right-panel .resize-handle) {
    left: -2px;
    top: 0;
  }
</style>