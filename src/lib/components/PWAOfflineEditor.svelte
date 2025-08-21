<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { browser } from '$app/environment';
  import { isOnline, offlineStorage, backgroundSync } from '$lib/pwa';
  import { toastStore } from '$lib/stores/toast';

  export let note: any = null;
  export let workspaceId: string = '';
  
  const dispatch = createEventDispatcher();

  let title = note?.title || '';
  let content = note?.content || '';
  let isOfflineMode = false;
  let autoSaveEnabled = true;
  let lastSaved = note?.lastModified || null;
  let hasUnsavedChanges = false;

  $: if (browser) {
    isOfflineMode = !$isOnline;
  }

  $: if (title !== (note?.title || '') || content !== (note?.content || '')) {
    hasUnsavedChanges = true;
    if (autoSaveEnabled) {
      scheduleAutoSave();
    }
  }

  let autoSaveTimeout: ReturnType<typeof setTimeout>;

  onMount(() => {
    // Load from offline storage if note exists locally
    if (note?.id) {
      loadOfflineNote(note.id);
    }

    // Set up periodic sync when back online
    const unsubscribe = isOnline.subscribe(online => {
      if (online && hasUnsavedChanges) {
        syncNote();
      }
    });

    return () => {
      unsubscribe();
      if (autoSaveTimeout) {
        clearTimeout(autoSaveTimeout);
      }
    };
  });

  function scheduleAutoSave() {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    autoSaveTimeout = setTimeout(() => {
      saveNote();
    }, 2000); // Auto-save after 2 seconds of inactivity
  }

  async function saveNote() {
    try {
      const noteData = {
        id: note?.id || `offline-${Date.now()}`,
        title,
        content,
        workspaceId,
        lastModified: Date.now(),
        offline: isOfflineMode
      };

      if (isOfflineMode) {
        // Save to offline storage
        await offlineStorage.storeNote(noteData);
        
        // Queue for sync when online
        await offlineStorage.queueSync('note', noteData);
        
        toastStore.add({
          type: 'info',
          message: 'Note saved offline. Will sync when connected.',
          duration: 3000
        });
      } else {
        // Try to save to server
        try {
          const response = await fetch('/api/notes', {
            method: note?.id ? 'PUT' : 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
            },
            body: JSON.stringify(noteData)
          });

          if (response.ok) {
            const savedNote = await response.json();
            note = savedNote;
            lastSaved = Date.now();
            hasUnsavedChanges = false;
            
            toastStore.add({
              type: 'success',
              message: 'Note saved successfully',
              duration: 2000
            });
          } else {
            throw new Error('Failed to save to server');
          }
        } catch (error) {
          // Fallback to offline storage
          await offlineStorage.storeNote(noteData);
          await offlineStorage.queueSync('note', noteData);
          
          toastStore.add({
            type: 'warning',
            message: 'Saved offline due to connection issues',
            duration: 3000
          });
        }
      }

      dispatch('saved', noteData);
    } catch (error) {
      console.error('Error saving note:', error);
      toastStore.add({
        type: 'error',
        message: 'Failed to save note',
        duration: 4000
      });
    }
  }

  async function loadOfflineNote(noteId: string) {
    try {
      const offlineNotes = await offlineStorage.getNotes(workspaceId);
      const offlineNote = offlineNotes.find(n => n.id === noteId);
      
      if (offlineNote && (!note || offlineNote.lastModified > note.lastModified)) {
        title = offlineNote.title;
        content = offlineNote.content;
        lastSaved = offlineNote.lastModified;
        
        toastStore.add({
          type: 'info',
          message: 'Loaded offline version of note',
          duration: 3000
        });
      }
    } catch (error) {
      console.error('Error loading offline note:', error);
    }
  }

  async function syncNote() {
    if (hasUnsavedChanges) {
      await saveNote();
    }
    
    try {
      await backgroundSync.syncOfflineData();
      toastStore.add({
        type: 'success',
        message: 'Notes synced with server',
        duration: 2000
      });
    } catch (error) {
      console.error('Error syncing notes:', error);
    }
  }

  function toggleAutoSave() {
    autoSaveEnabled = !autoSaveEnabled;
    
    if (!autoSaveEnabled && autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    
    toastStore.add({
      type: 'info',
      message: autoSaveEnabled ? 'Auto-save enabled' : 'Auto-save disabled',
      duration: 2000
    });
  }

  function formatLastSaved() {
    if (!lastSaved) return 'Never saved';
    
    const now = Date.now();
    const diff = now - lastSaved;
    
    if (diff < 60000) return 'Just saved';
    if (diff < 3600000) return `Saved ${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `Saved ${Math.floor(diff / 3600000)}h ago`;
    return `Saved ${Math.floor(diff / 86400000)}d ago`;
  }
</script>

<div class="pwa-offline-editor">
  <!-- Status Bar -->
  <div class="status-bar bg-dark-800 p-2 flex items-center justify-between text-sm">
    <div class="flex items-center space-x-4">
      {#if isOfflineMode}
        <div class="flex items-center text-orange-400">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clip-rule="evenodd"></path>
          </svg>
          Offline Mode
        </div>
      {:else}
        <div class="flex items-center text-green-400">
          <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"></path>
          </svg>
          Online
        </div>
      {/if}
      
      <div class="text-gray-400">
        {formatLastSaved()}
      </div>
      
      {#if hasUnsavedChanges}
        <div class="text-yellow-400">
          Unsaved changes
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-2">
      <button
        on:click={toggleAutoSave}
        class="px-2 py-1 rounded text-xs {autoSaveEnabled ? 'bg-green-600' : 'bg-gray-600'} hover:opacity-80"
      >
        Auto-save: {autoSaveEnabled ? 'On' : 'Off'}
      </button>
      
      <button
        on:click={saveNote}
        class="px-2 py-1 bg-primary-600 hover:bg-primary-700 rounded text-xs"
      >
        Save Now
      </button>
      
      {#if isOfflineMode && hasUnsavedChanges}
        <button
          on:click={syncNote}
          class="px-2 py-1 bg-orange-600 hover:bg-orange-700 rounded text-xs"
          disabled={!$isOnline}
        >
          Sync When Online
        </button>
      {/if}
    </div>
  </div>

  <!-- Editor -->
  <div class="editor-container flex-1 p-4">
    <input
      bind:value={title}
      placeholder="Note title..."
      class="w-full text-2xl font-bold bg-transparent border-none outline-none text-white placeholder-gray-400 mb-4"
    />
    
    <textarea
      bind:value={content}
      placeholder="Start writing your note..."
      class="w-full h-96 bg-transparent border border-dark-600 rounded-lg p-4 text-white placeholder-gray-400 resize-none outline-none focus:border-primary-500"
    ></textarea>
  </div>
</div>

<style>
  .pwa-offline-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  .status-bar {
    border-bottom: 1px solid #374151;
  }

  .editor-container {
    flex: 1;
    overflow-y: auto;
  }
</style>