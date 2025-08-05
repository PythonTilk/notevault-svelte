<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload, Search, Filter, Grid, List, Download, Share, Trash2, File, Image, Video, Music, Archive } from 'lucide-svelte';
  import { api } from '$lib/api';
  import type { FileItem } from '$lib/types';

  let files: FileItem[] = [];
  let viewMode: 'grid' | 'list' = 'grid';
  let searchQuery = '';
  let selectedFiles: Set<string> = new Set();
  let showUploadModal = false;
  let dragOver = false;

  let loadError: string | null = null;

  let isLoading = true;

  onMount(async () => {
    await loadFiles();
  });

  async function loadFiles() {
    try {
      isLoading = true;
      loadError = null;
      const data = await api.getFiles({ limit: 100 });
      files = data.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: api.getFileDownloadUrl(file.id),
        uploaderId: file.uploadedBy.id,
        workspaceId: file.workspaceId,
        createdAt: new Date(file.createdAt),
        isPublic: file.isPublic
      }));
    } catch (error) {
      console.error('Failed to load files:', error);
      loadError = error instanceof Error ? error.message : 'Failed to load files';
      files = [];
    } finally {
      isLoading = false;
    }
  }

  function getFileIcon(type: string) {
    if (type.startsWith('image/')) return Image;
    if (type.startsWith('video/')) return Video;
    if (type.startsWith('audio/')) return Music;
    if (type.includes('zip') || type.includes('rar')) return Archive;
    return File;
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  }

  function toggleFileSelection(fileId: string) {
    if (selectedFiles.has(fileId)) {
      selectedFiles.delete(fileId);
    } else {
      selectedFiles.add(fileId);
    }
    selectedFiles = selectedFiles;
  }

  function selectAllFiles() {
    if (selectedFiles.size === filteredFiles.length) {
      selectedFiles.clear();
    } else {
      selectedFiles = new Set(filteredFiles.map(f => f.id));
    }
    selectedFiles = selectedFiles;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    handleFileUpload(droppedFiles);
  }

  async function handleFileUpload(uploadedFiles: File[]) {
    for (const file of uploadedFiles) {
      try {
        isLoading = true;
        const uploadedFile = await api.uploadFile(file, undefined, false);
        
        const newFile: FileItem = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          url: api.getFileDownloadUrl(uploadedFile.id),
          uploaderId: uploadedFile.uploadedBy.id,
          workspaceId: uploadedFile.workspaceId,
          createdAt: new Date(uploadedFile.createdAt),
          isPublic: uploadedFile.isPublic
        };
        
        files = [newFile, ...files];
      } catch (error) {
        console.error('Failed to upload file:', file.name, error);
        // You could add a toast notification here
      }
    }
    isLoading = false;
  }

  function downloadFile(file: FileItem) {
    // Create a download link and trigger download
    const downloadUrl = api.getFileDownloadUrl(file.id);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = file.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function shareFile(file: FileItem) {
    const shareUrl = `${window.location.origin}/files/${file.id}`;
    
    if (navigator.share) {
      // Use native sharing if available
      try {
        await navigator.share({
          title: file.name,
          text: `Check out this file: ${file.name}`,
          url: shareUrl
        });
      } catch (error) {
        console.log('Share canceled or failed:', error);
      }
    } else {
      // Fallback to copying URL to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        // You could show a toast notification here
        console.log('File URL copied to clipboard');
      } catch (error) {
        console.error('Failed to copy URL:', error);
      }
    }
  }

  async function deleteFile(fileId: string) {
    try {
      await api.deleteFile(fileId);
      files = files.filter(f => f.id !== fileId);
      selectedFiles.delete(fileId);
      selectedFiles = selectedFiles;
    } catch (error) {
      console.error('Failed to delete file:', error);
      // You could add a toast notification here
    }
  }

  $: filteredFiles = files.filter(file =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );
</script>

<svelte:head>
  <title>Files - NoteVault</title>
</svelte:head>

<!-- Header -->
<header class="bg-dark-900 border-b border-dark-800 px-6 py-4">
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-xl font-bold text-white">File Management</h1>
      <p class="text-dark-400 text-sm">{files.length} files • {formatFileSize(files.reduce((acc, f) => acc + f.size, 0))} total</p>
    </div>
    
    <div class="flex items-center space-x-3">
      <button
        class="btn-primary"
        on:click={() => showUploadModal = true}
      >
        <Upload class="w-4 h-4 mr-2" />
        Upload Files
      </button>
    </div>
  </div>
</header>

<!-- Toolbar -->
<div class="bg-dark-900 border-b border-dark-800 px-6 py-3">
  <div class="flex items-center justify-between">
    <div class="flex items-center space-x-4">
      <!-- Search -->
      <div class="relative">
        <Search class="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-dark-400" />
        <input
          type="text"
          bind:value={searchQuery}
          placeholder="Search files..."
          class="input pl-10 w-64"
        />
      </div>
      
      <!-- Filters -->
      <button class="btn-ghost">
        <Filter class="w-4 h-4 mr-2" />
        Filter
      </button>
      
      {#if selectedFiles.size > 0}
        <div class="flex items-center space-x-2">
          <span class="text-sm text-dark-400">{selectedFiles.size} selected</span>
          <button class="btn-ghost text-sm">
            <Download class="w-4 h-4 mr-1" />
            Download
          </button>
          <button class="btn-ghost text-sm">
            <Share class="w-4 h-4 mr-1" />
            Share
          </button>
          <button class="btn-ghost text-sm text-red-400">
            <Trash2 class="w-4 h-4 mr-1" />
            Delete
          </button>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-2">
      <button
        class="p-2 rounded-lg {viewMode === 'grid' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'} transition-colors"
        on:click={() => viewMode = 'grid'}
      >
        <Grid class="w-4 h-4" />
      </button>
      <button
        class="p-2 rounded-lg {viewMode === 'list' ? 'bg-primary-600 text-white' : 'text-dark-400 hover:text-white hover:bg-dark-800'} transition-colors"
        on:click={() => viewMode = 'list'}
      >
        <List class="w-4 h-4" />
      </button>
    </div>
  </div>
</div>

<!-- Main Content -->
<main 
  class="flex-1 overflow-auto p-6 {dragOver ? 'bg-primary-500/10' : ''}"
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  {#if isLoading}
    <div class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4"></div>
        <p class="text-dark-400">Loading files...</p>
      </div>
    </div>
  {:else if loadError}
    <div class="flex items-center justify-center h-full">
      <div class="text-center">
        <div class="w-16 h-16 bg-red-600/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg class="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        </div>
        <h3 class="text-lg font-medium text-white mb-2">Failed to load files</h3>
        <p class="text-dark-400 mb-4">{loadError}</p>
        <button
          class="btn-primary"
          on:click={loadFiles}
        >
          Try Again
        </button>
      </div>
    </div>
  {:else if filteredFiles.length === 0}
    <div class="flex items-center justify-center h-full">
      <div class="text-center">
        <Upload class="w-16 h-16 text-dark-600 mx-auto mb-4" />
        <h3 class="text-lg font-medium text-white mb-2">
          {searchQuery ? 'No files found' : 'No files uploaded yet'}
        </h3>
        <p class="text-dark-400 mb-4">
          {searchQuery ? 'Try adjusting your search terms' : 'Drag and drop files here or click upload to get started'}
        </p>
        {#if !searchQuery}
          <button
            class="btn-primary"
            on:click={() => showUploadModal = true}
          >
            <Upload class="w-4 h-4 mr-2" />
            Upload Files
          </button>
        {/if}
      </div>
    </div>
  {:else if viewMode === 'grid'}
    <!-- Grid View -->
    <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
      {#each filteredFiles as file (file.id)}
        <div class="card hover:bg-dark-800 transition-colors group">
          <div class="flex items-center justify-between mb-3">
            <input
              type="checkbox"
              checked={selectedFiles.has(file.id)}
              on:change={() => toggleFileSelection(file.id)}
              class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500"
            />
            <div class="opacity-0 group-hover:opacity-100 transition-opacity flex items-center space-x-1">
              <button
                class="p-1 text-dark-400 hover:text-white rounded"
                on:click={() => downloadFile(file)}
                title="Download"
              >
                <Download class="w-4 h-4" />
              </button>
              <button
                class="p-1 text-dark-400 hover:text-white rounded"
                on:click={() => shareFile(file)}
                title="Share"
              >
                <Share class="w-4 h-4" />
              </button>
              <button
                class="p-1 text-red-400 hover:text-red-300 rounded"
                on:click={() => deleteFile(file.id)}
                title="Delete"
              >
                <Trash2 class="w-4 h-4" />
              </button>
            </div>
          </div>
          
          <div class="text-center mb-3">
            <svelte:component this={getFileIcon(file.type)} class="w-12 h-12 text-primary-400 mx-auto mb-2" />
            <h3 class="text-sm font-medium text-white truncate" title={file.name}>
              {file.name}
            </h3>
          </div>
          
          <div class="text-xs text-dark-400 space-y-1">
            <div class="flex justify-between">
              <span>Size:</span>
              <span>{formatFileSize(file.size)}</span>
            </div>
            <div class="flex justify-between">
              <span>Modified:</span>
              <span>{formatDate(file.createdAt)}</span>
            </div>
            <div class="flex justify-between">
              <span>Access:</span>
              <span class={file.isPublic ? 'text-green-400' : 'text-yellow-400'}>
                {file.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
          </div>
        </div>
      {/each}
    </div>
  {:else}
    <!-- List View -->
    <div class="bg-dark-900 rounded-lg border border-dark-800 overflow-hidden">
      <div class="px-6 py-3 border-b border-dark-800 bg-dark-800">
        <div class="flex items-center">
          <input
            type="checkbox"
            checked={selectedFiles.size === filteredFiles.length && filteredFiles.length > 0}
            indeterminate={selectedFiles.size > 0 && selectedFiles.size < filteredFiles.length}
            on:change={selectAllFiles}
            class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500 mr-4"
          />
          <div class="grid grid-cols-12 gap-4 w-full text-sm font-medium text-dark-300">
            <div class="col-span-5">Name</div>
            <div class="col-span-2">Size</div>
            <div class="col-span-2">Modified</div>
            <div class="col-span-2">Access</div>
            <div class="col-span-1">Actions</div>
          </div>
        </div>
      </div>
      
      <div class="divide-y divide-dark-800">
        {#each filteredFiles as file (file.id)}
          <div class="px-6 py-4 hover:bg-dark-800 transition-colors">
            <div class="flex items-center">
              <input
                type="checkbox"
                checked={selectedFiles.has(file.id)}
                on:change={() => toggleFileSelection(file.id)}
                class="rounded border-dark-700 bg-dark-800 text-primary-600 focus:ring-primary-500 mr-4"
              />
              <div class="grid grid-cols-12 gap-4 w-full items-center">
                <div class="col-span-5 flex items-center space-x-3">
                  <svelte:component this={getFileIcon(file.type)} class="w-5 h-5 text-primary-400 flex-shrink-0" />
                  <span class="text-white truncate">{file.name}</span>
                </div>
                <div class="col-span-2 text-dark-300 text-sm">
                  {formatFileSize(file.size)}
                </div>
                <div class="col-span-2 text-dark-300 text-sm">
                  {formatDate(file.createdAt)}
                </div>
                <div class="col-span-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {file.isPublic ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}">
                    {file.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <div class="col-span-1 flex items-center space-x-1">
                  <button
                    class="p-1 text-dark-400 hover:text-white rounded"
                    on:click={() => downloadFile(file)}
                    title="Download"
                  >
                    <Download class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1 text-dark-400 hover:text-white rounded"
                    on:click={() => shareFile(file)}
                    title="Share"
                  >
                    <Share class="w-4 h-4" />
                  </button>
                  <button
                    class="p-1 text-red-400 hover:text-red-300 rounded"
                    on:click={() => deleteFile(file.id)}
                    title="Delete"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</main>

<!-- Upload Modal -->
{#if showUploadModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Upload Files</h2>
        
        <div class="border-2 border-dashed border-dark-700 rounded-lg p-8 text-center">
          <Upload class="w-12 h-12 text-dark-600 mx-auto mb-4" />
          <p class="text-white mb-2">Drag and drop files here</p>
          <p class="text-dark-400 text-sm mb-4">or</p>
          <input
            type="file"
            multiple
            class="hidden"
            id="file-upload"
            on:change={(e) => {
              const files = Array.from(e.target.files || []);
              handleFileUpload(files);
              showUploadModal = false;
            }}
          />
          <label for="file-upload" class="btn-primary cursor-pointer">
            Choose Files
          </label>
        </div>
        
        <div class="flex items-center justify-end space-x-3 mt-6">
          <button
            class="btn-secondary"
            on:click={() => showUploadModal = false}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}