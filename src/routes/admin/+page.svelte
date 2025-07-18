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

  // Mock data
  onMount(() => {
    // Simulate loading stats
    setTimeout(() => {
      stats = {
        totalUsers: 1247,
        activeUsers: 89,
        totalWorkspaces: 342,
        totalNotes: 5678,
        totalFiles: 1234,
        storageUsed: 15728640000, // 14.6 GB
        memoryUsage: 68,
        cpuUsage: 23
      };
    }, 500);

    // Mock recent audit logs
    recentLogs = [
      {
        id: '1',
        action: 'User Login',
        userId: '1',
        user: {
          id: '1',
          username: 'demo_user',
          email: 'demo@example.com',
          displayName: 'Demo User',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
          role: 'admin',
          createdAt: new Date(),
          lastActive: new Date(),
          isOnline: true
        },
        targetType: 'session',
        targetId: 'session_123',
        details: { ip: '192.168.1.100', userAgent: 'Chrome/91.0' },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 300000)
      },
      {
        id: '2',
        action: 'Workspace Created',
        userId: '2',
        user: {
          id: '2',
          username: 'alice_dev',
          email: 'alice@example.com',
          displayName: 'Alice Developer',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=alice',
          role: 'user',
          createdAt: new Date(),
          lastActive: new Date(),
          isOnline: true
        },
        targetType: 'workspace',
        targetId: 'ws_456',
        details: { name: 'New Project Workspace', isPublic: false },
        ipAddress: '192.168.1.101',
        userAgent: 'Mozilla/5.0 (macOS; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 600000)
      },
      {
        id: '3',
        action: 'File Upload',
        userId: '3',
        user: {
          id: '3',
          username: 'bob_designer',
          email: 'bob@example.com',
          displayName: 'Bob Designer',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=bob',
          role: 'user',
          createdAt: new Date(),
          lastActive: new Date(),
          isOnline: false
        },
        targetType: 'file',
        targetId: 'file_789',
        details: { fileName: 'design-mockup.png', size: 2048576 },
        ipAddress: '192.168.1.102',
        userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
        createdAt: new Date(Date.now() - 900000)
      }
    ];
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
      <div class="flex items-center space-x-2">
        <svelte:component this={getHealthIcon(systemHealth)} class="w-5 h-5 {getHealthColor(systemHealth)}" />
        <span class="text-sm font-medium {getHealthColor(systemHealth)} capitalize">
          System {systemHealth}
        </span>
      </div>
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
            <p class="text-xs text-green-400 mt-1">
              <TrendingUp class="w-3 h-3 inline mr-1" />
              +12% from last month
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
            <p class="text-xs text-green-400 mt-1">
              <TrendingUp class="w-3 h-3 inline mr-1" />
              +8% from last week
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
              <span class="text-sm text-dark-300">14.6%</span>
            </div>
            <div class="w-full bg-dark-800 rounded-full h-2">
              <div 
                class="bg-purple-400 h-2 rounded-full transition-all duration-300"
                style="width: 14.6%"
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
            <span class="text-white font-medium">1,247</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">New Users (24h)</span>
            <span class="text-green-400 font-medium">+23</span>
          </div>
          <div class="flex items-center justify-between">
            <span class="text-dark-300">Server Uptime</span>
            <span class="text-white font-medium">99.9%</span>
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
        {#each recentLogs as log (log.id)}
          <div class="flex items-start space-x-3 p-3 bg-dark-800 rounded-lg">
            <img
              src={log.user.avatar}
              alt={log.user.displayName}
              class="w-8 h-8 rounded-full flex-shrink-0"
            />
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2">
                <span class="text-sm font-medium text-white">
                  {log.user.displayName}
                </span>
                <span class="text-sm text-dark-400">
                  {log.action}
                </span>
                <span class="text-xs text-dark-500">
                  {formatDate(log.createdAt)}
                </span>
              </div>
              <div class="text-xs text-dark-400 mt-1">
                IP: {log.ipAddress} • Target: {log.targetType}#{log.targetId}
              </div>
              {#if log.details}
                <div class="text-xs text-dark-500 mt-1">
                  {JSON.stringify(log.details)}
                </div>
              {/if}
            </div>
          </div>
        {/each}
      </div>
    </div>
  </div>
</main>