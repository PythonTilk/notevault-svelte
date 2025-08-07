<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { registerShortcut, formatShortcut } from '$lib/stores/shortcuts.js';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  let searchQuery = '';
  let selectedIndex = 0;
  let searchInput;
  let commandsContainer;
  let cleanupShortcuts = [];

  // Available commands
  const commands = [
    // Navigation
    { 
      id: 'toggle-sidebar', 
      name: 'Toggle Sidebar', 
      description: 'Show/hide the left sidebar',
      category: 'Navigation',
      shortcut: 'mod+b',
      icon: 'sidebar'
    },
    { 
      id: 'toggle-right-panel', 
      name: 'Toggle Right Panel', 
      description: 'Show/hide the right panel',
      category: 'Navigation',
      shortcut: 'mod+shift+b',
      icon: 'panel'
    },
    { 
      id: 'focus-mode', 
      name: 'Focus Mode', 
      description: 'Hide all panels for distraction-free work',
      category: 'Navigation',
      shortcut: 'mod+shift+f',
      icon: 'focus'
    },
    
    // Notes
    { 
      id: 'new-note', 
      name: 'New Note', 
      description: 'Create a new note',
      category: 'Notes',
      shortcut: 'mod+n',
      icon: 'plus'
    },
    { 
      id: 'duplicate-note', 
      name: 'Duplicate Note', 
      description: 'Create a copy of the current note',
      category: 'Notes',
      shortcut: 'mod+d',
      icon: 'copy'
    },
    { 
      id: 'delete-note', 
      name: 'Delete Note', 
      description: 'Delete the selected note',
      category: 'Notes',
      shortcut: 'delete',
      icon: 'trash'
    },
    
    // Search
    { 
      id: 'search-notes', 
      name: 'Search Notes', 
      description: 'Search through all notes',
      category: 'Search',
      shortcut: 'mod+f',
      icon: 'search'
    },
    
    // View
    { 
      id: 'zoom-in', 
      name: 'Zoom In', 
      description: 'Increase zoom level',
      category: 'View',
      shortcut: 'mod+equal',
      icon: 'zoom-in'
    },
    { 
      id: 'zoom-out', 
      name: 'Zoom Out', 
      description: 'Decrease zoom level',
      category: 'View',
      shortcut: 'mod+minus',
      icon: 'zoom-out'
    },
    { 
      id: 'zoom-reset', 
      name: 'Reset Zoom', 
      description: 'Reset zoom to 100%',
      category: 'View',
      shortcut: 'mod+0',
      icon: 'zoom-reset'
    },
    
    // Settings
    { 
      id: 'open-settings', 
      name: 'Open Settings', 
      description: 'Open application settings',
      category: 'Application',
      shortcut: 'mod+comma',
      icon: 'settings'
    },
    { 
      id: 'show-shortcuts', 
      name: 'Show Shortcuts', 
      description: 'Display keyboard shortcuts help',
      category: 'Application',
      shortcut: 'mod+shift+slash',
      icon: 'keyboard'
    },
    { 
      id: 'show-help', 
      name: 'Show Help', 
      description: 'Open help documentation',
      category: 'Application',
      shortcut: 'f1',
      icon: 'help'
    }
  ];

  // Filter commands based on search query
  $: filteredCommands = searchQuery.trim() === '' 
    ? commands 
    : commands.filter(cmd => 
        cmd.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        cmd.category.toLowerCase().includes(searchQuery.toLowerCase())
      );

  // Reset selected index when filtered commands change
  $: if (filteredCommands) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredCommands.length - 1));
  }

  function close() {
    isOpen = false;
    searchQuery = '';
    selectedIndex = 0;
    dispatch('close');
  }

  function executeCommand(command) {
    close();
    dispatch('execute', { command: command.id, data: command });
  }

  function handleKeydown(event) {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        close();
        break;
      
      case 'ArrowDown':
        event.preventDefault();
        selectedIndex = Math.min(selectedIndex + 1, filteredCommands.length - 1);
        scrollToSelected();
        break;
      
      case 'ArrowUp':
        event.preventDefault();
        selectedIndex = Math.max(selectedIndex - 1, 0);
        scrollToSelected();
        break;
      
      case 'Enter':
        event.preventDefault();
        if (filteredCommands[selectedIndex]) {
          executeCommand(filteredCommands[selectedIndex]);
        }
        break;
    }
  }

  function handleBackdropClick(event) {
    if (event.target === event.currentTarget) {
      close();
    }
  }

  async function scrollToSelected() {
    await tick();
    const selectedElement = commandsContainer?.querySelector(`[data-index="${selectedIndex}"]`);
    if (selectedElement) {
      selectedElement.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  function getIcon(iconName) {
    const icons = {
      sidebar: 'M4 6h16M4 12h16M4 18h16',
      panel: 'M9 12l2 2 4-4',
      focus: 'M15 10l4.55-2.55A1 1 0 0121 8.45v7.1a1 1 0 01-1.45 1.45L15 14v-4zM5 12a7 7 0 1114 0 7 7 0 01-14 0z',
      plus: 'M12 4v16m8-8H4',
      copy: 'M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z',
      trash: 'M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16',
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      'zoom-in': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7',
      'zoom-out': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6',
      'zoom-reset': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
      keyboard: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm4 2v2h2V8H6zm4 0v2h4V8h-4zm6 0v2h2V8h-2zM6 12v2h2v-2H6zm4 0v2h8v-2h-8z',
      help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    };
    return icons[iconName] || icons.help;
  }

  onMount(async () => {
    if (isOpen && searchInput) {
      await tick();
      searchInput.focus();
    }

    // Register global shortcuts for opening command palette
    const cleanup1 = registerShortcut('mod+k', () => { isOpen = true; });
    const cleanup2 = registerShortcut('mod+shift+p', () => { isOpen = true; });
    
    cleanupShortcuts.push(cleanup1, cleanup2);
  });

  onDestroy(() => {
    cleanupShortcuts.forEach(cleanup => cleanup());
  });

  $: if (isOpen && searchInput) {
    tick().then(() => searchInput?.focus());
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if isOpen}
  <!-- Backdrop -->
  <div 
    class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start justify-center pt-20 px-4"
    on:click={handleBackdropClick}
    role="dialog"
    aria-modal="true"
    aria-labelledby="command-palette-title"
  >
    <!-- Command Palette -->
    <div 
      class="w-full max-w-2xl rounded-lg shadow-xl overflow-hidden"
      style="background-color: var(--color-surface); border: 1px solid var(--color-border);"
    >
      <!-- Search Input -->
      <div class="p-4 border-b" style="border-color: var(--color-border);">
        <div class="relative">
          <svg class="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            bind:this={searchInput}
            type="text"
            placeholder="Type a command or search..."
            bind:value={searchQuery}
            class="w-full pl-10 pr-4 py-3 text-lg rounded-lg border-0 focus:outline-none"
            style="background-color: transparent; color: var(--color-text);"
          />
        </div>
      </div>

      <!-- Commands List -->
      <div bind:this={commandsContainer} class="max-h-96 overflow-y-auto">
        {#if filteredCommands.length === 0}
          <div class="p-8 text-center">
            <svg class="w-16 h-16 mx-auto mb-4 opacity-50" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h.01M15 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p class="text-lg font-medium mb-2" style="color: var(--color-text);">
              No commands found
            </p>
            <p style="color: var(--color-textSecondary);">
              Try a different search term
            </p>
          </div>
        {:else}
          {#each filteredCommands as command, index}
            <button
              data-index={index}
              class="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-opacity-75 transition-colors {index === selectedIndex ? 'ring-2 ring-inset' : ''}"
              style="background-color: {index === selectedIndex ? 'var(--color-primary)' : 'transparent'}; color: var(--color-text); ring-color: var(--color-primary);"
              on:click={() => executeCommand(command)}
              on:mouseenter={() => selectedIndex = index}
            >
              <!-- Icon -->
              <div class="flex-shrink-0">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={getIcon(command.icon)} />
                </svg>
              </div>

              <!-- Command Info -->
              <div class="flex-1 min-w-0">
                <p class="font-medium truncate">
                  {command.name}
                </p>
                <p class="text-sm opacity-75 truncate">
                  {command.description}
                </p>
              </div>

              <!-- Shortcut -->
              {#if command.shortcut}
                <div class="flex-shrink-0">
                  <kbd 
                    class="inline-flex items-center px-2 py-1 text-xs font-mono rounded border shadow-sm opacity-75"
                    style="background-color: var(--color-background); border-color: var(--color-border); color: var(--color-textSecondary);"
                  >
                    {formatShortcut(command.shortcut)}
                  </kbd>
                </div>
              {/if}
            </button>
          {/each}
        {/if}
      </div>

      <!-- Footer -->
      {#if filteredCommands.length > 0}
        <div class="px-4 py-3 border-t text-xs flex items-center justify-between" style="background-color: var(--color-background); border-color: var(--color-border); color: var(--color-textSecondary);">
          <div class="flex items-center gap-4">
            <span class="flex items-center gap-1">
              <kbd class="px-1 py-0.5 rounded border" style="border-color: var(--color-border);">↵</kbd>
              to select
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1 py-0.5 rounded border" style="border-color: var(--color-border);">↑↓</kbd>
              to navigate
            </span>
            <span class="flex items-center gap-1">
              <kbd class="px-1 py-0.5 rounded border" style="border-color: var(--color-border);">Esc</kbd>
              to close
            </span>
          </div>
          <span>{filteredCommands.length} commands</span>
        </div>
      {/if}
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
    animation: fadeIn 0.15s ease-out;
  }

  .fixed > div {
    animation: slideDown 0.15s ease-out;
  }

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }

  @keyframes slideDown {
    from { 
      opacity: 0;
      transform: translateY(-20px) scale(0.95); 
    }
    to { 
      opacity: 1;
      transform: translateY(0) scale(1); 
    }
  }

  /* Custom scrollbar */
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