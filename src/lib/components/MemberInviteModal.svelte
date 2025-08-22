<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Mail, User, Eye, Shield, Copy, Check } from 'lucide-svelte';
  import { api } from '$lib/api';

  export let workspaceId: string;
  export let workspaceName: string;

  const dispatch = createEventDispatcher<{
    close: void;
    'member-invited': { email: string; role: string };
  }>();

  let email = '';
  let selectedRole = 'member';
  let inviteMessage = '';
  let isLoading = false;
  let error: string | null = null;
  let success: string | null = null;
  let inviteLink = '';
  let linkCopied = false;

  const roles = [
    { value: 'viewer', label: 'Viewer', description: 'Can view notes and files', icon: Eye, color: 'text-gray-400' },
    { value: 'member', label: 'Member', description: 'Can create and edit notes', icon: User, color: 'text-blue-400' },
    { value: 'admin', label: 'Admin', description: 'Can manage workspace and members', icon: Shield, color: 'text-red-400' }
  ];

  $: defaultMessage = `You've been invited to join the "${workspaceName}" workspace on NoteVault. This workspace will help us collaborate on projects and share ideas.`;

  async function handleEmailInvite() {
    if (!email.trim()) {
      error = 'Please enter an email address';
      return;
    }

    if (!email.includes('@')) {
      error = 'Please enter a valid email address';
      return;
    }

    isLoading = true;
    error = null;

    try {
      await api.addWorkspaceMember(workspaceId, email.trim(), selectedRole);
      
      success = `Invitation sent to ${email}`;
      dispatch('member-invited', { email: email.trim(), role: selectedRole });
      
      // Reset form
      email = '';
      selectedRole = 'member';
      inviteMessage = '';
      
      setTimeout(() => {
        success = null;
      }, 3000);
      
    } catch (err) {
      error = err instanceof Error ? err.message : 'Failed to send invitation';
    } finally {
      isLoading = false;
    }
  }

  async function generateInviteLink() {
    isLoading = true;
    error = null;

    try {
      // Mock invite link generation (implement with real backend)
      const token = btoa(`${workspaceId}:${selectedRole}:${Date.now()}`);
      inviteLink = `${window.location.origin}/invite/${token}`;
      
    } catch (err) {
      error = 'Failed to generate invite link';
    } finally {
      isLoading = false;
    }
  }

  async function copyInviteLink() {
    try {
      await navigator.clipboard.writeText(inviteLink);
      linkCopied = true;
      setTimeout(() => {
        linkCopied = false;
      }, 2000);
    } catch (err) {
      error = 'Failed to copy link';
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      dispatch('close');
    }
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      handleEmailInvite();
    }
  }

  function handleOverlayClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      dispatch('close');
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

<!-- Modal Overlay -->
<div 
  class="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
  on:click={handleOverlayClick}
  role="dialog"
  aria-labelledby="invite-modal-title"
  aria-modal="true"
>
  <div class="bg-dark-900 rounded-xl border border-dark-700 w-full max-w-md max-h-[90vh] overflow-y-auto">
    <!-- Header -->
    <div class="flex items-center justify-between p-6 border-b border-dark-700">
      <h2 id="invite-modal-title" class="text-xl font-semibold text-white">
        Invite Members
      </h2>
      <button
        class="p-2 text-dark-400 hover:text-white hover:bg-dark-800 rounded-lg transition-colors"
        on:click={() => dispatch('close')}
        aria-label="Close modal"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <!-- Content -->
    <div class="p-6 space-y-6">
      <!-- Success Message -->
      {#if success}
        <div class="bg-green-900/20 border border-green-800 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <Check class="w-5 h-5 text-green-400" />
            <span class="text-green-400 text-sm">{success}</span>
          </div>
        </div>
      {/if}

      <!-- Error Message -->
      {#if error}
        <div class="bg-red-900/20 border border-red-800 rounded-lg p-4">
          <div class="flex items-center space-x-2">
            <X class="w-5 h-5 text-red-400" />
            <span class="text-red-400 text-sm">{error}</span>
          </div>
        </div>
      {/if}

      <!-- Email Invitation Form -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-white">Send Email Invitation</h3>
        
        <!-- Email Input -->
        <div>
          <label for="email" class="block text-sm font-medium text-dark-300 mb-2">
            Email Address
          </label>
          <div class="relative">
            <Mail class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
            <input
              id="email"
              type="email"
              bind:value={email}
              placeholder="colleague@example.com"
              class="input pl-10"
              required
            />
          </div>
        </div>

        <!-- Role Selection -->
        <div>
          <label class="block text-sm font-medium text-dark-300 mb-2">
            Role
          </label>
          <div class="space-y-2">
            {#each roles as role}
              <label class="flex items-start space-x-3 p-3 rounded-lg border border-dark-700 hover:border-dark-600 cursor-pointer {selectedRole === role.value ? 'bg-primary-500/10 border-primary-400' : ''}">
                <input
                  type="radio"
                  name="role"
                  value={role.value}
                  bind:group={selectedRole}
                  class="mt-1"
                />
                <div class="flex-1">
                  <div class="flex items-center space-x-2">
                    <svelte:component this={role.icon} class="w-4 h-4 {role.color}" />
                    <span class="font-medium text-white">{role.label}</span>
                  </div>
                  <p class="text-sm text-dark-400 mt-1">{role.description}</p>
                </div>
              </label>
            {/each}
          </div>
        </div>

        <!-- Custom Message -->
        <div>
          <label for="message" class="block text-sm font-medium text-dark-300 mb-2">
            Personal Message (Optional)
          </label>
          <textarea
            id="message"
            bind:value={inviteMessage}
            placeholder={defaultMessage}
            rows="3"
            class="input resize-none"
          ></textarea>
        </div>

        <!-- Send Button -->
        <button
          class="btn-primary w-full"
          disabled={isLoading || !email.trim()}
          on:click={handleEmailInvite}
        >
          {#if isLoading}
            <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
          {/if}
          Send Invitation
        </button>
      </div>

      <!-- Divider -->
      <div class="flex items-center space-x-4">
        <div class="flex-1 h-px bg-dark-700"></div>
        <span class="text-dark-400 text-sm">OR</span>
        <div class="flex-1 h-px bg-dark-700"></div>
      </div>

      <!-- Invite Link -->
      <div class="space-y-4">
        <h3 class="text-lg font-medium text-white">Share Invite Link</h3>
        
        {#if !inviteLink}
          <button
            class="btn-ghost w-full"
            disabled={isLoading}
            on:click={generateInviteLink}
          >
            {#if isLoading}
              <div class="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500 mr-2"></div>
            {/if}
            Generate Invite Link
          </button>
        {:else}
          <div class="space-y-2">
            <label class="block text-sm font-medium text-dark-300">
              Invite Link
            </label>
            <div class="flex items-center space-x-2">
              <input
                type="text"
                value={inviteLink}
                readonly
                class="input flex-1 bg-dark-800"
              />
              <button
                class="btn-ghost"
                on:click={copyInviteLink}
                title="Copy link"
              >
                {#if linkCopied}
                  <Check class="w-4 h-4 text-green-400" />
                {:else}
                  <Copy class="w-4 h-4" />
                {/if}
              </button>
            </div>
            <p class="text-sm text-dark-400">
              This link will give {selectedRole} access to the workspace.
            </p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Footer -->
    <div class="flex items-center justify-end space-x-3 p-6 border-t border-dark-700">
      <button
        class="btn-ghost"
        on:click={() => dispatch('close')}
      >
        Cancel
      </button>
    </div>
  </div>
</div>