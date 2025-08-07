import { browser } from '$app/environment';

// Focus management utilities
export const focusManager = {
  // Store the previously focused element
  _previousFocus: null,
  
  // Save current focus and move to element
  moveTo(element) {
    if (!browser || !element) return;
    
    this._previousFocus = document.activeElement;
    element.focus();
  },
  
  // Restore focus to previously focused element
  restore() {
    if (!browser || !this._previousFocus) return;
    
    try {
      this._previousFocus.focus();
    } catch (error) {
      // Element might not be focusable anymore
      console.warn('Could not restore focus:', error);
    }
    this._previousFocus = null;
  },
  
  // Trap focus within a container
  trapFocus(container) {
    if (!browser || !container) return () => {};
    
    const focusableElements = this.getFocusableElements(container);
    const firstFocusable = focusableElements[0];
    const lastFocusable = focusableElements[focusableElements.length - 1];
    
    const handleTabKey = (event) => {
      if (event.key !== 'Tab') return;
      
      if (event.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstFocusable) {
          event.preventDefault();
          lastFocusable?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastFocusable) {
          event.preventDefault();
          firstFocusable?.focus();
        }
      }
    };
    
    container.addEventListener('keydown', handleTabKey);
    
    // Focus first element
    firstFocusable?.focus();
    
    // Return cleanup function
    return () => {
      container.removeEventListener('keydown', handleTabKey);
    };
  },
  
  // Get all focusable elements within a container
  getFocusableElements(container) {
    if (!container) return [];
    
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled]):not([type="hidden"])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]'
    ].join(', ');
    
    return Array.from(container.querySelectorAll(focusableSelectors))
      .filter(element => {
        return element.offsetWidth > 0 && 
               element.offsetHeight > 0 && 
               !element.hidden;
      });
  }
};

// Announcement utilities for screen readers
export const announcer = {
  _container: null,
  
  // Initialize announcement container
  init() {
    if (!browser || this._container) return;
    
    this._container = document.createElement('div');
    this._container.setAttribute('aria-live', 'polite');
    this._container.setAttribute('aria-atomic', 'true');
    this._container.setAttribute('aria-relevant', 'additions text');
    this._container.className = 'sr-only';
    this._container.style.cssText = `
      position: absolute !important;
      width: 1px !important;
      height: 1px !important;
      padding: 0 !important;
      margin: -1px !important;
      overflow: hidden !important;
      clip: rect(0, 0, 0, 0) !important;
      white-space: nowrap !important;
      border: 0 !important;
    `;
    
    document.body.appendChild(this._container);
  },
  
  // Announce message to screen readers
  announce(message, priority = 'polite') {
    if (!browser) return;
    
    if (!this._container) this.init();
    
    this._container.setAttribute('aria-live', priority);
    this._container.textContent = message;
    
    // Clear after a delay to allow for re-announcements
    setTimeout(() => {
      if (this._container) {
        this._container.textContent = '';
      }
    }, 1000);
  },
  
  // Announce with assertive priority (interrupts other announcements)
  announceUrgent(message) {
    this.announce(message, 'assertive');
  }
};

// Color contrast utilities
export const colorContrast = {
  // Calculate relative luminance
  getLuminance(color) {
    const rgb = this.hexToRgb(color);
    if (!rgb) return 0;
    
    const rsRGB = rgb.r / 255;
    const gsRGB = rgb.g / 255;
    const bsRGB = rgb.b / 255;
    
    const r = rsRGB <= 0.03928 ? rsRGB / 12.92 : Math.pow((rsRGB + 0.055) / 1.055, 2.4);
    const g = gsRGB <= 0.03928 ? gsRGB / 12.92 : Math.pow((gsRGB + 0.055) / 1.055, 2.4);
    const b = bsRGB <= 0.03928 ? bsRGB / 12.92 : Math.pow((bsRGB + 0.055) / 1.055, 2.4);
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  },
  
  // Calculate contrast ratio between two colors
  getContrastRatio(color1, color2) {
    const l1 = this.getLuminance(color1);
    const l2 = this.getLuminance(color2);
    
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    
    return (lighter + 0.05) / (darker + 0.05);
  },
  
  // Check if contrast ratio meets WCAG standards
  meetsWCAG(color1, color2, level = 'AA', size = 'normal') {
    const ratio = this.getContrastRatio(color1, color2);
    
    if (level === 'AAA') {
      return size === 'large' ? ratio >= 4.5 : ratio >= 7;
    } else {
      return size === 'large' ? ratio >= 3 : ratio >= 4.5;
    }
  },
  
  // Convert hex to RGB
  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : null;
  }
};

// Keyboard navigation utilities
export const keyboardNav = {
  // Handle arrow key navigation in a list
  handleArrowKeys(event, items, currentIndex, onSelect) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return currentIndex;
    }
    
    event.preventDefault();
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowUp':
      case 'ArrowLeft':
        newIndex = currentIndex > 0 ? currentIndex - 1 : items.length - 1;
        break;
      case 'ArrowDown':
      case 'ArrowRight':
        newIndex = currentIndex < items.length - 1 ? currentIndex + 1 : 0;
        break;
      case 'Home':
        newIndex = 0;
        break;
      case 'End':
        newIndex = items.length - 1;
        break;
    }
    
    if (newIndex !== currentIndex && onSelect) {
      onSelect(newIndex);
    }
    
    return newIndex;
  },
  
  // Handle grid navigation (2D)
  handleGridNavigation(event, gridWidth, gridHeight, currentIndex, onSelect) {
    if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
      return currentIndex;
    }
    
    event.preventDefault();
    
    const currentRow = Math.floor(currentIndex / gridWidth);
    const currentCol = currentIndex % gridWidth;
    let newIndex = currentIndex;
    
    switch (event.key) {
      case 'ArrowUp':
        if (currentRow > 0) {
          newIndex = (currentRow - 1) * gridWidth + currentCol;
        }
        break;
      case 'ArrowDown':
        if (currentRow < gridHeight - 1) {
          newIndex = (currentRow + 1) * gridWidth + currentCol;
        }
        break;
      case 'ArrowLeft':
        if (currentCol > 0) {
          newIndex = currentRow * gridWidth + (currentCol - 1);
        }
        break;
      case 'ArrowRight':
        if (currentCol < gridWidth - 1) {
          newIndex = currentRow * gridWidth + (currentCol + 1);
        }
        break;
      case 'Home':
        newIndex = currentRow * gridWidth;
        break;
      case 'End':
        newIndex = currentRow * gridWidth + (gridWidth - 1);
        break;
    }
    
    if (newIndex !== currentIndex && onSelect) {
      onSelect(newIndex);
    }
    
    return newIndex;
  }
};

// Accessibility preference utilities
export const a11yPreferences = {
  // Check if user has reduced motion preference
  prefersReducedMotion() {
    if (!browser) return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  },
  
  // Check if user has high contrast preference
  prefersHighContrast() {
    if (!browser) return false;
    return window.matchMedia('(prefers-contrast: high)').matches;
  },
  
  // Check if user prefers dark color scheme
  prefersDarkScheme() {
    if (!browser) return false;
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  },
  
  // Listen for preference changes
  onPreferenceChange(callback) {
    if (!browser) return () => {};
    
    const mediaQueries = [
      window.matchMedia('(prefers-reduced-motion: reduce)'),
      window.matchMedia('(prefers-contrast: high)'),
      window.matchMedia('(prefers-color-scheme: dark)')
    ];
    
    const handler = () => callback({
      reducedMotion: mediaQueries[0].matches,
      highContrast: mediaQueries[1].matches,
      darkScheme: mediaQueries[2].matches
    });
    
    mediaQueries.forEach(mq => mq.addEventListener('change', handler));
    
    return () => {
      mediaQueries.forEach(mq => mq.removeEventListener('change', handler));
    };
  }
};

// ARIA utilities
export const aria = {
  // Generate unique ID for ARIA relationships
  generateId(prefix = 'a11y') {
    return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  },
  
  // Set ARIA attributes
  setAttributes(element, attributes) {
    if (!element) return;
    
    Object.entries(attributes).forEach(([key, value]) => {
      if (value === null || value === undefined) {
        element.removeAttribute(key);
      } else {
        element.setAttribute(key, value);
      }
    });
  },
  
  // Create describedby relationship
  createDescribedBy(element, descriptionElement, descriptionText) {
    if (!element || !descriptionElement) return;
    
    const id = this.generateId('desc');
    descriptionElement.id = id;
    descriptionElement.textContent = descriptionText;
    element.setAttribute('aria-describedby', id);
    
    return id;
  },
  
  // Create labelledby relationship
  createLabelledBy(element, labelElement, labelText) {
    if (!element || !labelElement) return;
    
    const id = this.generateId('label');
    labelElement.id = id;
    if (labelText) labelElement.textContent = labelText;
    element.setAttribute('aria-labelledby', id);
    
    return id;
  }
};

// Initialize accessibility features
export function initializeAccessibility() {
  if (!browser) return;
  
  // Initialize announcer
  announcer.init();
  
  // Add focus-visible polyfill styles if needed
  if (!CSS.supports('selector(:focus-visible)')) {
    const style = document.createElement('style');
    style.textContent = `
      .focus-visible-polyfill:focus {
        outline: 2px solid var(--color-primary, #3B82F6);
        outline-offset: 2px;
      }
    `;
    document.head.appendChild(style);
  }
  
  // Add high contrast media query support
  const contrastMediaQuery = window.matchMedia('(prefers-contrast: high)');
  const updateContrast = () => {
    document.documentElement.classList.toggle('high-contrast', contrastMediaQuery.matches);
  };
  updateContrast();
  contrastMediaQuery.addEventListener('change', updateContrast);
  
  // Add reduced motion support
  const motionMediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const updateMotion = () => {
    document.documentElement.classList.toggle('reduce-motion', motionMediaQuery.matches);
  };
  updateMotion();
  motionMediaQuery.addEventListener('change', updateMotion);
}

// Skip link utilities
export const skipLinks = {
  // Create skip link
  create(target, text = 'Skip to main content') {
    if (!browser) return;
    
    const skipLink = document.createElement('a');
    skipLink.href = `#${target}`;
    skipLink.textContent = text;
    skipLink.className = 'skip-link';
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: var(--color-primary, #3B82F6);
      color: white;
      padding: 8px;
      border-radius: 4px;
      text-decoration: none;
      z-index: 1000;
      transition: top 0.3s;
    `;
    
    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px';
    });
    
    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px';
    });
    
    document.body.insertBefore(skipLink, document.body.firstChild);
    
    return skipLink;
  }
};

export default {
  focusManager,
  announcer,
  colorContrast,
  keyboardNav,
  a11yPreferences,
  aria,
  skipLinks,
  initializeAccessibility
};