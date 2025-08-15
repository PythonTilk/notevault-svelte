<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { cursors, selections, getUserById } from '$lib/stores/collaboration';
  import { MousePointer2, User } from 'lucide-svelte';

  export let containerId: string = '';
  export let showUserNames: boolean = true;
  export let showSelections: boolean = true;

  let containerElement: HTMLElement | null = null;
  let mounted = false;

  // Reactive values
  $: cursorPositions = Array.from($cursors.values());
  $: textSelections = Array.from($selections.values());

  onMount(() => {
    mounted = true;
    
    if (containerId) {
      containerElement = document.getElementById(containerId);
    } else {
      containerElement = document.body;
    }
  });

  onDestroy(() => {
    mounted = false;
    containerElement = null;
  });

  function getCursorStyle(cursor: any): string {
    const user = getUserById(cursor.userId);
    const color = user?.color || '#3B82F6';
    
    return `
      position: absolute;
      left: ${cursor.x}px;
      top: ${cursor.y}px;
      pointer-events: none;
      z-index: 9999;
      color: ${color};
      transition: all 0.1s ease-out;
    `;
  }

  function getSelectionStyle(selection: any): string {
    const user = getUserById(selection.userId);
    const color = user?.color || '#3B82F6';
    
    // Convert color to rgba for background
    const rgbaColor = hexToRgba(color, 0.3);
    
    return `
      background-color: ${rgbaColor};
      position: absolute;
      pointer-events: none;
      z-index: 9998;
      border-radius: 2px;
    `;
  }

  function hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  function isRecentCursor(cursor: any): boolean {
    // Hide cursors that are older than 10 seconds
    return Date.now() - cursor.timestamp < 10000;
  }

  function isRecentSelection(selection: any): boolean {
    // Hide selections that are older than 30 seconds
    return Date.now() - selection.timestamp < 30000;
  }

  function getElementPosition(elementId: string): { x: number; y: number } | null {
    if (!mounted || !containerElement) return null;
    
    const element = containerElement.querySelector(`[data-element-id="${elementId}"]`);
    if (!element) return null;
    
    const rect = element.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    return {
      x: rect.left - containerRect.left,
      y: rect.top - containerRect.top
    };
  }

  function calculateSelectionBounds(selection: any): { x: number; y: number; width: number; height: number } | null {
    if (!mounted || !containerElement) return null;
    
    const element = containerElement.querySelector(`[data-element-id="${selection.element}"]`);
    if (!element) return null;
    
    // This is a simplified calculation - in a real implementation,
    // you'd need to calculate the actual text selection boundaries
    const rect = element.getBoundingClientRect();
    const containerRect = containerElement.getBoundingClientRect();
    
    // Estimate selection bounds based on character positions
    const elementText = element.textContent || '';
    const charWidth = rect.width / elementText.length;
    
    return {
      x: rect.left - containerRect.left + (selection.start * charWidth),
      y: rect.top - containerRect.top,
      width: Math.max(2, (selection.end - selection.start) * charWidth),
      height: rect.height
    };
  }
</script>

{#if mounted && containerElement}
  <!-- Live Cursors -->
  {#each cursorPositions as cursor (cursor.userId)}
    {#if isRecentCursor(cursor)}
      {@const user = getUserById(cursor.userId)}
      {@const elementPos = cursor.element ? getElementPosition(cursor.element) : null}
      {@const finalX = elementPos ? elementPos.x + cursor.x : cursor.x}
      {@const finalY = elementPos ? elementPos.y + cursor.y : cursor.y}
      
      <div
        class="live-cursor"
        style={getCursorStyle({ ...cursor, x: finalX, y: finalY })}
      >
        <!-- Cursor pointer -->
        <div class="cursor-pointer relative">
          <MousePointer2 class="w-5 h-5 drop-shadow-lg" />
          
          <!-- User label -->
          {#if showUserNames && user}
            <div class="cursor-label absolute top-6 left-2 whitespace-nowrap">
              <div 
                class="bg-current text-white text-xs px-2 py-1 rounded shadow-lg max-w-32 truncate"
                style="background-color: {user.color};"
              >
                {user.displayName || user.username}
              </div>
              <!-- Arrow pointing to cursor -->
              <div 
                class="absolute -top-1 left-2 w-0 h-0 border-l-2 border-r-2 border-b-2 border-transparent"
                style="border-bottom-color: {user.color};"
              ></div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  {/each}

  <!-- Text Selections -->
  {#if showSelections}
    {#each textSelections as selection (selection.userId + '-' + selection.element)}
      {#if isRecentSelection(selection)}
        {@const bounds = calculateSelectionBounds(selection)}
        {#if bounds}
          <div
            class="live-selection"
            style="{getSelectionStyle(selection)} left: {bounds.x}px; top: {bounds.y}px; width: {bounds.width}px; height: {bounds.height}px;"
          >
            <!-- Selection highlight -->
          </div>
        {/if}
      {/if}
    {/each}
  {/if}

  <!-- Cursor activity indicator -->
  {#if cursorPositions.length > 0}
    <div class="cursor-activity-indicator fixed top-4 right-4 z-50">
      <div class="bg-dark-800 border border-dark-600 rounded-lg px-3 py-2 shadow-lg">
        <div class="flex items-center space-x-2 text-sm text-white">
          <div class="flex -space-x-1">
            {#each cursorPositions.slice(0, 3) as cursor}
              {@const user = getUserById(cursor.userId)}
              {#if user && isRecentCursor(cursor)}
                <div 
                  class="w-4 h-4 rounded-full border border-white"
                  style="background-color: {user.color};"
                  title={user.displayName || user.username}
                ></div>
              {/if}
            {/each}
            {#if cursorPositions.length > 3}
              <div class="w-4 h-4 rounded-full bg-dark-600 border border-white flex items-center justify-center text-xs text-white">
                +{cursorPositions.length - 3}
              </div>
            {/if}
          </div>
          <span class="text-xs text-dark-300">
            {cursorPositions.length} cursor{cursorPositions.length !== 1 ? 's' : ''} active
          </span>
        </div>
      </div>
    </div>
  {/if}
{/if}

<style>
  .live-cursor {
    animation: cursorAppear 0.2s ease-out;
  }
  
  .cursor-pointer {
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }
  
  .cursor-label {
    animation: labelSlideIn 0.3s ease-out;
  }
  
  .live-selection {
    animation: selectionAppear 0.3s ease-out;
    mix-blend-mode: multiply;
  }
  
  .cursor-activity-indicator {
    animation: slideInFromRight 0.3s ease-out;
  }
  
  @keyframes cursorAppear {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }
  
  @keyframes labelSlideIn {
    from {
      opacity: 0;
      transform: translateY(-4px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes selectionAppear {
    from {
      opacity: 0;
    }
    to {
      opacity: 1;
    }
  }
  
  @keyframes slideInFromRight {
    from {
      opacity: 0;
      transform: translateX(20px);
    }
    to {
      opacity: 1;
      transform: translateX(0);
    }
  }
  
  /* Fade out old cursors */
  .live-cursor {
    opacity: 1;
    transition: opacity 2s ease-out;
  }
  
  /* Responsive cursor labels */
  @media (max-width: 640px) {
    .cursor-label {
      display: none;
    }
  }
</style>