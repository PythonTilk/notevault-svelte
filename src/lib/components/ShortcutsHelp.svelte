<script>
  import { shortcuts, getShortcutsByCategory, formatShortcut, registerShortcut } from '$lib/stores/shortcuts.js';
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  let searchQuery = '';
  let cleanupShortcut;

  // Get shortcuts organized by category
  $: categorizedShortcuts = getShortcutsByCategory($shortcuts);
  
  // Filter shortcuts based on search
  $: filteredShortcuts = searchQuery 
    ? Object.fromEntries(
        Object.entries(categorizedShortcuts).map(([category, shortcuts]) => [
          category,
          shortcuts.filter(shortcut => 
            shortcut.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
            shortcut.action.toLowerCase().includes(searchQuery.toLowerCase())
          )
        ]).filter(([, shortcuts]) => shortcuts.length > 0)
      )
    : categorizedShortcuts;

  function close() {
    isOpen = false;
    dispatch('close');
  }

  function handleKeydown(event) {
    if (event.key === 'Escape') {
      close();
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  onMount(() => {
    // Register escape key to close
    cleanupShortcut = registerShortcut('escape', close, { 
      target: document,
      allowInInputs: true 
    });
  });

  onDestroy(() => {
    if (cleanupShortcut) {
      cleanupShortcut();
    }
  });
</script>

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
    on:click={handleBackdropClick}
    on:keydown={handleKeydown}
    role="dialog"
    aria-modal="true"
    aria-labelledby="shortcuts-title"
  >
    <!-- Modal -->
    <div 
      class="w-full max-w-4xl max-h-[90vh] rounded-lg shadow-xl overflow-hidden"
      style="background-color: var(--color-surface); border: 1px solid var(--color-border);"
    >
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b" style="border-color: var(--color-border);">
        <div>
          <h2 id="shortcuts-title" class="text-2xl font-bold" style="color: var(--color-text);">
            Keyboard Shortcuts
          </h2>
          <p class="text-sm mt-1" style="color: var(--color-textSecondary);">
            Boost your productivity with these keyboard shortcuts
          </p>
        </div>
        <button
          class="p-2 rounded-lg hover:bg-opacity-75 transition-colors"
          style="color: var(--color-textSecondary); background-color: transparent;"
          on:click={close}
          aria-label="Close shortcuts help"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Search -->
      <div class="p-6 border-b" style="border-color: var(--color-border);">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search shortcuts..."
            bind:value={searchQuery}
            class="w-full pl-10 pr-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2"
            style="background-color: var(--color-background); border-color: var(--color-border); color: var(--color-text); ring-color: var(--color-primary);"
          />
        </div>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-y-auto max-h-[60vh]">
        {#if Object.keys(filteredShortcuts).length === 0}
          <div class="text-center py-8">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h.01M15 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-medium mb-2" style="color: var(--color-text);">
              No shortcuts found
            </p>
            <p style="color: var(--color-textSecondary);">
              Try a different search term
            </p>
          </div>
        {:else}
          <div class="grid gap-8 md:grid-cols-2">
            {#each Object.entries(filteredShortcuts) as [category, categoryShortcuts]}
              <div>
                <h3 class="text-lg font-semibold mb-4 pb-2 border-b" style="color: var(--color-text); border-color: var(--color-border);">
                  {category}
                </h3>
                <div class="space-y-3">
                  {#each categoryShortcuts as shortcut}
                    <div class="flex items-center justify-between group">
                      <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium truncate" style="color: var(--color-text);">
                          {shortcut.description}
                        </p>
                        {#if shortcut.action !== shortcut.description.toLowerCase().replace(/\s+/g, '-')}
                          <p class="text-xs opacity-75 truncate" style="color: var(--color-textSecondary);">
                            {shortcut.action}
                          </p>
                        {/if}
                      </div>
                      <div class="ml-4 flex-shrink-0">
                        <kbd 
                          class="inline-flex items-center px-2 py-1 text-xs font-mono rounded border shadow-sm"
                          style="background-color: var(--color-background); border-color: var(--color-border); color: var(--color-text);"
                        >
                          {formatShortcut(shortcut.key)}
                        </kbd>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="px-6 py-4 border-t" style="border-color: var(--color-border); background-color: var(--color-background);">
        <div class="flex items-center justify-between text-sm">
          <div class="flex items-center gap-4" style="color: var(--color-textSecondary);">
            <span>Press <kbd class="px-1 py-0.5 rounded text-xs border" style="border-color: var(--color-border);">Esc</kbd> to close</span>
            <span>•</span>
            <span>{Object.values(filteredShortcuts).flat().length} shortcuts shown</span>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="px-3 py-1.5 text-xs rounded-md border transition-colors hover:bg-opacity-75"
              style="background-color: var(--color-surface); border-color: var(--color-border); color: var(--color-text);"
              on:click={() => dispatch('openSettings')}
            >
              Customize
            </button>
            <button
              class="px-3 py-1.5 text-xs rounded-md transition-colors text-white"
              style="background-color: var(--color-primary);"
              on:click={close}
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  kbd {
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', 'Source Code Pro', monospace;
    font-weight: 500;
  }

  /* Smooth animations */
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

  /* Custom scrollbar for shortcuts list */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }

  .overflow-y-auto::-webkit-scrollbar-track {
    background: var(--color-background);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: var(--color-border);
    border-radius: 3px;
  }

  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: var(--color-textSecondary);
  }
</style>