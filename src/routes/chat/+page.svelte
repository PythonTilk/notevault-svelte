<script lang="ts">
  import { onMount, afterUpdate } from 'svelte';
  import { Send, Smile, Paperclip, Users, Settings } from 'lucide-svelte';
  import { chatMessages, connectedUsers, chatStore, isConnected } from '$lib/stores/chat';
  import { currentUser } from '$lib/stores/auth';
  import ChatMessage from '$lib/components/ChatMessage.svelte';

  let messageInput = '';
  let messagesContainer: HTMLDivElement;
  let showEmojiPicker = false;
  let replyingTo: any = null;

  const emojis = ['😀', '😂', '😍', '🤔', '👍', '👎', '❤️', '🎉', '🔥', '💯'];

  onMount(() => {
    if (!$isConnected) {
      chatStore.connect();
    }
  });

  afterUpdate(() => {
    if (messagesContainer) {
      messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
  });

  async function sendMessage() {
    if (!messageInput.trim()) return;

    const content = replyingTo 
      ? `@${replyingTo.author.displayName} ${messageInput}`
      : messageInput;

    await chatStore.sendMessage(content);
    messageInput = '';
    replyingTo = null;
  }

  function handleKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendMessage();
    }
  }

  function handleReaction(event: CustomEvent<{ messageId: string; emoji: string }>) {
    chatStore.addReaction(event.detail.messageId, event.detail.emoji, $currentUser?.id || '1');
  }

  function handleReply(event: CustomEvent<{ message: any }>) {
    replyingTo = event.detail.message;
    messageInput = '';
    // Focus the input
    const input = document.querySelector('#message-input') as HTMLTextAreaElement;
    input?.focus();
  }

  function insertEmoji(emoji: string) {
    messageInput += emoji;
    showEmojiPicker = false;
  }

  function cancelReply() {
    replyingTo = null;
  }
</script>

<svelte:head>
  <title>Chat - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Community Chat</h1>
      <p class="text-dark-400 text-sm">
        {#if $isConnected}
          {$connectedUsers.length} users online
        {:else}
          Connecting...
        {/if}
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-ghost">
        <Users class="w-4 h-4 mr-2" />
        Members
      </button>
      <button class="btn-ghost">
        <Settings class="w-4 h-4" />
      </button>
    </div>
  </div>
</header>

<div class="flex-1 flex overflow-hidden">
  <!-- Main Chat -->
  <div class="flex-1 flex flex-col">
    <!-- Messages -->
    <div 
      bind:this={messagesContainer}
      class="flex-1 overflow-y-auto px-4 py-4 space-y-1"
    >
      {#if !$isConnected}
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
            <p class="text-dark-400">Connecting to chat...</p>
          </div>
        </div>
      {:else if $chatMessages.length === 0}
        <div class="flex items-center justify-center h-full">
          <div class="text-center">
            <div class="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Send class="w-8 h-8 text-dark-600" />
            </div>
            <h3 class="text-lg font-medium text-white mb-2">No messages yet</h3>
            <p class="text-dark-400">Be the first to start the conversation!</p>
          </div>
        </div>
      {:else}
        {#each $chatMessages as message (message.id)}
          <ChatMessage 
            {message} 
            currentUserId={$currentUser?.id || '1'}
            on:react={handleReaction}
            on:reply={handleReply}
          />
        {/each}
      {/if}
    </div>

    <!-- Message Input -->
    <div class="border-t border-dark-800 p-4">
      {#if replyingTo}
        <div class="bg-dark-800 rounded-lg p-3 mb-3 flex items-center justify-between">
          <div class="flex items-center space-x-2">
            <span class="text-sm text-dark-400">Replying to</span>
            <span class="text-sm font-medium text-white">{replyingTo.author.displayName}</span>
          </div>
          <button
            class="text-dark-400 hover:text-white"
            on:click={cancelReply}
          >
            ×
          </button>
        </div>
      {/if}

      <div class="flex items-end space-x-3">
        <div class="flex-1 relative">
          <textarea
            id="message-input"
            bind:value={messageInput}
            on:keydown={handleKeyPress}
            class="input resize-none pr-20"
            rows="1"
            placeholder={replyingTo ? `Reply to ${replyingTo.author.displayName}...` : "Type a message..."}
            disabled={!$isConnected}
          ></textarea>
          
          <!-- Input Actions -->
          <div class="absolute right-2 bottom-2 flex items-center space-x-1">
            <div class="relative">
              <button
                class="p-1 text-dark-400 hover:text-white rounded"
                on:click={() => showEmojiPicker = !showEmojiPicker}
              >
                <Smile class="w-4 h-4" />
              </button>
              
              {#if showEmojiPicker}
                <div class="absolute bottom-8 right-0 bg-dark-800 border border-dark-700 rounded-lg p-2 grid grid-cols-5 gap-1 z-10">
                  {#each emojis as emoji}
                    <button
                      class="w-8 h-8 flex items-center justify-center hover:bg-dark-700 rounded text-lg"
                      on:click={() => insertEmoji(emoji)}
                    >
                      {emoji}
                    </button>
                  {/each}
                </div>
              {/if}
            </div>
            
            <button class="p-1 text-dark-400 hover:text-white rounded">
              <Paperclip class="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <button
          class="btn-primary px-4 py-2"
          on:click={sendMessage}
          disabled={!messageInput.trim() || !$isConnected}
        >
          <Send class="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>

  <!-- Online Users Sidebar -->
  <div class="w-64 bg-dark-900 border-l border-dark-800 flex flex-col">
    <div class="p-4 border-b border-dark-800">
      <h3 class="text-lg font-semibold text-white">Online Users</h3>
      <p class="text-sm text-dark-400">{$connectedUsers.length} online</p>
    </div>
    
    <div class="flex-1 overflow-y-auto p-4">
      <div class="space-y-3">
        {#each $connectedUsers as user (user.id)}
          <div class="flex items-center space-x-3">
            <div class="relative">
              <img
                src={user.avatar}
                alt={user.displayName}
                class="w-8 h-8 rounded-full"
              />
              <div class="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-dark-900 rounded-full"></div>
            </div>
            <div class="flex-1 min-w-0">
              <p class="text-sm font-medium text-white truncate">
                {user.displayName}
              </p>
              <p class="text-xs text-dark-400 capitalize">
                {user.role}
              </p>
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</div>