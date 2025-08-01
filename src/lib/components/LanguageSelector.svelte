<script>
  import { createEventDispatcher } from 'svelte';
  import { currentLanguage, currentLanguageInfo, languages, setLanguage, t } from '$lib/i18n/index.js';

  const dispatch = createEventDispatcher();

  let isOpen = false;

  function selectLanguage(langCode) {
    setLanguage(langCode);
    isOpen = false;
    dispatch('languageChanged', { language: langCode, languageInfo: languages[langCode] });
  }

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.language-selector')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="language-selector relative">
  <button
    class="btn btn-secondary flex items-center gap-2 min-w-[120px]"
    on:click={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="true"
    title="{$t('settings.language')}"
  >
    <span class="text-lg" role="img" aria-label="Flag">
      {$currentLanguageInfo.flag}
    </span>
    <span class="flex-1 text-left truncate">
      {$currentLanguageInfo.name}
    </span>
    <svg
      class="w-4 h-4 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
    </svg>
  </button>

  {#if isOpen}
    <div
      class="absolute top-full right-0 mt-2 w-64 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
      style="background-color: var(--color-surface); border: 1px solid var(--color-border);"
      role="listbox"
      aria-label="{$t('settings.languageSettings')}"
    >
      <div class="p-2">
        <h3 class="text-sm font-medium mb-2 px-2" style="color: var(--color-text);">
          {$t('settings.language')}
        </h3>
        <div class="space-y-1">
          {#each Object.entries(languages) as [langCode, langInfo]}
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-opacity-75 transition-colors {$currentLanguage === langCode ? 'ring-2 ring-opacity-50' : ''}"
              style="color: var(--color-text); background-color: {$currentLanguage === langCode ? 'var(--color-primary)' : 'transparent'}; ring-color: var(--color-primary);"
              on:click={() => selectLanguage(langCode)}
              role="option"
              aria-selected={$currentLanguage === langCode}
            >
              <span class="text-lg" role="img" aria-label="Flag">
                {langInfo.flag}
              </span>
              <div class="flex-1 text-left">
                <div class="font-medium">
                  {langInfo.name}
                </div>
                {#if langInfo.rtl}
                  <div class="text-xs opacity-75" style="color: var(--color-textSecondary);">
                    RTL
                  </div>
                {/if}
              </div>
              {#if $currentLanguage === langCode}
                <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fill-rule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clip-rule="evenodd"
                  />
                </svg>
              {/if}
            </button>
          {/each}
        </div>
      </div>
      
      <!-- Language info footer -->
      <div class="border-t p-3 text-xs" style="border-color: var(--color-border); background-color: var(--color-background); color: var(--color-textSecondary);">
        <div class="flex items-center justify-between">
          <span>{Object.keys(languages).length} languages available</span>
          {#if $currentLanguageInfo.rtl}
            <span class="px-2 py-1 rounded text-xs" style="background-color: var(--color-primary); color: white;">
              RTL
            </span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .language-selector button {
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .language-selector button:hover {
    background-color: var(--color-primary);
    opacity: 0.9;
  }

  /* RTL support */
  :global([dir="rtl"]) .language-selector {
    direction: rtl;
  }

  :global([dir="rtl"]) .absolute {
    right: auto;
    left: 0;
  }

  /* Custom scrollbar for language list */
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

  /* Focus styles for accessibility */
  button:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* High contrast mode adjustments */
  :global(.high-contrast) button {
    border-width: 2px;
  }

  /* Reduced motion adjustments */
  :global(.reduce-motion) .transition-transform,
  :global(.reduce-motion) .transition-colors {
    transition: none;
  }
</style>