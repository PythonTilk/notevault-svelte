import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export interface SavedSearch {
  id: string;
  name: string;
  query: string;
  searchType: 'all' | 'notes' | 'workspaces' | 'files';
  createdAt: Date;
  lastUsed: Date;
  useCount: number;
}

// Create stores
export const savedSearches = writable<SavedSearch[]>([]);

// Local storage key
const STORAGE_KEY = 'notevault_saved_searches';

// Load saved searches from localStorage on initialization
function loadSavedSearches(): SavedSearch[] {
  if (!browser) return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    return parsed.map((search: any) => ({
      ...search,
      createdAt: new Date(search.createdAt),
      lastUsed: new Date(search.lastUsed)
    }));
  } catch (error) {
    console.error('Failed to load saved searches:', error);
    return [];
  }
}

// Save searches to localStorage
function saveToLocalStorage(searches: SavedSearch[]) {
  if (!browser) return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Failed to save searches:', error);
  }
}

// Initialize store
if (browser) {
  savedSearches.set(loadSavedSearches());
}

export const savedSearchStore = {
  // Save a new search
  save: (name: string, query: string, searchType: SavedSearch['searchType'] = 'all') => {
    const newSearch: SavedSearch = {
      id: `search_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      query,
      searchType,
      createdAt: new Date(),
      lastUsed: new Date(),
      useCount: 1
    };

    savedSearches.update(searches => {
      // Check if search already exists
      const existingIndex = searches.findIndex(s => 
        s.query.toLowerCase() === query.toLowerCase() && s.searchType === searchType
      );

      let updatedSearches;
      if (existingIndex >= 0) {
        // Update existing search
        updatedSearches = searches.map((search, index) =>
          index === existingIndex 
            ? { ...search, name, lastUsed: new Date(), useCount: search.useCount + 1 }
            : search
        );
      } else {
        // Add new search
        updatedSearches = [newSearch, ...searches];
      }

      // Keep only the 20 most recent searches
      updatedSearches = updatedSearches
        .sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime())
        .slice(0, 20);

      saveToLocalStorage(updatedSearches);
      return updatedSearches;
    });

    return newSearch.id;
  },

  // Delete a saved search
  delete: (searchId: string) => {
    savedSearches.update(searches => {
      const updatedSearches = searches.filter(s => s.id !== searchId);
      saveToLocalStorage(updatedSearches);
      return updatedSearches;
    });
  },

  // Update last used timestamp when search is executed
  markAsUsed: (searchId: string) => {
    savedSearches.update(searches => {
      const updatedSearches = searches.map(search =>
        search.id === searchId
          ? { ...search, lastUsed: new Date(), useCount: search.useCount + 1 }
          : search
      );
      saveToLocalStorage(updatedSearches);
      return updatedSearches;
    });
  },

  // Rename a saved search
  rename: (searchId: string, newName: string) => {
    savedSearches.update(searches => {
      const updatedSearches = searches.map(search =>
        search.id === searchId
          ? { ...search, name: newName }
          : search
      );
      saveToLocalStorage(updatedSearches);
      return updatedSearches;
    });
  },

  // Clear all saved searches
  clear: () => {
    savedSearches.set([]);
    saveToLocalStorage([]);
  },

  // Get search suggestions based on query
  getSuggestions: (query: string): SavedSearch[] => {
    let searches: SavedSearch[] = [];
    savedSearches.subscribe(s => searches = s)();
    
    if (!query.trim()) return searches.slice(0, 5);
    
    const lowerQuery = query.toLowerCase();
    return searches
      .filter(search => 
        search.name.toLowerCase().includes(lowerQuery) ||
        search.query.toLowerCase().includes(lowerQuery)
      )
      .sort((a, b) => b.useCount - a.useCount)
      .slice(0, 5);
  }
};