import { describe, it, expect, vi, beforeEach } from 'vitest';
import { api } from './api';

// Mock fetch
global.fetch = vi.fn();

describe('API Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should make GET requests correctly', async () => {
    const mockResponse = { data: 'test' };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await api.get('/test');
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    expect(data).toEqual(mockResponse);
  });

  it('should make POST requests with data', async () => {
    const mockResponse = { success: true };
    const postData = { name: 'test' };

    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await api.post('/test', postData);
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('http://localhost:3001/api/test', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(postData),
    });
    expect(data).toEqual(mockResponse);
  });

  it('should handle errors gracefully', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(api.get('/test')).rejects.toThrow('Network error');
  });
});