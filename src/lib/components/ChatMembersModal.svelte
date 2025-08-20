<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Crown, Shield, Ban, MessageCircle, Search, MoreVertical } from 'lucide-svelte';
  import { onlineUsers } from '$lib/stores/chat';
  import { currentUser } from '$lib/stores/auth';

  const dispatch = createEventDispatcher<{
    close: void;
    moderate: { userId: string; action: string };
  }>();

  export let isOpen = false;

  let searchQuery = '';
  let selectedUser: any = null;
  let showUserActions = false;

  // Mock moderation actions for demo
  const moderationActions = [
    { id: 'message', label: 'Send Direct Message', icon: MessageCircle, color: 'text-blue-400' },
    { id: 'mute', label: 'Mute User', icon: Ban, color: 'text-yellow-400' },
    { id: 'kick', label: 'Kick from Chat', icon: Shield, color: 'text-red-400' },
    { id: 'ban', label: 'Ban User', icon: Ban, color: 'text-red-500' }
  ];

  function handleClose() {
    isOpen = false;
    selectedUser = null;
    showUserActions = false;
    dispatch('close');
  }

  function handleUserAction(userId: string, action: string) {
    dispatch('moderate', { userId, action });
    showUserActions = false;
    selectedUser = null;
  }

  function toggleUserActions(user: any) {
    if (selectedUser?.id === user.id) {
      showUserActions = !showUserActions;
    } else {
      selectedUser = user;
      showUserActions = true;
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'admin': return Crown;
      case 'moderator': return Shield;
      default: return null;
    }
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'admin': return 'text-yellow-400';
      case 'moderator': return 'text-blue-400';
      default: return 'text-dark-400';
    }
  }

  function canModerate(targetUser: any): boolean {
    const currentUserRole = $currentUser?.role;
    if (currentUserRole === 'admin') return true;
    if (currentUserRole === 'moderator' && targetUser.role === 'user') return true;
    return false;
  }

  $: filteredUsers = $onlineUsers.filter(user => 
    user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.username?.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

{#if isOpen}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md max-h-[90vh] overflow-hidden">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-dark-800">
        <h2 class="text-xl font-semibold text-white">Chat Members</h2>
        <button
          class="text-dark-400 hover:text-white transition-colors"
          on:click={handleClose}
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <!-- Search -->
      <div class="p-4 border-b border-dark-800">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search members..."
            class="w-full pl-10 pr-4 py-2 bg-dark-800 border border-dark-700 rounded-lg text-sm text-white placeholder-dark-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>
      </div>

      <!-- Members List -->
      <div class="overflow-auto max-h-80">
        <div class="p-4">
          <div class="space-y-2">
            {#each filteredUsers as user (user.id)}
              <div class="flex items-center justify-between p-3 rounded-lg hover:bg-dark-800 transition-colors relative">
                <div class="flex items-center space-x-3 flex-1">
                  <div class="relative">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      class="w-10 h-10 rounded-full"
                    />
                    <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></div>
                  </div>
                  
                  <div class="flex-1 min-w-0">
                    <div class="flex items-center space-x-2">
                      <span class="font-medium text-white truncate">
                        {user.displayName}
                      </span>
                      {#if getRoleIcon(user.role)}
                        <svelte:component 
                          this={getRoleIcon(user.role)} 
                          class="w-4 h-4 {getRoleColor(user.role)}" 
                        />
                      {/if}
                    </div>
                    <p class="text-sm text-dark-400 capitalize truncate">
                      {user.role}
                    </p>
                  </div>
                </div>

                <!-- Moderation Actions -->
                {#if canModerate(user) && user.id !== $currentUser?.id}
                  <div class="relative">
                    <button
                      class="p-2 text-dark-400 hover:text-white transition-colors"
                      on:click={() => toggleUserActions(user)}
                    >
                      <MoreVertical class="w-4 h-4" />
                    </button>

                    {#if showUserActions && selectedUser?.id === user.id}
                      <div class="absolute right-0 top-full mt-1 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-10 min-w-48">
                        {#each moderationActions as action}
                          <button
                            class="w-full flex items-center px-4 py-3 text-left hover:bg-dark-700 transition-colors first:rounded-t-lg last:rounded-b-lg"
                            on:click={() => handleUserAction(user.id, action.id)}
                          >
                            <svelte:component this={action.icon} class="w-4 h-4 mr-3 {action.color}" />
                            <span class="text-white text-sm">{action.label}</span>
                          </button>
                        {/each}
                      </div>
                    {/if}
                  </div>
                {/if}
              </div>
            {/each}

            {#if filteredUsers.length === 0}
              <div class="text-center py-8">
                <p class="text-dark-400">No members found</p>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Footer -->
      <div class="p-4 border-t border-dark-800">
        <div class="flex items-center justify-between text-sm text-dark-400">
          <span>{$onlineUsers.length} members online</span>
          {#if $currentUser?.role === 'admin' || $currentUser?.role === 'moderator'}
            <span class="text-primary-400">Moderation enabled</span>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Click outside to close user actions -->
{#if showUserActions}
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 z-40" 
    on:click={() => { showUserActions = false; selectedUser = null; }}
  ></div>
{/if}