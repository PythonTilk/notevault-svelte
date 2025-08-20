<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Plus, X } from 'lucide-svelte';
  import { showCreateWorkspaceModal } from '$lib/stores/modals';
  import { workspaceStore } from '$lib/stores/workspaces';
  import { goto } from '$app/navigation';

  const dispatch = createEventDispatcher<{
    close: void;
    created: { workspace: any };
  }>();

  let newWorkspaceName = '';
  let newWorkspaceDescription = '';
  let newWorkspaceColor = '#ef4444';
  let newWorkspaceIsPublic = false;
  let isCreating = false;
  let error = '';

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) {
      error = 'Workspace name is required';
      return;
    }

    isCreating = true;
    error = '';

    try {
      const workspace = await workspaceStore.createWorkspace({
        name: newWorkspaceName,
        description: newWorkspaceDescription,
        color: newWorkspaceColor,
        isPublic: newWorkspaceIsPublic
      });

      dispatch('created', { workspace });
      handleClose();
      
      // Navigate to the new workspace
      goto(`/workspaces/${workspace.id}`);
    } catch (err) {
      console.error('Failed to create workspace:', err);
      error = err instanceof Error ? err.message : 'Failed to create workspace';
    } finally {
      isCreating = false;
    }
  }

  function handleClose() {
    showCreateWorkspaceModal.set(false);
    resetForm();
    dispatch('close');
  }

  function resetForm() {
    newWorkspaceName = '';
    newWorkspaceDescription = '';
    newWorkspaceColor = '#ef4444';
    newWorkspaceIsPublic = false;
    error = '';
    isCreating = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if $showCreateWorkspaceModal}
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
      on:keydown={handleKeydown}
      tabindex="-1"
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <Plus class="w-5 h-5" />
            Create New Workspace
          </h2>
          <button
            class="text-dark-400 hover:text-white transition-colors"
            on:click={handleClose}
            aria-label="Close modal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error message -->
        {#if error}
          <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-400 text-sm">{error}</p>
          </div>
        {/if}
        
        <form on:submit|preventDefault={handleCreateWorkspace} class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-dark-300 mb-2">
              Workspace Name *
            </label>
            <input
              id="name"
              type="text"
              bind:value={newWorkspaceName}
              class="input"
              placeholder="Enter workspace name"
              disabled={isCreating}
              required
            />
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-dark-300 mb-2">
              Description (optional)
            </label>
            <textarea
              id="description"
              bind:value={newWorkspaceDescription}
              class="input resize-none"
              rows="3"
              placeholder="Describe your workspace"
              disabled={isCreating}
            ></textarea>
          </div>

          <div>
            <label for="color" class="block text-sm font-medium text-dark-300 mb-2">
              Color
            </label>
            <div class="flex items-center space-x-3">
              <input
                id="color"
                type="color"
                bind:value={newWorkspaceColor}
                class="w-12 h-10 rounded border border-dark-700 bg-dark-800"
                disabled={isCreating}
              />
              <span class="text-sm text-dark-400">Choose a color for your workspace</span>
            </div>
          </div>

          <div class="flex items-center">
            <input
              id="public"
              type="checkbox"
              bind:checked={newWorkspaceIsPublic}
              class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
              disabled={isCreating}
            />
            <label for="public" class="ml-2 text-sm text-dark-300">
              Make this workspace public
            </label>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              class="btn-secondary"
              on:click={handleClose}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              class="btn-primary"
              disabled={isCreating || !newWorkspaceName.trim()}
            >
              {#if isCreating}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Creating...
              {:else}
                <Plus class="w-4 h-4 mr-2" />
                Create Workspace
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}