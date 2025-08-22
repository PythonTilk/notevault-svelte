<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { FolderOpen, ArrowLeft, Plus } from 'lucide-svelte';
  import { workspaces } from '$lib/stores/workspaces';
  import { api } from '$lib/api';

  let allCollections: any[] = [];
  let loading = true;

  onMount(async () => {
    await loadAllCollections();
    loading = false;
  });

  async function loadAllCollections() {
    try {
      const workspacesData = await api.getWorkspaces();
      const collections: any[] = [];
      
      for (const workspace of workspacesData) {
        try {
          const workspaceCollections = await api.getCollections(workspace.id);
          workspaceCollections.forEach((collection: any) => {
            collections.push({
              ...collection,
              workspaceName: workspace.name,
              workspaceId: workspace.id,
              workspaceColor: workspace.color
            });
          });
        } catch (error) {
          console.warn(`Failed to load collections for workspace ${workspace.id}:`, error);
        }
      }
      
      allCollections = collections;
    } catch (error) {
      console.error('Failed to load collections:', error);
    }
  }

  function goToWorkspace(workspaceId: string) {
    goto(`/workspaces/${workspaceId}`);
  }

  function goToDashboard() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Collections - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <button 
        class="text-dark-400 hover:text-white transition-colors"
        on:click={goToDashboard}
      >
        <ArrowLeft class="w-5 h-5" />
      </button>
      <div>
        <h1 class="text-xl font-bold text-white">Collections</h1>
        <p class="text-dark-400 text-sm">Organize your notes across workspaces</p>
      </div>
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-6xl mx-auto">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-pulse flex items-center space-x-2">
          <div class="w-6 h-6 bg-dark-600 rounded"></div>
          <div class="w-32 h-4 bg-dark-600 rounded"></div>
        </div>
      </div>
    {:else if allCollections.length === 0}
      <div class="text-center py-12">
        <FolderOpen class="w-16 h-16 mx-auto mb-6 text-dark-600" />
        <h2 class="text-2xl font-bold text-white mb-4">No Collections Yet</h2>
        <p class="text-dark-400 mb-8 max-w-md mx-auto">
          Collections help you organize notes within workspaces. 
          Create collections from within your workspaces to get started.
        </p>
        <div class="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            class="btn-primary"
            on:click={goToDashboard}
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    {:else}
      <!-- Collections Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {#each allCollections as collection}
          <div class="card hover:bg-dark-800 transition-colors cursor-pointer" on:click={() => goToWorkspace(collection.workspaceId)}>
            <div class="flex items-start justify-between">
              <div class="flex items-center space-x-3">
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                  style="background-color: {collection.workspaceColor || '#3b82f6'}"
                >
                  <FolderOpen class="w-5 h-5" />
                </div>
                <div>
                  <h3 class="font-semibold text-white">{collection.name}</h3>
                  <p class="text-sm text-dark-400">{collection.workspaceName}</p>
                </div>
              </div>
              <span class="text-xs text-dark-500 bg-dark-800 px-2 py-1 rounded">
                {collection.noteIds?.length || 0} notes
              </span>
            </div>
            
            {#if collection.description}
              <p class="text-dark-300 text-sm mt-3">{collection.description}</p>
            {/if}
            
            <div class="mt-4 pt-4 border-t border-dark-800">
              <div class="flex items-center justify-between text-xs text-dark-400">
                <span>Click to open workspace</span>
                <span>Updated {new Date(collection.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        {/each}
      </div>
      
      <!-- Info Panel -->
      <div class="mt-8 card bg-dark-800/50">
        <div class="flex items-center space-x-3 mb-4">
          <FolderOpen class="w-5 h-5 text-primary-400" />
          <h3 class="text-lg font-semibold text-white">About Collections</h3>
        </div>
        <p class="text-dark-300 mb-4">
          Collections are organizational tools within workspaces that help you group related notes together.
          To manage collections, open a workspace and use the Collections sidebar.
        </p>
        <div class="flex space-x-4">
          <button 
            class="btn-secondary"
            on:click={goToDashboard}
          >
            <ArrowLeft class="w-4 h-4 mr-2" />
            Back to Dashboard
          </button>
        </div>
      </div>
    {/if}
  </div>
</main>