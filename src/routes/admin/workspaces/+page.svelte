<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Search, 
    Filter, 
    Users, 
    FileText, 
    Calendar, 
    Trash2, 
    Eye, 
    Settings, 
    Lock,
    Globe,
    MoreHorizontal
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  interface Workspace {
    id: string;
    name: string;
    description?: string;
    color: string;
    isPublic: boolean;
    createdAt: Date;
    updatedAt: Date;
    memberCount: number;
    noteCount: number;
    fileCount: number;
    owner: {
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
    };
    lastActivity?: Date;
  }

  let workspaces: Workspace[] = [];
  let searchQuery = '';
  let selectedVisibility = 'all';
  let selectedSort = 'updated';
  let loading = true;
  let error = '';
  let selectedWorkspace: Workspace | null = null;
  let showWorkspaceModal = false;

  const sortOptions = [
    { value: 'updated', label: 'Last Updated' },
    { value: 'created', label: 'Date Created' },
    { value: 'name', label: 'Name' },
    { value: 'members', label: 'Member Count' },
    { value: 'activity', label: 'Last Activity' }
  ];

  onMount(async () => {
    await loadWorkspaces();
  });

  async function loadWorkspaces() {
    try {
      loading = true;
      error = '';
      const workspacesResponse = await api.getAdminWorkspaces({ limit: 100 });
      workspaces = workspacesResponse.map((workspace: any) => ({
        id: workspace.id,
        name: workspace.name,
        description: workspace.description,
        color: workspace.color,
        isPublic: workspace.isPublic,
        createdAt: new Date(workspace.createdAt),
        updatedAt: new Date(workspace.updatedAt),
        memberCount: workspace.memberCount || 0,
        noteCount: workspace.noteCount || 0,
        fileCount: workspace.fileCount || 0,
        owner: {
          id: workspace.owner.id,
          username: workspace.owner.username,
          displayName: workspace.owner.displayName,
          avatar: workspace.owner.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${workspace.owner.username}`
        },
        lastActivity: workspace.lastActivity ? new Date(workspace.lastActivity) : new Date()
      }));
    } catch (err) {
      console.error('Failed to load workspaces:', err);
      error = 'Failed to load workspaces';
      workspaces = [];
    } finally {
      loading = false;
    }
  }

  async function deleteWorkspace(workspaceId: string) {
    if (!confirm('Are you sure you want to delete this workspace? This action cannot be undone and will delete all notes, files, and data associated with it.')) {
      return;
    }
    
    try {
      await api.deleteWorkspaceAsAdmin(workspaceId);
      workspaces = workspaces.filter(w => w.id !== workspaceId);
    } catch (err) {
      console.error('Failed to delete workspace:', err);
      alert('Failed to delete workspace');
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function getTimeAgo(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  }

  $: filteredWorkspaces = workspaces.filter(workspace => {
    const matchesSearch = workspace.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         workspace.owner.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (workspace.description || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesVisibility = selectedVisibility === 'all' || 
                              (selectedVisibility === 'public' && workspace.isPublic) ||
                              (selectedVisibility === 'private' && !workspace.isPublic);
    return matchesSearch && matchesVisibility;
  }).sort((a, b) => {
    switch (selectedSort) {
      case 'name':
        return a.name.localeCompare(b.name);
      case 'created':
        return b.createdAt.getTime() - a.createdAt.getTime();
      case 'members':
        return b.memberCount - a.memberCount;
      case 'activity':
        return (b.lastActivity?.getTime() || 0) - (a.lastActivity?.getTime() || 0);
      case 'updated':
      default:
        return b.updatedAt.getTime() - a.updatedAt.getTime();
    }
  });

  $: workspaceStats = {
    total: workspaces.length,
    public: workspaces.filter(w => w.isPublic).length,
    private: workspaces.filter(w => !w.isPublic).length,
    totalMembers: workspaces.reduce((sum, w) => sum + w.memberCount, 0),
    totalNotes: workspaces.reduce((sum, w) => sum + w.noteCount, 0),
    totalFiles: workspaces.reduce((sum, w) => sum + w.fileCount, 0)
  };
</script>

<svelte:head>
  <title>Workspace Management - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Workspace Management</h1>
      <p class="text-dark-400 text-sm">
        {workspaceStats.total} workspaces • {workspaceStats.totalMembers} total members
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-secondary" on:click={loadWorkspaces}>
        <Filter class="w-4 h-4 mr-2" />
        Refresh
      </button>
    </div>
  </div>
</header>

<!-- Stats Bar -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center space-x-6">
    <div class="flex items-center space-x-2">
      <Globe class="w-4 h-4 text-green-400" />
      <span class="text-sm text-dark-300">{workspaceStats.public} Public</span>
    </div>
    <div class="flex items-center space-x-2">
      <Lock class="w-4 h-4 text-yellow-400" />
      <span class="text-sm text-dark-300">{workspaceStats.private} Private</span>
    </div>
    <div class="flex items-center space-x-2">
      <FileText class="w-4 h-4 text-blue-400" />
      <span class="text-sm text-dark-300">{workspaceStats.totalNotes} Notes</span>
    </div>
    <div class="flex items-center space-x-2">
      <Calendar class="w-4 h-4 text-purple-400" />
      <span class="text-sm text-dark-300">{workspaceStats.totalFiles} Files</span>
    </div>
  </div>
</div>

<!-- Filters -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center space-x-4">
    <!-- Search -->
    <div class="relative flex-1 max-w-md">
      <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Search workspaces..."
        class="input pl-10"
      />
    </div>
    
    <!-- Visibility Filter -->
    <select
      bind:value={selectedVisibility}
      class="input w-40"
    >
      <option value="all">All Workspaces</option>
      <option value="public">Public</option>
      <option value="private">Private</option>
    </select>

    <!-- Sort -->
    <select
      bind:value={selectedSort}
      class="input w-40"
    >
      {#each sortOptions as option}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
  </div>
</div>

<!-- Workspaces Table -->
<main class="flex-1 overflow-auto">
  <div class="bg-dark-900">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-pulse flex items-center space-x-2">
          <div class="w-6 h-6 bg-dark-600 rounded"></div>
          <div class="w-32 h-4 bg-dark-600 rounded"></div>
        </div>
      </div>
    {:else if error}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="text-red-400 mb-2">Error loading workspaces</div>
          <button class="btn-primary" on:click={loadWorkspaces}>Retry</button>
        </div>
      </div>
    {:else if filteredWorkspaces.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <Users class="w-12 h-12 mx-auto mb-4 text-dark-400" />
          <div class="text-dark-400 mb-2">No workspaces found</div>
          {#if searchQuery || selectedVisibility !== 'all'}
            <button class="text-primary-400 hover:text-primary-300" on:click={() => { searchQuery = ''; selectedVisibility = 'all'; }}>
              Clear filters
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-dark-800 border-b border-dark-700">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Workspace
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Owner
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Visibility
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Stats
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Last Activity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Created
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-800">
            {#each filteredWorkspaces as workspace (workspace.id)}
              <tr class="hover:bg-dark-800 transition-colors">
                <!-- Workspace Info -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <div 
                      class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-medium"
                      style="background-color: {workspace.color}"
                    >
                      {workspace.name.charAt(0).toUpperCase()}
                    </div>
                    <div class="ml-4">
                      <div class="text-sm font-medium text-white">
                        {workspace.name}
                      </div>
                      {#if workspace.description}
                        <div class="text-sm text-dark-400 max-w-xs truncate">
                          {workspace.description}
                        </div>
                      {/if}
                    </div>
                  </div>
                </td>

                <!-- Owner -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <img
                      src={workspace.owner.avatar}
                      alt={workspace.owner.displayName}
                      class="w-8 h-8 rounded-full mr-3"
                    />
                    <div>
                      <div class="text-sm font-medium text-white">
                        {workspace.owner.displayName}
                      </div>
                      <div class="text-sm text-dark-400">
                        @{workspace.owner.username}
                      </div>
                    </div>
                  </div>
                </td>

                <!-- Visibility -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {workspace.isPublic ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}">
                    <svelte:component 
                      this={workspace.isPublic ? Globe : Lock} 
                      class="w-3 h-3 mr-1" 
                    />
                    {workspace.isPublic ? 'Public' : 'Private'}
                  </span>
                </td>

                <!-- Stats -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  <div class="space-y-1">
                    <div class="flex items-center space-x-2">
                      <Users class="w-3 h-3" />
                      <span>{workspace.memberCount}</span>
                    </div>
                    <div class="flex items-center space-x-2">
                      <FileText class="w-3 h-3" />
                      <span>{workspace.noteCount}</span>
                    </div>
                  </div>
                </td>

                <!-- Last Activity -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  {workspace.lastActivity ? getTimeAgo(workspace.lastActivity) : 'No activity'}
                </td>

                <!-- Created -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  {formatDate(workspace.createdAt)}
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div class="flex items-center justify-end space-x-2">
                    <button
                      class="p-1 text-dark-400 hover:text-blue-400 rounded"
                      on:click={() => window.open(`/workspace/${workspace.id}`, '_blank')}
                      title="View Workspace"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                    
                    <button
                      class="p-1 text-dark-400 hover:text-red-400 rounded"
                      on:click={() => deleteWorkspace(workspace.id)}
                      title="Delete Workspace"
                    >
                      <Trash2 class="w-4 h-4" />
                    </button>
                    
                    <button
                      class="p-1 text-dark-400 hover:text-white rounded"
                      on:click={() => {
                        selectedWorkspace = workspace;
                        showWorkspaceModal = true;
                      }}
                      title="More Info"
                    >
                      <MoreHorizontal class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</main>

<!-- Workspace Detail Modal -->
{#if showWorkspaceModal && selectedWorkspace}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl">
      <div class="p-6">
        <div class="flex items-center space-x-4 mb-6">
          <div 
            class="w-16 h-16 rounded-lg flex items-center justify-center text-white font-medium text-xl"
            style="background-color: {selectedWorkspace.color}"
          >
            {selectedWorkspace.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h2 class="text-xl font-semibold text-white">{selectedWorkspace.name}</h2>
            {#if selectedWorkspace.description}
              <p class="text-dark-400">{selectedWorkspace.description}</p>
            {/if}
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Owner</h3>
            <div class="flex items-center space-x-3">
              <img
                src={selectedWorkspace.owner.avatar}
                alt={selectedWorkspace.owner.displayName}
                class="w-8 h-8 rounded-full"
              />
              <div>
                <p class="text-white">{selectedWorkspace.owner.displayName}</p>
                <p class="text-dark-400 text-sm">@{selectedWorkspace.owner.username}</p>
              </div>
            </div>
          </div>

          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Stats</h3>
            <div class="space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-dark-400">Members:</span>
                <span class="text-white">{selectedWorkspace.memberCount}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-400">Notes:</span>
                <span class="text-white">{selectedWorkspace.noteCount}</span>
              </div>
              <div class="flex items-center justify-between">
                <span class="text-dark-400">Files:</span>
                <span class="text-white">{selectedWorkspace.fileCount}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-6 mb-6">
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Created</h3>
            <p class="text-white">{formatDate(selectedWorkspace.createdAt)}</p>
          </div>
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Last Updated</h3>
            <p class="text-white">{formatDate(selectedWorkspace.updatedAt)}</p>
          </div>
        </div>

        {#if selectedWorkspace.lastActivity}
          <div class="mb-6">
            <h3 class="text-sm font-medium text-dark-300 mb-2">Last Activity</h3>
            <p class="text-white">{formatDate(selectedWorkspace.lastActivity)}</p>
          </div>
        {/if}

        <div class="flex items-center justify-end space-x-3 pt-4 border-t border-dark-800">
          <button
            class="btn-secondary"
            on:click={() => showWorkspaceModal = false}
          >
            Close
          </button>
          <button 
            class="btn-primary"
            on:click={() => window.open(`/workspace/${selectedWorkspace.id}`, '_blank')}
          >
            View Workspace
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}