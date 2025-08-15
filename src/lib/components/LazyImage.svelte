<script lang="ts">
  import { onMount } from 'svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';

  export let src: string;
  export let alt: string = '';
  export let placeholder: string = '';
  export let className: string = '';
  export let eager: boolean = false;

  let imageElement: HTMLImageElement;
  let loaded = false;
  let error = false;
  let observer: IntersectionObserver | null = null;
  let shouldLoad = eager;

  onMount(() => {
    if (!eager && 'IntersectionObserver' in window) {
      observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              shouldLoad = true;
              observer?.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.1 }
      );
      
      if (imageElement) {
        observer.observe(imageElement);
      }
    } else {
      shouldLoad = true;
    }

    return () => {
      if (observer) {
        observer.disconnect();
      }
    };
  });

  function handleLoad() {
    loaded = true;
    error = false;
  }

  function handleError() {
    error = true;
    loaded = false;
  }
</script>

<div class="relative {className}" bind:this={imageElement}>
  {#if shouldLoad}
    <img
      {src}
      {alt}
      class="transition-opacity duration-300 {loaded ? 'opacity-100' : 'opacity-0'} {className}"
      on:load={handleLoad}
      on:error={handleError}
      loading={eager ? 'eager' : 'lazy'}
    />
  {/if}
  
  {#if !loaded && !error && shouldLoad}
    <div class="absolute inset-0 flex items-center justify-center bg-dark-800 rounded">
      <LoadingSpinner size="sm" />
    </div>
  {/if}
  
  {#if !loaded && !shouldLoad && placeholder}
    <div class="w-full h-full bg-dark-800 rounded flex items-center justify-center">
      <span class="text-dark-400 text-sm">{placeholder}</span>
    </div>
  {/if}
  
  {#if error}
    <div class="w-full h-full bg-dark-800 rounded flex items-center justify-center">
      <span class="text-red-400 text-sm">Failed to load image</span>
    </div>
  {/if}
</div>