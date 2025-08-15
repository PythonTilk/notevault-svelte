import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  performanceMonitor, 
  measureAsync, 
  measureSync, 
  getMemoryUsage 
} from './performance';

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => 1000),
  mark: vi.fn(),
  measure: vi.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

describe('Performance Monitor', () => {
  beforeEach(() => {
    // Mock performance.now to return incrementing values
    let time = 1000;
    mockPerformance.now.mockImplementation(() => {
      time += 100; // Each call adds 100ms
      return time;
    });
    
    // Replace global performance
    Object.defineProperty(global, 'performance', {
      value: mockPerformance,
      writable: true
    });
    
    performanceMonitor.clearMetrics();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('basic measurement', () => {
    it('should start and end measurement correctly', () => {
      performanceMonitor.startMeasure('test-operation');
      const duration = performanceMonitor.endMeasure('test-operation');
      
      expect(duration).toBe(100); // Based on mock implementation
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-start');
      expect(mockPerformance.mark).toHaveBeenCalledWith('test-operation-end');
      expect(mockPerformance.measure).toHaveBeenCalledWith(
        'test-operation', 
        'test-operation-start', 
        'test-operation-end'
      );
    });

    it('should warn when ending measurement without start', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      const duration = performanceMonitor.endMeasure('non-existent');
      
      expect(duration).toBe(0);
      expect(consoleSpy).toHaveBeenCalledWith('No start mark found for "non-existent"');
      
      consoleSpy.mockRestore();
    });

    it('should store metrics after measurement', () => {
      performanceMonitor.startMeasure('test-metric');
      performanceMonitor.endMeasure('test-metric');
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0]).toMatchObject({
        name: 'test-metric',
        duration: 100
      });
      expect(metrics[0].timestamp).toBeGreaterThan(0);
    });
  });

  describe('metrics analysis', () => {
    it('should calculate average time correctly', () => {
      // Add multiple measurements for the same operation
      performanceMonitor.startMeasure('repeated-op');
      performanceMonitor.endMeasure('repeated-op'); // 100ms
      
      performanceMonitor.startMeasure('repeated-op');
      performanceMonitor.endMeasure('repeated-op'); // 100ms
      
      performanceMonitor.startMeasure('repeated-op');
      performanceMonitor.endMeasure('repeated-op'); // 100ms
      
      const average = performanceMonitor.getAverageTime('repeated-op');
      expect(average).toBe(100);
    });

    it('should return 0 for average when no metrics exist', () => {
      const average = performanceMonitor.getAverageTime('non-existent');
      expect(average).toBe(0);
    });

    it('should clear metrics correctly', () => {
      performanceMonitor.startMeasure('test');
      performanceMonitor.endMeasure('test');
      
      expect(performanceMonitor.getMetrics()).toHaveLength(1);
      
      performanceMonitor.clearMetrics();
      expect(performanceMonitor.getMetrics()).toHaveLength(0);
    });
  });

  describe('async measurement', () => {
    it('should measure async operation correctly', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const asyncOperation = async () => {
        await new Promise(resolve => setTimeout(resolve, 50));
        return 'result';
      };
      
      const result = await measureAsync('async-test', asyncOperation);
      
      expect(result).toBe('result');
      expect(consoleSpy).toHaveBeenCalledWith('async-test completed in 100.00ms');
      
      consoleSpy.mockRestore();
    });

    it('should handle async operation errors', async () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const errorOperation = async () => {
        throw new Error('Test error');
      };
      
      await expect(measureAsync('error-test', errorOperation)).rejects.toThrow('Test error');
      
      // Should still end measurement even on error
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('error-test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('sync measurement', () => {
    it('should measure sync operation correctly', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const syncOperation = () => {
        // Simulate some work
        return 'sync result';
      };
      
      const result = measureSync('sync-test', syncOperation);
      
      expect(result).toBe('sync result');
      expect(consoleSpy).toHaveBeenCalledWith('sync-test completed in 100.00ms');
      
      consoleSpy.mockRestore();
    });

    it('should handle sync operation errors', () => {
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      const errorOperation = () => {
        throw new Error('Sync error');
      };
      
      expect(() => measureSync('sync-error-test', errorOperation)).toThrow('Sync error');
      
      // Should still end measurement even on error
      const metrics = performanceMonitor.getMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].name).toBe('sync-error-test');
      
      consoleSpy.mockRestore();
    });
  });

  describe('memory monitoring', () => {
    it('should return memory usage when available', () => {
      const memoryUsage = getMemoryUsage();
      
      expect(memoryUsage).toEqual({
        used: 1000000,
        total: 2000000,
        limit: 4000000
      });
    });

    it('should return null when memory API not available', () => {
      const originalPerformance = global.performance;
      
      // Mock performance without memory property
      Object.defineProperty(global, 'performance', {
        value: { now: mockPerformance.now },
        writable: true
      });
      
      const memoryUsage = getMemoryUsage();
      expect(memoryUsage).toBeNull();
      
      // Restore original performance
      Object.defineProperty(global, 'performance', {
        value: originalPerformance,
        writable: true
      });
    });
  });

  describe('Core Web Vitals', () => {
    it('should handle Core Web Vitals measurement', async () => {
      // Mock PerformanceObserver
      const mockObserver = {
        observe: vi.fn(),
        getEntries: vi.fn(() => [])
      };
      
      Object.defineProperty(global, 'PerformanceObserver', {
        value: vi.fn().mockImplementation((callback) => {
          // Simulate calling the callback with mock data
          setTimeout(() => {
            callback({
              getEntries: () => [{ startTime: 1500 }]
            });
          }, 10);
          return mockObserver;
        }),
        writable: true
      });
      
      const vitals = await performanceMonitor.getCoreWebVitals();
      
      expect(vitals).toBeDefined();
      expect(typeof vitals).toBe('object');
    });

    it('should handle Core Web Vitals when PerformanceObserver not available', async () => {
      // Mock console.warn to suppress expected warning
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Remove PerformanceObserver
      Object.defineProperty(global, 'PerformanceObserver', {
        value: undefined,
        writable: true
      });
      
      const vitals = await performanceMonitor.getCoreWebVitals();
      
      expect(vitals).toEqual({});
      
      consoleSpy.mockRestore();
    });

    it('should handle Core Web Vitals measurement errors', async () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock PerformanceObserver that throws
      Object.defineProperty(global, 'PerformanceObserver', {
        value: vi.fn().mockImplementation(() => {
          throw new Error('Observer error');
        }),
        writable: true
      });
      
      const vitals = await performanceMonitor.getCoreWebVitals();
      
      expect(consoleSpy).toHaveBeenCalledWith('Core Web Vitals measurement failed:', expect.any(Error));
      expect(vitals).toEqual({});
      
      consoleSpy.mockRestore();
    });
  });
});