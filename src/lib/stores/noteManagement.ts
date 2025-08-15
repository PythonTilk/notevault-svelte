import { writable, derived } from 'svelte/store';
import type { Note } from '$lib/types';

// Filter and sort options
export type NoteSortBy = 'updated' | 'created' | 'title' | 'type';
export type NoteSortOrder = 'asc' | 'desc';
export type NoteViewMode = 'grid' | 'list' | 'canvas';

export interface NoteFilters {
  tags: string[];
  type: string | null; // null means all types
  isPublic: boolean | null; // null means all visibility
  collectionId: string | null | 'uncategorized'; // null = all, 'uncategorized' = no collection, string = specific collection
  dateRange: {
    start: Date | null;
    end: Date | null;
  };
  searchQuery: string;
}

export interface NoteSortOptions {
  sortBy: NoteSortBy;
  sortOrder: NoteSortOrder;
}

export interface NoteManagementState {
  filters: NoteFilters;
  sort: NoteSortOptions;
  viewMode: NoteViewMode;
  selectedNotes: string[];
}

// Initial state
const initialState: NoteManagementState = {
  filters: {
    tags: [],
    type: null,
    isPublic: null,
    collectionId: null,
    dateRange: { start: null, end: null },
    searchQuery: ''
  },
  sort: {
    sortBy: 'updated',
    sortOrder: 'desc'
  },
  viewMode: 'canvas',
  selectedNotes: []
};

// Create stores
export const noteManagementState = writable<NoteManagementState>(initialState);

// Individual filter stores for easier access
export const noteFilters = derived(noteManagementState, $state => $state.filters);
export const noteSortOptions = derived(noteManagementState, $state => $state.sort);
export const noteViewMode = derived(noteManagementState, $state => $state.viewMode);
export const selectedNotes = derived(noteManagementState, $state => $state.selectedNotes);

// Helper functions
export const noteManagementStore = {
  // Filter functions
  setTagFilter: (tags: string[]) => {
    noteManagementState.update(state => ({
      ...state,
      filters: { ...state.filters, tags }
    }));
  },

  setTypeFilter: (type: string | null) => {
    noteManagementState.update(state => ({
      ...state,
      filters: { ...state.filters, type }
    }));
  },

  setVisibilityFilter: (isPublic: boolean | null) => {
    noteManagementState.update(state => ({
      ...state,
      filters: { ...state.filters, isPublic }
    }));
  },

  setCollectionFilter: (collectionId: string | null | 'uncategorized') => {
    noteManagementState.update(state => ({
      ...state,
      filters: { ...state.filters, collectionId }
    }));
  },

  setDateRangeFilter: (start: Date | null, end: Date | null) => {
    noteManagementState.update(state => ({
      ...state,
      filters: { 
        ...state.filters, 
        dateRange: { start, end } 
      }
    }));
  },

  setSearchQuery: (searchQuery: string) => {
    noteManagementState.update(state => ({
      ...state,
      filters: { ...state.filters, searchQuery }
    }));
  },

  clearFilters: () => {
    noteManagementState.update(state => ({
      ...state,
      filters: {
        tags: [],
        type: null,
        isPublic: null,
        collectionId: null,
        dateRange: { start: null, end: null },
        searchQuery: ''
      }
    }));
  },

  // Sort functions
  setSortBy: (sortBy: NoteSortBy) => {
    noteManagementState.update(state => ({
      ...state,
      sort: { ...state.sort, sortBy }
    }));
  },

  setSortOrder: (sortOrder: NoteSortOrder) => {
    noteManagementState.update(state => ({
      ...state,
      sort: { ...state.sort, sortOrder }
    }));
  },

  toggleSortOrder: () => {
    noteManagementState.update(state => ({
      ...state,
      sort: { 
        ...state.sort, 
        sortOrder: state.sort.sortOrder === 'asc' ? 'desc' : 'asc' 
      }
    }));
  },

  // View mode functions
  setViewMode: (viewMode: NoteViewMode) => {
    noteManagementState.update(state => ({
      ...state,
      viewMode
    }));
  },

  // Selection functions
  selectNote: (noteId: string) => {
    noteManagementState.update(state => ({
      ...state,
      selectedNotes: [...state.selectedNotes, noteId]
    }));
  },

  deselectNote: (noteId: string) => {
    noteManagementState.update(state => ({
      ...state,
      selectedNotes: state.selectedNotes.filter(id => id !== noteId)
    }));
  },

  toggleNoteSelection: (noteId: string) => {
    noteManagementState.update(state => ({
      ...state,
      selectedNotes: state.selectedNotes.includes(noteId)
        ? state.selectedNotes.filter(id => id !== noteId)
        : [...state.selectedNotes, noteId]
    }));
  },

  selectAllNotes: (noteIds: string[]) => {
    noteManagementState.update(state => ({
      ...state,
      selectedNotes: noteIds
    }));
  },

  clearSelection: () => {
    noteManagementState.update(state => ({
      ...state,
      selectedNotes: []
    }));
  }
};

// Derived store for filtered and sorted notes
export const filteredAndSortedNotes = derived(
  [noteManagementState],
  ([state]) => (notes: Note[]) => {
    let filtered = notes;

    // Apply filters
    if (state.filters.tags.length > 0) {
      filtered = filtered.filter(note => 
        state.filters.tags.some(tag => note.tags.includes(tag))
      );
    }

    if (state.filters.type) {
      filtered = filtered.filter(note => note.type === state.filters.type);
    }

    if (state.filters.isPublic !== null) {
      filtered = filtered.filter(note => note.isPublic === state.filters.isPublic);
    }

    if (state.filters.collectionId !== null) {
      if (state.filters.collectionId === 'uncategorized') {
        filtered = filtered.filter(note => !note.collectionId);
      } else {
        filtered = filtered.filter(note => note.collectionId === state.filters.collectionId);
      }
    }

    if (state.filters.dateRange.start) {
      filtered = filtered.filter(note => 
        note.createdAt >= (state.filters.dateRange.start as Date)
      );
    }

    if (state.filters.dateRange.end) {
      filtered = filtered.filter(note => 
        note.createdAt <= (state.filters.dateRange.end as Date)
      );
    }

    if (state.filters.searchQuery.trim()) {
      const query = state.filters.searchQuery.toLowerCase();
      filtered = filtered.filter(note =>
        note.title.toLowerCase().includes(query) ||
        note.content.toLowerCase().includes(query) ||
        note.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (state.sort.sortBy) {
        case 'title':
          comparison = a.title.localeCompare(b.title);
          break;
        case 'type':
          comparison = a.type.localeCompare(b.type);
          break;
        case 'created':
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case 'updated':
        default:
          comparison = a.updatedAt.getTime() - b.updatedAt.getTime();
          break;
      }

      return state.sort.sortOrder === 'desc' ? -comparison : comparison;
    });

    return filtered;
  }
);

// Derived store for available tags from all notes
export const availableTags = derived(
  [],
  () => (notes: Note[]) => {
    const tagSet = new Set<string>();
    notes.forEach(note => {
      note.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }
);