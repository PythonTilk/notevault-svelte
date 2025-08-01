import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Available layout configurations
export const layoutPresets = {
  'classic': {
    name: 'Classic',
    description: 'Traditional three-panel layout with sidebar, main content, and chat',
    config: {
      sidebar: { width: 280, visible: true, collapsed: false },
      mainContent: { flex: 1 },
      rightPanel: { width: 320, visible: true, collapsed: false },
      topBar: { height: 60, visible: true },
      bottomBar: { height: 40, visible: true }
    }
  },
  'focus': {
    name: 'Focus Mode',
    description: 'Minimal distraction layout with hidden sidebars',
    config: {
      sidebar: { width: 280, visible: false, collapsed: true },
      mainContent: { flex: 1 },
      rightPanel: { width: 320, visible: false, collapsed: true },
      topBar: { height: 60, visible: true },
      bottomBar: { height: 40, visible: false }
    }
  },
  'widescreen': {
    name: 'Widescreen',
    description: 'Optimized for wide screens with expanded panels',
    config: {
      sidebar: { width: 350, visible: true, collapsed: false },
      mainContent: { flex: 1 },
      rightPanel: { width: 400, visible: true, collapsed: false },
      topBar: { height: 70, visible: true },
      bottomBar: { height: 50, visible: true }
    }
  },
  'compact': {
    name: 'Compact',
    description: 'Space-efficient layout for smaller screens',
    config: {
      sidebar: { width: 240, visible: true, collapsed: false },
      mainContent: { flex: 1 },
      rightPanel: { width: 280, visible: true, collapsed: false },
      topBar: { height: 50, visible: true },
      bottomBar: { height: 35, visible: true }
    }
  },
  'custom': {
    name: 'Custom',
    description: 'Fully customizable layout',
    config: {
      sidebar: { width: 280, visible: true, collapsed: false },
      mainContent: { flex: 1 },
      rightPanel: { width: 320, visible: true, collapsed: false },
      topBar: { height: 60, visible: true },
      bottomBar: { height: 40, visible: true }
    }
  }
};

// Get initial layout from localStorage or default to classic
function getInitialLayout() {
  if (browser) {
    const stored = localStorage.getItem('notevault-layout');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.preset && layoutPresets[parsed.preset]) {
          return parsed;
        }
      } catch (error) {
        console.warn('Failed to parse stored layout:', error);
      }
    }
  }
  return {
    preset: 'classic',
    config: { ...layoutPresets.classic.config },
    customConfig: null
  };
}

// Create layout store
export const currentLayout = writable(getInitialLayout());

// Panel visibility store
export const panelVisibility = writable({
  sidebar: true,
  rightPanel: true,
  topBar: true,
  bottomBar: true
});

// Update layout configuration
export function updateLayout(preset, customConfig = null) {
  if (!browser) return;

  let config;
  
  if (preset === 'custom' && customConfig) {
    config = { ...customConfig };
  } else if (layoutPresets[preset]) {
    config = { ...layoutPresets[preset].config };
  } else {
    console.warn('Invalid layout preset:', preset);
    return;
  }

  const layoutData = {
    preset,
    config,
    customConfig: preset === 'custom' ? customConfig : null
  };

  // Update stores
  currentLayout.set(layoutData);
  
  // Update panel visibility based on config
  panelVisibility.set({
    sidebar: config.sidebar.visible,
    rightPanel: config.rightPanel.visible,
    topBar: config.topBar.visible,
    bottomBar: config.bottomBar.visible
  });

  // Store in localStorage
  localStorage.setItem('notevault-layout', JSON.stringify(layoutData));
}

// Toggle panel visibility
export function togglePanel(panelName) {
  if (!browser) return;

  currentLayout.update(layout => {
    const newConfig = { ...layout.config };
    
    if (newConfig[panelName]) {
      newConfig[panelName] = {
        ...newConfig[panelName],
        visible: !newConfig[panelName].visible
      };
    }

    const updatedLayout = {
      ...layout,
      preset: 'custom', // Mark as custom when manually toggling
      config: newConfig
    };

    // Update panel visibility
    panelVisibility.update(visibility => ({
      ...visibility,
      [panelName]: newConfig[panelName]?.visible ?? visibility[panelName]
    }));

    // Store in localStorage
    localStorage.setItem('notevault-layout', JSON.stringify(updatedLayout));

    return updatedLayout;
  });
}

// Resize panel
export function resizePanel(panelName, newSize) {
  if (!browser) return;

  currentLayout.update(layout => {
    const newConfig = { ...layout.config };
    
    if (newConfig[panelName]) {
      newConfig[panelName] = {
        ...newConfig[panelName],
        width: newSize.width ?? newConfig[panelName].width,
        height: newSize.height ?? newConfig[panelName].height
      };
    }

    const updatedLayout = {
      ...layout,
      preset: 'custom', // Mark as custom when manually resizing
      config: newConfig
    };

    // Store in localStorage
    localStorage.setItem('notevault-layout', JSON.stringify(updatedLayout));

    return updatedLayout;
  });
}

// Reset to preset layout
export function resetToPreset(preset) {
  if (layoutPresets[preset]) {
    updateLayout(preset);
  }
}

// Get CSS variables for current layout
export function getLayoutCSSVars(layout) {
  if (!layout || !layout.config) return {};

  return {
    '--sidebar-width': `${layout.config.sidebar.width}px`,
    '--right-panel-width': `${layout.config.rightPanel.width}px`,
    '--top-bar-height': `${layout.config.topBar.height}px`,
    '--bottom-bar-height': `${layout.config.bottomBar.height}px`,
    '--sidebar-display': layout.config.sidebar.visible ? 'flex' : 'none',
    '--right-panel-display': layout.config.rightPanel.visible ? 'flex' : 'none',
    '--top-bar-display': layout.config.topBar.visible ? 'flex' : 'none',
    '--bottom-bar-display': layout.config.bottomBar.visible ? 'flex' : 'none'
  };
}

// Responsive layout adjustments
export function adjustLayoutForScreenSize() {
  if (!browser) return;

  const screenWidth = window.innerWidth;
  
  currentLayout.update(layout => {
    let newPreset = layout.preset;
    let newConfig = { ...layout.config };

    // Auto-adjust for mobile/tablet
    if (screenWidth < 768) {
      // Mobile layout
      newConfig = {
        ...newConfig,
        sidebar: { ...newConfig.sidebar, width: 280, visible: false },
        rightPanel: { ...newConfig.rightPanel, width: 300, visible: false },
        topBar: { ...newConfig.topBar, height: 55 },
        bottomBar: { ...newConfig.bottomBar, height: 50 }
      };
    } else if (screenWidth < 1024) {
      // Tablet layout
      newConfig = {
        ...newConfig,
        sidebar: { ...newConfig.sidebar, width: 260 },
        rightPanel: { ...newConfig.rightPanel, width: 300 }
      };
    }

    const updatedLayout = {
      ...layout,
      config: newConfig
    };

    // Update panel visibility
    panelVisibility.set({
      sidebar: newConfig.sidebar.visible,
      rightPanel: newConfig.rightPanel.visible,
      topBar: newConfig.topBar.visible,
      bottomBar: newConfig.bottomBar.visible
    });

    return updatedLayout;
  });
}

// Initialize responsive adjustments
if (browser) {
  // Listen for screen size changes
  window.addEventListener('resize', adjustLayoutForScreenSize);
  
  // Initial adjustment
  adjustLayoutForScreenSize();
}