<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Hash } from 'lucide-svelte';
  
  export let selectedTags: string[] = [];
  export let availableTags: string[] = [];
  export let compact: boolean = false;

  const dispatch = createEventDispatcher<{
    change: { selectedTags: string[] };
    clear: void;
  }>();

  function toggleTag(tag: string) {
    const newSelectedTags = selectedTags.includes(tag)
      ? selectedTags.filter(t => t !== tag)
      : [...selectedTags, tag];
    
    selectedTags = newSelectedTags;
    dispatch('change', { selectedTags: newSelectedTags });
  }

  function clearAll() {
    selectedTags = [];
    dispatch('clear');
    dispatch('change', { selectedTags: [] });
  }

  // Get tag usage count (mock for now - could be enhanced with real counts)
  function getTagCount(tag: string): number {
    // This would come from actual data analysis
    return Math.floor(Math.random() * 10) + 1;
  }

  $: sortedAvailableTags = availableTags
    .filter(tag => tag.length > 0)
    .sort((a, b) => {
      // Selected tags first, then alphabetical
      if (selectedTags.includes(a) && !selectedTags.includes(b)) return -1;
      if (!selectedTags.includes(a) && selectedTags.includes(b)) return 1;
      return a.localeCompare(b);
    });
</script>

{#if compact}
  <!-- Compact view for sidebar/small spaces -->
  <div class="space-y-2">
    {#if selectedTags.length > 0}
      <div class="flex items-center justify-between">
        <span class="text-xs text-dark-400 font-medium">Filtered by tags:</span>
        <button
          class="text-xs text-dark-400 hover:text-white"
          on:click={clearAll}
        >
          Clear
        </button>
      </div>
      <div class="flex flex-wrap gap-1">
        {#each selectedTags as tag}
          <button
            class="inline-flex items-center gap-1 px-2 py-1 bg-primary-600 text-primary-100 text-xs rounded-full"
            on:click={() => toggleTag(tag)}
            title="Remove filter"
          >
            #{tag}
            <X class="w-2 h-2" />
          </button>
        {/each}
      </div>
    {/if}
    
    {#if availableTags.length > 0}
      <div class="max-h-32 overflow-y-auto">
        <div class="space-y-1">
          {#each sortedAvailableTags.slice(0, 10) as tag}
            <button
              class="w-full text-left px-2 py-1 text-xs rounded transition-colors {
                selectedTags.includes(tag)
                  ? 'bg-primary-600/20 text-primary-300'
                  : 'text-dark-400 hover:text-white hover:bg-dark-800'
              }"
              on:click={() => toggleTag(tag)}
            >
              #{tag}
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{:else}
  <!-- Full view for main content areas -->
  <div class="bg-dark-800 border border-dark-700 rounded-lg p-4">
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-sm font-medium text-white flex items-center gap-2">
        <Hash class="w-4 h-4" />
        Filter by Tags
      </h3>
      {#if selectedTags.length > 0}
        <button
          class="text-sm text-dark-400 hover:text-white transition-colors"
          on:click={clearAll}
        >
          Clear all ({selectedTags.length})
        </button>
      {/if}
    </div>

    {#if availableTags.length === 0}
      <p class="text-sm text-dark-400 text-center py-4">No tags found</p>
    {:else}
      <div class="max-h-48 overflow-y-auto">
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-1">
          {#each sortedAvailableTags as tag}
            <button
              class="flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors {
                selectedTags.includes(tag)
                  ? 'bg-primary-600 text-white'
                  : 'text-dark-300 hover:text-white hover:bg-dark-700'
              }"
              on:click={() => toggleTag(tag)}
            >
              <span class="flex items-center gap-2">
                <Hash class="w-3 h-3" />
                {tag}
              </span>
              <span class="text-xs opacity-60">
                {getTagCount(tag)}
              </span>
            </button>
          {/each}
        </div>
      </div>
    {/if}
  </div>
{/if}