<script lang="ts">
  import { Users, Calendar, Lock, Globe } from 'lucide-svelte';
  import type { Workspace } from '$lib/types';

  export let workspace: Workspace;
  export let onClick: (() => void) | undefined = undefined;

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }
</script>

<div
  class="card hover:bg-dark-800 transition-colors cursor-pointer group"
  on:click={onClick}
  on:keydown={(e) => e.key === 'Enter' && onClick?.()}
  role="button"
  tabindex="0"
>
  <!-- Header -->
  <div class="flex items-start justify-between mb-4">
    <div class="flex items-center space-x-3">
      <div
        class="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-lg"
        style="background-color: {workspace.color}"
      >
        {workspace.name.charAt(0).toUpperCase()}
      </div>
      <div>
        <h3 class="text-lg font-semibold text-white group-hover:text-primary-400 transition-colors">
          {workspace.name}
        </h3>
        <div class="flex items-center space-x-2 text-sm text-dark-400">
          {#if workspace.isPublic}
            <Globe class="w-4 h-4" />
            <span>Public</span>
          {:else}
            <Lock class="w-4 h-4" />
            <span>Private</span>
          {/if}
        </div>
      </div>
    </div>
  </div>

  <!-- Description -->
  {#if workspace.description}
    <p class="text-dark-300 text-sm mb-4 line-clamp-2">
      {workspace.description}
    </p>
  {/if}

  <!-- Stats -->
  <div class="flex items-center justify-between text-sm text-dark-400">
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-1">
        <Users class="w-4 h-4" />
        <span>{(workspace.members || []).length} member{(workspace.members || []).length !== 1 ? 's' : ''}</span>
      </div>
      <div class="flex items-center space-x-1">
        <Calendar class="w-4 h-4" />
        <span>Updated {formatDate(workspace.updatedAt)}</span>
      </div>
    </div>
  </div>

  <!-- Members Preview -->
  <div class="flex items-center space-x-2 mt-4">
    <div class="flex -space-x-2">
      {#each (workspace.members || []).slice(0, 3) as member}
        <img
          src="https://api.dicebear.com/7.x/avataaars/svg?seed={member.userId || member.id || 'default'}"
          alt="Member"
          class="w-6 h-6 rounded-full border-2 border-dark-900"
          on:error={(e) => {
            e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=default`;
          }}
        />
      {/each}
      {#if (workspace.members || []).length > 3}
        <div class="w-6 h-6 rounded-full bg-dark-700 border-2 border-dark-900 flex items-center justify-center">
          <span class="text-xs text-dark-300">+{(workspace.members || []).length - 3}</span>
        </div>
      {/if}
    </div>
  </div>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>