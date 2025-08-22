<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Search, 
    Filter, 
    Plus,
    Calendar,
    Users,
    Eye,
    Settings,
    Trash2,
    AlertTriangle,
    CheckCircle,
    Clock,
    Megaphone,
    BarChart3
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  interface Announcement {
    id: string;
    title: string;
    content: string;
    priority: 'low' | 'medium' | 'high' | 'urgent';
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
    expiresAt?: Date;
    author: {
      id: string;
      displayName: string;
      avatar?: string;
    };
    stats: {
      views: number;
      clicks: number;
      dismissed: number;
    };
  }

  let announcements: Announcement[] = [];
  let searchQuery = '';
  let selectedPriority = 'all';
  let selectedStatus = 'all';
  let loading = true;
  let error = '';
  let showCreateModal = false;
  let showEditModal = false;
  let selectedAnnouncement: Announcement | null = null;

  // New announcement form data
  let newAnnouncement = {
    title: '',
    content: '',
    priority: 'medium' as 'low' | 'medium' | 'high' | 'urgent',
    expiresAt: '',
    isActive: true
  };

  const priorityColors = {
    low: 'text-green-400 bg-green-400/10',
    medium: 'text-blue-400 bg-blue-400/10',
    high: 'text-yellow-400 bg-yellow-400/10',
    urgent: 'text-red-400 bg-red-400/10'
  };

  const priorityIcons = {
    low: CheckCircle,
    medium: Clock,
    high: AlertTriangle,
    urgent: AlertTriangle
  };

  onMount(async () => {
    await loadAnnouncements();
  });

  async function loadAnnouncements() {
    try {
      loading = true;
      error = '';
      const announcementsResponse = await api.getAdminAnnouncements();
      announcements = announcementsResponse.map((announcement: any) => ({
        id: announcement.id,
        title: announcement.title,
        content: announcement.content,
        priority: announcement.priority || 'medium',
        isActive: announcement.isActive !== false,
        createdAt: new Date(announcement.createdAt),
        updatedAt: new Date(announcement.updatedAt),
        expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt) : undefined,
        author: {
          id: announcement.author?.id || 'admin',
          displayName: announcement.author?.displayName || 'Admin',
          avatar: announcement.author?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`
        },
        stats: {
          views: announcement.stats?.views || 0,
          clicks: announcement.stats?.clicks || 0,
          dismissed: announcement.stats?.dismissed || 0
        }
      }));
    } catch (err) {
      console.error('Failed to load announcements:', err);
      error = 'Failed to load announcements';
      
      // Generate mock data as fallback
      announcements = generateMockAnnouncements();
    } finally {
      loading = false;
    }
  }

  function generateMockAnnouncements(): Announcement[] {
    const mockAnnouncements = [
      {
        id: '1',
        title: 'Welcome to NoteVault 2.0!',
        content: 'We\'re excited to announce the launch of NoteVault 2.0 with new collaboration features, improved performance, and a redesigned interface.',
        priority: 'high' as const,
        isActive: true,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        author: {
          id: 'admin',
          displayName: 'Admin Team',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=admin`
        },
        stats: { views: 342, clicks: 89, dismissed: 12 }
      },
      {
        id: '2',
        title: 'Scheduled Maintenance',
        content: 'We will be performing scheduled maintenance on Sunday, August 20th from 2:00 AM to 4:00 AM EST. During this time, the service may be temporarily unavailable.',
        priority: 'urgent' as const,
        isActive: true,
        createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        expiresAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        author: {
          id: 'admin',
          displayName: 'System Admin',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=system`
        },
        stats: { views: 156, clicks: 23, dismissed: 5 }
      },
      {
        id: '3',
        title: 'New Calendar Integration Available',
        content: 'You can now connect your Google Calendar and Outlook calendars directly to NoteVault for seamless schedule management.',
        priority: 'medium' as const,
        isActive: false,
        createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        updatedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        author: {
          id: 'admin',
          displayName: 'Product Team',
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=product`
        },
        stats: { views: 89, clicks: 45, dismissed: 8 }
      }
    ];

    return mockAnnouncements;
  }

  async function createAnnouncement() {
    try {
      const announcementData = {
        title: newAnnouncement.title,
        content: newAnnouncement.content,
        priority: newAnnouncement.priority,
        expiresAt: newAnnouncement.expiresAt || undefined
      };

      await api.createAnnouncement(announcementData);
      showMessage('Announcement created successfully', 'success');
      showCreateModal = false;
      resetForm();
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
      showMessage('Failed to create announcement', 'error');
    }
  }

  async function updateAnnouncement(id: string, updates: any) {
    try {
      await api.updateAnnouncement(id, updates);
      showMessage('Announcement updated successfully', 'success');
      await loadAnnouncements();
    } catch (err) {
      console.error('Failed to update announcement:', err);
      showMessage('Failed to update announcement', 'error');
    }
  }

  async function deleteAnnouncement(id: string) {
    if (!confirm('Are you sure you want to delete this announcement?')) {
      return;
    }
    
    try {
      await api.deleteAnnouncement(id);
      announcements = announcements.filter(a => a.id !== id);
      showMessage('Announcement deleted successfully', 'success');
    } catch (err) {
      console.error('Failed to delete announcement:', err);
      showMessage('Failed to delete announcement', 'error');
    }
  }

  async function toggleAnnouncementStatus(id: string, isActive: boolean) {
    await updateAnnouncement(id, { isActive: !isActive });
  }

  function resetForm() {
    newAnnouncement = {
      title: '',
      content: '',
      priority: 'medium',
      expiresAt: '',
      isActive: true
    };
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

  function isExpired(expiresAt?: Date): boolean {
    if (!expiresAt) return false;
    return new Date() > expiresAt;
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }

  let message = '';
  let messageType: 'success' | 'error' = 'success';

  $: filteredAnnouncements = announcements.filter(announcement => {
    const matchesSearch = announcement.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         announcement.content.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPriority = selectedPriority === 'all' || announcement.priority === selectedPriority;
    const matchesStatus = selectedStatus === 'all' || 
                          (selectedStatus === 'active' && announcement.isActive && !isExpired(announcement.expiresAt)) ||
                          (selectedStatus === 'inactive' && !announcement.isActive) ||
                          (selectedStatus === 'expired' && isExpired(announcement.expiresAt));
    return matchesSearch && matchesPriority && matchesStatus;
  });

  $: announcementStats = {
    total: announcements.length,
    active: announcements.filter(a => a.isActive && !isExpired(a.expiresAt)).length,
    inactive: announcements.filter(a => !a.isActive).length,
    expired: announcements.filter(a => isExpired(a.expiresAt)).length,
    totalViews: announcements.reduce((sum, a) => sum + a.stats.views, 0),
    totalClicks: announcements.reduce((sum, a) => sum + a.stats.clicks, 0)
  };
</script>

<svelte:head>
  <title>Announcement Management - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Announcement Management</h1>
      <p class="text-dark-400 text-sm">
        {announcementStats.total} total • {announcementStats.active} active • {announcementStats.totalViews} views
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-secondary" on:click={loadAnnouncements}>
        <Filter class="w-4 h-4 mr-2" />
        Refresh
      </button>
      <button
        class="btn-primary"
        on:click={() => showCreateModal = true}
      >
        <Plus class="w-4 h-4 mr-2" />
        New Announcement
      </button>
    </div>
  </div>
</header>

<!-- Message -->
{#if message}
  <div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
    <div class="p-3 rounded-lg {messageType === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'}">
      {message}
    </div>
  </div>
{/if}

<!-- Stats Bar -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center space-x-6">
    <div class="flex items-center space-x-2">
      <Megaphone class="w-4 h-4 text-green-400" />
      <span class="text-sm text-dark-300">{announcementStats.active} Active</span>
    </div>
    <div class="flex items-center space-x-2">
      <Clock class="w-4 h-4 text-gray-400" />
      <span class="text-sm text-dark-300">{announcementStats.inactive} Inactive</span>
    </div>
    <div class="flex items-center space-x-2">
      <AlertTriangle class="w-4 h-4 text-red-400" />
      <span class="text-sm text-dark-300">{announcementStats.expired} Expired</span>
    </div>
    <div class="flex items-center space-x-2">
      <Eye class="w-4 h-4 text-blue-400" />
      <span class="text-sm text-dark-300">{announcementStats.totalViews} Total Views</span>
    </div>
    <div class="flex items-center space-x-2">
      <BarChart3 class="w-4 h-4 text-purple-400" />
      <span class="text-sm text-dark-300">{announcementStats.totalClicks} Total Clicks</span>
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
        placeholder="Search announcements..."
        class="input pl-10"
      />
    </div>
    
    <!-- Priority Filter -->
    <select
      bind:value={selectedPriority}
      class="input w-32"
    >
      <option value="all">All Priorities</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="urgent">Urgent</option>
    </select>

    <!-- Status Filter -->
    <select
      bind:value={selectedStatus}
      class="input w-32"
    >
      <option value="all">All Status</option>
      <option value="active">Active</option>
      <option value="inactive">Inactive</option>
      <option value="expired">Expired</option>
    </select>
  </div>
</div>

<!-- Announcements -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-6xl mx-auto">
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
          <div class="text-red-400 mb-2">Error loading announcements</div>
          <button class="btn-primary" on:click={loadAnnouncements}>Retry</button>
        </div>
      </div>
    {:else if filteredAnnouncements.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <Megaphone class="w-12 h-12 mx-auto mb-4 text-dark-400" />
          <div class="text-dark-400 mb-2">No announcements found</div>
          {#if searchQuery || selectedPriority !== 'all' || selectedStatus !== 'all'}
            <button class="text-primary-400 hover:text-primary-300" on:click={() => { 
              searchQuery = ''; 
              selectedPriority = 'all'; 
              selectedStatus = 'all'; 
            }}>
              Clear filters
            </button>
          {:else}
            <button class="btn-primary mt-2" on:click={() => showCreateModal = true}>
              Create your first announcement
            </button>
          {/if}
        </div>
      </div>
    {:else}
      <div class="space-y-4">
        {#each filteredAnnouncements as announcement (announcement.id)}
          <div class="card p-6 relative">
            <!-- Priority Badge -->
            <div class="absolute top-4 right-4">
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {priorityColors[announcement.priority]} capitalize">
                <svelte:component this={priorityIcons[announcement.priority]} class="w-3 h-3 mr-1" />
                {announcement.priority}
              </span>
            </div>

            <!-- Status Badge -->
            {#if !announcement.isActive}
              <div class="absolute top-4 right-20">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-500/10 text-gray-400">
                  Inactive
                </span>
              </div>
            {:else if isExpired(announcement.expiresAt)}
              <div class="absolute top-4 right-20">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400">
                  Expired
                </span>
              </div>
            {/if}

            <div class="flex items-start space-x-4">
              <img
                src={announcement.author.avatar}
                alt={announcement.author.displayName}
                class="w-12 h-12 rounded-full flex-shrink-0"
              />
              
              <div class="flex-1 min-w-0 pr-16">
                <div class="flex items-center space-x-2 mb-2">
                  <h3 class="text-lg font-semibold text-white">{announcement.title}</h3>
                </div>
                
                <p class="text-dark-300 mb-4 leading-relaxed">
                  {announcement.content}
                </p>

                <div class="flex items-center justify-between">
                  <div class="flex items-center space-x-4 text-sm text-dark-400">
                    <span>By {announcement.author.displayName}</span>
                    <span>•</span>
                    <span>{getTimeAgo(announcement.createdAt)}</span>
                    {#if announcement.expiresAt}
                      <span>•</span>
                      <span class="flex items-center space-x-1">
                        <Calendar class="w-3 h-3" />
                        <span>Expires {formatDate(announcement.expiresAt)}</span>
                      </span>
                    {/if}
                  </div>

                  <div class="flex items-center space-x-4">
                    <!-- Stats -->
                    <div class="flex items-center space-x-4 text-sm text-dark-400">
                      <span class="flex items-center space-x-1">
                        <Eye class="w-3 h-3" />
                        <span>{announcement.stats.views}</span>
                      </span>
                      <span class="flex items-center space-x-1">
                        <Users class="w-3 h-3" />
                        <span>{announcement.stats.clicks}</span>
                      </span>
                    </div>

                    <!-- Actions -->
                    <div class="flex items-center space-x-2">
                      <button
                        class="p-1 text-dark-400 hover:text-blue-400 rounded"
                        on:click={() => toggleAnnouncementStatus(announcement.id, announcement.isActive)}
                        title={announcement.isActive ? 'Deactivate' : 'Activate'}
                      >
                        {#if announcement.isActive}
                          <Eye class="w-4 h-4" />
                        {:else}
                          <CheckCircle class="w-4 h-4" />
                        {/if}
                      </button>
                      
                      <button
                        class="p-1 text-dark-400 hover:text-white rounded"
                        on:click={() => {
                          selectedAnnouncement = announcement;
                          showEditModal = true;
                        }}
                        title="Edit Announcement"
                      >
                        <Settings class="w-4 h-4" />
                      </button>
                      
                      <button
                        class="p-1 text-dark-400 hover:text-red-400 rounded"
                        on:click={() => deleteAnnouncement(announcement.id)}
                        title="Delete Announcement"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  </div>
</main>

<!-- Create Announcement Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[90vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <h2 class="text-xl font-semibold text-white">Create Announcement</h2>
      </div>
      
      <div class="p-6 overflow-auto max-h-96">
        <form class="space-y-4" on:submit|preventDefault={createAnnouncement}>
          <div>
            <label for="title" class="block text-sm font-medium text-dark-300 mb-2">
              Title *
            </label>
            <input
              id="title"
              type="text"
              bind:value={newAnnouncement.title}
              class="input"
              placeholder="Enter announcement title"
              required
            />
          </div>

          <div>
            <label for="content" class="block text-sm font-medium text-dark-300 mb-2">
              Content *
            </label>
            <textarea
              id="content"
              bind:value={newAnnouncement.content}
              class="input resize-none"
              rows="4"
              placeholder="Enter announcement content"
              required
            ></textarea>
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label for="priority" class="block text-sm font-medium text-dark-300 mb-2">
                Priority
              </label>
              <select id="priority" bind:value={newAnnouncement.priority} class="input">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            
            <div>
              <label for="expires" class="block text-sm font-medium text-dark-300 mb-2">
                Expires (optional)
              </label>
              <input
                id="expires"
                type="datetime-local"
                bind:value={newAnnouncement.expiresAt}
                class="input"
              />
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => { showCreateModal = false; resetForm(); }}
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Create Announcement
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Modal would be similar but pre-populated with selectedAnnouncement data -->
{#if showEditModal && selectedAnnouncement}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl">
      <div class="p-6 border-b border-dark-800">
        <h2 class="text-xl font-semibold text-white">Edit Announcement</h2>
      </div>
      
      <div class="p-6">
        <div class="space-y-4">
          <p class="text-dark-400 text-center">
            Editing feature will be available in the next update.
            <br />
            For now, you can activate/deactivate or delete announcements.
          </p>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-6">
          <button
            class="btn-secondary"
            on:click={() => showEditModal = false}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}