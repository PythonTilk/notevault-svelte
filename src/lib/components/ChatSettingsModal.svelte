<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Shield, Volume2, Bell, Trash2 } from 'lucide-svelte';
  import { currentUser } from '$lib/stores/auth';

  const dispatch = createEventDispatcher<{
    close: void;
    save: { settings: any };
  }>();

  export let isOpen = false;

  let settings = {
    notifications: {
      mentions: true,
      allMessages: false,
      sounds: true
    },
    appearance: {
      darkMode: true,
      compactMode: false,
      showTimestamps: true
    },
    privacy: {
      showOnlineStatus: true,
      allowDirectMessages: true,
      blockList: [] as string[]
    }
  };

  let soundVolume = 50;

  function handleSave() {
    dispatch('save', { settings });
    handleClose();
  }

  function handleClose() {
    isOpen = false;
    dispatch('close');
  }

  function clearHistory() {
    if (confirm('Are you sure you want to clear your chat history? This action cannot be undone.')) {
      // Implement chat history clearing
      console.log('Clearing chat history...');
    }
  }
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-dark-800">
        <h2 class="text-xl font-semibold text-white">Chat Settings</h2>
        <button
          class="text-dark-400 hover:text-white transition-colors"
          on:click={handleClose}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Content -->
      <div class="p-6 overflow-auto max-h-96 space-y-6">
        <!-- Notifications -->
        <div>
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <Bell class="w-5 h-5 mr-2" />
            Notifications
          </h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Notify me when mentioned</span>
              <input
                type="checkbox"
                bind:checked={settings.notifications.mentions}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Notify me for all messages</span>
              <input
                type="checkbox"
                bind:checked={settings.notifications.allMessages}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Enable notification sounds</span>
              <input
                type="checkbox"
                bind:checked={settings.notifications.sounds}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
            
            {#if settings.notifications.sounds}
              <div class="ml-6">
                <label class="block text-sm text-dark-400 mb-2">
                  <Volume2 class="w-4 h-4 inline mr-1" />
                  Sound Volume: {soundVolume}%
                </label>
                <input
                  type="range"
                  bind:value={soundVolume}
                  min="0"
                  max="100"
                  class="w-full"
                />
              </div>
            {/if}
          </div>
        </div>

        <!-- Appearance -->
        <div>
          <h3 class="text-lg font-medium text-white mb-4">Appearance</h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Compact message mode</span>
              <input
                type="checkbox"
                bind:checked={settings.appearance.compactMode}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Show timestamps</span>
              <input
                type="checkbox"
                bind:checked={settings.appearance.showTimestamps}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        <!-- Privacy -->
        <div>
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <Shield class="w-5 h-5 mr-2" />
            Privacy
          </h3>
          <div class="space-y-3">
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Show online status</span>
              <input
                type="checkbox"
                bind:checked={settings.privacy.showOnlineStatus}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
            <label class="flex items-center justify-between">
              <span class="text-dark-300">Allow direct messages</span>
              <input
                type="checkbox"
                bind:checked={settings.privacy.allowDirectMessages}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              />
            </label>
          </div>
        </div>

        <!-- Data Management -->
        <div>
          <h3 class="text-lg font-medium text-white mb-4 flex items-center">
            <Trash2 class="w-5 h-5 mr-2" />
            Data Management
          </h3>
          <div class="space-y-3">
            <button
              class="w-full btn-secondary text-left justify-start"
              on:click={clearHistory}
            >
              <Trash2 class="w-4 h-4 mr-2" />
              Clear Chat History
            </button>
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex items-center justify-end space-x-3 p-6 border-t border-dark-800">
        <button class="btn-secondary" on:click={handleClose}>
          Cancel
        </button>
        <button class="btn-primary" on:click={handleSave}>
          Save Settings
        </button>
      </div>
    </div>
  </div>
{/if}