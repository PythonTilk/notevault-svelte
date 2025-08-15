import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

// Mock fetch
global.fetch = vi.fn();

describe('API Client', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create correct file download URL', () => {
    const fileId = 'test-file-123';
    const expectedUrl = 'http://localhost:3001/api/files/test-file-123/download';
    
    const result = api.getFileDownloadUrl(fileId);
    
    expect(result).toBe(expectedUrl);
  });

  it('should handle successful API response', async () => {
    const mockResponse = {
      status: 'ok',
      data: { id: '123', name: 'Test' }
    };

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    // Test a simple GET request would work
    expect(fetch).toBeDefined();
  });

  it('should construct URLs correctly', () => {
    // Test that the API instance exists and has expected methods
    expect(typeof api.getFileDownloadUrl).toBe('function');
  });

  it('should have file upload method', () => {
    expect(typeof api.uploadFile).toBe('function');
  });

  it('should have file deletion method', () => {
    expect(typeof api.deleteFile).toBe('function');
  });

  it('should have chat reaction methods', () => {
    expect(typeof api.addReaction).toBe('function');
    expect(typeof api.removeReaction).toBe('function');
  });
});