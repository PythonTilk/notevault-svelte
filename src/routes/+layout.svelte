<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { authStore, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';
  import CommandPalette from '$lib/components/CommandPalette.svelte';
  import ToastContainer from '$lib/components/ToastContainer.svelte';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];
  
  // Command Palette state
  let showCommandPalette = false;

  onMount(() => {
    authStore.checkAuth();
  });
  
  function handleCommandExecuted(event) {
    const { command } = event.detail;
    
    switch (command) {
      // Navigation commands
      case 'go-to-dashboard':
      case 'go-to-home':
        goto('/');
        break;
      case 'go-to-workspaces':
        goto('/');
        break;
      case 'go-to-chat':
        goto('/chat');
        break;
      case 'go-to-files':
        goto('/files');
        break;
      case 'go-to-calendar':
        goto('/calendar');
        break;
      case 'go-to-notifications':
        goto('/notifications');
        break;
      case 'go-to-admin':
        goto('/admin');
        break;
      
      // Action commands
      case 'new-workspace':
        goto('/?action=create-workspace');
        break;
      case 'new-note':
        goto('/?action=create-note');
        break;
      case 'upload-file':
        goto('/files?action=upload');
        break;
      case 'schedule-meeting':
        goto('/calendar?action=create-event');
        break;
        
      // Search commands
      case 'search-notes':
      case 'search-everything':
        goto('/search');
        break;
      case 'find-workspace':
        goto('/search?type=workspaces');
        break;
      case 'find-files':
        goto('/search?type=files');
        break;
      
      // Settings commands
      case 'open-settings':
        goto('/settings');
        break;
      case 'open-integrations':
        goto('/settings/integrations');
        break;
      case 'change-theme':
        goto('/settings?tab=appearance');
        break;
      case 'change-preferences':
        goto('/settings?tab=preferences');
        break;
        
      // UI commands
      case 'toggle-sidebar':
        // Dispatch custom event that Sidebar can listen to
        window.dispatchEvent(new CustomEvent('toggle-sidebar'));
        break;
      case 'toggle-right-panel':
        window.dispatchEvent(new CustomEvent('toggle-right-panel'));
        break;
      case 'focus-mode':
        window.dispatchEvent(new CustomEvent('toggle-focus-mode'));
        break;
        
      // Help commands
      case 'show-help':
        window.open('https://docs.notevault.com', '_blank');
        break;
      case 'show-shortcuts':
        goto('/settings?tab=shortcuts');
        break;
      case 'show-about':
        goto('/settings?tab=about');
        break;
        
      default:
        console.log('Command not implemented:', command);
    }
  }

  $: {
    if (!$isLoading && !$isAuthenticated && !publicRoutes.includes($page.url.pathname)) {
      goto('/login');
    }
  }
</script>

<svelte:head>
  <title>NoteVault - Collaborative Workspace Platform</title>
  <meta name="description" content="A modern collaborative workspace platform with canvas notes, real-time chat, and file management." />
</svelte:head>

{#if $isLoading}
  <!-- Loading screen -->
  <div class="min-h-screen bg-dark-950 flex items-center justify-center">
    <div class="text-center">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mb-4 mx-auto">
        <span class="text-white font-bold text-xl">NV</span>
      </div>
      <div class="animate-pulse">
        <div class="h-2 bg-dark-800 rounded-full w-32 mx-auto"></div>
      </div>
    </div>
  </div>
{:else if $isAuthenticated}
  <!-- Authenticated layout with sidebar -->
  <Sidebar>
    <slot />
  </Sidebar>
  
  <!-- Command Palette (only for authenticated users) -->
  <CommandPalette 
    bind:isOpen={showCommandPalette}
    on:execute={handleCommandExecuted}
    on:close={() => showCommandPalette = false}
  />
{:else}
  <!-- Public layout without sidebar -->
  <div class="min-h-screen bg-dark-950">
    <slot />
  </div>
{/if}

<!-- Global Toast Notifications -->
<ToastContainer />