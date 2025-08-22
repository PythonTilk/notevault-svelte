<script>
  import { createEventDispatcher, onMount, onDestroy } from 'svelte';
  import { api } from '$lib/api';
  
  const dispatch = createEventDispatcher();
  
  // Props
  export let value = '';
  export let noteId = '';
  export let workspaceId = '';
  export let title = '';
  export let placeholder = 'Start writing...';
  export let enableAISuggestions = true;
  export let enableSmartTags = true;
  export let enableContentAnalysis = true;
  
  // Component state
  let editor;
  let suggestions = [];
  let suggestedTags = [];
  let contentAnalysis = null;
  let showSuggestions = false;
  let showTemplates = false;
  let showAnalysis = false;
  let isLoadingSuggestions = false;
  let isLoadingTags = false;
  let isLoadingAnalysis = false;
  
  // Suggestion management
  let currentSuggestionIndex = -1;
  let suggestionDebounceTimer = null;
  let lastCursorPosition = 0;
  
  // Templates
  let availableTemplates = [];
  let selectedTemplate = null;
  
  // Analysis insights
  let analysisInsights = [];
  
  $: cursorPosition = editor?.selectionStart || 0;
  $: wordCount = value.split(/\s+/).filter(word => word.length > 0).length;
  $: characterCount = value.length;
  $: estimatedReadTime = Math.ceil(wordCount / 200);
  
  onMount(() => {
    loadTemplates();
    
    // Initial content analysis if there's existing content
    if (value && value.length > 50) {
      performContentAnalysis();
    }
    
    // Setup keyboard shortcuts
    document.addEventListener('keydown', handleGlobalKeydown);
  });
  
  onDestroy(() => {
    if (suggestionDebounceTimer) {
      clearTimeout(suggestionDebounceTimer);
    }
    document.removeEventListener('keydown', handleGlobalKeydown);
  });
  
  async function loadTemplates() {
    try {
      const response = await api.getAITemplates();
      if (response.success) {
        availableTemplates = response.data.templates;
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
    }
  }
  
  function handleInput(event) {
    const newValue = event.target.value;
    value = newValue;
    lastCursorPosition = event.target.selectionStart;
    
    dispatch('input', { value: newValue });
    
    // Debounce AI suggestions
    if (enableAISuggestions) {
      clearTimeout(suggestionDebounceTimer);
      suggestionDebounceTimer = setTimeout(() => {
        getSuggestions();
      }, 1000); // 1 second debounce
    }
    
    // Generate smart tags when content reaches certain length
    if (enableSmartTags && newValue.length > 100 && newValue.length % 200 === 0) {
      generateSmartTags();
    }
  }
  
  function handleKeydown(event) {
    // Handle suggestion navigation
    if (showSuggestions && suggestions.length > 0) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        currentSuggestionIndex = Math.min(currentSuggestionIndex + 1, suggestions.length - 1);
      } else if (event.key === 'ArrowUp') {
        event.preventDefault();
        currentSuggestionIndex = Math.max(currentSuggestionIndex - 1, -1);
      } else if (event.key === 'Tab' && currentSuggestionIndex >= 0) {
        event.preventDefault();
        applySuggestion(suggestions[currentSuggestionIndex]);
      } else if (event.key === 'Escape') {
        hideSuggestions();
      }
    }
    
    // Ctrl+Space to show suggestions
    if (event.ctrlKey && event.code === 'Space' && enableAISuggestions) {
      event.preventDefault();
      getSuggestions(true);
    }
    
    // Ctrl+T for templates
    if (event.ctrlKey && event.key === 't') {
      event.preventDefault();
      showTemplates = !showTemplates;
    }
    
    // Ctrl+Shift+A for analysis
    if (event.ctrlKey && event.shiftKey && event.key === 'A') {
      event.preventDefault();
      performContentAnalysis();
    }
  }
  
  function handleGlobalKeydown(event) {
    // Close dropdowns on escape
    if (event.key === 'Escape') {
      showSuggestions = false;
      showTemplates = false;
      showAnalysis = false;
    }
  }
  
  async function getSuggestions(force = false) {
    if (!enableAISuggestions || isLoadingSuggestions) return;
    if (!force && value.length < 10) return;
    
    try {
      isLoadingSuggestions = true;
      
      const context = {
        currentContent: value,
        cursorPosition: lastCursorPosition,
        title: title || '',
        noteId,
        workspaceId
      };
      
      const response = await api.getAISuggestions(context);
      
      if (response.success && response.data.suggestions.length > 0) {
        suggestions = response.data.suggestions;
        showSuggestions = true;
        currentSuggestionIndex = 0;
      } else {
        hideSuggestions();
      }
    } catch (error) {
      console.error('Failed to get AI suggestions:', error);
      hideSuggestions();
    } finally {
      isLoadingSuggestions = false;
    }
  }
  
  async function generateSmartTags() {
    if (!enableSmartTags || isLoadingTags || value.length < 50) return;
    
    try {
      isLoadingTags = true;
      
      const response = await api.generateSmartTags(value, title);
      
      if (response.success && response.data.tags.length > 0) {
        suggestedTags = response.data.tags;
        dispatch('tags-generated', { tags: suggestedTags });
      }
    } catch (error) {
      console.error('Failed to generate smart tags:', error);
    } finally {
      isLoadingTags = false;
    }
  }
  
  async function performContentAnalysis() {
    if (!enableContentAnalysis || isLoadingAnalysis || value.length < 100) return;
    
    try {
      isLoadingAnalysis = true;
      
      const response = await api.analyzeContent(value);
      
      if (response.success && response.data.analysis) {
        contentAnalysis = response.data.analysis;
        showAnalysis = true;
        
        // Extract actionable insights
        analysisInsights = [
          ...contentAnalysis.suggestions || [],
          ...(contentAnalysis.insights || [])
        ];
        
        dispatch('analysis-completed', { analysis: contentAnalysis });
      }
    } catch (error) {
      console.error('Failed to analyze content:', error);
    } finally {
      isLoadingAnalysis = false;
    }
  }
  
  function applySuggestion(suggestion) {
    const beforeCursor = value.substring(0, lastCursorPosition);
    const afterCursor = value.substring(lastCursorPosition);
    
    // Insert suggestion at cursor position
    const newValue = beforeCursor + suggestion.text + afterCursor;
    value = newValue;
    
    // Move cursor to end of inserted text
    setTimeout(() => {
      if (editor) {
        const newPosition = lastCursorPosition + suggestion.text.length;
        editor.setSelectionRange(newPosition, newPosition);
        editor.focus();
      }
    }, 10);
    
    hideSuggestions();
    dispatch('input', { value: newValue });
    dispatch('suggestion-applied', { suggestion });
  }
  
  function applyTemplate(template) {
    const processedTemplate = template.template
      .replace('{title}', title || 'Untitled')
      .replace('{date}', new Date().toLocaleDateString())
      .replace('{topic}', title || 'Topic');
    
    value = processedTemplate;
    showTemplates = false;
    
    setTimeout(() => {
      if (editor) {
        editor.focus();
        // Position cursor after first placeholder or at end
        const firstPlaceholder = processedTemplate.indexOf('- ') + 2;
        if (firstPlaceholder > 1) {
          editor.setSelectionRange(firstPlaceholder, firstPlaceholder);
        }
      }
    }, 10);
    
    dispatch('input', { value: processedTemplate });
    dispatch('template-applied', { template });
  }
  
  function hideSuggestions() {
    showSuggestions = false;
    suggestions = [];
    currentSuggestionIndex = -1;
  }
  
  function dismissAnalysis() {
    showAnalysis = false;
  }
  
  function applySuggestionImprovements(suggestionItem) {
    // Apply specific content improvements based on analysis
    if (suggestionItem.type === 'readability') {
      // Focus on readability improvements
      performContentAnalysis();
    } else if (suggestionItem.type === 'structure') {
      // Add heading structure
      const lines = value.split('\n');
      if (lines.length > 5 && !lines[0].startsWith('#')) {
        const firstLine = lines[0];
        lines[0] = `# ${firstLine || title || 'Document Title'}`;
        value = lines.join('\n');
        dispatch('input', { value });
      }
    }
  }
  
  function getSuggestionTypeIcon(type) {
    switch (type) {
      case 'ai': return '🤖';
      case 'template': return '📋';
      case 'completion': return '✏️';
      case 'related': return '🔗';
      default: return '💡';
    }
  }
  
  function getAnalysisIcon(type) {
    switch (type) {
      case 'readability': return '📖';
      case 'structure': return '🏗️';
      case 'statistics': return '📊';
      default: return 'ℹ️';
    }
  }
</script>

<div class="ai-enhanced-editor">
  <!-- Editor Toolbar -->
  <div class="editor-toolbar">
    <div class="toolbar-stats">
      <span class="stat-item">
        📝 {wordCount} words
      </span>
      <span class="stat-item">
        🔤 {characterCount} characters
      </span>
      <span class="stat-item">
        ⏱️ {estimatedReadTime} min read
      </span>
    </div>
    
    <div class="toolbar-actions">
      {#if enableAISuggestions}
        <button
          class="toolbar-button"
          class:active={isLoadingSuggestions}
          on:click={() => getSuggestions(true)}
          title="Get AI suggestions (Ctrl+Space)"
          disabled={isLoadingSuggestions}
        >
          {#if isLoadingSuggestions}
            <span class="loading-spinner"></span>
          {:else}
            🤖
          {/if}
          Suggest
        </button>
      {/if}
      
      <button
        class="toolbar-button"
        on:click={() => showTemplates = !showTemplates}
        title="Insert template (Ctrl+T)"
      >
        📋 Template
      </button>
      
      {#if enableSmartTags}
        <button
          class="toolbar-button"
          class:active={isLoadingTags}
          on:click={generateSmartTags}
          title="Generate smart tags"
          disabled={isLoadingTags}
        >
          {#if isLoadingTags}
            <span class="loading-spinner"></span>
          {:else}
            🏷️
          {/if}
          Tags
        </button>
      {/if}
      
      {#if enableContentAnalysis}
        <button
          class="toolbar-button"
          class:active={isLoadingAnalysis}
          on:click={performContentAnalysis}
          title="Analyze content (Ctrl+Shift+A)"
          disabled={isLoadingAnalysis}
        >
          {#if isLoadingAnalysis}
            <span class="loading-spinner"></span>
          {:else}
            📊
          {/if}
          Analyze
        </button>
      {/if}
    </div>
  </div>

  <!-- Main Editor Container -->
  <div class="editor-container">
    <textarea
      bind:this={editor}
      bind:value={value}
      on:input={handleInput}
      on:keydown={handleKeydown}
      {placeholder}
      class="main-editor"
      rows="20"
      spellcheck="true"
    ></textarea>

    <!-- AI Suggestions Dropdown -->
    {#if showSuggestions && suggestions.length > 0}
      <div class="suggestions-dropdown">
        <div class="suggestions-header">
          <span class="suggestions-title">💡 AI Suggestions</span>
          <span class="suggestions-hint">Tab to apply • ↑↓ to navigate • Esc to close</span>
        </div>
        <div class="suggestions-list">
          {#each suggestions as suggestion, index}
            <button
              class="suggestion-item"
              class:active={index === currentSuggestionIndex}
              on:click={() => applySuggestion(suggestion)}
            >
              <span class="suggestion-icon">{getSuggestionTypeIcon(suggestion.type)}</span>
              <div class="suggestion-content">
                <div class="suggestion-text">{suggestion.text}</div>
                <div class="suggestion-meta">
                  <span class="suggestion-category">{suggestion.category}</span>
                  <span class="suggestion-confidence">{Math.round(suggestion.confidence * 100)}%</span>
                </div>
              </div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Templates Dropdown -->
    {#if showTemplates && availableTemplates.length > 0}
      <div class="templates-dropdown">
        <div class="templates-header">
          <span class="templates-title">📋 Content Templates</span>
          <button class="close-button" on:click={() => showTemplates = false}>✕</button>
        </div>
        <div class="templates-list">
          {#each availableTemplates as template}
            <button
              class="template-item"
              on:click={() => applyTemplate(template)}
            >
              <div class="template-name">{template.name}</div>
              <div class="template-description">{template.description}</div>
              <div class="template-category">{template.category}</div>
            </button>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Content Analysis Panel -->
    {#if showAnalysis && contentAnalysis}
      <div class="analysis-panel">
        <div class="analysis-header">
          <span class="analysis-title">📊 Content Analysis</span>
          <button class="close-button" on:click={dismissAnalysis}>✕</button>
        </div>
        
        <div class="analysis-content">
          <!-- Readability Score -->
          {#if contentAnalysis.readability}
            <div class="analysis-section">
              <h4>📖 Readability</h4>
              <div class="readability-score">
                <div class="score-bar">
                  <div 
                    class="score-fill" 
                    style="width: {contentAnalysis.readability.score * 100}%"
                  ></div>
                </div>
                <span class="score-text">
                  {Math.round(contentAnalysis.readability.score * 100)}% readable
                </span>
              </div>
              <div class="readability-details">
                <span>Avg {contentAnalysis.readability.avgWordsPerSentence} words/sentence</span>
                <span>Avg {contentAnalysis.readability.avgSyllablesPerWord} syllables/word</span>
              </div>
            </div>
          {/if}

          <!-- Structure Analysis -->
          {#if contentAnalysis.structure}
            <div class="analysis-section">
              <h4>🏗️ Structure</h4>
              <div class="structure-indicators">
                <div class="structure-item" class:present={contentAnalysis.structure.hasHeadings}>
                  {contentAnalysis.structure.hasHeadings ? '✅' : '❌'} Headings
                </div>
                <div class="structure-item" class:present={contentAnalysis.structure.hasLists}>
                  {contentAnalysis.structure.hasLists ? '✅' : '❌'} Lists
                </div>
                <div class="structure-item" class:present={contentAnalysis.structure.hasTasks}>
                  {contentAnalysis.structure.hasTasks ? '✅' : '❌'} Tasks
                </div>
              </div>
            </div>
          {/if}

          <!-- Suggestions -->
          {#if contentAnalysis.suggestions && contentAnalysis.suggestions.length > 0}
            <div class="analysis-section">
              <h4>💡 Suggestions</h4>
              <div class="suggestions-grid">
                {#each contentAnalysis.suggestions as suggestion}
                  <button
                    class="analysis-suggestion"
                    class:severity-high={suggestion.severity === 'high'}
                    class:severity-medium={suggestion.severity === 'medium'}
                    class:severity-low={suggestion.severity === 'low'}
                    on:click={() => applySuggestionImprovements(suggestion)}
                  >
                    <span class="suggestion-icon">{getAnalysisIcon(suggestion.type)}</span>
                    <span class="suggestion-message">{suggestion.message}</span>
                  </button>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Insights -->
          {#if contentAnalysis.insights && contentAnalysis.insights.length > 0}
            <div class="analysis-section">
              <h4>📈 Insights</h4>
              <div class="insights-list">
                {#each contentAnalysis.insights as insight}
                  {#if insight.type === 'statistics' && insight.data}
                    <div class="insight-stats">
                      <div class="stat-grid">
                        <div class="stat-cell">
                          <span class="stat-value">{insight.data.wordCount}</span>
                          <span class="stat-label">Words</span>
                        </div>
                        <div class="stat-cell">
                          <span class="stat-value">{insight.data.characterCount}</span>
                          <span class="stat-label">Characters</span>
                        </div>
                        <div class="stat-cell">
                          <span class="stat-value">{insight.data.estimatedReadTime}</span>
                          <span class="stat-label">Min Read</span>
                        </div>
                      </div>
                    </div>
                  {/if}
                {/each}
              </div>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Smart Tags Display -->
  {#if suggestedTags.length > 0}
    <div class="smart-tags">
      <span class="tags-label">🏷️ Suggested tags:</span>
      <div class="tags-list">
        {#each suggestedTags as tag}
          <button
            class="tag-suggestion"
            on:click={() => dispatch('tag-selected', { tag })}
            title="Click to add tag"
          >
            {tag}
          </button>
        {/each}
      </div>
    </div>
  {/if}
</div>

<style>
  .ai-enhanced-editor {
    display: flex;
    flex-direction: column;
    border: 1px solid #e2e8f0;
    border-radius: 0.5rem;
    overflow: hidden;
    background: white;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .editor-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e2e8f0;
  }

  .toolbar-stats {
    display: flex;
    gap: 1rem;
  }

  .stat-item {
    font-size: 0.875rem;
    color: #64748b;
    font-weight: 500;
  }

  .toolbar-actions {
    display: flex;
    gap: 0.5rem;
  }

  .toolbar-button {
    padding: 0.5rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 0.375rem;
    background: white;
    color: #374151;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    gap: 0.375rem;
  }

  .toolbar-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .toolbar-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .toolbar-button.active {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  .loading-spinner {
    display: inline-block;
    width: 1rem;
    height: 1rem;
    border: 2px solid transparent;
    border-top: 2px solid currentColor;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  .editor-container {
    position: relative;
    flex: 1;
  }

  .main-editor {
    width: 100%;
    min-height: 400px;
    padding: 1rem;
    border: none;
    outline: none;
    resize: vertical;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 1rem;
    line-height: 1.6;
    background: white;
    color: #1f2937;
  }

  .suggestions-dropdown {
    position: absolute;
    top: 2rem;
    left: 1rem;
    right: 1rem;
    max-height: 300px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 10;
    overflow: hidden;
  }

  .suggestions-header {
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suggestions-title {
    font-weight: 600;
    color: #374151;
  }

  .suggestions-hint {
    font-size: 0.75rem;
    color: #6b7280;
  }

  .suggestions-list {
    max-height: 200px;
    overflow-y: auto;
  }

  .suggestion-item {
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .suggestion-item:hover,
  .suggestion-item.active {
    background: #f3f4f6;
  }

  .suggestion-icon {
    font-size: 1.25rem;
    flex-shrink: 0;
  }

  .suggestion-content {
    flex: 1;
  }

  .suggestion-text {
    font-weight: 500;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .suggestion-meta {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .suggestion-category {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .suggestion-confidence {
    font-size: 0.75rem;
    font-weight: 600;
    color: #059669;
  }

  .templates-dropdown {
    position: absolute;
    top: 2rem;
    left: 1rem;
    width: 400px;
    max-height: 400px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 10;
    overflow: hidden;
  }

  .templates-header {
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .templates-title {
    font-weight: 600;
    color: #374151;
  }

  .close-button {
    padding: 0.25rem;
    border: none;
    background: none;
    color: #6b7280;
    cursor: pointer;
    font-size: 1rem;
    border-radius: 0.25rem;
    transition: all 0.2s;
  }

  .close-button:hover {
    background: #e5e7eb;
    color: #374151;
  }

  .templates-list {
    max-height: 320px;
    overflow-y: auto;
  }

  .template-item {
    width: 100%;
    padding: 1rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
    border-bottom: 1px solid #f3f4f6;
  }

  .template-item:hover {
    background: #f9fafb;
  }

  .template-name {
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 0.25rem;
  }

  .template-description {
    font-size: 0.875rem;
    color: #6b7280;
    margin-bottom: 0.5rem;
  }

  .template-category {
    font-size: 0.75rem;
    color: #9ca3af;
    text-transform: uppercase;
    font-weight: 500;
  }

  .analysis-panel {
    position: absolute;
    top: 2rem;
    right: 1rem;
    width: 350px;
    max-height: 500px;
    background: white;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15);
    z-index: 10;
    overflow: hidden;
  }

  .analysis-header {
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-bottom: 1px solid #e5e7eb;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .analysis-title {
    font-weight: 600;
    color: #374151;
  }

  .analysis-content {
    max-height: 420px;
    overflow-y: auto;
    padding: 1rem;
  }

  .analysis-section {
    margin-bottom: 1.5rem;
  }

  .analysis-section:last-child {
    margin-bottom: 0;
  }

  .analysis-section h4 {
    font-size: 1rem;
    font-weight: 600;
    color: #1f2937;
    margin: 0 0 0.75rem 0;
  }

  .readability-score {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  .score-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }

  .score-fill {
    height: 100%;
    background: linear-gradient(90deg, #ef4444, #f59e0b, #10b981);
    border-radius: 4px;
    transition: width 0.3s;
  }

  .score-text {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
  }

  .readability-details {
    display: flex;
    gap: 1rem;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .structure-indicators {
    display: flex;
    gap: 1rem;
  }

  .structure-item {
    font-size: 0.875rem;
    color: #6b7280;
  }

  .structure-item.present {
    color: #059669;
  }

  .suggestions-grid {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .analysis-suggestion {
    display: flex;
    align-items: flex-start;
    gap: 0.5rem;
    padding: 0.5rem;
    border: 1px solid #e5e7eb;
    border-radius: 0.375rem;
    background: white;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .analysis-suggestion:hover {
    background: #f9fafb;
    border-color: #d1d5db;
  }

  .analysis-suggestion.severity-high {
    border-color: #ef4444;
    background: #fef2f2;
  }

  .analysis-suggestion.severity-medium {
    border-color: #f59e0b;
    background: #fffbeb;
  }

  .analysis-suggestion.severity-low {
    border-color: #3b82f6;
    background: #eff6ff;
  }

  .suggestion-message {
    font-size: 0.875rem;
    color: #374151;
  }

  .insight-stats {
    background: #f8fafc;
    border-radius: 0.375rem;
    padding: 1rem;
  }

  .stat-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }

  .stat-cell {
    text-align: center;
  }

  .stat-value {
    display: block;
    font-size: 1.5rem;
    font-weight: 700;
    color: #1f2937;
  }

  .stat-label {
    font-size: 0.75rem;
    color: #6b7280;
    text-transform: uppercase;
  }

  .smart-tags {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: #f8fafc;
    border-top: 1px solid #e2e8f0;
  }

  .tags-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: #374151;
    flex-shrink: 0;
  }

  .tags-list {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .tag-suggestion {
    padding: 0.25rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 1rem;
    background: white;
    color: #374151;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .tag-suggestion:hover {
    background: #3b82f6;
    color: white;
    border-color: #3b82f6;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .editor-toolbar {
      flex-direction: column;
      gap: 0.75rem;
    }

    .toolbar-stats {
      order: 2;
    }

    .toolbar-actions {
      order: 1;
    }

    .suggestions-dropdown,
    .templates-dropdown,
    .analysis-panel {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 90vw;
      max-width: 400px;
      max-height: 70vh;
    }

    .smart-tags {
      flex-direction: column;
      align-items: flex-start;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .ai-enhanced-editor {
      background: #1f2937;
      border-color: #374151;
    }

    .editor-toolbar {
      background: #374151;
      border-color: #4b5563;
    }

    .main-editor {
      background: #1f2937;
      color: #f9fafb;
    }

    .toolbar-button {
      background: #374151;
      color: #f9fafb;
      border-color: #4b5563;
    }

    .toolbar-button:hover:not(:disabled) {
      background: #4b5563;
      border-color: #6b7280;
    }

    .suggestions-dropdown,
    .templates-dropdown,
    .analysis-panel {
      background: #374151;
      border-color: #4b5563;
    }

    .suggestions-header,
    .templates-header,
    .analysis-header {
      background: #4b5563;
      border-color: #6b7280;
    }

    .stat-item,
    .suggestions-title,
    .templates-title,
    .analysis-title {
      color: #f9fafb;
    }

    .smart-tags {
      background: #374151;
      border-color: #4b5563;
    }
  }
</style>