<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { 
    activeUsers, 
    onlineUserCount, 
    typingUsers, 
    collaborationStatus,
    currentUser as collabCurrentUser
  } from '$lib/stores/collaboration';
  import { currentUser } from '$lib/stores/auth';
  import { Crown, Users, Wifi, WifiOff, Edit3 } from 'lucide-svelte';

  export let workspaceId: string;
  export let compact: boolean = false;
  export let showTypingIndicators: boolean = true;
  export let maxVisible: number = 8;

  let mounted = false;

  // Reactive values from stores
  $: users = Array.from($activeUsers.values());
  $: visibleUsers = users.slice(0, maxVisible);
  $: hiddenCount = Math.max(0, users.length - maxVisible);
  $: status = $collaborationStatus;
  $: typing = $typingUsers;

  onMount(() => {
    mounted = true;
  });

  onDestroy(() => {
    mounted = false;
  });

  function getStatusColor(connected: boolean): string {
    return connected ? 'text-green-400' : 'text-red-400';
  }

  function getStatusText(status: any, isCompact: boolean = false): string {
    switch (status.status) {
      case 'in-room':
        if (isCompact && status.userCount === 0) {
          return '';
        }
        return isCompact ? `${status.userCount}` : `${status.userCount} collaborating`;
      case 'connected':
        return isCompact ? '' : 'Connected';
      case 'disconnected':
      default:
        return isCompact ? '' : 'Offline';
    }
  }

  function formatTypingText(typingUsers: any[]): string {
    if (typingUsers.length === 0) return '';
    
    if (typingUsers.length === 1) {
      return `${typingUsers[0].displayName || typingUsers[0].username} is typing...`;
    } else if (typingUsers.length === 2) {
      return `${typingUsers[0].displayName || typingUsers[0].username} and ${typingUsers[1].displayName || typingUsers[1].username} are typing...`;
    } else {
      return `${typingUsers.length} people are typing...`;
    }
  }
</script>

{#if mounted}
  <div class="collaborators-list" class:compact>
    <!-- Connection Status -->
    <div class="flex items-center space-x-2 mb-3">
      <svelte:component 
        this={status.connected ? Wifi : WifiOff} 
        class="w-4 h-4 {getStatusColor(status.connected)}"
      />
      {#if !compact || getStatusText(status, compact)}
        <span class="text-sm {getStatusColor(status.connected)}">
          {getStatusText(status, compact)}
        </span>
      {/if}
    </div>

    <!-- Active Collaborators -->
    {#if users.length > 0}
      <div class="space-y-2">
        <div class="flex items-center space-x-2 text-sm text-dark-300">
          <Users class="w-4 h-4" />
          <span>Active Collaborators</span>
        </div>

        <!-- User Avatars -->
        <div class="flex items-center space-x-2">
          {#each visibleUsers as user (user.id)}
            <div class="relative group">
              <!-- Avatar -->
              <div 
                class="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-medium border-2 transition-all duration-200 hover:scale-110"
                style="background-color: {user.color}; border-color: {user.color}"
                title="{user.displayName || user.username}{user.isTyping ? ' (typing...)' : ''}"
              >
                {#if user.id === $currentUser?.id}
                  <Crown class="w-4 h-4 text-yellow-300" />
                {:else}
                  {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                {/if}
                
                <!-- Typing indicator -->
                {#if user.isTyping}
                  <div class="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
                    <Edit3 class="w-2 h-2 text-white absolute top-0.5 left-0.5" />
                  </div>
                {/if}
              </div>

              <!-- Tooltip -->
              {#if !compact}
                <div class="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-10">
                  <div class="bg-dark-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap border border-dark-600">
                    {user.displayName || user.username}
                    {#if user.id === $currentUser?.id}
                      <span class="text-yellow-300">(You)</span>
                    {/if}
                    {#if user.isTyping}
                      <span class="text-blue-300">• Typing</span>
                    {/if}
                  </div>
                  <div class="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-dark-800"></div>
                </div>
              {/if}
            </div>
          {/each}

          <!-- Show more indicator -->
          {#if hiddenCount > 0}
            <div 
              class="w-8 h-8 rounded-full bg-dark-700 border-2 border-dark-600 flex items-center justify-center text-dark-300 text-xs font-medium"
              title="{hiddenCount} more collaborator{hiddenCount > 1 ? 's' : ''}"
            >
              +{hiddenCount}
            </div>
          {/if}
        </div>

        <!-- Typing indicators -->
        {#if showTypingIndicators && typing.length > 0}
          <div class="flex items-center space-x-2 text-xs text-blue-400 animate-pulse">
            <Edit3 class="w-3 h-3" />
            <span>{formatTypingText(typing)}</span>
          </div>
        {/if}

        <!-- User list (non-compact mode) -->
        {#if !compact && users.length > 0}
          <div class="mt-4 space-y-1 max-h-32 overflow-y-auto">
            {#each users as user (user.id)}
              <div class="flex items-center space-x-2 text-sm">
                <div 
                  class="w-2 h-2 rounded-full"
                  style="background-color: {user.color}"
                ></div>
                <span class="text-white">
                  {user.displayName || user.username}
                  {#if user.id === $currentUser?.id}
                    <span class="text-yellow-300">(You)</span>
                  {/if}
                </span>
                {#if user.isTyping}
                  <span class="text-blue-400 text-xs">typing...</span>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {:else if status.connected}
      <div class="text-center py-4">
        <Users class="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p class="text-sm text-dark-400">No other collaborators online</p>
      </div>
    {:else}
      <div class="text-center py-4">
        <WifiOff class="w-8 h-8 text-dark-600 mx-auto mb-2" />
        <p class="text-sm text-dark-400">Collaboration offline</p>
      </div>
    {/if}
  </div>
{/if}

<style>
  .collaborators-list {
    @apply bg-dark-800 border border-dark-700 rounded-lg p-4;
  }
  
  .collaborators-list.compact {
    @apply p-2;
  }
  
  /* Custom scrollbar for user list */
  .collaborators-list :global(.overflow-y-auto::-webkit-scrollbar) {
    width: 4px;
  }
  
  .collaborators-list :global(.overflow-y-auto::-webkit-scrollbar-track) {
    background: transparent;
  }
  
  .collaborators-list :global(.overflow-y-auto::-webkit-scrollbar-thumb) {
    background: rgb(75 85 99); /* dark-600 */
    border-radius: 2px;
  }
  
  .collaborators-list :global(.overflow-y-auto::-webkit-scrollbar-thumb:hover) {
    background: rgb(107 114 128); /* dark-500 */
  }
</style>