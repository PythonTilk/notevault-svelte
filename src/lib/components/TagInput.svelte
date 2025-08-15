<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Plus } from 'lucide-svelte';

  export let tags: string[] = [];
  export let placeholder: string = 'Add tags...';
  export let maxTags: number = 10;
  export let readonly: boolean = false;

  const dispatch = createEventDispatcher<{
    change: { tags: string[] };
  }>();

  let inputValue = '';
  let inputElement: HTMLInputElement;

  function addTag(tagName: string) {
    const cleanTag = tagName.trim().toLowerCase().replace(/[^a-z0-9\-_]/g, '');
    
    if (!cleanTag || tags.includes(cleanTag) || tags.length >= maxTags) {
      return;
    }

    const newTags = [...tags, cleanTag];
    tags = newTags;
    dispatch('change', { tags: newTags });
    inputValue = '';
  }

  function removeTag(index: number) {
    if (readonly) return;
    
    const newTags = tags.filter((_, i) => i !== index);
    tags = newTags;
    dispatch('change', { tags: newTags });
  }

  function handleKeydown(event: KeyboardEvent) {
    if (readonly) return;

    if (event.key === 'Enter' || event.key === 'Tab' || event.key === ',') {
      event.preventDefault();
      if (inputValue.trim()) {
        addTag(inputValue.trim());
      }
    } else if (event.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  function handlePaste(event: ClipboardEvent) {
    if (readonly) return;
    
    event.preventDefault();
    const pastedText = event.clipboardData?.getData('text') || '';
    const newTags = pastedText.split(/[,\n\t]/).map(t => t.trim()).filter(Boolean);
    
    for (const tag of newTags) {
      if (tags.length < maxTags) {
        addTag(tag);
      }
    }
  }

  function handleInputBlur() {
    if (inputValue.trim()) {
      addTag(inputValue.trim());
    }
  }

  // Predefined tag suggestions
  const commonTags = [
    'important', 'urgent', 'todo', 'idea', 'meeting', 'project', 
    'research', 'draft', 'review', 'personal', 'work', 'design'
  ];

  $: availableSuggestions = commonTags.filter(tag => 
    !tags.includes(tag) && 
    tag.toLowerCase().includes(inputValue.toLowerCase())
  ).slice(0, 5);
</script>

<div class="relative">
  <div class="flex flex-wrap items-center gap-1 p-2 bg-dark-800 border border-dark-700 rounded-lg focus-within:border-primary-500 transition-colors">
    <!-- Existing Tags -->
    {#each tags as tag, index}
      <span class="inline-flex items-center gap-1 px-2 py-1 bg-primary-600/20 text-primary-300 text-sm rounded-full">
        #{tag}
        {#if !readonly}
          <button
            type="button"
            class="text-primary-400 hover:text-primary-200 transition-colors"
            on:click={() => removeTag(index)}
            title="Remove tag"
          >
            <X class="w-3 h-3" />
          </button>
        {/if}
      </span>
    {/each}

    <!-- Input -->
    {#if !readonly && tags.length < maxTags}
      <input
        bind:this={inputElement}
        bind:value={inputValue}
        on:keydown={handleKeydown}
        on:paste={handlePaste}
        on:blur={handleInputBlur}
        class="flex-1 min-w-20 bg-transparent text-white placeholder-dark-400 outline-none text-sm"
        {placeholder}
        autocomplete="off"
        spellcheck="false"
      />
    {/if}
  </div>

  <!-- Tag Suggestions -->
  {#if !readonly && inputValue && availableSuggestions.length > 0}
    <div class="absolute top-full left-0 right-0 mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
      {#each availableSuggestions as suggestion}
        <button
          type="button"
          class="w-full px-3 py-2 text-left text-sm text-dark-300 hover:bg-dark-700 hover:text-white transition-colors flex items-center gap-2"
          on:click={() => addTag(suggestion)}
        >
          <Plus class="w-3 h-3" />
          #{suggestion}
        </button>
      {/each}
    </div>
  {/if}

  <!-- Tag Count -->
  {#if tags.length > 0}
    <div class="text-xs text-dark-400 mt-1">
      {tags.length}/{maxTags} tags
      {#if tags.length >= maxTags}
        <span class="text-yellow-400">(limit reached)</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Focus styles for accessibility */
  button:focus-visible {
    outline: 2px solid theme('colors.primary.500');
    outline-offset: 2px;
  }
</style>