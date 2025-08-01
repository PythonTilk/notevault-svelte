<script lang="ts">
  import { onMount, onDestroy, createEventDispatcher } from 'svelte';
  import { 
    updateCursor, 
    updateSelection, 
    sendDocumentUpdate, 
    startTyping, 
    stopTyping,
    selections,
    activeUsers
  } from '$lib/stores/collaboration.js';
  import LiveCursors from './LiveCursors.svelte';

  export let content = '';
  export let placeholder = 'Start typing...';
  export let readonly = false;
  export let elementId = 'editor';

  const dispatch = createEventDispatcher();

  let editor: HTMLTextAreaElement;
  let isTyping = false;
  let typingTimeout: NodeJS.Timeout;
  let cursorTrackingEnabled = true;

  // Track user selections for highlighting
  $: userSelections = Array.from($selections.values()).filter(selection => 
    selection.element === elementId
  );

  onMount(() => {
    if (editor) {
      setupEditor();
    }
  });

  onDestroy(() => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    if (isTyping) {
      stopTyping(elementId);
    }
  });

  function setupEditor() {
    if (!editor) return;

    // Track cursor movements
    editor.addEventListener('mousemove', handleMouseMove);
    editor.addEventListener('click', handleClick);
    editor.addEventListener('selectionchange', handleSelectionChange);
    
    // Track typing
    editor.addEventListener('input', handleInput);
    editor.addEventListener('keydown', handleKeyDown);
    editor.addEventListener('keyup', handleKeyUp);
    
    // Focus/blur events
    editor.addEventListener('focus', handleFocus);
    editor.addEventListener('blur', handleBlur);
  }

  function handleMouseMove(event: MouseEvent) {
    if (!cursorTrackingEnabled) return;
    
    updateCursor(event.clientX, event.clientY, elementId);
  }

  function handleClick(event: MouseEvent) {
    handleSelectionChange();
    updateCursor(event.clientX, event.clientY, elementId);
  }

  function handleSelectionChange() {
    if (!editor) return;
    
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    
    if (start !== end) {
      // User has selected text
      updateSelection({ start, end }, elementId);
    } else {
      // No selection
      updateSelection(null, elementId);
    }
  }

  function handleInput(event: InputEvent) {
    content = editor.value;
    dispatch('input', { content, event });
    
    // Send document changes for real-time collaboration
    sendDocumentUpdate({
      type: 'insert',
      position: editor.selectionStart,
      content: event.data,
      timestamp: Date.now()
    }, elementId);
    
    // Start typing indicator
    if (!isTyping) {
      isTyping = true;
      startTyping(elementId);
    }
    
    // Reset typing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    typingTimeout = setTimeout(() => {
      isTyping = false;
      stopTyping(elementId);
    }, 1000);
  }

  function handleKeyDown(event: KeyboardEvent) {
    // Handle special keys for collaboration
    if (event.key === 'Backspace' || event.key === 'Delete') {
      const start = editor.selectionStart;
      const end = editor.selectionEnd;
      
      sendDocumentUpdate({
        type: 'delete',
        start,
        end: end || start + 1,
        timestamp: Date.now()
      }, elementId);
    }
  }

  function handleKeyUp(event: KeyboardEvent) {
    // Update cursor position after key navigation
    const rect = editor.getBoundingClientRect();
    updateCursor(rect.left + 10, rect.top + 10, elementId);
  }

  function handleFocus() {
    cursorTrackingEnabled = true;
  }

  function handleBlur() {
    cursorTrackingEnabled = false;
    if (isTyping) {
      isTyping = false;
      stopTyping(elementId);
    }
  }

  // Get selection highlight style
  function getSelectionStyle(selection) {
    const user = $activeUsers.get(selection.userId);
    return {
      backgroundColor: user?.color + '30', // 30% opacity
      borderLeft: `2px solid ${user?.color}`
    };
  }

  // Convert text position to pixel coordinates (simplified)
  function getTextPosition(position: number) {
    if (!editor) return { top: 0, left: 0 };
    
    const text = editor.value.substring(0, position);
    const lines = text.split('\n');
    const lineHeight = 20; // Approximate line height
    const charWidth = 8; // Approximate character width
    
    return {
      top: (lines.length - 1) * lineHeight,
      left: (lines[lines.length - 1]?.length || 0) * charWidth
    };
  }
</script>

<div class="collaborative-editor relative">
  <!-- Selection Highlights -->
  <div class="absolute inset-0 pointer-events-none z-10">
    {#each userSelections as selection}
      {@const user = $activeUsers.get(selection.userId)}
      {@const startPos = getTextPosition(selection.start)}
      {@const endPos = getTextPosition(selection.end)}
      
      {#if user}
        <div
          class="absolute border-l-2 opacity-30"
          style="
            top: {startPos.top}px;
            left: {startPos.left}px;
            width: {endPos.left - startPos.left}px;
            height: {Math.max(20, (endPos.top - startPos.top) + 20)}px;
            background-color: {user.color}30;
            border-color: {user.color};
          "
          title="{user.displayName || user.username} selected this text"
        ></div>
      {/if}
    {/each}
  </div>

  <!-- Editor Textarea -->
  <textarea
    bind:this={editor}
    bind:value={content}
    {placeholder}
    {readonly}
    class="collaborative-textarea w-full h-full p-4 bg-transparent text-white resize-none focus:outline-none relative z-20"
    style="font-family: 'JetBrains Mono', 'Fira Code', monospace; line-height: 1.5;"
  ></textarea>

  <!-- Live Cursors Overlay -->
  <LiveCursors />

  <!-- User Selection Labels -->
  <div class="absolute inset-0 pointer-events-none z-30">
    {#each userSelections as selection}
      {@const user = $activeUsers.get(selection.userId)}
      {@const pos = getTextPosition(selection.start)}
      
      {#if user}
        <div
          class="absolute px-2 py-1 text-xs font-medium text-white rounded shadow-lg"
          style="
            top: {pos.top - 25}px;
            left: {pos.left}px;
            background-color: {user.color};
          "
        >
          {user.displayName || user.username}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .collaborative-editor {
    position: relative;
    overflow: hidden;
  }

  .collaborative-textarea {
    background: transparent;
    border: none;
    outline: none;
    font-size: 14px;
    line-height: 1.5;
    tab-size: 2;
    white-space: pre-wrap;
    word-wrap: break-word;
  }

  .collaborative-textarea:focus {
    outline: none;
  }

  /* Selection styling */
  .collaborative-textarea::selection {
    background-color: rgba(59, 130, 246, 0.3);
  }

  /* Smooth transitions for highlights */
  .collaborative-editor div[style*="background-color"] {
    transition: all 0.2s ease;
  }
</style>