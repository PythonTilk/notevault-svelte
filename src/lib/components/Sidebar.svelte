<script lang="ts">
  import { page } from '$app/stores';
  import { 
    Home, 
    MessageSquare, 
    FolderOpen, 
    Settings, 
    Users, 
    Bell,
    BarChart3,
    Plus,
    Search,
    LogOut
  } from 'lucide-svelte';
  import { currentUser, authStore } from '$lib/stores/auth';
  import { showCreateWorkspaceModal } from '$lib/stores/modals';
  import { unreadCount } from '$lib/stores/notifications';
  import { goto } from '$app/navigation';
  
  export let visible = true;
  export let focusModeActive = false;
  
  let searchQuery = '';

  const navigation = [
    { name: 'Dashboard', href: '/', icon: Home },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    { name: 'Files', href: '/files', icon: FolderOpen },
    { name: 'Notifications', href: '/notifications', icon: Bell },
  ];

  const adminNavigation = [
    { name: 'Admin Dashboard', href: '/admin', icon: BarChart3 },
    { name: 'User Management', href: '/admin/users', icon: Users },
    { name: 'Settings', href: '/admin/settings', icon: Settings },
  ];

  function isActive(href: string): boolean {
    if (href === '/') {
      return $page.url.pathname === '/';
    }
    return $page.url.pathname.startsWith(href);
  }
  
  // Reactive statement to debug active states
  $: console.log('Current page path:', $page.url.pathname);

  function handleLogout() {
    authStore.logout();
    goto('/login');
  }
  
  function handleSearch() {
    if (searchQuery.trim()) {
      goto(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  }
  
  function handleSearchKeyDown(event: KeyboardEvent) {
    if (event.key === 'Enter') {
      handleSearch();
    }
  }
</script>

<!-- Sidebar -->
<div class="flex flex-col bg-dark-900 border-r border-dark-800 sidebar-transition {visible ? 'w-64' : 'w-0 -translate-x-full'} {focusModeActive ? 'opacity-50' : ''} overflow-hidden">
    <!-- Logo -->
    <div class="flex items-center px-6 py-4 border-b border-dark-800">
      <div class="flex items-center space-x-3">
        <div class="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-sm">NV</span>
        </div>
        <span class="text-xl font-bold text-white">NoteVault</span>
      </div>
    </div>

    <!-- Search -->
    <div class="px-4 py-3 border-b border-dark-800">
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          placeholder="Search..."
          bind:value={searchQuery}
          on:keydown={handleSearchKeyDown}
          class="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
        />
      </div>
    </div>

    <!-- Navigation -->
    <nav class="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
      <!-- Main Navigation -->
      <div class="space-y-1">
        {#each navigation as item}
          <a
            href={item.href}
            class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors {isActive(item.href) ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-800 hover:text-white'}"
          >
            <div class="flex items-center justify-between w-full">
              <div class="flex items-center">
                <svelte:component this={item.icon} class="w-5 h-5 mr-3" />
                {item.name}
              </div>
              
              <!-- Notification Badge -->
              {#if item.name === 'Notifications' && $unreadCount > 0}
                <span class="inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-red-100 bg-red-600 rounded-full">
                  {$unreadCount > 99 ? '99+' : $unreadCount}
                </span>
              {/if}
            </div>
          </a>
        {/each}
      </div>

      <!-- Create New -->
      <div class="pt-4 border-t border-dark-800">
        <button 
          on:click={() => showCreateWorkspaceModal.set(true)}
          class="w-full flex items-center px-3 py-2 text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-white rounded-lg transition-colors"
        >
          <Plus class="w-5 h-5 mr-3" />
          Create Workspace
        </button>
      </div>

      <!-- Admin Navigation -->
      {#if $currentUser?.role === 'admin'}
        <div class="pt-4 border-t border-dark-800">
          <h3 class="px-3 text-xs font-semibold text-dark-400 uppercase tracking-wider mb-2">
            Administration
          </h3>
          <div class="space-y-1">
            {#each adminNavigation as item}
              <a
                href={item.href}
                class="flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors {isActive(item.href) ? 'bg-primary-600 text-white' : 'text-dark-300 hover:bg-dark-800 hover:text-white'}"
              >
                <svelte:component this={item.icon} class="w-5 h-5 mr-3" />
                {item.name}
              </a>
            {/each}
          </div>
        </div>
      {/if}
    </nav>

    <!-- User Profile -->
    <div class="px-4 py-4 border-t border-dark-800">
      {#if $currentUser}
        <div class="flex items-center space-x-3 mb-3">
          <img
            src={$currentUser.avatar}
            alt={$currentUser.displayName}
            class="w-8 h-8 rounded-full"
          />
          <div class="flex-1 min-w-0">
            <p class="text-sm font-medium text-white truncate">
              {$currentUser.displayName}
            </p>
            <p class="text-xs text-dark-400 truncate">
              {$currentUser.role}
            </p>
          </div>
        </div>
        <button
          on:click={handleLogout}
          class="w-full flex items-center px-3 py-2 text-sm font-medium text-dark-300 hover:bg-dark-800 hover:text-white rounded-lg transition-colors"
        >
          <LogOut class="w-4 h-4 mr-3" />
          Sign Out
        </button>
      {/if}
    </div>
  </div>