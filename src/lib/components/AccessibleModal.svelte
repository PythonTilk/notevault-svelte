<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { focusManager, announcer, aria } from '$lib/utils/accessibility.js';

  const dispatch = createEventDispatcher();

  export let isOpen = false;
  export let title = '';
  export let description = '';
  export let size = 'medium'; // 'small', 'medium', 'large', 'full'
  export let closeOnBackdrop = true;
  export let closeOnEscape = true;
  export let trapFocus = true;
  export let restoreFocus = true;
  export let initialFocus = null; // selector or element
  export let role = 'dialog';
  export let ariaLabelledBy = null;
  export let ariaDescribedBy = null;

  let modalElement;
  let titleElement;
  let descriptionElement;
  let contentElement;
  let cleanupFocusTrap;
  let titleId;
  let descriptionId;

  // Size classes
  const sizeClasses = {
    small: 'max-w-md',
    medium: 'max-w-2xl',
    large: 'max-w-4xl',
    full: 'max-w-full mx-4'
  };

  function close() {
    if (isOpen) {
      isOpen = false;
      dispatch('close');
    }
  }

  function handleKeydown(event) {
    if (!isOpen) return;

    if (event.key === 'Escape' && closeOnEscape) {
      event.preventDefault();
      close();
    }
  }

  function handleBackdropClick(event) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      close();
    }
  }

  async function setupModal() {
    if (!isOpen || !modalElement) return;

    await tick();

    // Generate IDs for ARIA relationships
    titleId = aria.generateId('modal-title');
    descriptionId = aria.generateId('modal-desc');

    // Set up ARIA attributes
    if (titleElement) {
      titleElement.id = titleId;
      aria.setAttributes(modalElement, {
        'aria-labelledby': ariaLabelledBy || titleId
      });
    }

    if (descriptionElement && description) {
      descriptionElement.id = descriptionId;
      aria.setAttributes(modalElement, {
        'aria-describedby': ariaDescribedBy || descriptionId
      });
    }

    // Set up focus management
    if (trapFocus) {
      cleanupFocusTrap = focusManager.trapFocus(modalElement);
    } else if (initialFocus) {
      const focusTarget = typeof initialFocus === 'string' 
        ? modalElement.querySelector(initialFocus)
        : initialFocus;
      
      if (focusTarget) {
        focusManager.moveTo(focusTarget);
      }
    }

    // Announce modal opening
    if (title) {
      announcer.announce(`Modal opened: ${title}`);
    }

    // Lock body scroll
    document.body.style.overflow = 'hidden';
  }

  function teardownModal() {
    // Clean up focus trap
    if (cleanupFocusTrap) {
      cleanupFocusTrap();
      cleanupFocusTrap = null;
    }

    // Restore focus if needed
    if (restoreFocus) {
      focusManager.restore();
    }

    // Unlock body scroll
    document.body.style.overflow = '';

    // Announce modal closing
    if (title) {
      announcer.announce(`Modal closed: ${title}`);
    }
  }

  // Reactive setup/teardown
  $: if (isOpen) {
    setupModal();
  } else {
    teardownModal();
  }

  onDestroy(() => {
    teardownModal();
  });
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 transition-opacity duration-200"
    on:click={handleBackdropClick}
    aria-hidden="true"
  >
    <!-- Modal -->
    <div
      bind:this={modalElement}
      class="w-full {sizeClasses[size]} max-h-[90vh] rounded-lg shadow-xl overflow-hidden transform transition-all duration-200 scale-100"
      style="background-color: var(--color-surface); border: 1px solid var(--color-border);"
      {role}
      aria-modal="true"
      tabindex="-1"
    >
      <!-- Header -->
      {#if title || $$slots.header}
        <div class="flex items-center justify-between p-6 border-b" style="border-color: var(--color-border);">
          <div class="flex-1 min-w-0">
            {#if title}
              <h2 
                bind:this={titleElement}
                class="text-xl font-semibold truncate"
                style="color: var(--color-text);"
              >
                {title}
              </h2>
            {/if}
            {#if description}
              <p 
                bind:this={descriptionElement}
                class="mt-1 text-sm"
                style="color: var(--color-textSecondary);"
              >
                {description}
              </p>
            {/if}
            <slot name="header" />
          </div>
          
          <!-- Close button -->
          <button
            class="ml-4 p-2 rounded-lg hover:bg-opacity-75 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2"
            style="color: var(--color-textSecondary); background-color: transparent; ring-color: var(--color-primary); ring-offset-color: var(--color-surface);"
            on:click={close}
            aria-label="Close modal"
            title="Close modal"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      {/if}

      <!-- Content -->
      <div 
        bind:this={contentElement}
        class="p-6 overflow-y-auto max-h-[calc(90vh-8rem)]"
        style="color: var(--color-text);"
      >
        <slot />
      </div>

      <!-- Footer -->
      {#if $$slots.footer}
        <div class="flex items-center justify-end gap-3 p-6 border-t" style="border-color: var(--color-border); background-color: var(--color-background);">
          <slot name="footer" />
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Smooth entrance animation */
  .fixed {
    animation: fadeIn 0.2s ease-out;
  }

  .fixed > div {
    animation: slideUp 0.2s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px) scale(0.95); 
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1); 
    }
  }

  /* High contrast mode adjustments */
  :global(.high-contrast) .fixed {
    border: 3px solid;
  }

  /* Reduced motion adjustments */
  :global(.reduce-motion) .fixed,
  :global(.reduce-motion) .fixed > div {
    animation: none;
    transition: none;
  }

  /* Focus styles */
  button:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Ensure good contrast for focus indicators */
  @supports selector(:focus-visible) {
    button:focus:not(:focus-visible) {
      outline: none;
    }
    
    button:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  /* Custom scrollbar for content area */
  .overflow-y-auto::-webkit-scrollbar {
    width: 8px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: var(--color-background);
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 4px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: var(--color-textSecondary);
  }

  /* Ensure modal is accessible on small screens */
  @media (max-width: 640px) {
    .fixed {
      padding: 1rem;
    }
    
    .w-full {
      max-height: calc(100vh - 2rem);
    }
  }
</style>