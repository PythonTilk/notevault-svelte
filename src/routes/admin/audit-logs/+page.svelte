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
    ChevronDown,
    AlertTriangle,
    Activity,
    Lock,
    Unlock,
    Globe,
    RefreshCw,
    BarChart3
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
  let selectedTab = 'logs';
  
  // Security monitoring data
  let securityStats = null;
  let failedLogins = [];
  let suspiciousActivity = null;
  let securityEvents = [];
  let auditSummary = [];

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

  const tabs = [
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'security', label: 'Security Overview', icon: Shield },
    { id: 'failed-logins', label: 'Failed Logins', icon: Lock },
    { id: 'suspicious', label: 'Suspicious Activity', icon: AlertTriangle }
  ];

  const severityColors = {
    low: 'text-green-400 bg-green-400/10',
    medium: 'text-yellow-400 bg-yellow-400/10',
    high: 'text-orange-400 bg-orange-400/10',
    critical: 'text-red-400 bg-red-400/10'
  };

  onMount(async () => {
    await loadAuditLogs();
    await loadSecurityData();
  });

  async function loadAuditLogs() {
    try {
      loading = true;
      error = '';
      const response = await api.getAuditLogs({ 
        limit: 100,
        action: selectedAction !== 'all' ? selectedAction : undefined,
        userId: selectedUser || undefined
      });
      
      if (response?.logs) {
        auditLogs = response.logs.map((log: any) => ({
          id: log.id,
          action: log.action,
          resource: log.resource || 'unknown',
          resourceId: log.resource_id || log.resourceId,
          userId: log.user_id || log.userId,
          user: {
            id: log.user_id || log.userId,
            username: log.username || log.user?.username || 'unknown',
            displayName: log.display_name || log.user?.displayName || log.username || 'Unknown User',
            avatar: log.user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${log.username || 'user'}`
          },
          details: log.details || {},
          metadata: {
            ipAddress: log.ip_address,
            userAgent: log.user_agent,
            location: log.location
          },
          timestamp: new Date(log.created_at || log.timestamp),
          severity: log.severity || 'low'
        }));
      } else {
        auditLogs = generateMockAuditLogs();
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
      error = 'Failed to load audit logs';
      
      // Generate mock data as fallback
      auditLogs = generateMockAuditLogs();
    } finally {
      loading = false;
    }
  }

  async function loadSecurityData() {
    try {
      const [statsResponse, failedLoginsResponse, suspiciousResponse, eventsResponse, summaryResponse] = await Promise.allSettled([
        api.getAuditStats({ timeframe: '24 HOURS' }),
        api.getFailedLogins({ timeframe: '24 HOURS', limit: 20 }),
        api.getSuspiciousActivity({ timeframe: '24 HOURS' }),
        api.getSecurityEvents({ limit: 10 }),
        api.getAuditSummary({ timeframe: '24 HOURS' })
      ]);

      if (statsResponse.status === 'fulfilled' && statsResponse.value?.stats) {
        securityStats = statsResponse.value.stats;
      }

      if (failedLoginsResponse.status === 'fulfilled' && failedLoginsResponse.value?.failedLogins) {
        failedLogins = failedLoginsResponse.value.failedLogins;
      }

      if (suspiciousResponse.status === 'fulfilled' && suspiciousResponse.value?.analysis) {
        suspiciousActivity = suspiciousResponse.value.analysis;
      }

      if (eventsResponse.status === 'fulfilled' && eventsResponse.value?.events) {
        securityEvents = eventsResponse.value.events;
      }

      if (summaryResponse.status === 'fulfilled' && summaryResponse.value?.summary) {
        auditSummary = summaryResponse.value.summary;
      }
    } catch (err) {
      console.error('Failed to load security data:', err);
    }
  }

  function generateMockAuditLogs(): AuditLog[] {
    const actions = ['create', 'update', 'delete', 'login', 'logout', 'share', 'upload', 'login_failure'];
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
          changes: action === 'update' ? ['title', 'description'] : undefined,
          reason: action === 'login_failure' ? ['Invalid password', 'User not found', 'Account locked'][Math.floor(Math.random() * 3)] : undefined
        },
        metadata: {
          ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
          userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          location: ['New York, US', 'London, UK', 'Tokyo, JP'][Math.floor(Math.random() * 3)]
        },
        timestamp: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
        severity: action === 'login_failure' ? 'high' : severities[Math.floor(Math.random() * severities.length)]
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
    uniqueUsers: new Set(auditLogs.map(log => log.userId)).size,
    failedLogins: auditLogs.filter(log => log.action === 'login_failure').length,
    securityEvents: auditLogs.filter(log => ['login_failure', 'access_denied', 'suspicious_activity'].includes(log.action)).length
  };

  $: uniqueUsers = Array.from(new Set(auditLogs.map(log => log.user)
    .map(user => JSON.stringify(user))))
    .map(userStr => JSON.parse(userStr));

  function refreshData() {
    loadAuditLogs();
    loadSecurityData();
  }

  function getSeverityBadgeColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  }
</script>

<svelte:head>
  <title>Security & Audit Monitoring - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Security & Audit Monitoring</h1>
      <p class="text-dark-400 text-sm">
        {logStats.total} total logs • {logStats.today} today • {logStats.critical} critical • {logStats.failedLogins} failed logins
      </p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button class="btn-secondary" on:click={refreshData}>
        <RefreshCw class="w-4 h-4 mr-2" />
        Refresh
      </button>
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

<!-- Stats Bar -->
{#if selectedTab === 'logs'}
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
      <div class="flex items-center space-x-2">
        <Lock class="w-4 h-4 text-orange-400" />
        <span class="text-sm text-dark-300">{logStats.failedLogins} Failed Logins</span>
      </div>
    </div>
  </div>
{/if}

<!-- Filters - Only show for logs tab -->
{#if selectedTab === 'logs'}
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
{/if}

<!-- Main Content -->
<main class="flex-1 overflow-auto">
  <div class="bg-dark-900">
    {#if loading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-pulse flex items-center space-x-2">
          <div class="w-6 h-6 bg-dark-600 rounded"></div>
          <div class="w-32 h-4 bg-dark-600 rounded"></div>
        </div>
      </div>
    {:else if error && selectedTab === 'logs'}
      <div class="flex items-center justify-center py-12">
        <div class="text-center">
          <div class="text-red-400 mb-2">Error loading logs</div>
          <button class="btn-primary" on:click={loadAuditLogs}>Retry</button>
        </div>
      </div>
    {:else if selectedTab === 'logs'}
      {#if filteredLogs.length === 0}
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
        <!-- Audit Logs Table -->
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
                      <span class="text-white font-medium capitalize">{log.action.replace('_', ' ')}</span>
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
    
    {:else if selectedTab === 'security'}
      <!-- Security Overview Tab -->
      <div class="p-6 space-y-6">
        <!-- Security Statistics -->
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div class="card p-6">
            <div class="flex items-center">
              <Shield class="w-8 h-8 text-green-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Security Score</p>
                <p class="text-2xl font-bold text-white">85%</p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <Lock class="w-8 h-8 text-red-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Failed Logins</p>
                <p class="text-2xl font-bold text-white">{failedLogins.length}</p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <AlertTriangle class="w-8 h-8 text-yellow-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Active Threats</p>
                <p class="text-2xl font-bold text-white">{suspiciousActivity?.summary?.flaggedIPs || 0}</p>
              </div>
            </div>
          </div>
          <div class="card p-6">
            <div class="flex items-center">
              <Activity class="w-8 h-8 text-blue-400" />
              <div class="ml-3">
                <p class="text-sm font-medium text-dark-400">Security Events</p>
                <p class="text-2xl font-bold text-white">{securityEvents.length}</p>
              </div>
            </div>
          </div>
        </div>

        <!-- Recent Security Events -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Recent Security Events</h3>
          <div class="space-y-3">
            {#each securityEvents.slice(0, 5) as event}
              <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div class="w-2 h-2 rounded-full {getSeverityBadgeColor(event.severity || 'medium')}"></div>
                  <div>
                    <p class="text-white font-medium">{event.action || 'Security Event'}</p>
                    <p class="text-xs text-dark-400">{event.details?.reason || 'No details available'}</p>
                  </div>
                </div>
                <div class="text-xs text-dark-500">
                  {formatDate(new Date(event.created_at || Date.now()))}
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>
    
    {:else if selectedTab === 'failed-logins'}
      <!-- Failed Logins Tab -->
      <div class="p-6 space-y-6">
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Failed Login Attempts</h3>
          {#if failedLogins.length > 0}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-dark-800 border-b border-dark-700">
                  <tr>
                    <th class="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase">User</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase">IP Address</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase">Reason</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase">Time</th>
                    <th class="px-4 py-3 text-left text-xs font-medium text-dark-300 uppercase">Attempts</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-dark-800">
                  {#each failedLogins as login}
                    <tr class="hover:bg-dark-800">
                      <td class="px-4 py-3 text-white">{login.username || 'Unknown'}</td>
                      <td class="px-4 py-3 text-white font-mono">{login.ip_address}</td>
                      <td class="px-4 py-3 text-dark-300">{JSON.parse(login.details || '{}').reason || 'Unknown'}</td>
                      <td class="px-4 py-3 text-dark-300">{formatDate(new Date(login.created_at))}</td>
                      <td class="px-4 py-3 text-orange-400">{login.attempts_from_ip}</td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="text-center py-8">
              <Lock class="h-12 w-12 mx-auto mb-3 text-dark-500" />
              <p class="text-dark-400">No failed login attempts found</p>
            </div>
          {/if}
        </div>
      </div>
    
    {:else if selectedTab === 'suspicious'}
      <!-- Suspicious Activity Tab -->
      <div class="p-6 space-y-6">
        {#if suspiciousActivity}
          <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <!-- Suspicious IPs -->
            <div class="card p-6">
              <h3 class="text-lg font-semibold text-white mb-4">Suspicious IP Addresses</h3>
              {#if suspiciousActivity.suspiciousIPs?.length > 0}
                <div class="space-y-3">
                  {#each suspiciousActivity.suspiciousIPs.slice(0, 5) as suspiciousIP}
                    <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                      <div>
                        <p class="text-white font-mono">{suspiciousIP.ip_address}</p>
                        <p class="text-xs text-dark-400">{suspiciousIP.targeted_users} users targeted</p>
                      </div>
                      <div class="text-right">
                        <p class="text-red-400 font-semibold">{suspiciousIP.failed_attempts}</p>
                        <p class="text-xs text-dark-500">attempts</p>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8">
                  <Globe class="h-12 w-12 mx-auto mb-3 text-dark-500" />
                  <p class="text-dark-400">No suspicious IP addresses detected</p>
                </div>
              {/if}
            </div>

            <!-- Suspicious Users -->
            <div class="card p-6">
              <h3 class="text-lg font-semibold text-white mb-4">Users Under Attack</h3>
              {#if suspiciousActivity.suspiciousUsers?.length > 0}
                <div class="space-y-3">
                  {#each suspiciousActivity.suspiciousUsers.slice(0, 5) as suspiciousUser}
                    <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                      <div>
                        <p class="text-white">{suspiciousUser.username || suspiciousUser.email}</p>
                        <p class="text-xs text-dark-400">{suspiciousUser.source_ips} source IPs</p>
                      </div>
                      <div class="text-right">
                        <p class="text-red-400 font-semibold">{suspiciousUser.failed_attempts}</p>
                        <p class="text-xs text-dark-500">attempts</p>
                      </div>
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8">
                  <User class="h-12 w-12 mx-auto mb-3 text-dark-500" />
                  <p class="text-dark-400">No users under attack detected</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Summary -->
          {#if suspiciousActivity.summary}
            <div class="card p-6">
              <h3 class="text-lg font-semibold text-white mb-4">Threat Summary</h3>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div class="text-center">
                  <div class="text-2xl font-bold text-red-400">{suspiciousActivity.summary.flaggedIPs}</div>
                  <div class="text-sm text-dark-400">Flagged IPs</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-orange-400">{suspiciousActivity.summary.flaggedUsers}</div>
                  <div class="text-sm text-dark-400">Targeted Users</div>
                </div>
                <div class="text-center">
                  <div class="text-2xl font-bold text-yellow-400">{suspiciousActivity.summary.totalFailedAttempts}</div>
                  <div class="text-sm text-dark-400">Total Attacks</div>
                </div>
              </div>
            </div>
          {/if}
        {:else}
          <div class="card p-6">
            <div class="text-center py-8">
              <AlertTriangle class="h-12 w-12 mx-auto mb-3 text-dark-500" />
              <p class="text-dark-400">Suspicious activity data not available</p>
            </div>
          </div>
        {/if}
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