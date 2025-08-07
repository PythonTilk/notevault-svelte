<script>
  import { currentTheme, themes, applyTheme } from '$lib/stores/theme.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let isOpen = false;

  function selectTheme(themeName) {
    applyTheme(themeName);
    isOpen = false;
    dispatch('themeChanged', { theme: themeName });
  }

  function toggleDropdown() {
    isOpen = !isOpen;
  }

  // Close dropdown when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.theme-selector')) {
      isOpen = false;
    }
  }
</script>

<svelte:window on:click={handleClickOutside} />

<div class="theme-selector relative">
  <button
    class="btn btn-secondary flex items-center gap-2"
    on:click={toggleDropdown}
    aria-expanded={isOpen}
    aria-haspopup="true"
  >
    <div class="w-4 h-4 rounded-full bg-current opacity-75"></div>
    <span class="capitalize">{themes[$currentTheme]?.name || 'Theme'}</span>
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
      class="absolute top-full right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-50 min-w-48"
      style="background-color: var(--color-surface); border-color: var(--color-border);"
    >
      <div class="p-2">
        <h3 class="text-sm font-medium mb-2 px-2" style="color: var(--color-text);">
          Choose Theme
        </h3>
        <div class="space-y-1">
          {#each Object.entries(themes) as [themeKey, theme]}
            <button
              class="w-full flex items-center gap-3 px-3 py-2 text-sm rounded-md hover:bg-opacity-75 transition-colors {$currentTheme === themeKey ? 'ring-2 ring-opacity-50' : ''}"
              style="color: var(--color-text); background-color: {$currentTheme === themeKey ? 'var(--color-primary)' : 'transparent'}; ring-color: var(--color-primary);"
              on:click={() => selectTheme(themeKey)}
            >
              <div class="flex items-center gap-2 flex-1">
                <!-- Theme preview circles -->
                <div class="flex gap-1">
                  <div
                    class="w-3 h-3 rounded-full border border-opacity-30"
                    style="background-color: {theme.colors.primary}; border-color: {theme.colors.border};"
                  ></div>
                  <div
                    class="w-3 h-3 rounded-full border border-opacity-30"
                    style="background-color: {theme.colors.background}; border-color: {theme.colors.border};"
                  ></div>
                  <div
                    class="w-3 h-3 rounded-full border border-opacity-30"
                    style="background-color: {theme.colors.accent}; border-color: {theme.colors.border};"
                  ></div>
                </div>
                <span class="capitalize">{theme.name}</span>
              </div>
              {#if $currentTheme === themeKey}
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
    </div>
  {/if}
</div>

<style>
  .theme-selector button {
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .theme-selector button:hover {
    background-color: var(--color-primary);
    opacity: 0.9;
  }
</style>