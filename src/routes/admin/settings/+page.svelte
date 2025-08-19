<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Settings, 
    Save, 
    Server, 
    Database, 
    Shield, 
    Mail, 
    Bell, 
    Palette,
    Upload,
    Download,
    RefreshCw,
    AlertTriangle,
    CheckCircle
  } from 'lucide-svelte';
  import { toastStore } from '$lib/stores/toast';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  interface SystemSettings {
    general: {
      siteName: string;
      siteDescription: string;
      maintenanceMode: boolean;
      registrationEnabled: boolean;
      maxFileSize: number;
      maxStoragePerUser: number;
    };
    email: {
      enabled: boolean;
      provider: string;
      smtpHost: string;
      smtpPort: number;
      smtpUser: string;
      smtpSecure: boolean;
    };
    security: {
      sessionTimeout: number;
      maxLoginAttempts: number;
      passwordMinLength: number;
      requireTwoFactor: boolean;
      allowedOrigins: string[];
    };
    notifications: {
      emailNotifications: boolean;
      webhookNotifications: boolean;
      slackIntegration: boolean;
      discordIntegration: boolean;
    };
  }

  let settings: SystemSettings = {
    general: {
      siteName: 'NoteVault',
      siteDescription: 'A secure note-taking and collaboration platform',
      maintenanceMode: false,
      registrationEnabled: true,
      maxFileSize: 10,
      maxStoragePerUser: 1000
    },
    email: {
      enabled: false,
      provider: 'smtp',
      smtpHost: '',
      smtpPort: 587,
      smtpUser: '',
      smtpSecure: true
    },
    security: {
      sessionTimeout: 24,
      maxLoginAttempts: 5,
      passwordMinLength: 8,
      requireTwoFactor: false,
      allowedOrigins: ['localhost:5173', 'localhost:4173']
    },
    notifications: {
      emailNotifications: true,
      webhookNotifications: true,
      slackIntegration: false,
      discordIntegration: false
    }
  };

  let originalSettings: SystemSettings;
  let loading = true;
  let saving = false;
  let hasChanges = false;
  let error = '';
  let activeTab = 'general';

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'email', name: 'Email', icon: Mail },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell }
  ];

  onMount(async () => {
    await loadSettings();
  });

  async function loadSettings() {
    try {
      loading = true;
      error = '';
      
      // For now, use default settings as backend doesn't have settings API yet
      // TODO: Replace with actual API call when backend settings endpoint is implemented
      // const response = await api.getSystemSettings();
      // settings = response;
      
      originalSettings = JSON.parse(JSON.stringify(settings));
      hasChanges = false;
    } catch (err) {
      console.error('Failed to load settings:', err);
      error = 'Failed to load system settings';
    } finally {
      loading = false;
    }
  }

  async function saveSettings() {
    try {
      saving = true;
      error = '';
      
      // TODO: Replace with actual API call when backend settings endpoint is implemented
      // await api.updateSystemSettings(settings);
      
      // Simulate API call delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      originalSettings = JSON.parse(JSON.stringify(settings));
      hasChanges = false;
      
      toastStore.success('Settings Saved', 'System settings have been updated successfully');
    } catch (err) {
      console.error('Failed to save settings:', err);
      error = 'Failed to save system settings';
      toastStore.error('Save Failed', 'Unable to save system settings');
    } finally {
      saving = false;
    }
  }

  function resetSettings() {
    settings = JSON.parse(JSON.stringify(originalSettings));
    hasChanges = false;
  }

  function handleInputChange() {
    hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);
  }

  function exportSettings() {
    const dataStr = JSON.stringify(settings, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'notevault-settings.json';
    link.click();
    URL.revokeObjectURL(url);
    toastStore.success('Export Complete', 'Settings exported successfully');
  }

  function importSettings(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const importedSettings = JSON.parse(e.target?.result as string);
        settings = { ...settings, ...importedSettings };
        handleInputChange();
        toastStore.success('Import Complete', 'Settings imported successfully');
      } catch (err) {
        toastStore.error('Import Failed', 'Invalid settings file format');
      }
    };
    reader.readAsText(file);
  }

  function testEmailConfiguration() {
    // TODO: Implement email test when backend endpoint is available
    toastStore.info('Test Email', 'Email configuration test - feature coming soon');
  }
</script>

<svelte:head>
  <title>System Settings - Admin - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">System Settings</h1>
      <p class="text-dark-400 text-sm">Configure global application settings</p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button
        class="btn-secondary text-sm"
        on:click={exportSettings}
        title="Export Settings"
      >
        <Download class="w-4 h-4 mr-1" />
        Export
      </button>
      
      <label class="btn-secondary text-sm cursor-pointer">
        <Upload class="w-4 h-4 mr-1" />
        Import
        <input 
          type="file" 
          accept=".json" 
          class="hidden" 
          on:change={importSettings}
        />
      </label>
      
      {#if hasChanges}
        <button
          class="btn-ghost text-sm"
          on:click={resetSettings}
          disabled={saving}
        >
          <RefreshCw class="w-4 h-4 mr-1" />
          Reset
        </button>
        
        <button
          class="btn-primary"
          on:click={saveSettings}
          disabled={saving}
        >
          {#if saving}
            <LoadingSpinner size="sm" />
          {:else}
            <Save class="w-4 h-4 mr-2" />
          {/if}
          Save Changes
        </button>
      {/if}
    </div>
  </div>
</header>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
{:else}
  <div class="max-w-6xl mx-auto p-6">
    <!-- Error Alert -->
    {#if error}
      <div class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-6">
        <div class="flex items-center">
          <AlertTriangle class="w-5 h-5 text-red-400 mr-2" />
          <span class="text-red-400">{error}</span>
        </div>
      </div>
    {/if}

    <!-- Tabs -->
    <div class="flex space-x-1 bg-dark-800 p-1 rounded-lg mb-6">
      {#each tabs as tab}
        <button
          class="flex items-center px-4 py-2 rounded-md text-sm font-medium transition-colors {activeTab === tab.id 
            ? 'bg-primary-600 text-white' 
            : 'text-dark-300 hover:text-white hover:bg-dark-700'}"
          on:click={() => activeTab = tab.id}
        >
          <svelte:component this={tab.icon} class="w-4 h-4 mr-2" />
          {tab.name}
        </button>
      {/each}
    </div>

    <!-- Tab Content -->
    <div class="bg-dark-800 rounded-lg p-6">
      {#if activeTab === 'general'}
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Settings class="w-5 h-5 mr-2" />
            General Settings
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Site Name</label>
              <input
                type="text"
                bind:value={settings.general.siteName}
                on:input={handleInputChange}
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                placeholder="NoteVault"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Max File Size (MB)</label>
              <input
                type="number"
                bind:value={settings.general.maxFileSize}
                on:input={handleInputChange}
                min="1"
                max="100"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div class="md:col-span-2">
              <label class="block text-sm font-medium text-dark-300 mb-2">Site Description</label>
              <textarea
                bind:value={settings.general.siteDescription}
                on:input={handleInputChange}
                rows="3"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                placeholder="A secure note-taking and collaboration platform"
              ></textarea>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Max Storage per User (MB)</label>
              <input
                type="number"
                bind:value={settings.general.maxStoragePerUser}
                on:input={handleInputChange}
                min="100"
                max="10000"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
          </div>
          
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.general.maintenanceMode}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Maintenance Mode</label>
              <span class="ml-2 text-sm text-dark-400">Temporarily disable access for maintenance</span>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.general.registrationEnabled}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Allow User Registration</label>
              <span class="ml-2 text-sm text-dark-400">Allow new users to register accounts</span>
            </div>
          </div>
        </div>
      {/if}

      {#if activeTab === 'email'}
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Mail class="w-5 h-5 mr-2" />
            Email Configuration
          </h3>
          
          <div class="flex items-center mb-4">
            <input
              type="checkbox"
              bind:checked={settings.email.enabled}
              on:change={handleInputChange}
              class="mr-3"
            />
            <label class="text-white">Enable Email Service</label>
          </div>
          
          {#if settings.email.enabled}
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label class="block text-sm font-medium text-dark-300 mb-2">SMTP Host</label>
                <input
                  type="text"
                  bind:value={settings.email.smtpHost}
                  on:input={handleInputChange}
                  class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                  placeholder="smtp.gmail.com"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-dark-300 mb-2">SMTP Port</label>
                <input
                  type="number"
                  bind:value={settings.email.smtpPort}
                  on:input={handleInputChange}
                  class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                  placeholder="587"
                />
              </div>
              
              <div>
                <label class="block text-sm font-medium text-dark-300 mb-2">SMTP Username</label>
                <input
                  type="text"
                  bind:value={settings.email.smtpUser}
                  on:input={handleInputChange}
                  class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
                  placeholder="your-email@gmail.com"
                />
              </div>
              
              <div class="flex items-center">
                <input
                  type="checkbox"
                  bind:checked={settings.email.smtpSecure}
                  on:change={handleInputChange}
                  class="mr-3"
                />
                <label class="text-white">Use TLS/SSL</label>
              </div>
            </div>
            
            <button
              class="btn-secondary"
              on:click={testEmailConfiguration}
            >
              <Mail class="w-4 h-4 mr-2" />
              Test Email Configuration
            </button>
          {/if}
        </div>
      {/if}

      {#if activeTab === 'security'}
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Shield class="w-5 h-5 mr-2" />
            Security Settings
          </h3>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Session Timeout (hours)</label>
              <input
                type="number"
                bind:value={settings.security.sessionTimeout}
                on:input={handleInputChange}
                min="1"
                max="168"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Max Login Attempts</label>
              <input
                type="number"
                bind:value={settings.security.maxLoginAttempts}
                on:input={handleInputChange}
                min="3"
                max="10"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-dark-300 mb-2">Minimum Password Length</label>
              <input
                type="number"
                bind:value={settings.security.passwordMinLength}
                on:input={handleInputChange}
                min="6"
                max="32"
                class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              />
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.security.requireTwoFactor}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Require Two-Factor Authentication</label>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Allowed Origins (one per line)</label>
            <textarea
              bind:value={settings.security.allowedOrigins.join('\n')}
              on:input={(e) => {
                settings.security.allowedOrigins = e.target.value.split('\n').filter(o => o.trim());
                handleInputChange();
              }}
              rows="4"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white font-mono text-sm"
              placeholder="localhost:5173&#10;yourdomain.com"
            ></textarea>
          </div>
        </div>
      {/if}

      {#if activeTab === 'notifications'}
        <div class="space-y-6">
          <h3 class="text-lg font-semibold text-white flex items-center">
            <Bell class="w-5 h-5 mr-2" />
            Notification Settings
          </h3>
          
          <div class="space-y-4">
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.notifications.emailNotifications}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Email Notifications</label>
              <span class="ml-2 text-sm text-dark-400">Send notifications via email</span>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.notifications.webhookNotifications}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Webhook Notifications</label>
              <span class="ml-2 text-sm text-dark-400">Send notifications to configured webhooks</span>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.notifications.slackIntegration}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Slack Integration</label>
              <span class="ml-2 text-sm text-dark-400">Enable Slack bot notifications</span>
            </div>
            
            <div class="flex items-center">
              <input
                type="checkbox"
                bind:checked={settings.notifications.discordIntegration}
                on:change={handleInputChange}
                class="mr-3"
              />
              <label class="text-white">Discord Integration</label>
              <span class="ml-2 text-sm text-dark-400">Enable Discord bot notifications</span>
            </div>
          </div>
        </div>
      {/if}
    </div>

    <!-- Changes Indicator -->
    {#if hasChanges}
      <div class="fixed bottom-4 right-4 bg-amber-900/90 border border-amber-800 rounded-lg p-4 max-w-sm z-50">
        <div class="flex items-center">
          <AlertTriangle class="w-5 h-5 text-amber-400 mr-2" />
          <span class="text-amber-400 text-sm">You have unsaved changes</span>
        </div>
      </div>
    {/if}
  </div>
{/if}