<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Plus, Save, Palette, Type, Code, Settings, Users, Share } from 'lucide-svelte';
  import { workspaceNotes, workspaceStore, currentWorkspace } from '$lib/stores/workspaces';
  import DOMPurify from 'dompurify';
  import NoteCard from '$lib/components/NoteCard.svelte';
  import type { Note } from '$lib/types';

  let workspaceId: string;
  let canvasElement: HTMLDivElement;
  let showCreateModal = false;
  let showNoteModal = false;
  let selectedNote: Note | null = null;
  
  function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html.replace(/\n/g, '<br>'));
  }
  let draggedNote: Note | null = null;
  
  // New note form
  let newNoteTitle = '';
  let newNoteContent = '';
  let newNoteType: 'text' | 'rich' | 'code' = 'text';
  let newNoteColor = '#fbbf24';

  // Canvas state
  let canvasOffset = { x: 0, y: 0 };
  let canvasScale = 1;
  let isPanning = false;
  let lastPanPoint = { x: 0, y: 0 };

  $: workspaceId = $page.params.id;

  onMount(() => {
    if (workspaceId) {
      workspaceStore.loadWorkspaceNotes(workspaceId);
      // Mock current workspace
      currentWorkspace.set({
        id: workspaceId,
        name: 'Personal Projects',
        description: 'My personal workspace',
        color: '#ef4444',
        ownerId: '1',
        members: [{ userId: '1', role: 'owner', joinedAt: new Date() }],
        createdAt: new Date(),
        updatedAt: new Date(),
        isPublic: false
      });
    }
  });

  function handleCanvasMouseDown(event: MouseEvent) {
    if (event.target === canvasElement) {
      isPanning = true;
      lastPanPoint = { x: event.clientX, y: event.clientY };
      canvasElement.style.cursor = 'grabbing';
    }
  }

  function handleCanvasMouseMove(event: MouseEvent) {
    if (isPanning) {
      const deltaX = event.clientX - lastPanPoint.x;
      const deltaY = event.clientY - lastPanPoint.y;
      
      canvasOffset.x += deltaX;
      canvasOffset.y += deltaY;
      
      lastPanPoint = { x: event.clientX, y: event.clientY };
      updateCanvasTransform();
    }
  }

  function handleCanvasMouseUp() {
    isPanning = false;
    canvasElement.style.cursor = 'grab';
  }

  function handleCanvasWheel(event: WheelEvent) {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    canvasScale = Math.max(0.1, Math.min(3, canvasScale * delta));
    updateCanvasTransform();
  }

  function updateCanvasTransform() {
    if (canvasElement) {
      canvasElement.style.transform = `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasScale})`;
    }
  }

  function handleNoteDragStart(event: CustomEvent<{ note: Note }>) {
    draggedNote = event.detail.note;
  }

  function handleNoteDragEnd(event: CustomEvent<{ note: Note }>) {
    draggedNote = null;
  }

  function handleNoteClick(event: CustomEvent<{ note: Note }>) {
    selectedNote = event.detail.note;
    showNoteModal = true;
  }

  function handleCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (draggedNote) {
      const rect = canvasElement.getBoundingClientRect();
      const x = (event.clientX - rect.left - canvasOffset.x) / canvasScale;
      const y = (event.clientY - rect.top - canvasOffset.y) / canvasScale;
      
      workspaceStore.updateNote(draggedNote.id, {
        position: { x, y }
      });
    }
  }

  function handleCanvasDragOver(event: DragEvent) {
    event.preventDefault();
  }

  async function handleCreateNote() {
    if (!newNoteTitle.trim()) return;

    await workspaceStore.createNote(workspaceId, {
      title: newNoteTitle,
      content: newNoteContent,
      type: newNoteType,
      color: newNoteColor
    });

    showCreateModal = false;
    newNoteTitle = '';
    newNoteContent = '';
    newNoteType = 'text';
    newNoteColor = '#fbbf24';
  }

  function resetCanvas() {
    canvasOffset = { x: 0, y: 0 };
    canvasScale = 1;
    updateCanvasTransform();
  }

  function handleCanvasKeyDown(event: KeyboardEvent) {
    const step = 50;
    const zoomStep = 0.1;
    
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        canvasOffset.y += step;
        updateCanvasTransform();
        break;
      case 'ArrowDown':
        event.preventDefault();
        canvasOffset.y -= step;
        updateCanvasTransform();
        break;
      case 'ArrowLeft':
        event.preventDefault();
        canvasOffset.x += step;
        updateCanvasTransform();
        break;
      case 'ArrowRight':
        event.preventDefault();
        canvasOffset.x -= step;
        updateCanvasTransform();
        break;
      case '+':
      case '=':
        event.preventDefault();
        canvasScale = Math.min(3, canvasScale + zoomStep);
        updateCanvasTransform();
        break;
      case '-':
        event.preventDefault();
        canvasScale = Math.max(0.1, canvasScale - zoomStep);
        updateCanvasTransform();
        break;
      case '0':
        event.preventDefault();
        resetCanvas();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        showCreateModal = true;
        break;
    }
  }

  const noteColors = [
    '#fbbf24', '#ef4444', '#3b82f6', '#10b981', 
    '#8b5cf6', '#f59e0b', '#06b6d4', '#84cc16'
  ];
</script>

<svelte:head>
  <title>{$currentWorkspace?.name || 'Workspace'} - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      {#if $currentWorkspace}
        <div
          class="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
          style="background-color: {$currentWorkspace.color}"
        >
          {$currentWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <div>
          <h1 class="text-xl font-bold text-white">{$currentWorkspace.name}</h1>
          <p class="text-dark-400 text-sm">{$workspaceNotes.length} notes</p>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-3">
      <button
        class="btn-secondary"
        on:click={resetCanvas}
        title="Reset View"
      >
        Reset View
      </button>
      <button class="btn-ghost" aria-label="Manage workspace members">
        <Users class="w-4 h-4 mr-2" />
        Members
      </button>
      <button class="btn-ghost" aria-label="Share workspace">
        <Share class="w-4 h-4 mr-2" />
        Share
      </button>
      <button class="btn-ghost" aria-label="Workspace settings">
        <Settings class="w-4 h-4" />
      </button>
      <button
        class="btn-primary"
        on:click={() => showCreateModal = true}
      >
        <Plus class="w-4 h-4 mr-2" />
        New Note
      </button>
    </div>
  </div>
</header>

<!-- Canvas -->
<main class="flex-1 overflow-hidden relative bg-dark-950">
  <div
    bind:this={canvasElement}
    class="absolute inset-0 cursor-grab"
    style="transform-origin: 0 0;"
    on:mousedown={handleCanvasMouseDown}
    on:mousemove={handleCanvasMouseMove}
    on:mouseup={handleCanvasMouseUp}
    on:mouseleave={handleCanvasMouseUp}
    on:wheel={handleCanvasWheel}
    on:drop={handleCanvasDrop}
    on:dragover={handleCanvasDragOver}
    role="application"
    tabindex="0"
    aria-label="Interactive workspace canvas for managing notes"
    on:keydown={handleCanvasKeyDown}
  >
    <!-- Grid Background -->
    <div class="absolute inset-0 opacity-10">
      <svg width="100%" height="100%">
        <defs>
          <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
            <path d="M 50 0 L 0 0 0 50" fill="none" stroke="currentColor" stroke-width="1"/>
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
    </div>

    <!-- Notes -->
    {#each $workspaceNotes as note (note.id)}
      <NoteCard
        {note}
        isDragging={draggedNote?.id === note.id}
        on:dragstart={handleNoteDragStart}
        on:dragend={handleNoteDragEnd}
        on:click={handleNoteClick}
      />
    {/each}
  </div>

  <!-- Canvas Controls -->
  <div class="absolute bottom-6 right-6 flex flex-col space-y-2">
    <div class="bg-dark-900 border border-dark-800 rounded-lg p-2">
      <div class="text-xs text-dark-400 text-center mb-2">Zoom: {Math.round(canvasScale * 100)}%</div>
      <div class="flex flex-col space-y-1">
        <button
          class="w-8 h-8 flex items-center justify-center bg-dark-800 hover:bg-dark-700 rounded text-white text-lg"
          on:click={() => { canvasScale = Math.min(3, canvasScale * 1.2); updateCanvasTransform(); }}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          class="w-8 h-8 flex items-center justify-center bg-dark-800 hover:bg-dark-700 rounded text-white text-lg"
          on:click={() => { canvasScale = Math.max(0.1, canvasScale * 0.8); updateCanvasTransform(); }}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>
  </div>
</main>

<!-- Create Note Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-lg">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Create New Note</h2>
        
        <form on:submit|preventDefault={handleCreateNote} class="space-y-4">
          <div>
            <label for="title" class="block text-sm font-medium text-dark-300 mb-2">
              Title
            </label>
            <input
              id="title"
              type="text"
              bind:value={newNoteTitle}
              class="input"
              placeholder="Enter note title"
              required
            />
          </div>

          <div>
            <label for="type" class="block text-sm font-medium text-dark-300 mb-2">
              Type
            </label>
            <select
              id="type"
              bind:value={newNoteType}
              class="input"
            >
              <option value="text">Text Note</option>
              <option value="rich">Rich Text</option>
              <option value="code">Code Snippet</option>
            </select>
          </div>

          <div>
            <label for="content" class="block text-sm font-medium text-dark-300 mb-2">
              Content
            </label>
            <textarea
              id="content"
              bind:value={newNoteContent}
              class="input resize-none"
              rows="6"
              placeholder="Enter note content"
            ></textarea>
          </div>

          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Color
            </label>
            <div class="flex items-center space-x-2">
              {#each noteColors as color}
                <button
                  type="button"
                  class="w-8 h-8 rounded-full border-2 {newNoteColor === color ? 'border-white' : 'border-dark-700'}"
                  style="background-color: {color}"
                  on:click={() => newNoteColor = color}
                  aria-label="Select color {color}"
                  title="Select color {color}"
                ></button>
              {/each}
            </div>
          </div>

          <div class="flex items-center justify-end space-x-3 pt-4">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => showCreateModal = false}
            >
              Cancel
            </button>
            <button type="submit" class="btn-primary">
              Create Note
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Note Detail Modal -->
{#if showNoteModal && selectedNote}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-2xl max-h-[80vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white">{selectedNote.title}</h2>
          <button
            class="text-dark-400 hover:text-white"
            on:click={() => showNoteModal = false}
            aria-label="Close note details"
            title="Close"
          >
            ×
          </button>
        </div>
      </div>
      
      <div class="p-6 overflow-y-auto">
        {#if selectedNote.type === 'rich'}
          <div class="prose prose-invert max-w-none">
            {@html sanitizeHtml(selectedNote.content)}
          </div>
        {:else if selectedNote.type === 'code'}
          <pre class="bg-dark-800 p-4 rounded-lg text-green-400 font-mono text-sm overflow-x-auto">{selectedNote.content}</pre>
        {:else}
          <p class="text-dark-200 whitespace-pre-wrap">{selectedNote.content}</p>
        {/if}
        
        <div class="mt-6 pt-4 border-t border-dark-800">
          <div class="flex items-center justify-between text-sm text-dark-400">
            <div class="flex items-center space-x-4">
              <span>Type: {selectedNote.type}</span>
              <span>Created: {new Intl.DateTimeFormat('en-US').format(selectedNote.createdAt)}</span>
            </div>
            <div class="flex items-center space-x-2">
              {#each selectedNote.tags as tag}
                <span class="px-2 py-1 bg-dark-800 rounded-full text-xs">#{tag}</span>
              {/each}
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}