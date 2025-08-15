<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { Search, FileText, Users, Folder, MessageSquare, Star, Bookmark, History } from 'lucide-svelte';
  import { api } from '$lib/api';
  import { goto } from '$app/navigation';
  import HighlightedText from '$lib/components/HighlightedText.svelte';
  import { getHighlightedPreview } from '$lib/utils/highlight';
  import SavedSearches from '$lib/components/SavedSearches.svelte';
  import { savedSearchStore } from '$lib/stores/savedSearches';

  let searchQuery = '';
  let searchResults: any[] = [];
  let isLoading = false;
  let searchType: 'all' | 'notes' | 'workspaces' | 'files' = 'all';
  let showSavedSearches = false;

  $: searchQuery = $page.url.searchParams.get('q') || '';

  onMount(() => {
    if (searchQuery) {
      performSearch();
    }
  });

  async function performSearch() {
    if (!searchQuery.trim()) {
      searchResults = [];
      return;
    }

    isLoading = true;
    try {
      const results = await searchAcrossData(searchQuery);
      searchResults = results;
    } catch (error) {
      console.error('Search failed:', error);
      searchResults = [];
    } finally {
      isLoading = false;
    }
  }

  async function searchAcrossData(query: string) {
    const lowerQuery = query.toLowerCase();
    const results: any[] = [];

    try {
      // Search workspaces
      if (searchType === 'all' || searchType === 'workspaces') {
        const workspaces = await api.getWorkspaces();
        const matchingWorkspaces = workspaces.filter((workspace: any) =>
          workspace.name.toLowerCase().includes(lowerQuery) ||
          workspace.description?.toLowerCase().includes(lowerQuery)
        ).map((workspace: any) => ({
          ...workspace,
          type: 'workspace',
          title: workspace.name,
          description: workspace.description || 'No description',
          rawDescription: workspace.description || 'No description',
          url: `/workspaces/${workspace.id}`
        }));
        results.push(...matchingWorkspaces);
      }

      // Search notes (we'll need to iterate through workspaces)
      if (searchType === 'all' || searchType === 'notes') {
        const workspaces = await api.getWorkspaces();
        for (const workspace of workspaces) {
          try {
            const notes = await api.getWorkspaceNotes(workspace.id);
            const matchingNotes = notes.filter((note: any) =>
              note.title.toLowerCase().includes(lowerQuery) ||
              note.content?.toLowerCase().includes(lowerQuery)
            ).map((note: any) => ({
              ...note,
              type: 'note',
              title: note.title,
              description: note.content ? getHighlightedPreview(note.content, lowerQuery, 80) : 'Empty note',
              rawDescription: note.content || '',
              url: `/workspaces/${workspace.id}?note=${note.id}`,
              workspaceName: workspace.name
            }));
            results.push(...matchingNotes);
          } catch (error) {
            // Skip workspace if we can't access notes
            console.warn(`Could not search notes in workspace ${workspace.id}:`, error);
          }
        }
      }

      // Search files
      if (searchType === 'all' || searchType === 'files') {
        try {
          const files = await api.getFiles({ limit: 100 });
          const matchingFiles = files.filter((file: any) =>
            file.name.toLowerCase().includes(lowerQuery)
          ).map((file: any) => ({
            ...file,
            type: 'file',
            title: file.name,
            description: `${formatFileSize(file.size)} • ${formatDate(new Date(file.createdAt))}`,
            rawDescription: `${file.name} - ${formatFileSize(file.size)}`,
            url: api.getFileDownloadUrl(file.id)
          }));
          results.push(...matchingFiles);
        } catch (error) {
          console.warn('Could not search files:', error);
        }
      }

    } catch (error) {
      console.error('Search error:', error);
    }

    return results.sort((a, b) => {
      // Sort by relevance (exact matches first, then partial)
      const aExact = a.title.toLowerCase() === lowerQuery;
      const bExact = b.title.toLowerCase() === lowerQuery;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      // Then sort by type priority: notes > workspaces > files
      const typePriority = { note: 3, workspace: 2, file: 1 };
      return (typePriority[b.type] || 0) - (typePriority[a.type] || 0);
    });
  }

  function formatFileSize(bytes: number): string {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  function formatDate(date: Date): string {
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  }

  function getTypeIcon(type: string) {
    switch (type) {
      case 'note': return FileText;
      case 'workspace': return Folder;
      case 'file': return FileText;
      default: return Search;
    }
  }

  function getTypeColor(type: string) {
    switch (type) {
      case 'note': return 'text-blue-400';
      case 'workspace': return 'text-green-400';
      case 'file': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  }

  function handleResultClick(result: any) {
    if (result.type === 'file') {
      // For files, trigger download
      window.open(result.url, '_blank');
    } else {
      // For other types, navigate to the URL
      goto(result.url);
    }
  }

  function updateSearchType(newType: typeof searchType) {
    searchType = newType;
    if (searchQuery) {
      performSearch();
    }
  }

  // Watch for query parameter changes
  $: if ($page.url.searchParams.get('q') !== searchQuery) {
    searchQuery = $page.url.searchParams.get('q') || '';
    if (searchQuery) {
      performSearch();
    }
  }

  function handleSavedSearchSelect(event: CustomEvent) {
    const search = event.detail.search;
    searchType = search.searchType;
    goto(`/search?q=${encodeURIComponent(search.query)}`);
    showSavedSearches = false;
  }

  function saveCurrentSearch() {
    if (searchQuery.trim()) {
      const name = prompt('Enter a name for this search:');
      if (name && name.trim()) {
        savedSearchStore.save(name.trim(), searchQuery, searchType);
      }
    }
  }

  function toggleSavedSearches() {
    showSavedSearches = !showSavedSearches;
  }
</script>

<svelte:head>
  <title>Search - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">Search Results</h1>
      {#if searchQuery}
        <p class="text-dark-400 text-sm">Results for "{searchQuery}"</p>
      {/if}
    </div>
    
    <div class="flex items-center space-x-3">
      {#if searchQuery.trim()}
        <button
          class="btn-secondary text-sm"
          on:click={saveCurrentSearch}
          title="Save this search"
        >
          <Star class="w-4 h-4 mr-2" />
          Save Search
        </button>
      {/if}
      
      <div class="relative">
        <button
          class="btn-ghost text-sm"
          on:click={toggleSavedSearches}
          title="View saved searches"
        >
          <Bookmark class="w-4 h-4 mr-2" />
          Saved
        </button>
        
        {#if showSavedSearches}
          <div class="absolute top-full right-0 mt-2 w-80 z-10">
            <SavedSearches
              currentQuery={searchQuery}
              currentSearchType={searchType}
              on:select={handleSavedSearchSelect}
              on:close={() => showSavedSearches = false}
            />
          </div>
        {/if}
      </div>
    </div>
  </div>
</header>

<!-- Search Filters -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center space-x-4">
    <span class="text-sm text-dark-400">Filter by:</span>
    {#each [
      { key: 'all', label: 'All' },
      { key: 'notes', label: 'Notes' },
      { key: 'workspaces', label: 'Workspaces' },
      { key: 'files', label: 'Files' }
    ] as filter}
      <button
        class="px-3 py-1 rounded-lg text-sm transition-colors {
          searchType === filter.key 
            ? 'bg-primary-600 text-white' 
            : 'text-dark-400 hover:text-white hover:bg-dark-800'
        }"
        on:click={() => updateSearchType(filter.key)}
      >
        {filter.label}
      </button>
    {/each}
  </div>
</div>

<!-- Main Content -->
<main class="flex-1 overflow-auto p-6">
  {#if !searchQuery}
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <Search class="w-16 h-16 text-dark-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">Search NoteVault</h3>
        <p class="text-dark-400">Enter a search term to find notes, workspaces, and files</p>
      </div>
    </div>
  {:else if isLoading}
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-dark-400">Searching...</p>
      </div>
    </div>
  {:else if searchResults.length === 0}
    <div class="flex items-center justify-center h-64">
      <div class="text-center">
        <Search class="w-16 h-16 text-dark-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">No results found</h3>
        <p class="text-dark-400">Try adjusting your search terms or filters</p>
      </div>
    </div>
  {:else}
    <div class="space-y-1">
      <div class="text-sm text-dark-400 mb-4">
        Found {searchResults.length} result{searchResults.length !== 1 ? 's' : ''}
      </div>
      
      {#each searchResults as result}
        <div 
          class="bg-dark-800 rounded-lg p-4 hover:bg-dark-700 transition-colors cursor-pointer border border-dark-700 hover:border-dark-600"
          on:click={() => handleResultClick(result)}
          role="button"
          tabindex="0"
          on:keydown={(e) => e.key === 'Enter' && handleResultClick(result)}
        >
          <div class="flex items-start space-x-3">
            <div class="flex-shrink-0 mt-1">
              <svelte:component 
                this={getTypeIcon(result.type)} 
                class="w-5 h-5 {getTypeColor(result.type)}" 
              />
            </div>
            
            <div class="flex-1 min-w-0">
              <div class="flex items-center space-x-2 mb-1">
                <h3 class="text-white font-medium truncate">
                  <HighlightedText text={result.title} searchTerm={searchQuery} />
                </h3>
                <span class="text-xs px-2 py-1 rounded-full bg-dark-700 {getTypeColor(result.type)} capitalize">
                  {result.type}
                </span>
              </div>
              
              <div class="text-dark-300 text-sm mb-2 line-clamp-2">
                {#if result.type === 'note' && result.rawDescription}
                  {@html result.description}
                {:else}
                  <HighlightedText text={result.rawDescription || result.description} searchTerm={searchQuery} />
                {/if}
              </div>
              
              {#if result.workspaceName}
                <div class="flex items-center space-x-1 text-xs text-dark-400">
                  <Folder class="w-3 h-3" />
                  <span>{result.workspaceName}</span>
                </div>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</main>