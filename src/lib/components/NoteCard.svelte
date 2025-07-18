<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { Code, FileText, Palette, Calendar } from 'lucide-svelte';
  import type { Note } from '$lib/types';

  export let note: Note;
  export let isDragging = false;

  const dispatch = createEventDispatcher<{
    dragstart: { note: Note };
    dragend: { note: Note };
    click: { note: Note };
  }>();

  function getTypeIcon(type: string) {
    switch (type) {
      case 'code':
        return Code;
      case 'rich':
        return Palette;
      default:
        return FileText;
    }
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function handleDragStart(event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', note.id);
    }
    dispatch('dragstart', { note });
  }

  function handleDragEnd() {
    dispatch('dragend', { note });
  }

  function handleClick() {
    dispatch('click', { note });
  }
</script>

<div
  class="absolute cursor-move bg-dark-800 border border-dark-700 rounded-lg shadow-lg transition-all duration-200 hover:shadow-xl hover:scale-105 {isDragging ? 'opacity-50 rotate-2' : ''}"
  style="left: {note.position?.x || 0}px; top: {note.position?.y || 0}px; width: {note.size?.width || 300}px; height: {note.size?.height || 200}px; border-left: 4px solid {note.color};"
  draggable="true"
  on:dragstart={handleDragStart}
  on:dragend={handleDragEnd}
  on:click={handleClick}
  on:keydown={(e) => e.key === 'Enter' && handleClick()}
  role="button"
  tabindex="0"
>
  <!-- Header -->
  <div class="flex items-center justify-between p-3 border-b border-dark-700">
    <div class="flex items-center space-x-2 min-w-0 flex-1">
      <svelte:component this={getTypeIcon(note.type)} class="w-4 h-4 text-dark-400 flex-shrink-0" />
      <h3 class="text-sm font-medium text-white truncate">
        {note.title}
      </h3>
    </div>
    <div class="flex items-center space-x-1 text-xs text-dark-400">
      <Calendar class="w-3 h-3" />
      <span>{formatDate(note.updatedAt)}</span>
    </div>
  </div>

  <!-- Content -->
  <div class="p-3 h-full overflow-hidden">
    <div class="text-sm text-dark-300 line-clamp-6 h-full">
      {#if note.type === 'rich'}
        <div class="prose prose-sm prose-invert max-w-none">
          {@html note.content.replace(/\n/g, '<br>')}
        </div>
      {:else if note.type === 'code'}
        <pre class="text-xs font-mono text-green-400 whitespace-pre-wrap overflow-hidden">{note.content}</pre>
      {:else}
        <p class="whitespace-pre-wrap overflow-hidden">{note.content}</p>
      {/if}
    </div>
  </div>

  <!-- Footer -->
  <div class="absolute bottom-0 left-0 right-0 p-3 bg-dark-900/50 backdrop-blur-sm rounded-b-lg">
    <div class="flex items-center justify-between">
      <!-- Tags -->
      <div class="flex items-center space-x-1 flex-1 min-w-0">
        {#each note.tags.slice(0, 2) as tag}
          <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-dark-700 text-dark-300">
            #{tag}
          </span>
        {/each}
        {#if note.tags.length > 2}
          <span class="text-xs text-dark-400">+{note.tags.length - 2}</span>
        {/if}
      </div>

      <!-- Visibility -->
      <div class="flex items-center space-x-1 text-xs text-dark-400">
        {#if note.isPublic}
          <span class="text-green-400">Public</span>
        {:else}
          <span class="text-yellow-400">Private</span>
        {/if}
      </div>
    </div>
  </div>
</div>

<style>
  .line-clamp-6 {
    display: -webkit-box;
    -webkit-line-clamp: 6;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>