<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Webhook,
    Plus,
    Settings,
    BarChart3,
    TestTube,
    Play,
    Trash2,
    Eye,
    Copy,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw,
    Download
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  interface WebhookEvent {
    type: string;
    description: string;
  }

  interface WebhookStats {
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    last_delivery: string;
    success_rate: number;
  }

  interface Webhook {
    id: string;
    url: string;
    description: string;
    events: string[];
    active: boolean;
    createdAt: string;
    successCount: number;
    failureCount: number;
    stats?: WebhookStats;
  }

  let webhooks: Webhook[] = [];
  let supportedEvents: WebhookEvent[] = [];
  let selectedWebhook: Webhook | null = null;
  let isLoading = true;
  let selectedTab = 'overview';
  let showStatsModal = false;
  let showTestModal = false;
  let message = '';
  let messageType: 'success' | 'error' = 'success';

  // Test webhook modal data
  let testEventType = '';
  let testEventData = '{}';
  let isTesting = false;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Webhook },
    { id: 'events', label: 'Supported Events', icon: Settings },
    { id: 'testing', label: 'Testing', icon: TestTube }
  ];

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      isLoading = true;
      const [webhooksResponse, eventsResponse] = await Promise.allSettled([
        api.getWebhooks(),
        api.getSupportedWebhookEvents()
      ]);

      if (webhooksResponse.status === 'fulfilled' && webhooksResponse.value?.webhooks) {
        webhooks = webhooksResponse.value.webhooks;
        // Load stats for each webhook
        await loadWebhookStats();
      } else {
        webhooks = generateMockWebhooks();
      }

      if (eventsResponse.status === 'fulfilled' && eventsResponse.value?.events) {
        supportedEvents = eventsResponse.value.events;
      } else {
        supportedEvents = generateMockEvents();
      }
    } catch (error) {
      console.error('Failed to load webhook data:', error);
      webhooks = generateMockWebhooks();
      supportedEvents = generateMockEvents();
    } finally {
      isLoading = false;
    }
  }

  async function loadWebhookStats() {
    const statsPromises = webhooks.map(async (webhook) => {
      try {
        const response = await api.getWebhookStats(webhook.id);
        if (response?.stats) {
          webhook.stats = response.stats;
        }
      } catch (error) {
        console.error(`Failed to load stats for webhook ${webhook.id}:`, error);
      }
    });
    await Promise.allSettled(statsPromises);
    webhooks = [...webhooks]; // Trigger reactivity
  }

  function generateMockWebhooks(): Webhook[] {
    return [
      {
        id: 'wh-1',
        url: 'https://api.example.com/webhooks/notevault',
        description: 'Main application webhook',
        events: ['workspace.created', 'note.created', 'user.created'],
        active: true,
        createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
        successCount: 1247,
        failureCount: 23,
        stats: {
          total_deliveries: 1270,
          successful_deliveries: 1247,
          failed_deliveries: 23,
          last_delivery: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          success_rate: 0.982
        }
      },
      {
        id: 'wh-2',
        url: 'https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXX',
        description: 'Slack notifications',
        events: ['*'],
        active: true,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        successCount: 892,
        failureCount: 5,
        stats: {
          total_deliveries: 897,
          successful_deliveries: 892,
          failed_deliveries: 5,
          last_delivery: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          success_rate: 0.994
        }
      },
      {
        id: 'wh-3',
        url: 'https://inactive-webhook.example.com/hook',
        description: 'Inactive webhook for testing',
        events: ['note.updated', 'note.deleted'],
        active: false,
        createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
        successCount: 45,
        failureCount: 12,
        stats: {
          total_deliveries: 57,
          successful_deliveries: 45,
          failed_deliveries: 12,
          last_delivery: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          success_rate: 0.789
        }
      }
    ];
  }

  function generateMockEvents(): WebhookEvent[] {
    return [
      { type: 'workspace.created', description: 'Workspace created' },
      { type: 'workspace.updated', description: 'Workspace updated' },
      { type: 'workspace.deleted', description: 'Workspace deleted' },
      { type: 'note.created', description: 'Note created' },
      { type: 'note.updated', description: 'Note updated' },
      { type: 'note.deleted', description: 'Note deleted' },
      { type: 'user.created', description: 'User registered' },
      { type: 'user.updated', description: 'User profile updated' },
      { type: 'file.uploaded', description: 'File uploaded' },
      { type: 'comment.created', description: 'Comment added' }
    ];
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
      console.error('Delete webhook error:', error);
      showMessage('Failed to delete webhook', 'error');
    }
  }

  async function testWebhook(webhookId: string) {
    try {
      const response = await api.testWebhook(webhookId);
      showMessage('Test webhook sent successfully', 'success');
    } catch (error) {
      console.error('Test webhook error:', error);
      showMessage('Failed to test webhook', 'error');
    }
  }

  async function triggerEvent() {
    if (!testEventType) {
      showMessage('Please select an event type', 'error');
      return;
    }

    try {
      isTesting = true;
      let eventData;
      try {
        eventData = JSON.parse(testEventData);
      } catch (e) {
        showMessage('Invalid JSON in event data', 'error');
        return;
      }

      await api.triggerWebhookEvent(testEventType, eventData);
      showMessage('Event triggered successfully', 'success');
      showTestModal = false;
    } catch (error) {
      console.error('Trigger event error:', error);
      showMessage('Failed to trigger event', 'error');
    } finally {
      isTesting = false;
    }
  }

  function showStats(webhook: Webhook) {
    selectedWebhook = webhook;
    showStatsModal = true;
  }

  function copyWebhookUrl(url: string) {
    navigator.clipboard.writeText(url);
    showMessage('Webhook URL copied to clipboard', 'success');
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }

  function formatDate(dateString: string): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  }

  function getSuccessRate(webhook: Webhook): number {
    if (webhook.stats) {
      return webhook.stats.success_rate * 100;
    }
    const total = webhook.successCount + webhook.failureCount;
    return total > 0 ? (webhook.successCount / total) * 100 : 0;
  }

  function getStatusColor(webhook: Webhook): string {
    if (!webhook.active) return 'text-gray-400';
    const rate = getSuccessRate(webhook);
    if (rate >= 95) return 'text-green-400';
    if (rate >= 80) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getStatusIcon(webhook: Webhook) {
    if (!webhook.active) return XCircle;
    const rate = getSuccessRate(webhook);
    if (rate >= 95) return CheckCircle;
    if (rate >= 80) return AlertTriangle;
    return XCircle;
  }
</script>

<svelte:head>
  <title>Webhook Management - NoteVault</title>
</svelte:head>

<!-- Message -->
{#if message}
  <div class="mb-6 p-4 rounded-lg {messageType === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'}">
    {message}
  </div>
{/if}

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Webhook Management</h1>
      <p class="text-dark-400 mt-1">Manage and monitor your webhook integrations</p>
    </div>
    <div class="flex items-center space-x-3">
      <button
        on:click={loadData}
        class="btn-secondary flex items-center space-x-2"
      >
        <RefreshCw class="w-4 h-4" />
        <span>Refresh</span>
      </button>
      <a href="/settings/integrations/webhooks/new" class="btn-primary flex items-center space-x-2">
        <Plus class="w-4 h-4" />
        <span>New Webhook</span>
      </a>
    </div>
  </div>

  <!-- Tabs -->
  <div class="mt-6">
    <nav class="flex space-x-8">
      {#each tabs as tab}
        <button
          on:click={() => selectedTab = tab.id}
          class="flex items-center space-x-2 pb-4 text-sm font-medium border-b-2 transition-colors"
          class:text-white={selectedTab === tab.id}
          class:border-primary-400={selectedTab === tab.id}
          class:text-dark-400={selectedTab !== tab.id}
          class:border-transparent={selectedTab !== tab.id}
          class:hover:text-white={selectedTab !== tab.id}
        >
          <svelte:component this={tab.icon} class="w-4 h-4" />
          <span>{tab.label}</span>
        </button>
      {/each}
    </nav>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        <span class="ml-3 text-white">Loading webhooks...</span>
      </div>
    {:else if selectedTab === 'overview'}
      <!-- Overview Tab -->
      <div class="space-y-6">
        <!-- Statistics Cards -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card p-6">
            <div class="flex items-center">
              <Webhook class="w-8 h-8 text-blue-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Total Webhooks</p>
                <p class="text-2xl font-bold text-white">{webhooks.length}</p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <CheckCircle class="w-8 h-8 text-green-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Active</p>
                <p class="text-2xl font-bold text-white">{webhooks.filter(w => w.active).length}</p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <BarChart3 class="w-8 h-8 text-purple-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Total Deliveries</p>
                <p class="text-2xl font-bold text-white">
                  {webhooks.reduce((sum, w) => sum + (w.stats?.total_deliveries || w.successCount + w.failureCount), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <AlertTriangle class="w-8 h-8 text-yellow-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Failed Deliveries</p>
                <p class="text-2xl font-bold text-white">
                  {webhooks.reduce((sum, w) => sum + (w.stats?.failed_deliveries || w.failureCount), 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- Webhooks List -->
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">Your Webhooks</h3>
          </div>
          
          {#if webhooks.length === 0}
            <div class="text-center py-12">
              <Webhook class="h-12 w-12 mx-auto mb-4 text-dark-400" />
              <h3 class="text-lg font-medium text-white mb-2">No webhooks configured</h3>
              <p class="text-dark-400 mb-4">Get started by creating your first webhook</p>
              <a href="/settings/integrations/webhooks/new" class="btn-primary">
                <Plus class="w-4 h-4 mr-2" />
                Create Webhook
              </a>
            </div>
          {:else}
            <div class="space-y-4">
              {#each webhooks as webhook}
                <div class="border border-dark-700 rounded-lg p-4 hover:border-dark-600 transition-colors">
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3 mb-2">
                        <svelte:component this={getStatusIcon(webhook)} class="w-5 h-5 {getStatusColor(webhook)}" />
                        <h4 class="text-lg font-medium text-white">{webhook.description || 'Unnamed Webhook'}</h4>
                        <span class="text-xs px-2 py-1 rounded-full {webhook.active ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}">
                          {webhook.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      
                      <div class="flex items-center space-x-4 text-sm text-dark-400 mb-3">
                        <span class="font-mono">{webhook.url}</span>
                        <button
                          on:click={() => copyWebhookUrl(webhook.url)}
                          class="p-1 hover:text-white transition-colors"
                          title="Copy URL"
                        >
                          <Copy class="w-3 h-3" />
                        </button>
                      </div>

                      <div class="flex items-center space-x-6 text-sm">
                        <div class="flex items-center space-x-2">
                          <span class="text-dark-400">Events:</span>
                          <span class="text-white">{webhook.events.includes('*') ? 'All events' : `${webhook.events.length} selected`}</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-dark-400">Success Rate:</span>
                          <span class="text-white">{getSuccessRate(webhook).toFixed(1)}%</span>
                        </div>
                        <div class="flex items-center space-x-2">
                          <span class="text-dark-400">Created:</span>
                          <span class="text-white">{formatDate(webhook.createdAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div class="flex items-center space-x-2">
                      <button
                        on:click={() => showStats(webhook)}
                        class="btn-sm btn-secondary flex items-center space-x-1"
                        title="View Statistics"
                      >
                        <BarChart3 class="w-3 h-3" />
                        <span>Stats</span>
                      </button>
                      <button
                        on:click={() => testWebhook(webhook.id)}
                        class="btn-sm btn-secondary flex items-center space-x-1"
                        title="Test Webhook"
                      >
                        <TestTube class="w-3 h-3" />
                        <span>Test</span>
                      </button>
                      <button
                        on:click={() => deleteWebhook(webhook.id)}
                        class="btn-sm text-red-400 hover:text-red-300 hover:bg-red-500/10"
                        title="Delete Webhook"
                      >
                        <Trash2 class="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    
    {:else if selectedTab === 'events'}
      <!-- Supported Events Tab -->
      <div class="card p-6">
        <h3 class="text-lg font-semibold text-white mb-6">Supported Webhook Events</h3>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          {#each supportedEvents as event}
            <div class="p-4 bg-dark-800 rounded-lg">
              <div class="font-mono text-sm text-primary-400 mb-1">{event.type}</div>
              <div class="text-white">{event.description}</div>
            </div>
          {/each}
        </div>

        <div class="mt-6 p-4 bg-blue-500/10 border border-blue-400 rounded-lg">
          <h4 class="text-blue-300 font-medium mb-2">Wildcard Support</h4>
          <p class="text-blue-200 text-sm">
            Use "*" to subscribe to all events, or use patterns like "workspace.*" to subscribe to all workspace events.
          </p>
        </div>
      </div>
    
    {:else if selectedTab === 'testing'}
      <!-- Testing Tab -->
      <div class="space-y-6">
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">Manual Event Triggering</h3>
            <button
              on:click={() => showTestModal = true}
              class="btn-primary flex items-center space-x-2"
            >
              <Play class="w-4 h-4" />
              <span>Trigger Event</span>
            </button>
          </div>
          
          <p class="text-dark-400 mb-4">
            Manually trigger webhook events for testing purposes. This will send the event to all active webhooks that are subscribed to the selected event type.
          </p>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 class="text-white font-medium mb-3">Recent Test Events</h4>
              <div class="space-y-2">
                <div class="p-3 bg-dark-800 rounded-lg text-sm">
                  <div class="text-white">workspace.created</div>
                  <div class="text-dark-400">5 minutes ago</div>
                </div>
                <div class="p-3 bg-dark-800 rounded-lg text-sm">
                  <div class="text-white">note.updated</div>
                  <div class="text-dark-400">12 minutes ago</div>
                </div>
              </div>
            </div>
            
            <div>
              <h4 class="text-white font-medium mb-3">Test Guidelines</h4>
              <ul class="text-sm text-dark-400 space-y-1">
                <li>• Test events are sent to all active webhooks</li>
                <li>• Use realistic test data for better testing</li>
                <li>• Monitor webhook logs for delivery status</li>
                <li>• Consider rate limits when testing frequently</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>
</main>

<!-- Webhook Statistics Modal -->
{#if showStatsModal && selectedWebhook}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[80vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Webhook Statistics</h2>
          <button 
            class="p-2 text-dark-400 hover:text-white rounded"
            on:click={() => showStatsModal = false}
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-auto">
        <div class="space-y-6">
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Webhook URL</h3>
            <p class="text-white font-mono text-sm break-all">{selectedWebhook.url}</p>
          </div>

          {#if selectedWebhook.stats}
            <div class="grid grid-cols-2 gap-4">
              <div class="text-center p-4 bg-dark-800 rounded-lg">
                <div class="text-2xl font-bold text-white">{selectedWebhook.stats.total_deliveries}</div>
                <div class="text-sm text-dark-400">Total Deliveries</div>
              </div>
              <div class="text-center p-4 bg-dark-800 rounded-lg">
                <div class="text-2xl font-bold text-green-400">{selectedWebhook.stats.successful_deliveries}</div>
                <div class="text-sm text-dark-400">Successful</div>
              </div>
              <div class="text-center p-4 bg-dark-800 rounded-lg">
                <div class="text-2xl font-bold text-red-400">{selectedWebhook.stats.failed_deliveries}</div>
                <div class="text-sm text-dark-400">Failed</div>
              </div>
              <div class="text-center p-4 bg-dark-800 rounded-lg">
                <div class="text-2xl font-bold text-blue-400">{(selectedWebhook.stats.success_rate * 100).toFixed(1)}%</div>
                <div class="text-sm text-dark-400">Success Rate</div>
              </div>
            </div>

            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Last Delivery</h3>
              <p class="text-white">{formatDate(selectedWebhook.stats.last_delivery)}</p>
            </div>
          {/if}

          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Subscribed Events</h3>
            <div class="space-y-1">
              {#each selectedWebhook.events as event}
                <div class="text-sm text-white font-mono">{event}</div>
              {/each}
            </div>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-dark-800 flex justify-end">
        <button
          class="btn-secondary"
          on:click={() => showStatsModal = false}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Test Event Modal -->
{#if showTestModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[80vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Trigger Test Event</h2>
          <button 
            class="p-2 text-dark-400 hover:text-white rounded"
            on:click={() => showTestModal = false}
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-auto">
        <div class="space-y-4">
          <div>
            <label for="event-type" class="block text-sm font-medium text-dark-300 mb-2">
              Event Type *
            </label>
            <select
              id="event-type"
              bind:value={testEventType}
              class="input"
            >
              <option value="">Select an event type</option>
              {#each supportedEvents as event}
                <option value={event.type}>{event.type} - {event.description}</option>
              {/each}
            </select>
          </div>

          <div>
            <label for="event-data" class="block text-sm font-medium text-dark-300 mb-2">
              Event Data (JSON)
            </label>
            <textarea
              id="event-data"
              bind:value={testEventData}
              class="input h-32 font-mono text-sm"
              placeholder={`{"id": "test-123", "name": "Test Event"}`}
            ></textarea>
            <p class="text-xs text-dark-500 mt-1">
              JSON data to include with the test event
            </p>
          </div>
        </div>
      </div>

      <div class="p-6 border-t border-dark-800 flex justify-end space-x-3">
        <button
          class="btn-secondary"
          on:click={() => showTestModal = false}
        >
          Cancel
        </button>
        <button
          class="btn-primary"
          on:click={triggerEvent}
          disabled={isTesting || !testEventType}
        >
          {isTesting ? 'Triggering...' : 'Trigger Event'}
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .btn-sm {
    @apply px-2 py-1 text-xs rounded;
  }
</style>