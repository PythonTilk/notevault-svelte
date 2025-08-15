<script lang="ts">
  export let title: string = 'Loading...';
  export let message: string = '';
</script>

<div class="flex items-center justify-center min-h-[50vh]">
  <div class="text-center">
    <!-- NoteVault logo/spinner -->
    <div class="relative mb-6">
      <div class="w-16 h-16 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center mx-auto">
        <span class="text-white font-bold text-xl">NV</span>
      </div>
      <div class="absolute inset-0 w-16 h-16 border-4 border-primary-200/20 border-t-primary-400 rounded-lg animate-spin mx-auto"></div>
    </div>
    
    <!-- Loading text -->
    <h3 class="text-lg font-semibold text-white mb-2">{title}</h3>
    {#if message}
      <p class="text-dark-400 text-sm">{message}</p>
    {/if}
    
    <!-- Animated progress bar -->
    <div class="w-48 h-1 bg-dark-800 rounded-full mx-auto mt-4 overflow-hidden">
      <div class="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full animate-pulse"></div>
    </div>
  </div>
</div>