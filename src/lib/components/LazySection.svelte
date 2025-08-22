<script lang="ts">
  import { onMount } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let threshold: number = 0.1;
  export let rootMargin: string = '50px';
  export let once: boolean = true;
  export let placeholder: string = 'Loading content...';

  let sectionElement: HTMLElement;
  let isVisible = false;
  let hasBeenVisible = false;
  let observer: IntersectionObserver | null = null;

  onMount(() => {
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              isVisible = true;
              hasBeenVisible = true;
              
              if (once) {
                observer?.unobserve(entry.target);
              }
            } else if (!once) {
              isVisible = false;
            }
          });
        },
        { threshold, rootMargin }
      );
      
      if (sectionElement) {
        observer.observe(sectionElement);
      }
    } else {
      // Fallback for browsers without IntersectionObserver
      isVisible = true;
      hasBeenVisible = true;
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  $: shouldRender = isVisible || (once && hasBeenVisible);
</script>

<div bind:this={sectionElement}>
  {#if shouldRender}
    <slot />
  {:else}
    <div class="flex items-center justify-center py-8">
      <div class="text-center">
        <LoadingSpinner size="md" />
        <p class="text-dark-400 text-sm mt-2">{placeholder}</p>
      </div>
    </div>
  {/if}
</div>