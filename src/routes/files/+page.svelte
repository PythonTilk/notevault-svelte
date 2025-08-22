<script lang="ts">
  import { onMount } from 'svelte';
  import { Upload, Search, Filter, Grid, List, Download, Share, Trash2, File, Image, Video, Music, Archive, Eye, Folder, FolderPlus, ChevronRight } from 'lucide-svelte';
  import { api } from '$lib/api';
  import type { FileItem } from '$lib/types';
  import { toastStore } from '$lib/stores/toast';
  import LoadingSpinner from '$lib/components/LoadingSpinner.svelte';
  import PageLoading from '$lib/components/PageLoading.svelte';
  import LazyImage from '$lib/components/LazyImage.svelte';
  import { debounce } from '$lib/utils/debounce';

  let files: FileItem[] = [];
  let viewMode: 'grid' | 'list' = 'grid';
  let searchQuery = '';
  let debouncedSearchQuery = '';
  let showAdvancedFilters = false;
  let filterType = '';
  let filterSizeMin = '';
  let filterSizeMax = '';
  let filterDateFrom = '';
  let filterDateTo = '';
  let sortBy: 'name' | 'size' | 'date' = 'date';
  let sortOrder: 'asc' | 'desc' = 'desc';
  let selectedFiles: Set<string> = new Set();
  let showUploadModal = false;
  let showPreviewModal = false;
  let selectedPreviewFile: FileItem | null = null;
  let previewContent: string = '';
  let previewLoading: boolean = false;
  let dragOver = false;
  let showBatchDeleteModal = false;
  let batchOperationProgress: Map<string, number> = new Map();
  let batchOperationError: string | null = null;
  let showCreateFolderModal = false;
  let newFolderName = '';
  let currentFolder: string | null = null;
  let folders: {id: string, name: string, parentId?: string}[] = [];
  let breadcrumbs: {id: string | null, name: string}[] = [{id: null, name: 'Files'}];
  let showMetadata = false;
  let uploadAsPublic = false;

  let loadError: string | null = null;
  let uploadProgress: Map<string, number> = new Map();
  let uploadError: string | null = null;

  let isLoading = true;

  // File upload configuration
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const ALLOWED_TYPES = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'application/pdf', 'text/plain', 'text/markdown',
    'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/zip', 'application/x-zip-compressed'
  ];

  // Create debounced search function
  const debouncedSearch = debounce((query: string) => {
    debouncedSearchQuery = query;
  }, 300);

  // Watch for search query changes
  $: {
    debouncedSearch(searchQuery);
  }

  onMount(async () => {
    await loadFiles();
  });

  async function loadFiles() {
    try {
      isLoading = true;
      loadError = null;
      const data = await api.getFiles({ limit: 100, folderId: currentFolder });
      files = data.map((file: any) => ({
        id: file.id,
        name: file.name,
        type: file.type,
        size: file.size,
        url: api.getFileDownloadUrl(file.id),
        uploaderId: (file.uploadedBy && file.uploadedBy.id) || file.uploaderId || 'unknown',
        workspaceId: file.workspaceId,
        createdAt: new Date(file.createdAt),
        isPublic: file.isPublic,
        folderId: file.folderId
      }));
      
      // Load folders in current directory
      await loadFolders();
    } catch (error) {
      console.error('Failed to load files:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unable to load files';
      loadError = errorMessage;
      toastStore.error('Load Failed', errorMessage);
      files = [];
    } finally {
      isLoading = false;
    }
  }

  async function loadFolders() {
    try {
      // Simulate folder API call - in real app this would be api.getFolders()
      folders = [
        { id: '1', name: 'Documents', parentId: currentFolder },
        { id: '2', name: 'Images', parentId: currentFolder },
        { id: '3', name: 'Archive', parentId: currentFolder }
      ].filter(folder => folder.parentId === currentFolder);
    } catch (error) {
      console.error('Failed to load folders:', error);
      folders = [];
    }
  }

  function navigateToFolder(folderId: string | null, folderName: string) {
    currentFolder = folderId;
    
    if (folderId === null) {
      // Navigate to root
      breadcrumbs = [{id: null, name: 'Files'}];
    } else {
      // Add to breadcrumbs if not already there
      const existingIndex = breadcrumbs.findIndex(b => b.id === folderId);
      if (existingIndex !== -1) {
        // Navigate back to existing breadcrumb
        breadcrumbs = breadcrumbs.slice(0, existingIndex + 1);
      } else {
        // Add new breadcrumb
        breadcrumbs = [...breadcrumbs, {id: folderId, name: folderName}];
      }
    }
    
    loadFiles();
  }

  async function createFolder() {
    if (!newFolderName.trim()) return;
    
    try {
      // Simulate folder creation - in real app this would be api.createFolder()
      const newFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        parentId: currentFolder
      };
      
      folders = [...folders, newFolder];
      newFolderName = '';
      showCreateFolderModal = false;
      
      console.log('Created folder:', newFolder);
    } catch (error) {
      console.error('Failed to create folder:', error);
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

  function getFileTypeDisplay(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      const format = mimeType.split('/')[1].toUpperCase();
      return format === 'JPEG' ? 'JPG' : format;
    }
    if (mimeType.startsWith('video/')) return 'VIDEO';
    if (mimeType.startsWith('audio/')) return 'AUDIO';
    if (mimeType.includes('pdf')) return 'PDF';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'DOC';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return 'XLS';
    if (mimeType.includes('zip') || mimeType.includes('rar')) return 'ARCHIVE';
    if (mimeType.startsWith('text/')) return 'TEXT';
    return 'FILE';
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

  function validateFile(file: File): string | null {
    if (file.size > MAX_FILE_SIZE) {
      return `File "${file.name}" is too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`;
    }
    
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `File type "${file.type}" is not allowed for "${file.name}".`;
    }
    
    return null;
  }

  async function handleFileUpload(uploadedFiles: File[]) {
    uploadError = null;
    
    // Validate all files first
    const validationErrors: string[] = [];
    const validFiles: File[] = [];
    
    for (const file of uploadedFiles) {
      const error = validateFile(file);
      if (error) {
        validationErrors.push(error);
      } else {
        validFiles.push(file);
      }
    }
    
    if (validationErrors.length > 0) {
      const errorMessage = validationErrors.join(' ');
      uploadError = errorMessage;
      toastStore.error('Validation Failed', errorMessage);
      return;
    }

    if (validFiles.length === 0) {
      toastStore.warning('No Files', 'No valid files selected for upload');
      return;
    }
    
    // Upload valid files
    for (const file of validFiles) {
      const fileId = `temp-${Date.now()}-${file.name}`;
      uploadProgress.set(fileId, 0);
      uploadProgress = uploadProgress;
      
      try {
        // Simulate progress (since the API doesn't support progress tracking yet)
        const progressInterval = setInterval(() => {
          const current = uploadProgress.get(fileId) || 0;
          if (current < 90) {
            uploadProgress.set(fileId, current + 10);
            uploadProgress = uploadProgress;
          }
        }, 200);
        
        const uploadedFile = await api.uploadFile(file, undefined, uploadAsPublic);
        
        clearInterval(progressInterval);
        uploadProgress.set(fileId, 100);
        uploadProgress = uploadProgress;
        
        const newFile: FileItem = {
          id: uploadedFile.id,
          name: uploadedFile.name,
          type: uploadedFile.type,
          size: uploadedFile.size,
          url: api.getFileDownloadUrl(uploadedFile.id),
          uploaderId: (uploadedFile.uploadedBy && uploadedFile.uploadedBy.id) || uploadedFile.uploaderId || 'unknown',
          workspaceId: uploadedFile.workspaceId,
          createdAt: new Date(uploadedFile.createdAt),
          isPublic: uploadedFile.isPublic
        };
        
        files = [newFile, ...files];
        
        // Show success message
        toastStore.success('Upload Complete', `Successfully uploaded "${file.name}"`);
        
        // Remove progress after a short delay
        setTimeout(() => {
          uploadProgress.delete(fileId);
          uploadProgress = uploadProgress;
        }, 2000);
        
      } catch (error) {
        uploadProgress.delete(fileId);
        uploadProgress = uploadProgress;
        console.error('Failed to upload file:', file.name, error);
        const errorMessage = `Failed to upload "${file.name}": ${error instanceof Error ? error.message : 'Unknown error'}`;
        uploadError = errorMessage;
        toastStore.error('Upload Failed', errorMessage);
      }
    }
    
    // Show summary if multiple files were uploaded
    if (validFiles.length > 1) {
      const successCount = files.length - (files.length - validFiles.length);
      toastStore.info('Upload Summary', `Completed upload of ${successCount}/${validFiles.length} files`);
    }
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

  async function previewFile(file: FileItem) {
    selectedPreviewFile = file;
    showPreviewModal = true;
    previewContent = '';
    
    // Load text content for text files
    if (file.type.startsWith('text/') || file.name.match(/\.(txt|md|js|ts|css|html|json|xml)$/i)) {
      previewLoading = true;
      try {
        const response = await fetch(api.getFileDownloadUrl(file.id));
        const text = await response.text();
        previewContent = text.length > 10000 ? text.substring(0, 10000) + '\n... (file truncated)' : text;
      } catch (error) {
        console.error('Failed to load text content:', error);
        previewContent = 'Error loading file content';
      } finally {
        previewLoading = false;
      }
    }
  }

  function isPreviewable(file: FileItem): boolean {
    const previewableTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
      'text/plain', 'text/html', 'text/css', 'text/javascript', 'text/markdown',
      'application/json', 'application/xml',
      'application/pdf'
    ];
    return previewableTypes.includes(file.type) || file.name.match(/\.(txt|md|js|ts|css|html|json|xml|pdf)$/i) !== null;
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
        toastStore.success('Shared', `File "${file.name}" shared successfully`);
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Share failed:', error);
          toastStore.error('Share Failed', 'Unable to share file');
        }
        // AbortError means user canceled, don't show error
      }
    } else {
      // Fallback to copying URL to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toastStore.success('Link Copied', `File link copied to clipboard`);
      } catch (error) {
        console.error('Failed to copy URL:', error);
        toastStore.error('Copy Failed', 'Unable to copy file link to clipboard');
      }
    }
  }

  async function deleteFile(fileId: string) {
    const file = files.find(f => f.id === fileId);
    const fileName = file?.name || 'file';
    
    try {
      await api.deleteFile(fileId);
      files = files.filter(f => f.id !== fileId);
      selectedFiles.delete(fileId);
      selectedFiles = selectedFiles;
      toastStore.success('File Deleted', `"${fileName}" has been deleted`);
    } catch (error) {
      console.error('Failed to delete file:', error);
      toastStore.error('Delete Failed', `Unable to delete "${fileName}"`);
    }
  }

  $: filteredFiles = (() => {
    let result = files.filter(file => {
      // Text search (use debounced query for better performance)
      const matchesSearch = !debouncedSearchQuery || 
        file.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase());
      
      // Type filter
      const matchesType = !filterType || (
        filterType === 'image' && file.type.startsWith('image/') ||
        filterType === 'document' && (file.type.includes('pdf') || file.type.includes('document') || file.type.includes('text')) ||
        filterType === 'video' && file.type.startsWith('video/') ||
        filterType === 'audio' && file.type.startsWith('audio/') ||
        filterType === 'archive' && (file.type.includes('zip') || file.type.includes('rar'))
      );
      
      // Size filter
      const fileSizeKB = file.size / 1024;
      const matchesSizeMin = !filterSizeMin || fileSizeKB >= parseFloat(filterSizeMin);
      const matchesSizeMax = !filterSizeMax || fileSizeKB <= parseFloat(filterSizeMax);
      
      // Date filter
      const fileDate = file.createdAt;
      const matchesDateFrom = !filterDateFrom || fileDate >= new Date(filterDateFrom);
      const matchesDateTo = !filterDateTo || fileDate <= new Date(filterDateTo + 'T23:59:59');
      
      return matchesSearch && matchesType && matchesSizeMin && matchesSizeMax && matchesDateFrom && matchesDateTo;
    });
    
    // Sort results
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name);
          break;
        case 'size':
          comparison = a.size - b.size;
          break;
        case 'date':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });
    
    return result;
  })();

  // Batch download selected files
  async function downloadSelectedFiles() {
    if (selectedFiles.size === 0) return;
    
    try {
      batchOperationError = null;
      batchOperationProgress.clear();
      
      const fileIds = Array.from(selectedFiles);
      
      // Initialize progress for each file
      fileIds.forEach(id => batchOperationProgress.set(id, 0));
      batchOperationProgress = batchOperationProgress;
      
      // Download each file sequentially
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (!file) continue;
        
        try {
          // Update progress
          batchOperationProgress.set(fileId, 50);
          batchOperationProgress = batchOperationProgress;
          
          // Create download link and trigger download
          const downloadUrl = api.getFileDownloadUrl(fileId);
          const a = document.createElement('a');
          a.href = downloadUrl;
          a.download = file.name;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          
          // Complete progress
          batchOperationProgress.set(fileId, 100);
          batchOperationProgress = batchOperationProgress;
          
          // Small delay between downloads to avoid browser blocking
          await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
          console.error(`Failed to download file ${file.name}:`, error);
          batchOperationError = `Failed to download "${file.name}"`;
          break;
        }
      }
      
      if (!batchOperationError) {
        toastStore.success('Download Complete', `Downloaded ${fileIds.length} file(s)`);
        selectedFiles.clear();
        selectedFiles = selectedFiles;
      }
    } catch (error) {
      console.error('Batch download failed:', error);
      batchOperationError = 'Batch download failed';
    } finally {
      // Clear progress after 3 seconds
      setTimeout(() => {
        batchOperationProgress.clear();
        batchOperationProgress = batchOperationProgress;
      }, 3000);
    }
  }

  // Share selected files
  async function shareSelectedFiles() {
    if (selectedFiles.size === 0) return;
    
    try {
      const fileIds = Array.from(selectedFiles);
      const shareUrls = fileIds.map(id => {
        const file = files.find(f => f.id === id);
        return `${window.location.origin}/files/shared/${id}`;
      });
      
      // Copy all share URLs to clipboard
      const shareText = fileIds.length === 1 
        ? shareUrls[0]
        : shareUrls.join('\n');
      
      await navigator.clipboard.writeText(shareText);
      
      const fileNames = fileIds.map(id => {
        const file = files.find(f => f.id === id);
        return file?.name || 'Unknown';
      }).join(', ');
      
      toastStore.success(
        'Share Links Copied', 
        `Share links for ${fileIds.length} file(s) copied to clipboard`
      );
      
      selectedFiles.clear();
      selectedFiles = selectedFiles;
    } catch (error) {
      console.error('Failed to share files:', error);
      toastStore.error('Share Failed', 'Unable to copy share links to clipboard');
    }
  }

  // Delete selected files
  async function deleteSelectedFiles() {
    if (selectedFiles.size === 0) return;
    
    try {
      batchOperationError = null;
      batchOperationProgress.clear();
      
      const fileIds = Array.from(selectedFiles);
      
      // Initialize progress for each file
      fileIds.forEach(id => batchOperationProgress.set(id, 0));
      batchOperationProgress = batchOperationProgress;
      
      let successCount = 0;
      let failedFiles: string[] = [];
      
      // Delete each file
      for (const fileId of fileIds) {
        const file = files.find(f => f.id === fileId);
        if (!file) continue;
        
        try {
          // Update progress
          batchOperationProgress.set(fileId, 50);
          batchOperationProgress = batchOperationProgress;
          
          // Delete file via API
          await api.deleteFile(fileId);
          
          // Remove from local state
          files = files.filter(f => f.id !== fileId);
          selectedFiles.delete(fileId);
          
          // Complete progress
          batchOperationProgress.set(fileId, 100);
          batchOperationProgress = batchOperationProgress;
          
          successCount++;
        } catch (error) {
          console.error(`Failed to delete file ${file.name}:`, error);
          failedFiles.push(file.name);
          batchOperationProgress.set(fileId, -1); // Mark as failed
          batchOperationProgress = batchOperationProgress;
        }
      }
      
      // Update selected files
      selectedFiles = selectedFiles;
      
      // Show results
      if (successCount > 0) {
        toastStore.success('Delete Complete', `Deleted ${successCount} file(s)`);
      }
      
      if (failedFiles.length > 0) {
        batchOperationError = `Failed to delete: ${failedFiles.join(', ')}`;
      }
      
      // Close modal
      showBatchDeleteModal = false;
    } catch (error) {
      console.error('Batch delete failed:', error);
      batchOperationError = 'Batch delete operation failed';
    } finally {
      // Clear progress after 3 seconds
      setTimeout(() => {
        batchOperationProgress.clear();
        batchOperationProgress = batchOperationProgress;
      }, 3000);
    }
  }
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
      <button
        class="btn-secondary"
        on:click={() => showCreateFolderModal = true}
      >
        <FolderPlus class="w-4 h-4 mr-2" />
        New Folder
      </button>
    </div>
  </div>
</header>

<!-- Breadcrumbs -->
<div class="bg-dark-950 border-b border-dark-800 px-6 py-2">
  <nav class="flex items-center space-x-1 text-sm">
    {#each breadcrumbs as crumb, index}
      {#if index > 0}
        <ChevronRight class="w-4 h-4 text-dark-500" />
      {/if}
      <button
        class="text-dark-400 hover:text-white transition-colors {index === breadcrumbs.length - 1 ? 'text-white font-medium' : ''}"
        on:click={() => navigateToFolder(crumb.id, crumb.name)}
        disabled={index === breadcrumbs.length - 1}
      >
        {crumb.name}
      </button>
    {/each}
  </nav>
</div>

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
      
      <!-- Quick Select All/None -->
      {#if filteredFiles.length > 0}
        <div class="flex items-center space-x-2">
          <button
            class="text-sm text-primary-400 hover:text-primary-300 transition-colors"
            on:click={() => {
              if (selectedFiles.size === filteredFiles.length) {
                selectedFiles.clear();
              } else {
                selectedFiles = new Set(filteredFiles.map(f => f.id));
              }
              selectedFiles = selectedFiles;
            }}
          >
            {selectedFiles.size === filteredFiles.length ? 'Deselect All' : 'Select All'}
            ({filteredFiles.length})
          </button>
        </div>
      {/if}
      
      <!-- Filters -->
      <button 
        class="btn-ghost {showAdvancedFilters ? 'bg-primary-600 text-white' : ''}"
        on:click={() => showAdvancedFilters = !showAdvancedFilters}
      >
        <Filter class="w-4 h-4 mr-2" />
        Filters
        {#if filterType || filterSizeMin || filterSizeMax || filterDateFrom || filterDateTo}
          <span class="ml-1 bg-primary-500 text-white rounded-full px-2 py-0.5 text-xs">ON</span>
        {/if}
      </button>
      
      <!-- Metadata Toggle -->
      <button 
        class="btn-ghost {showMetadata ? 'bg-primary-600 text-white' : ''}"
        on:click={() => showMetadata = !showMetadata}
        title="Toggle detailed metadata"
      >
        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Metadata
      </button>
      
      {#if selectedFiles.size > 0}
        <div class="flex items-center space-x-2 bg-primary-900/20 px-3 py-1 rounded-lg border border-primary-800/30">
          <span class="text-sm font-medium text-primary-300">{selectedFiles.size} selected</span>
          <div class="w-px h-4 bg-primary-700"></div>
          <button 
            class="btn-ghost text-sm py-1 px-2"
            on:click={downloadSelectedFiles}
            disabled={selectedFiles.size === 0}
            title="Download selected files"
          >
            <Download class="w-4 h-4 mr-1" />
            Download
          </button>
          <button 
            class="btn-ghost text-sm py-1 px-2"
            on:click={shareSelectedFiles}
            disabled={selectedFiles.size === 0}
            title="Share selected files"
          >
            <Share class="w-4 h-4 mr-1" />
            Share
          </button>
          <button 
            class="btn-ghost text-sm text-red-400 hover:text-red-300 py-1 px-2"
            on:click={() => showBatchDeleteModal = true}
            disabled={selectedFiles.size === 0}
            title="Delete selected files"
          >
            <Trash2 class="w-4 h-4 mr-1" />
            Delete
          </button>
        </div>
      {/if}
    </div>
    
    <div class="flex items-center space-x-4">
      <!-- Sort Options -->
      <div class="flex items-center space-x-2">
        <span class="text-sm text-dark-400">Sort:</span>
        <select 
          bind:value={sortBy}
          class="bg-dark-800 border border-dark-700 text-white text-sm rounded px-2 py-1"
        >
          <option value="date">Date</option>
          <option value="name">Name</option>
          <option value="size">Size</option>
        </select>
        <button
          class="p-1 text-dark-400 hover:text-white transition-colors"
          on:click={() => sortOrder = sortOrder === 'asc' ? 'desc' : 'asc'}
          title="{sortOrder === 'asc' ? 'Ascending' : 'Descending'}"
        >
          {#if sortOrder === 'asc'}
            ↑
          {:else}
            ↓
          {/if}
        </button>
      </div>
      
      <!-- View Mode -->
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
</div>

<!-- Advanced Filters Panel -->
{#if showAdvancedFilters}
  <div class="bg-dark-800 border-b border-dark-700 px-6 py-4">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <!-- File Type Filter -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">File Type</label>
        <select 
          bind:value={filterType}
          class="w-full bg-dark-700 border border-dark-600 text-white text-sm rounded px-3 py-2"
        >
          <option value="">All Types</option>
          <option value="image">Images</option>
          <option value="document">Documents</option>
          <option value="video">Videos</option>
          <option value="audio">Audio</option>
          <option value="archive">Archives</option>
        </select>
      </div>
      
      <!-- Size Filter -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Size (KB)</label>
        <div class="flex space-x-2">
          <input
            type="number"
            bind:value={filterSizeMin}
            placeholder="Min"
            class="w-full bg-dark-700 border border-dark-600 text-white text-sm rounded px-3 py-2"
          />
          <input
            type="number"
            bind:value={filterSizeMax}
            placeholder="Max"
            class="w-full bg-dark-700 border border-dark-600 text-white text-sm rounded px-3 py-2"
          />
        </div>
      </div>
      
      <!-- Date Range Filter -->
      <div>
        <label class="block text-sm font-medium text-dark-300 mb-2">Upload Date</label>
        <div class="flex space-x-2">
          <input
            type="date"
            bind:value={filterDateFrom}
            class="w-full bg-dark-700 border border-dark-600 text-white text-sm rounded px-3 py-2"
          />
          <input
            type="date"
            bind:value={filterDateTo}
            class="w-full bg-dark-700 border border-dark-600 text-white text-sm rounded px-3 py-2"
          />
        </div>
      </div>
      
      <!-- Clear Filters -->
      <div class="flex items-end">
        <button
          class="w-full bg-red-600 hover:bg-red-700 text-white text-sm rounded px-3 py-2 transition-colors"
          on:click={() => {
            filterType = '';
            filterSizeMin = '';
            filterSizeMax = '';
            filterDateFrom = '';
            filterDateTo = '';
          }}
        >
          Clear Filters
        </button>
      </div>
    </div>
  </div>
{/if}

<!-- Main Content -->
<main 
  class="flex-1 overflow-auto p-6 {dragOver ? 'bg-primary-500/10' : ''}"
  on:dragover={handleDragOver}
  on:dragleave={handleDragLeave}
  on:drop={handleDrop}
>
  <!-- Upload Progress and Errors -->
  {#if uploadProgress.size > 0}
    <div class="mb-4 space-y-2">
      {#each Array.from(uploadProgress.entries()) as [fileId, progress]}
        <div class="bg-dark-800 rounded-lg p-3">
          <div class="flex items-center justify-between mb-2">
            <span class="text-sm text-white">{fileId.split('-').slice(2).join('-')}</span>
            <span class="text-sm text-dark-400">{progress}%</span>
          </div>
          <div class="w-full bg-dark-700 rounded-full h-2">
            <div class="bg-primary-500 h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
          </div>
        </div>
      {/each}
    </div>
  {/if}

  {#if uploadError}
    <div class="mb-4 bg-red-900/20 border border-red-800 rounded-lg p-4">
      <div class="flex items-center">
        <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        <span class="text-red-400 text-sm">{uploadError}</span>
        <button class="ml-auto text-red-400 hover:text-red-300" on:click={() => uploadError = null}>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        </button>
      </div>
    </div>
  {/if}

  {#if isLoading}
    <PageLoading title="Loading Files..." message="Please wait while we fetch your files" />
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
      <!-- Folders -->
      {#each folders as folder (folder.id)}
        <div class="card hover:bg-dark-800 transition-colors group cursor-pointer"
             on:click={() => navigateToFolder(folder.id, folder.name)}>
          <div class="text-center mb-3">
            <Folder class="w-12 h-12 text-blue-400 mx-auto mb-2" />
            <h3 class="text-sm font-medium text-white truncate" title={folder.name}>
              {folder.name}
            </h3>
          </div>
        </div>
      {/each}
      
      <!-- Files -->
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
              {#if isPreviewable(file)}
                <button
                  class="p-1 text-dark-400 hover:text-white rounded"
                  on:click={() => previewFile(file)}
                  title="Preview"
                >
                  <Eye class="w-4 h-4" />
                </button>
              {/if}
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
              <span>Type:</span>
              <span class="text-primary-400 uppercase">{getFileTypeDisplay(file.type)}</span>
            </div>
            {#if showMetadata}
              <div class="flex justify-between">
                <span>Uploaded:</span>
                <span>{formatDate(file.createdAt)}</span>
              </div>
              <div class="flex justify-between">
                <span>Access:</span>
                <span class={file.isPublic ? 'text-green-400' : 'text-yellow-400'}>
                  {file.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
              {#if file.type.startsWith('image/')}
                <div class="flex justify-between">
                  <span>Preview:</span>
                  <span class="text-green-400">Available</span>
                </div>
              {/if}
              <div class="flex justify-between">
                <span>MIME:</span>
                <span class="text-xs text-dark-500 truncate">{file.type}</span>
              </div>
            {/if}
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
        <!-- Folders -->
        {#each folders as folder (folder.id)}
          <div class="px-6 py-4 hover:bg-dark-800 transition-colors cursor-pointer"
               on:click={() => navigateToFolder(folder.id, folder.name)}>
            <div class="flex items-center">
              <div class="w-4 mr-4"></div> <!-- Placeholder for checkbox alignment -->
              <div class="grid grid-cols-12 gap-4 w-full items-center">
                <div class="col-span-5 flex items-center space-x-3">
                  <Folder class="w-5 h-5 text-blue-400 flex-shrink-0" />
                  <span class="text-white truncate font-medium">{folder.name}</span>
                </div>
                <div class="col-span-2 text-dark-300 text-sm">
                  --
                </div>
                <div class="col-span-2 text-dark-300 text-sm">
                  --
                </div>
                <div class="col-span-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/10 text-blue-400">
                    Folder
                  </span>
                </div>
                <div class="col-span-1 flex items-center space-x-1">
                  <!-- No actions for folders in list view -->
                </div>
              </div>
            </div>
          </div>
        {/each}
        
        <!-- Files -->
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
                  <div>{formatFileSize(file.size)}</div>
                  <div class="text-xs text-dark-500">{getFileTypeDisplay(file.type)}</div>
                </div>
                <div class="col-span-2 text-dark-300 text-sm">
                  <div>{formatDate(file.createdAt)}</div>
                  <div class="text-xs text-dark-500">Uploaded</div>
                </div>
                <div class="col-span-2">
                  <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium {file.isPublic ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}">
                    {file.isPublic ? 'Public' : 'Private'}
                  </span>
                </div>
                <div class="col-span-1 flex items-center space-x-1">
                  {#if isPreviewable(file)}
                    <button
                      class="p-1 text-dark-400 hover:text-white rounded"
                      on:click={() => previewFile(file)}
                      title="Preview"
                    >
                      <Eye class="w-4 h-4" />
                    </button>
                  {/if}
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
        
        <!-- Privacy Settings -->
        <div class="mt-6 p-4 bg-dark-800 rounded-lg">
          <h3 class="text-sm font-medium text-white mb-3">Privacy Settings</h3>
          <div class="space-y-3">
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                bind:group={uploadAsPublic}
                value={false}
                class="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 focus:ring-primary-500 focus:ring-2"
              />
              <div class="ml-3">
                <span class="text-sm text-white">Private</span>
                <p class="text-xs text-dark-400">Only you and workspace members can access</p>
              </div>
            </label>
            <label class="flex items-center cursor-pointer">
              <input
                type="radio"
                bind:group={uploadAsPublic}
                value={true}
                class="w-4 h-4 text-primary-600 bg-dark-700 border-dark-600 focus:ring-primary-500 focus:ring-2"
              />
              <div class="ml-3">
                <span class="text-sm text-white">Public</span>
                <p class="text-xs text-dark-400">Anyone with the link can access</p>
              </div>
            </label>
          </div>
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

<!-- File Preview Modal -->
{#if showPreviewModal && selectedPreviewFile}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-4xl max-h-[90vh] overflow-hidden">
      <div class="p-6 border-b border-dark-800">
        <div class="flex items-center justify-between">
          <div>
            <h2 class="text-xl font-semibold text-white">{selectedPreviewFile.name}</h2>
            <div class="text-dark-400 text-sm space-y-1">
              <p>{formatFileSize(selectedPreviewFile.size)} • {getFileTypeDisplay(selectedPreviewFile.type)}</p>
              <p>Uploaded: {formatDate(selectedPreviewFile.createdAt)}</p>
              <p>Type: {selectedPreviewFile.type || 'Unknown type'}</p>
              <p class="{selectedPreviewFile.isPublic ? 'text-green-400' : 'text-yellow-400'}">
                Access: {selectedPreviewFile.isPublic ? 'Public' : 'Private'}
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-2">
            <button
              class="btn-secondary"
              on:click={() => downloadFile(selectedPreviewFile)}
            >
              <Download class="w-4 h-4 mr-2" />
              Download
            </button>
            <button
              class="text-dark-400 hover:text-white p-2"
              on:click={() => showPreviewModal = false}
              title="Close"
            >
              ×
            </button>
          </div>
        </div>
      </div>
      
      <div class="p-6 overflow-auto max-h-[70vh]">
        {#if selectedPreviewFile.type.startsWith('image/')}
          <!-- Image Preview -->
          <div class="text-center">
            <img
              src={api.getFileDownloadUrl(selectedPreviewFile.id)}
              alt={selectedPreviewFile.name}
              class="max-w-full max-h-96 object-contain mx-auto rounded-lg"
              on:error={() => {
                console.error('Failed to load image preview');
              }}
            />
          </div>
        {:else if selectedPreviewFile.type === 'application/pdf'}
          <!-- PDF Preview -->
          <div class="text-center">
            <iframe
              src={`${api.getFileDownloadUrl(selectedPreviewFile.id)}#toolbar=0`}
              title={selectedPreviewFile.name}
              class="w-full h-96 border border-dark-700 rounded-lg"
            ></iframe>
          </div>
        {:else if selectedPreviewFile.type.startsWith('text/') || selectedPreviewFile.name.match(/\.(txt|md|js|ts|css|html|json|xml)$/i)}
          <!-- Text File Preview -->
          <div class="bg-dark-800 rounded-lg p-4 font-mono text-sm overflow-auto max-h-96">
            {#if previewLoading}
              <div class="text-dark-400">Loading...</div>
            {:else if previewContent}
              <pre class="text-dark-300 whitespace-pre-wrap">{previewContent}</pre>
            {:else}
              <div class="text-red-400">Error loading file content</div>
            {/if}
          </div>
        {:else}
          <!-- Unsupported File Type -->
          <div class="text-center py-12">
            <svelte:component this={getFileIcon(selectedPreviewFile.type)} class="w-16 h-16 text-dark-600 mx-auto mb-4" />
            <h3 class="text-lg font-medium text-white mb-2">Preview not available</h3>
            <p class="text-dark-400 mb-4">
              This file type cannot be previewed in the browser.
            </p>
            <button
              class="btn-primary"
              on:click={() => downloadFile(selectedPreviewFile)}
            >
              <Download class="w-4 h-4 mr-2" />
              Download to view
            </button>
          </div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<!-- Batch Delete Confirmation Modal -->
{#if showBatchDeleteModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Delete Files</h2>
        
        <p class="text-dark-300 mb-4">
          Are you sure you want to delete {selectedFiles.size} selected file(s)? This action cannot be undone.
        </p>
        
        <!-- List files to be deleted -->
        <div class="max-h-40 overflow-y-auto bg-dark-800 rounded p-3 mb-4">
          {#each files.filter(f => selectedFiles.has(f.id)) as file}
            <div class="flex items-center space-x-2 py-1">
              <svelte:component this={getFileIcon(file.type)} class="w-4 h-4 text-primary-400" />
              <span class="text-sm text-white truncate">{file.name}</span>
            </div>
          {/each}
        </div>
        
        <div class="flex items-center justify-end space-x-3">
          <button
            class="btn-secondary"
            on:click={() => showBatchDeleteModal = false}
          >
            Cancel
          </button>
          <button
            class="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
            on:click={deleteSelectedFiles}
          >
            Delete {selectedFiles.size} File(s)
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<!-- Batch Operation Error -->
{#if batchOperationError}
  <div class="fixed bottom-4 right-4 bg-red-900/90 border border-red-800 rounded-lg p-4 max-w-sm z-50">
    <div class="flex items-center">
      <svg class="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
      <span class="text-red-400 text-sm">{batchOperationError}</span>
      <button class="ml-auto text-red-400 hover:text-red-300" on:click={() => batchOperationError = null}>
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
        </svg>
      </button>
    </div>
  </div>
{/if}

<!-- Create Folder Modal -->
{#if showCreateFolderModal}
  <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div class="bg-dark-900 rounded-lg border border-dark-800 w-full max-w-md">
      <div class="p-6">
        <h2 class="text-xl font-semibold text-white mb-4">Create New Folder</h2>
        
        <form on:submit|preventDefault={createFolder} class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-dark-300 mb-2">Folder Name</label>
            <input
              type="text"
              bind:value={newFolderName}
              placeholder="Enter folder name..."
              class="input w-full"
              required
              autofocus
            />
          </div>
          
          <div class="flex items-center justify-end space-x-3">
            <button
              type="button"
              class="btn-secondary"
              on:click={() => {
                showCreateFolderModal = false;
                newFolderName = '';
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              class="btn-primary"
              disabled={!newFolderName.trim()}
            >
              <FolderPlus class="w-4 h-4 mr-2" />
              Create Folder
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}