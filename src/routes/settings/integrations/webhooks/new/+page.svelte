<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  import { 
    Webhook, 
    Save, 
    X, 
    Eye, 
    EyeOff, 
    Info, 
    TestTube 
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  let url = '';
  let description = '';
  let secret = '';
  let selectedEvents = [];
  let showSecret = false;
  let isLoading = false;
  let isTesting = false;
  let message = '';
  let messageType: 'success' | 'error' = 'success';

  const availableEvents = [
    { type: 'workspace.created', description: 'Workspace created' },
    { type: 'workspace.updated', description: 'Workspace updated' },
    { type: 'workspace.deleted', description: 'Workspace deleted' },
    { type: 'workspace.shared', description: 'Workspace shared' },
    { type: 'note.created', description: 'Note created' },
    { type: 'note.updated', description: 'Note updated' },
    { type: 'note.deleted', description: 'Note deleted' },
    { type: 'note.shared', description: 'Note shared' },
    { type: 'user.created', description: 'User registered' },
    { type: 'user.updated', description: 'User profile updated' },
    { type: 'user.deleted', description: 'User account deleted' },
    { type: 'collaboration.started', description: 'Collaboration session started' },
    { type: 'collaboration.ended', description: 'Collaboration session ended' },
    { type: 'file.uploaded', description: 'File uploaded' },
    { type: 'file.deleted', description: 'File deleted' },
    { type: 'comment.created', description: 'Comment added' },
    { type: 'comment.updated', description: 'Comment updated' },
    { type: 'comment.deleted', description: 'Comment deleted' }
  ];

  function toggleEvent(eventType: string) {
    if (selectedEvents.includes(eventType)) {
      selectedEvents = selectedEvents.filter(e => e !== eventType);
    } else {
      selectedEvents = [...selectedEvents, eventType];
    }
  }

  function selectAllEvents() {
    selectedEvents = availableEvents.map(e => e.type);
  }

  function clearAllEvents() {
    selectedEvents = [];
  }

  function generateSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    secret = result;
  }

  async function testWebhook() {
    if (!url) {
      showMessage('Please enter a webhook URL first', 'error');
      return;
    }

    isTesting = true;
    try {
      const response = await api.post('/webhooks/test', {
        url,
        secret: secret || null,
        events: selectedEvents.length > 0 ? selectedEvents : ['webhook.test']
      });

      if (response.ok) {
        showMessage('Test webhook sent successfully', 'success');
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to send test webhook', 'error');
      }
    } catch (error) {
      showMessage('Failed to test webhook', 'error');
    } finally {
      isTesting = false;
    }
  }

  async function saveWebhook() {
    if (!url) {
      showMessage('Please enter a webhook URL', 'error');
      return;
    }

    if (selectedEvents.length === 0) {
      showMessage('Please select at least one event', 'error');
      return;
    }

    isLoading = true;
    try {
      const response = await api.post('/webhooks', {
        url,
        description: description || `Webhook for ${new URL(url).hostname}`,
        secret: secret || null,
        events: selectedEvents,
        active: true
      });

      if (response.ok) {
        showMessage('Webhook created successfully', 'success');
        setTimeout(() => {
          goto('/settings/integrations');
        }, 1000);
      } else {
        const error = await response.json();
        showMessage(error.message || 'Failed to create webhook', 'error');
      }
    } catch (error) {
      showMessage('Failed to create webhook', 'error');
    } finally {
      isLoading = false;
    }
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }
</script>

<svelte:head>
  <title>New Webhook - NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-900 p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <div class="flex items-center space-x-3 mb-4">
        <a href="/settings/integrations" class="p-2 rounded-lg hover:bg-dark-800 text-dark-400 hover:text-white">
          <X class="h-5 w-5" />
        </a>
        <Webhook class="h-6 w-6 text-primary-400" />
        <h1 class="text-2xl font-bold text-white">Create Webhook</h1>
      </div>
      <p class="text-dark-400">Configure a webhook to receive real-time notifications from NoteVault</p>
    </div>

    <!-- Message -->
    {#if message}
      <div class="mb-6 p-4 rounded-lg {messageType === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'}">
        {message}
      </div>
    {/if}

    <div class="space-y-8">
      <!-- Basic Configuration -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold text-white mb-6">Basic Configuration</h2>
        
        <div class="space-y-4">
          <div>
            <label for="url" class="block text-sm font-medium text-dark-300 mb-2">
              Webhook URL *
            </label>
            <input
              id="url"
              type="url"
              bind:value={url}
              class="input"
              placeholder="https://your-server.com/webhook"
              required
            />
            <p class="text-xs text-dark-500 mt-1">
              The URL where webhook payloads will be sent
            </p>
          </div>

          <div>
            <label for="description" class="block text-sm font-medium text-dark-300 mb-2">
              Description
            </label>
            <input
              id="description"
              type="text"
              bind:value={description}
              class="input"
              placeholder="Enter a description for this webhook"
            />
          </div>

          <div>
            <label for="secret" class="block text-sm font-medium text-dark-300 mb-2">
              Secret (Optional)
            </label>
            <div class="relative">
              <input
                id="secret"
                type={showSecret ? 'text' : 'password'}
                bind:value={secret}
                class="input pr-20"
                placeholder="Enter webhook secret for signature verification"
              />
              <div class="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
                <button
                  type="button"
                  on:click={() => showSecret = !showSecret}
                  class="p-1 text-dark-400 hover:text-white rounded"
                >
                  {#if showSecret}
                    <EyeOff class="h-4 w-4" />
                  {:else}
                    <Eye class="h-4 w-4" />
                  {/if}
                </button>
                <button
                  type="button"
                  on:click={generateSecret}
                  class="px-2 py-1 text-xs bg-dark-700 text-dark-300 hover:text-white rounded"
                >
                  Generate
                </button>
              </div>
            </div>
            <p class="text-xs text-dark-500 mt-1">
              Used to verify webhook authenticity with HMAC SHA-256 signatures
            </p>
          </div>
        </div>
      </div>

      <!-- Event Selection -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Event Selection</h2>
          <div class="flex items-center space-x-2">
            <button
              on:click={selectAllEvents}
              class="btn-secondary text-sm"
            >
              Select All
            </button>
            <button
              on:click={clearAllEvents}
              class="btn-secondary text-sm"
            >
              Clear All
            </button>
          </div>
        </div>

        <div class="mb-4 p-4 bg-blue-500/10 border border-blue-400 rounded-lg">
          <div class="flex items-start space-x-2">
            <Info class="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div class="text-sm text-blue-300">
              <p class="font-medium mb-1">Event Selection</p>
              <p>Choose which events will trigger this webhook. You can select multiple events or use wildcards.</p>
            </div>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each availableEvents as event}
            <label class="flex items-start space-x-3 p-3 rounded-lg border border-dark-700 hover:border-dark-600 cursor-pointer {selectedEvents.includes(event.type) ? 'bg-primary-500/10 border-primary-400' : ''}">
              <input
                type="checkbox"
                checked={selectedEvents.includes(event.type)}
                on:change={() => toggleEvent(event.type)}
                class="mt-1 w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 rounded focus:ring-primary-500 focus:ring-2"
              />
              <div class="flex-1">
                <div class="text-sm font-medium text-white">{event.description}</div>
                <div class="text-xs text-dark-400 font-mono">{event.type}</div>
              </div>
            </label>
          {/each}
        </div>

        <div class="mt-4 text-sm text-dark-400">
          Selected: {selectedEvents.length} event{selectedEvents.length !== 1 ? 's' : ''}
        </div>
      </div>

      <!-- Actions -->
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button
            on:click={testWebhook}
            class="btn-secondary"
            disabled={isTesting || !url}
          >
            <TestTube class="h-4 w-4 mr-2" />
            {isTesting ? 'Testing...' : 'Test Webhook'}
          </button>
        </div>

        <div class="flex items-center space-x-3">
          <a href="/settings/integrations" class="btn-secondary">
            Cancel
          </a>
          <button
            on:click={saveWebhook}
            class="btn-primary"
            disabled={isLoading || !url || selectedEvents.length === 0}
          >
            <Save class="h-4 w-4 mr-2" />
            {isLoading ? 'Creating...' : 'Create Webhook'}
          </button>
        </div>
      </div>
    </div>
  </div>
</div>