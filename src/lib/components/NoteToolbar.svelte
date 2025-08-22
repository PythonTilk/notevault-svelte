<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { 
    Search, 
    Filter, 
    SortAsc, 
    SortDesc, 
    Grid, 
    List, 
    Map,
    Calendar,
    Tag,
    Eye,
    EyeOff,
    X,
    CheckSquare,
    Square
  } from 'lucide-svelte';
  import type { Note } from '$lib/types';
  import type { NoteSortBy, NoteSortOrder, NoteViewMode } from '$lib/stores/noteManagement';
  import TagFilter from './TagFilter.svelte';

  export let notes: Note[] = [];
  export let filteredCount: number = 0;
  export let selectedTags: string[] = [];
  export let sortBy: NoteSortBy = 'updated';
  export let sortOrder: NoteSortOrder = 'desc';
  export let viewMode: NoteViewMode = 'canvas';
  export let searchQuery: string = '';
  export let typeFilter: string | null = null;
  export let visibilityFilter: boolean | null = null;
  export let selectedNotes: string[] = [];
  export let showBulkActions: boolean = false;

  const dispatch = createEventDispatcher<{
    searchChange: { query: string };
    tagsChange: { tags: string[] };
    sortChange: { sortBy: NoteSortBy; sortOrder: NoteSortOrder };
    viewModeChange: { viewMode: NoteViewMode };
    typeFilterChange: { type: string | null };
    visibilityFilterChange: { isPublic: boolean | null };
    clearFilters: void;
    selectAll: void;
    clearSelection: void;
    bulkDelete: { noteIds: string[] };
    bulkAddTag: { noteIds: string[]; tag: string };
  }>();

  let showFilters = false;
  let showAdvanced = false;

  // Get unique note types
  $: noteTypes = Array.from(new Set(notes.map(note => note.type)));
  
  // Get available tags
  $: availableTags = Array.from(new Set(notes.flatMap(note => note.tags))).sort();

  // Check if any filters are active
  $: hasActiveFilters = selectedTags.length > 0 || typeFilter || visibilityFilter !== null || searchQuery.trim();

  function handleSortClick(newSortBy: NoteSortBy) {
    if (sortBy === newSortBy) {
      // Toggle order if same field
      dispatch('sortChange', { 
        sortBy, 
        sortOrder: sortOrder === 'asc' ? 'desc' : 'asc' 
      });
    } else {
      // New field, default to desc
      dispatch('sortChange', { sortBy: newSortBy, sortOrder: 'desc' });
    }
  }

  function getSortIcon(field: NoteSortBy) {
    if (sortBy !== field) return SortDesc;
    return sortOrder === 'desc' ? SortDesc : SortAsc;
  }

  function handleSelectAll() {
    if (selectedNotes.length === filteredCount) {
      dispatch('clearSelection');
    } else {
      dispatch('selectAll');
    }
  }
</script>

<div class="bg-dark-800 border border-dark-700 rounded-lg">
  <!-- Main toolbar -->
  <div class="flex items-center justify-between p-4">
    <div class="flex items-center space-x-4">
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          placeholder="Search notes..."
          bind:value={searchQuery}
          on:input={(e) => dispatch('searchChange', { query: e.currentTarget.value })}
          class="pl-10 pr-4 py-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white placeholder-dark-400 focus:border-primary-500 focus:outline-none"
        />
        {#if searchQuery}
          <button
            class="absolute right-2 top-1/2 transform -translate-y-1/2 text-dark-400 hover:text-white"
            on:click={() => dispatch('searchChange', { query: '' })}
          >
            <X class="w-4 h-4" />
          </button>
        {/if}
      </div>

      <!-- Filters toggle -->
      <button
        class="flex items-center gap-2 px-3 py-2 text-sm rounded-lg transition-colors {showFilters || hasActiveFilters ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
        on:click={() => showFilters = !showFilters}
      >
        <Filter class="w-4 h-4" />
        Filters
        {#if hasActiveFilters}
          <span class="bg-primary-500 text-white text-xs px-1.5 py-0.5 rounded-full">
            {selectedTags.length + (typeFilter ? 1 : 0) + (visibilityFilter !== null ? 1 : 0) + (searchQuery ? 1 : 0)}
          </span>
        {/if}
      </button>

      <!-- Results count -->
      <div class="text-sm text-dark-400">
        {filteredCount} of {notes.length} notes
      </div>
    </div>

    <div class="flex items-center space-x-2">
      <!-- Bulk actions -->
      {#if showBulkActions && selectedNotes.length > 0}
        <div class="flex items-center gap-2 px-3 py-2 bg-primary-600/10 border border-primary-600/30 rounded-lg">
          <span class="text-sm text-primary-300">{selectedNotes.length} selected</span>
          <button
            class="text-sm text-red-400 hover:text-red-300 px-2 py-1 rounded"
            on:click={() => dispatch('bulkDelete', { noteIds: selectedNotes })}
          >
            Delete
          </button>
          <button
            class="text-sm text-dark-400 hover:text-white px-2 py-1 rounded"
            on:click={() => dispatch('clearSelection')}
          >
            Clear
          </button>
        </div>
      {/if}

      <!-- Selection toggle -->
      {#if notes.length > 0}
        <button
          class="p-2 text-dark-400 hover:text-white rounded-lg transition-colors"
          on:click={handleSelectAll}
          title={selectedNotes.length === filteredCount ? 'Deselect all' : 'Select all'}
        >
          <svelte:component this={selectedNotes.length === filteredCount ? CheckSquare : Square} class="w-4 h-4" />
        </button>
      {/if}

      <!-- Sort -->
      <div class="flex items-center border border-dark-600 rounded-lg overflow-hidden">
        <button
          class="p-2 transition-colors {sortBy === 'updated' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => handleSortClick('updated')}
          title="Sort by last updated"
        >
          <svelte:component this={getSortIcon('updated')} class="w-4 h-4" />
        </button>
        <button
          class="p-2 transition-colors {sortBy === 'title' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => handleSortClick('title')}
          title="Sort by title"
        >
          <svelte:component this={getSortIcon('title')} class="w-4 h-4" />
        </button>
        <button
          class="p-2 transition-colors {sortBy === 'created' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => handleSortClick('created')}
          title="Sort by created date"
        >
          <Calendar class="w-4 h-4" />
        </button>
      </div>

      <!-- View mode -->
      <div class="flex items-center border border-dark-600 rounded-lg overflow-hidden">
        <button
          class="p-2 transition-colors {viewMode === 'canvas' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => dispatch('viewModeChange', { viewMode: 'canvas' })}
          title="Canvas view"
        >
          <Map class="w-4 h-4" />
        </button>
        <button
          class="p-2 transition-colors {viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => dispatch('viewModeChange', { viewMode: 'grid' })}
          title="Grid view"
        >
          <Grid class="w-4 h-4" />
        </button>
        <button
          class="p-2 transition-colors {viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-700'}"
          on:click={() => dispatch('viewModeChange', { viewMode: 'list' })}
          title="List view"
        >
          <List class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Filters panel -->
  {#if showFilters}
    <div class="border-t border-dark-700 p-4">
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <!-- Tag filter -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-2">Tags</label>
          <TagFilter 
            {selectedTags}
            {availableTags}
            compact={true}
            on:change={(e) => dispatch('tagsChange', { tags: e.detail.selectedTags })}
          />
        </div>

        <!-- Type filter -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-2">Note Type</label>
          <select
            bind:value={typeFilter}
            on:change={(e) => dispatch('typeFilterChange', { type: e.currentTarget.value || null })}
            class="w-full p-2 bg-dark-900 border border-dark-600 rounded-lg text-sm text-white focus:border-primary-500 focus:outline-none"
          >
            <option value="">All types</option>
            {#each noteTypes as type}
              <option value={type}>{type}</option>
            {/each}
          </select>
        </div>

        <!-- Visibility filter -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-2">Visibility</label>
          <div class="flex items-center gap-2">
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors {visibilityFilter === null ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
              on:click={() => dispatch('visibilityFilterChange', { isPublic: null })}
            >
              All
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors {visibilityFilter === true ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
              on:click={() => dispatch('visibilityFilterChange', { isPublic: true })}
            >
              <Eye class="w-3 h-3" />
              Public
            </button>
            <button
              class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors {visibilityFilter === false ? 'bg-primary-600 text-white' : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
              on:click={() => dispatch('visibilityFilterChange', { isPublic: false })}
            >
              <EyeOff class="w-3 h-3" />
              Private
            </button>
          </div>
        </div>
      </div>

      <!-- Clear filters -->
      {#if hasActiveFilters}
        <div class="mt-4 pt-4 border-t border-dark-700">
          <button
            class="text-sm text-dark-400 hover:text-white transition-colors"
            on:click={() => dispatch('clearFilters')}
          >
            Clear all filters
          </button>
        </div>
      {/if}
    </div>
  {/if}
</div>