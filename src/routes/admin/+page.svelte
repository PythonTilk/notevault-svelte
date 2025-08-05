<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Users, 
    FileText, 
    MessageSquare, 
    HardDrive, 
    Cpu, 
    Activity,
    TrendingUp,
    AlertTriangle,
    CheckCircle,
    Clock
  } from 'lucide-svelte';
  import type { SystemStats, AuditLog } from '$lib/types';
  import { api } from '$lib/api';

  let stats: SystemStats = {
    totalUsers: 0,
    activeUsers: 0,
    totalWorkspaces: 0,
    totalNotes: 0,
    totalFiles: 0,
    storageUsed: 0,
    memoryUsage: 0,
    cpuUsage: 0
  };

  let recentLogs: AuditLog[] = [];
  let systemHealth = 'healthy';
  let loading = true;
  let error = '';

  // Load real data from API
  onMount(async () => {
    try {
      loading = true;
      const systemStats = await api.getSystemStats();
      stats = {
        totalUsers: systemStats.totalUsers || 0,
        activeUsers: systemStats.activeUsers || 0,
        totalWorkspaces: systemStats.totalWorkspaces || 0,
        totalNotes: systemStats.totalNotes || 0,
        totalFiles: systemStats.totalFiles || 0,
        storageUsed: systemStats.storageUsed || 0,
        memoryUsage: Math.round((systemStats.memoryUsage || 0) / 1024 / 1024 * 100) / 100,
        cpuUsage: Math.round((systemStats.cpuUsage || 0) / 1000000 * 100) / 100
      };
      
      // Try to load audit logs
      try {
        const auditLogs = await api.getAuditLogs({ limit: 10 });
        recentLogs = Array.isArray(auditLogs) ? auditLogs : [];
      } catch (auditError) {
        console.warn('Could not load audit logs:', auditError);
        recentLogs = [];
      }
      
      systemHealth = 'healthy';
    } catch (err) {
      console.error('Failed to load admin stats:', err);
      error = 'Failed to load system statistics';
      systemHealth = 'error';
    } finally {
      loading = false;
    }
  });

  function formatBytes(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function getHealthColor(health: string) {
    switch (health) {
      case 'healthy':
        return 'text-green-400';
      case 'warning':
        return 'text-yellow-400';
      case 'critical':
        return 'text-red-400';
      default:
        return 'text-dark-400';
    }
  }

  function getHealthIcon(health: string) {
    switch (health) {
      case 'healthy':
        return CheckCircle;
      case 'warning':
        return AlertTriangle;
      case 'critical':
        return AlertTriangle;
      default:
        return Clock;
    }
  }
</script>

<svelte:head>
  <title>Admin Dashboard - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Admin Dashboard</h1>
      <p class="text-dark-400 mt-1">System overview and monitoring</p>
    </div>
    <div class="flex items-center space-x-3">
      {#if loading}
        <div class="animate-pulse flex items-center space-x-2">
          <div class="w-5 h-5 bg-dark-600 rounded"></div>
          <div class="w-20 h-4 bg-dark-600 rounded"></div>
        </div>
      {:else if error}
        <div class="flex items-center space-x-2">
          <AlertTriangle class="w-5 h-5 text-red-400" />
          <span class="text-sm font-medium text-red-400">System Error</span>
        </div>
      {:else}
        <div class="flex items-center space-x-2">
          <svelte:component this={getHealthIcon(systemHealth)} class="w-5 h-5 {getHealthColor(systemHealth)}" />
          <span class="text-sm font-medium {getHealthColor(systemHealth)} capitalize">
            System {systemHealth}
          </span>
        </div>
      {/if}
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Stats Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <!-- Total Users -->
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Users class="w-8 h-8 text-blue-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-dark-400">Total Users</p>
            <p class="text-2xl font-bold text-white">{stats.totalUsers.toLocaleString()}</p>
            <p class="text-xs text-dark-400 mt-1">
              Registered users
            </p>
          </div>
        </div>
      </div>

      <!-- Active Users -->
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <Activity class="w-8 h-8 text-green-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-dark-400">Active Users</p>
            <p class="text-2xl font-bold text-white">{stats.activeUsers}</p>
            <p class="text-xs text-dark-400 mt-1">Currently online</p>
          </div>
        </div>
      </div>

      <!-- Total Notes -->
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <FileText class="w-8 h-8 text-yellow-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-dark-400">Total Notes</p>
            <p class="text-2xl font-bold text-white">{stats.totalNotes.toLocaleString()}</p>
            <p class="text-xs text-dark-400 mt-1">
              Total documents
            </p>
          </div>
        </div>
      </div>

      <!-- Storage Used -->
      <div class="card">
        <div class="flex items-center">
          <div class="flex-shrink-0">
            <HardDrive class="w-8 h-8 text-purple-400" />
          </div>
          <div class="ml-4">
            <p class="text-sm font-medium text-dark-400">Storage Used</p>
            <p class="text-2xl font-bold text-white">{formatBytes(stats.storageUsed)}</p>
            <p class="text-xs text-dark-400 mt-1">of 100 GB allocated</p>
          </div>
        </div>
      </div>
    </div>

    <!-- System Performance -->
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Resource Usage -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">System Resources</h3>
        <div class="space-y-4">
          <!-- CPU Usage -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <Cpu class="w-4 h-4 text-blue-400" />
                <span class="text-sm font-medium text-white">CPU Usage</span>
              </div>
              <span class="text-sm text-dark-300">{stats.cpuUsage}%</span>
            </div>
            <div class="w-full bg-dark-800 rounded-full h-2">
              <div 
                class="bg-blue-400 h-2 rounded-full transition-all duration-300"
                style="width: {stats.cpuUsage}%"
              ></div>
            </div>
          </div>

          <!-- Memory Usage -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <Activity class="w-4 h-4 text-green-400" />
                <span class="text-sm font-medium text-white">Memory Usage</span>
              </div>
              <span class="text-sm text-dark-300">{stats.memoryUsage}%</span>
            </div>
            <div class="w-full bg-dark-800 rounded-full h-2">
              <div 
                class="bg-green-400 h-2 rounded-full transition-all duration-300"
                style="width: {stats.memoryUsage}%"
              ></div>
            </div>
          </div>

          <!-- Storage Usage -->
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center space-x-2">
                <HardDrive class="w-4 h-4 text-purple-400" />
                <span class="text-sm font-medium text-white">Storage Usage</span>
              </div>
              <span class="text-sm text-dark-300">{((stats.storageUsed || 0) / (100 * 1024 * 1024 * 1024) * 100).toFixed(1)}%</span>
            </div>
            <div class="w-full bg-dark-800 rounded-full h-2">
              <div 
                class="bg-purple-400 h-2 rounded-full transition-all duration-300"
                style="width: {((stats.storageUsed || 0) / (100 * 1024 * 1024 * 1024) * 100).toFixed(1)}%"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="card">
        <h3 class="text-lg font-semibold text-white mb-4">Quick Stats</h3>
        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <span class="text-dark-300">Total Workspaces</span>
            <span class="text-white font-medium">{stats.totalWorkspaces}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">Total Files</span>
            <span class="text-white font-medium">{stats.totalFiles.toLocaleString()}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">Messages Today</span>
            <span class="text-white font-medium">{loading ? '...' : '0'}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">New Users (24h)</span>
            <span class="text-green-400 font-medium">{loading ? '...' : '+0'}</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">Server Uptime</span>
            <span class="text-white font-medium">{loading ? '...' : '99.9%'}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Recent Activity -->
    <div class="card">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-lg font-semibold text-white">Recent Activity</h3>
        <a href="/admin/logs" class="text-sm text-primary-400 hover:text-primary-300">
          View all logs
        </a>
      </div>
      
      <div class="space-y-4">
        {#if loading}
          <div class="flex items-center justify-center py-8">
            <div class="animate-pulse flex items-center space-x-2">
              <div class="w-6 h-6 bg-dark-600 rounded"></div>
              <div class="w-32 h-4 bg-dark-600 rounded"></div>
            </div>
          </div>
        {:else if recentLogs.length === 0}
          <div class="text-center py-8">
            <div class="text-dark-400 mb-2">
              <Clock class="w-8 h-8 mx-auto mb-2" />
              No recent activity found
            </div>
            <p class="text-xs text-dark-500">Activity logs will appear here when available</p>
          </div>
        {:else}
          {#each recentLogs as log (log.id)}
            <div class="flex items-start space-x-3 p-3 bg-dark-800 rounded-lg">
              <img
                src={log.user?.avatar || '/default-avatar.png'}
                alt={log.user?.displayName || 'Unknown User'}
                class="w-8 h-8 rounded-full flex-shrink-0"
              />
              <div class="flex-1 min-w-0">
                <div class="flex items-center space-x-2">
                  <span class="text-sm font-medium text-white">
                    {log.user?.displayName || 'Unknown User'}
                  </span>
                  <span class="text-sm text-dark-400">
                    {log.action}
                  </span>
                  <span class="text-xs text-dark-500">
                    {formatDate(new Date(log.createdAt))}
                  </span>
                </div>
                <div class="text-xs text-dark-400 mt-1">
                  IP: {log.ipAddress || 'Unknown'} • Target: {log.targetType}#{log.targetId}
                </div>
                {#if log.details}
                  <div class="text-xs text-dark-500 mt-1">
                    {JSON.stringify(log.details)}
                  </div>
                {/if}
              </div>
            </div>
          {/each}
        {/if}
      </div>
    </div>
  </div>
</main>