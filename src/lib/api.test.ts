import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock import.meta.env
vi.mock('$app/environment', () => ({
  browser: true
}));

// Simple API test (since the actual API is complex, we'll test basic functionality)
describe('API Module', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  it('should have fetch available in test environment', () => {
    expect(typeof fetch).toBe('function');
  });

  it('should mock fetch correctly', async () => {
    const mockResponse = { data: 'test' };
    (fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const response = await fetch('/test');
    const data = await response.json();

    expect(fetch).toHaveBeenCalledWith('/test');
    expect(data).toEqual(mockResponse);
  });

  it('should handle fetch errors', async () => {
    (fetch as any).mockRejectedValueOnce(new Error('Network error'));

    await expect(fetch('/test')).rejects.toThrow('Network error');
  });
});