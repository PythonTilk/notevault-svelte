<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import { microInteractions } from '$lib/utils/animations.js';

  const dispatch = createEventDispatcher();

  export let variant = 'primary'; // 'primary', 'secondary', 'ghost', 'danger'
  export let size = 'medium'; // 'small', 'medium', 'large'
  export let disabled = false;
  export let loading = false;
  export let ripple = true;
  export let pulse = false;
  export let icon = null;
  export let href = null;
  export let type = 'button';

  let buttonElement;
  let pulseCleanup;

  const sizeClasses = {
    small: 'px-3 py-1.5 text-sm',
    medium: 'px-4 py-2 text-base',
    large: 'px-6 py-3 text-lg'
  };

  const variantClasses = {
    primary: 'bg-primary-600 hover:bg-primary-700 text-white',
    secondary: 'bg-gray-600 hover:bg-gray-700 text-white',
    ghost: 'hover:bg-gray-100 text-gray-700 border border-gray-300',
    danger: 'bg-red-600 hover:bg-red-700 text-white'
  };

  function handleClick(event) {
    if (disabled || loading) {
      event.preventDefault();
      return;
    }

    // Button press micro-interaction
    microInteractions.buttonPress(buttonElement);

    // Ripple effect
    if (ripple && buttonElement) {
      microInteractions.ripple(buttonElement, event);
    }

    dispatch('click', event);
  }

  function handleMouseDown() {
    if (disabled || loading) return;
    microInteractions.buttonPress(buttonElement);
  }

  onMount(() => {
    if (pulse && buttonElement) {
      pulseCleanup = microInteractions.pulse(buttonElement);
    }

    return () => {
      if (pulseCleanup) {
        pulseCleanup();
      }
    };
  });

  $: classes = `
    inline-flex items-center justify-center gap-2 font-medium rounded-lg
    transition-all duration-200 ease-in-out
    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500
    transform hover:scale-105 active:scale-95
    ${sizeClasses[size]}
    ${variantClasses[variant]}
    ${disabled || loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${loading ? 'pointer-events-none' : ''}
    relative overflow-hidden
  `.trim().replace(/\s+/g, ' ');
</script>

{#if href && !disabled && !loading}
  <a
    bind:this={buttonElement}
    {href}
    class={classes}
    style="background-color: var(--color-{variant === 'primary' ? 'primary' : variant === 'danger' ? 'error' : 'surface'}); color: var(--color-text);"
    on:click={handleClick}
    on:mousedown={handleMouseDown}
    role="button"
    tabindex="0"
  >
    {#if loading}
      <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
    {:else if icon}
      <svelte:component this={icon} class="w-4 h-4" />
    {/if}

    <slot />
  </a>
{:else}
  <button
    bind:this={buttonElement}
    {type}
    {disabled}
    class={classes}
    style="background-color: var(--color-{variant === 'primary' ? 'primary' : variant === 'danger' ? 'error' : 'surface'}); color: var(--color-text);"
    on:click={handleClick}
    on:mousedown={handleMouseDown}
  >
    {#if loading}
      <div class="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full"></div>
    {:else if icon}
      <svelte:component this={icon} class="w-4 h-4" />
    {/if}

    <slot />
  </button>
{/if}

<style>
  /* Enhanced focus styles */
  button:focus,
  a:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* Ripple effect positioning */
  button,
  a {
    position: relative;
    overflow: hidden;
  }

  /* Loading animation */
  .animate-spin {
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  /* Hover effects */
  button:hover:not(:disabled),
  a:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.12);
  }

  button:active:not(:disabled),
  a:active {
    transform: translateY(0);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.12);
  }

  /* Pulse effect for notifications */
  .pulse {
    animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }

  @keyframes pulse {
    0%, 100% {
      opacity: 1;
    }
    50% {
      opacity: .5;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    button,
    a {
      transition: none;
      transform: none !important;
    }

    button:hover:not(:disabled),
    a:hover {
      transform: none;
    }

    .animate-spin {
      animation: none;
    }
  }
</style>