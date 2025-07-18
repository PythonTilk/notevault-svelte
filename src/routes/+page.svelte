<script lang="ts">
  import { onMount } from 'svelte';
  import { Plus, Grid, List, MessageSquare, Bell, TrendingUp, Users, FileText } from 'lucide-svelte';
  import { workspaces, workspaceStore } from '$lib/stores/workspaces';
  import { chatMessages, chatStore } from '$lib/stores/chat';
  import { currentUser } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import WorkspaceCard from '$lib/components/WorkspaceCard.svelte';

  let viewMode: 'grid' | 'list' = 'grid';
  let showCreateModal = false;
  let newWorkspaceName = '';
  let newWorkspaceDescription = '';
  let newWorkspaceColor = '#ef4444';
  let newWorkspaceIsPublic = false;

  // Mock announcements
  const announcements = [
    {
      id: '1',
      title: 'Welcome to NoteVault!',
      content: 'We\'re excited to have you on board. Check out the new canvas features!',
      priority: 'high' as const,
      author: { displayName: 'Admin Team' },
      createdAt: new Date()
    },
    {
      id: '2',
      title: 'New File Management Features',
      content: 'You can now organize files in folders and share them with your team.',
      priority: 'medium' as const,
      author: { displayName: 'Product Team' },
      createdAt: new Date(Date.now() - 86400000)
    }
  ];

  // Mock stats
  const stats = [
    { label: 'Total Workspaces', value: '12', icon: Grid, color: 'text-blue-400' },
    { label: 'Active Users', value: '48', icon: Users, color: 'text-green-400' },
    { label: 'Notes Created', value: '234', icon: FileText, color: 'text-yellow-400' },
    { label: 'Messages Today', value: '89', icon: MessageSquare, color: 'text-purple-400' }
  ];

  onMount(() => {
    workspaceStore.loadWorkspaces();
    chatStore.connect();
  });

  function handleWorkspaceClick(workspace: any) {
    goto(`/workspaces/${workspace.id}`);
  }

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return;

    const workspace = await workspaceStore.createWorkspace({
      name: newWorkspaceName,
      description: newWorkspaceDescription,
      color: newWorkspaceColor,
      isPublic: newWorkspaceIsPublic
    });

    showCreateModal = false;
    newWorkspaceName = '';
    newWorkspaceDescription = '';
    newWorkspaceColor = '#ef4444';
    newWorkspaceIsPublic = false;

    goto(`/workspaces/${workspace.id}`);
  }

  function getPriorityColor(priority: string) {
    switch (priority) {
      case 'urgent':
        return 'border-red-500 bg-red-500/10';
      case 'high':
        return 'border-orange-500 bg-orange-500/10';
      case 'medium':
        return 'border-yellow-500 bg-yellow-500/10';
      default:
        return 'border-blue-500 bg-blue-500/10';
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }
</script>

<svelte:head>
  <title>Dashboard - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Dashboard</h1>
      <p class="text-dark-400 mt-1">Welcome back, {$currentUser?.displayName}!</p>
    </div>
    <div class="flex items-center space-x-4">
      <button
        class="btn-primary"
        on:click={() => showCreateModal = true}
      >
        <Plus class="w-4 h-4 mr-2" />
        New Workspace
      </button>
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto">
  <div class="max-w-7xl mx-auto px-6 py-8">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {#each stats as stat}
        <div class="card">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <svelte:component this={stat.icon} class="w-8 h-8 {stat.color}" />
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-dark-400">{stat.label}</p>
              <p class="text-2xl font-bold text-white">{stat.value}</p>
            </div>
          </div>
        </div>
      {/each}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <!-- Workspaces -->
      <div class="lg:col-span-2">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Your Workspaces</h2>
          <div class="flex items-center space-x-2">
            <button
              class="p-2 rounded-lg {viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'} transition-colors"
              on:click={() => viewMode = 'grid'}
            >
              <Grid class="w-4 h-4" />
            </button>
            <button
              class="p-2 rounded-lg {viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'} transition-colors"
              on:click={() => viewMode = 'list'}
            >
              <List class="w-4 h-4" />
            </button>
          </div>
        </div>

        {#if $workspaces.length === 0}
          <div class="card text-center py-12">
            <Grid class="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">No workspaces yet</h3>
            <p class="text-dark-400 mb-4">Create your first workspace to get started</p>
            <button
              class="btn-primary"
              on:click={() => showCreateModal = true}
            >
              <Plus class="w-4 h-4 mr-2" />
              Create Workspace
            </button>
          </div>
        {:else}
          <div class={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-6' : 'space-y-4'}>
            {#each $workspaces as workspace}
              <WorkspaceCard 
                {workspace} 
                onClick={() => handleWorkspaceClick(workspace)}
              />
            {/each}
          </div>
        {/if}
      </div>

      <!-- Sidebar -->
      <div class="space-y-6">
        <!-- Announcements -->
        <div class="card">
          <div class="flex items-center space-x-2 mb-4">
            <Bell class="w-5 h-5 text-primary-400" />
            <h3 class="text-lg font-semibold text-white">Announcements</h3>
          </div>
          <div class="space-y-4">
            {#each announcements as announcement}
              <div class="border-l-4 pl-4 {getPriorityColor(announcement.priority)}">
                <h4 class="font-medium text-white text-sm">{announcement.title}</h4>
                <p class="text-dark-300 text-xs mt-1">{announcement.content}</p>
                <div class="flex items-center justify-between mt-2 text-xs text-dark-400">
                  <span>{announcement.author.displayName}</span>
                  <span>{formatDate(announcement.createdAt)}</span>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Recent Chat -->
        <div class="card">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center space-x-2">
              <MessageSquare class="w-5 h-5 text-primary-400" />
              <h3 class="text-lg font-semibold text-white">Recent Chat</h3>
            </div>
            <a href="/chat" class="text-sm text-primary-400 hover:text-primary-300">View all</a>
          </div>
          <div class="space-y-3">
            {#each $chatMessages.slice(-3) as message}
              <div class="flex items-start space-x-3">
                <img
                  src={message.author.avatar}
                  alt={message.author.displayName}
                  class="w-6 h-6 rounded-full flex-shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <div class="flex items-center space-x-2">
                    <span class="text-sm font-medium text-white truncate">
                      {message.author.displayName}
                    </span>
                    <span class="text-xs text-dark-400">
                      {formatDate(message.createdAt)}
                    </span>
                  </div>
                  <p class="text-sm text-dark-300 truncate mt-1">
                    {message.content}
                  </p>
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Quick Actions -->
        <div class="card">
          <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div class="space-y-2">
            <a href="/chat" class="block w-full text-left p-3 rounded-lg hover:bg-dark-800 transition-colors">
              <div class="flex items-center space-x-3">
                <MessageSquare class="w-5 h-5 text-primary-400" />
                <span class="text-white">Join Chat</span>
              </div>
            </a>
            <a href="/files" class="block w-full text-left p-3 rounded-lg hover:bg-dark-800 transition-colors">
              <div class="flex items-center space-x-3">
                <FileText class="w-5 h-5 text-primary-400" />
                <span class="text-white">Browse Files</span>
              </div>
            </a>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>

<!-- Create Workspace Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Create New Workspace</h2>
        
        <form on:submit|preventDefault={handleCreateWorkspace} class="space-y-4">
          <div>
            <label for="name" class="block text-sm font-medium text-dark-300 mb-2">
              Workspace Name
            </label>
            <input
              id="name"
              type="text"
              bind:value={newWorkspaceName}
              class="input"
              placeholder="Enter workspace name"
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
            />
            <label for="public" class="ml-2 text-sm text-dark-300">
              Make this workspace public
            </label>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => showCreateModal = false}
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Create Workspace
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}