<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Star, Trash2, Edit3, Clock, Search } from 'lucide-svelte';
  import { savedSearches, savedSearchStore, type SavedSearch } from '$lib/stores/savedSearches';

  const dispatch = createEventDispatcher<{
    select: { search: SavedSearch };
    close: void;
  }>();

  export let currentQuery: string = '';
  export let currentSearchType: 'all' | 'notes' | 'workspaces' | 'files' = 'all';

  let editingId: string | null = null;
  let editName: string = '';

  // Filter searches based on current query
  $: filteredSearches = currentQuery.trim() 
    ? savedSearchStore.getSuggestions(currentQuery)
    : $savedSearches.slice(0, 10);

  function selectSearch(search: SavedSearch) {
    savedSearchStore.markAsUsed(search.id);
    dispatch('select', { search });
  }

  function deleteSearch(searchId: string, event: Event) {
    event.stopPropagation();
    savedSearchStore.delete(searchId);
  }

  function startEditing(search: SavedSearch, event: Event) {
    event.stopPropagation();
    editingId = search.id;
    editName = search.name;
  }

  function saveEdit() {
    if (editingId && editName.trim()) {
      savedSearchStore.rename(editingId, editName.trim());
    }
    editingId = null;
    editName = '';
  }

  function cancelEdit() {
    editingId = null;
    editName = '';
  }

  function handleEditKeydown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
    }
  }

  function saveCurrentSearch() {
    if (currentQuery.trim()) {
      const name = `Search: ${currentQuery}`;
      savedSearchStore.save(name, currentQuery, currentSearchType);
    }
  }

  function formatDate(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return 'Today';
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString();
    }
  }

  function getSearchTypeLabel(type: SavedSearch['searchType']): string {
    switch (type) {
      case 'all': return 'All';
      case 'notes': return 'Notes';
      case 'workspaces': return 'Workspaces';
      case 'files': return 'Files';
      default: return 'All';
    }
  }

  function getSearchTypeColor(type: SavedSearch['searchType']): string {
    switch (type) {
      case 'notes': return 'text-blue-400 bg-blue-400/10';
      case 'workspaces': return 'text-green-400 bg-green-400/10';
      case 'files': return 'text-purple-400 bg-purple-400/10';
      default: return 'text-gray-400 bg-gray-400/10';
    }
  }
</script>

<div class="bg-dark-800 rounded-lg border border-dark-700 shadow-lg max-h-96 overflow-hidden flex flex-col">
  <!-- Header -->
  <div class="p-4 border-b border-dark-700">
    <div class="flex items-center justify-between">
      <h3 class="text-lg font-medium text-white">Saved Searches</h3>
      {#if currentQuery.trim()}
        <button
          class="text-sm text-primary-400 hover:text-primary-300 flex items-center space-x-1"
          on:click={saveCurrentSearch}
        >
          <Star class="w-4 h-4" />
          <span>Save</span>
        </button>
      {/if}
    </div>
  </div>

  <!-- Search List -->
  <div class="flex-1 overflow-y-auto">
    {#if filteredSearches.length === 0}
      <div class="p-6 text-center">
        <Search class="w-12 h-12 text-dark-600 mx-auto mb-3" />
        <p class="text-dark-400 text-sm">No saved searches yet</p>
        {#if currentQuery.trim()}
          <button
            class="mt-2 text-primary-400 hover:text-primary-300 text-sm"
            on:click={saveCurrentSearch}
          >
            Save current search
          </button>
        {/if}
      </div>
    {:else}
      <div class="py-2">
        {#each filteredSearches as search (search.id)}
          <div
            class="px-4 py-3 hover:bg-dark-700 cursor-pointer border-b border-dark-800 last:border-b-0"
            on:click={() => selectSearch(search)}
            role="button"
            tabindex="0"
            on:keydown={(e) => e.key === 'Enter' && selectSearch(search)}
          >
            <div class="flex items-start justify-between">
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2 mb-1">
                  {#if editingId === search.id}
                    <input
                      type="text"
                      bind:value={editName}
                      on:keydown={handleEditKeydown}
                      on:blur={saveEdit}
                      class="bg-dark-900 text-white text-sm px-2 py-1 rounded border border-dark-600 focus:border-primary-500 focus:outline-none flex-1"
                      placeholder="Search name"
                      autofocus
                    />
                  {:else}
                    <h4 class="text-white font-medium text-sm truncate">{search.name}</h4>
                  {/if}
                  <span class="text-xs px-2 py-1 rounded-full {getSearchTypeColor(search.searchType)}">
                    {getSearchTypeLabel(search.searchType)}
                  </span>
                </div>
                
                <p class="text-dark-300 text-xs mb-2 truncate">"{search.query}"</p>
                
                <div class="flex items-center space-x-3 text-xs text-dark-500">
                  <div class="flex items-center space-x-1">
                    <Clock class="w-3 h-3" />
                    <span>{formatDate(search.lastUsed)}</span>
                  </div>
                  <span>Used {search.useCount} time{search.useCount !== 1 ? 's' : ''}</span>
                </div>
              </div>

              <div class="flex items-center space-x-1 ml-2">
                <button
                  class="p-1 text-dark-400 hover:text-white rounded"
                  on:click={(e) => startEditing(search, e)}
                  title="Rename"
                >
                  <Edit3 class="w-3 h-3" />
                </button>
                <button
                  class="p-1 text-dark-400 hover:text-red-400 rounded"
                  on:click={(e) => deleteSearch(search.id, e)}
                  title="Delete"
                >
                  <Trash2 class="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</div>