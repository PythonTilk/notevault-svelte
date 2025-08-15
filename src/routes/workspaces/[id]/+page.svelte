<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { Plus, Save, Palette, Type, Code, Settings, Users, Share, Tag, Folder, Calendar } from 'lucide-svelte';
  import { workspaceNotes, workspaceStore, currentWorkspace } from '$lib/stores/workspaces';
  import DOMPurify from 'dompurify';
  import NoteCard from '$lib/components/NoteCard.svelte';
  import WorkspaceMemberModal from '$lib/components/WorkspaceMemberModal.svelte';
  import WorkspaceMeetingModal from '$lib/components/WorkspaceMeetingModal.svelte';
  import CollaboratorsList from '$lib/components/CollaboratorsList.svelte';
  import LiveCursor from '$lib/components/LiveCursor.svelte';
  import TagInput from '$lib/components/TagInput.svelte';
  import NoteToolbar from '$lib/components/NoteToolbar.svelte';
  import CollectionTree from '$lib/components/CollectionTree.svelte';
  import CollectionModal from '$lib/components/CollectionModal.svelte';
  import type { Note, WorkspaceMember, NoteCollection } from '$lib/types';
  import { 
    initializeCollaboration, 
    joinRoom, 
    leaveRoom, 
    updateCursor,
    collaborationStatus,
    onlineUserCount 
  } from '$lib/stores/collaboration';
  import { currentUser } from '$lib/stores/auth';
  import { 
    noteManagementStore, 
    filteredAndSortedNotes, 
    noteFilters,
    noteSortOptions,
    noteViewMode,
    availableTags
  } from '$lib/stores/noteManagement';
  import { collectionsStore, collectionsTree, collectionStore } from '$lib/stores/collections';

  let workspaceId: string;
  let canvasElement: HTMLDivElement;
  let showCreateModal = false;
  let showNoteModal = false;
  let selectedNote: Note | null = null;
  let showMemberModal = false;
  let showMeetingModal = false;
  let workspaceMembers: WorkspaceMember[] = [];
  
  // Collections
  let showCollectionsSidebar = true;
  let showCollectionModal = false;
  
  // Mobile responsiveness
  let isMobile = false;
  let isTablet = false;
  let editingCollection: NoteCollection | null = null;
  let parentCollection: NoteCollection | null = null;
  
  function sanitizeHtml(html: string): string {
    return DOMPurify.sanitize(html.replace(/\n/g, '<br>'));
  }
  let draggedNote: Note | null = null;
  
  // New note form
  let newNoteTitle = '';
  let newNoteContent = '';
  let newNoteType: 'text' | 'rich' | 'code' = 'text';
  let newNoteColor = '#fbbf24';
  let newNoteTags: string[] = [];
  let newNoteCollectionId: string | undefined = undefined;

  // Canvas state
  let canvasOffset = { x: 0, y: 0 };
  let canvasScale = 1;
  let isPanning = false;
  let lastPanPoint = { x: 0, y: 0 };

  $: workspaceId = $page.params.id;
  
  // Get filtered and sorted notes
  $: filteredNotes = $filteredAndSortedNotes($workspaceNotes);
  $: workspaceAvailableTags = $availableTags($workspaceNotes);
  
  // Get workspace collections
  $: workspaceCollections = $collectionsTree.filter(c => c.workspaceId === workspaceId);

  onMount(() => {
    // Detect mobile and tablet devices
    function updateDeviceType() {
      const width = window.innerWidth;
      isMobile = width < 768;
      isTablet = width >= 768 && width < 1024;
      
      // Auto-hide sidebar on mobile
      if (isMobile) {
        showCollectionsSidebar = false;
      }
    }
    
    updateDeviceType();
    window.addEventListener('resize', updateDeviceType);
    
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

      // Initialize collaboration if user is authenticated
      if ($currentUser) {
        initializeCollaboration({
          id: $currentUser.id,
          username: $currentUser.username,
          displayName: $currentUser.displayName,
          email: $currentUser.email
        });
        
        // Join workspace room for collaboration
        joinRoom(workspaceId, 'workspace');
      }
    }

    return () => {
      // Leave room when component unmounts
      if (workspaceId) {
        leaveRoom();
      }
      // Cleanup resize listener
      window.removeEventListener('resize', updateDeviceType);
    };
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

    // Update cursor position for collaboration
    if (canvasElement && $currentUser) {
      const rect = canvasElement.getBoundingClientRect();
      const x = (event.clientX - rect.left - canvasOffset.x) / canvasScale;
      const y = (event.clientY - rect.top - canvasOffset.y) / canvasScale;
      updateCursor(x, y, `workspace-${workspaceId}`);
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
  
  // Touch event handlers for mobile
  function handleTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      isPanning = true;
      lastPanPoint = { x: touch.clientX, y: touch.clientY };
    } else if (event.touches.length === 2) {
      // Pinch-to-zoom will be handled by touchmove
      event.preventDefault();
    }
  }
  
  function handleTouchMove(event: TouchEvent) {
    if (event.touches.length === 1 && isPanning) {
      const touch = event.touches[0];
      const deltaX = touch.clientX - lastPanPoint.x;
      const deltaY = touch.clientY - lastPanPoint.y;
      
      canvasOffset.x += deltaX;
      canvasOffset.y += deltaY;
      updateCanvasTransform();
      
      lastPanPoint = { x: touch.clientX, y: touch.clientY };
    } else if (event.touches.length === 2) {
      // Pinch-to-zoom
      event.preventDefault();
      const touch1 = event.touches[0];
      const touch2 = event.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) + 
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      
      // Store initial distance if not set
      if (!canvasElement.dataset.initialDistance) {
        canvasElement.dataset.initialDistance = distance.toString();
        canvasElement.dataset.initialScale = canvasScale.toString();
      } else {
        const initialDistance = parseFloat(canvasElement.dataset.initialDistance);
        const initialScale = parseFloat(canvasElement.dataset.initialScale);
        const scaleChange = distance / initialDistance;
        canvasScale = Math.min(3, Math.max(0.1, initialScale * scaleChange));
        updateCanvasTransform();
      }
    }
  }
  
  function handleTouchEnd(event: TouchEvent) {
    if (event.touches.length === 0) {
      isPanning = false;
      // Clear pinch-to-zoom data
      delete canvasElement.dataset.initialDistance;
      delete canvasElement.dataset.initialScale;
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
      color: newNoteColor,
      tags: newNoteTags,
      collectionId: newNoteCollectionId
    });

    showCreateModal = false;
    newNoteTitle = '';
    newNoteContent = '';
    newNoteType = 'text';
    newNoteColor = '#fbbf24';
    newNoteTags = [];
    newNoteCollectionId = undefined;
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

  // Member Management Functions
  function handleMembersUpdated(event: CustomEvent<{ members: WorkspaceMember[] }>) {
    workspaceMembers = event.detail.members;
  }

  function handleMemberModalClose() {
    showMemberModal = false;
  }

  // Collection Management Functions
  function handleCollectionSelect(event: CustomEvent<{ collection: NoteCollection | null }>) {
    const collection = event.detail.collection;
    if (collection) {
      noteManagementStore.setCollectionFilter(collection.id);
    } else {
      noteManagementStore.setCollectionFilter('uncategorized');
    }
  }

  function handleCreateCollection(event: CustomEvent<{ parentId?: string }>) {
    parentCollection = event.detail.parentId 
      ? $collectionsStore.find(c => c.id === event.detail.parentId) || null 
      : null;
    editingCollection = null;
    showCollectionModal = true;
  }

  function handleEditCollection(event: CustomEvent<{ collection: NoteCollection }>) {
    editingCollection = event.detail.collection;
    parentCollection = null;
    showCollectionModal = true;
  }

  async function handleSaveCollection(event: CustomEvent<{ collection: Omit<NoteCollection, 'id' | 'createdAt' | 'updatedAt'> }>) {
    if (editingCollection) {
      await collectionStore.update(editingCollection.id, event.detail.collection);
    } else {
      await collectionStore.create(event.detail.collection);
    }
    showCollectionModal = false;
    editingCollection = null;
    parentCollection = null;
  }

  async function handleDeleteCollection(event: CustomEvent<{ collection: NoteCollection }>) {
    if (confirm(`Are you sure you want to delete "${event.detail.collection.name}"? This will move its contents to the parent collection.`)) {
      await collectionStore.delete(event.detail.collection.id);
    }
  }

  function handleDropNoteToCollection(event: CustomEvent<{ noteId: string; collectionId: string | null }>) {
    const noteId = event.detail.noteId;
    const collectionId = event.detail.collectionId;
    
    // Update note's collection
    workspaceStore.updateNote(noteId, { 
      collectionId: collectionId || undefined 
    });
  }
</script>

<svelte:head>
  <title>{$currentWorkspace?.name || 'Workspace'} - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-4 md:px-6 py-4">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
      {#if $currentWorkspace}
        <div
          class="w-8 h-8 md:w-10 md:h-10 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
          style="background-color: {$currentWorkspace.color}"
        >
          {$currentWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-lg md:text-xl font-bold text-white truncate">{$currentWorkspace.name}</h1>
          <p class="text-dark-400 text-xs md:text-sm">{$workspaceNotes.length} notes</p>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-1 md:space-x-3 flex-shrink-0">
      <!-- Collections Toggle -->
      <button
        class="btn-ghost text-xs md:text-sm px-2 md:px-3"
        on:click={() => showCollectionsSidebar = !showCollectionsSidebar}
        title={showCollectionsSidebar ? 'Hide Collections' : 'Show Collections'}
      >
        <Folder class="w-4 h-4 {isMobile ? '' : 'mr-2'}" />
        {#if !isMobile}Collections{/if}
      </button>
      
      <!-- Collaboration Status -->
      {#if $collaborationStatus.connected}
        <div class="flex items-center space-x-2 bg-dark-800 px-2 md:px-3 py-2 rounded-lg border border-dark-700">
          <CollaboratorsList 
            {workspaceId} 
            compact={true} 
            maxVisible={isMobile ? 2 : 4}
            showTypingIndicators={false}
          />
        </div>
      {/if}

      <!-- Desktop-only buttons -->
      {#if !isMobile}
        <button
          class="btn-secondary text-sm"
          on:click={resetCanvas}
          title="Reset View"
        >
          Reset View
        </button>
        <button 
          class="btn-ghost text-sm" 
          aria-label="Manage workspace members"
          on:click={() => showMemberModal = true}
        >
          <Users class="w-4 h-4 mr-2" />
          Members
          {#if workspaceMembers.length > 0}
            <span class="ml-1 bg-primary-600 text-white text-xs px-2 py-1 rounded-full">
              {workspaceMembers.length}
            </span>
          {/if}
        </button>
        <button class="btn-ghost text-sm" aria-label="Share workspace">
          <Share class="w-4 h-4 mr-2" />
          Share
        </button>
        <button
          class="btn-ghost text-sm"
          on:click={() => showMeetingModal = true}
          aria-label="Schedule meeting"
        >
          <Calendar class="w-4 h-4 mr-2" />
          Schedule Meeting
        </button>
        <button class="btn-ghost text-sm" aria-label="Workspace settings">
          <Settings class="w-4 h-4" />
        </button>
      {:else}
        <!-- Mobile-only dropdown menu -->
        <div class="relative">
          <button
            class="btn-ghost p-2"
            on:click={() => {/* mobile menu toggle */}}
            aria-label="More options"
          >
            <Settings class="w-4 h-4" />
          </button>
          <!-- Mobile dropdown would go here -->
        </div>
      {/if}
      
      <button
        class="btn-primary text-xs md:text-sm px-2 md:px-3"
        on:click={() => showCreateModal = true}
      >
        <Plus class="w-4 h-4 {isMobile ? '' : 'mr-2'}" />
        {#if !isMobile}New Note{/if}
      </button>
    </div>
  </div>
</header>

<!-- Note Management Toolbar -->
<div class="bg-dark-900 border-b border-dark-800">
  <div class="p-4">
    <NoteToolbar
      notes={$workspaceNotes}
      filteredCount={filteredNotes.length}
      selectedTags={$noteFilters.tags}
      sortBy={$noteSortOptions.sortBy}
      sortOrder={$noteSortOptions.sortOrder}
      viewMode={$noteViewMode}
      searchQuery={$noteFilters.searchQuery}
      typeFilter={$noteFilters.type}
      visibilityFilter={$noteFilters.isPublic}
      selectedNotes={[]}
      showBulkActions={false}
      on:searchChange={(e) => noteManagementStore.setSearchQuery(e.detail.query)}
      on:tagsChange={(e) => noteManagementStore.setTagFilter(e.detail.tags)}
      on:sortChange={(e) => {
        noteManagementStore.setSortBy(e.detail.sortBy);
        noteManagementStore.setSortOrder(e.detail.sortOrder);
      }}
      on:viewModeChange={(e) => noteManagementStore.setViewMode(e.detail.viewMode)}
      on:typeFilterChange={(e) => noteManagementStore.setTypeFilter(e.detail.type)}
      on:visibilityFilterChange={(e) => noteManagementStore.setVisibilityFilter(e.detail.isPublic)}
      on:clearFilters={noteManagementStore.clearFilters}
    />
  </div>
</div>

<!-- Main Layout with Sidebar -->
<div class="flex-1 flex overflow-hidden relative">
  <!-- Collections Sidebar -->
  {#if showCollectionsSidebar}
    <!-- Mobile overlay backdrop -->
    {#if isMobile}
      <div 
        class="fixed inset-0 bg-black/50 z-30 md:hidden"
        on:click={() => showCollectionsSidebar = false}
        transition:fade
      ></div>
    {/if}
    
    <div class="{isMobile ? 'fixed top-0 left-0 h-full z-40 transform transition-transform' : 'relative'} w-64 md:w-64 bg-dark-900 border-r border-dark-800 flex flex-col">
      <!-- Sidebar Header -->
      <div class="p-4 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Collections</h3>
          <button
            class="text-dark-400 hover:text-white transition-colors"
            on:click={() => showCollectionsSidebar = false}
            title="Hide sidebar"
          >
            <Plus class="w-4 h-4 rotate-45" />
          </button>
        </div>
      </div>
      
      <!-- Collections Tree -->
      <div class="flex-1 overflow-y-auto p-3">
        <div class="mb-4">
          <button
            class="w-full flex items-center justify-center gap-2 py-2 px-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm"
            on:click={() => handleCreateCollection({ detail: {} })}
          >
            <Plus class="w-4 h-4" />
            New Collection
          </button>
        </div>
        
        <CollectionTree
          collections={workspaceCollections}
          notes={$workspaceNotes}
          selectedCollectionId={$noteFilters.collectionId === 'uncategorized' ? null : $noteFilters.collectionId}
          on:selectCollection={handleCollectionSelect}
          on:createCollection={handleCreateCollection}
          on:editCollection={handleEditCollection}
          on:deleteCollection={handleDeleteCollection}
          on:dropNote={handleDropNoteToCollection}
        />
      </div>
    </div>
  {/if}

  <!-- Canvas -->
  <main class="flex-1 overflow-hidden relative bg-dark-950">
  <div
    bind:this={canvasElement}
    id="workspace-canvas"
    class="absolute inset-0 cursor-grab touch-none select-none"
    style="transform-origin: 0 0;"
    on:mousedown={handleCanvasMouseDown}
    on:mousemove={handleCanvasMouseMove}
    on:mouseup={handleCanvasMouseUp}
    on:mouseleave={handleCanvasMouseUp}
    on:wheel={handleCanvasWheel}
    on:touchstart={handleTouchStart}
    on:touchmove={handleTouchMove}
    on:touchend={handleTouchEnd}
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
    {#each filteredNotes as note (note.id)}
      <NoteCard
        {note}
        isDragging={draggedNote?.id === note.id}
        on:dragstart={handleNoteDragStart}
        on:dragend={handleNoteDragEnd}
        on:click={handleNoteClick}
      />
    {/each}

    <!-- Live Cursors and Collaboration -->
    {#if $collaborationStatus.connected}
      <LiveCursor 
        containerId="workspace-canvas"
        showUserNames={true}
        showSelections={false}
      />
    {/if}
  </div>

  <!-- Canvas Controls -->
  <div class="absolute bottom-4 md:bottom-6 right-4 md:right-6 flex flex-col space-y-2">
    <div class="bg-dark-900/90 backdrop-blur-sm border border-dark-800 rounded-lg p-2">
      <div class="text-xs text-dark-400 text-center mb-2">Zoom: {Math.round(canvasScale * 100)}%</div>
      <div class="flex flex-col space-y-1">
        <button
          class="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-dark-800 hover:bg-dark-700 active:bg-dark-600 rounded text-white text-xl md:text-lg transition-colors touch-manipulation"
          on:click={() => { canvasScale = Math.min(3, canvasScale * 1.2); updateCanvasTransform(); }}
          aria-label="Zoom in"
          title="Zoom in"
        >
          +
        </button>
        <button
          class="w-10 h-10 md:w-8 md:h-8 flex items-center justify-center bg-dark-800 hover:bg-dark-700 active:bg-dark-600 rounded text-white text-xl md:text-lg transition-colors touch-manipulation"
          on:click={() => { canvasScale = Math.max(0.1, canvasScale * 0.8); updateCanvasTransform(); }}
          aria-label="Zoom out"
          title="Zoom out"
        >
          −
        </button>
      </div>
    </div>
    
    <!-- Mobile-only reset canvas button -->
    {#if isMobile}
      <div class="bg-dark-900/90 backdrop-blur-sm border border-dark-800 rounded-lg p-2">
        <button
          class="w-10 h-10 flex items-center justify-center bg-dark-800 hover:bg-dark-700 active:bg-dark-600 rounded text-white transition-colors touch-manipulation"
          on:click={resetCanvas}
          aria-label="Reset view"
          title="Reset view"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
        </button>
      </div>
    {/if}
  </div>
  </main>
</div>

<!-- Collection Modal -->
<CollectionModal
  bind:isOpen={showCollectionModal}
  collection={editingCollection}
  parentCollection={parentCollection}
  workspaceId={workspaceId}
  authorId={$currentUser?.id || ''}
  on:save={handleSaveCollection}
  on:close={() => showCollectionModal = false}
/>

<!-- Create Note Modal -->
{#if showCreateModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-lg max-h-[90vh] overflow-y-auto">
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
              Tags
            </label>
            <TagInput 
              bind:tags={newNoteTags}
              placeholder="Add tags (press Enter or Tab to add)"
              maxTags={10}
              on:change={(e) => newNoteTags = e.detail.tags}
            />
          </div>

          <div>
            <label for="collection" class="block text-sm font-medium text-dark-300 mb-2">
              Collection
            </label>
            <select
              id="collection"
              bind:value={newNoteCollectionId}
              class="input"
            >
              <option value={undefined}>Uncategorized</option>
              {#each workspaceCollections as collection}
                <option value={collection.id}>
                  {collection.icon || '📁'} {collection.name}
                </option>
              {/each}
            </select>
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

<!-- Member Management Modal -->
{#if showMemberModal && $currentWorkspace}
  <WorkspaceMemberModal
    workspaceId={workspaceId}
    workspaceName={$currentWorkspace.name}
    initialMembers={workspaceMembers}
    on:close={handleMemberModalClose}
    on:members-updated={handleMembersUpdated}
  />
{/if}

<!-- Meeting Scheduling Modal -->
{#if showMeetingModal && $currentWorkspace}
  <WorkspaceMeetingModal
    bind:isOpen={showMeetingModal}
    workspaceId={workspaceId}
    workspaceName={$currentWorkspace.name}
    on:close={() => showMeetingModal = false}
    on:created={(event) => {
      console.log('Meeting created:', event.detail.meeting);
      // Could redirect to calendar or show notification
    }}
  />
{/if}