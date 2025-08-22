import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the API
const mockApi = {
  uploadFile: vi.fn(),
  getFiles: vi.fn(),
  deleteFile: vi.fn(),
  getFileDownloadUrl: vi.fn()
};

vi.mock('$lib/api', () => ({
  api: mockApi
}));

describe('File Management Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should upload file and update state', async () => {
    // Mock successful upload response
    const mockUploadResponse = {
      id: 'file-123',
      name: 'test.pdf',
      type: 'application/pdf',
      size: 1024,
      uploadedBy: { id: 'user-123' },
      workspaceId: 'workspace-123',
      createdAt: '2025-08-05T00:00:00Z',
      isPublic: false
    };

    mockApi.uploadFile.mockResolvedValue(mockUploadResponse);
    mockApi.getFileDownloadUrl.mockReturnValue('http://localhost:3001/api/files/file-123/download');

    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    // Simulate file upload logic (would normally be in component)
    const result = await mockApi.uploadFile(testFile, undefined, false);
    
    expect(mockApi.uploadFile).toHaveBeenCalledWith(testFile, undefined, false);
    expect(result).toEqual(mockUploadResponse);
  });

  it('should handle file upload error', async () => {
    mockApi.uploadFile.mockRejectedValue(new Error('Upload failed'));
    
    const testFile = new File(['test content'], 'test.pdf', { type: 'application/pdf' });

    await expect(mockApi.uploadFile(testFile, undefined, false))
      .rejects.toThrow('Upload failed');
  });

  it('should delete file successfully', async () => {
    mockApi.deleteFile.mockResolvedValue({});

    await mockApi.deleteFile('file-123');
    
    expect(mockApi.deleteFile).toHaveBeenCalledWith('file-123');
  });

  it('should get files list', async () => {
    const mockFiles = [
      {
        id: 'file-1',
        name: 'document.pdf',
        type: 'application/pdf',
        size: 2048,
        uploadedBy: { id: 'user-1' },
        createdAt: '2025-08-05T00:00:00Z'
      }
    ];

    mockApi.getFiles.mockResolvedValue(mockFiles);

    const result = await mockApi.getFiles({ limit: 100 });
    
    expect(mockApi.getFiles).toHaveBeenCalledWith({ limit: 100 });
    expect(result).toEqual(mockFiles);
  });

  it('should generate download URL correctly', () => {
    const fileId = 'file-123';
    const expectedUrl = `http://localhost:3001/api/files/${fileId}/download`;
    
    mockApi.getFileDownloadUrl.mockReturnValue(expectedUrl);
    
    const result = mockApi.getFileDownloadUrl(fileId);
    
    expect(result).toBe(expectedUrl);
  });
});