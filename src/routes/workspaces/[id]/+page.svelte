<script lang="ts">
  import { onMount } from 'svelte';
  import { fade } from 'svelte/transition';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
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
  import AIEnhancedEditor from '$lib/components/AIEnhancedEditor.svelte';
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
  import { collectionsStore, collectionsTree, collectionStore, loadCollectionsForWorkspace } from '$lib/stores/collections';
  import { chatMessages, onlineUsers, isConnected, chatStore } from '$lib/stores/chat';
  import ChatMessage from '$lib/components/ChatMessage.svelte';

  let workspaceId: string;
  let canvasElement: HTMLDivElement;
  let showCreateModal = false;
  let showNoteModal = false;
  let selectedNote: Note | null = null;
  let showMemberModal = false;
  let showMeetingModal = false;
  let showShareModal = false;
  let showSettingsModal = false;
  let workspaceMembers: WorkspaceMember[] = [];
  
  // Settings form variables
  let settingsForm = {
    name: '',
    description: '',
    color: '',
    isPublic: false
  };
  let settingsSaving = false;
  
  // Collections
  let showCollectionsSidebar = true;
  let showCollectionModal = false;
  
  // Chat
  let showChatSidebar = false;
  let showCollaboratorsSidebar = false;
  let chatMessage = '';
  let chatContainer: HTMLDivElement;
  
  // Mobile responsiveness
  let isMobile = false;
  let isTablet = false;
  let showMobileDropdown = false;
  let editingCollection: NoteCollection | null = null;
  let parentCollection: NoteCollection | null = null;
  
  // Infinite scrolling state
  let isLoadingNotes = false;
  let hasMoreNotes = true;
  let notesOffset = 0;
  const notesLimit = 50; // Load 50 notes at a time
  let visibleBounds = { left: 0, right: 0, top: 0, bottom: 0 };
  let loadingTriggerDistance = 2000; // Load more when within 2000px of edge
  let infiniteScrollThrottle: ReturnType<typeof setTimeout> | null = null;
  
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
  
  // Note editing state
  let editingNote: Note | null = null;
  let editingContent = '';
  let showEditModal = false;
  let aiEditorEnabled = true;

  // Canvas state
  let canvasOffset = { x: 0, y: 0 };
  let canvasScale = 1;
  let isPanning = false;
  let lastPanPoint = { x: 0, y: 0 };

  $: workspaceId = $page.params.id;
  
  // Get filtered and sorted notes
  $: filteredNotes = $filteredAndSortedNotes($workspaceNotes);
  $: workspaceAvailableTags = $availableTags($workspaceNotes);
  
  // Virtual scrolling - only render visible notes for performance
  $: visibleNotes = getVisibleNotes(filteredNotes);
  
  function getVisibleNotes(notes: Note[]) {
    if (notes.length === 0) return notes;
    
    // Add padding around visible area for smooth scrolling
    const padding = 500;
    const viewBounds = {
      left: visibleBounds.left - padding,
      right: visibleBounds.right + padding,
      top: visibleBounds.top - padding,
      bottom: visibleBounds.bottom + padding
    };
    
    return notes.filter(note => {
      const noteLeft = note.position?.x || 0;
      const noteTop = note.position?.y || 0;
      const noteRight = noteLeft + (note.size?.width || 300);
      const noteBottom = noteTop + (note.size?.height || 200);
      
      // Check if note intersects with visible bounds
      return !(
        noteRight < viewBounds.left ||
        noteLeft > viewBounds.right ||
        noteBottom < viewBounds.top ||
        noteTop > viewBounds.bottom
      );
    });
  }
  
  // Get workspace collections (with fallback for empty state)
  $: workspaceCollections = ($collectionsTree && Array.isArray($collectionsTree)) 
    ? $collectionsTree.filter(c => c.workspaceId === workspaceId) 
    : [];

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
      // Load collections for this workspace
      loadCollectionsForWorkspace(workspaceId);
      
      // Load real workspace data, notes, and members
      Promise.all([
        workspaceStore.loadWorkspace(workspaceId),
        workspaceStore.loadWorkspaceNotes(workspaceId, {
          limit: notesLimit,
          offset: 0,
          sortBy: 'updatedAt',
          sortOrder: 'desc'
        }),
        workspaceStore.loadWorkspaceMembers(workspaceId)
      ]).then(([workspace, notes, members]) => {
        console.log('Workspace loaded:', workspace);
        console.log('Notes loaded:', $workspaceNotes.length, 'notes');
        console.log('Members loaded:', members.length, 'members');
        console.log('Collections loaded:', $collectionsTree.length, 'collections');
        workspaceMembers = members;
        
        // Set initial pagination state
        notesOffset = notes.length;
        hasMoreNotes = notes.length >= notesLimit;
        
        // Initialize bounds and check for infinite scroll
        setTimeout(() => {
          updateVisibleBounds();
          checkInfiniteScroll();
        }, 100);
      }).catch(error => {
        console.error('Failed to load workspace data:', error);
        // Set error state or show error message to user
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
      // Cleanup infinite scroll throttle
      if (infiniteScrollThrottle) {
        clearTimeout(infiniteScrollThrottle);
      }
    };
  });

  function handleCanvasMouseDown(event: MouseEvent) {
    // Only start panning if clicking on the canvas itself, not on a note
    const target = event.target as Element;
    if (target === canvasElement || target.closest('#workspace-canvas') === canvasElement) {
      // Check if the click is on a note card - if so, don't pan
      if (!target.closest('[draggable="true"]')) {
        isPanning = true;
        lastPanPoint = { x: event.clientX, y: event.clientY };
        canvasElement.style.cursor = 'grabbing';
      }
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
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      
      // Transform to canvas coordinates
      const canvasX = (screenX - canvasOffset.x) / canvasScale;
      const canvasY = (screenY - canvasOffset.y) / canvasScale;
      
      updateCursor(canvasX, canvasY, `workspace-${workspaceId}`);
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
      updateVisibleBounds();
      throttledCheckInfiniteScroll();
    }
  }
  
  function throttledCheckInfiniteScroll() {
    if (infiniteScrollThrottle) {
      clearTimeout(infiniteScrollThrottle);
    }
    infiniteScrollThrottle = setTimeout(() => {
      checkInfiniteScroll();
      infiniteScrollThrottle = null;
    }, 100); // Throttle to check at most every 100ms
  }
  
  function updateVisibleBounds() {
    if (!canvasElement) return;
    
    const rect = canvasElement.getBoundingClientRect();
    const inverseScale = 1 / canvasScale;
    
    visibleBounds = {
      left: (-canvasOffset.x) * inverseScale,
      right: (-canvasOffset.x + rect.width) * inverseScale,
      top: (-canvasOffset.y) * inverseScale,
      bottom: (-canvasOffset.y + rect.height) * inverseScale
    };
  }
  
  async function checkInfiniteScroll() {
    if (isLoadingNotes || !hasMoreNotes) return;
    
    // Since the canvas is now infinite, we load more notes based on
    // how much of the visible area contains notes vs empty space
    const notesInView = visibleNotes.length;
    const totalNotesLoaded = $workspaceNotes.length;
    
    // If we have very few visible notes compared to total notes,
    // or if we're viewing an area with sparse note density, load more
    const viewAreaSize = (visibleBounds.right - visibleBounds.left) * 
                         (visibleBounds.bottom - visibleBounds.top);
    const notesDensity = notesInView / (viewAreaSize / 100000); // notes per 100k px²
    
    // Load more if density is low and we have more notes available
    if (notesDensity < 0.1 && totalNotesLoaded % notesLimit === 0) {
      await loadMoreNotes();
    }
  }
  
  function getNotesBounds() {
    if ($workspaceNotes.length === 0) {
      return { left: 0, right: 1000, top: 0, bottom: 1000 };
    }
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    
    for (const note of $workspaceNotes) {
      const left = note.position?.x || 0;
      const top = note.position?.y || 0;
      const right = left + (note.size?.width || 300);
      const bottom = top + (note.size?.height || 200);
      
      minX = Math.min(minX, left);
      maxX = Math.max(maxX, right);
      minY = Math.min(minY, top);
      maxY = Math.max(maxY, bottom);
    }
    
    return {
      left: minX,
      right: maxX,
      top: minY,
      bottom: maxY
    };
  }
  
  async function loadMoreNotes() {
    if (isLoadingNotes || !hasMoreNotes) return;
    
    isLoadingNotes = true;
    try {
      const newNotes = await workspaceStore.loadWorkspaceNotes(workspaceId, {
        limit: notesLimit,
        offset: notesOffset,
        sortBy: 'updatedAt',
        sortOrder: 'desc',
        append: true
      });
      
      if (newNotes.length < notesLimit) {
        hasMoreNotes = false;
      } else {
        notesOffset += newNotes.length;
      }
    } catch (error) {
      console.error('Failed to load more notes:', error);
    } finally {
      isLoadingNotes = false;
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
    // Change cursor to indicate dragging
    if (canvasElement) {
      canvasElement.style.cursor = 'grabbing';
    }
  }

  function handleNoteDragEnd(event: CustomEvent<{ note: Note }>) {
    draggedNote = null;
    // Reset cursor
    if (canvasElement) {
      canvasElement.style.cursor = 'grab';
    }
  }

  function handleNoteClick(event: CustomEvent<{ note: Note }>) {
    selectedNote = event.detail.note;
    showNoteModal = true;
  }
  
  function handleEditNote(note: Note) {
    editingNote = note;
    editingContent = note.content;
    showEditModal = true;
  }
  
  async function handleSaveEditedNote() {
    if (!editingNote) return;
    
    await workspaceStore.updateNote(editingNote.id, {
      content: editingContent
    });
    
    showEditModal = false;
    editingNote = null;
    editingContent = '';
  }
  
  function handleAITagsGenerated(event: CustomEvent<{ tags: string[] }>) {
    if (editingNote) {
      // Update note tags with AI suggestions
      const currentTags = editingNote.tags || [];
      const newTags = [...new Set([...currentTags, ...event.detail.tags])];
      workspaceStore.updateNote(editingNote.id, { tags: newTags });
    } else {
      // For new notes
      newNoteTags = [...new Set([...newNoteTags, ...event.detail.tags])];
    }
  }
  
  function handleAIContentInput(event: CustomEvent<{ value: string }>) {
    if (editingNote) {
      editingContent = event.detail.value;
    } else {
      newNoteContent = event.detail.value;
    }
  }

  function handleCanvasDrop(event: DragEvent) {
    event.preventDefault();
    if (draggedNote) {
      const rect = canvasElement.getBoundingClientRect();
      
      // Convert screen coordinates to canvas coordinates
      // Account for both canvas offset and scale
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      
      // Transform to canvas coordinates
      const canvasX = (screenX - canvasOffset.x) / canvasScale;
      const canvasY = (screenY - canvasOffset.y) / canvasScale;
      
      workspaceStore.updateNote(draggedNote.id, {
        position: { 
          x: Math.round(canvasX), 
          y: Math.round(canvasY) 
        }
      });
    }
  }

  function handleCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    
    // Visual feedback during drag
    if (draggedNote && canvasElement) {
      const rect = canvasElement.getBoundingClientRect();
      const screenX = event.clientX - rect.left;
      const screenY = event.clientY - rect.top;
      
      // Transform to canvas coordinates (same logic as drop)
      const canvasX = (screenX - canvasOffset.x) / canvasScale;
      const canvasY = (screenY - canvasOffset.y) / canvasScale;
      
      // Update drag preview position (stored for reference)
      draggedNote.dragPreviewPosition = { x: canvasX, y: canvasY };
    }
  }

  async function handleCreateNote() {
    if (!newNoteTitle.trim()) return;

    // Calculate position at the center of the current viewport
    const viewCenterX = (visibleBounds.left + visibleBounds.right) / 2;
    const viewCenterY = (visibleBounds.top + visibleBounds.bottom) / 2;
    
    // Add some randomness to avoid overlapping if multiple notes are created
    const offsetX = (Math.random() - 0.5) * 200; // ±100px random offset
    const offsetY = (Math.random() - 0.5) * 200;

    await workspaceStore.createNote(workspaceId, {
      title: newNoteTitle,
      content: newNoteContent,
      type: newNoteType,
      color: newNoteColor,
      tags: newNoteTags,
      collectionId: newNoteCollectionId,
      position: { 
        x: Math.round(viewCenterX + offsetX), 
        y: Math.round(viewCenterY + offsetY) 
      }
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
    const step = event.shiftKey ? 200 : 50; // Larger steps with Shift
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
      case 'h': // Go to origin (home)
        event.preventDefault();
        canvasOffset = { x: 0, y: 0 };
        canvasScale = 1;
        updateCanvasTransform();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        showCreateModal = true;
        break;
    }
  }

  // Mobile dropdown functions
  function closeMobileDropdown() {
    showMobileDropdown = false;
  }

  // Settings functionality
  function initializeSettings() {
    if ($currentWorkspace) {
      settingsForm = {
        name: $currentWorkspace.name || '',
        description: $currentWorkspace.description || '',
        color: $currentWorkspace.color || '#3b82f6',
        isPublic: $currentWorkspace.isPublic || false
      };
    }
  }

  async function saveWorkspaceSettings() {
    if (!$currentWorkspace || settingsSaving) return;

    settingsSaving = true;
    try {
      await workspaceStore.updateWorkspace(workspaceId, {
        name: settingsForm.name,
        description: settingsForm.description,
        color: settingsForm.color,
        isPublic: settingsForm.isPublic
      });
      
      showSettingsModal = false;
      // You could add a toast notification here
      alert('Workspace settings saved successfully!');
    } catch (error) {
      console.error('Failed to save workspace settings:', error);
      alert('Failed to save workspace settings. Please try again.');
    } finally {
      settingsSaving = false;
    }
  }

  async function deleteWorkspace() {
    if (!$currentWorkspace) return;
    
    const confirmed = confirm(`Are you sure you want to delete "${$currentWorkspace.name}"? This action cannot be undone.`);
    if (!confirmed) return;

    try {
      await workspaceStore.deleteWorkspace(workspaceId);
      goto('/'); // Redirect to home page
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      alert('Failed to delete workspace. Please try again.');
    }
  }

  // Initialize settings form when modal opens
  $: if (showSettingsModal && $currentWorkspace) {
    initializeSettings();
  }

  // Chat functionality
  async function sendChatMessage() {
    if (!chatMessage.trim()) return;

    try {
      await chatStore.sendMessage(chatMessage, `workspace-${workspaceId}`);
      chatMessage = '';
      
      // Scroll to bottom
      if (chatContainer) {
        setTimeout(() => {
          chatContainer.scrollTop = chatContainer.scrollHeight;
        }, 100);
      }
    } catch (error) {
      console.error('Failed to send chat message:', error);
      alert('Failed to send message. Please try again.');
    }
  }

  function handleChatKeyPress(event: KeyboardEvent) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      sendChatMessage();
    }
  }

  // Load workspace-specific messages when workspace loads
  $: if (workspaceId) {
    // Load workspace-specific messages (connection is handled in layout)
    chatStore.loadMessages({ channel: `workspace-${workspaceId}` });
    chatStore.loadOnlineUsers();
    chatStore.joinWorkspace(workspaceId);
  }

  // Close mobile dropdown when clicking outside
  function handleWindowClick(event: MouseEvent) {
    if (showMobileDropdown && !event.target?.closest('.mobile-dropdown')) {
      closeMobileDropdown();
    }
  }

  $: if (typeof window !== 'undefined') {
    if (showMobileDropdown) {
      window.addEventListener('click', handleWindowClick);
    } else {
      window.removeEventListener('click', handleWindowClick);
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
<header class="bg-dark-900 border-b border-dark-800 px-4 md:px-6 py-1 flex-shrink-0">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-3 md:space-x-4 min-w-0 flex-1">
      {#if $currentWorkspace}
        <div
          class="w-6 h-6 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-white font-bold flex-shrink-0"
          style="background-color: {$currentWorkspace.color}"
        >
          {$currentWorkspace.name.charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <h1 class="text-sm md:text-base font-bold text-white truncate">{$currentWorkspace.name}</h1>
          <p class="text-dark-400 text-[10px] md:text-xs">{$workspaceNotes.length} notes</p>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-1 md:space-x-1 flex-shrink-0">
      <!-- Collections Toggle -->
      <button
        class="btn-ghost text-xs md:text-sm px-2 md:px-3"
        on:click={() => showCollectionsSidebar = !showCollectionsSidebar}
        title={showCollectionsSidebar ? 'Hide Collections' : 'Show Collections'}
      >
        <Folder class="w-4 h-4 {isMobile ? '' : 'mr-2'}" />
        {#if !isMobile}Collections{/if}
      </button>
      
      <!-- Chat Toggle -->
      <button
        class="btn-ghost text-xs md:text-sm px-2 md:px-3"
        on:click={() => showChatSidebar = !showChatSidebar}
        title={showChatSidebar ? 'Hide Chat' : 'Show Chat'}
      >
        <svg class="w-4 h-4 {isMobile ? '' : 'mr-2'}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
        </svg>
        {#if !isMobile}Chat{/if}
        {#if $onlineUsers.length > 0}
          <span class="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">
            {$onlineUsers.length}
          </span>
        {/if}
      </button>
      
      <!-- Collaborators Toggle -->
      <button
        class="btn-ghost text-xs md:text-sm px-2 md:px-3"
        on:click={() => showCollaboratorsSidebar = !showCollaboratorsSidebar}
        title={showCollaboratorsSidebar ? 'Hide Collaborators' : 'Show Collaborators'}
        aria-label="Toggle collaborators sidebar"
      >
        <Users class="w-4 h-4 {isMobile ? '' : 'mr-2'}" />
        {#if !isMobile}Collaborators{/if}
        {#if $onlineUserCount > 0}
          <span class="ml-1 bg-green-500 text-white text-xs rounded-full px-1.5 py-0.5">
            {$onlineUserCount}
          </span>
        {/if}
      </button>

      <!-- Desktop-only buttons -->
      {#if !isMobile}
        <button
          class="btn-secondary text-xs md:text-sm"
          on:click={resetCanvas}
          title="Reset View"
        >
          Reset View
        </button>
        <button 
          class="btn-ghost text-xs md:text-sm" 
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
        <button 
          class="btn-ghost text-xs md:text-sm" 
          on:click={() => showShareModal = true}
          aria-label="Share workspace"
        >
          <Share class="w-4 h-4 mr-2" />
          Share
        </button>
        <button
          class="btn-ghost text-xs md:text-sm"
          on:click={() => showMeetingModal = true}
          aria-label="Schedule meeting"
        >
          <Calendar class="w-4 h-4 mr-2" />
          Schedule Meeting
        </button>
        <button 
          class="btn-ghost text-xs md:text-sm" 
          on:click={() => showSettingsModal = true}
          aria-label="Workspace settings"
        >
          <Settings class="w-4 h-4" />
        </button>
      {:else}
        <!-- Mobile-only dropdown menu -->
        <div class="relative mobile-dropdown">
          <button
            class="btn-ghost p-2"
            on:click={() => showMobileDropdown = !showMobileDropdown}
            aria-label="More options"
          >
            <Settings class="w-4 h-4" />
          </button>
          
          {#if showMobileDropdown}
            <div class="absolute right-0 top-full mt-1 w-48 bg-dark-800 border border-dark-700 rounded-lg shadow-lg z-50">
              <div class="py-1">
                <!-- Share Workspace -->
                <button
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                  on:click={() => {
                    closeMobileDropdown();
                    showShareModal = true;
                  }}
                >
                  <Share class="w-4 h-4" />
                  <span>Share Workspace</span>
                </button>
                
                <!-- Schedule Meeting -->
                <button
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                  on:click={() => {
                    closeMobileDropdown();
                    showMeetingModal = true;
                  }}
                >
                  <Calendar class="w-4 h-4" />
                  <span>Schedule Meeting</span>
                </button>
                
                <!-- Workspace Settings -->
                <button
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                  on:click={() => {
                    closeMobileDropdown();
                    showSettingsModal = true;
                  }}
                >
                  <Settings class="w-4 h-4" />
                  <span>Workspace Settings</span>
                </button>
                
                <!-- Manage Members -->
                <button
                  class="w-full text-left px-3 py-2 text-sm text-white hover:bg-dark-700 flex items-center space-x-2"
                  on:click={() => {
                    closeMobileDropdown();
                    showMemberModal = true;
                  }}
                >
                  <Users class="w-4 h-4" />
                  <span>Manage Members</span>
                </button>
              </div>
            </div>
          {/if}
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
<div class="flex-1 flex min-h-0 overflow-hidden relative">
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

  <!-- Main Content with Chat Sidebar -->
<main class="flex-1 min-h-0 overflow-hidden flex bg-dark-950">
  <!-- Canvas Area -->
  <div class="flex-1 relative">
  <div
    bind:this={canvasElement}
    id="workspace-canvas"
    class="absolute inset-0 cursor-grab touch-none select-none"
    style="transform-origin: 0 0; user-select: none;"
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
    <!-- Infinite Grid Background -->
    <div 
      class="absolute inset-0 opacity-10 pointer-events-none"
      style="background-image: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 49px,
        rgba(156, 163, 175, 0.3) 49px,
        rgba(156, 163, 175, 0.3) 50px
      ), repeating-linear-gradient(
        90deg,
        transparent,
        transparent 49px,
        rgba(156, 163, 175, 0.3) 49px,
        rgba(156, 163, 175, 0.3) 50px
      );
      background-position: {canvasOffset.x % 50}px {canvasOffset.y % 50}px;"
    ></div>

    <!-- Notes (Virtual Scrolling) -->
    {#each visibleNotes as note (note.id)}
      <NoteCard
        {note}
        isDragging={draggedNote?.id === note.id}
        on:dragstart={handleNoteDragStart}
        on:dragend={handleNoteDragEnd}
        on:click={handleNoteClick}
      />
    {/each}
    
    <!-- Canvas Coordinates Display -->
    <div class="absolute top-4 left-4 bg-dark-900/90 backdrop-blur-sm border border-dark-700 rounded-lg p-2 text-xs text-white">
      <div class="flex items-center space-x-3">
        <div>
          <span class="text-dark-400">X:</span> 
          <span class="font-mono">{Math.round(-canvasOffset.x / canvasScale)}</span>
        </div>
        <div>
          <span class="text-dark-400">Y:</span> 
          <span class="font-mono">{Math.round(-canvasOffset.y / canvasScale)}</span>
        </div>
        <div>
          <span class="text-dark-400">Zoom:</span> 
          <span class="font-mono">{Math.round(canvasScale * 100)}%</span>
        </div>
      </div>
      <div class="text-[10px] text-dark-500 mt-1 border-t border-dark-700 pt-1">
        <span class="text-dark-400">Keys:</span>
        Arrows=Move • H=Origin • +/-=Zoom • 0=Reset • Space=New Note
      </div>
    </div>

    <!-- Debug Info (only in development) -->
    {#if import.meta.env.DEV}
      <div class="absolute top-4 right-4 bg-dark-900/90 backdrop-blur-sm border border-dark-700 rounded-lg p-3 text-xs text-white">
        <div>Total Notes: {filteredNotes.length}</div>
        <div>Visible: {visibleNotes.length}</div>
        <div>Loaded: {$workspaceNotes.length}</div>
        <div>Has More: {hasMoreNotes ? 'Yes' : 'No'}</div>
        <div>Loading: {isLoadingNotes ? 'Yes' : 'No'}</div>
        {#if draggedNote}
          <div class="text-yellow-400 mt-2">Dragging: {draggedNote.title}</div>
          {#if draggedNote.dragPreviewPosition}
            <div>Drop at: {Math.round(draggedNote.dragPreviewPosition.x)}, {Math.round(draggedNote.dragPreviewPosition.y)}</div>
          {/if}
        {/if}
        <div class="text-dark-400 mt-2">View Bounds:</div>
        <div>L: {Math.round(visibleBounds.left)} R: {Math.round(visibleBounds.right)}</div>
        <div>T: {Math.round(visibleBounds.top)} B: {Math.round(visibleBounds.bottom)}</div>
        <div class="text-dark-400 mt-2">Canvas:</div>
        <div>Offset: {Math.round(canvasOffset.x)}, {Math.round(canvasOffset.y)}</div>
        <div>Scale: {Math.round(canvasScale * 100)}%</div>
      </div>
    {/if}

    <!-- Live Cursors and Collaboration -->
    {#if $collaborationStatus.connected}
      <LiveCursor 
        containerId="workspace-canvas"
        showUserNames={true}
        showSelections={false}
      />
    {/if}
    
    <!-- Infinite Loading Indicator -->
    {#if isLoadingNotes}
      <div class="absolute bottom-10 left-1/2 transform -translate-x-1/2 bg-dark-900/90 backdrop-blur-sm border border-dark-700 rounded-full px-4 py-2 flex items-center space-x-2">
        <div class="w-4 h-4 border-2 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
        <span class="text-sm text-white">Loading more notes...</span>
      </div>
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
    
    <!-- Load More Button -->
    {#if hasMoreNotes && !isLoadingNotes}
      <div class="bg-dark-900/90 backdrop-blur-sm border border-dark-800 rounded-lg p-2">
        <button
          class="w-full px-3 py-2 bg-primary-600 hover:bg-primary-700 text-white text-xs rounded transition-colors"
          on:click={loadMoreNotes}
          title="Load more notes"
        >
          Load More
        </button>
      </div>
    {/if}
    
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
  
  <!-- Chat Sidebar -->
  {#if showChatSidebar}
    <div class="w-80 bg-dark-900 border-l border-dark-800 flex flex-col flex-shrink-0" style="max-height: 100%">
      <!-- Chat Header -->
      <div class="p-3 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Workspace Chat</h3>
          <button
            on:click={() => showChatSidebar = false}
            class="text-dark-400 hover:text-white"
          >
            ×
          </button>
        </div>
        <p class="text-sm text-dark-400">
          {#if $isConnected}
            {$onlineUsers.length} users online
          {:else}
            Connecting...
          {/if}
        </p>
      </div>

      <!-- Chat Messages -->
      <div 
        bind:this={chatContainer}
        class="flex-1 overflow-y-auto p-4 space-y-1"
      >
        {#if !$isConnected}
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
              <p class="text-dark-400">Connecting...</p>
            </div>
          </div>
        {:else if $chatMessages.length === 0}
          <div class="flex items-center justify-center h-full">
            <div class="text-center">
              <div class="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg class="w-8 h-8 text-dark-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path>
                </svg>
              </div>
              <h3 class="text-lg font-medium text-white mb-2">No messages yet</h3>
              <p class="text-dark-400">Start the conversation!</p>
            </div>
          </div>
        {:else}
          {#each $chatMessages as message (message.id)}
            <div class="mb-4">
              <ChatMessage 
                {message} 
                currentUserId={$currentUser?.id || '1'}
              />
            </div>
          {/each}
        {/if}
      </div>

      <!-- Chat Input -->
      <div class="border-t border-dark-800 p-4">
        <div class="flex items-center space-x-2">
          <input
            bind:value={chatMessage}
            on:keydown={handleChatKeyPress}
            class="flex-1 input text-sm"
            placeholder="Type a message..."
            disabled={!$isConnected}
          />
          <button
            class="btn-primary px-3 py-2"
            on:click={sendChatMessage}
            disabled={!chatMessage.trim() || !$isConnected}
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
            </svg>
          </button>
        </div>
        
        <!-- Online Users -->
        {#if $onlineUsers.length > 0}
          <div class="mt-3">
            <p class="text-xs text-dark-400 mb-2">Online ({$onlineUsers.length})</p>
            <div class="flex flex-wrap gap-1">
              {#each $onlineUsers as user}
                <div class="flex items-center space-x-1 bg-dark-800 px-2 py-1 rounded text-xs">
                  <div class="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span class="text-dark-300">{user.displayName}</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>
  {/if}

  <!-- Collaborators Sidebar -->
  {#if showCollaboratorsSidebar}
    <div class="w-72 bg-dark-900 border-l border-dark-800 flex flex-col flex-shrink-0" style="max-height: 100%">
      <!-- Header -->
      <div class="p-3 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h3 class="text-lg font-semibold text-white">Collaborators</h3>
          <button
            on:click={() => showCollaboratorsSidebar = false}
            class="text-dark-400 hover:text-white"
            aria-label="Close collaborators sidebar"
          >
            ×
          </button>
        </div>
        <p class="text-sm text-dark-400">
          {#if $collaborationStatus.connected}
            {$onlineUserCount} online
          {:else}
            Connecting...
          {/if}
        </p>
      </div>

      <!-- Collaborators List -->
      <div class="flex-1 overflow-y-auto p-3">
        <CollaboratorsList
          {workspaceId}
          compact={false}
          maxVisible={50}
          showTypingIndicators={true}
        />
      </div>
    </div>
  {/if}
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
          
          {#if newNoteType === 'text' || newNoteType === 'rich'}
            <div class="flex items-center space-x-3">
              <label class="flex items-center text-sm text-dark-300">
                <input
                  type="checkbox"
                  bind:checked={aiEditorEnabled}
                  class="mr-2"
                />
                <span class="flex items-center">
                  <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
                  </svg>
                  Enable AI Writing Assistant
                </span>
              </label>
              <div class="text-xs text-dark-500">
                Get AI-powered suggestions, smart tags, and content analysis
              </div>
            </div>
          {/if}

          <div>
            <label for="content" class="block text-sm font-medium text-dark-300 mb-2">
              Content
            </label>
            {#if aiEditorEnabled && newNoteType === 'text' || newNoteType === 'rich'}
              <div class="border border-dark-700 rounded-lg overflow-hidden">
                <AIEnhancedEditor
                  bind:value={newNoteContent}
                  title={newNoteTitle}
                  workspaceId={workspaceId}
                  placeholder="Start writing your note... AI suggestions will appear as you type."
                  enableAISuggestions={true}
                  enableSmartTags={true}
                  enableContentAnalysis={true}
                  on:input={handleAIContentInput}
                  on:tags-generated={handleAITagsGenerated}
                />
              </div>
            {:else}
              <textarea
                id="content"
                bind:value={newNoteContent}
                class="input resize-none"
                rows="6"
                placeholder="Enter note content"
              ></textarea>
            {/if}
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
        <div class="mb-4 flex justify-end space-x-2">
          <button
            class="btn-secondary text-sm"
            on:click={() => handleEditNote(selectedNote)}
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Quick Edit
          </button>
          <a
            href="/notes/{selectedNote.id}/edit"
            class="btn-primary text-sm inline-flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
            </svg>
            AI Editor
          </a>
        </div>
        
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

<!-- Share Workspace Modal -->
{#if showShareModal && $currentWorkspace}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white flex items-center">
            <Share class="w-5 h-5 mr-2" />
            Share Workspace
          </h2>
          <button
            on:click={() => showShareModal = false}
            class="text-dark-400 hover:text-white transition-colors"
          >
            <Plus class="w-5 h-5 rotate-45" />
          </button>
        </div>
      </div>
      
      <div class="p-6">
        <div class="space-y-4">
          <!-- Share Link -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Share Link
            </label>
            <div class="flex">
              <input
                type="text"
                value="{window?.location?.origin || ''}/workspaces/{workspaceId}"
                readonly
                class="flex-1 p-3 bg-dark-800 border border-dark-700 rounded-l-lg text-white text-sm"
              />
              <button
                class="px-4 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-r-lg transition-colors"
                on:click={async () => {
                  try {
                    const shareUrl = `${window?.location?.origin || ''}/workspaces/${workspaceId}`;
                    await navigator.clipboard.writeText(shareUrl);
                    // You could add a toast notification here if you have one
                    alert('Link copied to clipboard!');
                  } catch (err) {
                    console.error('Failed to copy:', err);
                    alert('Failed to copy link to clipboard');
                  }
                }}
              >
                Copy
              </button>
            </div>
          </div>
          
          <!-- Share Options -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Share Options
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input type="checkbox" class="mr-2" checked />
                <span class="text-sm text-white">Allow view access</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" class="mr-2" />
                <span class="text-sm text-white">Allow edit access</span>
              </label>
              <label class="flex items-center">
                <input type="checkbox" class="mr-2" />
                <span class="text-sm text-white">Require login</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-6 border-t border-dark-800">
        <div class="flex items-center justify-end space-x-3">
          <button
            type="button"
            class="btn-secondary"
            on:click={() => showShareModal = false}
          >
            Close
          </button>
          <button 
            class="btn-primary"
            on:click={async () => {
              const shareUrl = `${window?.location?.origin || ''}/workspaces/${workspaceId}`;
              
              if (navigator.share) {
                try {
                  await navigator.share({
                    title: $currentWorkspace?.name || 'Workspace',
                    text: `Check out this workspace: ${$currentWorkspace?.name || 'Workspace'}`,
                    url: shareUrl
                  });
                } catch (err) {
                  if (err.name !== 'AbortError') {
                    console.error('Share failed:', err);
                    alert('Failed to share workspace');
                  }
                }
              } else {
                // Fallback to copying to clipboard
                try {
                  await navigator.clipboard.writeText(shareUrl);
                  alert('Link copied to clipboard!');
                } catch (err) {
                  console.error('Failed to copy:', err);
                  alert('Failed to copy link to clipboard');
                }
              }
              
              showShareModal = false;
            }}
          >
            <Share class="w-4 h-4 mr-2" />
            Share
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Workspace Settings Modal -->
{#if showSettingsModal && $currentWorkspace}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-lg">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white flex items-center">
            <Settings class="w-5 h-5 mr-2" />
            Workspace Settings
          </h2>
          <button
            on:click={() => showSettingsModal = false}
            class="text-dark-400 hover:text-white transition-colors"
          >
            <Plus class="w-5 h-5 rotate-45" />
          </button>
        </div>
      </div>
      
      <div class="p-6">
        <div class="space-y-4">
          <!-- Workspace Name -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Workspace Name
            </label>
            <input
              type="text"
              bind:value={settingsForm.name}
              class="w-full p-3 bg-dark-800 border border-dark-700 rounded-lg text-white"
              placeholder="Enter workspace name"
              required
            />
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Description
            </label>
            <textarea
              bind:value={settingsForm.description}
              class="w-full p-3 bg-dark-800 border border-dark-700 rounded-lg text-white h-24 resize-none"
              placeholder="Enter workspace description"
            ></textarea>
          </div>
          
          <!-- Color -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Color Theme
            </label>
            <div class="flex space-x-2">
              {#each ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899'] as color}
                <button
                  class="w-8 h-8 rounded-full border-2 {settingsForm.color === color ? 'border-white' : 'border-dark-600'}"
                  style="background-color: {color}"
                  on:click={() => settingsForm.color = color}
                ></button>
              {/each}
            </div>
          </div>
          
          <!-- Privacy -->
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Privacy
            </label>
            <div class="space-y-2">
              <label class="flex items-center">
                <input 
                  type="radio" 
                  name="privacy"
                  bind:group={settingsForm.isPublic}
                  value={false}
                  class="mr-2" 
                />
                <span class="text-sm text-white">Private - Only invited members can access</span>
              </label>
              <label class="flex items-center">
                <input 
                  type="radio" 
                  name="privacy"
                  bind:group={settingsForm.isPublic}
                  value={true}
                  class="mr-2" 
                />
                <span class="text-sm text-white">Public - Anyone with the link can view</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      <div class="p-6 border-t border-dark-800">
        <div class="flex items-center justify-between">
          <button 
            class="text-red-400 hover:text-red-300 text-sm transition-colors"
            on:click={deleteWorkspace}
          >
            Delete Workspace
          </button>
          <div class="flex items-center space-x-3">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => showSettingsModal = false}
            >
              Cancel
            </button>
            <button 
              class="btn-primary" 
              on:click={saveWorkspaceSettings}
              disabled={settingsSaving || !settingsForm.name.trim()}
            >
              {#if settingsSaving}
                <div class="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Saving...
              {:else}
                <Save class="w-4 h-4 mr-2" />
                Save Changes
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Note Edit Modal with AI-Enhanced Editor -->
{#if showEditModal && editingNote}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" transition:fade>
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <h2 class="text-xl font-semibold text-white flex items-center">
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
            </svg>
            Edit Note: {editingNote.title}
          </h2>
          <button
            class="text-dark-400 hover:text-white"
            on:click={() => showEditModal = false}
            aria-label="Close editor"
            title="Close"
          >
            ×
          </button>
        </div>
        <div class="mt-2 flex items-center text-sm text-dark-400">
          <span class="mr-4">Type: {editingNote.type}</span>
          <span class="mr-4">Last edited: {new Intl.DateTimeFormat('en-US', { 
            dateStyle: 'short', 
            timeStyle: 'short' 
          }).format(new Date(editingNote.updatedAt))}</span>
          <div class="flex items-center space-x-2">
            <label class="flex items-center">
              <input
                type="checkbox"
                bind:checked={aiEditorEnabled}
                class="mr-1"
              />
              <span class="text-xs">AI Assistance</span>
            </label>
          </div>
        </div>
      </div>
      
      <div class="p-6 overflow-y-auto flex-1">
        {#if aiEditorEnabled && (editingNote.type === 'text' || editingNote.type === 'rich')}
          <AIEnhancedEditor
            bind:value={editingContent}
            title={editingNote.title}
            noteId={editingNote.id}
            workspaceId={workspaceId}
            placeholder="Edit your note content... AI suggestions will help improve your writing."
            enableAISuggestions={true}
            enableSmartTags={true}
            enableContentAnalysis={true}
            on:input={handleAIContentInput}
            on:tags-generated={handleAITagsGenerated}
            on:suggestion-applied={(event) => {
              console.log('AI suggestion applied:', event.detail.suggestion);
            }}
            on:template-applied={(event) => {
              console.log('Template applied:', event.detail.template);
            }}
            on:analysis-completed={(event) => {
              console.log('Content analysis completed:', event.detail.analysis);
            }}
          />
        {:else}
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">
              Content
            </label>
            {#if editingNote.type === 'code'}
              <textarea
                bind:value={editingContent}
                class="w-full h-96 p-4 bg-dark-800 border border-dark-700 rounded-lg text-green-400 font-mono text-sm resize-none"
                placeholder="Edit your code..."
              ></textarea>
            {:else}
              <textarea
                bind:value={editingContent}
                class="w-full h-96 p-4 bg-dark-800 border border-dark-700 rounded-lg text-white resize-none"
                placeholder="Edit your note content..."
              ></textarea>
            {/if}
          </div>
        {/if}
      </div>
      
      <div class="p-6 border-t border-dark-800">
        <div class="flex items-center justify-between">
          <div class="text-sm text-dark-400">
            <span>Tags: </span>
            {#each editingNote.tags || [] as tag}
              <span class="inline-block px-2 py-1 bg-dark-800 rounded-full text-xs mr-1 mb-1">#{tag}</span>
            {/each}
          </div>
          
          <div class="flex items-center space-x-3">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => showEditModal = false}
            >
              Cancel
            </button>
            <button 
              class="btn-primary"
              on:click={handleSaveEditedNote}
            >
              <Save class="w-4 h-4 mr-2" />
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
{/if}