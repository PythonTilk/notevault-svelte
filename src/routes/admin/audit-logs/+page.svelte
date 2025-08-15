<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Search, 
    Filter, 
    Calendar,
    User,
    FileText,
    Settings,
    Trash2,
    Eye,
    Shield,
    Clock,
    ChevronDown
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  interface AuditLog {
    id: string;
    action: string;
    resource: string;
    resourceId: string;
    userId: string;
    user: {
      id: string;
      username: string;
      displayName: string;
      avatar?: string;
    };
    details: Record<string, any>;
    metadata: {
      ipAddress?: string;
      userAgent?: string;
      location?: string;
    };
    timestamp: Date;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }

  let auditLogs: AuditLog[] = [];
  let searchQuery = '';
  let selectedAction = 'all';
  let selectedUser = '';
  let selectedSeverity = 'all';
  let dateRange = '7d';
  let loading = true;
  let error = '';
  let selectedLog: AuditLog | null = null;
  let showLogModal = false;

  const actionTypes = [
    'create',
    'update', 
    'delete',
    'login',
    'logout',
    'invite',
    'remove',
    'share',
    'unshare',
    'upload',
    'download',
    'export',
    'import',
    'backup',
    'restore'
  ];

  const severityColors = {
    low: 'text-green-400 bg-green-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    critical: 'text-red-400 bg-red-400/10'
  };

  onMount(async () => {
    await loadAuditLogs();
  });

  async function loadAuditLogs() {
    try {
      loading = true;
      error = '';
      const logsResponse = await api.getAuditLogs({ 
        limit: 100,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        userId: selectedUser || undefined
      });
      
      auditLogs = logsResponse.map((log: any) => ({
        id: log.id,
        action: log.action,
        resource: log.resource,
        resourceId: log.resourceId,
        userId: log.userId,
        user: {
          id: log.user.id,
          username: log.user.username,
          displayName: log.user.displayName,
          avatar: log.user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.user.username}`
        },
        details: log.details || {},
        metadata: log.metadata || {},
        timestamp: new Date(log.timestamp),
        severity: log.severity || 'low'
      }));
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      error = 'Failed to load audit logs';
      
      // Generate mock data as fallback
      auditLogs = generateMockAuditLogs();
    } finally {
      loading = false;
    }
  }

  function generateMockAuditLogs(): AuditLog[] {
    const actions = ['create', 'update', 'delete', 'login', 'logout', 'share', 'upload'];
    const resources = ['workspace', 'note', 'file', 'user', 'settings'];
    const users = [
      { id: '1', username: 'admin', displayName: 'Admin User' },
      { id: '2', username: 'john_doe', displayName: 'John Doe' },
      { id: '3', username: 'jane_smith', displayName: 'Jane Smith' },
      { id: '4', username: 'bob_wilson', displayName: 'Bob Wilson' }
    ];
    const severities: Array<'low' | 'medium' | 'high' | 'critical'> = ['low', 'medium', 'high', 'critical'];

    return Array.from({ length: 50 }, (_, i) => {
      const user = users[Math.floor(Math.random() * users.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const resource = resources[Math.floor(Math.random() * resources.length)];
      
      return {
        id: `log-${i + 1}`,
        action,
        resource,
        resourceId: `${resource}-${Math.floor(Math.random() * 1000)}`,
        userId: user.id,
        user: {
          ...user,
          avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username}`
        },
        details: {
          name: `${resource.charAt(0).toUpperCase() + resource.slice(1)} ${Math.floor(Math.random() * 100)}`,
          changes: action === 'update' ? ['title', 'description'] : undefined
        },
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: ['New York, US', 'London, UK', 'Tokyo, JP'][Math.floor(Math.random() * 3)]
        },
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        severity: severities[Math.floor(Math.random() * severities.length)]
      };
    });
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
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

  function getActionColor(action: string): string {
    switch (action) {
      case 'create':
        return 'text-green-400';
      case 'update':
        return 'text-blue-400';
      case 'delete':
        return 'text-red-400';
      case 'login':
      case 'logout':
        return 'text-purple-400';
      case 'share':
      case 'unshare':
        return 'text-yellow-400';
      default:
        return 'text-dark-400';
    }
  }

  function getActionIcon(action: string) {
    switch (action) {
      case 'create':
        return FileText;
      case 'update':
        return Settings;
      case 'delete':
        return Trash2;
      case 'login':
      case 'logout':
        return User;
      case 'share':
      case 'unshare':
        return Eye;
      default:
        return Clock;
    }
  }

  $: filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         log.user.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (log.details.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAction = selectedAction === 'all' || log.action === selectedAction;
    const matchesUser = !selectedUser || log.userId === selectedUser;
    const matchesSeverity = selectedSeverity === 'all' || log.severity === selectedSeverity;
    return matchesSearch && matchesAction && matchesUser && matchesSeverity;
  });

  $: logStats = {
    total: auditLogs.length,
    today: auditLogs.filter(log => {
      const today = new Date();
      const logDate = new Date(log.timestamp);
      return logDate.toDateString() === today.toDateString();
    }).length,
    critical: auditLogs.filter(log => log.severity === 'critical').length,
    uniqueUsers: new Set(auditLogs.map(log => log.userId)).size
  };

  $: uniqueUsers = Array.from(new Set(auditLogs.map(log => log.user)
    .map(user => JSON.stringify(user))))
    .map(userStr => JSON.parse(userStr));
</script>

<svelte:head>
  <title>Audit Logs - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Audit Logs</h1>
      <p class="text-dark-400 text-sm">
        {logStats.total} total logs • {logStats.today} today • {logStats.critical} critical
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-secondary" on:click={loadAuditLogs}>
        <Filter class="w-4 h-4 mr-2" />
        Refresh
      </button>
    </div>
  </div>
</header>

<!-- Stats Bar -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center space-x-6">
    <div class="flex items-center space-x-2">
      <Shield class="w-4 h-4 text-green-400" />
      <span class="text-sm text-dark-300">{logStats.total} Total Logs</span>
    </div>
    <div class="flex items-center space-x-2">
      <Clock class="w-4 h-4 text-blue-400" />
      <span class="text-sm text-dark-300">{logStats.today} Today</span>
    </div>
    <div class="flex items-center space-x-2">
      <User class="w-4 h-4 text-purple-400" />
      <span class="text-sm text-dark-300">{logStats.uniqueUsers} Users</span>
    </div>
    <div class="flex items-center space-x-2">
      <div class="w-4 h-4 bg-red-400 rounded-full"></div>
      <span class="text-sm text-dark-300">{logStats.critical} Critical</span>
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
        placeholder="Search logs..."
        class="input pl-10"
      />
    </div>
    
    <!-- Action Filter -->
    <select
      bind:value={selectedAction}
      class="input w-36"
    >
      <option value="all">All Actions</option>
      {#each actionTypes as action}
        <option value={action}>{action.charAt(0).toUpperCase() + action.slice(1)}</option>
      {/each}
    </select>

    <!-- User Filter -->
    <select
      bind:value={selectedUser}
      class="input w-40"
    >
      <option value="">All Users</option>
      {#each uniqueUsers as user}
        <option value={user.id}>{user.displayName}</option>
      {/each}
    </select>

    <!-- Severity Filter -->
    <select
      bind:value={selectedSeverity}
      class="input w-32"
    >
      <option value="all">All Severity</option>
      <option value="low">Low</option>
      <option value="medium">Medium</option>
      <option value="high">High</option>
      <option value="critical">Critical</option>
    </select>
  </div>
</div>

<!-- Logs Table -->
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
          <div class="text-red-400 mb-2">Error loading logs</div>
          <button class="btn-primary" on:click={loadAuditLogs}>Retry</button>
        </div>
      </div>
    {:else if filteredLogs.length === 0}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <Shield class="w-12 h-12 mx-auto mb-4 text-dark-400" />
          <div class="text-dark-400 mb-2">No logs found</div>
          {#if searchQuery || selectedAction !== 'all' || selectedUser || selectedSeverity !== 'all'}
            <button class="text-primary-400 hover:text-primary-300" on:click={() => { 
              searchQuery = ''; 
              selectedAction = 'all'; 
              selectedUser = ''; 
              selectedSeverity = 'all'; 
            }}>
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
                Action
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                User
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Resource
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Severity
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Time
              </th>
              <th class="px-6 py-3 text-left text-xs font-medium text-dark-300 uppercase tracking-wider">
                Details
              </th>
              <th class="px-6 py-3 text-right text-xs font-medium text-dark-300 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-dark-800">
            {#each filteredLogs as log (log.id)}
              <tr class="hover:bg-dark-800 transition-colors">
                <!-- Action -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center space-x-3">
                    <svelte:component 
                      this={getActionIcon(log.action)} 
                      class="w-4 h-4 {getActionColor(log.action)}" 
                    />
                    <span class="text-white font-medium capitalize">{log.action}</span>
                  </div>
                </td>

                <!-- User -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div class="flex items-center">
                    <img
                      src={log.user.avatar}
                      alt={log.user.displayName}
                      class="w-6 h-6 rounded-full mr-2"
                    />
                    <div>
                      <div class="text-sm font-medium text-white">{log.user.displayName}</div>
                      <div class="text-xs text-dark-400">@{log.user.username}</div>
                    </div>
                  </div>
                </td>

                <!-- Resource -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div class="text-sm font-medium text-white capitalize">{log.resource}</div>
                    {#if log.details.name}
                      <div class="text-xs text-dark-400 max-w-32 truncate">{log.details.name}</div>
                    {/if}
                  </div>
                </td>

                <!-- Severity -->
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {severityColors[log.severity]} capitalize">
                    {log.severity}
                  </span>
                </td>

                <!-- Time -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  <div>{getTimeAgo(log.timestamp)}</div>
                  <div class="text-xs text-dark-500">{formatDate(log.timestamp)}</div>
                </td>

                <!-- Details -->
                <td class="px-6 py-4 whitespace-nowrap text-sm text-dark-300">
                  {#if log.metadata.ipAddress}
                    <div class="text-xs text-dark-500">{log.metadata.ipAddress}</div>
                  {/if}
                  {#if log.metadata.location}
                    <div class="text-xs text-dark-500">{log.metadata.location}</div>
                  {/if}
                </td>

                <!-- Actions -->
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button
                    class="p-1 text-dark-400 hover:text-white rounded"
                    on:click={() => {
                      selectedLog = log;
                      showLogModal = true;
                    }}
                    title="View Details"
                  >
                    <Eye class="w-4 h-4" />
                  </button>
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</main>

<!-- Log Detail Modal -->
{#if showLogModal && selectedLog}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[80vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">Audit Log Details</h2>
          <button 
            class="p-2 text-dark-400 hover:text-white rounded"
            on:click={() => showLogModal = false}
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-auto">
        <div class="space-y-6">
          <!-- Basic Info -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Action</h3>
              <div class="flex items-center space-x-2">
                <svelte:component 
                  this={getActionIcon(selectedLog.action)} 
                  class="w-4 h-4 {getActionColor(selectedLog.action)}" 
                />
                <span class="text-white capitalize">{selectedLog.action}</span>
              </div>
            </div>
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Severity</h3>
              <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium {severityColors[selectedLog.severity]} capitalize">
                {selectedLog.severity}
              </span>
            </div>
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Resource</h3>
              <p class="text-white capitalize">{selectedLog.resource}</p>
            </div>
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Resource ID</h3>
              <p class="text-white font-mono text-sm">{selectedLog.resourceId}</p>
            </div>
          </div>

          <!-- User Info -->
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">User</h3>
            <div class="flex items-center space-x-3">
              <img
                src={selectedLog.user.avatar}
                alt={selectedLog.user.displayName}
                class="w-10 h-10 rounded-full"
              />
              <div>
                <p class="text-white font-medium">{selectedLog.user.displayName}</p>
                <p class="text-dark-400 text-sm">@{selectedLog.user.username}</p>
              </div>
            </div>
          </div>

          <!-- Timestamp -->
          <div>
            <h3 class="text-sm font-medium text-dark-300 mb-2">Timestamp</h3>
            <p class="text-white">{formatDate(selectedLog.timestamp)}</p>
            <p class="text-dark-400 text-sm">{getTimeAgo(selectedLog.timestamp)}</p>
          </div>

          <!-- Details -->
          {#if Object.keys(selectedLog.details).length > 0}
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Details</h3>
              <div class="bg-dark-800 rounded-lg p-4">
                <pre class="text-sm text-dark-300 whitespace-pre-wrap">{JSON.stringify(selectedLog.details, null, 2)}</pre>
              </div>
            </div>
          {/if}

          <!-- Metadata -->
          {#if Object.keys(selectedLog.metadata).length > 0}
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">Metadata</h3>
              <div class="space-y-2">
                {#if selectedLog.metadata.ipAddress}
                  <div class="flex items-center justify-between">
                    <span class="text-dark-400">IP Address:</span>
                    <span class="text-white font-mono">{selectedLog.metadata.ipAddress}</span>
                  </div>
                {/if}
                {#if selectedLog.metadata.location}
                  <div class="flex items-center justify-between">
                    <span class="text-dark-400">Location:</span>
                    <span class="text-white">{selectedLog.metadata.location}</span>
                  </div>
                {/if}
                {#if selectedLog.metadata.userAgent}
                  <div class="flex items-center justify-between">
                    <span class="text-dark-400">User Agent:</span>
                    <span class="text-white text-sm max-w-md truncate">{selectedLog.metadata.userAgent}</span>
                  </div>
                {/if}
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="p-6 border-t border-dark-800 flex justify-end">
        <button
          class="btn-secondary"
          on:click={() => showLogModal = false}
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}