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
    }
  };

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
      const response = await api.get(`/analytics?timeRange=${timeRange}`);
      if (response.ok) {
        analytics = await response.json();
      } else {
        // Mock data for demonstration
        analytics = generateMockData();
      }
    } catch (error) {
      console.error('Failed to load analytics:', error);
      analytics = generateMockData();
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
        <h3 class="text-lg font-semibold text-white mb-4">Recent Activity</h3>
        <div class="space-y-3">
          {#each Array.from({length: 5}, (_, i) => ({
            id: i,
            user: `User ${i + 1}`,
            action: ['created note', 'joined workspace', 'uploaded file', 'sent message', 'shared workspace'][i],
            time: `${i + 1} minute${i === 0 ? '' : 's'} ago`
          })) as activity}
            <div class="flex items-center justify-between p-3 bg-dark-800 rounded-lg">
              <div class="flex items-center space-x-3">
                <div class="w-8 h-8 bg-primary-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {activity.user.charAt(5)}
                </div>
                <div>
                  <p class="text-white font-medium">{activity.user} {activity.action}</p>
                  <p class="text-xs text-dark-400">{activity.time}</p>
                </div>
              </div>
              <Activity class="w-4 h-4 text-green-400" />
            </div>
          {/each}
        </div>
      </div>
    {/if}
  </div>
</main>