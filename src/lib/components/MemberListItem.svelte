<script lang="ts">
  import { Crown, User, Eye, MoreVertical, Shield, Trash2 } from 'lucide-svelte';
  import type { WorkspaceMember } from '$lib/types';
  import { createEventDispatcher } from 'svelte';

  export let member: WorkspaceMember;
  export let currentUserId: string;
  export let currentUserRole: string;
  export let canManageMembers: boolean = false;

  const dispatch = createEventDispatcher<{
    'change-role': { userId: string; newRole: string };
    'remove-member': { userId: string };
  }>();

  let showDropdown = false;

  function getRoleIcon(role: string) {
    switch (role) {
      case 'owner':
        return Crown;
      case 'admin':
        return Shield;
      case 'member':
        return User;
      case 'viewer':
        return Eye;
      default:
        return User;
    }
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'owner':
        return 'text-yellow-400';
      case 'admin':
        return 'text-red-400';
      case 'member':
        return 'text-blue-400';
      case 'viewer':
        return 'text-gray-400';
      default:
        return 'text-gray-400';
    }
  }

  function getRoleName(role: string) {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  function formatDate(date: Date) {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function handleChangeRole(newRole: string) {
    dispatch('change-role', { userId: member.userId, newRole });
    showDropdown = false;
  }

  function handleRemoveMember() {
    if (confirm(`Are you sure you want to remove ${member.user?.displayName || member.user?.username} from this workspace?`)) {
      dispatch('remove-member', { userId: member.userId });
    }
    showDropdown = false;
  }

  function closeDropdown() {
    showDropdown = false;
  }

  // Close dropdown when clicking outside
  function handleWindowClick(event: MouseEvent) {
    if (showDropdown && !event.target?.closest('.member-dropdown')) {
      closeDropdown();
    }
  }

  $: if (typeof window !== 'undefined') {
    if (showDropdown) {
      window.addEventListener('click', handleWindowClick);
    } else {
      window.removeEventListener('click', handleWindowClick);
    }
  }
</script>

<div class="flex items-center justify-between p-3 rounded-lg border border-dark-700 hover:border-dark-600 transition-colors">
  <div class="flex items-center space-x-3">
    <!-- Avatar -->
    <div class="w-10 h-10 rounded-full bg-gradient-to-r from-primary-500 to-primary-600 flex items-center justify-center text-white font-medium">
      {#if member.user?.avatar}
        <img src={member.user.avatar} alt={member.user.displayName} class="w-full h-full rounded-full object-cover" />
      {:else}
        {(member.user?.displayName || member.user?.username || 'U').charAt(0).toUpperCase()}
      {/if}
    </div>

    <!-- User Info -->
    <div class="flex-1 min-w-0">
      <div class="flex items-center space-x-2">
        <h3 class="text-sm font-medium text-white truncate">
          {member.user?.displayName || member.user?.username || 'Unknown User'}
        </h3>
        {#if member.userId === currentUserId}
          <span class="text-xs bg-primary-600 text-white px-2 py-1 rounded-full">You</span>
        {/if}
      </div>
      <div class="flex items-center space-x-2 mt-1">
        <svelte:component this={getRoleIcon(member.role)} class="w-3 h-3 {getRoleColor(member.role)}" />
        <span class="text-xs {getRoleColor(member.role)}">{getRoleName(member.role)}</span>
        <span class="text-xs text-dark-400">•</span>
        <span class="text-xs text-dark-400">Joined {formatDate(member.joinedAt)}</span>
      </div>
    </div>

    <!-- Online Status -->
    {#if member.user?.isOnline}
      <div class="w-2 h-2 bg-green-400 rounded-full" title="Online"></div>
    {:else}
      <div class="w-2 h-2 bg-dark-600 rounded-full" title="Offline"></div>
    {/if}
  </div>

  <!-- Actions -->
  {#if canManageMembers && member.role !== 'owner' && member.userId !== currentUserId}
    <div class="relative member-dropdown">
      <button
        class="p-2 text-dark-400 hover:text-white hover:bg-dark-700 rounded-lg transition-colors"
        on:click={() => showDropdown = !showDropdown}
        aria-label="Member actions"
      >
        <MoreVertical class="w-4 h-4" />
      </button>

      {#if showDropdown}
        <div class="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50">
          <div class="py-1">
            <!-- Role Change Options -->
            <div class="px-3 py-2 text-xs font-medium text-dark-400 uppercase tracking-wide">
              Change Role
            </div>
            
            {#if member.role !== 'admin' && currentUserRole === 'owner'}
              <button
                class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                on:click={() => handleChangeRole('admin')}
              >
                <Shield class="w-4 h-4 text-red-400" />
                <span>Make Admin</span>
              </button>
            {/if}
            
            {#if member.role !== 'member'}
              <button
                class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                on:click={() => handleChangeRole('member')}
              >
                <User class="w-4 h-4 text-blue-400" />
                <span>Make Member</span>
              </button>
            {/if}
            
            {#if member.role !== 'viewer'}
              <button
                class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                on:click={() => handleChangeRole('viewer')}
              >
                <Eye class="w-4 h-4 text-gray-400" />
                <span>Make Viewer</span>
              </button>
            {/if}

            <div class="border-t border-dark-700 mt-1"></div>
            
            <!-- Remove Member -->
            <button
              class="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-dark-700 flex items-center space-x-2"
              on:click={handleRemoveMember}
            >
              <Trash2 class="w-4 h-4" />
              <span>Remove from workspace</span>
            </button>
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  /* Cleanup event listeners on destroy */
  :global(.member-dropdown) {
    position: relative;
  }
</style>