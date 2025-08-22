<script lang="ts">
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';
  import { goto } from '$app/navigation';
  import { api } from '$lib/api';
  import { toastStore } from '$lib/stores/toast';

  let sharedData: any = null;
  let isLoading = true;
  let selectedWorkspace = '';
  let workspaces: any[] = [];

  onMount(async () => {
    if (browser) {
      await loadSharedData();
      await loadWorkspaces();
    }
  });

  async function loadSharedData() {
    try {
      // Check for shared data from service worker
      const cache = await caches.open('notevault-data-v1.0.0');
      const response = await cache.match('/shared-data');
      
      if (response) {
        sharedData = await response.json();
        console.log('Shared data:', sharedData);
      }
    } catch (error) {
      console.error('Error loading shared data:', error);
    } finally {
      isLoading = false;
    }
  }

  async function loadWorkspaces() {
    try {
      const response = await api.getWorkspaces();
      workspaces = response.workspaces || [];
      
      if (workspaces.length > 0) {
        selectedWorkspace = workspaces[0].id;
      }
    } catch (error) {
      console.error('Error loading workspaces:', error);
      toastStore.add({
        type: 'error',
        message: 'Failed to load workspaces',
        duration: 4000
      });
    }
  }

  async function createNoteFromSharedData() {
    if (!sharedData || !selectedWorkspace) return;

    try {
      const noteData = {
        title: sharedData.title || 'Shared Content',
        content: formatSharedContent(),
        workspaceId: selectedWorkspace,
        color: '#6366f1',
        isPublic: false
      };

      const response = await api.createNote(noteData);
      
      toastStore.add({
        type: 'success',
        message: 'Note created from shared content',
        duration: 3000
      });

      // Clear shared data
      const cache = await caches.open('notevault-data-v1.0.0');
      await cache.delete('/shared-data');

      // Navigate to the new note
      goto(`/notes/${response.note.id}`);
    } catch (error) {
      console.error('Error creating note:', error);
      toastStore.add({
        type: 'error',
        message: 'Failed to create note from shared content',
        duration: 4000
      });
    }
  }

  function formatSharedContent(): string {
    if (!sharedData) return '';

    let content = '';
    
    if (sharedData.title) {
      content += `# ${sharedData.title}\n\n`;
    }
    
    if (sharedData.text) {
      content += `${sharedData.text}\n\n`;
    }
    
    if (sharedData.url) {
      content += `**Source:** ${sharedData.url}\n\n`;
    }
    
    if (sharedData.files && sharedData.files.length > 0) {
      content += `**Shared Files:**\n`;
      sharedData.files.forEach((file: any) => {
        content += `- ${file.name} (${file.type}, ${(file.size / 1024).toFixed(1)} KB)\n`;
      });
    }
    
    content += `\n*Shared on ${new Date(sharedData.timestamp).toLocaleString()}*`;
    
    return content;
  }

  function dismissShare() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Share to NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-950 p-6">
  <div class="max-w-2xl mx-auto">
    <div class="bg-dark-900 rounded-lg shadow-lg">
      <div class="p-6 border-b border-dark-700">
        <div class="flex items-center space-x-3">
          <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
            <svg class="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z"></path>
            </svg>
          </div>
          <div>
            <h1 class="text-xl font-semibold text-white">Share to NoteVault</h1>
            <p class="text-gray-400">Create a note from shared content</p>
          </div>
        </div>
      </div>

      {#if isLoading}
        <div class="p-6 text-center">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p class="text-gray-400">Loading shared content...</p>
        </div>
      {:else if sharedData}
        <div class="p-6 space-y-6">
          <!-- Preview of shared content -->
          <div class="bg-dark-800 rounded-lg p-4">
            <h3 class="text-lg font-medium text-white mb-3">Shared Content Preview</h3>
            
            {#if sharedData.title}
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-300">Title:</span>
                <p class="text-white">{sharedData.title}</p>
              </div>
            {/if}
            
            {#if sharedData.text}
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-300">Text:</span>
                <p class="text-white max-h-32 overflow-y-auto">{sharedData.text}</p>
              </div>
            {/if}
            
            {#if sharedData.url}
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-300">URL:</span>
                <a href={sharedData.url} target="_blank" class="text-primary-400 hover:text-primary-300 break-all">
                  {sharedData.url}
                </a>
              </div>
            {/if}
            
            {#if sharedData.files && sharedData.files.length > 0}
              <div class="mb-2">
                <span class="text-sm font-medium text-gray-300">Files:</span>
                <ul class="text-white">
                  {#each sharedData.files as file}
                    <li>• {file.name} ({file.type}, {(file.size / 1024).toFixed(1)} KB)</li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>

          <!-- Workspace selection -->
          {#if workspaces.length > 0}
            <div>
              <label for="workspace" class="block text-sm font-medium text-gray-300 mb-2">
                Select Workspace
              </label>
              <select
                id="workspace"
                bind:value={selectedWorkspace}
                class="w-full px-3 py-2 bg-dark-700 border border-dark-600 rounded-lg text-white focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                {#each workspaces as workspace}
                  <option value={workspace.id}>{workspace.name}</option>
                {/each}
              </select>
            </div>
          {/if}

          <!-- Actions -->
          <div class="flex space-x-3">
            <button
              on:click={createNoteFromSharedData}
              disabled={!selectedWorkspace}
              class="flex-1 px-4 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
            >
              Create Note
            </button>
            <button
              on:click={dismissShare}
              class="px-4 py-2 bg-dark-700 hover:bg-dark-600 text-white rounded-lg font-medium transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      {:else}
        <div class="p-6 text-center">
          <div class="text-gray-400 mb-4">
            <svg class="w-16 h-16 mx-auto mb-2" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
            </svg>
          </div>
          <h3 class="text-lg font-medium text-white mb-2">No shared content found</h3>
          <p class="text-gray-400 mb-4">
            It looks like there's no content to share. You can create a new note manually.
          </p>
          <button
            on:click={() => goto('/')}
            class="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>