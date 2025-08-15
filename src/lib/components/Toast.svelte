<script lang="ts">
  import { fly } from 'svelte/transition';
  import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-svelte';
  import type { Toast } from '$lib/stores/toast';
  import { toastStore } from '$lib/stores/toast';

  export let toast: Toast;

  function getIcon(type: Toast['type']) {
    switch (type) {
      case 'success': return CheckCircle;
      case 'error': return XCircle;
      case 'warning': return AlertTriangle;
      case 'info': return Info;
    }
  }

  function getColorClasses(type: Toast['type']) {
    switch (type) {
      case 'success': return 'bg-green-800 border-green-600 text-green-100';
      case 'error': return 'bg-red-800 border-red-600 text-red-100';
      case 'warning': return 'bg-yellow-800 border-yellow-600 text-yellow-100';
      case 'info': return 'bg-blue-800 border-blue-600 text-blue-100';
    }
  }

  function getIconColorClass(type: Toast['type']) {
    switch (type) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
    }
  }
</script>

<div
  class="flex items-start p-4 border rounded-lg shadow-lg backdrop-blur-sm max-w-md {getColorClasses(toast.type)}"
  transition:fly={{ x: 300, duration: 300 }}
>
  <svelte:component
    this={getIcon(toast.type)}
    class="w-5 h-5 mr-3 mt-0.5 flex-shrink-0 {getIconColorClass(toast.type)}"
  />
  
  <div class="flex-1 min-w-0">
    <div class="font-semibold">{toast.title}</div>
    {#if toast.message}
      <div class="text-sm opacity-90 mt-1">{toast.message}</div>
    {/if}
    
    {#if toast.action}
      <button
        class="text-sm underline hover:no-underline mt-2 opacity-90 hover:opacity-100"
        on:click={toast.action.onClick}
      >
        {toast.action.label}
      </button>
    {/if}
  </div>

  <button
    class="ml-3 opacity-70 hover:opacity-100 transition-opacity"
    on:click={() => toastStore.removeToast(toast.id)}
    aria-label="Close notification"
  >
    <X class="w-4 h-4" />
  </button>
</div>