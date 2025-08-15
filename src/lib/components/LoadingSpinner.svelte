<script lang="ts">
  export let size: 'sm' | 'md' | 'lg' = 'md';
  export let color: 'primary' | 'white' | 'dark' = 'primary';
  export let text: string = '';

  function getSizeClasses(size: string) {
    switch (size) {
      case 'sm': return 'w-4 h-4';
      case 'lg': return 'w-8 h-8';
      default: return 'w-6 h-6';
    }
  }

  function getColorClasses(color: string) {
    switch (color) {
      case 'white': return 'border-white/20 border-t-white';
      case 'dark': return 'border-dark-300/20 border-t-dark-300';
      default: return 'border-primary-200/20 border-t-primary-400';
    }
  }
</script>

<div class="flex items-center justify-center space-x-2">
  <div
    class="animate-spin rounded-full border-2 {getSizeClasses(size)} {getColorClasses(color)}"
  ></div>
  {#if text}
    <span class="text-sm {color === 'white' ? 'text-white' : color === 'dark' ? 'text-dark-400' : 'text-primary-600'}">
      {text}
    </span>
  {/if}
</div>