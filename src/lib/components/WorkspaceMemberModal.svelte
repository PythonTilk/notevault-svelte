<script lang="ts">
  import { createEventDispatcher, onMount } from 'svelte';
  import { X, UserPlus, Search, Users as UsersIcon } from 'lucide-svelte';
  import { api } from '$lib/api';
  import { currentUser } from '$lib/stores/auth';
  import type { WorkspaceMember, User } from '$lib/types';
  import MemberListItem from './MemberListItem.svelte';
  import MemberInviteModal from './MemberInviteModal.svelte';

  export let workspaceId: string;
  export let workspaceName: string;
  export let initialMembers: WorkspaceMember[] = [];

  const dispatch = createEventDispatcher<{
    close: void;
    'members-updated': { members: WorkspaceMember[] };
  }>();

  let members: WorkspaceMember[] = [...initialMembers];
  let filteredMembers: WorkspaceMember[] = [];
  let searchQuery = '';
  let isLoading = false;
  let error: string | null = null;
  let showInviteModal = false;

  // Current user permissions
  $: currentUserId = $currentUser?.id || '';
  $: currentUserMember = members.find(m => m.userId === currentUserId);
  $: currentUserRole = currentUserMember?.role || 'viewer';
  $: canManageMembers = currentUserRole === 'owner' || currentUserRole === 'admin';

  // Filter members based on search
  $: {
    if (searchQuery.trim()) {
      filteredMembers = members.filter(member =>
        member.user?.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    } else {
      filteredMembers = members;
    }
  }

  // Sort members by role hierarchy
  $: {
    const roleOrder = { owner: 0, admin: 1, member: 2, viewer: 3 };
    filteredMembers = filteredMembers.sort((a, b) => {
      const aOrder = roleOrder[a.role as keyof typeof roleOrder] ?? 999;
      const bOrder = roleOrder[b.role as keyof typeof roleOrder] ?? 999;
      
      if (aOrder !== bOrder) {
        return aOrder - bOrder;
      }
      
      // Sort by name if same role
      const aName = a.user?.displayName || a.user?.username || '';
      const bName = b.user?.displayName || b.user?.username || '';
      return aName.localeCompare(bName);
    });
  }

  onMount(async () => {
    await loadMembers();
  });

  async function loadMembers() {
    isLoading = true;
    error = null;

    try {
      // Load real member data from API
      const memberData = await api.getWorkspaceMembers(workspaceId);
      
      // Transform the data to include user information
      const formattedMembers: WorkspaceMember[] = memberData.map((member: any) => ({
        userId: member.userId,
        role: member.role,
        joinedAt: new Date(member.joinedAt),
        user: {
          id: member.userId,
          username: member.username,
          email: member.email,
          displayName: member.displayName,
          avatar: member.avatar,
          role: 'user', // Default user role for workspace members
          createdAt: new Date(), // We don't have this from the API currently
          lastActive: new Date(), // We don't have this from the API currently
          isOnline: false // We don't have real-time status from this API currently
        }
      }));

      members = formattedMembers;
      dispatch('members-updated', { members });

    } catch (err) {
      console.error('Failed to load workspace members:', err);
      error = err instanceof Error ? err.message : 'Failed to load members';
    } finally {
      isLoading = false;
    }
  }

  async function handleChangeRole(event: CustomEvent<{ userId: string; newRole: string }>) {
    const { userId, newRole } = event.detail;
    
    try {
      await api.addWorkspaceMember(workspaceId, userId, newRole);
      
      // Update local state
      members = members.map(member =>
        member.userId === userId
          ? { ...member, role: newRole as WorkspaceMember['role'] }
          : member
      );
      
      dispatch('members-updated', { members });
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to change member role';
    }
  }

  async function handleRemoveMember(event: CustomEvent<{ userId: string }>) {
    const { userId } = event.detail;
    
    try {
      await api.removeWorkspaceMember(workspaceId, userId);
      
      // Update local state
      members = members.filter(member => member.userId !== userId);
      dispatch('members-updated', { members });
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to remove member';
    }
  }

  function handleMemberInvited(event: CustomEvent<{ email: string; role: string }>) {
    const { email, role } = event.detail;
    
    // Create a temporary member entry for the invited user
    const tempMember: WorkspaceMember = {
      userId: `temp-${Date.now()}`,
      role: role as WorkspaceMember['role'],
      joinedAt: new Date(),
      user: {
        id: `temp-${Date.now()}`,
        username: email.split('@')[0],
        email,
        displayName: email.split('@')[0],
        avatar: null,
        role: 'user',
        createdAt: new Date(),
        lastActive: new Date(),
        isOnline: false
      }
    };
    
    members = [...members, tempMember];
    dispatch('members-updated', { members });
    showInviteModal = false;
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && !showInviteModal) {
      dispatch('close');
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget && !showInviteModal) {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Overlay -->
<div 
  class="fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4"
  on:click={handleOverlayClick}
  role="dialog"
  aria-labelledby="members-modal-title"
  aria-modal="true"
>
  <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-2xl max-h-[90vh] flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-dark-700">
      <div class="flex items-center space-x-3">
        <UsersIcon class="w-6 h-6 text-primary-500" />
        <div>
          <h2 id="members-modal-title" class="text-xl font-semibold text-white">
            Workspace Members
          </h2>
          <p class="text-sm text-dark-400">{workspaceName}</p>
        </div>
      </div>
      <button
        class="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        on:click={() => dispatch('close')}
        aria-label="Close modal"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-hidden flex flex-col">
      <!-- Actions Bar -->
      <div class="p-6 border-b border-dark-700">
        <div class="flex items-center justify-between space-x-4">
          <!-- Search -->
          <div class="relative flex-1 max-w-md">
            <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              type="text"
              bind:value={searchQuery}
              placeholder="Search members..."
              class="input pl-10"
            />
          </div>

          <!-- Invite Button -->
          {#if canManageMembers}
            <button
              class="btn-primary"
              on:click={() => showInviteModal = true}
            >
              <UserPlus class="w-4 h-4 mr-2" />
              Invite Members
            </button>
          {/if}
        </div>

        <!-- Member Count -->
        <div class="mt-4 text-sm text-dark-400">
          {filteredMembers.length} of {members.length} members
          {#if searchQuery}
            matching "{searchQuery}"
          {/if}
        </div>
      </div>

      <!-- Error Message -->
      {#if error}
        <div class="p-6 border-b border-dark-700">
          <div class="bg-red-900/20 border border-red-800 rounded-lg p-4">
            <div class="flex items-center space-x-2">
              <X class="w-5 h-5 text-red-400" />
              <span class="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        </div>
      {/if}

      <!-- Members List -->
      <div class="flex-1 overflow-y-auto p-6">
        {#if isLoading}
          <div class="flex items-center justify-center py-12">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500"></div>
          </div>
        {:else if filteredMembers.length === 0}
          <div class="text-center py-12">
            <UsersIcon class="w-12 h-12 text-dark-600 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">
              {searchQuery ? 'No members found' : 'No members yet'}
            </h3>
            <p class="text-dark-400">
              {searchQuery 
                ? 'Try adjusting your search terms'
                : 'Invite team members to start collaborating'
              }
            </p>
            {#if canManageMembers && !searchQuery}
              <button
                class="btn-primary mt-4"
                on:click={() => showInviteModal = true}
              >
                <UserPlus class="w-4 h-4 mr-2" />
                Invite First Member
              </button>
            {/if}
          </div>
        {:else}
          <div class="space-y-3">
            {#each filteredMembers as member (member.userId)}
              <MemberListItem
                {member}
                {currentUserId}
                {currentUserRole}
                {canManageMembers}
                on:change-role={handleChangeRole}
                on:remove-member={handleRemoveMember}
              />
            {/each}
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="p-6 border-t border-dark-700">
      <div class="flex items-center justify-between">
        <div class="text-sm text-dark-400">
          {members.filter(m => m.user?.isOnline).length} members online
        </div>
        <button
          class="btn-ghost"
          on:click={() => dispatch('close')}
        >
          Close
        </button>
      </div>
    </div>
  </div>
</div>

<!-- Invite Modal -->
{#if showInviteModal}
  <MemberInviteModal
    {workspaceId}
    {workspaceName}
    on:close={() => showInviteModal = false}
    on:member-invited={handleMemberInvited}
  />
{/if}