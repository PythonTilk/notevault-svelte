import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// TypeScript interfaces
export interface ShortcutAction {
  action: string;
  description: string;
  category: string;
}

export interface ShortcutOptions {
  preventDefault?: boolean;
  stopPropagation?: boolean;
  target?: EventTarget;
  enabled?: boolean;
  allowInInputs?: boolean;
}

export type ShortcutMap = Record<string, ShortcutAction>;

// Default keyboard shortcuts
export const defaultShortcuts: ShortcutMap = {
  // Navigation
  'mod+k': { 
    action: 'command-palette', 
    description: 'Open command palette',
    category: 'Navigation'
  },
  'mod+shift+p': { 
    action: 'command-palette', 
    description: 'Open command palette',
    category: 'Navigation'
  },
  'mod+b': { 
    action: 'toggle-sidebar', 
    description: 'Toggle left sidebar',
    category: 'Navigation'
  },
  'mod+shift+b': { 
    action: 'toggle-right-panel', 
    description: 'Toggle right panel',
    category: 'Navigation'
  },
  'mod+shift+d': { 
    action: 'focus-mode', 
    description: 'Toggle focus mode',
    category: 'Navigation'
  },
  'mod+1': { 
    action: 'switch-workspace-1', 
    description: 'Switch to workspace 1',
    category: 'Navigation'
  },
  'mod+2': { 
    action: 'switch-workspace-2', 
    description: 'Switch to workspace 2',
    category: 'Navigation'
  },
  'mod+3': { 
    action: 'switch-workspace-3', 
    description: 'Switch to workspace 3',
    category: 'Navigation'
  },

  // Notes
  'mod+n': { 
    action: 'new-note', 
    description: 'Create new note',
    category: 'Notes'
  },
  'mod+shift+n': { 
    action: 'new-note-template', 
    description: 'Create note from template',
    category: 'Notes'
  },
  'mod+d': { 
    action: 'duplicate-note', 
    description: 'Duplicate current note',
    category: 'Notes'
  },
  'mod+e': { 
    action: 'edit-note', 
    description: 'Edit current note',
    category: 'Notes'
  },
  'mod+shift+e': { 
    action: 'edit-note-source', 
    description: 'Edit note source',
    category: 'Notes'
  },
  'delete': { 
    action: 'delete-note', 
    description: 'Delete selected note',
    category: 'Notes'
  },
  'mod+shift+d': { 
    action: 'delete-note-confirm', 
    description: 'Delete note (with confirmation)',
    category: 'Notes'
  },

  // Search
  'mod+f': { 
    action: 'search-notes', 
    description: 'Search in notes',
    category: 'Search'
  },
  'mod+shift+f': { 
    action: 'search-replace', 
    description: 'Search and replace',
    category: 'Search'
  },
  'mod+g': { 
    action: 'find-next', 
    description: 'Find next',
    category: 'Search'
  },
  'mod+shift+g': { 
    action: 'find-previous', 
    description: 'Find previous',
    category: 'Search'
  },

  // Editing
  'mod+z': { 
    action: 'undo', 
    description: 'Undo',
    category: 'Editing'
  },
  'mod+y': { 
    action: 'redo', 
    description: 'Redo',
    category: 'Editing'
  },
  'mod+shift+z': { 
    action: 'redo', 
    description: 'Redo',
    category: 'Editing'
  },
  'mod+a': { 
    action: 'select-all', 
    description: 'Select all',
    category: 'Editing'
  },
  'mod+c': { 
    action: 'copy', 
    description: 'Copy',
    category: 'Editing'
  },
  'mod+x': { 
    action: 'cut', 
    description: 'Cut',
    category: 'Editing'
  },
  'mod+v': { 
    action: 'paste', 
    description: 'Paste',
    category: 'Editing'
  },
  'mod+shift+v': { 
    action: 'paste-plain', 
    description: 'Paste as plain text',
    category: 'Editing'
  },

  // Formatting
  'mod+i': { 
    action: 'format-italic', 
    description: 'Toggle italic',
    category: 'Formatting'
  },
  'mod+shift+i': { 
    action: 'format-bold', 
    description: 'Toggle bold',
    category: 'Formatting'
  },
  'mod+u': { 
    action: 'format-underline', 
    description: 'Toggle underline',
    category: 'Formatting'
  },
  'mod+shift+u': { 
    action: 'format-strikethrough', 
    description: 'Toggle strikethrough',
    category: 'Formatting'
  },
  'mod+shift+c': { 
    action: 'format-code', 
    description: 'Toggle inline code',
    category: 'Formatting'
  },
  'mod+shift+k': { 
    action: 'format-link', 
    description: 'Insert/edit link',
    category: 'Formatting'
  },

  // View
  'mod+equal': { 
    action: 'zoom-in', 
    description: 'Zoom in',
    category: 'View'
  },
  'mod+minus': { 
    action: 'zoom-out', 
    description: 'Zoom out',
    category: 'View'
  },
  'mod+0': { 
    action: 'zoom-reset', 
    description: 'Reset zoom',
    category: 'View'
  },
  'f11': { 
    action: 'fullscreen', 
    description: 'Toggle fullscreen',
    category: 'View'
  },

  // Chat
  'mod+enter': { 
    action: 'send-message', 
    description: 'Send chat message',
    category: 'Chat'
  },
  'shift+enter': { 
    action: 'new-line', 
    description: 'New line in chat',
    category: 'Chat'
  },
  'mod+up': { 
    action: 'edit-last-message', 
    description: 'Edit last message',
    category: 'Chat'
  },

  // Application
  'mod+comma': { 
    action: 'open-settings', 
    description: 'Open settings',
    category: 'Application'
  },
  'mod+shift+comma': { 
    action: 'open-preferences', 
    description: 'Open preferences',
    category: 'Application'
  },
  'f1': { 
    action: 'show-help', 
    description: 'Show help',
    category: 'Application'
  },
  'mod+shift+slash': { 
    action: 'show-shortcuts', 
    description: 'Show keyboard shortcuts',
    category: 'Application'
  }
};

// Get initial shortcuts from localStorage or use defaults
function getInitialShortcuts() {
  if (browser) {
    const stored = localStorage.getItem('notevault-shortcuts');
    if (stored) {
      try {
        return { ...defaultShortcuts, ...JSON.parse(stored) };
      } catch (error) {
        console.warn('Failed to parse stored shortcuts:', error);
      }
    }
  }
  return { ...defaultShortcuts };
}

// Create shortcuts store
export const shortcuts = writable<ShortcutMap>(getInitialShortcuts());

// Active shortcuts listeners
const activeListeners = new Map<string, EventListener>();

// Normalize key combination
function normalizeKey(key: string): string {
  return key.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/cmd|command/g, 'mod')
    .replace(/ctrl|control/g, 'mod')
    .replace(/alt|option/g, 'alt')
    .replace(/shift/g, 'shift')
    .replace(/meta/g, 'mod');
}

// Check if key combination matches
function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const keys = shortcut.split('+');
  const hasModifier = keys.includes('mod');
  const hasShift = keys.includes('shift');
  const hasAlt = keys.includes('alt');
  const mainKey = keys[keys.length - 1];

  // Check modifiers
  const modifierPressed = event.ctrlKey || event.metaKey;
  if (hasModifier !== modifierPressed) return false;
  if (hasShift !== event.shiftKey) return false;
  if (hasAlt !== event.altKey) return false;

  // Check main key
  const eventKey = event.key.toLowerCase();
  const eventCode = event.code.toLowerCase();

  return eventKey === mainKey || 
         eventCode === mainKey || 
         eventCode === `key${mainKey}` ||
         eventCode === `digit${mainKey}`;
}

// Register shortcut listener
export function registerShortcut(
  shortcutKey: string, 
  callback: (event: KeyboardEvent) => void, 
  options: ShortcutOptions = {}
): () => void {
  if (!browser) return () => {};

  const { 
    preventDefault = true, 
    stopPropagation = true,
    target = document,
    enabled = true,
    allowInInputs = false
  } = options;

  const normalizedKey = normalizeKey(shortcutKey);
  
  const handler = (event: KeyboardEvent) => {
    if (!enabled) return;
    
    // Skip if typing in input fields (unless explicitly allowed)
    if (!allowInInputs && 
        event.target instanceof Element &&
        ['input', 'textarea', 'select'].includes(event.target.tagName.toLowerCase())) {
      return;
    }

    if (matchesShortcut(event, normalizedKey)) {
      if (preventDefault) event.preventDefault();
      if (stopPropagation) event.stopPropagation();
      
      callback(event);
    }
  };

  target.addEventListener('keydown', handler);
  
  // Store listener for cleanup
  const listenerId = `${normalizedKey}-${Date.now()}`;
  activeListeners.set(listenerId, { target, handler });

  // Return cleanup function
  return () => {
    target.removeEventListener('keydown', handler);
    activeListeners.delete(listenerId);
  };
}

// Register multiple shortcuts at once
export function registerShortcuts(
  shortcutMap: Record<string, (event: KeyboardEvent) => void>, 
  options: ShortcutOptions = {}
): () => void {
  const cleanupFunctions: (() => void)[] = [];
  
  Object.entries(shortcutMap).forEach(([key, callback]) => {
    const cleanup = registerShortcut(key, callback, options);
    cleanupFunctions.push(cleanup);
  });

  // Return function to cleanup all shortcuts
  return () => {
    cleanupFunctions.forEach(cleanup => cleanup());
  };
}

// Update shortcut configuration
export function updateShortcut(oldKey: string, newKey: string, action: string): void {
  if (!browser) return;

  shortcuts.update(current => {
    const updated = { ...current };
    
    // Remove old shortcut
    if (oldKey && updated[oldKey]) {
      delete updated[oldKey];
    }
    
    // Add new shortcut
    if (newKey && action) {
      updated[newKey] = {
        action,
        description: action.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase()),
        category: 'Custom'
      };
    }

    // Save to localStorage
    const customShortcuts: ShortcutMap = {};
    Object.entries(updated).forEach(([key, value]) => {
      if (!defaultShortcuts[key] || 
          JSON.stringify(value) !== JSON.stringify(defaultShortcuts[key])) {
        customShortcuts[key] = value;
      }
    });
    
    localStorage.setItem('notevault-shortcuts', JSON.stringify(customShortcuts));
    
    return updated;
  });
}

// Reset shortcuts to defaults
export function resetShortcuts() {
  if (!browser) return;
  
  shortcuts.set({ ...defaultShortcuts });
  localStorage.removeItem('notevault-shortcuts');
}

// Get shortcuts by category
export function getShortcutsByCategory(shortcutsMap) {
  const categories = {};
  
  Object.entries(shortcutsMap).forEach(([key, config]) => {
    const category = config.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push({ key, ...config });
  });

  return categories;
}

// Format shortcut for display
export function formatShortcut(shortcut) {
  if (!shortcut) return '';
  
  const isMac = browser && navigator.platform.indexOf('Mac') > -1;
  
  return shortcut
    .split('+')
    .map(key => {
      switch (key.toLowerCase()) {
        case 'mod':
          return isMac ? '⌘' : 'Ctrl';
        case 'shift':
          return isMac ? '⇧' : 'Shift';
        case 'alt':
          return isMac ? '⌥' : 'Alt';
        case 'enter':
          return '↵';
        case 'backspace':
          return '⌫';
        case 'delete':
          return '⌦';
        case 'escape':
          return 'Esc';
        case 'tab':
          return '⇥';
        case 'space':
          return 'Space';
        case 'up':
          return '↑';
        case 'down':
          return '↓';
        case 'left':
          return '←';
        case 'right':
          return '→';
        case 'equal':
          return '=';
        case 'minus':
          return '-';
        case 'slash':
          return '/';
        case 'comma':
          return ',';
        default:
          return key.toUpperCase();
      }
    })
    .join(isMac ? '' : '+');
}

// Cleanup all listeners (useful for component unmounting)
export function cleanupAllShortcuts() {
  activeListeners.forEach(({ target, handler }) => {
    target.removeEventListener('keydown', handler);
  });
  activeListeners.clear();
}