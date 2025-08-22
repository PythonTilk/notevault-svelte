<script lang="ts">
  import { onMount } from 'svelte';
  import { 
    Shield, 
    Key, 
    RefreshCw, 
    Plus, 
    Trash2, 
    Eye, 
    EyeOff, 
    Copy, 
    Download,
    AlertTriangle,
    CheckCircle,
    Clock,
    Lock,
    Unlock,
    Zap,
    Activity
  } from 'lucide-svelte';
  import { api } from '$lib/api';
  import { toastStore } from '$lib/stores/toast';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';

  interface APIKey {
    keyId: string;
    name: string;
    permissions: string[];
    createdAt: string;
    lastUsed?: string;
    isActive: boolean;
  }

  interface SecretsStatus {
    apiKeyCount: number;
    jwtSecretVersion: number;
    encryptionKeyVersion: number;
    lastJwtRotation?: string;
    lastEncryptionRotation?: string;
  }

  interface SecretsHealth {
    score: number;
    issues: string[];
    recommendations: string[];
  }

  let apiKeys: APIKey[] = [];
  let secretsStatus: SecretsStatus | null = null;
  let secretsHealth: SecretsHealth | null = null;
  let loading = true;
  let error = '';

  // Modal states
  let showCreateAPIKeyModal = false;
  let showRotateJWTModal = false;
  let showRotateEncryptionModal = false;
  let showBackupCodesModal = false;
  let showDeleteConfirmModal = false;
  let showNewAPIKeyModal = false;

  // Form data
  let newAPIKeyName = '';
  let newAPIKeyPermissions: string[] = [];
  let encryptionConfirmation = '';
  let backupCodeCount = 10;
  let keyToDelete: APIKey | null = null;
  let newAPIKeyData: any = null;
  let generatedBackupCodes: string[] = [];

  // UI states
  let activeTab = 'overview';
  let showPermissionsHelp = false;
  let visibleKeys: Set<string> = new Set();

  const availablePermissions = [
    { id: 'read', name: 'Read Access', description: 'View resources' },
    { id: 'write', name: 'Write Access', description: 'Create and modify resources' },
    { id: 'delete', name: 'Delete Access', description: 'Delete resources' },
    { id: 'admin', name: 'Admin Access', description: 'Full administrative access' },
    { id: 'workspaces:read', name: 'Workspaces Read', description: 'View workspaces' },
    { id: 'workspaces:write', name: 'Workspaces Write', description: 'Modify workspaces' },
    { id: 'workspaces:delete', name: 'Workspaces Delete', description: 'Delete workspaces' },
    { id: 'notes:read', name: 'Notes Read', description: 'View notes' },
    { id: 'notes:write', name: 'Notes Write', description: 'Modify notes' },
    { id: 'notes:delete', name: 'Notes Delete', description: 'Delete notes' },
    { id: 'files:read', name: 'Files Read', description: 'Download files' },
    { id: 'files:write', name: 'Files Write', description: 'Upload files' },
    { id: 'files:delete', name: 'Files Delete', description: 'Delete files' },
    { id: 'users:read', name: 'Users Read', description: 'View user information' },
    { id: 'users:write', name: 'Users Write', description: 'Modify user information' },
    { id: 'chat:read', name: 'Chat Read', description: 'View chat messages' },
    { id: 'chat:write', name: 'Chat Write', description: 'Send chat messages' }
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Activity },
    { id: 'api-keys', name: 'API Keys', icon: Key },
    { id: 'security', name: 'Security', icon: Shield }
  ];

  onMount(async () => {
    await loadData();
  });

  async function loadData() {
    try {
      loading = true;
      error = '';
      
      const [keys, status, health] = await Promise.all([
        api.getAPIKeys(),
        api.getSecretsStatus(),
        api.getSecretsHealth()
      ]);
      
      apiKeys = keys.apiKeys || [];
      secretsStatus = status;
      secretsHealth = health;
    } catch (err) {
      console.error('Failed to load secrets data:', err);
      error = 'Failed to load secrets management data';
    } finally {
      loading = false;
    }
  }

  async function createAPIKey() {
    if (!newAPIKeyName.trim() || newAPIKeyPermissions.length === 0) {
      toastStore.error('Validation Error', 'Name and at least one permission are required');
      return;
    }

    try {
      const response = await api.createAPIKey({
        name: newAPIKeyName.trim(),
        permissions: newAPIKeyPermissions
      });
      
      newAPIKeyData = response.apiKey;
      showCreateAPIKeyModal = false;
      showNewAPIKeyModal = true;
      
      // Reset form
      newAPIKeyName = '';
      newAPIKeyPermissions = [];
      
      await loadData();
      toastStore.success('API Key Created', 'New API key has been generated');
    } catch (error) {
      console.error('Failed to create API key:', error);
      toastStore.error('Create Failed', 'Unable to create API key');
    }
  }

  async function deleteAPIKey(keyId: string) {
    try {
      await api.deleteAPIKey(keyId);
      await loadData();
      showDeleteConfirmModal = false;
      keyToDelete = null;
      toastStore.success('API Key Deleted', 'API key has been revoked');
    } catch (error) {
      console.error('Failed to delete API key:', error);
      toastStore.error('Delete Failed', 'Unable to delete API key');
    }
  }

  async function rotateJWTSecret() {
    try {
      const response = await api.rotateJWTSecret();
      await loadData();
      showRotateJWTModal = false;
      toastStore.success('JWT Secret Rotated', response.message);
    } catch (error) {
      console.error('Failed to rotate JWT secret:', error);
      toastStore.error('Rotation Failed', 'Unable to rotate JWT secret');
    }
  }

  async function rotateEncryptionKey() {
    if (encryptionConfirmation !== 'I understand this will invalidate all stored secrets') {
      toastStore.error('Confirmation Required', 'Please type the exact confirmation phrase');
      return;
    }

    try {
      const response = await api.rotateEncryptionKey(encryptionConfirmation);
      await loadData();
      showRotateEncryptionModal = false;
      encryptionConfirmation = '';
      toastStore.success('Encryption Key Rotated', 'Encryption key has been rotated');
    } catch (error) {
      console.error('Failed to rotate encryption key:', error);
      toastStore.error('Rotation Failed', 'Unable to rotate encryption key');
    }
  }

  async function generateBackupCodes() {
    try {
      const response = await api.generateBackupCodes(backupCodeCount);
      generatedBackupCodes = response.backupCodes || [];
      toastStore.success('Backup Codes Generated', `Generated ${generatedBackupCodes.length} backup codes`);
    } catch (error) {
      console.error('Failed to generate backup codes:', error);
      toastStore.error('Generation Failed', 'Unable to generate backup codes');
    }
  }

  async function copyToClipboard(text: string, description: string) {
    try {
      await navigator.clipboard.writeText(text);
      toastStore.success('Copied', `${description} copied to clipboard`);
    } catch (error) {
      toastStore.error('Copy Failed', 'Unable to copy to clipboard');
    }
  }

  function toggleKeyVisibility(keyId: string) {
    if (visibleKeys.has(keyId)) {
      visibleKeys.delete(keyId);
    } else {
      visibleKeys.add(keyId);
    }
    visibleKeys = visibleKeys;
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

  function getHealthColor(score: number) {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  }

  function getHealthIcon(score: number) {
    if (score >= 90) return CheckCircle;
    if (score >= 70) return AlertTriangle;
    return AlertTriangle;
  }

  function downloadBackupCodes() {
    const content = generatedBackupCodes.join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'notevault-backup-codes.txt';
    a.click();
    URL.revokeObjectURL(url);
    toastStore.success('Download Complete', 'Backup codes saved to file');
  }
</script>

<svelte:head>
  <title>Secrets Management - Admin - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white flex items-center">
        <Shield class="w-6 h-6 mr-2" />
        Secrets Management
      </h1>
      <p class="text-dark-400 text-sm">Manage API keys, encryption, and security settings</p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button
        class="btn-primary"
        on:click={() => showCreateAPIKeyModal = true}
      >
        <Plus class="w-4 h-4 mr-2" />
        Create API Key
      </button>
    </div>
  </div>
</header>

{#if loading}
  <div class="flex items-center justify-center h-64">
    <LoadingSpinner />
  </div>
{:else if error}
  <div class="max-w-6xl mx-auto p-6">
    <div class="bg-red-900/20 border border-red-800 rounded-lg p-4">
      <div class="flex items-center">
        <AlertTriangle class="w-5 h-5 text-red-400 mr-2" />
        <span class="text-red-400">{error}</span>
      </div>
    </div>
  </div>
{:else}
  <div class="max-w-6xl mx-auto p-6">
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

    <!-- Overview Tab -->
    {#if activeTab === 'overview'}
      <div class="space-y-6">
        <!-- Security Health -->
        {#if secretsHealth}
          <div class="bg-dark-800 rounded-lg p-6">
            <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
              <svelte:component this={getHealthIcon(secretsHealth.score)} class="w-5 h-5 mr-2 {getHealthColor(secretsHealth.score)}" />
              Security Health Score
            </h3>
            <div class="flex items-center space-x-4 mb-4">
              <div class="text-3xl font-bold {getHealthColor(secretsHealth.score)}">{secretsHealth.score}/100</div>
              <div class="flex-1 bg-dark-700 rounded-full h-3">
                <div 
                  class="h-3 rounded-full transition-all duration-300 {secretsHealth.score >= 90 ? 'bg-green-500' : secretsHealth.score >= 70 ? 'bg-yellow-500' : 'bg-red-500'}"
                  style="width: {secretsHealth.score}%"
                ></div>
              </div>
            </div>
            
            {#if secretsHealth.issues.length > 0}
              <div class="mb-4">
                <h4 class="text-sm font-medium text-red-400 mb-2">Issues ({secretsHealth.issues.length})</h4>
                <ul class="space-y-1">
                  {#each secretsHealth.issues as issue}
                    <li class="text-sm text-red-300 flex items-center">
                      <AlertTriangle class="w-3 h-3 mr-2" />
                      {issue}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
            
            {#if secretsHealth.recommendations.length > 0}
              <div>
                <h4 class="text-sm font-medium text-blue-400 mb-2">Recommendations ({secretsHealth.recommendations.length})</h4>
                <ul class="space-y-1">
                  {#each secretsHealth.recommendations as recommendation}
                    <li class="text-sm text-blue-300 flex items-center">
                      <CheckCircle class="w-3 h-3 mr-2" />
                      {recommendation}
                    </li>
                  {/each}
                </ul>
              </div>
            {/if}
          </div>
        {/if}

        <!-- Quick Stats -->
        {#if secretsStatus}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-dark-800 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-dark-400 text-sm">API Keys</p>
                  <p class="text-2xl font-bold text-white">{secretsStatus.apiKeyCount}</p>
                </div>
                <Key class="w-8 h-8 text-primary-400" />
              </div>
            </div>
            
            <div class="bg-dark-800 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-dark-400 text-sm">JWT Version</p>
                  <p class="text-2xl font-bold text-white">v{secretsStatus.jwtSecretVersion}</p>
                </div>
                <Lock class="w-8 h-8 text-green-400" />
              </div>
            </div>
            
            <div class="bg-dark-800 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-dark-400 text-sm">Encryption Version</p>
                  <p class="text-2xl font-bold text-white">v{secretsStatus.encryptionKeyVersion}</p>
                </div>
                <Shield class="w-8 h-8 text-blue-400" />
              </div>
            </div>
            
            <div class="bg-dark-800 rounded-lg p-4">
              <div class="flex items-center justify-between">
                <div>
                  <p class="text-dark-400 text-sm">Last JWT Rotation</p>
                  <p class="text-sm text-white">{secretsStatus.lastJwtRotation ? formatDate(secretsStatus.lastJwtRotation) : 'Never'}</p>
                </div>
                <Clock class="w-8 h-8 text-amber-400" />
              </div>
            </div>
          </div>
        {/if}

        <!-- Quick Actions -->
        <div class="bg-dark-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4">Quick Actions</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              class="btn-secondary flex items-center justify-center"
              on:click={() => showRotateJWTModal = true}
            >
              <RefreshCw class="w-4 h-4 mr-2" />
              Rotate JWT Secret
            </button>
            
            <button
              class="btn-secondary flex items-center justify-center"
              on:click={() => showBackupCodesModal = true}
            >
              <Download class="w-4 h-4 mr-2" />
              Generate Backup Codes
            </button>
            
            <button
              class="btn-ghost text-amber-400 hover:text-amber-300 flex items-center justify-center"
              on:click={() => showRotateEncryptionModal = true}
            >
              <Zap class="w-4 h-4 mr-2" />
              Rotate Encryption Key
            </button>
          </div>
        </div>
      </div>
    {/if}

    <!-- API Keys Tab -->
    {#if activeTab === 'api-keys'}
      <div class="space-y-6">
        <div class="bg-dark-800 rounded-lg p-6">
          <div class="flex items-center justify-between mb-6">
            <h3 class="text-lg font-semibold text-white">API Keys ({apiKeys.length})</h3>
            <button
              class="btn-primary"
              on:click={() => showCreateAPIKeyModal = true}
            >
              <Plus class="w-4 h-4 mr-2" />
              Create New Key
            </button>
          </div>
          
          {#if apiKeys.length === 0}
            <div class="text-center py-8">
              <Key class="w-12 h-12 text-dark-600 mx-auto mb-4" />
              <p class="text-dark-400">No API keys created yet</p>
              <p class="text-sm text-dark-500 mt-2">Create your first API key to get started</p>
            </div>
          {:else}
            <div class="space-y-4">
              {#each apiKeys as key}
                <div class="bg-dark-700 rounded-lg p-4 border border-dark-600">
                  <div class="flex items-center justify-between">
                    <div class="flex-1">
                      <div class="flex items-center space-x-3">
                        <h4 class="text-white font-medium">{key.name}</h4>
                        <span class="text-xs px-2 py-1 rounded-full {key.isActive ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}">
                          {key.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                      <div class="flex items-center space-x-4 mt-2 text-sm text-dark-400">
                        <span>Created: {formatDate(key.createdAt)}</span>
                        {#if key.lastUsed}
                          <span>Last used: {formatDate(key.lastUsed)}</span>
                        {:else}
                          <span>Never used</span>
                        {/if}
                      </div>
                      <div class="mt-2">
                        <span class="text-xs text-dark-500">Permissions:</span>
                        <div class="flex flex-wrap gap-1 mt-1">
                          {#each key.permissions as permission}
                            <span class="text-xs px-2 py-1 bg-primary-900 text-primary-300 rounded">
                              {permission}
                            </span>
                          {/each}
                        </div>
                      </div>
                    </div>
                    
                    <div class="flex items-center space-x-2">
                      <button
                        class="btn-ghost text-red-400 hover:text-red-300 p-2"
                        on:click={() => {
                          keyToDelete = key;
                          showDeleteConfirmModal = true;
                        }}
                        title="Delete API Key"
                      >
                        <Trash2 class="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    {/if}

    <!-- Security Tab -->
    {#if activeTab === 'security'}
      <div class="space-y-6">
        <!-- JWT Secret Management -->
        <div class="bg-dark-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
            <Lock class="w-5 h-5 mr-2" />
            JWT Secret Management
          </h3>
          <p class="text-dark-400 mb-4">
            Rotating the JWT secret will invalidate all existing user sessions and require users to log in again.
          </p>
          <button
            class="btn-secondary"
            on:click={() => showRotateJWTModal = true}
          >
            <RefreshCw class="w-4 h-4 mr-2" />
            Rotate JWT Secret
          </button>
        </div>

        <!-- Encryption Key Management -->
        <div class="bg-dark-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
            <Shield class="w-5 h-5 mr-2" />
            Encryption Key Management
          </h3>
          <div class="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-4">
            <div class="flex items-center">
              <AlertTriangle class="w-5 h-5 text-amber-400 mr-2" />
              <span class="text-amber-400 font-medium">Warning:</span>
            </div>
            <p class="text-amber-300 mt-2">
              Rotating the encryption key will invalidate all stored encrypted secrets and cannot be undone.
              Ensure you have backups before proceeding.
            </p>
          </div>
          <button
            class="btn-ghost text-amber-400 hover:text-amber-300"
            on:click={() => showRotateEncryptionModal = true}
          >
            <Zap class="w-4 h-4 mr-2" />
            Rotate Encryption Key
          </button>
        </div>

        <!-- Backup Codes -->
        <div class="bg-dark-800 rounded-lg p-6">
          <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
            <Download class="w-5 h-5 mr-2" />
            Backup Codes
          </h3>
          <p class="text-dark-400 mb-4">
            Generate backup codes for emergency access to the system in case of authentication issues.
          </p>
          <button
            class="btn-secondary"
            on:click={() => showBackupCodesModal = true}
          >
            <Download class="w-4 h-4 mr-2" />
            Generate Backup Codes
          </button>
        </div>
      </div>
    {/if}
  </div>
{/if}

<!-- Create API Key Modal -->
{#if showCreateAPIKeyModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Create API Key</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Key Name</label>
            <input
              type="text"
              bind:value={newAPIKeyName}
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
              placeholder="My API Key"
            />
          </div>
          
          <div>
            <div class="flex items-center justify-between mb-2">
              <label class="block text-sm font-medium text-dark-300">Permissions</label>
              <button
                class="text-xs text-primary-400 hover:text-primary-300"
                on:click={() => showPermissionsHelp = !showPermissionsHelp}
              >
                {showPermissionsHelp ? 'Hide' : 'Show'} Help
              </button>
            </div>
            
            {#if showPermissionsHelp}
              <div class="bg-dark-700 rounded p-3 mb-3 text-xs text-dark-300">
                <p class="mb-2"><strong>Permission Levels:</strong></p>
                <ul class="space-y-1">
                  <li><strong>read:</strong> View all resources</li>
                  <li><strong>write:</strong> Create and modify resources</li>
                  <li><strong>delete:</strong> Delete resources</li>
                  <li><strong>admin:</strong> Full administrative access</li>
                </ul>
                <p class="mt-2"><strong>Specific permissions</strong> allow granular control over individual resource types.</p>
              </div>
            {/if}
            
            <div class="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {#each availablePermissions as permission}
                <label class="flex items-center">
                  <input
                    type="checkbox"
                    bind:group={newAPIKeyPermissions}
                    value={permission.id}
                    class="mr-2"
                  />
                  <div>
                    <span class="text-white text-sm">{permission.name}</span>
                    <span class="text-dark-400 text-xs block">{permission.description}</span>
                  </div>
                </label>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            class="btn-ghost"
            on:click={() => {
              showCreateAPIKeyModal = false;
              newAPIKeyName = '';
              newAPIKeyPermissions = [];
            }}
          >
            Cancel
          </button>
          <button
            class="btn-primary"
            on:click={createAPIKey}
            disabled={!newAPIKeyName.trim() || newAPIKeyPermissions.length === 0}
          >
            Create Key
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- New API Key Display Modal -->
{#if showNewAPIKeyModal && newAPIKeyData}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-lg w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4 flex items-center">
          <CheckCircle class="w-5 h-5 text-green-400 mr-2" />
          API Key Created
        </h3>
        
        <div class="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-4">
          <div class="flex items-center mb-2">
            <AlertTriangle class="w-4 h-4 text-amber-400 mr-2" />
            <span class="text-amber-400 font-medium">Important:</span>
          </div>
          <p class="text-amber-300 text-sm">
            This is the only time you'll see the full API key. Save it securely now.
          </p>
        </div>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Key Name</label>
            <p class="text-white">{newAPIKeyData.name}</p>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">API Key</label>
            <div class="flex items-center space-x-2">
              <code class="flex-1 bg-dark-700 rounded px-3 py-2 text-green-400 font-mono text-sm break-all">
                {newAPIKeyData.apiKey}
              </code>
              <button
                class="btn-ghost p-2"
                on:click={() => copyToClipboard(newAPIKeyData.apiKey, 'API key')}
                title="Copy to clipboard"
              >
                <Copy class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Permissions</label>
            <div class="flex flex-wrap gap-1">
              {#each newAPIKeyData.permissions as permission}
                <span class="text-xs px-2 py-1 bg-primary-900 text-primary-300 rounded">
                  {permission}
                </span>
              {/each}
            </div>
          </div>
        </div>
        
        <div class="flex justify-end mt-6">
          <button
            class="btn-primary"
            on:click={() => {
              showNewAPIKeyModal = false;
              newAPIKeyData = null;
            }}
          >
            I've Saved the Key
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Rotate JWT Modal -->
{#if showRotateJWTModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Rotate JWT Secret</h3>
        
        <div class="bg-amber-900/20 border border-amber-800 rounded-lg p-4 mb-4">
          <div class="flex items-center mb-2">
            <AlertTriangle class="w-4 h-4 text-amber-400 mr-2" />
            <span class="text-amber-400 font-medium">Warning:</span>
          </div>
          <p class="text-amber-300 text-sm">
            This will invalidate all existing user sessions. All users will need to log in again.
          </p>
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            class="btn-ghost"
            on:click={() => showRotateJWTModal = false}
          >
            Cancel
          </button>
          <button
            class="btn-primary bg-amber-600 hover:bg-amber-700"
            on:click={rotateJWTSecret}
          >
            Rotate Secret
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Rotate Encryption Key Modal -->
{#if showRotateEncryptionModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Rotate Encryption Key</h3>
        
        <div class="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
          <div class="flex items-center mb-2">
            <AlertTriangle class="w-4 h-4 text-red-400 mr-2" />
            <span class="text-red-400 font-medium">Danger:</span>
          </div>
          <p class="text-red-300 text-sm">
            This will invalidate ALL stored encrypted secrets and CANNOT be undone.
            Ensure you have backups before proceeding.
          </p>
        </div>
        
        <div class="mb-4">
          <label class="block text-sm font-medium text-dark-300 mb-2">
            Type the following to confirm:
          </label>
          <p class="text-xs text-dark-400 mb-2 font-mono">
            I understand this will invalidate all stored secrets
          </p>
          <input
            type="text"
            bind:value={encryptionConfirmation}
            class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
            placeholder="Type confirmation phrase..."
          />
        </div>
        
        <div class="flex justify-end space-x-3">
          <button
            class="btn-ghost"
            on:click={() => {
              showRotateEncryptionModal = false;
              encryptionConfirmation = '';
            }}
          >
            Cancel
          </button>
          <button
            class="btn-primary bg-red-600 hover:bg-red-700"
            on:click={rotateEncryptionKey}
            disabled={encryptionConfirmation !== 'I understand this will invalidate all stored secrets'}
          >
            Rotate Key
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Generate Backup Codes Modal -->
{#if showBackupCodesModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Generate Backup Codes</h3>
        
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Number of Codes</label>
            <input
              type="number"
              bind:value={backupCodeCount}
              min="5"
              max="20"
              class="w-full bg-dark-700 border border-dark-600 rounded-lg px-3 py-2 text-white"
            />
          </div>
          
          {#if generatedBackupCodes.length > 0}
            <div>
              <div class="flex items-center justify-between mb-2">
                <label class="block text-sm font-medium text-dark-300">Generated Codes</label>
                <button
                  class="btn-ghost text-sm"
                  on:click={downloadBackupCodes}
                >
                  <Download class="w-4 h-4 mr-1" />
                  Download
                </button>
              </div>
              <div class="bg-dark-700 rounded p-3 max-h-40 overflow-y-auto">
                {#each generatedBackupCodes as code, index}
                  <div class="flex items-center justify-between py-1">
                    <code class="text-green-400 font-mono text-sm">{code}</code>
                    <button
                      class="btn-ghost p-1"
                      on:click={() => copyToClipboard(code, `Backup code ${index + 1}`)}
                      title="Copy code"
                    >
                      <Copy class="w-3 h-3" />
                    </button>
                  </div>
                {/each}
              </div>
            </div>
          {/if}
        </div>
        
        <div class="flex justify-end space-x-3 mt-6">
          <button
            class="btn-ghost"
            on:click={() => {
              showBackupCodesModal = false;
              generatedBackupCodes = [];
            }}
          >
            Close
          </button>
          {#if generatedBackupCodes.length === 0}
            <button
              class="btn-primary"
              on:click={generateBackupCodes}
            >
              Generate Codes
            </button>
          {/if}
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Delete Confirmation Modal -->
{#if showDeleteConfirmModal && keyToDelete}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-800 rounded-lg max-w-md w-full">
      <div class="p-6">
        <h3 class="text-lg font-semibold text-white mb-4">Delete API Key</h3>
        
        <p class="text-dark-300 mb-4">
          Are you sure you want to delete the API key "<strong>{keyToDelete.name}</strong>"? 
          This action cannot be undone and will immediately revoke access for any applications using this key.
        </p>
        
        <div class="flex justify-end space-x-3">
          <button
            class="btn-ghost"
            on:click={() => {
              showDeleteConfirmModal = false;
              keyToDelete = null;
            }}
          >
            Cancel
          </button>
          <button
            class="btn-primary bg-red-600 hover:bg-red-700"
            on:click={() => deleteAPIKey(keyToDelete.keyId)}
          >
            Delete Key
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}