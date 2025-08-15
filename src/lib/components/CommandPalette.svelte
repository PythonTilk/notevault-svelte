<script>
  import { createEventDispatcher, onMount, onDestroy, tick } from 'svelte';
  import { registerShortcut, formatShortcut } from '$lib/stores/shortcuts';
  import { browser } from '$app/environment';

  const dispatch = createEventDispatcher();

  export let isOpen = false;

  let searchQuery = '';
  let selectedIndex = 0;
  let searchInput;
  let commandsContainer;
  let cleanupShortcuts = [];
  
  // Enhanced features
  let commandHistory = [];
  let favoriteCommands = new Set();
  let showHistory = false;
  let showFavorites = false;
  
  // Load persisted data
  onMount(() => {
    if (browser) {
      const storedHistory = localStorage.getItem('notevault-command-history');
      if (storedHistory) {
        try {
          commandHistory = JSON.parse(storedHistory);
        } catch (e) {
          console.warn('Failed to parse command history:', e);
        }
      }
      
      const storedFavorites = localStorage.getItem('notevault-command-favorites');
      if (storedFavorites) {
        try {
          favoriteCommands = new Set(JSON.parse(storedFavorites));
        } catch (e) {
          console.warn('Failed to parse command favorites:', e);
        }
      }
    }
  });

  // Available commands
  const commands = [
    // Navigation
    { 
      id: 'go-to-home', 
      name: 'Go to Dashboard', 
      description: 'Navigate to the main dashboard',
      category: 'Navigation',
      shortcut: 'mod+home',
      icon: 'home'
    },
    { 
      id: 'go-to-workspaces', 
      name: 'Go to Workspaces', 
      description: 'Navigate to workspaces page',
      category: 'Navigation',
      shortcut: 'mod+1',
      icon: 'workspace'
    },
    { 
      id: 'go-to-chat', 
      name: 'Go to Chat', 
      description: 'Navigate to team chat',
      category: 'Navigation',
      shortcut: 'mod+2',
      icon: 'chat'
    },
    { 
      id: 'go-to-files', 
      name: 'Go to Files', 
      description: 'Navigate to file manager',
      category: 'Navigation',
      shortcut: 'mod+3',
      icon: 'file'
    },
    { 
      id: 'go-to-calendar', 
      name: 'Go to Calendar', 
      description: 'Navigate to calendar view',
      category: 'Navigation',
      shortcut: 'mod+4',
      icon: 'calendar'
    },
    { 
      id: 'go-to-notifications', 
      name: 'Go to Notifications', 
      description: 'Navigate to notifications page',
      category: 'Navigation',
      shortcut: 'mod+5',
      icon: 'bell'
    },
    
    // Actions
    { 
      id: 'new-workspace', 
      name: 'New Workspace', 
      description: 'Create a new workspace',
      category: 'Actions',
      shortcut: 'mod+shift+n',
      icon: 'plus'
    },
    { 
      id: 'new-note', 
      name: 'New Note', 
      description: 'Create a new note',
      category: 'Actions',
      shortcut: 'mod+n',
      icon: 'plus'
    },
    { 
      id: 'upload-file', 
      name: 'Upload File', 
      description: 'Upload a new file',
      category: 'Actions',
      shortcut: 'mod+u',
      icon: 'upload'
    },
    { 
      id: 'schedule-meeting', 
      name: 'Schedule Meeting', 
      description: 'Create a new calendar event',
      category: 'Actions',
      shortcut: 'mod+m',
      icon: 'calendar'
    },
    
    // Search
    { 
      id: 'search-everything', 
      name: 'Search Everything', 
      description: 'Search across all content',
      category: 'Search',
      shortcut: 'mod+f',
      icon: 'search'
    },
    { 
      id: 'find-workspace', 
      name: 'Find Workspace', 
      description: 'Search for workspaces',
      category: 'Search',
      shortcut: 'mod+shift+w',
      icon: 'search'
    },
    { 
      id: 'find-files', 
      name: 'Find Files', 
      description: 'Search for files',
      category: 'Search',
      shortcut: 'mod+shift+f',
      icon: 'search'
    },
    
    // UI Control
    { 
      id: 'toggle-sidebar', 
      name: 'Toggle Sidebar', 
      description: 'Show/hide the left sidebar',
      category: 'View',
      shortcut: 'mod+b',
      icon: 'sidebar'
    },
    { 
      id: 'toggle-right-panel', 
      name: 'Toggle Right Panel', 
      description: 'Show/hide the right panel',
      category: 'View',
      shortcut: 'mod+shift+b',
      icon: 'panel'
    },
    { 
      id: 'focus-mode', 
      name: 'Focus Mode', 
      description: 'Hide all panels for distraction-free work',
      category: 'View',
      shortcut: 'mod+shift+d',
      icon: 'focus'
    },
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
      category: 'Settings',
      shortcut: 'mod+comma',
      icon: 'settings'
    },
    { 
      id: 'open-integrations', 
      name: 'Open Integrations', 
      description: 'Manage app integrations',
      category: 'Settings',
      shortcut: 'mod+i',
      icon: 'settings'
    },
    { 
      id: 'change-theme', 
      name: 'Change Theme', 
      description: 'Customize appearance settings',
      category: 'Settings',
      shortcut: 'mod+t',
      icon: 'palette'
    },
    { 
      id: 'show-shortcuts', 
      name: 'Show Shortcuts', 
      description: 'Display keyboard shortcuts help',
      category: 'Help',
      shortcut: 'mod+shift+slash',
      icon: 'keyboard'
    },
    { 
      id: 'show-help', 
      name: 'Show Help', 
      description: 'Open help documentation',
      category: 'Help',
      shortcut: 'f1',
      icon: 'help'
    },
    { 
      id: 'show-about', 
      name: 'About NoteVault', 
      description: 'Show application information',
      category: 'Help',
      shortcut: null,
      icon: 'info'
    }
  ];

  // Fuzzy search implementation
  function fuzzyMatch(str, pattern) {
    if (!pattern) return true;
    
    const patternLower = pattern.toLowerCase();
    const strLower = str.toLowerCase();
    
    // Exact match gets highest score
    if (strLower.includes(patternLower)) return 10;
    
    // Fuzzy matching
    let patternIndex = 0;
    let score = 0;
    
    for (let i = 0; i < strLower.length && patternIndex < patternLower.length; i++) {
      if (strLower[i] === patternLower[patternIndex]) {
        score += 1;
        patternIndex++;
      }
    }
    
    return patternIndex === patternLower.length ? score : 0;
  }
  
  function getCommandScore(cmd, query) {
    if (!query) {
      // When no query, prioritize favorites and history
      let score = 0;
      if (favoriteCommands.has(cmd.id)) score += 1000;
      const historyIndex = commandHistory.findIndex(h => h.id === cmd.id);
      if (historyIndex >= 0) score += 100 - historyIndex; // More recent = higher score
      return score;
    }
    
    const nameScore = fuzzyMatch(cmd.name, query) * 10;
    const descScore = fuzzyMatch(cmd.description, query) * 5;
    const categoryScore = fuzzyMatch(cmd.category, query) * 2;
    
    let totalScore = nameScore + descScore + categoryScore;
    
    // Boost favorites and recent commands
    if (favoriteCommands.has(cmd.id)) totalScore += 50;
    const historyIndex = commandHistory.findIndex(h => h.id === cmd.id);
    if (historyIndex >= 0) totalScore += 10 - historyIndex;
    
    return totalScore;
  }
  
  // Enhanced filtering with fuzzy search and sorting
  $: filteredCommands = (() => {
    const query = searchQuery.trim();
    
    if (showHistory && commandHistory.length > 0) {
      return commandHistory.slice(0, 10); // Show recent 10 commands
    }
    
    if (showFavorites && favoriteCommands.size > 0) {
      return commands.filter(cmd => favoriteCommands.has(cmd.id));
    }
    
    if (query === '') {
      // Show favorites and recent commands first when no search
      const scored = commands.map(cmd => ({ cmd, score: getCommandScore(cmd, '') }));
      return scored
        .sort((a, b) => b.score - a.score)
        .map(item => item.cmd)
        .slice(0, 20); // Limit to top 20
    }
    
    // Fuzzy search with scoring
    const scored = commands
      .map(cmd => ({ cmd, score: getCommandScore(cmd, query) }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.cmd);
    
    return scored.slice(0, 50); // Limit search results
  })();

  // Reset selected index when filtered commands change
  $: if (filteredCommands) {
    selectedIndex = Math.min(selectedIndex, Math.max(0, filteredCommands.length - 1));
  }

  function close() {
    isOpen = false;
    searchQuery = '';
    selectedIndex = 0;
    showHistory = false;
    showFavorites = false;
    dispatch('close');
  }

  function executeCommand(command) {
    // Add to command history
    addToHistory(command);
    
    close();
    dispatch('execute', { command: command.id, data: command });
  }
  
  function addToHistory(command) {
    if (!browser) return;
    
    // Remove if already exists to avoid duplicates
    commandHistory = commandHistory.filter(cmd => cmd.id !== command.id);
    
    // Add to beginning
    commandHistory.unshift({ ...command, timestamp: Date.now() });
    
    // Keep only last 50 commands
    commandHistory = commandHistory.slice(0, 50);
    
    // Persist to localStorage
    try {
      localStorage.setItem('notevault-command-history', JSON.stringify(commandHistory));
    } catch (e) {
      console.warn('Failed to save command history:', e);
    }
  }
  
  function toggleFavorite(command, event) {
    event.stopPropagation();
    
    if (favoriteCommands.has(command.id)) {
      favoriteCommands.delete(command.id);
    } else {
      favoriteCommands.add(command.id);
    }
    
    favoriteCommands = new Set(favoriteCommands); // Trigger reactivity
    
    // Persist to localStorage
    if (browser) {
      try {
        localStorage.setItem('notevault-command-favorites', JSON.stringify([...favoriteCommands]));
      } catch (e) {
        console.warn('Failed to save command favorites:', e);
      }
    }
  }
  
  function clearHistory() {
    commandHistory = [];
    if (browser) {
      localStorage.removeItem('notevault-command-history');
    }
    showHistory = false;
  }
  
  function clearFavorites() {
    favoriteCommands.clear();
    favoriteCommands = new Set(favoriteCommands);
    if (browser) {
      localStorage.removeItem('notevault-command-favorites');
    }
    showFavorites = false;
  }

  function handleKeydown(event) {
    if (!isOpen) return;

    switch (event.key) {
      case 'Escape':
        event.preventDefault();
        if (showHistory || showFavorites) {
          showHistory = false;
          showFavorites = false;
          searchQuery = '';
        } else {
          close();
        }
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
        
      case 'Tab':
        event.preventDefault();
        // Toggle between normal, history, and favorites views
        if (!showHistory && !showFavorites) {
          if (commandHistory.length > 0) {
            showHistory = true;
            searchQuery = '';
          } else if (favoriteCommands.size > 0) {
            showFavorites = true;
            searchQuery = '';
          }
        } else if (showHistory) {
          showHistory = false;
          if (favoriteCommands.size > 0) {
            showFavorites = true;
          }
          searchQuery = '';
        } else if (showFavorites) {
          showFavorites = false;
          searchQuery = '';
        }
        selectedIndex = 0;
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
      // Navigation
      home: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      workspace: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10',
      chat: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
      file: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      bell: 'M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9',
      
      // Actions
      plus: 'M12 4v16m8-8H4',
      upload: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      
      // Search
      search: 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      
      // View
      sidebar: 'M4 6h16M4 12h16M4 18h16',
      panel: 'M9 12l2 2 4-4',
      focus: 'M15 10l4.55-2.55A1 1 0 0121 8.45v7.1a1 1 0 01-1.45 1.45L15 14v-4zM5 12a7 7 0 1114 0 7 7 0 01-14 0z',
      'zoom-in': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7',
      'zoom-out': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM7 10h6',
      'zoom-reset': 'M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z',
      
      // Settings
      settings: 'M12 15a3 3 0 100-6 3 3 0 000 6z M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z',
      palette: 'M7 21a4 4 0 01-4-4 4 4 0 014-4 4 4 0 014 4 4 4 0 01-4 4zm0-8a4 4 0 110-8 4 4 0 010 8zm8 8a4 4 0 100-8 4 4 0 000 8zm0-8a4 4 0 110-8 4 4 0 010 8z',
      
      // Help
      keyboard: 'M2 6a2 2 0 012-2h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm4 2v2h2V8H6zm4 0v2h4V8h-4zm6 0v2h2V8h-2zM6 12v2h2v-2H6zm4 0v2h8v-2h-8z',
      help: 'M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
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
            placeholder={showHistory ? 'Recent commands...' : showFavorites ? 'Favorite commands...' : 'Type a command or search...'}
            bind:value={searchQuery}
            class="w-full pl-10 pr-20 py-3 text-lg rounded-lg border-0 focus:outline-none"
            style="background-color: transparent; color: var(--color-text);"
          />
          
          <!-- Mode indicators and controls -->
          <div class="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
            {#if commandHistory.length > 0}
              <button
                class="p-1 rounded text-xs transition-colors {showHistory ? 'bg-blue-600 text-white' : 'text-blue-400 hover:bg-blue-600 hover:text-white'}"
                on:click={() => { showHistory = !showHistory; showFavorites = false; searchQuery = ''; selectedIndex = 0; }}
                title="Recent commands (Tab)"
              >
                H
              </button>
            {/if}
            {#if favoriteCommands.size > 0}
              <button
                class="p-1 rounded text-xs transition-colors {showFavorites ? 'bg-yellow-600 text-white' : 'text-yellow-400 hover:bg-yellow-600 hover:text-white'}"
                on:click={() => { showFavorites = !showFavorites; showHistory = false; searchQuery = ''; selectedIndex = 0; }}
                title="Favorite commands (Tab)"
              >
                ★
              </button>
            {/if}
          </div>
        </div>
      </div>

      <!-- Commands List -->
      <div bind:this={commandsContainer} class="max-h-96 overflow-y-auto">
        <!-- Header for current view -->
        {#if showHistory || showFavorites}
          <div class="px-4 py-2 border-b flex items-center justify-between" style="background-color: var(--color-background); border-color: var(--color-border);">
            <div class="flex items-center space-x-2">
              {#if showHistory}
                <span class="text-sm font-medium" style="color: var(--color-text);">Recent Commands</span>
                <span class="text-xs px-2 py-1 rounded" style="background-color: var(--color-primary); color: white;">{commandHistory.length}</span>
              {:else if showFavorites}
                <span class="text-sm font-medium" style="color: var(--color-text);">Favorite Commands</span>
                <span class="text-xs px-2 py-1 rounded" style="background-color: var(--color-primary); color: white;">{favoriteCommands.size}</span>
              {/if}
            </div>
            <div class="flex items-center space-x-1">
              {#if showHistory && commandHistory.length > 0}
                <button
                  on:click={clearHistory}
                  class="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                  title="Clear history"
                >
                  Clear
                </button>
              {/if}
              {#if showFavorites && favoriteCommands.size > 0}
                <button
                  on:click={clearFavorites}
                  class="text-xs px-2 py-1 rounded text-red-400 hover:bg-red-600 hover:text-white transition-colors"
                  title="Clear favorites"
                >
                  Clear
                </button>
              {/if}
              <button
                on:click={() => { showHistory = false; showFavorites = false; searchQuery = ''; }}
                class="text-xs px-2 py-1 rounded" style="color: var(--color-textSecondary); hover:color: var(--color-text);"
                title="Back to all commands"
              >
                ✕
              </button>
            </div>
          </div>
        {/if}
        
        {#if filteredCommands.length === 0}
          <div class="p-8 text-center">
            {#if showHistory}
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-lg font-medium mb-2" style="color: var(--color-text);">
                No command history
              </p>
              <p style="color: var(--color-textSecondary);">
                Commands you use will appear here
              </p>
            {:else if showFavorites}
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              <p class="text-lg font-medium mb-2" style="color: var(--color-text);">
                No favorite commands
              </p>
              <p style="color: var(--color-textSecondary);">
                Star commands to add them to favorites
              </p>
            {:else}
              <svg class="w-16 h-16 mx-auto mb-4 opacity-50" style="color: var(--color-textSecondary);" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 12h.01M15 12h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-lg font-medium mb-2" style="color: var(--color-text);">
                No commands found
              </p>
              <p style="color: var(--color-textSecondary);">
                Try a different search term
              </p>
            {/if}
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
                <div class="flex items-center space-x-2">
                  <p class="font-medium truncate">
                    {command.name}
                  </p>
                  {#if showHistory && command.timestamp}
                    <span class="text-xs px-1 py-0.5 rounded opacity-60" style="background-color: var(--color-border); color: var(--color-textSecondary);">
                      {new Date(command.timestamp).toLocaleDateString()}
                    </span>
                  {/if}
                </div>
                <p class="text-sm opacity-75 truncate">
                  {command.description}
                </p>
              </div>

              <!-- Favorite star and shortcut -->
              <div class="flex items-center space-x-2">
                <div
                  class="p-1 rounded transition-colors cursor-pointer {favoriteCommands.has(command.id) ? 'text-yellow-400' : 'text-gray-500 hover:text-yellow-400'}"
                  on:click={(e) => toggleFavorite(command, e)}
                  on:keydown={(e) => e.key === 'Enter' && toggleFavorite(command, e)}
                  title={favoriteCommands.has(command.id) ? 'Remove from favorites' : 'Add to favorites'}
                  role="button"
                  tabindex="0"
                >
                  <svg class="w-4 h-4" fill={favoriteCommands.has(command.id) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                  </svg>
                </div>
                
                {#if command.shortcut}
                  <kbd 
                    class="inline-flex items-center px-2 py-1 text-xs font-mono rounded border shadow-sm opacity-75"
                    style="background-color: var(--color-background); border-color: var(--color-border); color: var(--color-textSecondary);"
                  >
                    {formatShortcut(command.shortcut)}
                  </kbd>
                {/if}
              </div>
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
            {#if commandHistory.length > 0 || favoriteCommands.size > 0}
              <span class="flex items-center gap-1">
                <kbd class="px-1 py-0.5 rounded border" style="border-color: var(--color-border);">Tab</kbd>
                to switch modes
              </span>
            {/if}
            <span class="flex items-center gap-1">
              <kbd class="px-1 py-0.5 rounded border" style="border-color: var(--color-border);">Esc</kbd>
              to close
            </span>
          </div>
          <div class="flex items-center space-x-3">
            {#if showHistory}
              <span>Recent: {filteredCommands.length}</span>
            {:else if showFavorites}
              <span>Favorites: {filteredCommands.length}</span>
            {:else}
              <span>{filteredCommands.length} commands</span>
            {/if}
            {#if favoriteCommands.size > 0}
              <span class="flex items-center space-x-1">
                <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                </svg>
                <span>{favoriteCommands.size}</span>
              </span>
            {/if}
          </div>
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