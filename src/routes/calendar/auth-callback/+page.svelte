<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { CheckCircle, XCircle, Loader2 } from 'lucide-svelte';

  let status: 'loading' | 'success' | 'error' = 'loading';
  let message = 'Processing calendar connection...';
  let provider = '';

  onMount(() => {
    handleAuthCallback();
  });

  async function handleAuthCallback() {
    try {
      const urlParams = new URLSearchParams($page.url.search);
      const authCode = urlParams.get('code');
      const state = urlParams.get('state');
      const error = urlParams.get('error');
      const errorDescription = urlParams.get('error_description');

      // Parse provider from state parameter or URL
      provider = state || urlParams.get('provider') || 'calendar';

      if (error) {
        status = 'error';
        message = errorDescription || `Authorization failed: ${error}`;
        notifyParentWindow('calendar-auth-error', { error: message });
        return;
      }

      if (!authCode) {
        status = 'error';
        message = 'No authorization code received';
        notifyParentWindow('calendar-auth-error', { error: message });
        return;
      }

      // Send success message to parent window (popup opener)
      notifyParentWindow('calendar-auth-success', { authCode, provider });

      status = 'success';
      message = `Successfully connected to ${provider} calendar!`;

      // Close popup after a short delay
      setTimeout(() => {
        window.close();
      }, 2000);

    } catch (error) {
      console.error('Calendar auth callback error:', error);
      status = 'error';
      message = 'Failed to process calendar authorization';
      notifyParentWindow('calendar-auth-error', { 
        error: error instanceof Error ? error.message : 'Unknown error' 
      });
    }
  }

  function notifyParentWindow(type: string, data: any) {
    try {
      // Notify parent window (popup opener)
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage({
          type,
          ...data
        }, window.location.origin);
      }
    } catch (error) {
      console.error('Failed to notify parent window:', error);
    }
  }

  function handleRetry() {
    // Redirect back to calendar page
    goto('/calendar');
  }
</script>

<svelte:head>
  <title>Calendar Authorization - NoteVault</title>
</svelte:head>

<div class="min-h-screen bg-dark-900 flex items-center justify-center p-4">
  <div class="bg-dark-800 rounded-lg border border-dark-700 p-8 max-w-md w-full text-center">
    {#if status === 'loading'}
      <div class="flex flex-col items-center space-y-4">
        <Loader2 class="w-12 h-12 text-primary-400 animate-spin" />
        <h2 class="text-xl font-semibold text-white">Connecting Calendar</h2>
        <p class="text-dark-400">{message}</p>
      </div>
    {:else if status === 'success'}
      <div class="flex flex-col items-center space-y-4">
        <CheckCircle class="w-12 h-12 text-green-400" />
        <h2 class="text-xl font-semibold text-white">Connection Successful!</h2>
        <p class="text-dark-400">{message}</p>
        <p class="text-sm text-dark-500">This window will close automatically...</p>
      </div>
    {:else}
      <div class="flex flex-col items-center space-y-4">
        <XCircle class="w-12 h-12 text-red-400" />
        <h2 class="text-xl font-semibold text-white">Connection Failed</h2>
        <p class="text-dark-400 text-sm">{message}</p>
        <div class="flex space-x-3 pt-4">
          <button
            on:click={() => window.close()}
            class="btn-secondary"
          >
            Close
          </button>
          <button
            on:click={handleRetry}
            class="btn-primary"
          >
            Try Again
          </button>
        </div>
      </div>
    {/if}
  </div>
</div>

<style>
  /* Ensure this page looks good even in a popup */
  :global(body) {
    margin: 0;
    padding: 0;
  }
</style>