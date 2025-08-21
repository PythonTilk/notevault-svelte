<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';
  import { Save, ArrowLeft, FileText, BarChart3, Settings, Lightbulb } from 'lucide-svelte';
  import { currentUser } from '$lib/stores/auth';
  import { workspaceStore } from '$lib/stores/workspaces';
  import AIEnhancedEditor from '$lib/components/AIEnhancedEditor.svelte';
  import MobileEnhancedEditor from '$lib/components/mobile/MobileEnhancedEditor.svelte';
  import TagInput from '$lib/components/TagInput.svelte';
  import type { Note } from '$lib/types';

  let noteId: string;
  let note: Note | null = null;
  let loading = true;
  let saving = false;
  let error: string | null = null;
  
  // Editor state
  let content = '';
  let title = '';
  let tags: string[] = [];
  let isPublic = false;
  
  // AI settings
  let aiEnabled = true;
  let showAnalysis = false;
  let showSuggestions = true;
  let autoSuggest = true;
  
  // Device detection
  let isMobile = false;
  let isTablet = false;
  
  // Editor stats
  let editorStats = {
    wordCount: 0,
    characterCount: 0,
    estimatedReadTime: 0,
    aiSuggestionsUsed: 0,
    templatesApplied: 0
  };

  $: noteId = $page.params.id;

  onMount(async () => {
    try {
      // Detect device type
      const userAgent = navigator.userAgent;
      isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);
      
      // Load the note
      const noteData = await workspaceStore.getNote(noteId);
      if (!noteData) {
        error = 'Note not found';
        return;
      }
      
      note = noteData;
      content = note.content;
      title = note.title;
      tags = note.tags || [];
      isPublic = note.isPublic || false;
      
    } catch (err) {
      console.error('Failed to load note:', err);
      error = 'Failed to load note';
    } finally {
      loading = false;
    }
  });

  async function saveNote() {
    if (!note) return;
    
    try {
      saving = true;
      
      await workspaceStore.updateNote(note.id, {
        title,
        content,
        tags,
        isPublic
      });
      
      // Show success feedback
      const notification = document.createElement('div');
      notification.className = 'fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg z-50';
      notification.textContent = 'Note saved successfully!';
      document.body.appendChild(notification);
      
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 3000);
      
    } catch (err) {
      console.error('Failed to save note:', err);
      error = 'Failed to save note';
    } finally {
      saving = false;
    }
  }

  function goBack() {
    if (note) {
      goto(`/workspaces/${note.workspaceId}`);
    } else {
      goto('/');
    }
  }

  function handleContentChange(event: CustomEvent<{ value: string }>) {
    content = event.detail.value;
    updateEditorStats();
  }
  
  function updateEditorStats() {
    const words = content.split(/\s+/).filter(word => word.length > 0);
    editorStats.wordCount = words.length;
    editorStats.characterCount = content.length;
    editorStats.estimatedReadTime = Math.max(1, Math.ceil(words.length / 200));
  }

  function handleTagsGenerated(event: CustomEvent<{ tags: string[] }>) {
    // Merge AI-generated tags with existing tags
    const newTags = [...new Set([...tags, ...event.detail.tags])];
    tags = newTags;
  }

  function handleSuggestionApplied(event: CustomEvent<{ suggestion: any }>) {
    editorStats.aiSuggestionsUsed += 1;
    console.log('AI suggestion applied:', event.detail.suggestion);
  }

  function handleTemplateApplied(event: CustomEvent<{ template: any }>) {
    editorStats.templatesApplied += 1;
    console.log('Template applied:', event.detail.template);
  }

  function handleAnalysisCompleted(event: CustomEvent<{ analysis: any }>) {
    console.log('Content analysis completed:', event.detail.analysis);
  }

  // Auto-save functionality
  let autoSaveTimeout: number;
  $: if (content && title && !saving) {
    clearTimeout(autoSaveTimeout);
    autoSaveTimeout = setTimeout(() => {
      if (!saving) {
        console.log('Auto-saving...');
        saveNote();
      }
    }, 3000);
  }

  // Keyboard shortcuts
  function handleKeydown(event: KeyboardEvent) {
    if (event.ctrlKey || event.metaKey) {
      if (event.key === 's') {
        event.preventDefault();
        saveNote();
      }
    }
  }
</script>

<svelte:head>
  <title>Edit Note: {title || 'Untitled'} - NoteVault</title>
</svelte:head>

<svelte:window on:keydown={handleKeydown} />

{#if loading}
  <div class="min-h-screen bg-dark-950 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
      <p class="text-dark-400">Loading note...</p>
    </div>
  </div>
{:else if error}
  <div class="min-h-screen bg-dark-950 flex items-center justify-center">
    <div class="text-center">
      <div class="text-red-400 text-6xl mb-4">⚠️</div>
      <h1 class="text-xl font-semibold text-white mb-2">Error Loading Note</h1>
      <p class="text-dark-400 mb-4">{error}</p>
      <button class="btn-primary" on:click={goBack}>
        <ArrowLeft class="w-4 h-4 mr-2" />
        Go Back
      </button>
    </div>
  </div>
{:else if note}
  <div class="min-h-screen bg-dark-950 flex flex-col">
    <!-- Header -->
    <header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <button
            class="btn-ghost p-2"
            on:click={goBack}
            title="Back to workspace"
          >
            <ArrowLeft class="w-5 h-5" />
          </button>
          
          <div class="flex items-center space-x-3">
            <FileText class="w-6 h-6 text-primary-400" />
            <div>
              <input
                bind:value={title}
                class="bg-transparent text-xl font-semibold text-white border-none outline-none focus:bg-dark-800 rounded px-2 py-1 transition-colors"
                placeholder="Untitled note"
              />
              <div class="text-sm text-dark-400">
                Last saved: {new Intl.DateTimeFormat('en-US', {
                  dateStyle: 'short',
                  timeStyle: 'short'
                }).format(new Date(note.updatedAt))}
              </div>
            </div>
          </div>
        </div>

        <div class="flex items-center space-x-3">
          <!-- AI Settings Dropdown -->
          <div class="relative">
            <button
              class="btn-ghost p-2 {aiEnabled ? 'text-primary-400' : ''}"
              title="AI settings"
            >
              <Lightbulb class="w-5 h-5" />
            </button>
          </div>

          <!-- Analytics Toggle -->
          <button
            class="btn-ghost p-2 {showAnalysis ? 'text-primary-400' : ''}"
            on:click={() => showAnalysis = !showAnalysis}
            title="Toggle content analysis"
          >
            <BarChart3 class="w-5 h-5" />
          </button>

          <!-- Settings -->
          <button class="btn-ghost p-2" title="Note settings">
            <Settings class="w-5 h-5" />
          </button>

          <!-- Save Button -->
          <button
            class="btn-primary"
            class:opacity-50={saving}
            disabled={saving}
            on:click={saveNote}
          >
            <Save class="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      <!-- Note metadata -->
      <div class="mt-4 flex items-center justify-between">
        <div class="flex items-center space-x-4">
          <div class="text-sm text-dark-400">
            Type: <span class="text-dark-300">{note.type}</span>
          </div>
          <div class="text-sm text-dark-400">
            Words: <span class="text-dark-300">{editorStats.wordCount}</span>
          </div>
          <div class="text-sm text-dark-400">
            Read time: <span class="text-dark-300">{editorStats.estimatedReadTime} min</span>
          </div>
          {#if editorStats.aiSuggestionsUsed > 0}
            <div class="text-sm text-primary-400">
              AI suggestions used: {editorStats.aiSuggestionsUsed}
            </div>
          {/if}
        </div>

        <div class="flex items-center space-x-2">
          <label class="flex items-center text-sm text-dark-400">
            <input
              type="checkbox"
              bind:checked={isPublic}
              class="mr-2"
            />
            Public note
          </label>
        </div>
      </div>
    </header>

    <!-- Main Editor Area -->
    <div class="flex-1 flex overflow-hidden">
      <!-- Editor -->
      <div class="flex-1 flex flex-col overflow-hidden">
        <div class="flex-1 p-6">
          {#if isMobile && aiEnabled && (note.type === 'text' || note.type === 'rich')}
            <MobileEnhancedEditor
              bind:value={content}
              title={title}
              noteId={note.id}
              workspaceId={note.workspaceId}
              enableVoiceInput={true}
              enableCameraCapture={true}
              enableAdvancedShare={true}
              on:input={handleContentChange}
              on:tags-generated={handleTagsGenerated}
              on:suggestion-applied={handleSuggestionApplied}
              on:template-applied={handleTemplateApplied}
              on:analysis-completed={handleAnalysisCompleted}
              on:voice-input={(e) => console.log('Voice input:', e.detail.transcript)}
              on:image-captured={(e) => console.log('Image captured:', e.detail.file)}
              on:content-shared={(e) => console.log('Content shared:', e.detail.shared)}
              on:save={saveNote}
            />
          {:else if aiEnabled && (note.type === 'text' || note.type === 'rich')}
            <AIEnhancedEditor
              bind:value={content}
              title={title}
              noteId={note.id}
              workspaceId={note.workspaceId}
              placeholder="Start writing... AI suggestions will help improve your content."
              enableAISuggestions={showSuggestions}
              enableSmartTags={true}
              enableContentAnalysis={showAnalysis}
              on:input={handleContentChange}
              on:tags-generated={handleTagsGenerated}
              on:suggestion-applied={handleSuggestionApplied}
              on:template-applied={handleTemplateApplied}
              on:analysis-completed={handleAnalysisCompleted}
            />
          {:else}
            <!-- Fallback traditional editor -->
            <div class="h-full border border-dark-700 rounded-lg overflow-hidden">
              <div class="bg-dark-800 px-4 py-2 border-b border-dark-700">
                <div class="flex items-center justify-between text-sm text-dark-400">
                  <span>Traditional Editor</span>
                  <button
                    class="text-primary-400 hover:text-primary-300"
                    on:click={() => aiEnabled = true}
                  >
                    Enable AI Assistant
                  </button>
                </div>
              </div>
              <textarea
                bind:value={content}
                class="w-full h-full p-4 bg-dark-900 text-white resize-none border-none outline-none"
                placeholder="Start writing your note..."
                style="min-height: 500px;"
              ></textarea>
            </div>
          {/if}
        </div>

        <!-- Tags Section -->
        <div class="border-t border-dark-800 p-6">
          <div class="flex items-center justify-between">
            <div class="flex-1 mr-6">
              <label class="block text-sm font-medium text-dark-300 mb-2">
                Tags
              </label>
              <TagInput
                bind:tags={tags}
                placeholder="Add tags to categorize your note"
                maxTags={10}
                on:change={(e) => tags = e.detail.tags}
              />
            </div>
            
            {#if aiEnabled}
              <div class="text-center">
                <div class="text-xs text-dark-400 mb-2">AI Generated</div>
                <div class="flex items-center space-x-2">
                  <div class="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span class="text-xs text-dark-400">Smart tagging active</span>
                </div>
              </div>
            {/if}
          </div>
        </div>
      </div>

      <!-- Analysis Sidebar (when enabled) -->
      {#if showAnalysis}
        <div class="w-80 bg-dark-900 border-l border-dark-800 overflow-y-auto">
          <div class="p-4 border-b border-dark-800">
            <h3 class="text-lg font-semibold text-white flex items-center">
              <BarChart3 class="w-5 h-5 mr-2" />
              Content Analysis
            </h3>
            <p class="text-sm text-dark-400 mt-1">AI-powered insights about your content</p>
          </div>
          
          <div class="p-4 space-y-4">
            <div>
              <h4 class="font-medium text-white mb-2">Statistics</h4>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-dark-400">Words</span>
                  <span class="text-white">{editorStats.wordCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-dark-400">Characters</span>
                  <span class="text-white">{editorStats.characterCount}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-dark-400">Read time</span>
                  <span class="text-white">{editorStats.estimatedReadTime} min</span>
                </div>
              </div>
            </div>

            <div>
              <h4 class="font-medium text-white mb-2">AI Assistance</h4>
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-dark-400">Suggestions used</span>
                  <span class="text-primary-400">{editorStats.aiSuggestionsUsed}</span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-dark-400">Templates applied</span>
                  <span class="text-primary-400">{editorStats.templatesApplied}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      {/if}
    </div>
  </div>
{/if}

<style>
  /* Custom scrollbar for analysis sidebar */
  .overflow-y-auto::-webkit-scrollbar {
    width: 6px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-track {
    background: #1f2937;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb {
    background: #4b5563;
    border-radius: 3px;
  }
  
  .overflow-y-auto::-webkit-scrollbar-thumb:hover {
    background: #6b7280;
  }
</style>