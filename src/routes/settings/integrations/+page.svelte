<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Github, 
    Slack, 
    Calendar, 
    Cloud, 
    Webhook, 
    Settings,
    CheckCircle,
    XCircle,
    ExternalLink,
    Trash2,
    Plus,
    RefreshCw
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  let integrations = {
    github: { connected: false, username: '', repositories: 0 },
    gitlab: { connected: false, username: '', repositories: 0 },
    slack: { connected: false, teamName: '', channels: 0 },
    discord: { connected: false, guildName: '', channels: 0 },
    googleCalendar: { connected: false, email: '', calendars: 0 },
    outlookCalendar: { connected: false, email: '', calendars: 0 },
    googleDrive: { connected: false, email: '', usage: '0 GB' },
    dropbox: { connected: false, email: '', usage: '0 GB' }
  };

  let webhooks = [];
  let isLoading = false;
  let message = '';
  let messageType: 'success' | 'error' = 'success';

  onMount(async () => {
    await loadIntegrations();
    await loadWebhooks();
  });

  async function loadIntegrations() {
    try {
      integrations = await api.getIntegrationsStatus();
    } catch (error) {
      console.error('Failed to load integrations:', error);
      // Keep mock data as fallback for demonstration
    }
  }

  async function loadWebhooks() {
    try {
      webhooks = await api.getWebhooks();
    } catch (error) {
      console.error('Failed to load webhooks:', error);
      // Start with empty array instead of fallback data
      webhooks = [];
    }
  }

  async function connectIntegration(provider: string) {
    try {
      const data = await api.connectIntegration(provider);
      if (data.authUrl) {
        window.open(data.authUrl, '_blank', 'width=600,height=600');
        // Poll for connection status
        pollConnectionStatus(provider);
      } else {
        // For providers that don't need OAuth, mark as connected directly
        integrations[provider].connected = true;
        showMessage(`${provider} connected successfully`, 'success');
      }
    } catch (error) {
      showMessage(`Failed to connect ${provider}`, 'error');
    }
  }

  async function disconnectIntegration(provider: string) {
    if (!confirm(`Are you sure you want to disconnect ${provider}?`)) {
      return;
    }

    try {
      await api.disconnectIntegration(provider);
      integrations[provider].connected = false;
      showMessage(`${provider} disconnected successfully`, 'success');
    } catch (error) {
      showMessage(`Failed to disconnect ${provider}`, 'error');
    }
  }

  function pollConnectionStatus(provider: string) {
    const interval = setInterval(async () => {
      try {
        const data = await api.getIntegrationStatus(provider);
        if (data.connected) {
          integrations[provider] = data;
          showMessage(`${provider} connected successfully!`, 'success');
          clearInterval(interval);
        }
      } catch (error) {
        console.error('Failed to check connection status:', error);
      }
    }, 2000);

    // Stop polling after 2 minutes
    setTimeout(() => clearInterval(interval), 120000);
  }

  async function testWebhook(webhookId: string) {
    try {
      await api.testWebhook(webhookId);
      showMessage('Webhook test sent successfully', 'success');
    } catch (error) {
      showMessage('Failed to test webhook', 'error');
    }
  }

  async function deleteWebhook(webhookId: string) {
    if (!confirm('Are you sure you want to delete this webhook?')) {
      return;
    }

    try {
      await api.deleteWebhook(webhookId);
      webhooks = webhooks.filter(w => w.id !== webhookId);
      showMessage('Webhook deleted successfully', 'success');
    } catch (error) {
      showMessage('Failed to delete webhook', 'error');
    }
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }

  function getIntegrationIcon(provider: string) {
    const icons = {
      github: Github,
      gitlab: Github,
      slack: Slack,
      discord: Slack,
      googleCalendar: Calendar,
      outlookCalendar: Calendar,
      googleDrive: Cloud,
      dropbox: Cloud
    };
    return icons[provider] || Settings;
  }

  function getProviderName(provider: string) {
    const names = {
      github: 'GitHub',
      gitlab: 'GitLab',
      slack: 'Slack',
      discord: 'Discord',
      googleCalendar: 'Google Calendar',
      outlookCalendar: 'Outlook Calendar',
      googleDrive: 'Google Drive',
      dropbox: 'Dropbox'
    };
    return names[provider] || provider;
  }
</script>

<svelte:head>
  <title>Integrations - NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-900 p-6">
  <div class="max-w-6xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Integrations</h1>
      <p class="text-dark-400">Connect external services to enhance your NoteVault experience</p>
    </div>

    <!-- Message -->
    {#if message}
      <div class="mb-6 p-4 rounded-lg {messageType === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'}">
        {message}
      </div>
    {/if}

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      <!-- Git Integration -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Github class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Git Integration</h2>
        </div>

        <div class="space-y-4">
          {#each ['github', 'gitlab'] as provider}
            <div class="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <svelte:component this={getIntegrationIcon(provider)} class="h-5 w-5 text-dark-300" />
                <div>
                  <h3 class="text-white font-medium">{getProviderName(provider)}</h3>
                  {#if integrations[provider].connected}
                    <p class="text-sm text-dark-400">
                      @{integrations[provider].username} • {integrations[provider].repositories} repositories
                    </p>
                  {:else}
                    <p class="text-sm text-dark-400">Not connected</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                {#if integrations[provider].connected}
                  <CheckCircle class="h-5 w-5 text-green-400" />
                  <button
                    on:click={() => disconnectIntegration(provider)}
                    class="btn-secondary text-sm"
                  >
                    Disconnect
                  </button>
                {:else}
                  <XCircle class="h-5 w-5 text-dark-500" />
                  <button
                    on:click={() => connectIntegration(provider)}
                    class="btn-primary text-sm"
                  >
                    Connect
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Chat Integration -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Slack class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Chat Integration</h2>
        </div>

        <div class="space-y-4">
          {#each ['slack', 'discord'] as provider}
            <div class="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <svelte:component this={getIntegrationIcon(provider)} class="h-5 w-5 text-dark-300" />
                <div>
                  <h3 class="text-white font-medium">{getProviderName(provider)}</h3>
                  {#if integrations[provider].connected}
                    <p class="text-sm text-dark-400">
                      {integrations[provider].teamName || integrations[provider].guildName} • {integrations[provider].channels} channels
                    </p>
                  {:else}
                    <p class="text-sm text-dark-400">Not connected</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                {#if integrations[provider].connected}
                  <CheckCircle class="h-5 w-5 text-green-400" />
                  <button
                    on:click={() => disconnectIntegration(provider)}
                    class="btn-secondary text-sm"
                  >
                    Disconnect
                  </button>
                {:else}
                  <XCircle class="h-5 w-5 text-dark-500" />
                  <button
                    on:click={() => connectIntegration(provider)}
                    class="btn-primary text-sm"
                  >
                    Connect
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Calendar Integration -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Calendar class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Calendar Integration</h2>
        </div>

        <div class="space-y-4">
          {#each ['googleCalendar', 'outlookCalendar'] as provider}
            <div class="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <svelte:component this={getIntegrationIcon(provider)} class="h-5 w-5 text-dark-300" />
                <div>
                  <h3 class="text-white font-medium">{getProviderName(provider)}</h3>
                  {#if integrations[provider].connected}
                    <p class="text-sm text-dark-400">
                      {integrations[provider].email} • {integrations[provider].calendars} calendars
                    </p>
                  {:else}
                    <p class="text-sm text-dark-400">Not connected</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                {#if integrations[provider].connected}
                  <CheckCircle class="h-5 w-5 text-green-400" />
                  <button
                    on:click={() => disconnectIntegration(provider)}
                    class="btn-secondary text-sm"
                  >
                    Disconnect
                  </button>
                {:else}
                  <XCircle class="h-5 w-5 text-dark-500" />
                  <button
                    on:click={() => connectIntegration(provider)}
                    class="btn-primary text-sm"
                  >
                    Connect
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Cloud Storage Integration -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Cloud class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Cloud Storage</h2>
        </div>

        <div class="space-y-4">
          {#each ['googleDrive', 'dropbox'] as provider}
            <div class="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <svelte:component this={getIntegrationIcon(provider)} class="h-5 w-5 text-dark-300" />
                <div>
                  <h3 class="text-white font-medium">{getProviderName(provider)}</h3>
                  {#if integrations[provider].connected}
                    <p class="text-sm text-dark-400">
                      {integrations[provider].email} • {integrations[provider].usage} used
                    </p>
                  {:else}
                    <p class="text-sm text-dark-400">Not connected</p>
                  {/if}
                </div>
              </div>
              <div class="flex items-center space-x-2">
                {#if integrations[provider].connected}
                  <CheckCircle class="h-5 w-5 text-green-400" />
                  <button
                    on:click={() => disconnectIntegration(provider)}
                    class="btn-secondary text-sm"
                  >
                    Disconnect
                  </button>
                {:else}
                  <XCircle class="h-5 w-5 text-dark-500" />
                  <button
                    on:click={() => connectIntegration(provider)}
                    class="btn-primary text-sm"
                  >
                    Connect
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>

    <!-- Webhooks Section -->
    <div class="mt-8 card p-6">
      <div class="flex items-center justify-between mb-6">
        <div class="flex items-center space-x-3">
          <Webhook class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Webhooks</h2>
        </div>
        <a href="/settings/integrations/webhooks/new" class="btn-primary">
          <Plus class="h-4 w-4 mr-2" />
          Add Webhook
        </a>
      </div>

      {#if webhooks.length === 0}
        <div class="text-center py-8">
          <Webhook class="h-16 w-16 mx-auto mb-4 text-dark-500" />
          <h3 class="text-lg font-medium text-white mb-2">No webhooks configured</h3>
          <p class="text-dark-400 mb-4">Add webhooks to receive real-time notifications</p>
          <a href="/settings/integrations/webhooks/new" class="btn-primary">
            Create your first webhook
          </a>
        </div>
      {:else}
        <div class="space-y-4">
          {#each webhooks as webhook}
            <div class="flex items-center justify-between p-4 bg-dark-800 rounded-lg">
              <div class="flex-1">
                <div class="flex items-center space-x-3">
                  <div class="w-3 h-3 rounded-full {webhook.active ? 'bg-green-400' : 'bg-red-400'}"></div>
                  <h3 class="text-white font-medium">{webhook.description || 'Webhook'}</h3>
                </div>
                <p class="text-sm text-dark-400 mt-1">{webhook.url}</p>
                <div class="flex items-center space-x-4 mt-2 text-xs text-dark-500">
                  <span>Events: {webhook.events.join(', ')}</span>
                  <span>Success: {webhook.successCount}</span>
                  <span>Failed: {webhook.failureCount}</span>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <button
                  on:click={() => testWebhook(webhook.id)}
                  class="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
                  title="Test webhook"
                >
                  <RefreshCw class="h-4 w-4" />
                </button>
                <a
                  href="/settings/integrations/webhooks/{webhook.id}"
                  class="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700"
                  title="Edit webhook"
                >
                  <Settings class="h-4 w-4" />
                </a>
                <button
                  on:click={() => deleteWebhook(webhook.id)}
                  class="p-2 text-red-400 hover:text-red-300 rounded-lg hover:bg-dark-700"
                  title="Delete webhook"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  </div>
</div>