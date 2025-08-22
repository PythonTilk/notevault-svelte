<script>
  import { currentLayout, layoutPresets, updateLayout, togglePanel, resizePanel } from '$lib/stores/layout.js';
  import { createEventDispatcher } from 'svelte';

  const dispatch = createEventDispatcher();

  let isOpen = false;
  let activeTab = 'presets';

  function selectPreset(presetKey) {
    updateLayout(presetKey);
    dispatch('layoutChanged', { preset: presetKey });
  }

  function handlePanelToggle(panelName) {
    togglePanel(panelName);
    dispatch('panelToggled', { panel: panelName });
  }

  function handlePanelResize(panelName, dimension, value) {
    const size = {};
    size[dimension] = parseInt(value);
    resizePanel(panelName, size);
    dispatch('panelResized', { panel: panelName, dimension, value });
  }

  function toggleSettings() {
    isOpen = !isOpen;
  }

  // Close settings when clicking outside
  function handleClickOutside(event) {
    if (!event.target.closest('.layout-settings')) {
      isOpen = false;
    }
  }

  $: currentConfig = $currentLayout.config;
</script>

<svelte:window on:click={handleClickOutside} />

<div class="layout-settings relative">
  <button
    class="btn btn-secondary flex items-center gap-2"
    on:click={toggleSettings}
    aria-expanded={isOpen}
    title="Layout Settings"
  >
    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
    </svg>
    <span class="hidden sm:inline">Layout</span>
  </button>

  {#if isOpen}
    <div
      class="absolute top-full right-0 mt-2 w-80 rounded-lg shadow-lg z-50 overflow-hidden"
      style="background-color: var(--color-surface); border: 1px solid var(--color-border);"
    >
      <!-- Header -->
      <div class="border-b" style="border-color: var(--color-border);">
        <div class="flex">
          <button
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'presets' ? 'border-b-2' : ''}"
            style="color: var(--color-text); border-color: {activeTab === 'presets' ? 'var(--color-primary)' : 'transparent'};"
            on:click={() => activeTab = 'presets'}
          >
            Presets
          </button>
          <button
            class="flex-1 px-4 py-3 text-sm font-medium transition-colors {activeTab === 'custom' ? 'border-b-2' : ''}"
            style="color: var(--color-text); border-color: {activeTab === 'custom' ? 'var(--color-primary)' : 'transparent'};"
            on:click={() => activeTab = 'custom'}
          >
            Customize
          </button>
        </div>
      </div>

      <!-- Content -->
      <div class="p-4 max-h-96 overflow-y-auto">
        {#if activeTab === 'presets'}
          <!-- Layout Presets -->
          <div class="space-y-3">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text);">
              Choose Layout Preset
            </h3>
            {#each Object.entries(layoutPresets) as [presetKey, preset]}
              <button
                class="w-full text-left p-3 rounded-lg border transition-colors {$currentLayout.preset === presetKey ? 'ring-2 ring-opacity-50' : ''}"
                style="background-color: {$currentLayout.preset === presetKey ? 'var(--color-primary)' : 'var(--color-background)'}; border-color: var(--color-border); color: var(--color-text); ring-color: var(--color-primary);"
                on:click={() => selectPreset(presetKey)}
              >
                <div class="flex items-start justify-between">
                  <div>
                    <h4 class="font-medium text-sm">{preset.name}</h4>
                    <p class="text-xs mt-1 opacity-75">{preset.description}</p>
                  </div>
                  {#if $currentLayout.preset === presetKey}
                    <svg class="w-4 h-4 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fill-rule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clip-rule="evenodd"
                      />
                    </svg>
                  {/if}
                </div>
                
                <!-- Layout preview -->
                <div class="mt-2 flex items-center gap-1">
                  <div class="w-6 h-4 border rounded-sm {preset.config.sidebar.visible ? 'bg-current opacity-20' : 'bg-transparent'}" style="border-color: var(--color-border);"></div>
                  <div class="flex-1 h-4 border rounded-sm bg-current opacity-10" style="border-color: var(--color-border);"></div>
                  <div class="w-5 h-4 border rounded-sm {preset.config.rightPanel.visible ? 'bg-current opacity-20' : 'bg-transparent'}" style="border-color: var(--color-border);"></div>
                </div>
              </button>
            {/each}
          </div>
        {:else}
          <!-- Custom Layout Settings -->
          <div class="space-y-4">
            <h3 class="text-sm font-medium mb-3" style="color: var(--color-text);">
              Customize Layout
            </h3>

            <!-- Panel Visibility Toggles -->
            <div class="space-y-3">
              <h4 class="text-xs font-medium uppercase tracking-wide opacity-75" style="color: var(--color-textSecondary);">
                Panel Visibility
              </h4>
              
              {#each [
                { key: 'sidebar', label: 'Left Sidebar' },
                { key: 'rightPanel', label: 'Right Panel' },
                { key: 'topBar', label: 'Top Bar' },
                { key: 'bottomBar', label: 'Bottom Bar' }
              ] as panel}
                <label class="flex items-center justify-between">
                  <span class="text-sm" style="color: var(--color-text);">{panel.label}</span>
                  <input
                    type="checkbox"
                    checked={currentConfig[panel.key]?.visible ?? true}
                    on:change={() => handlePanelToggle(panel.key)}
                    class="w-4 h-4 rounded border-2 transition-colors"
                    style="border-color: var(--color-border); accent-color: var(--color-primary);"
                  />
                </label>
              {/each}
            </div>

            <!-- Panel Sizing -->
            <div class="space-y-3">
              <h4 class="text-xs font-medium uppercase tracking-wide opacity-75" style="color: var(--color-textSecondary);">
                Panel Sizes
              </h4>

              <!-- Sidebar Width -->
              <div>
                <label class="flex items-center justify-between mb-1">
                  <span class="text-sm" style="color: var(--color-text);">Sidebar Width</span>
                  <span class="text-xs" style="color: var(--color-textSecondary);">{currentConfig.sidebar?.width ?? 280}px</span>
                </label>
                <input
                  type="range"
                  min="200"
                  max="400"
                  step="20"
                  value={currentConfig.sidebar?.width ?? 280}
                  on:input={(e) => handlePanelResize('sidebar', 'width', e.target.value)}
                  class="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style="background: var(--color-border); accent-color: var(--color-primary);"
                />
              </div>

              <!-- Right Panel Width -->
              <div>
                <label class="flex items-center justify-between mb-1">
                  <span class="text-sm" style="color: var(--color-text);">Right Panel Width</span>
                  <span class="text-xs" style="color: var(--color-textSecondary);">{currentConfig.rightPanel?.width ?? 320}px</span>
                </label>
                <input
                  type="range"
                  min="250"
                  max="450"
                  step="25"
                  value={currentConfig.rightPanel?.width ?? 320}
                  on:input={(e) => handlePanelResize('rightPanel', 'width', e.target.value)}
                  class="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style="background: var(--color-border); accent-color: var(--color-primary);"
                />
              </div>

              <!-- Top Bar Height -->
              <div>
                <label class="flex items-center justify-between mb-1">
                  <span class="text-sm" style="color: var(--color-text);">Top Bar Height</span>
                  <span class="text-xs" style="color: var(--color-textSecondary);">{currentConfig.topBar?.height ?? 60}px</span>
                </label>
                <input
                  type="range"
                  min="45"
                  max="80"
                  step="5"
                  value={currentConfig.topBar?.height ?? 60}
                  on:input={(e) => handlePanelResize('topBar', 'height', e.target.value)}
                  class="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style="background: var(--color-border); accent-color: var(--color-primary);"
                />
              </div>
            </div>

            <!-- Reset Button -->
            <div class="pt-2 border-t" style="border-color: var(--color-border);">
              <button
                class="w-full px-3 py-2 text-sm rounded-md transition-colors"
                style="background-color: var(--color-error); color: white;"
                on:click={() => selectPreset('classic')}
              >
                Reset to Classic
              </button>
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}
</div>

<style>
  .layout-settings button {
    background-color: var(--color-surface);
    color: var(--color-text);
    border: 1px solid var(--color-border);
  }

  .layout-settings button:hover {
    background-color: var(--color-primary);
    opacity: 0.9;
  }

  /* Custom range slider styling */
  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid var(--color-background);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  input[type="range"]::-moz-range-thumb {
    width: 16px;
    height: 16px;
    border-radius: 50%;
    background: var(--color-primary);
    cursor: pointer;
    border: 2px solid var(--color-background);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }
</style>