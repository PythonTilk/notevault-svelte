<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { authStore, isAuthenticated, isLoading } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import Sidebar from '$lib/components/Sidebar.svelte';

  // Public routes that don't require authentication
  const publicRoutes = ['/login', '/register', '/forgot-password', '/reset-password'];

  onMount(() => {
    authStore.checkAuth();
  });

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
{:else}
  <!-- Public layout without sidebar -->
  <div class="min-h-screen bg-dark-950">
    <slot />
  </div>
{/if}