import { writable } from 'svelte/store';
import type { Workspace, Note } from '$lib/types';

export const workspaces = writable<Workspace[]>([]);
export const currentWorkspace = writable<Workspace | null>(null);
export const workspaceNotes = writable<Note[]>([]);

// Mock data
const mockWorkspaces: Workspace[] = [
  {
    id: '1',
    name: 'Personal Projects',
    description: 'My personal workspace for side projects',
    color: '#ef4444',
    ownerId: '1',
    members: [{ userId: '1', role: 'owner', joinedAt: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false
  },
  {
    id: '2',
    name: 'Team Collaboration',
    description: 'Shared workspace for team projects',
    color: '#3b82f6',
    ownerId: '1',
    members: [
      { userId: '1', role: 'owner', joinedAt: new Date() },
      { userId: '2', role: 'admin', joinedAt: new Date() }
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true
  },
  {
    id: '3',
    name: 'Research Notes',
    description: 'Academic research and documentation',
    color: '#10b981',
    ownerId: '1',
    members: [{ userId: '1', role: 'owner', joinedAt: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false
  }
];

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Project Ideas',
    content: 'List of potential project ideas to explore...',
    type: 'text',
    workspaceId: '1',
    authorId: '1',
    position: { x: 100, y: 100 },
    size: { width: 300, height: 200 },
    color: '#fbbf24',
    tags: ['ideas', 'projects'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false
  },
  {
    id: '2',
    title: 'Meeting Notes',
    content: '# Team Meeting\n\n- Discussed project timeline\n- Assigned tasks\n- Next meeting: Friday',
    type: 'rich',
    workspaceId: '2',
    authorId: '1',
    position: { x: 450, y: 150 },
    size: { width: 350, height: 250 },
    color: '#8b5cf6',
    tags: ['meeting', 'team'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: true
  },
  {
    id: '3',
    title: 'Code Snippet',
    content: 'function fibonacci(n) {\n  if (n <= 1) return n;\n  return fibonacci(n-1) + fibonacci(n-2);\n}',
    type: 'code',
    workspaceId: '1',
    authorId: '1',
    position: { x: 200, y: 350 },
    size: { width: 400, height: 180 },
    color: '#06b6d4',
    tags: ['code', 'javascript'],
    createdAt: new Date(),
    updatedAt: new Date(),
    isPublic: false
  }
];

export const workspaceStore = {
  loadWorkspaces: async () => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    workspaces.set(mockWorkspaces);
  },
  
  loadWorkspaceNotes: async (workspaceId: string) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 300));
    const notes = mockNotes.filter(note => note.workspaceId === workspaceId);
    workspaceNotes.set(notes);
  },
  
  createWorkspace: async (data: Partial<Workspace>) => {
    const newWorkspace: Workspace = {
      id: Date.now().toString(),
      name: data.name || 'New Workspace',
      description: data.description,
      color: data.color || '#ef4444',
      ownerId: '1',
      members: [{ userId: '1', role: 'owner', joinedAt: new Date() }],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: data.isPublic || false
    };
    
    workspaces.update(ws => [...ws, newWorkspace]);
    return newWorkspace;
  },
  
  updateNote: async (noteId: string, updates: Partial<Note>) => {
    workspaceNotes.update(notes => 
      notes.map(note => 
        note.id === noteId 
          ? { ...note, ...updates, updatedAt: new Date() }
          : note
      )
    );
  },
  
  createNote: async (workspaceId: string, data: Partial<Note>) => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: data.title || 'New Note',
      content: data.content || '',
      type: data.type || 'text',
      workspaceId,
      authorId: '1',
      position: data.position || { x: Math.random() * 400, y: Math.random() * 300 },
      size: data.size || { width: 300, height: 200 },
      color: data.color || '#fbbf24',
      tags: data.tags || [],
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: data.isPublic || false
    };
    
    workspaceNotes.update(notes => [...notes, newNote]);
    return newNote;
  }
};