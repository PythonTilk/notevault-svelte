<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { slide } from 'svelte/transition';
  import { Mic, Camera, Share, Save } from 'lucide-svelte';
  import AIEnhancedEditor from '$lib/components/AIEnhancedEditor.svelte';
  import enhancedPWA from '$lib/mobile/enhanced-pwa.js';

  const dispatch = createEventDispatcher();

  export let value = '';
  export let title = '';
  export let noteId = '';
  export let workspaceId = '';
  export let enableVoiceInput = true;
  export let enableCameraCapture = true;
  export let enableAdvancedShare = true;

  let isVoiceInputActive = false;
  let voiceTranscript = '';
  let showMobileToolbar = true;
  let wakeLockActive = false;

  onMount(() => {
    // Request wake lock for long editing sessions
    if (enhancedPWA.wakeLock) {
      enhancedPWA.wakeLock.request();
      wakeLockActive = true;
    }

    return () => {
      // Release wake lock when component unmounts
      if (wakeLockActive && enhancedPWA.wakeLock) {
        enhancedPWA.wakeLock.release();
      }
    };
  });

  async function startVoiceInput() {
    if (!enhancedPWA.voiceInput || isVoiceInputActive) return;

    try {
      isVoiceInputActive = true;
      
      enhancedPWA.voiceInput.start((result) => {
        if (result.type === 'result') {
          voiceTranscript = result.transcript;
          if (result.isFinal) {
            // Append voice input to editor content
            value = value + (value ? ' ' : '') + result.transcript;
            voiceTranscript = '';
            dispatch('voice-input', { transcript: result.transcript });
          }
        } else if (result.type === 'end' || result.type === 'error') {
          isVoiceInputActive = false;
          voiceTranscript = '';
        }
      }, {
        continuous: true,
        interimResults: true
      });
    } catch (error) {
      console.error('Voice input failed:', error);
      isVoiceInputActive = false;
    }
  }

  function stopVoiceInput() {
    if (enhancedPWA.voiceInput) {
      enhancedPWA.voiceInput.stop();
      isVoiceInputActive = false;
      voiceTranscript = '';
    }
  }

  async function captureImage() {
    if (!enhancedPWA.camera) return;

    try {
      const stream = await enhancedPWA.camera.captureDocument();
      
      // Create a video element to display the camera feed
      const video = document.createElement('video');
      video.srcObject = stream;
      video.autoplay = true;
      video.playsInline = true;
      
      // Create camera capture modal
      showCameraModal(video, stream);
      
    } catch (error) {
      console.error('Camera capture failed:', error);
      if (enhancedPWA.notifications) {
        enhancedPWA.notifications.showRichNotification(
          'Camera Access Denied',
          {
            body: 'Please allow camera access to capture images',
            tag: 'camera-error'
          }
        );
      }
    }
  }

  function showCameraModal(video, stream) {
    // Create camera capture UI
    const modal = document.createElement('div');
    modal.className = 'camera-modal';
    modal.innerHTML = `
      <div class="camera-container">
        <div class="camera-header">
          <button class="camera-close">Cancel</button>
          <h3>Capture Document</h3>
          <button class="camera-capture">Capture</button>
        </div>
        <div class="camera-preview"></div>
        <div class="camera-controls">
          <button class="camera-flip">Flip</button>
          <button class="camera-flash">Flash</button>
        </div>
      </div>
    `;

    const previewContainer = modal.querySelector('.camera-preview');
    previewContainer.appendChild(video);

    // Handle capture
    modal.querySelector('.camera-capture').onclick = async () => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0);
      
      // Convert to blob
      canvas.toBlob((blob) => {
        const file = new File([blob], `document-${Date.now()}.jpg`, { type: 'image/jpeg' });
        dispatch('image-captured', { file, blob });
        
        // Haptic feedback
        if (enhancedPWA.haptic) {
          enhancedPWA.haptic.success();
        }
        
        // Clean up
        stream.getTracks().forEach(track => track.stop());
        modal.remove();
      }, 'image/jpeg', 0.8);
    };

    // Handle close
    modal.querySelector('.camera-close').onclick = () => {
      stream.getTracks().forEach(track => track.stop());
      modal.remove();
    };

    document.body.appendChild(modal);
  }

  async function shareContent() {
    if (!enhancedPWA.sharing) return;

    const noteData = {
      id: noteId,
      title: title || 'Untitled Note',
      content: value
    };

    const shared = await enhancedPWA.sharing.shareNote(noteData);
    
    if (shared && enhancedPWA.haptic) {
      enhancedPWA.haptic.success();
    }

    dispatch('content-shared', { shared, noteData });
  }

  function handleSave() {
    // Haptic feedback on save
    if (enhancedPWA.haptic) {
      enhancedPWA.haptic.medium();
    }
    dispatch('save');
  }

  // Handle mobile-specific gestures
  function handleGestures(element) {
    if (!enhancedPWA.gestures) return;

    // Double-tap to focus
    enhancedPWA.gestures.doubleTap(element, () => {
      element.focus();
    });

    // Long-press for voice input
    enhancedPWA.gestures.longPress(element, () => {
      if (enableVoiceInput && !isVoiceInputActive) {
        startVoiceInput();
      }
    });

    // Swipe gestures
    enhancedPWA.gestures.swipe(element, {
      up: () => showMobileToolbar = false,
      down: () => showMobileToolbar = true
    });
  }
</script>

<div class="mobile-enhanced-editor">
  <!-- Mobile Toolbar -->
  {#if showMobileToolbar}
    <div class="mobile-toolbar" transition:slide={{ duration: 200 }}>
      <div class="mobile-toolbar-content">
        <!-- Voice Input -->
        {#if enableVoiceInput && enhancedPWA.isSupported.speechRecognition}
          <button
            class="mobile-tool-btn"
            class:active={isVoiceInputActive}
            on:click={isVoiceInputActive ? stopVoiceInput : startVoiceInput}
            title={isVoiceInputActive ? 'Stop voice input' : 'Start voice input'}
          >
            <Mic class="w-5 h-5" />
            {#if isVoiceInputActive}
              <div class="voice-indicator"></div>
            {/if}
          </button>
        {/if}

        <!-- Camera Capture -->
        {#if enableCameraCapture && enhancedPWA.isSupported.getUserMedia}
          <button
            class="mobile-tool-btn"
            on:click={captureImage}
            title="Capture document"
          >
            <Camera class="w-5 h-5" />
          </button>
        {/if}

        <!-- Share -->
        {#if enableAdvancedShare && enhancedPWA.isSupported.webShare}
          <button
            class="mobile-tool-btn"
            on:click={shareContent}
            title="Share note"
          >
            <Share class="w-5 h-5" />
          </button>
        {/if}

        <!-- Save -->
        <button
          class="mobile-tool-btn primary"
          on:click={handleSave}
          title="Save note"
        >
          <Save class="w-5 h-5" />
        </button>
      </div>

      <!-- Voice Input Status -->
      {#if isVoiceInputActive && voiceTranscript}
        <div class="voice-transcript">
          <span class="voice-label">🎤 Listening:</span>
          <span class="voice-text">{voiceTranscript}</span>
        </div>
      {/if}
    </div>
  {/if}

  <!-- Enhanced Editor -->
  <div class="editor-container" use:handleGestures>
    <AIEnhancedEditor
      bind:value={value}
      {title}
      {noteId}
      {workspaceId}
      placeholder="Start writing... Long-press for voice input, double-tap to focus"
      enableAISuggestions={true}
      enableSmartTags={true}
      enableContentAnalysis={true}
      on:input
      on:tags-generated
      on:suggestion-applied
      on:template-applied
      on:analysis-completed
    />
  </div>

  <!-- Mobile-specific UI hints -->
  <div class="mobile-hints">
    <div class="gesture-hints">
      <div class="hint-item">
        <span class="hint-icon">👆👆</span>
        <span class="hint-text">Double-tap to focus</span>
      </div>
      <div class="hint-item">
        <span class="hint-icon">👆⏰</span>
        <span class="hint-text">Long-press for voice</span>
      </div>
      <div class="hint-item">
        <span class="hint-icon">👆↕️</span>
        <span class="hint-text">Swipe to hide toolbar</span>
      </div>
    </div>
  </div>
</div>

<style>
  .mobile-enhanced-editor {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: var(--color-bg-primary);
  }

  .mobile-toolbar {
    background: var(--color-bg-secondary);
    border-bottom: 1px solid var(--color-border);
    padding: 0.75rem;
    z-index: 10;
  }

  .mobile-toolbar-content {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    align-items: center;
    max-width: 100%;
    overflow-x: auto;
    padding-bottom: 0.25rem;
  }

  .mobile-tool-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 48px;
    height: 48px;
    border: 1px solid var(--color-border);
    border-radius: 0.75rem;
    background: var(--color-bg-primary);
    color: var(--color-text-secondary);
    transition: all 0.2s ease;
    position: relative;
    touch-action: manipulation;
  }

  .mobile-tool-btn:hover,
  .mobile-tool-btn:active {
    background: var(--color-bg-hover);
    transform: scale(0.95);
  }

  .mobile-tool-btn.active {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .mobile-tool-btn.primary {
    background: var(--color-primary);
    color: white;
    border-color: var(--color-primary);
  }

  .voice-indicator {
    position: absolute;
    top: -2px;
    right: -2px;
    width: 12px;
    height: 12px;
    background: #ef4444;
    border-radius: 50%;
    animation: pulse 1.5s infinite;
  }

  .voice-transcript {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: var(--color-bg-tertiary);
    border-radius: 0.5rem;
    border-left: 3px solid var(--color-primary);
  }

  .voice-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--color-primary);
    margin-right: 0.5rem;
  }

  .voice-text {
    font-size: 0.875rem;
    color: var(--color-text-primary);
    font-style: italic;
  }

  .editor-container {
    flex: 1;
    overflow: hidden;
  }

  .mobile-hints {
    position: fixed;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 5;
    pointer-events: none;
  }

  .gesture-hints {
    display: flex;
    gap: 1rem;
    background: rgba(0, 0, 0, 0.8);
    backdrop-filter: blur(10px);
    padding: 0.5rem 1rem;
    border-radius: 2rem;
    animation: fadeInUp 0.5s ease;
  }

  .hint-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.25rem;
  }

  .hint-icon {
    font-size: 1rem;
  }

  .hint-text {
    font-size: 0.625rem;
    color: white;
    font-weight: 500;
    text-align: center;
    white-space: nowrap;
  }

  /* Camera Modal Styles */
  :global(.camera-modal) {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: black;
    z-index: 1000;
    display: flex;
    flex-direction: column;
  }

  :global(.camera-container) {
    display: flex;
    flex-direction: column;
    height: 100%;
  }

  :global(.camera-header) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 1rem;
    background: rgba(0, 0, 0, 0.8);
    color: white;
  }

  :global(.camera-preview) {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  :global(.camera-preview video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  :global(.camera-controls) {
    display: flex;
    justify-content: center;
    gap: 2rem;
    padding: 2rem;
    background: rgba(0, 0, 0, 0.8);
  }

  :global(.camera-close),
  :global(.camera-capture),
  :global(.camera-flip),
  :global(.camera-flash) {
    padding: 0.75rem 1.5rem;
    border: 1px solid rgba(255, 255, 255, 0.3);
    border-radius: 0.5rem;
    background: rgba(255, 255, 255, 0.1);
    color: white;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  :global(.camera-capture) {
    background: #3b82f6;
    border-color: #3b82f6;
  }

  /* Animations */
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.3; }
  }

  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translateX(-50%) translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateX(-50%) translateY(0);
    }
  }

  /* Mobile-specific optimizations */
  @media (max-width: 768px) {
    .mobile-toolbar-content {
      justify-content: flex-start;
      padding-left: 0.5rem;
      padding-right: 0.5rem;
    }

    .mobile-tool-btn {
      min-width: 44px;
      height: 44px;
    }

    .gesture-hints {
      scale: 0.9;
    }

    .hint-text {
      font-size: 0.5rem;
    }
  }

  /* High contrast mode support */
  @media (prefers-contrast: high) {
    .mobile-tool-btn {
      border-width: 2px;
    }
    
    .voice-transcript {
      border-left-width: 4px;
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mobile-tool-btn,
    .voice-indicator,
    .gesture-hints {
      animation: none;
      transition: none;
    }
  }
</style>