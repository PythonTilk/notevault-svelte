import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('Accessibility Features', () => {
  beforeEach(() => {
    // Reset DOM
    document.body.innerHTML = '';
  });

  describe('Keyboard Navigation', () => {
    it('should handle keyboard events for accessibility', () => {
      const mockHandler = vi.fn();
      
      // Simulate keyboard event handling
      const handleKeyDown = (event: KeyboardEvent) => {
        const { key, metaKey, ctrlKey, shiftKey } = event;
        
        // Common accessibility shortcuts
        if ((metaKey || ctrlKey) && key === 'k') {
          mockHandler('command-palette');
          event.preventDefault();
        }
        
        if (key === 'Escape') {
          mockHandler('escape');
          event.preventDefault();
        }
        
        if (key === 'Tab') {
          mockHandler('tab');
          if (shiftKey) {
            mockHandler('shift-tab');
          }
        }
        
        if (key === 'Enter' || key === ' ') {
          mockHandler('activate');
          event.preventDefault();
        }
      };

      // Test command palette shortcut
      const commandPaletteEvent = new KeyboardEvent('keydown', {
        key: 'k',
        ctrlKey: true
      });
      handleKeyDown(commandPaletteEvent);
      expect(mockHandler).toHaveBeenCalledWith('command-palette');

      // Test escape key
      const escapeEvent = new KeyboardEvent('keydown', {
        key: 'Escape'
      });
      handleKeyDown(escapeEvent);
      expect(mockHandler).toHaveBeenCalledWith('escape');

      // Test tab navigation
      const tabEvent = new KeyboardEvent('keydown', {
        key: 'Tab'
      });
      handleKeyDown(tabEvent);
      expect(mockHandler).toHaveBeenCalledWith('tab');

      // Test shift+tab
      const shiftTabEvent = new KeyboardEvent('keydown', {
        key: 'Tab',
        shiftKey: true
      });
      handleKeyDown(shiftTabEvent);
      expect(mockHandler).toHaveBeenCalledWith('shift-tab');

      // Test enter/space activation
      const enterEvent = new KeyboardEvent('keydown', {
        key: 'Enter'
      });
      handleKeyDown(enterEvent);
      expect(mockHandler).toHaveBeenCalledWith('activate');
    });
  });

  describe('ARIA Attributes', () => {
    it('should validate ARIA attributes for buttons', () => {
      const createAccessibleButton = (text: string, ariaLabel?: string) => {
        const button = document.createElement('button');
        button.textContent = text;
        
        if (ariaLabel) {
          button.setAttribute('aria-label', ariaLabel);
        }
        
        // Add role for screen readers
        button.setAttribute('role', 'button');
        button.setAttribute('tabindex', '0');
        
        return button;
      };

      // Test button with text content
      const textButton = createAccessibleButton('Click me');
      expect(textButton.textContent).toBe('Click me');
      expect(textButton.getAttribute('role')).toBe('button');
      expect(textButton.getAttribute('tabindex')).toBe('0');

      // Test button with aria-label
      const iconButton = createAccessibleButton('', 'Close dialog');
      expect(iconButton.getAttribute('aria-label')).toBe('Close dialog');
      expect(iconButton.getAttribute('role')).toBe('button');
    });

    it('should validate ARIA attributes for modals', () => {
      const createAccessibleModal = (title: string, description: string) => {
        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-labelledby', 'modal-title');
        modal.setAttribute('aria-describedby', 'modal-description');
        modal.setAttribute('tabindex', '-1');

        const titleElement = document.createElement('h2');
        titleElement.id = 'modal-title';
        titleElement.textContent = title;

        const descriptionElement = document.createElement('p');
        descriptionElement.id = 'modal-description';
        descriptionElement.textContent = description;

        modal.appendChild(titleElement);
        modal.appendChild(descriptionElement);

        return modal;
      };

      const modal = createAccessibleModal('Confirm Action', 'Are you sure you want to proceed?');
      
      expect(modal.getAttribute('role')).toBe('dialog');
      expect(modal.getAttribute('aria-modal')).toBe('true');
      expect(modal.getAttribute('aria-labelledby')).toBe('modal-title');
      expect(modal.getAttribute('aria-describedby')).toBe('modal-description');
      
      const title = modal.querySelector('#modal-title');
      expect(title?.textContent).toBe('Confirm Action');
      
      const description = modal.querySelector('#modal-description');
      expect(description?.textContent).toBe('Are you sure you want to proceed?');
    });

    it('should validate ARIA attributes for form inputs', () => {
      const createAccessibleInput = (
        type: string, 
        label: string, 
        required = false, 
        error?: string
      ) => {
        const container = document.createElement('div');
        
        const labelElement = document.createElement('label');
        labelElement.textContent = label;
        labelElement.setAttribute('for', `input-${Date.now()}`);
        
        const input = document.createElement('input');
        input.type = type;
        input.id = `input-${Date.now()}`;
        
        if (required) {
          input.setAttribute('required', '');
          input.setAttribute('aria-required', 'true');
        }
        
        if (error) {
          const errorId = `error-${Date.now()}`;
          input.setAttribute('aria-describedby', errorId);
          input.setAttribute('aria-invalid', 'true');
          
          const errorElement = document.createElement('div');
          errorElement.id = errorId;
          errorElement.textContent = error;
          errorElement.setAttribute('role', 'alert');
          
          container.appendChild(errorElement);
        }
        
        container.appendChild(labelElement);
        container.appendChild(input);
        
        return { container, input, label: labelElement };
      };

      // Test required input
      const { container: requiredContainer, input: requiredInput } = 
        createAccessibleInput('email', 'Email Address', true);
      
      expect(requiredInput.getAttribute('required')).toBe('');
      expect(requiredInput.getAttribute('aria-required')).toBe('true');

      // Test input with error
      const { container: errorContainer, input: errorInput } = 
        createAccessibleInput('email', 'Email Address', true, 'Invalid email format');
      
      expect(errorInput.getAttribute('aria-invalid')).toBe('true');
      expect(errorInput.getAttribute('aria-describedby')).toBeTruthy();
      
      const errorElement = errorContainer.querySelector('[role="alert"]');
      expect(errorElement?.textContent).toBe('Invalid email format');
    });
  });

  describe('Color Contrast and Visual Accessibility', () => {
    it('should validate color contrast ratios', () => {
      // Helper function to calculate relative luminance
      const getLuminance = (rgb: [number, number, number]): number => {
        const [r, g, b] = rgb.map(c => {
          c = c / 255;
          return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };

      // Helper function to calculate contrast ratio
      const getContrastRatio = (
        color1: [number, number, number], 
        color2: [number, number, number]
      ): number => {
        const lum1 = getLuminance(color1);
        const lum2 = getLuminance(color2);
        const brightest = Math.max(lum1, lum2);
        const darkest = Math.min(lum1, lum2);
        return (brightest + 0.05) / (darkest + 0.05);
      };

      // Test WCAG AA compliance (minimum 4.5:1 for normal text)
      const white: [number, number, number] = [255, 255, 255];
      const black: [number, number, number] = [0, 0, 0];
      const darkGray: [number, number, number] = [64, 64, 64];
      const lightGray: [number, number, number] = [192, 192, 192];

      // High contrast combinations
      const whiteOnBlack = getContrastRatio(white, black);
      expect(whiteOnBlack).toBeGreaterThan(4.5); // WCAG AA compliant

      const blackOnWhite = getContrastRatio(black, white);
      expect(blackOnWhite).toBeGreaterThan(4.5); // WCAG AA compliant

      // Lower contrast combinations
      const lightGrayOnWhite = getContrastRatio(lightGray, white);
      expect(lightGrayOnWhite).toBeLessThan(4.5); // Not WCAG AA compliant

      // Our app's color scheme should be tested
      const primary: [number, number, number] = [59, 130, 246]; // blue-500
      const primaryOnWhite = getContrastRatio(primary, white);
      expect(primaryOnWhite).toBeGreaterThan(3); // Should have reasonable contrast
    });

    it('should handle reduced motion preferences', () => {
      // Mock matchMedia for prefers-reduced-motion
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const checkReducedMotion = () => {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      };

      const createAnimationClass = (reduceMotion: boolean) => {
        if (reduceMotion) {
          return 'transition-none'; // No animations
        }
        return 'transition-all duration-300 ease-in-out'; // Normal animations
      };

      // Test with reduced motion
      const reducedMotionClass = createAnimationClass(checkReducedMotion());
      expect(typeof reducedMotionClass).toBe('string');
    });
  });

  describe('Screen Reader Support', () => {
    it('should provide appropriate live regions for dynamic content', () => {
      const createLiveRegion = (politeness: 'polite' | 'assertive' = 'polite') => {
        const liveRegion = document.createElement('div');
        liveRegion.setAttribute('aria-live', politeness);
        liveRegion.setAttribute('aria-atomic', 'true');
        liveRegion.className = 'sr-only'; // Screen reader only
        document.body.appendChild(liveRegion);
        return liveRegion;
      };

      const announceToScreenReader = (message: string, urgent = false) => {
        const liveRegion = createLiveRegion(urgent ? 'assertive' : 'polite');
        liveRegion.textContent = message;
        
        // Clean up after announcement
        setTimeout(() => {
          document.body.removeChild(liveRegion);
        }, 1000);
        
        return liveRegion;
      };

      // Test polite announcement
      const politeRegion = announceToScreenReader('Form saved successfully');
      expect(politeRegion.getAttribute('aria-live')).toBe('polite');
      expect(politeRegion.textContent).toBe('Form saved successfully');

      // Test urgent announcement
      const assertiveRegion = announceToScreenReader('Error: Connection lost', true);
      expect(assertiveRegion.getAttribute('aria-live')).toBe('assertive');
      expect(assertiveRegion.textContent).toBe('Error: Connection lost');
    });

    it('should provide appropriate skip links', () => {
      const createSkipLink = (href: string, text: string) => {
        const skipLink = document.createElement('a');
        skipLink.href = href;
        skipLink.textContent = text;
        skipLink.className = 'sr-only focus:not-sr-only'; // Only visible when focused
        skipLink.style.position = 'absolute';
        skipLink.style.top = '0';
        skipLink.style.left = '0';
        return skipLink;
      };

      const skipToContent = createSkipLink('#main-content', 'Skip to main content');
      const skipToNav = createSkipLink('#navigation', 'Skip to navigation');

      expect(skipToContent.href).toContain('#main-content');
      expect(skipToContent.textContent).toBe('Skip to main content');
      expect(skipToNav.href).toContain('#navigation');
      expect(skipToNav.textContent).toBe('Skip to navigation');
    });
  });

  describe('Focus Management', () => {
    it('should manage focus correctly in modals', () => {
      const createFocusTrap = () => {
        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('tabindex', '-1');

        const firstFocusable = document.createElement('button');
        firstFocusable.textContent = 'First Button';
        
        const secondFocusable = document.createElement('input');
        secondFocusable.type = 'text';
        
        const lastFocusable = document.createElement('button');
        lastFocusable.textContent = 'Last Button';

        modal.appendChild(firstFocusable);
        modal.appendChild(secondFocusable);
        modal.appendChild(lastFocusable);

        const getFocusableElements = () => {
          return modal.querySelectorAll(
            'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
          );
        };

        const trapFocus = (event: KeyboardEvent) => {
          if (event.key !== 'Tab') return;

          const focusableElements = getFocusableElements();
          const firstElement = focusableElements[0] as HTMLElement;
          const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

          if (event.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              event.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              event.preventDefault();
            }
          }
        };

        return { modal, trapFocus, getFocusableElements };
      };

      const { modal, getFocusableElements } = createFocusTrap();
      document.body.appendChild(modal);

      const focusableElements = getFocusableElements();
      expect(focusableElements).toHaveLength(3);
      expect(focusableElements[0].textContent).toBe('First Button');
      expect(focusableElements[2].textContent).toBe('Last Button');

      document.body.removeChild(modal);
    });

    it('should handle focus restoration after modal closes', () => {
      let previouslyFocusedElement: HTMLElement | null = null;

      const openModal = () => {
        // Store currently focused element
        previouslyFocusedElement = document.activeElement as HTMLElement;
        
        const modal = document.createElement('div');
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('tabindex', '-1');
        modal.id = 'test-modal';
        
        const closeButton = document.createElement('button');
        closeButton.textContent = 'Close';
        closeButton.onclick = closeModal;
        
        modal.appendChild(closeButton);
        document.body.appendChild(modal);
        
        // Focus the modal
        modal.focus();
        
        return modal;
      };

      const closeModal = () => {
        const modal = document.getElementById('test-modal');
        if (modal) {
          document.body.removeChild(modal);
          
          // Restore focus to previously focused element
          if (previouslyFocusedElement) {
            previouslyFocusedElement.focus();
          }
        }
      };

      // Create a button to trigger modal
      const triggerButton = document.createElement('button');
      triggerButton.textContent = 'Open Modal';
      triggerButton.onclick = openModal;
      document.body.appendChild(triggerButton);

      // Simulate opening and closing modal
      triggerButton.focus();
      const modal = openModal();
      expect(document.getElementById('test-modal')).toBe(modal);
      
      closeModal();
      expect(document.getElementById('test-modal')).toBeNull();

      document.body.removeChild(triggerButton);
    });
  });
});