import { writable, type Writable } from 'svelte/store';
import { browser } from '$app/environment';

// Types
interface PanelConfig {
  width?: number;
  height?: number;
  visible: boolean;
  collapsed: boolean;
  flex?: number;
}

interface LayoutConfig {
  sidebar: PanelConfig;
  mainContent: PanelConfig;
  rightPanel: PanelConfig;
  topBar: PanelConfig;
  bottomBar: PanelConfig;
}

interface LayoutPreset {
  name: string;
  description: string;
  config: LayoutConfig;
}

// Available layout configurations
export const layoutPresets: Record<string, LayoutPreset> = {
  'classic': {
    name: 'Classic',
    description: 'Traditional three-panel layout with sidebar, main content, and chat',
    config: {
      sidebar: { width: 280, visible: true, collapsed: false },
      mainContent: { flex: 1, visible: true, collapsed: false },
      rightPanel: { width: 320, visible: true, collapsed: false },
      topBar: { height: 60, visible: true, collapsed: false },
      bottomBar: { height: 40, visible: true, collapsed: false }
    }
  },
  'focus': {
    name: 'Focus Mode',
    description: 'Minimal distraction layout with hidden sidebars',
    config: {
      sidebar: { width: 280, visible: false, collapsed: true },
      mainContent: { flex: 1, visible: true, collapsed: false },
      rightPanel: { width: 320, visible: false, collapsed: true },
      topBar: { height: 60, visible: true, collapsed: false },
      bottomBar: { height: 40, visible: false, collapsed: false }
    }
  },
  'widescreen': {
    name: 'Widescreen',
    description: 'Optimized for wide screens with expanded panels',
    config: {
      sidebar: { width: 350, visible: true, collapsed: false },
      mainContent: { flex: 1, visible: true, collapsed: false },
      rightPanel: { width: 400, visible: true, collapsed: false },
      topBar: { height: 70, visible: true, collapsed: false },
      bottomBar: { height: 50, visible: true, collapsed: false }
    }
  },
  'compact': {
    name: 'Compact',
    description: 'Space-efficient layout for smaller screens',
    config: {
      sidebar: { width: 240, visible: true, collapsed: false },
      mainContent: { flex: 1, visible: true, collapsed: false },
      rightPanel: { width: 280, visible: true, collapsed: false },
      topBar: { height: 50, visible: true, collapsed: false },
      bottomBar: { height: 35, visible: true, collapsed: false }
    }
  },
  'custom': {
    name: 'Custom',
    description: 'User-defined layout configuration',
    config: {
      sidebar: { width: 280, visible: true, collapsed: false },
      mainContent: { flex: 1, visible: true, collapsed: false },
      rightPanel: { width: 320, visible: true, collapsed: false },
      topBar: { height: 60, visible: true, collapsed: false },
      bottomBar: { height: 40, visible: true, collapsed: false }
    }
  }
};

// Get stored layout preference
function getStoredLayout(): string {
  if (browser) {
    return localStorage.getItem('notevault-layout') || 'classic';
  }
  return 'classic';
}

// Get stored custom configuration
function getStoredCustomConfig(): LayoutConfig {
  if (browser) {
    const stored = localStorage.getItem('notevault-custom-layout');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch {
        // Fall back to default if parsing fails
      }
    }
  }
  return layoutPresets.custom.config;
}

// Current layout stores
export const currentLayoutPreset: Writable<string> = writable(getStoredLayout());
export const layoutConfig: Writable<LayoutConfig> = writable(layoutPresets[getStoredLayout()].config);
export const customLayoutConfig: Writable<LayoutConfig> = writable(getStoredCustomConfig());

// Responsive breakpoints
export const breakpoints = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536
};

// Screen size store
export const screenSize: Writable<{
  width: number;
  height: number;
  breakpoint: string;
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
}> = writable({
  width: browser ? window.innerWidth : 1024,
  height: browser ? window.innerHeight : 768,
  breakpoint: 'lg',
  isMobile: false,
  isTablet: false,
  isDesktop: true
});

// Update screen size
function updateScreenSize(): void {
  if (!browser) return;
  
  const width = window.innerWidth;
  const height = window.innerHeight;
  
  let breakpoint = 'sm';
  if (width >= breakpoints['2xl']) breakpoint = '2xl';
  else if (width >= breakpoints.xl) breakpoint = 'xl';
  else if (width >= breakpoints.lg) breakpoint = 'lg';
  else if (width >= breakpoints.md) breakpoint = 'md';
  
  const isMobile = width < breakpoints.md;
  const isTablet = width >= breakpoints.md && width < breakpoints.lg;
  const isDesktop = width >= breakpoints.lg;
  
  screenSize.set({
    width,
    height,
    breakpoint,
    isMobile,
    isTablet,
    isDesktop
  });
}

// Initialize screen size tracking
if (browser) {
  updateScreenSize();
  window.addEventListener('resize', updateScreenSize);
}

// Subscribe to layout changes and save to localStorage
currentLayoutPreset.subscribe((preset) => {
  if (browser) {
    localStorage.setItem('notevault-layout', preset);
    
    // Update layout config when preset changes
    if (preset === 'custom') {
      customLayoutConfig.subscribe((config) => {
        layoutConfig.set(config);
      });
    } else if (layoutPresets[preset]) {
      layoutConfig.set(layoutPresets[preset].config);
    }
  }
});

// Save custom layout configuration
customLayoutConfig.subscribe((config) => {
  if (browser) {
    localStorage.setItem('notevault-custom-layout', JSON.stringify(config));
  }
});

// Layout manipulation functions
export function setLayoutPreset(preset: string): void {
  if (layoutPresets[preset]) {
    currentLayoutPreset.set(preset);
  }
}

export function updateLayoutConfig(updates: Partial<LayoutConfig>): void {
  layoutConfig.update((current) => ({
    ...current,
    ...updates
  }));
  
  // If we're using custom layout, also update custom config
  currentLayoutPreset.subscribe((preset) => {
    if (preset === 'custom') {
      customLayoutConfig.update((current) => ({
        ...current,
        ...updates
      }));
    }
  })();
}

export function toggleSidebar(): void {
  layoutConfig.update((config) => ({
    ...config,
    sidebar: {
      ...config.sidebar,
      visible: !config.sidebar.visible
    }
  }));
}

export function toggleRightPanel(): void {
  layoutConfig.update((config) => ({
    ...config,
    rightPanel: {
      ...config.rightPanel,
      visible: !config.rightPanel.visible
    }
  }));
}

export function collapseSidebar(): void {
  layoutConfig.update((config) => ({
    ...config,
    sidebar: {
      ...config.sidebar,
      collapsed: !config.sidebar.collapsed
    }
  }));
}

export function collapseRightPanel(): void {
  layoutConfig.update((config) => ({
    ...config,
    rightPanel: {
      ...config.rightPanel,
      collapsed: !config.rightPanel.collapsed
    }
  }));
}

export function setSidebarWidth(width: number): void {
  layoutConfig.update((config) => ({
    ...config,
    sidebar: {
      ...config.sidebar,
      width
    }
  }));
}

export function setRightPanelWidth(width: number): void {
  layoutConfig.update((config) => ({
    ...config,
    rightPanel: {
      ...config.rightPanel,
      width
    }
  }));
}

// Auto-responsive layout adjustments
screenSize.subscribe(({ isMobile, isTablet }) => {
  if (isMobile) {
    // On mobile, hide panels by default
    layoutConfig.update((config) => ({
      ...config,
      sidebar: { ...config.sidebar, visible: false },
      rightPanel: { ...config.rightPanel, visible: false },
      bottomBar: { ...config.bottomBar, visible: false }
    }));
  } else if (isTablet) {
    // On tablet, collapse panels
    layoutConfig.update((config) => ({
      ...config,
      sidebar: { ...config.sidebar, collapsed: true },
      rightPanel: { ...config.rightPanel, collapsed: true }
    }));
  }
});

// Reset to default layout
export function resetLayout(): void {
  const currentPreset = getStoredLayout();
  if (layoutPresets[currentPreset]) {
    layoutConfig.set(layoutPresets[currentPreset].config);
  }
}

// Export for convenience
export default {
  currentLayoutPreset,
  layoutConfig,
  customLayoutConfig,
  screenSize,
  layoutPresets,
  breakpoints,
  setLayoutPreset,
  updateLayoutConfig,
  toggleSidebar,
  toggleRightPanel,
  collapseSidebar,
  collapseRightPanel,
  setSidebarWidth,
  setRightPanelWidth,
  resetLayout
};