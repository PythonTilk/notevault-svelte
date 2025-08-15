<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { X, Calendar, ExternalLink } from 'lucide-svelte';
  import { api } from '$lib/api';

  export let isOpen: boolean = false;

  const dispatch = createEventDispatcher<{
    connected: { calendar: any };
    close: void;
  }>();

  let isConnecting = false;
  let error: string | null = null;

  const providers = [
    {
      id: 'google',
      name: 'Google Calendar',
      color: '#4285F4',
      description: 'Connect your Google Calendar to sync events'
    },
    {
      id: 'outlook',
      name: 'Microsoft Outlook',
      color: '#0078D4',
      description: 'Connect your Outlook calendar to sync events'
    }
  ];

  async function connectProvider(providerId: 'google' | 'outlook') {
    isConnecting = true;
    error = null;

    try {
      // Get the authorization URL
      const authData = await api.getCalendarAuthUrl(providerId, window.location.origin + '/calendar/auth-callback');
      
      if (authData.authUrl) {
        // Open the authorization URL in a popup
        const popup = window.open(
          authData.authUrl,
          'calendar-auth',
          'width=600,height=600,scrollbars=yes,resizable=yes'
        );

        if (!popup) {
          throw new Error('Popup blocked. Please allow popups for this site.');
        }

        // Listen for the auth callback
        const checkClosed = setInterval(() => {
          if (popup.closed) {
            clearInterval(checkClosed);
            isConnecting = false;
          }
        }, 1000);

        // Listen for auth success message from popup
        const handleMessage = async (event: MessageEvent) => {
          if (event.origin !== window.location.origin) return;
          
          if (event.data.type === 'calendar-auth-success') {
            clearInterval(checkClosed);
            popup.close();
            
            try {
              // Complete the connection with the auth code
              const calendar = await api.connectCalendar(providerId, event.data.authCode);
              dispatch('connected', { calendar });
              handleClose();
            } catch (error) {
              console.error('Failed to complete calendar connection:', error);
              setError('Failed to complete calendar connection. Please try again.');
            }
            
            isConnecting = false;
            window.removeEventListener('message', handleMessage);
          } else if (event.data.type === 'calendar-auth-error') {
            clearInterval(checkClosed);
            popup.close();
            setError(event.data.error || 'Authentication failed');
            isConnecting = false;
            window.removeEventListener('message', handleMessage);
          }
        };

        window.addEventListener('message', handleMessage);
      }
    } catch (error) {
      console.error('Failed to start calendar connection:', error);
      setError(error instanceof Error ? error.message : 'Failed to connect calendar');
      isConnecting = false;
    }
  }

  function setError(message: string) {
    error = message;
    setTimeout(() => {
      error = null;
    }, 5000);
  }

  function handleClose() {
    isOpen = false;
    isConnecting = false;
    error = null;
    dispatch('close');
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      handleClose();
    }
  }
</script>

{#if isOpen}
  <!-- Modal backdrop -->
  <!-- svelte-ignore a11y-click-events-have-key-events -->
  <!-- svelte-ignore a11y-no-static-element-interactions -->
  <div 
    class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
    on:click={handleClose}
  >
    <!-- Modal content -->
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div 
      class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md"
      on:click|stopPropagation
      on:keydown={handleKeydown}
      tabindex="-1"
    >
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between mb-6">
          <h2 class="text-xl font-semibold text-white flex items-center gap-2">
            <Calendar class="w-5 h-5" />
            Connect Calendar
          </h2>
          <button
            class="text-dark-400 hover:text-white transition-colors"
            on:click={handleClose}
            aria-label="Close modal"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Error message -->
        {#if error}
          <div class="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p class="text-red-400 text-sm">{error}</p>
          </div>
        {/if}

        <!-- Provider options -->
        <div class="space-y-3">
          {#each providers as provider}
            <button
              class="w-full flex items-center justify-between p-4 border border-dark-700 rounded-lg hover:border-dark-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              style="border-color: {provider.color}20"
              on:click={() => connectProvider(provider.id)}
              disabled={isConnecting}
            >
              <div class="flex items-center space-x-3">
                <div 
                  class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
                  style="background-color: {provider.color}"
                >
                  {provider.name.charAt(0)}
                </div>
                <div class="text-left">
                  <div class="font-medium text-white">{provider.name}</div>
                  <div class="text-sm text-dark-400">{provider.description}</div>
                </div>
              </div>
              <ExternalLink class="w-4 h-4 text-dark-400" />
            </button>
          {/each}
        </div>

        {#if isConnecting}
          <div class="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <p class="text-blue-400 text-sm text-center">
              Please complete the authentication in the popup window...
            </p>
          </div>
        {/if}

        <!-- Info text -->
        <div class="mt-6 text-xs text-dark-500 text-center">
          We'll only access your calendar events and basic profile information.
          You can disconnect at any time in your settings.
        </div>
      </div>
    </div>
  </div>
{/if}