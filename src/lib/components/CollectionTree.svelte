<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { 
    ChevronRight, 
    ChevronDown, 
    Plus, 
    MoreHorizontal,
    Edit3,
    Trash2,
    Move
  } from 'lucide-svelte';
  import type { NoteCollection, Note } from '$lib/types';
  import { collectionStore } from '$lib/stores/collections';

  export let collections: NoteCollection[] = [];
  export let notes: Note[] = [];
  export let selectedCollectionId: string | null = null;
  export let expandable: boolean = true;
  export let showActions: boolean = true;
  export let showNoteCounts: boolean = true;
  export let compact: boolean = false;

  const dispatch = createEventDispatcher<{
    selectCollection: { collection: NoteCollection | null };
    createCollection: { parentId?: string };
    editCollection: { collection: NoteCollection };
    deleteCollection: { collection: NoteCollection };
    moveCollection: { collection: NoteCollection };
    dropNote: { noteId: string; collectionId: string | null };
  }>();

  let showMenu: string | null = null;

  function getCollectionNoteCount(collectionId: string): number {
    return notes.filter(note => note.collectionId === collectionId).length;
  }

  function handleCollectionClick(collection: NoteCollection | null) {
    dispatch('selectCollection', { collection });
  }

  function handleToggleExpanded(collection: NoteCollection) {
    if (expandable) {
      collectionStore.toggleExpanded(collection.id);
    }
  }

  function handleCreateSubCollection(parentId: string) {
    dispatch('createCollection', { parentId });
    showMenu = null;
  }

  function handleEditCollection(collection: NoteCollection) {
    dispatch('editCollection', { collection });
    showMenu = null;
  }

  function handleDeleteCollection(collection: NoteCollection) {
    dispatch('deleteCollection', { collection });
    showMenu = null;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
  }

  function handleDrop(event: DragEvent, collectionId: string | null) {
    event.preventDefault();
    const noteId = event.dataTransfer?.getData('text/plain');
    if (noteId) {
      dispatch('dropNote', { noteId, collectionId });
    }
  }

  // Build flat list with proper nesting levels
  $: flattenedCollections = collections.reduce((acc: (NoteCollection & { level: number })[], collection) => {
    function flatten(col: NoteCollection, level = 0): (NoteCollection & { level: number })[] {
      const result: (NoteCollection & { level: number })[] = [{ ...col, level }];
      
      // Add children if expanded
      if (col.isExpanded) {
        const children = collections.filter(c => c.parentId === col.id);
        for (const child of children) {
          result.push(...flatten(child, level + 1));
        }
      }
      
      return result;
    }
    
    // Only add root-level collections (no parentId)
    if (!collection.parentId) {
      acc.push(...flatten(collection));
    }
    
    return acc;
  }, []);
</script>

<div class="collection-tree space-y-1">
  <!-- Root level (Uncategorized) -->
  <div
    class="flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-colors group"
    class:bg-primary-600={selectedCollectionId === null}
    class:text-primary-300={selectedCollectionId === null}
    class:hover:bg-dark-800={selectedCollectionId !== null}
    class:text-dark-300={selectedCollectionId !== null}
    class:hover:text-white={selectedCollectionId !== null}
    role="button"
    tabindex="0"
    on:click={() => handleCollectionClick(null)}
    on:dragover={handleDragOver}
    on:drop={(e) => handleDrop(e, null)}
  >
    <div class="flex items-center space-x-2">
      <div class="w-4 h-4"></div>
      <div class="text-lg">📋</div>
      <span class="font-medium text-sm" class:text-xs={compact}>
        Uncategorized
      </span>
      {#if showNoteCounts}
        {@const uncategorizedCount = notes.filter(n => !n.collectionId).length}
        {#if uncategorizedCount > 0}
          <span class="text-xs ml-auto"
            class:text-primary-400={selectedCollectionId === null}
            class:text-dark-500={selectedCollectionId !== null}>
            {uncategorizedCount}
          </span>
        {/if}
      {/if}
    </div>
  </div>

  <!-- Collections tree -->
  {#each flattenedCollections as collection (collection.id)}
    {@const hasChildren = collections.some(c => c.parentId === collection.id)}
    {@const noteCount = showNoteCounts ? getCollectionNoteCount(collection.id) : 0}
    {@const isSelected = selectedCollectionId === collection.id}
    {@const indentStyle = `margin-left: ${collection.level * 16}px`}
    
    <div
      class="flex items-center justify-between py-2 px-2 rounded-lg cursor-pointer transition-colors group relative"
      class:bg-primary-600={isSelected}
      class:text-primary-300={isSelected}
      class:hover:bg-dark-800={!isSelected}
      class:text-dark-300={!isSelected}
      class:hover:text-white={!isSelected}
      style={indentStyle}
      role="button"
      tabindex="0"
      on:click={() => handleCollectionClick(collection)}
      on:dragover={handleDragOver}
      on:drop={(e) => handleDrop(e, collection.id)}
    >
      <div class="flex items-center space-x-2 flex-1 min-w-0">
        {#if expandable && hasChildren}
          <button
            class="w-4 h-4 flex items-center justify-center hover:bg-dark-700 rounded transition-colors"
            on:click|stopPropagation={() => handleToggleExpanded(collection)}
          >
            {#if collection.isExpanded}
              <ChevronDown class="w-3 h-3" />
            {:else}
              <ChevronRight class="w-3 h-3" />
            {/if}
          </button>
        {:else}
          <div class="w-4 h-4"></div>
        {/if}
        
        <div class="flex items-center space-x-2 flex-1 min-w-0">
          <div class="text-lg" title={collection.name}>
            {collection.icon || '📁'}
          </div>
          
          <span class="font-medium truncate text-sm" class:text-xs={compact}>
            {collection.name}
          </span>
          
          {#if showNoteCounts && noteCount > 0}
            <span class="text-xs ml-auto" 
              class:text-primary-400={isSelected}
              class:text-dark-500={!isSelected}>
              {noteCount}
            </span>
          {/if}
        </div>
      </div>
      
      {#if showActions}
        <div class="opacity-0 group-hover:opacity-100 transition-opacity relative">
          <button
            class="w-6 h-6 flex items-center justify-center hover:bg-dark-700 rounded transition-colors"
            on:click|stopPropagation={() => showMenu = showMenu === collection.id ? null : collection.id}
          >
            <MoreHorizontal class="w-3 h-3" />
          </button>
          
          {#if showMenu === collection.id}
            <div class="absolute right-0 mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg py-1 z-50 min-w-40">
              <button
                class="w-full px-3 py-2 text-left text-sm text-dark-300 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                on:click={() => handleCreateSubCollection(collection.id)}
              >
                <Plus class="w-3 h-3" />
                Add Subcollection
              </button>
              <button
                class="w-full px-3 py-2 text-left text-sm text-dark-300 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                on:click={() => handleEditCollection(collection)}
              >
                <Edit3 class="w-3 h-3" />
                Edit
              </button>
              <button
                class="w-full px-3 py-2 text-left text-sm text-dark-300 hover:bg-dark-700 hover:text-white flex items-center gap-2"
                on:click={() => handleDeleteCollection(collection)}
              >
                <Move class="w-3 h-3" />
                Move
              </button>
              <div class="border-t border-dark-700 my-1"></div>
              <button
                class="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-dark-700 hover:text-red-300 flex items-center gap-2"
                on:click={() => handleDeleteCollection(collection)}
              >
                <Trash2 class="w-3 h-3" />
                Delete
              </button>
            </div>
          {/if}
        </div>
      {/if}
    </div>
  {/each}
</div>

<!-- Click outside to close menu -->
{#if showMenu}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-40" 
    on:click={() => showMenu = null}
  ></div>
{/if}