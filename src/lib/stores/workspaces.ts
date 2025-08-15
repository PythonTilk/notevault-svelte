import { writable } from 'svelte/store';
import type { Workspace, Note } from '$lib/types';
import { api } from '$lib/api';

export const workspaces = writable<Workspace[]>([]);
export const currentWorkspace = writable<Workspace | null>(null);
export const workspaceNotes = writable<Note[]>([]);

export const workspaceStore = {
  loadWorkspaces: async () => {
    try {
      const workspacesData = await api.getWorkspaces();
      const formattedWorkspaces: Workspace[] = workspacesData.map((ws: any) => ({
        id: ws.id,
        name: ws.name,
        description: ws.description,
        color: ws.color,
        ownerId: ws.ownerId,
        members: ws.members || [],
        createdAt: new Date(ws.createdAt),
        updatedAt: new Date(ws.updatedAt),
        isPublic: ws.isPublic
      }));
      workspaces.set(formattedWorkspaces);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
      workspaces.set([]);
    }
  },

  loadWorkspace: async (workspaceId: string) => {
    try {
      const workspaceData = await api.getWorkspace(workspaceId);
      const workspace: Workspace = {
        id: workspaceData.id,
        name: workspaceData.name,
        description: workspaceData.description,
        color: workspaceData.color,
        ownerId: workspaceData.ownerId,
        members: workspaceData.members || [],
        createdAt: new Date(workspaceData.createdAt),
        updatedAt: new Date(workspaceData.updatedAt),
        isPublic: workspaceData.isPublic
      };
      currentWorkspace.set(workspace);
      return workspace;
    } catch (error) {
      console.error('Failed to load workspace:', error);
      currentWorkspace.set(null);
      throw error;
    }
  },
  
  loadWorkspaceNotes: async (workspaceId: string) => {
    try {
      const notesData = await api.getWorkspaceNotes(workspaceId);
      const formattedNotes: Note[] = notesData.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        type: note.type,
        workspaceId: note.workspaceId,
        authorId: note.authorId,
        position: note.position || { x: 0, y: 0 },
        size: note.size || { width: 300, height: 200 },
        color: note.color,
        tags: note.tags || [],
        createdAt: new Date(note.createdAt),
        updatedAt: new Date(note.updatedAt),
        isPublic: note.isPublic
      }));
      workspaceNotes.set(formattedNotes);
    } catch (error) {
      console.error('Failed to load workspace notes:', error);
      workspaceNotes.set([]);
    }
  },
  
  createWorkspace: async (data: {
    name: string;
    description?: string;
    color: string;
    isPublic?: boolean;
  }) => {
    try {
      const newWorkspaceData = await api.createWorkspace(data);
      const newWorkspace: Workspace = {
        id: newWorkspaceData.id,
        name: newWorkspaceData.name,
        description: newWorkspaceData.description,
        color: newWorkspaceData.color,
        ownerId: newWorkspaceData.ownerId,
        members: newWorkspaceData.members || [],
        createdAt: new Date(newWorkspaceData.createdAt),
        updatedAt: new Date(newWorkspaceData.updatedAt),
        isPublic: newWorkspaceData.isPublic
      };
      
      workspaces.update(ws => [...ws, newWorkspace]);
      return newWorkspace;
    } catch (error) {
      console.error('Failed to create workspace:', error);
      throw error;
    }
  },

  updateWorkspace: async (workspaceId: string, updates: {
    name?: string;
    description?: string;
    color?: string;
    isPublic?: boolean;
  }) => {
    try {
      const updatedWorkspaceData = await api.updateWorkspace(workspaceId, updates);
      const updatedWorkspace: Workspace = {
        id: updatedWorkspaceData.id,
        name: updatedWorkspaceData.name,
        description: updatedWorkspaceData.description,
        color: updatedWorkspaceData.color,
        ownerId: updatedWorkspaceData.ownerId,
        members: [], // Will be loaded separately if needed
        createdAt: new Date(updatedWorkspaceData.createdAt),
        updatedAt: new Date(updatedWorkspaceData.updatedAt),
        isPublic: updatedWorkspaceData.isPublic
      };

      workspaces.update(ws => 
        ws.map(w => w.id === workspaceId ? updatedWorkspace : w)
      );

      currentWorkspace.update(current => 
        current?.id === workspaceId ? updatedWorkspace : current
      );

      return updatedWorkspace;
    } catch (error) {
      console.error('Failed to update workspace:', error);
      throw error;
    }
  },

  deleteWorkspace: async (workspaceId: string) => {
    try {
      await api.deleteWorkspace(workspaceId);
      workspaces.update(ws => ws.filter(w => w.id !== workspaceId));
      currentWorkspace.update(current => 
        current?.id === workspaceId ? null : current
      );
    } catch (error) {
      console.error('Failed to delete workspace:', error);
      throw error;
    }
  },
  
  updateNote: async (noteId: string, updates: Partial<Note>) => {
    try {
      const updatedNoteData = await api.updateNote(noteId, updates);
      const updatedNote: Note = {
        id: updatedNoteData.id,
        title: updatedNoteData.title,
        content: updatedNoteData.content,
        type: updatedNoteData.type,
        workspaceId: updatedNoteData.workspaceId,
        authorId: updatedNoteData.authorId,
        position: updatedNoteData.position || { x: 0, y: 0 },
        size: updatedNoteData.size || { width: 300, height: 200 },
        color: updatedNoteData.color,
        tags: updatedNoteData.tags || [],
        createdAt: new Date(updatedNoteData.createdAt),
        updatedAt: new Date(updatedNoteData.updatedAt),
        isPublic: updatedNoteData.isPublic
      };

      workspaceNotes.update(notes => 
        notes.map(note => 
          note.id === noteId ? updatedNote : note
        )
      );

      return updatedNote;
    } catch (error) {
      console.error('Failed to update note:', error);
      throw error;
    }
  },
  
  createNote: async (workspaceId: string, data: {
    title: string;
    content?: string;
    type?: string;
    position?: { x: number; y: number };
    size?: { width: number; height: number };
    color: string;
    tags?: string[];
    isPublic?: boolean;
  }) => {
    try {
      const newNoteData = await api.createNote({
        ...data,
        workspaceId
      });

      const newNote: Note = {
        id: newNoteData.id,
        title: newNoteData.title,
        content: newNoteData.content,
        type: newNoteData.type,
        workspaceId: newNoteData.workspaceId,
        authorId: newNoteData.authorId,
        position: newNoteData.position || { x: 0, y: 0 },
        size: newNoteData.size || { width: 300, height: 200 },
        color: newNoteData.color,
        tags: newNoteData.tags || [],
        createdAt: new Date(newNoteData.createdAt),
        updatedAt: new Date(newNoteData.updatedAt),
        isPublic: newNoteData.isPublic
      };
      
      workspaceNotes.update(notes => [...notes, newNote]);
      return newNote;
    } catch (error) {
      console.error('Failed to create note:', error);
      throw error;
    }
  },

  deleteNote: async (noteId: string) => {
    try {
      await api.deleteNote(noteId);
      workspaceNotes.update(notes => notes.filter(note => note.id !== noteId));
    } catch (error) {
      console.error('Failed to delete note:', error);
      throw error;
    }
  }
};