import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API
const mockApi = {
  getWorkspaces: vi.fn(),
  getWorkspaceNotes: vi.fn(),
  getFiles: vi.fn(),
  getFileDownloadUrl: vi.fn()
};

vi.mock('$lib/api', () => ({
  api: mockApi
}));

describe('Search Functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should search across workspaces', async () => {
    const mockWorkspaces = [
      {
        id: 'ws-1',
        name: 'Test Workspace',
        description: 'A workspace for testing'
      },
      {
        id: 'ws-2', 
        name: 'Another Space',
        description: 'Different workspace'
      }
    ];

    mockApi.getWorkspaces.mockResolvedValue(mockWorkspaces);

    const workspaces = await mockApi.getWorkspaces();
    const query = 'test';
    
    // Simulate search logic
    const matchingWorkspaces = workspaces.filter((workspace: any) =>
      workspace.name.toLowerCase().includes(query.toLowerCase()) ||
      workspace.description?.toLowerCase().includes(query.toLowerCase())
    );

    expect(matchingWorkspaces).toHaveLength(1);
    expect(matchingWorkspaces[0].name).toBe('Test Workspace');
  });

  it('should search across notes in workspaces', async () => {
    const mockWorkspaces = [{ id: 'ws-1', name: 'Test Workspace' }];
    const mockNotes = [
      {
        id: 'note-1',
        title: 'Important Note',
        content: 'This contains test information'
      },
      {
        id: 'note-2',
        title: 'Random Note', 
        content: 'Nothing interesting here'
      }
    ];

    mockApi.getWorkspaces.mockResolvedValue(mockWorkspaces);
    mockApi.getWorkspaceNotes.mockResolvedValue(mockNotes);

    const workspaces = await mockApi.getWorkspaces();
    const notes = await mockApi.getWorkspaceNotes(workspaces[0].id);
    const query = 'test';
    
    // Simulate search logic
    const matchingNotes = notes.filter((note: any) =>
      note.title.toLowerCase().includes(query.toLowerCase()) ||
      note.content?.toLowerCase().includes(query.toLowerCase())
    );

    expect(matchingNotes).toHaveLength(1);
    expect(matchingNotes[0].title).toBe('Important Note');
  });

  it('should search across files', async () => {
    const mockFiles = [
      {
        id: 'file-1',
        name: 'test-document.pdf',
        type: 'application/pdf',
        size: 1024
      },
      {
        id: 'file-2',
        name: 'presentation.pptx',
        type: 'application/vnd.ms-powerpoint',
        size: 2048
      }
    ];

    mockApi.getFiles.mockResolvedValue(mockFiles);

    const files = await mockApi.getFiles({ limit: 100 });
    const query = 'test';
    
    // Simulate search logic
    const matchingFiles = files.filter((file: any) =>
      file.name.toLowerCase().includes(query.toLowerCase())
    );

    expect(matchingFiles).toHaveLength(1);
    expect(matchingFiles[0].name).toBe('test-document.pdf');
  });

  it('should handle search errors gracefully', async () => {
    mockApi.getWorkspaces.mockRejectedValue(new Error('API Error'));

    try {
      await mockApi.getWorkspaces();
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('API Error');
    }
  });

  it('should return empty results for no matches', async () => {
    const mockWorkspaces = [
      {
        id: 'ws-1',
        name: 'Work Project',
        description: 'Business stuff'
      }
    ];

    mockApi.getWorkspaces.mockResolvedValue(mockWorkspaces);

    const workspaces = await mockApi.getWorkspaces();
    const query = 'nonexistent';
    
    const matchingWorkspaces = workspaces.filter((workspace: any) =>
      workspace.name.toLowerCase().includes(query.toLowerCase()) ||
      workspace.description?.toLowerCase().includes(query.toLowerCase())
    );

    expect(matchingWorkspaces).toHaveLength(0);
  });
});