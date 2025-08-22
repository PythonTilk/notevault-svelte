<script lang="ts">
  import { onMount } from 'svelte';
  import { authStore, currentUser } from '$lib/stores/auth';
  import { api } from '$lib/api';
  import { User, Mail, Lock, Bell, Palette, Shield, Download, Trash2, Save } from 'lucide-svelte';

  let displayName = '';
  let email = '';
  let currentPassword = '';
  let newPassword = '';
  let confirmPassword = '';
  let avatar = '';
  
  let emailNotifications = true;
  let pushNotifications = true;
  let workspaceInvites = true;
  let chatMentions = true;
  
  let theme = 'dark';
  let language = 'en';
  
  let isLoading = false;
  let isSaving = false;
  let message = '';
  let messageType: 'success' | 'error' = 'success';

  onMount(async () => {
    const unsubscribe = currentUser.subscribe(user => {
      if (user) {
        displayName = user.displayName;
        email = user.email;
        avatar = user.avatar || '';
      }
    });

    // Load all settings from backend
    await loadSettings();

    return unsubscribe;
  });

  async function loadSettings() {
    isLoading = true;
    try {
      // Load user profile (including preferences and notification settings)
      const userResponse = await api.getCurrentUser();
      if (userResponse) {
        // Load notification settings
        emailNotifications = userResponse.emailNotifications ?? true;
        pushNotifications = userResponse.pushNotifications ?? true; 
        workspaceInvites = userResponse.workspaceInvites ?? true;
        chatMentions = userResponse.chatMentions ?? true;
        
        // Load preferences
        theme = userResponse.theme || 'dark';
        language = userResponse.language || 'en';
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
      showMessage('Failed to load settings', 'error');
    } finally {
      isLoading = false;
    }
  }

  async function updateProfile() {
    if (!displayName.trim()) {
      showMessage('Display name is required', 'error');
      return;
    }

    isSaving = true;
    message = '';

    try {
      const result = await authStore.updateProfile({
        displayName: displayName.trim(),
        avatar: avatar.trim() || undefined
      });

      if (result.success) {
        showMessage('Profile updated successfully', 'success');
      } else {
        showMessage(result.error || 'Failed to update profile', 'error');
      }
    } catch (error) {
      showMessage('Failed to update profile', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('Please fill in all password fields', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage('New passwords do not match', 'error');
      return;
    }

    if (newPassword.length < 6) {
      showMessage('New password must be at least 6 characters long', 'error');
      return;
    }

    isSaving = true;
    message = '';

    try {
      await api.changePassword(currentPassword, newPassword);
      
      currentPassword = '';
      newPassword = '';
      confirmPassword = '';
      
      showMessage('Password changed successfully', 'success');
    } catch (error: any) {
      showMessage(error.message || 'Failed to change password', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function saveNotificationSettings() {
    if (isSaving) return;
    
    isSaving = true;
    message = '';

    try {
      const result = await api.updateNotificationSettings({
        emailNotifications,
        pushNotifications,
        workspaceInvites,
        chatMentions
      });
      
      if (result?.success) {
        showMessage('Notification settings saved successfully', 'success');
      } else {
        showMessage(result?.message || 'Notification settings saved', 'success');
      }
    } catch (error: any) {
      console.error('Failed to save notification settings:', error);
      showMessage(error.message || 'Failed to save notification settings', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function savePreferences() {
    if (isSaving) return;
    
    isSaving = true;
    message = '';

    try {
      const result = await api.updatePreferences({ theme, language });
      
      if (result?.success) {
        showMessage('Preferences saved successfully', 'success');
        
        // Apply theme change immediately if needed
        if (theme !== 'auto') {
          document.documentElement.setAttribute('data-theme', theme);
        }
      } else {
        showMessage(result?.message || 'Preferences saved', 'success');
      }
    } catch (error: any) {
      console.error('Failed to save preferences:', error);
      showMessage(error.message || 'Failed to save preferences', 'error');
    } finally {
      isSaving = false;
    }
  }

  async function exportData() {
    try {
      const data = await api.exportUserData();
      
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `notevault-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('Data exported successfully', 'success');
    } catch (error: any) {
      showMessage(error.message || 'Failed to export data', 'error');
    }
  }

  async function deleteAccount() {
    if (!confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      return;
    }

    const confirmation = prompt('Type "DELETE" to confirm account deletion:');
    if (confirmation !== 'DELETE') {
      return;
    }

    try {
      await api.deleteAccount();
      
      // Redirect to login after successful deletion
      authStore.logout();
      window.location.href = '/login';
    } catch (error: any) {
      showMessage(error.message || 'Failed to delete account', 'error');
    }
  }

  function showMessage(text: string, type: 'success' | 'error') {
    message = text;
    messageType = type;
    setTimeout(() => {
      message = '';
    }, 5000);
  }
</script>

<svelte:head>
  <title>Settings - NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-900 p-6">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-3xl font-bold text-white mb-2">Settings</h1>
      <p class="text-dark-400">Manage your account settings and preferences</p>
    </div>

    <!-- Message -->
    {#if message}
      <div class="mb-6 p-4 rounded-lg {messageType === 'success' ? 'bg-green-500/10 border border-green-500 text-green-400' : 'bg-red-500/10 border border-red-500 text-red-400'}">
        {message}
      </div>
    {/if}

    <div class="space-y-8">
      <!-- Profile Settings -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <User class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Profile</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label for="displayName" class="block text-sm font-medium text-dark-300 mb-2">
              Display Name
            </label>
            <input
              id="displayName"
              type="text"
              bind:value={displayName}
              class="input"
              placeholder="Enter your display name"
            />
          </div>

          <div>
            <label for="email" class="block text-sm font-medium text-dark-300 mb-2">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              bind:value={email}
              class="input"
              placeholder="Enter your email"
              disabled
            />
            <p class="text-xs text-dark-500 mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label for="avatar" class="block text-sm font-medium text-dark-300 mb-2">
              Avatar URL
            </label>
            <input
              id="avatar"
              type="url"
              bind:value={avatar}
              class="input"
              placeholder="Enter avatar URL"
            />
          </div>

          <button
            on:click={updateProfile}
            class="btn-primary"
            disabled={isSaving}
          >
            <Save class="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Profile'}
          </button>
        </div>
      </div>

      <!-- Password Settings -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Lock class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Change Password</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label for="currentPassword" class="block text-sm font-medium text-dark-300 mb-2">
              Current Password
            </label>
            <input
              id="currentPassword"
              type="password"
              bind:value={currentPassword}
              class="input"
              placeholder="Enter current password"
            />
          </div>

          <div>
            <label for="newPassword" class="block text-sm font-medium text-dark-300 mb-2">
              New Password
            </label>
            <input
              id="newPassword"
              type="password"
              bind:value={newPassword}
              class="input"
              placeholder="Enter new password"
            />
          </div>

          <div>
            <label for="confirmPassword" class="block text-sm font-medium text-dark-300 mb-2">
              Confirm New Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              bind:value={confirmPassword}
              class="input"
              placeholder="Confirm new password"
            />
          </div>

          <button
            on:click={changePassword}
            class="btn-primary"
            disabled={isSaving}
          >
            <Lock class="h-4 w-4 mr-2" />
            {isSaving ? 'Changing...' : 'Change Password'}
          </button>
        </div>
      </div>

      <!-- Notification Settings -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Bell class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Notifications</h2>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-medium">Email Notifications</h3>
              <p class="text-sm text-dark-400">Receive notifications via email</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={emailNotifications} class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-medium">Push Notifications</h3>
              <p class="text-sm text-dark-400">Receive push notifications in browser</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={pushNotifications} class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-medium">Workspace Invites</h3>
              <p class="text-sm text-dark-400">Get notified when invited to workspaces</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={workspaceInvites} class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-medium">Chat Mentions</h3>
              <p class="text-sm text-dark-400">Get notified when mentioned in chat</p>
            </div>
            <label class="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" bind:checked={chatMentions} class="sr-only peer" />
              <div class="w-11 h-6 bg-dark-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          <button
            on:click={saveNotificationSettings}
            class="btn-primary"
            disabled={isSaving}
          >
            <Save class="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Notifications'}
          </button>
        </div>
      </div>

      <!-- Preferences -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Palette class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Preferences</h2>
        </div>

        <div class="space-y-4">
          <div>
            <label for="theme" class="block text-sm font-medium text-dark-300 mb-2">
              Theme
            </label>
            <select id="theme" bind:value={theme} class="input">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="auto">Auto</option>
            </select>
          </div>

          <div>
            <label for="language" class="block text-sm font-medium text-dark-300 mb-2">
              Language
            </label>
            <select id="language" bind:value={language} class="input">
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>

          <button
            on:click={savePreferences}
            class="btn-primary"
            disabled={isSaving}
          >
            <Save class="h-4 w-4 mr-2" />
            {isSaving ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </div>

      <!-- Data & Privacy -->
      <div class="card p-6">
        <div class="flex items-center space-x-3 mb-6">
          <Shield class="h-6 w-6 text-primary-400" />
          <h2 class="text-xl font-semibold text-white">Data & Privacy</h2>
        </div>

        <div class="space-y-4">
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-white font-medium">Export Data</h3>
              <p class="text-sm text-dark-400">Download all your data in JSON format</p>
            </div>
            <button
              on:click={exportData}
              class="btn-secondary"
            >
              <Download class="h-4 w-4 mr-2" />
              Export
            </button>
          </div>

          <div class="border-t border-dark-700 pt-4">
            <div class="flex items-center justify-between">
              <div>
                <h3 class="text-red-400 font-medium">Delete Account</h3>
                <p class="text-sm text-dark-400">Permanently delete your account and all data</p>
              </div>
              <button
                on:click={deleteAccount}
                class="btn-danger"
              >
                <Trash2 class="h-4 w-4 mr-2" />
                Delete
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>