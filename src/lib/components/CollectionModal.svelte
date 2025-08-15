<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Folder, Palette } from 'lucide-svelte';
  import type { NoteCollection } from '$lib/types';

  export let isOpen: boolean = false;
  export let collection: NoteCollection | null = null;
  export let parentCollection: NoteCollection | null = null;
  export let workspaceId: string;
  export let authorId: string;

  const dispatch = createEventDispatcher<{
    save: { collection: Omit<NoteCollection, 'id' | 'createdAt' | 'updatedAt'> };
    close: void;
  }>();

  let formData = {
    name: '',
    description: '',
    color: '#3b82f6',
    icon: '📁',
    parentId: undefined as string | undefined,
    sortOrder: 0
  };

  // Collection colors
  const colors = [
    '#3b82f6', // blue
    '#10b981', // green
    '#f59e0b', // amber
    '#ef4444', // red
    '#8b5cf6', // purple
    '#06b6d4', // cyan
    '#84cc16', // lime
    '#f97316', // orange
    '#ec4899', // pink
    '#6b7280'  // gray
  ];

  // Common collection icons
  const icons = [
    '📁', '📂', '📚', '📝', '💡', '🎯', '📋', '📦', 
    '🗂️', '🏷️', '⭐', '🔖', '📌', '🎨', '🔧', '💼'
  ];

  $: {
    if (isOpen) {
      if (collection) {
        // Edit mode
        formData = {
          name: collection.name,
          description: collection.description || '',
          color: collection.color,
          icon: collection.icon || '📁',
          parentId: collection.parentId,
          sortOrder: collection.sortOrder
        };
      } else {
        // Create mode
        formData = {
          name: '',
          description: '',
          color: '#3b82f6',
          icon: '📁',
          parentId: parentCollection?.id,
          sortOrder: 0
        };
      }
    }
  }

  function handleSubmit() {
    if (!formData.name.trim()) return;

    const collectionData: Omit<NoteCollection, 'id' | 'createdAt' | 'updatedAt'> = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      workspaceId,
      authorId,
      parentId: formData.parentId,
      color: formData.color,
      icon: formData.icon,
      isExpanded: true,
      sortOrder: formData.sortOrder
    };

    dispatch('save', { collection: collectionData });
    handleClose();
  }

  function handleClose() {
    isOpen = false;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    } else if (event.key === 'Enter' && event.ctrlKey) {
      event.preventDefault();
      handleSubmit();
    }
  }
</script>

{#if isOpen}
  <!-- Modal backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={handleClose}
  >
    <!-- Modal content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md"
      on:click|stopPropagation
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <Folder class="w-5 h-5" />
            {collection ? 'Edit Collection' : 'Create Collection'}
          </h2>
          <button
            class="text-dark-400 hover:text-white transition-colors"
            on:click={handleClose}
            aria-label="Close modal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Form -->
        <form on:submit|preventDefault={handleSubmit} class="space-y-4">
          <!-- Name -->
          <div>
            <label for="collection-name" class="block text-sm font-medium text-dark-300 mb-2">
              Name *
            </label>
            <input
              id="collection-name"
              type="text"
              bind:value={formData.name}
              class="input"
              placeholder="Enter collection name"
              required
              on:keydown={handleKeydown}
            />
          </div>

          <!-- Description -->
          <div>
            <label for="collection-description" class="block text-sm font-medium text-dark-300 mb-2">
              Description
            </label>
            <textarea
              id="collection-description"
              bind:value={formData.description}
              class="input resize-none"
              rows="3"
              placeholder="Enter collection description (optional)"
              on:keydown={handleKeydown}
            ></textarea>
          </div>

          <!-- Icon -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Icon
            </label>
            <div class="grid grid-cols-8 gap-2">
              {#each icons as icon}
                <button
                  type="button"
                  class="w-8 h-8 flex items-center justify-center text-lg rounded-lg border-2 transition-colors {formData.icon === icon 
                    ? 'border-primary-500 bg-primary-500/20' 
                    : 'border-dark-700 hover:border-dark-600 hover:bg-dark-800'}"
                  on:click={() => formData.icon = icon}
                  title="Select {icon}"
                >
                  {icon}
                </button>
              {/each}
            </div>
          </div>

          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2 flex items-center gap-2">
              <Palette class="w-4 h-4" />
              Color
            </label>
            <div class="grid grid-cols-5 gap-2">
              {#each colors as color}
                <button
                  type="button"
                  class="w-8 h-8 rounded-lg border-2 transition-colors {formData.color === color 
                    ? 'border-white' 
                    : 'border-dark-700 hover:border-dark-600'}"
                  style="background-color: {color}"
                  on:click={() => formData.color = color}
                  title="Select color {color}"
                  aria-label="Select color {color}"
                ></button>
              {/each}
            </div>
          </div>

          <!-- Parent collection info -->
          {#if parentCollection}
            <div class="bg-dark-800 border border-dark-700 rounded-lg p-3">
              <div class="text-sm text-dark-400 mb-1">Parent Collection:</div>
              <div class="flex items-center gap-2 text-dark-300">
                <span class="text-base">{parentCollection.icon || '📁'}</span>
                <span class="font-medium">{parentCollection.name}</span>
              </div>
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              class="btn-secondary"
              on:click={handleClose}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              disabled={!formData.name.trim()}
            >
              {collection ? 'Update' : 'Create'} Collection
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}