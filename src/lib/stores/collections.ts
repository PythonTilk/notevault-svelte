import { writable, derived } from 'svelte/store';
import type { NoteCollection } from '$lib/types';

// Generate dynamic mock collections based on current workspace
function generateMockCollections(workspaceId: string): NoteCollection[] {
  if (!workspaceId) return [];
  
  return [
    {
      id: `collection-${workspaceId}-1`,
      name: 'Project Ideas',
      description: 'Ideas for future projects',
      workspaceId: workspaceId,
      authorId: 'user-1',
      color: '#3b82f6',
      icon: '💡',
      isExpanded: true,
      sortOrder: 0,
      createdAt: new Date('2024-01-15'),
      updatedAt: new Date('2024-01-15')
    },
    {
      id: `collection-${workspaceId}-2`,
      name: 'Research',
      description: 'Research notes and references',
      workspaceId: workspaceId,
      authorId: 'user-1',
      color: '#10b981',
      icon: '📚',
      isExpanded: false,
      sortOrder: 1,
      createdAt: new Date('2024-01-16'),
      updatedAt: new Date('2024-01-16')
    },
    {
      id: `collection-${workspaceId}-3`,
      name: 'Meeting Notes',
      description: 'Notes from meetings and discussions',
      workspaceId: workspaceId,
      authorId: 'user-1',
      parentId: `collection-${workspaceId}-2`,
      color: '#8b5cf6',
      icon: '📝',
      isExpanded: true,
      sortOrder: 0,
      createdAt: new Date('2024-01-17'),
      updatedAt: new Date('2024-01-17')
    }
  ];
}

// Collections store - initialized as empty, populated when workspace is loaded
export const collectionsStore = writable<NoteCollection[]>([]);

// Function to load collections for a workspace  
export function loadCollectionsForWorkspace(workspaceId: string) {
  const collections = generateMockCollections(workspaceId);
  collectionsStore.set(collections);
}

// Derived stores
export const collectionsTree = derived([collectionsStore], ([collections]) => {
  // Safety check to ensure collections is always an array
  if (!collections || !Array.isArray(collections)) {
    return [];
  }
  
  const buildTree = (parentId?: string): NoteCollection[] => {
    return collections
      .filter(c => c.parentId === parentId)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(collection => ({
        ...collection,
        children: buildTree(collection.id)
      }));
  };
  
  return buildTree();
});

// Collection management functions
export const collectionStore = {
  create: async (collection: Omit<NoteCollection, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newCollection: NoteCollection = {
      ...collection,
      id: `collection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    collectionsStore.update(collections => [...collections, newCollection]);
    return newCollection;
  },

  update: async (id: string, updates: Partial<NoteCollection>) => {
    collectionsStore.update(collections =>
      collections.map(c => 
        c.id === id 
          ? { ...c, ...updates, updatedAt: new Date() }
          : c
      )
    );
  },

  delete: async (id: string) => {
    collectionsStore.update(collections => {
      // Remove the collection and move any child collections to parent
      const collectionToDelete = collections.find(c => c.id === id);
      if (!collectionToDelete) return collections;

      return collections
        .filter(c => c.id !== id)
        .map(c => 
          c.parentId === id 
            ? { ...c, parentId: collectionToDelete.parentId }
            : c
        );
    });
  },

  toggleExpanded: (id: string) => {
    collectionsStore.update(collections =>
      collections.map(c => 
        c.id === id 
          ? { ...c, isExpanded: !c.isExpanded }
          : c
      )
    );
  },

  move: async (id: string, newParentId?: string, newSortOrder?: number) => {
    collectionsStore.update(collections =>
      collections.map(c => 
        c.id === id 
          ? { 
              ...c, 
              parentId: newParentId, 
              sortOrder: newSortOrder ?? c.sortOrder,
              updatedAt: new Date() 
            }
          : c
      )
    );
  },

  getByWorkspace: (workspaceId: string) => {
    return derived([collectionsStore], ([collections]) =>
      collections.filter(c => c.workspaceId === workspaceId)
    );
  },

  getById: (id: string) => {
    return derived([collectionsStore], ([collections]) =>
      collections.find(c => c.id === id)
    );
  }
};