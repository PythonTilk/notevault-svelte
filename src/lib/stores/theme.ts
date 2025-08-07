import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Available themes
export const themes = {
  'dark': {
    name: 'Dark',
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1', 
      accent: '#F59E0B',
      background: '#1F2937',
      surface: '#374151',
      text: '#F9FAFB',
      textSecondary: '#D1D5DB',
      border: '#4B5563',
      error: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B'
    }
  },
  'light': {
    name: 'Light',
    colors: {
      primary: '#3B82F6',
      secondary: '#6366F1',
      accent: '#F59E0B', 
      background: '#FFFFFF',
      surface: '#F9FAFB',
      text: '#1F2937',
      textSecondary: '#6B7280',
      border: '#E5E7EB',
      error: '#EF4444',
      success: '#10B981',
      warning: '#F59E0B'
    }
  },
  'cyberpunk': {
    name: 'Cyberpunk',
    colors: {
      primary: '#FF0080',
      secondary: '#00FFFF',
      accent: '#FFFF00',
      background: '#0A0A0A',
      surface: '#1A1A2E',
      text: '#00FFFF',
      textSecondary: '#FF0080',
      border: '#16213E',
      error: '#FF0040',
      success: '#00FF80',
      warning: '#FFFF00'
    }
  },
  'forest': {
    name: 'Forest',
    colors: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#D97706',
      background: '#064E3B',
      surface: '#065F46',
      text: '#ECFDF5',
      textSecondary: '#A7F3D0',
      border: '#047857',
      error: '#DC2626',
      success: '#10B981',
      warning: '#F59E0B'
    }
  },
  'ocean': {
    name: 'Ocean',
    colors: {
      primary: '#0EA5E9',
      secondary: '#0284C7',
      accent: '#06B6D4',
      background: '#0C4A6E',
      surface: '#075985',
      text: '#F0F9FF',
      textSecondary: '#BAE6FD',
      border: '#0369A1',
      error: '#DC2626',
      success: '#10B981',
      warning: '#F59E0B'
    }
  },
  'sunset': {
    name: 'Sunset',
    colors: {
      primary: '#F97316',
      secondary: '#EA580C',
      accent: '#EF4444',
      background: '#7C2D12',
      surface: '#9A3412',
      text: '#FFF7ED',
      textSecondary: '#FDBA74',
      border: '#C2410C',
      error: '#DC2626',
      success: '#10B981',
      warning: '#F59E0B'
    }
  }
};

// Get initial theme from localStorage or default to dark
function getInitialTheme() {
  if (browser) {
    const stored = localStorage.getItem('notevault-theme');
    if (stored && themes[stored]) {
      return stored;
    }
    
    // Check system preference
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
      return 'light';
    }
  }
  return 'dark';
}

// Create theme store
export const currentTheme = writable(getInitialTheme());

// Apply theme to DOM
export function applyTheme(themeName) {
  if (!browser || !themes[themeName]) return;
  
  const theme = themes[themeName];
  const root = document.documentElement;
  
  // Apply CSS custom properties
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--color-${key}`, value);
  });
  
  // Update data attribute for CSS selectors
  document.body.setAttribute('data-theme', themeName);
  
  // Store in localStorage
  localStorage.setItem('notevault-theme', themeName);
  
  // Update store
  currentTheme.set(themeName);
}

// Initialize theme on store creation
if (browser) {
  currentTheme.subscribe(applyTheme);
  
  // Listen for system theme changes
  if (window.matchMedia) {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', () => {
      const currentThemeValue = localStorage.getItem('notevault-theme');
      if (!currentThemeValue) {
        applyTheme(mediaQuery.matches ? 'dark' : 'light');
      }
    });
  }
}