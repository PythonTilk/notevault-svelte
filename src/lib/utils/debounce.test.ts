import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { debounce, throttle } from './debounce';

describe('Debounce Utility', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('debounce', () => {
    it('should delay function execution', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);
      
      debouncedFn('test');
      expect(mockFn).not.toHaveBeenCalled();
      
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should cancel previous call when called again', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000);
      
      debouncedFn('first');
      vi.advanceTimersByTime(500);
      debouncedFn('second');
      
      vi.advanceTimersByTime(1000);
      
      expect(mockFn).toHaveBeenCalledWith('second');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should execute immediately when immediate flag is true', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000, true);
      
      debouncedFn('immediate');
      expect(mockFn).toHaveBeenCalledWith('immediate');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should not execute again during wait period with immediate flag', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 1000, true);
      
      debouncedFn('first');
      debouncedFn('second');
      
      expect(mockFn).toHaveBeenCalledWith('first');
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      vi.advanceTimersByTime(1000);
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple parameters', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 500);
      
      debouncedFn('param1', 'param2', 123);
      vi.advanceTimersByTime(500);
      
      expect(mockFn).toHaveBeenCalledWith('param1', 'param2', 123);
    });

    it('should preserve function context', () => {
      const obj = {
        value: 'test',
        method: vi.fn()
      };
      
      const boundMethod = obj.method.bind(obj);
      const debouncedMethod = debounce(boundMethod, 500);
      debouncedMethod();
      
      vi.advanceTimersByTime(500);
      expect(obj.method).toHaveBeenCalled();
    });
  });

  describe('throttle', () => {
    it('should execute function immediately on first call', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);
      
      throttledFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should prevent execution during throttle period', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);
      
      throttledFn('first');
      throttledFn('second');
      throttledFn('third');
      
      expect(mockFn).toHaveBeenCalledWith('first');
      expect(mockFn).toHaveBeenCalledTimes(1);
    });

    it('should execute after throttle period expires', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);
      
      throttledFn('first');
      vi.advanceTimersByTime(500);
      throttledFn('second');
      
      vi.advanceTimersByTime(500);
      
      expect(mockFn).toHaveBeenNthCalledWith(1, 'first');
      expect(mockFn).toHaveBeenNthCalledWith(2, 'second');
      expect(mockFn).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid successive calls', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);
      
      // Multiple calls in quick succession
      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');
      throttledFn('call4');
      
      // Only first call should execute immediately
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');
      
      // Advance time to trigger scheduled execution
      vi.advanceTimersByTime(1000);
      
      // Last call should now execute
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('call4');
    });

    it('should preserve latest arguments for delayed execution', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 1000);
      
      throttledFn('first', 1);
      throttledFn('second', 2);
      throttledFn('third', 3);
      
      vi.advanceTimersByTime(1000);
      
      expect(mockFn).toHaveBeenNthCalledWith(1, 'first', 1);
      expect(mockFn).toHaveBeenNthCalledWith(2, 'third', 3);
      expect(mockFn).toHaveBeenCalledTimes(2);
    });
  });

  describe('edge cases', () => {
    it('should handle debounce with zero delay', () => {
      const mockFn = vi.fn();
      const debouncedFn = debounce(mockFn, 0);
      
      debouncedFn('test');
      vi.advanceTimersByTime(0);
      
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle throttle with zero delay', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 0);
      
      throttledFn('test');
      expect(mockFn).toHaveBeenCalledWith('test');
    });

    it('should handle function that throws error', () => {
      const errorFn = vi.fn(() => {
        throw new Error('Test error');
      });
      
      const debouncedFn = debounce(errorFn, 500);
      
      expect(() => {
        debouncedFn();
        vi.advanceTimersByTime(500);
      }).toThrow('Test error');
    });
  });
});