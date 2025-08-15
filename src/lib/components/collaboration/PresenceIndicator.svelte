<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    activeUsers, 
    onlineUserCount, 
    typingUsers, 
    collaborationStatus,
    isConnected 
  } from '$lib/stores/collaboration.js';
  import { 
    Users, 
    Wifi, 
    WifiOff, 
    Circle, 
    Edit3 
  } from 'lucide-svelte';

  export let showDetails = true;
  export let maxVisible = 5;
  export let size = 'md'; // 'sm', 'md', 'lg'

  $: userList = Array.from($activeUsers.values());
  $: visibleUsers = userList.slice(0, maxVisible);
  $: hiddenCount = Math.max(0, userList.length - maxVisible);

  const sizeClasses = {
    sm: 'w-6 h-6 text-xs',
    md: 'w-8 h-8 text-sm',
    lg: 'w-10 h-10 text-base'
  };

  const sizeBorder = {
    sm: 'border-2',
    md: 'border-2',
    lg: 'border-3'
  };

  function getInitials(user) {
    if (user.displayName) {
      return user.displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user.username?.slice(0, 2).toUpperCase() || 'U';
  }
</script>

<div class="presence-indicator">
  <!-- Connection Status -->
  <div class="flex items-center space-x-2 mb-2">
    <div class="flex items-center space-x-1">
      {#if $isConnected}
        <Wifi class="w-4 h-4 text-green-400" />
        <span class="text-xs text-green-400 font-medium">Connected</span>
      {:else}
        <WifiOff class="w-4 h-4 text-red-400" />
        <span class="text-xs text-red-400 font-medium">Disconnected</span>
      {/if}
    </div>
    
    {#if $onlineUserCount > 0}
      <div class="flex items-center space-x-1">
        <Users class="w-4 h-4 text-blue-400" />
        <span class="text-xs text-blue-400 font-medium">
          {$onlineUserCount} online
        </span>
      </div>
    {/if}
  </div>

  <!-- User Avatars -->
  {#if userList.length > 0}
    <div class="flex items-center space-x-1">
      <!-- Visible Users -->
      {#each visibleUsers as user}
        <div 
          class="relative {sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-white {sizeBorder[size]} border-white shadow-sm"
          style="background-color: {user.color};"
          title="{user.displayName || user.username} {user.isTyping ? '(typing...)' : ''}"
        >
          {getInitials(user)}
          
          <!-- Online Status Indicator -->
          <div class="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-400 border-2 border-white rounded-full"></div>
          
          <!-- Typing Indicator -->
          {#if user.isTyping}
            <div class="absolute -top-1 -right-1 w-3 h-3">
              <Edit3 class="w-3 h-3 text-blue-400 animate-pulse" />
            </div>
          {/if}
        </div>
      {/each}

      <!-- Hidden Users Count -->
      {#if hiddenCount > 0}
        <div 
          class="{sizeClasses[size]} rounded-full flex items-center justify-center font-medium text-dark-300 bg-dark-700 border-2 border-dark-600"
          title="{hiddenCount} more user{hiddenCount === 1 ? '' : 's'} online"
        >
          +{hiddenCount}
        </div>
      {/if}
    </div>
  {/if}

  <!-- Typing Indicators -->
  {#if $typingUsers.length > 0 && showDetails}
    <div class="mt-2 text-xs text-dark-400">
      {#if $typingUsers.length === 1}
        <div class="flex items-center space-x-1">
          <Circle class="w-2 h-2 text-blue-400 animate-pulse" />
          <span>{$typingUsers[0].displayName || $typingUsers[0].username} is typing...</span>
        </div>
      {:else if $typingUsers.length === 2}
        <div class="flex items-center space-x-1">
          <Circle class="w-2 h-2 text-blue-400 animate-pulse" />
          <span>
            {$typingUsers[0].displayName || $typingUsers[0].username} and {$typingUsers[1].displayName || $typingUsers[1].username} are typing...
          </span>
        </div>
      {:else}
        <div class="flex items-center space-x-1">
          <Circle class="w-2 h-2 text-blue-400 animate-pulse" />
          <span>Several people are typing...</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Detailed User List (Optional) -->
  {#if showDetails && userList.length > 0}
    <div class="mt-3 space-y-1">
      <div class="text-xs font-medium text-dark-300 mb-2">Active Users</div>
      {#each userList as user}
        <div class="flex items-center space-x-2 text-xs">
          <div 
            class="w-3 h-3 rounded-full"
            style="background-color: {user.color};"
          ></div>
          <span class="text-white">{user.displayName || user.username}</span>
          {#if user.isTyping}
            <span class="text-blue-400 italic">typing...</span>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .presence-indicator {
    /* Ensure consistent spacing and alignment */
    min-height: 2rem;
  }

  /* Smooth transitions for user count changes */
  .presence-indicator > div {
    transition: all 0.3s ease;
  }

  /* Pulse animation for typing indicators */
  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: 0.5;
    }
  }

  .animate-pulse {
    animation: pulse 1.5s infinite;
  }

  /* Hover effects for user avatars */
  .presence-indicator [title] {
    transition: transform 0.2s ease;
  }

  .presence-indicator [title]:hover {
    transform: scale(1.1);
    z-index: 10;
  }
</style>