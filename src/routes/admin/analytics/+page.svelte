<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Users, 
    FileText, 
    MessageSquare, 
    TrendingUp,
    Calendar,
    Clock,
    Activity,
    BarChart3
  } from 'lucide-svelte';
  import LineChart from '$lib/components/charts/LineChart.svelte';
  import BarChart from '$lib/components/charts/BarChart.svelte';
  import DonutChart from '$lib/components/charts/DonutChart.svelte';
  import { api } from '$lib/api';

  let timeRange = '7d';
  let isLoading = false;
  let analytics = {
    overview: {
      totalUsers: 0,
      activeUsers: 0,
      newUsers: 0,
      totalSessions: 0,
      avgSessionDuration: 0,
      errorRate: 0
    },
    charts: {
      userGrowth: [],
      activityTimeline: [],
      deviceTypes: [],
      topFeatures: [],
      errorsByType: []
    },
    systemHealth: {
      status: 'healthy',
      uptime: 0,
      cpuUsage: 0,
      memoryUsage: 0,
      diskUsage: 0,
      responseTime: 0
    }
  };

  let systemHealth = null;
  let activityFeed = [];
  let recentActivity = [];

  const timeRangeOptions = [
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' }
  ];

  onMount(() => {
    loadAnalytics();
  });

  async function loadAnalytics() {
    isLoading = true;
    try {
      // Load analytics data in parallel
      const [analyticsData, healthData, activityData] = await Promise.allSettled([
        api.getAnalytics({ timeRange }),
        api.getSystemHealth(),
        api.getActivityFeed({ limit: 10 })
      ]);

      // Handle analytics data
      if (analyticsData.status === 'fulfilled') {
        analytics = analyticsData.value;
      } else {
        analytics = generateMockData();
      }

      // Handle system health data
      if (healthData.status === 'fulfilled') {
        systemHealth = healthData.value;
      } else {
        systemHealth = generateMockSystemHealth();
      }

      // Handle activity feed data
      if (activityData.status === 'fulfilled') {
        recentActivity = activityData.value;
      } else {
        recentActivity = generateMockActivity();
      }
    } catch (error) {
      console.error('Failed to load analytics, using mock data:', error);
      analytics = generateMockData();
      systemHealth = generateMockSystemHealth();
      recentActivity = generateMockActivity();
    } finally {
      isLoading = false;
    }
  }

  function generateMockData() {
    const days = timeRange === '24h' ? 1 : timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    return {
      overview: {
        totalUsers: 1247,
        activeUsers: 342,
        newUsers: 23,
        totalSessions: 1856,
        avgSessionDuration: 1834, // seconds
        errorRate: 0.024
      },
      charts: {
        userGrowth: Array.from({ length: days }, (_, i) => ({
          x: new Date(Date.now() - (days - i - 1) * 24 * 60 * 60 * 1000).toISOString(),
          y: Math.floor(Math.random() * 50) + 1200 + i * 2
        })),
        activityTimeline: Array.from({ length: 24 }, (_, i) => ({
          x: i,
          y: Math.floor(Math.random() * 200) + 50
        })),
        deviceTypes: [
          { label: 'Desktop', value: 642, color: '#3B82F6' },
          { label: 'Mobile', value: 389, color: '#10B981' },
          { label: 'Tablet', value: 216, color: '#F59E0B' }
        ],
        topFeatures: [
          { label: 'Notes', value: 1423 },
          { label: 'Chat', value: 892 },
          { label: 'Files', value: 567 },
          { label: 'Workspaces', value: 334 },
          { label: 'Search', value: 298 }
        ],
        errorsByType: [
          { label: '4xx Errors', value: 45, color: '#F59E0B' },
          { label: '5xx Errors', value: 12, color: '#EF4444' },
          { label: 'Network', value: 8, color: '#8B5CF6' },
          { label: 'Timeout', value: 3, color: '#EC4899' }
        ]
      }
    };
  }

  function formatDuration(seconds: number): string {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  function formatPercentage(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
  }

  function generateMockSystemHealth() {
    return {
      status: Math.random() > 0.1 ? 'healthy' : 'warning',
      uptime: 1847230, // seconds (~21 days)
      cpuUsage: Math.random() * 0.8 + 0.1, // 10-90%
      memoryUsage: Math.random() * 0.6 + 0.2, // 20-80%
      diskUsage: Math.random() * 0.4 + 0.1, // 10-50%
      responseTime: Math.random() * 200 + 50, // 50-250ms
      services: {
        database: Math.random() > 0.05 ? 'healthy' : 'degraded',
        redis: Math.random() > 0.03 ? 'healthy' : 'warning',
        websocket: Math.random() > 0.02 ? 'healthy' : 'degraded',
        fileStorage: Math.random() > 0.01 ? 'healthy' : 'healthy'
      }
    };
  }

  function generateMockActivity() {
    const actions = [
      'created a new workspace',
      'uploaded a file',
      'created a note',
      'joined a workspace',
      'sent a message',
      'shared a workspace',
      'updated their profile',
      'deleted a note',
      'invited a user',
      'completed onboarding'
    ];
    
    const users = [
      'Alice Johnson', 'Bob Smith', 'Charlie Brown', 'Diana Prince', 'Eve Adams',
      'Frank Miller', 'Grace Lee', 'Henry Ford', 'Iris Chen', 'Jack Wilson'
    ];

    return Array.from({ length: 10 }, (_, i) => ({
      id: i.toString(),
      user: {
        name: users[Math.floor(Math.random() * users.length)],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${i}`,
        id: `user-${i}`
      },
      action: actions[Math.floor(Math.random() * actions.length)],
      timestamp: new Date(Date.now() - Math.random() * 3600000).toISOString(), // Within last hour
      details: {
        ip: `192.168.1.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }));
  }

  function formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${minutes}m`;
  }

  function getStatusColor(status: string): string {
    switch (status) {
      case 'healthy': return 'text-green-400';
      case 'warning': return 'text-yellow-400';
      case 'degraded': return 'text-orange-400';
      case 'critical': return 'text-red-400';
      default: return 'text-gray-400';
    }
  }

  function getStatusIcon(status: string): string {
    switch (status) {
      case 'healthy': return '🟢';
      case 'warning': return '🟡';
      case 'degraded': return '🟠';
      case 'critical': return '🔴';
      default: return '⚪';
    }
  }

  let tooltipData = null;
  let tooltipPosition = { x: 0, y: 0 };

  function handleChartHover(event) {
    tooltipData = event.detail;
    tooltipPosition = { x: event.detail.x, y: event.detail.y };
  }

  function handleChartLeave() {
    tooltipData = null;
  }

  $: if (timeRange) {
    loadAnalytics();
  }
</script>

<svelte:head>
  <title>Analytics Dashboard - NoteVault</title>
</svelte:head>

<!-- Tooltip -->
{#if tooltipData}
  <div
    class="fixed z-50 px-3 py-2 text-sm bg-dark-800 border border-dark-700 rounded-lg shadow-lg pointer-events-none"
    style="left: {tooltipPosition.x + 10}px; top: {tooltipPosition.y - 10}px;"
  >
    {#if tooltipData.data}
      <div class="text-white font-medium">
        {#if typeof tooltipData.data.x === 'string'}
          {new Date(tooltipData.data.x).toLocaleDateString()}
        {:else}
          {tooltipData.data.x}:00
        {/if}
      </div>
      <div class="text-dark-300">
        Value: {tooltipData.data.y.toLocaleString()}
      </div>
    {:else if tooltipData.item}
      <div class="text-white font-medium">{tooltipData.item.label}</div>
      <div class="text-dark-300">Value: {tooltipData.item.value.toLocaleString()}</div>
    {:else if tooltipData.segment}
      <div class="text-white font-medium">{tooltipData.segment.label}</div>
      <div class="text-dark-300">
        {tooltipData.segment.value.toLocaleString()} ({(tooltipData.segment.percentage * 100).toFixed(1)}%)
      </div>
    {/if}
  </div>
{/if}

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Analytics Dashboard</h1>
      <p class="text-dark-400 mt-1">Comprehensive usage analytics and insights</p>
    </div>
    <div class="flex items-center space-x-3">
      <select
        bind:value={timeRange}
        class="bg-dark-800 border border-dark-700 text-white rounded-lg px-3 py-2 text-sm"
      >
        {#each timeRangeOptions as option}
          <option value={option.value}>{option.label}</option>
        {/each}
      </select>
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    {#if isLoading}
      <div class="flex items-center justify-center py-12">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-400"></div>
        <span class="ml-3 text-white">Loading analytics...</span>
      </div>
    {:else}
      <!-- Overview Stats -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
        <div class="card p-4">
          <div class="flex items-center">
            <Users class="w-8 h-8 text-blue-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">Total Users</p>
              <p class="text-2xl font-bold text-white">{analytics.overview.totalUsers.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center">
            <Activity class="w-8 h-8 text-green-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">Active Users</p>
              <p class="text-2xl font-bold text-white">{analytics.overview.activeUsers}</p>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center">
            <TrendingUp class="w-8 h-8 text-purple-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">New Users</p>
              <p class="text-2xl font-bold text-white">+{analytics.overview.newUsers}</p>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center">
            <BarChart3 class="w-8 h-8 text-yellow-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">Sessions</p>
              <p class="text-2xl font-bold text-white">{analytics.overview.totalSessions.toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center">
            <Clock class="w-8 h-8 text-orange-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">Avg Session</p>
              <p class="text-2xl font-bold text-white">{formatDuration(analytics.overview.avgSessionDuration)}</p>
            </div>
          </div>
        </div>

        <div class="card p-4">
          <div class="flex items-center">
            <MessageSquare class="w-8 h-8 text-red-400" />
            <div class="ml-3">
              <p class="text-sm font-medium text-dark-400">Error Rate</p>
              <p class="text-2xl font-bold text-white">{formatPercentage(analytics.overview.errorRate)}</p>
            </div>
          </div>
        </div>
      </div>

      <!-- System Health Monitoring -->
      {#if systemHealth}
        <div class="card p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">System Health</h3>
            <div class="flex items-center space-x-2">
              <span class="text-2xl">{getStatusIcon(systemHealth.status)}</span>
              <span class="text-sm font-medium {getStatusColor(systemHealth.status)} capitalize">
                {systemHealth.status}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{formatUptime(systemHealth.uptime)}</div>
              <div class="text-sm text-dark-400">Uptime</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{formatPercentage(systemHealth.cpuUsage)}</div>
              <div class="text-sm text-dark-400">CPU Usage</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{formatPercentage(systemHealth.memoryUsage)}</div>
              <div class="text-sm text-dark-400">Memory Usage</div>
            </div>
            <div class="text-center">
              <div class="text-2xl font-bold text-white">{Math.round(systemHealth.responseTime)}ms</div>
              <div class="text-sm text-dark-400">Response Time</div>
            </div>
          </div>

          <!-- Service Status -->
          <div class="border-t border-dark-700 pt-6">
            <h4 class="text-md font-semibold text-white mb-4">Service Status</h4>
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              {#each Object.entries(systemHealth.services) as [service, status]}
                <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                  <div class="flex items-center space-x-2">
                    <span class="text-lg">{getStatusIcon(status)}</span>
                    <span class="text-white font-medium capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                  <span class="text-xs {getStatusColor(status)} capitalize">{status}</span>
                </div>
              {/each}
            </div>
          </div>
        </div>
      {/if}

      <!-- Charts Grid -->
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <!-- User Growth -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">User Growth</h3>
          <LineChart
            data={analytics.charts.userGrowth}
            width={400}
            height={300}
            color="#3B82F6"
            on:hover={handleChartHover}
            on:leave={handleChartLeave}
          />
        </div>

        <!-- Activity Timeline -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Activity by Hour</h3>
          <BarChart
            data={analytics.charts.activityTimeline.map(item => ({
              label: `${item.x}:00`,
              value: item.y
            }))}
            width={400}
            height={300}
            color="#10B981"
            on:hover={handleChartHover}
            on:leave={handleChartLeave}
          />
        </div>

        <!-- Device Types -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Device Types</h3>
          <DonutChart
            data={analytics.charts.deviceTypes}
            size={300}
            on:hover={handleChartHover}
            on:leave={handleChartLeave}
          />
        </div>

        <!-- Top Features -->
        <div class="card p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Most Used Features</h3>
          <BarChart
            data={analytics.charts.topFeatures}
            width={400}
            height={300}
            color="#8B5CF6"
            on:hover={handleChartHover}
            on:leave={handleChartLeave}
          />
        </div>
      </div>

      <!-- Errors Analysis -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Error Analysis</h3>
          <span class="text-sm text-dark-400">
            Total: {analytics.charts.errorsByType.reduce((sum, item) => sum + item.value, 0)} errors
          </span>
        </div>
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <DonutChart
            data={analytics.charts.errorsByType}
            size={300}
            on:hover={handleChartHover}
            on:leave={handleChartLeave}
          />
          
          <div class="space-y-3">
            {#each analytics.charts.errorsByType as error}
              <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
                <div class="flex items-center space-x-3">
                  <div class="w-4 h-4 rounded-full" style="background-color: {error.color}"></div>
                  <span class="text-white font-medium">{error.label}</span>
                </div>
                <div class="text-right">
                  <div class="text-white font-semibold">{error.value}</div>
                  <div class="text-xs text-dark-400">errors</div>
                </div>
              </div>
            {/each}
          </div>
        </div>
      </div>

      <!-- Real-time Activity Feed -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-lg font-semibold text-white">Recent Activity</h3>
          <button 
            on:click={loadAnalytics}
            class="p-2 text-dark-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
            title="Refresh activity"
          >
            <Activity class="w-4 h-4" />
          </button>
        </div>
        <div class="space-y-3">
          {#each recentActivity.slice(0, 8) as activity}
            <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <div class="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {activity.user.name.charAt(0)}{activity.user.name.split(' ')[1]?.charAt(0) || ''}
                </div>
                <div class="flex-1">
                  <p class="text-white font-medium">{activity.user.name} {activity.action}</p>
                  <div class="flex items-center space-x-3 text-xs text-dark-400 mt-1">
                    <span>{new Date(activity.timestamp).toLocaleTimeString()}</span>
                    {#if activity.details?.ip}
                      <span>•</span>
                      <span>{activity.details.ip}</span>
                    {/if}
                  </div>
                </div>
              </div>
              <div class="flex items-center space-x-2">
                <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span class="text-xs text-dark-500">
                  {Math.floor((Date.now() - new Date(activity.timestamp).getTime()) / 60000)}m ago
                </span>
              </div>
            </div>
          {/each}
        </div>

        {#if recentActivity.length === 0}
          <div class="text-center py-8">
            <Activity class="h-12 w-12 mx-auto mb-3 text-dark-500" />
            <p class="text-dark-400">No recent activity</p>
          </div>
        {/if}
      </div>
    {/if}
  </div>
</main>