<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { cursors, activeUsers } from '$lib/stores/collaboration.js';
  import { Cursor } from 'lucide-svelte';

  let container: HTMLElement;
  let animationFrame: number;

  // Subscribe to cursor updates
  $: cursorList = Array.from($cursors.values()).filter(cursor => 
    cursor.userId !== $activeUsers.get(cursor.userId)?.id
  );

  function updateCursorPositions() {
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    
    cursorList.forEach(cursor => {
      const cursorElement = container.querySelector(`[data-cursor-id="${cursor.userId}"]`) as HTMLElement;
      if (cursorElement) {
        // Convert absolute coordinates to relative positions within the container
        const x = Math.max(0, Math.min(cursor.x - containerRect.left, containerRect.width - 20));
        const y = Math.max(0, Math.min(cursor.y - containerRect.top, containerRect.height - 20));
        
        cursorElement.style.transform = `translate(${x}px, ${y}px)`;
        cursorElement.style.opacity = '1';
      }
    });

    animationFrame = requestAnimationFrame(updateCursorPositions);
  }

  onMount(() => {
    if (container) {
      updateCursorPositions();
    }
  });

  onDestroy(() => {
    if (animationFrame) {
      cancelAnimationFrame(animationFrame);
    }
  });

  function getUserColor(cursor) {
    const user = $activeUsers.get(cursor.userId);
    return user?.color || '#3B82F6';
  }

  function getUserName(cursor) {
    const user = $activeUsers.get(cursor.userId);
    return user?.displayName || user?.username || 'Unknown User';
  }
</script>

<div 
  bind:this={container}
  class="live-cursors-container absolute inset-0 pointer-events-none z-40 overflow-hidden"
>
  {#each cursorList as cursor (cursor.userId)}
    <div
      class="live-cursor absolute transition-opacity duration-200"
      data-cursor-id={cursor.userId}
      style="color: {getUserColor(cursor)}; opacity: 0;"
    >
      <!-- Cursor Icon -->
      <div class="relative">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="currentColor"
          class="cursor-icon drop-shadow-sm"
        >
          <path d="M5.5 2L20.5 9L13 11.5L10.5 19L5.5 2Z" />
        </svg>
        
        <!-- User Label -->
        <div 
          class="absolute top-5 left-2 whitespace-nowrap px-2 py-1 text-xs font-medium text-white rounded shadow-lg pointer-events-none"
          style="background-color: {getUserColor(cursor)};"
        >
          {getUserName(cursor)}
        </div>
      </div>
      
      <!-- Cursor Trail Effect -->
      <div 
        class="absolute w-4 h-4 rounded-full opacity-30 animate-ping"
        style="background-color: {getUserColor(cursor)}; top: 2px; left: 2px;"
      ></div>
    </div>
  {/each}
</div>

<style>
  .live-cursors-container {
    /* Ensure cursors don't interfere with user interactions */
    pointer-events: none;
  }

  .live-cursor {
    /* Smooth cursor movement */
    transition: transform 0.1s ease-out;
    will-change: transform;
  }

  .cursor-icon {
    filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
  }

  /* Fade in animation for new cursors */
  .live-cursor {
    animation: fadeIn 0.3s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  /* Pulse animation for active cursors */
  .live-cursor:hover .cursor-icon {
    animation: pulse 1s infinite;
  }

  @keyframes pulse {
    0%, 100% {
      transform: scale(1);
    }
    50% {
      transform: scale(1.1);
    }
  }
</style>