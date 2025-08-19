<script>
  import { onMount, createEventDispatcher } from 'svelte';
  import { api } from '$lib/api';
  
  const dispatch = createEventDispatcher();
  
  // Search state
  let query = '';
  let searchResults = [];
  let totalResults = 0;
  let hasMore = false;
  let responseTime = 0;
  let searchId = '';
  let isLoading = false;
  let error = null;
  let currentPage = 0;
  const resultsPerPage = 20;

  // Search options
  let selectedContentTypes = ['notes', 'workspaces', 'files'];
  let selectedWorkspace = '';
  let sortBy = 'relevance';
  let includeHighlights = true;
  let dateStart = '';
  let dateEnd = '';
  let selectedAuthor = '';

  // Facets and filters
  let facets = {
    contentTypes: {},
    authors: {},
    workspaces: {},
    dateRanges: {}
  };
  let availableWorkspaces = [];
  let availableAuthors = [];
  
  // Search suggestions
  let suggestions = [];
  let showSuggestions = false;
  let suggestionTimeout;

  // Content type options
  const contentTypeOptions = [
    { value: 'notes', label: 'Notes', icon: '📝' },
    { value: 'workspaces', label: 'Workspaces', icon: '🏢' },
    { value: 'files', label: 'Files', icon: '📁' },
    { value: 'users', label: 'Users', icon: '👤' },
    { value: 'chat', label: 'Chat', icon: '💬' }
  ];

  onMount(() => {
    loadFacets();
  });

  async function loadFacets() {
    try {
      const response = await api.getSearchFacets();
      if (response.success) {
        facets = response.data.facets;
        // Extract available options from facets
        availableWorkspaces = Object.keys(facets.workspaces || {});
        availableAuthors = Object.keys(facets.authors || {});
      }
    } catch (err) {
      console.error('Failed to load search facets:', err);
    }
  }

  async function performSearch(resetPage = true) {
    if (!query.trim()) {
      searchResults = [];
      totalResults = 0;
      return;
    }

    if (resetPage) {
      currentPage = 0;
    }

    isLoading = true;
    error = null;

    try {
      const searchOptions = {
        contentTypes: selectedContentTypes,
        workspaceId: selectedWorkspace || undefined,
        limit: resultsPerPage,
        offset: currentPage * resultsPerPage,
        sortBy,
        includeHighlights,
        dateStart: dateStart || undefined,
        dateEnd: dateEnd || undefined,
        author: selectedAuthor || undefined
      };

      const response = await api.search(query, searchOptions);
      
      if (response.success) {
        const data = response.data;
        searchResults = data.results;
        totalResults = data.totalResults;
        hasMore = data.hasMore;
        responseTime = data.responseTime;
        searchId = data.searchId;
        
        // Update facets with fresh data
        if (data.facets) {
          facets = data.facets;
        }

        dispatch('search-completed', {
          query,
          results: searchResults,
          totalResults,
          responseTime
        });
      } else {
        error = response.error || 'Search failed';
      }
    } catch (err) {
      console.error('Search error:', err);
      error = 'Search request failed';
    } finally {
      isLoading = false;
    }
  }

  async function loadSuggestions() {
    if (!query.trim() || query.length < 2) {
      suggestions = [];
      showSuggestions = false;
      return;
    }

    clearTimeout(suggestionTimeout);
    suggestionTimeout = setTimeout(async () => {
      try {
        const response = await api.getSearchSuggestions(query, 5);
        if (response.success) {
          suggestions = response.data.suggestions;
          showSuggestions = suggestions.length > 0;
        }
      } catch (err) {
        console.error('Failed to load suggestions:', err);
      }
    }, 300);
  }

  async function handleResultClick(result) {
    // Log the click for analytics
    if (searchId) {
      try {
        await api.logSearchClick(searchId, result.id, result.contentType);
      } catch (err) {
        console.error('Failed to log search click:', err);
      }
    }

    // Emit click event for parent component to handle navigation
    dispatch('result-click', result);
  }

  function applySuggestion(suggestion) {
    query = suggestion;
    showSuggestions = false;
    performSearch();
  }

  function toggleContentType(type) {
    const index = selectedContentTypes.indexOf(type);
    if (index > -1) {
      selectedContentTypes = selectedContentTypes.filter(t => t !== type);
    } else {
      selectedContentTypes = [...selectedContentTypes, type];
    }
  }

  function clearFilters() {
    selectedWorkspace = '';
    selectedAuthor = '';
    dateStart = '';
    dateEnd = '';
    selectedContentTypes = ['notes', 'workspaces', 'files'];
    performSearch();
  }

  function getResultIcon(contentType) {
    const typeOption = contentTypeOptions.find(opt => opt.value === contentType);
    return typeOption?.icon || '📄';
  }

  function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString();
  }

  function nextPage() {
    if (hasMore) {
      currentPage++;
      performSearch(false);
    }
  }

  function previousPage() {
    if (currentPage > 0) {
      currentPage--;
      performSearch(false);
    }
  }

  // Reactive statements
  $: if (query) loadSuggestions();
  $: totalPages = Math.ceil(totalResults / resultsPerPage);
</script>

<div class="advanced-search">
  <!-- Search Header -->
  <div class="search-header">
    <h2>Advanced Search</h2>
    <p class="search-description">
      Search across all your content with advanced filtering and real-time suggestions
    </p>
  </div>

  <!-- Search Input -->
  <div class="search-input-container">
    <div class="search-input-wrapper">
      <input
        type="text"
        bind:value={query}
        on:input={loadSuggestions}
        on:keydown={(e) => e.key === 'Enter' && performSearch()}
        placeholder="Search notes, workspaces, files..."
        class="search-input"
      />
      <button 
        on:click={() => performSearch()}
        disabled={!query.trim() || isLoading}
        class="search-button"
      >
        {#if isLoading}
          <span class="loading-spinner"></span>
        {:else}
          🔍
        {/if}
      </button>
    </div>

    <!-- Search Suggestions -->
    {#if showSuggestions && suggestions.length > 0}
      <div class="suggestions-dropdown">
        {#each suggestions as suggestion}
          <button
            class="suggestion-item"
            on:click={() => applySuggestion(suggestion)}
          >
            {suggestion}
          </button>
        {/each}
      </div>
    {/if}
  </div>

  <!-- Search Filters -->
  <div class="search-filters">
    <div class="filter-section">
      <h3>Content Types</h3>
      <div class="content-type-filters">
        {#each contentTypeOptions as option}
          <label class="checkbox-label">
            <input
              type="checkbox"
              checked={selectedContentTypes.includes(option.value)}
              on:change={() => toggleContentType(option.value)}
            />
            <span class="content-type-option">
              <span class="content-type-icon">{option.icon}</span>
              {option.label}
            </span>
          </label>
        {/each}
      </div>
    </div>

    <div class="filter-section">
      <h3>Filters</h3>
      <div class="filter-controls">
        <select bind:value={selectedWorkspace} class="filter-select">
          <option value="">All Workspaces</option>
          {#each availableWorkspaces as workspaceId}
            <option value={workspaceId}>Workspace {workspaceId}</option>
          {/each}
        </select>

        <select bind:value={selectedAuthor} class="filter-select">
          <option value="">Any Author</option>
          {#each availableAuthors as authorId}
            <option value={authorId}>Author {authorId}</option>
          {/each}
        </select>

        <select bind:value={sortBy} class="filter-select">
          <option value="relevance">Sort by Relevance</option>
          <option value="date">Sort by Date</option>
        </select>
      </div>

      <div class="date-filters">
        <input
          type="date"
          bind:value={dateStart}
          placeholder="Start date"
          class="date-input"
        />
        <input
          type="date"
          bind:value={dateEnd}
          placeholder="End date"
          class="date-input"
        />
      </div>

      <div class="filter-actions">
        <label class="checkbox-label">
          <input type="checkbox" bind:checked={includeHighlights} />
          Include highlights
        </label>
        <button on:click={clearFilters} class="clear-filters-button">
          Clear Filters
        </button>
      </div>
    </div>
  </div>

  <!-- Search Results -->
  <div class="search-results">
    {#if error}
      <div class="error-message">
        <p>❌ {error}</p>
      </div>
    {:else if isLoading}
      <div class="loading-message">
        <p>🔍 Searching...</p>
      </div>
    {:else if searchResults.length > 0}
      <!-- Results Header -->
      <div class="results-header">
        <p class="results-summary">
          Found <strong>{totalResults}</strong> results in <strong>{responseTime}ms</strong>
        </p>
        <div class="pagination-info">
          Page {currentPage + 1} of {totalPages}
        </div>
      </div>

      <!-- Results List -->
      <div class="results-list">
        {#each searchResults as result}
          <div
            class="result-item"
            on:click={() => handleResultClick(result)}
            role="button"
            tabindex="0"
          >
            <div class="result-header">
              <span class="result-icon">{getResultIcon(result.contentType)}</span>
              <span class="result-type">{result.contentType}</span>
              <span class="result-score">Score: {result.relevanceScore?.toFixed(1) || 'N/A'}</span>
            </div>
            
            <h4 class="result-title">
              {#if result.title_highlight}
                {@html result.title_highlight}
              {:else}
                {result.title || result.name || result.filename || 'Untitled'}
              {/if}
            </h4>
            
            {#if result.content_highlight}
              <p class="result-content">
                {@html result.content_highlight}
              </p>
            {:else if result.content}
              <p class="result-content">
                {result.content.substring(0, 200)}...
              </p>
            {/if}
            
            <div class="result-meta">
              {#if result.created_at}
                <span class="result-date">Created: {formatDate(result.created_at)}</span>
              {/if}
              {#if result.workspace_id}
                <span class="result-workspace">Workspace: {result.workspace_id}</span>
              {/if}
            </div>
          </div>
        {/each}
      </div>

      <!-- Pagination -->
      {#if totalPages > 1}
        <div class="pagination">
          <button
            on:click={previousPage}
            disabled={currentPage === 0}
            class="pagination-button"
          >
            ← Previous
          </button>
          
          <span class="pagination-info">
            {currentPage + 1} / {totalPages}
          </span>
          
          <button
            on:click={nextPage}
            disabled={!hasMore}
            class="pagination-button"
          >
            Next →
          </button>
        </div>
      {/if}
    {:else if query.trim()}
      <div class="no-results">
        <p>📭 No results found for "{query}"</p>
        <p>Try adjusting your search terms or filters.</p>
      </div>
    {:else}
      <div class="search-placeholder">
        <p>🔍 Enter a search query to get started</p>
        <p>You can search across notes, workspaces, files, and more.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .advanced-search {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .search-header {
    text-align: center;
    margin-bottom: 2rem;
  }

  .search-header h2 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a202c;
    margin-bottom: 0.5rem;
  }

  .search-description {
    font-size: 1.1rem;
    color: #4a5568;
    margin: 0;
  }

  .search-input-container {
    position: relative;
    margin-bottom: 2rem;
  }

  .search-input-wrapper {
    display: flex;
    border: 2px solid #e2e8f0;
    border-radius: 0.75rem;
    overflow: hidden;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transition: all 0.2s;
  }

  .search-input-wrapper:focus-within {
    border-color: #3182ce;
    box-shadow: 0 0 0 3px rgba(49, 130, 206, 0.1);
  }

  .search-input {
    flex: 1;
    padding: 1rem 1.5rem;
    border: none;
    outline: none;
    font-size: 1.1rem;
    background: white;
  }

  .search-button {
    padding: 1rem 1.5rem;
    border: none;
    background: #3182ce;
    color: white;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .search-button:hover:not(:disabled) {
    background: #2c5aa0;
  }

  .search-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
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

  .suggestions-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: white;
    border: 1px solid #e2e8f0;
    border-top: none;
    border-radius: 0 0 0.5rem 0.5rem;
    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
    z-index: 10;
  }

  .suggestion-item {
    display: block;
    width: 100%;
    padding: 0.75rem 1rem;
    border: none;
    background: none;
    text-align: left;
    cursor: pointer;
    transition: background-color 0.2s;
  }

  .suggestion-item:hover {
    background: #f7fafc;
  }

  .search-filters {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    margin-bottom: 2rem;
  }

  .filter-section {
    margin-bottom: 1.5rem;
  }

  .filter-section:last-child {
    margin-bottom: 0;
  }

  .filter-section h3 {
    font-size: 1.2rem;
    font-weight: 600;
    color: #2d3748;
    margin-bottom: 1rem;
  }

  .content-type-filters {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    cursor: pointer;
  }

  .content-type-option {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
  }

  .content-type-icon {
    font-size: 1.2rem;
  }

  .filter-controls {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .filter-select {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    min-width: 150px;
  }

  .date-filters {
    display: flex;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .date-input {
    padding: 0.5rem 1rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
  }

  .filter-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .clear-filters-button {
    padding: 0.5rem 1rem;
    border: 1px solid #e53e3e;
    border-radius: 0.5rem;
    background: white;
    color: #e53e3e;
    cursor: pointer;
    transition: all 0.2s;
  }

  .clear-filters-button:hover {
    background: #e53e3e;
    color: white;
  }

  .search-results {
    min-height: 400px;
  }

  .results-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
    padding-bottom: 1rem;
    border-bottom: 1px solid #e2e8f0;
  }

  .results-summary {
    font-size: 1.1rem;
    color: #4a5568;
    margin: 0;
  }

  .pagination-info {
    color: #718096;
    font-size: 0.9rem;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-item {
    background: white;
    border: 1px solid #e2e8f0;
    border-radius: 0.75rem;
    padding: 1.5rem;
    cursor: pointer;
    transition: all 0.2s;
    box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
  }

  .result-item:hover {
    border-color: #3182ce;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    transform: translateY(-1px);
  }

  .result-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.75rem;
  }

  .result-icon {
    font-size: 1.25rem;
  }

  .result-type {
    background: #e6fffa;
    color: #234e52;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-size: 0.8rem;
    font-weight: 600;
    text-transform: capitalize;
  }

  .result-score {
    margin-left: auto;
    font-size: 0.8rem;
    color: #718096;
    font-weight: 500;
  }

  .result-title {
    font-size: 1.3rem;
    font-weight: 600;
    color: #1a202c;
    margin: 0 0 0.75rem 0;
    line-height: 1.4;
  }

  .result-content {
    color: #4a5568;
    line-height: 1.6;
    margin: 0 0 0.75rem 0;
  }

  .result-meta {
    display: flex;
    gap: 1rem;
    font-size: 0.8rem;
    color: #718096;
  }

  .pagination {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e2e8f0;
  }

  .pagination-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #d1d5db;
    border-radius: 0.5rem;
    background: white;
    color: #374151;
    cursor: pointer;
    transition: all 0.2s;
  }

  .pagination-button:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }

  .pagination-button:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    text-align: center;
    padding: 3rem;
    color: #e53e3e;
    font-size: 1.1rem;
  }

  .loading-message {
    text-align: center;
    padding: 3rem;
    color: #3182ce;
    font-size: 1.1rem;
  }

  .no-results {
    text-align: center;
    padding: 3rem;
    color: #718096;
  }

  .search-placeholder {
    text-align: center;
    padding: 3rem;
    color: #a0aec0;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .advanced-search {
      padding: 1rem;
    }

    .search-header h2 {
      font-size: 2rem;
    }

    .content-type-filters {
      flex-direction: column;
    }

    .filter-controls {
      flex-direction: column;
    }

    .filter-select {
      min-width: auto;
      width: 100%;
    }

    .date-filters {
      flex-direction: column;
    }

    .results-header {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .result-header {
      flex-wrap: wrap;
    }

    .pagination {
      flex-direction: column;
      gap: 0.5rem;
    }
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .advanced-search {
      color: #e2e8f0;
    }

    .search-header h2 {
      color: #f7fafc;
    }

    .search-input {
      background: #2d3748;
      color: #e2e8f0;
    }

    .search-filters {
      background: #2d3748;
      border-color: #4a5568;
    }

    .result-item {
      background: #2d3748;
      border-color: #4a5568;
    }

    .result-title {
      color: #f7fafc;
    }

    .filter-select,
    .date-input {
      background: #2d3748;
      color: #e2e8f0;
      border-color: #4a5568;
    }

    .pagination-button {
      background: #2d3748;
      color: #e2e8f0;
      border-color: #4a5568;
    }
  }
</style>