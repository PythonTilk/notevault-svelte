<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Bot, 
    MessageSquare, 
    Settings, 
    Play, 
    Pause,
    Trash2,
    Plus,
    ExternalLink,
    Command,
    Users,
    Activity
  } from 'lucide-svelte';
  import { api } from '$lib/api';

  let bots = [];
  let commands = [];
  let isLoading = false;
  let showCreateModal = false;
  let selectedBot = null;

  // New bot configuration
  let newBot = {
    name: '',
    platform: 'slack', // 'slack' or 'discord'
    description: '',
    token: '',
    channels: [],
    enabled: true
  };

  // Command execution
  let commandInput = '';
  let commandHistory = [];
  let selectedChannel = '';

  onMount(async () => {
    await loadBots();
    await loadCommands();
    await loadCommandHistory();
  });

  async function loadBots() {
    try {
      const response = await api.get('/bots');
      if (response.ok) {
        bots = await response.json();
      } else {
        // Mock data
        bots = [
          {
            id: 'slack-bot-1',
            name: 'NoteVault Slack Bot',
            platform: 'slack',
            status: 'active',
            teamName: 'Development Team',
            channels: ['#general', '#dev-team', '#notevault'],
            commandCount: 156,
            lastActive: new Date(Date.now() - 300000).toISOString(),
            enabled: true
          },
          {
            id: 'discord-bot-1',
            name: 'NoteVault Discord Bot',
            platform: 'discord',
            status: 'active',
            guildName: 'NoteVault Community',
            channels: ['general', 'development', 'support'],
            commandCount: 89,
            lastActive: new Date(Date.now() - 600000).toISOString(),
            enabled: true
          }
        ];
      }
    } catch (error) {
      console.error('Failed to load bots:', error);
    }
  }

  async function loadCommands() {
    try {
      const response = await api.get('/bots/commands');
      if (response.ok) {
        commands = await response.json();
      } else {
        // Mock commands
        commands = [
          {
            name: 'help',
            description: 'Show available commands',
            usage: '/notevault help',
            category: 'General',
            enabled: true
          },
          {
            name: 'status',
            description: 'Show system status',
            usage: '/notevault status',
            category: 'System',
            enabled: true
          },
          {
            name: 'create',
            description: 'Create a new workspace',
            usage: '/notevault create [name]',
            category: 'Workspace',
            enabled: true
          },
          {
            name: 'list',
            description: 'List your workspaces',
            usage: '/notevault list',
            category: 'Workspace',
            enabled: true
          },
          {
            name: 'search',
            description: 'Search notes and workspaces',
            usage: '/notevault search [query]',
            category: 'Search',
            enabled: true
          },
          {
            name: 'activity',
            description: 'Show recent activity',
            usage: '/notevault activity',
            category: 'General',
            enabled: true
          }
        ];
      }
    } catch (error) {
      console.error('Failed to load commands:', error);
    }
  }

  async function loadCommandHistory() {
    try {
      const response = await api.get('/bots/history?limit=20');
      if (response.ok) {
        commandHistory = await response.json();
      } else {
        // Mock history
        commandHistory = [
          {
            id: '1',
            command: '/notevault status',
            user: 'john.doe',
            platform: 'slack',
            channel: '#general',
            timestamp: new Date(Date.now() - 300000).toISOString(),
            success: true,
            response: 'System is operational'
          },
          {
            id: '2',
            command: '/notevault create "New Project"',
            user: 'jane.smith',
            platform: 'discord',
            channel: 'development',
            timestamp: new Date(Date.now() - 600000).toISOString(),
            success: true,
            response: 'Workspace "New Project" created successfully'
          },
          {
            id: '3',
            command: '/notevault help',
            user: 'bob.wilson',
            platform: 'slack',
            channel: '#dev-team',
            timestamp: new Date(Date.now() - 900000).toISOString(),
            success: true,
            response: 'Available commands listed'
          }
        ];
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }

  async function toggleBot(botId: string) {
    try {
      const bot = bots.find(b => b.id === botId);
      const response = await api.patch(`/bots/${botId}`, {
        enabled: !bot.enabled
      });
      
      if (response.ok) {
        bot.enabled = !bot.enabled;
        bot.status = bot.enabled ? 'active' : 'inactive';
        bots = [...bots];
      }
    } catch (error) {
      console.error('Failed to toggle bot:', error);
    }
  }

  async function deleteBot(botId: string) {
    if (!confirm('Are you sure you want to delete this bot? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await api.delete(`/bots/${botId}`);
      if (response.ok) {
        bots = bots.filter(b => b.id !== botId);
      }
    } catch (error) {
      console.error('Failed to delete bot:', error);
    }
  }

  async function testCommand() {
    if (!commandInput.trim()) return;

    try {
      const response = await api.post('/bots/test-command', {
        command: commandInput,
        platform: 'web',
        channel: selectedChannel || 'test'
      });

      const historyItem = {
        id: Date.now().toString(),
        command: commandInput,
        user: 'admin',
        platform: 'web',
        channel: selectedChannel || 'test',
        timestamp: new Date().toISOString(),
        success: response.ok,
        response: response.ok ? await response.text() : 'Command failed'
      };

      commandHistory = [historyItem, ...commandHistory.slice(0, 19)];
      commandInput = '';
    } catch (error) {
      console.error('Failed to test command:', error);
    }
  }

  function formatTime(timestamp: string) {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  function getBotIcon(platform: string) {
    return platform === 'slack' ? MessageSquare : Bot;
  }

  function getBotStatusColor(status: string) {
    switch (status) {
      case 'active':
        return 'text-green-400';
      case 'inactive':
        return 'text-yellow-400';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-dark-400';
    }
  }

  const commandCategories = [...new Set(commands.map(c => c.category))];
</script>

<svelte:head>
  <title>Bot Management - NoteVault</title>
</svelte:head>

<!-- Create Bot Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
    <div class="bg-dark-800 rounded-lg shadow-xl w-full max-w-2xl">
      <div class="p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Configure Bot</h2>
          <button
            on:click={() => showCreateModal = false}
            class="text-dark-400 hover:text-white"
          >
            ×
          </button>
        </div>

        <form class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Platform</label>
            <select bind:value={newBot.platform} class="input">
              <option value="slack">Slack</option>
              <option value="discord">Discord</option>
            </select>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Bot Name</label>
            <input
              type="text"
              bind:value={newBot.name}
              class="input"
              placeholder="NoteVault Bot"
            />
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Description</label>
            <textarea
              bind:value={newBot.description}
              class="input"
              rows="3"
              placeholder="Bot description"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              {newBot.platform === 'slack' ? 'Bot Token' : 'Bot Token'}
            </label>
            <input
              type="password"
              bind:value={newBot.token}
              class="input"
              placeholder={newBot.platform === 'slack' ? 'xoxb-...' : 'Bot token'}
            />
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              on:click={() => showCreateModal = false}
              class="btn-secondary"
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Configure Bot
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-2xl font-bold text-white">Bot Management</h1>
      <p class="text-dark-400 mt-1">Manage Slack and Discord bots</p>
    </div>
    <div class="flex items-center space-x-3">
      <button
        on:click={() => showCreateModal = true}
        class="btn-primary"
      >
        <Plus class="h-4 w-4 mr-2" />
        Add Bot
      </button>
    </div>
  </div>
</header>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  <div class="max-w-7xl mx-auto space-y-6">
    <!-- Active Bots -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-white mb-6">Active Bots</h2>
      
      {#if bots.length === 0}
        <div class="text-center py-8">
          <Bot class="h-16 w-16 mx-auto mb-4 text-dark-500" />
          <h3 class="text-lg font-medium text-white mb-2">No bots configured</h3>
          <p class="text-dark-400 mb-4">Add a Slack or Discord bot to get started</p>
          <button
            on:click={() => showCreateModal = true}
            class="btn-primary"
          >
            Add Your First Bot
          </button>
        </div>
      {:else}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each bots as bot}
            <div class="bg-dark-700 rounded-lg p-4">
              <div class="flex items-center justify-between mb-4">
                <div class="flex items-center space-x-3">
                  <svelte:component 
                    this={getBotIcon(bot.platform)} 
                    class="h-8 w-8 text-primary-400" 
                  />
                  <div>
                    <h3 class="font-medium text-white">{bot.name}</h3>
                    <p class="text-sm text-dark-400 capitalize">{bot.platform}</p>
                  </div>
                </div>
                
                <div class="flex items-center space-x-2">
                  <div class="flex items-center space-x-1">
                    <div class={`w-2 h-2 rounded-full ${getBotStatusColor(bot.status)}`}></div>
                    <span class={`text-xs font-medium ${getBotStatusColor(bot.status)}`}>
                      {bot.status}
                    </span>
                  </div>
                </div>
              </div>

              <div class="space-y-2 text-sm text-dark-300 mb-4">
                <div class="flex items-center justify-between">
                  <span>Team/Guild:</span>
                  <span class="text-white">{bot.teamName || bot.guildName}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Channels:</span>
                  <span class="text-white">{bot.channels.length}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Commands Used:</span>
                  <span class="text-white">{bot.commandCount.toLocaleString()}</span>
                </div>
                <div class="flex items-center justify-between">
                  <span>Last Active:</span>
                  <span class="text-white">{formatTime(bot.lastActive)}</span>
                </div>
              </div>

              <div class="flex items-center justify-between">
                <div class="flex items-center space-x-2">
                  <button
                    on:click={() => toggleBot(bot.id)}
                    class="p-2 rounded-lg hover:bg-dark-600 {bot.enabled ? 'text-yellow-400' : 'text-green-400'}"
                    title={bot.enabled ? 'Pause bot' : 'Start bot'}
                  >
                    {#if bot.enabled}
                      <Pause class="h-4 w-4" />
                    {:else}
                      <Play class="h-4 w-4" />
                    {/if}
                  </button>
                  
                  <button
                    class="p-2 rounded-lg hover:bg-dark-600 text-dark-400 hover:text-white"
                    title="Settings"
                  >
                    <Settings class="h-4 w-4" />
                  </button>
                </div>

                <button
                  on:click={() => deleteBot(bot.id)}
                  class="p-2 rounded-lg hover:bg-dark-600 text-red-400 hover:text-red-300"
                  title="Delete bot"
                >
                  <Trash2 class="h-4 w-4" />
                </button>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <!-- Available Commands -->
      <div class="card p-6">
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white">Available Commands</h2>
          <Command class="h-5 w-5 text-primary-400" />
        </div>

        <div class="space-y-4">
          {#each commandCategories as category}
            <div>
              <h3 class="text-sm font-medium text-dark-300 mb-2">{category}</h3>
              <div class="space-y-2">
                {#each commands.filter(c => c.category === category) as command}
                  <div class="flex items-center justify-between p-3 bg-dark-700 rounded-lg">
                    <div class="flex-1">
                      <div class="flex items-center space-x-2">
                        <code class="text-primary-400 font-mono text-sm">{command.name}</code>
                        <span class={`w-2 h-2 rounded-full ${command.enabled ? 'bg-green-400' : 'bg-red-400'}`}></span>
                      </div>
                      <p class="text-sm text-dark-400 mt-1">{command.description}</p>
                      <p class="text-xs text-dark-500 font-mono mt-1">{command.usage}</p>
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>
      </div>

      <!-- Command Testing & History -->
      <div class="card p-6">
        <h2 class="text-xl font-semibold text-white mb-6">Command Testing</h2>

        <!-- Test Command -->
        <div class="mb-6">
          <div class="flex space-x-2 mb-3">
            <input
              type="text"
              bind:value={commandInput}
              class="input flex-1"
              placeholder="/notevault help"
              on:keydown={(e) => e.key === 'Enter' && testCommand()}
            />
            <button
              on:click={testCommand}
              class="btn-primary"
              disabled={!commandInput.trim()}
            >
              Test
            </button>
          </div>
          <p class="text-xs text-dark-500">Test bot commands directly from the web interface</p>
        </div>

        <!-- Command History -->
        <div>
          <h3 class="text-lg font-medium text-white mb-4">Recent Commands</h3>
          <div class="space-y-3 max-h-96 overflow-y-auto">
            {#each commandHistory as item}
              <div class="p-3 bg-dark-700 rounded-lg">
                <div class="flex items-center justify-between mb-2">
                  <div class="flex items-center space-x-2">
                    <span class="text-white font-medium">{item.user}</span>
                    <span class="px-2 py-1 text-xs rounded-full bg-primary-500/20 text-primary-300">
                      {item.platform}
                    </span>
                    <span class="text-dark-400">#{item.channel}</span>
                  </div>
                  <div class="flex items-center space-x-2">
                    <span class={`w-2 h-2 rounded-full ${item.success ? 'bg-green-400' : 'bg-red-400'}`}></span>
                    <span class="text-xs text-dark-400">{formatTime(item.timestamp)}</span>
                  </div>
                </div>
                <code class="text-primary-400 text-sm block mb-2">{item.command}</code>
                {#if item.response}
                  <p class="text-sm text-dark-300">{item.response}</p>
                {/if}
              </div>
            {/each}

            {#if commandHistory.length === 0}
              <div class="text-center py-6">
                <Activity class="h-12 w-12 mx-auto mb-3 text-dark-500" />
                <p class="text-dark-400">No command history yet</p>
              </div>
            {/if}
          </div>
        </div>
      </div>
    </div>

    <!-- Integration Help -->
    <div class="card p-6">
      <h2 class="text-xl font-semibold text-white mb-4">Integration Setup</h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div class="p-4 bg-dark-700 rounded-lg">
          <div class="flex items-center space-x-3 mb-3">
            <MessageSquare class="h-6 w-6 text-blue-400" />
            <h3 class="font-medium text-white">Slack Integration</h3>
          </div>
          <p class="text-sm text-dark-400 mb-4">
            Connect NoteVault to your Slack workspace to enable bot commands and notifications.
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Slash commands</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Workspace notifications</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Interactive messages</span>
            </div>
          </div>
        </div>

        <div class="p-4 bg-dark-700 rounded-lg">
          <div class="flex items-center space-x-3 mb-3">
            <Bot class="h-6 w-6 text-purple-400" />
            <h3 class="font-medium text-white">Discord Integration</h3>
          </div>
          <p class="text-sm text-dark-400 mb-4">
            Add the NoteVault bot to your Discord server for team collaboration.
          </p>
          <div class="space-y-2 text-sm">
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Slash commands</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Channel notifications</span>
            </div>
            <div class="flex items-center space-x-2">
              <span class="w-2 h-2 bg-green-400 rounded-full"></span>
              <span class="text-dark-300">Embed messages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</main>