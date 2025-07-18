<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Crown, Shield, User, MoreHorizontal } from 'lucide-svelte';
  import type { ChatMessage } from '$lib/types';

  export let message: ChatMessage;
  export let currentUserId: string;

  const dispatch = createEventDispatcher<{
    react: { messageId: string; emoji: string };
    reply: { message: ChatMessage };
  }>();

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
        return 'text-yellow-400';
      case 'moderator':
        return 'text-blue-400';
      default:
        return 'text-dark-400';
    }
  }

  function formatTime(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function handleReaction(emoji: string) {
    dispatch('react', { messageId: message.id, emoji });
  }

  function handleReply() {
    dispatch('reply', { message });
  }

  const commonEmojis = ['👍', '❤️', '😂', '😮', '😢', '😡'];
</script>

<div class="flex space-x-3 p-4 hover:bg-dark-800/50 transition-colors group">
  <!-- Avatar -->
  <img
    src={message.author.avatar}
    alt={message.author.displayName}
    class="w-10 h-10 rounded-full flex-shrink-0"
  />

  <!-- Content -->
  <div class="flex-1 min-w-0">
    <!-- Header -->
    <div class="flex items-center space-x-2 mb-1">
      <span class="font-medium text-white">
        {message.author.displayName}
      </span>
      <svelte:component 
        this={getRoleIcon(message.author.role)} 
        class="w-4 h-4 {getRoleColor(message.author.role)}" 
      />
      <span class="text-xs text-dark-400">
        {formatTime(message.createdAt)}
      </span>
      {#if message.editedAt}
        <span class="text-xs text-dark-500">(edited)</span>
      {/if}
    </div>

    <!-- Reply indicator -->
    {#if message.replyToId}
      <div class="text-xs text-dark-400 mb-2 pl-4 border-l-2 border-dark-700">
        Replying to a message
      </div>
    {/if}

    <!-- Message content -->
    <div class="text-dark-200 text-sm mb-2 whitespace-pre-wrap">
      {message.content}
    </div>

    <!-- Reactions -->
    {#if message.reactions.length > 0}
      <div class="flex items-center space-x-1 mb-2">
        {#each message.reactions as reaction}
          <button
            class="inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs bg-dark-700 hover:bg-dark-600 transition-colors {reaction.users.includes(currentUserId) ? 'bg-primary-600 hover:bg-primary-700' : ''}"
            on:click={() => handleReaction(reaction.emoji)}
          >
            <span>{reaction.emoji}</span>
            <span class="text-dark-300">{reaction.count}</span>
          </button>
        {/each}
      </div>
    {/if}

    <!-- Actions (shown on hover) -->
    <div class="opacity-0 group-hover:opacity-100 transition-opacity">
      <div class="flex items-center space-x-2">
        <!-- Quick reactions -->
        <div class="flex items-center space-x-1">
          {#each commonEmojis as emoji}
            <button
              class="w-6 h-6 flex items-center justify-center rounded hover:bg-dark-700 transition-colors text-sm"
              on:click={() => handleReaction(emoji)}
              title="React with {emoji}"
            >
              {emoji}
            </button>
          {/each}
        </div>

        <!-- More actions -->
        <button
          class="w-6 h-6 flex items-center justify-center rounded hover:bg-dark-700 transition-colors"
          on:click={handleReply}
          title="Reply"
        >
          <MoreHorizontal class="w-4 h-4 text-dark-400" />
        </button>
      </div>
    </div>
  </div>
</div>