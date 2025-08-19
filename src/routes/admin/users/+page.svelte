<script lang="ts">
  import { onMount } from 'svelte';
  import { Search, Filter, UserPlus, Crown, Shield, User, Ban, Mail, MoreHorizontal } from 'lucide-svelte';
  import type { User as UserType } from '$lib/types';
  import { api } from '$lib/api';

  let users: UserType[] = [];
  let pendingInvitations = [];
  let searchQuery = '';
  let selectedRole = 'all';
  let showCreateModal = false;
  let selectedUser: UserType | null = null;
  let showUserModal = false;
  let selectedTab = 'users';
  let loading = true;
  let error = '';

  onMount(async () => {
    await loadUsers();
    await loadPendingInvitations();
  });

  async function loadUsers() {
    try {
      loading = true;
      error = '';
      const usersResponse = await api.getUsers({ limit: 100 });
      users = usersResponse.map((user: any) => ({
        id: user.id,
        username: user.username,
        email: user.email,
        displayName: user.displayName,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`,
        role: user.role,
        createdAt: new Date(user.createdAt),
        lastActive: user.lastActive ? new Date(user.lastActive) : new Date(),
        isOnline: user.isOnline || false
      }));
    } catch (err) {
      console.error('Failed to load users:', err);
      error = 'Failed to load users';
      users = [];
    } finally {
      loading = false;
    }
  }

  async function loadPendingInvitations() {
    try {
      const response = await api.getPendingInvitations();
      pendingInvitations = response || [];
    } catch (err) {
      console.error('Failed to load pending invitations:', err);
      pendingInvitations = [];
    }
  }

  async function cancelInvitation(invitationId: string, email: string) {
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) {
      return;
    }

    try {
      await api.cancelInvitation(invitationId);
      showMessage('Invitation cancelled successfully', 'success');
      await loadPendingInvitations();
    } catch (err) {
      console.error('Failed to cancel invitation:', err);
      showMessage('Failed to cancel invitation', 'error');
    }
  }

  function getRoleIcon(role: string) {
    switch (role) {
      case 'admin':
        return Crown;
      case 'moderator':
        return Shield;
      default:
        return User;
    }
  }

  function getRoleColor(role: string) {
    switch (role) {
      case 'admin':
        return 'text-yellow-400 bg-yellow-400/10';
      case 'moderator':
        return 'text-blue-400 bg-blue-400/10';
      default:
        return 'text-dark-400 bg-dark-400/10';
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

  async function updateUserRole(userId: string, newRole: 'admin' | 'moderator' | 'user') {
    try {
      await api.updateUserRole(userId, newRole);
      // Update local state
      users = users.map(user => 
        user.id === userId ? { ...user, role: newRole } : user
      );
      showMessage(`User role updated to ${newRole}`, 'success');
    } catch (err) {
      console.error('Failed to update user role:', err);
      showMessage('Failed to update user role', 'error');
    }
  }

  async function inviteUser(email: string, role: string, message?: string) {
    try {
      await api.inviteUser({
        email,
        role,
        message: message || undefined
      });
      showMessage(`Invitation sent to ${email}`, 'success');
      showCreateModal = false;
      await loadPendingInvitations(); // Load invitations to show the new one
    } catch (err) {
      console.error('Failed to send invitation:', err);
      const errorMessage = err.response?.data?.error || 'Failed to send invitation';
      showMessage(errorMessage, 'error');
    }
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

  async function deleteUser(userId: string) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }
    
    try {
      await api.deleteUser(userId);
      // Remove from local state
      users = users.filter(user => user.id !== userId);
    } catch (err) {
      console.error('Failed to delete user:', err);
      alert('Failed to delete user');
    }
  }

  function sendEmail(userId: string) {
    const user = users.find(u => u.id === userId);
    if (user) {
      window.location.href = `mailto:${user.email}`;
    }
  }

  $: filteredUsers = users.filter(user => {
    const matchesSearch = user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role === selectedRole;
    return matchesSearch && matchesRole;
  });

  $: userStats = {
    total: users.length,
    online: users.filter(u => u.isOnline).length,
    admins: users.filter(u => u.role === 'admin').length,
    moderators: users.filter(u => u.role === 'moderator').length,
    users: users.filter(u => u.role === 'user').length
  };
</script>

<svelte:head>
  <title>User Management - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">User Management</h1>
      <p class="text-dark-400 text-sm">
        {userStats.total} total users • {userStats.online} online • {pendingInvitations.length} pending invitations
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-secondary" on:click={() => { loadUsers(); loadPendingInvitations(); }}>
        <Filter class="w-4 h-4 mr-2" />
        Refresh
      </button>
      <button
        class="btn-primary"
        on:click={() => showCreateModal = true}
      >
        <UserPlus class="w-4 h-4 mr-2" />
        Invite User
      </button>
    </div>
  </div>

  <!-- Tabs -->
  <div class="mt-6">
    <nav class="flex space-x-8">
      <button
        on:click={() => selectedTab = 'users'}
        class="flex items-center space-x-2 pb-4 text-sm font-medium border-b-2 transition-colors"
        class:text-white={selectedTab === 'users'}
        class:border-primary-400={selectedTab === 'users'}
        class:text-dark-400={selectedTab !== 'users'}
        class:border-transparent={selectedTab !== 'users'}
        class:hover:text-white={selectedTab !== 'users'}
      >
        <User class="w-4 h-4" />
        <span>Users ({users.length})</span>
      </button>
      <button
        on:click={() => selectedTab = 'invitations'}
        class="flex items-center space-x-2 pb-4 text-sm font-medium border-b-2 transition-colors"
        class:text-white={selectedTab === 'invitations'}
        class:border-primary-400={selectedTab === 'invitations'}
        class:text-dark-400={selectedTab !== 'invitations'}
        class:border-transparent={selectedTab !== 'invitations'}
        class:hover:text-white={selectedTab !== 'invitations'}
      >
        <Mail class="w-4 h-4" />
        <span>Pending Invitations ({pendingInvitations.length})</span>
      </button>
    </nav>
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
      <Crown class="w-4 h-4 text-yellow-400" />
      <span class="text-sm text-dark-300">{userStats.admins} Admins</span>
    </div>
    <div class="flex items-center space-x-2">
      <Shield class="w-4 h-4 text-blue-400" />
      <span class="text-sm text-dark-300">{userStats.moderators} Moderators</span>
    </div>
    <div class="flex items-center space-x-2">
      <User class="w-4 h-4 text-dark-400" />
      <span class="text-sm text-dark-300">{userStats.users} Users</span>
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
        placeholder="Search users..."
        class="input pl-10"
      />
    </div>
    
    <!-- Role Filter -->
    <select
      bind:value={selectedRole}
      class="input w-40"
    >
      <option value="all">All Roles</option>
      <option value="admin">Admins</option>
      <option value="moderator">Moderators</option>
      <option value="user">Users</option>
    </select>
  </div>
</div>

<!-- Users Table -->
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
          <div class="text-red-400 mb-2">Error loading users</div>
          <button class="btn-primary" on:click={loadUsers}>Retry</button>
        </div>
      </div>
    {:else if filteredUsers.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <User class="w-12 h-12 mx-auto mb-4 text-dark-400" />
          <div class="text-dark-400 mb-2">No users found</div>
          {#if searchQuery || selectedRole !== 'all'}
            <button class="text-primary-400 hover:text-primary-300" on:click={() => { searchQuery = ''; selectedRole = 'all'; }}>
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
                User
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Role
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Status
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Last Active
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Joined
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-800">
            {#each filteredUsers as user (user.id)}
              <tr class="hover:bg-dark-800 transition-colors">
              <!-- User Info -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center">
                  <div class="relative">
                    <img
                      src={user.avatar}
                      alt={user.displayName}
                      class="w-10 h-10 rounded-full"
                    />
                    {#if user.isOnline}
                      <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></div>
                    {/if}
                  </div>
                  <div class="ml-4">
                    <div class="text-sm font-medium text-white">
                      {user.displayName}
                    </div>
                    <div class="text-sm text-dark-400">
                      @{user.username}
                    </div>
                    <div class="text-xs text-dark-500">
                      {user.email}
                    </div>
                  </div>
                </div>
              </td>

              <!-- Role -->
              <td class="px-6 py-4 whitespace-nowrap">
                <div class="flex items-center space-x-2">
                  <svelte:component this={getRoleIcon(user.role)} class="w-4 h-4 {getRoleColor(user.role).split(' ')[0]}" />
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {getRoleColor(user.role)} capitalize">
                    {user.role}
                  </span>
                </div>
              </td>

              <!-- Status -->
              <td class="px-6 py-4 whitespace-nowrap">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {user.isOnline ? 'bg-green-500/10 text-green-400' : 'bg-dark-500/10 text-dark-400'}">
                  {user.isOnline ? 'Online' : 'Offline'}
                </span>
              </td>

              <!-- Last Active -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                {user.isOnline ? 'Now' : getTimeAgo(user.lastActive)}
              </td>

              <!-- Joined -->
              <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                {formatDate(user.createdAt)}
              </td>

              <!-- Actions -->
              <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                <div class="flex items-center justify-end space-x-2">
                  <!-- Role Change Dropdown -->
                  <select
                    value={user.role}
                    on:change={(e) => updateUserRole(user.id, e.target.value)}
                    class="text-xs bg-dark-800 border border-dark-700 rounded px-2 py-1 text-white"
                  >
                    <option value="user">User</option>
                    <option value="moderator">Moderator</option>
                    <option value="admin">Admin</option>
                  </select>

                  <!-- Action Buttons -->
                  <button
                    class="p-1 text-dark-400 hover:text-blue-400 rounded"
                    on:click={() => sendEmail(user.id)}
                    title="Send Email"
                  >
                    <Mail class="w-4 h-4" />
                  </button>
                  
                  <button
                    class="p-1 text-dark-400 hover:text-red-400 rounded"
                    on:click={() => deleteUser(user.id)}
                    title="Delete User"
                  >
                    <Ban class="w-4 h-4" />
                  </button>
                  
                  <button
                    class="p-1 text-dark-400 hover:text-white rounded"
                    on:click={() => {
                      selectedUser = user;
                      showUserModal = true;
                    }}
                    title="More Actions"
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

<!-- Invite User Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Invite User</h2>
        
        <form class="space-y-4" on:submit|preventDefault={(e) => {
          const formData = new FormData(e.target);
          const email = formData.get('email');
          const role = formData.get('role');
          const welcomeMessage = formData.get('message');
          if (email) inviteUser(email, role, welcomeMessage);
        }}>
          <div>
            <label for="email" class="block text-sm font-medium text-dark-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              class="input"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label for="role" class="block text-sm font-medium text-dark-300 mb-2">
              Role
            </label>
            <select id="role" name="role" class="input">
              <option value="user">User</option>
              <option value="moderator">Moderator</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label for="message" class="block text-sm font-medium text-dark-300 mb-2">
              Welcome Message (optional)
            </label>
            <textarea
              id="message"
              name="message"
              class="input resize-none"
              rows="3"
              placeholder="Welcome to NoteVault!"
            ></textarea>
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
              Send Invitation
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- User Detail Modal -->
{#if showUserModal && selectedUser}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-lg">
      <div class="p-6">
        <div class="flex items-center space-x-4 mb-6">
          <img
            src={selectedUser.avatar}
            alt={selectedUser.displayName}
            class="w-16 h-16 rounded-full"
          />
          <div>
            <h2 class="text-xl font-semibold text-white">{selectedUser.displayName}</h2>
            <p class="text-dark-400">@{selectedUser.username}</p>
            <p class="text-dark-400 text-sm">{selectedUser.email}</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-1">Role</label>
              <p class="text-white capitalize">{selectedUser.role}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-1">Status</label>
              <p class="text-white">{selectedUser.isOnline ? 'Online' : 'Offline'}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-1">Joined</label>
              <p class="text-white">{formatDate(selectedUser.createdAt)}</p>
            </div>
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-1">Last Active</label>
              <p class="text-white">{formatDate(selectedUser.lastActive)}</p>
            </div>
          </div>
        </div>

        <div class="flex items-center justify-end space-x-3 pt-6">
          <button
            class="btn-secondary"
            on:click={() => showUserModal = false}
          >
            Close
          </button>
          <button class="btn-primary">
            Edit User
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}