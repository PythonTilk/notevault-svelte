// Performance monitoring utilities

export interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private marks: Map<string, number> = new Map();

  startMeasure(name: string): void {
    const timestamp = performance.now();
    this.marks.set(name, timestamp);
    
    if ('performance' in window && 'mark' in performance) {
      performance.mark(`${name}-start`);
    }
  }

  endMeasure(name: string): number {
    const endTime = performance.now();
    const startTime = this.marks.get(name);
    
    if (!startTime) {
      console.warn(`No start mark found for "${name}"`);
      return 0;
    }
    
    const duration = endTime - startTime;
    
    // Record the metric
    this.metrics.push({
      name,
      duration,
      timestamp: endTime
    });
    
    // Use Performance API if available
    if ('performance' in window && 'mark' in performance && 'measure' in performance) {
      performance.mark(`${name}-end`);
      performance.measure(name, `${name}-start`, `${name}-end`);
    }
    
    this.marks.delete(name);
    return duration;
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getAverageTime(name: string): number {
    const filtered = this.metrics.filter(m => m.name === name);
    if (filtered.length === 0) return 0;
    
    const total = filtered.reduce((sum, metric) => sum + metric.duration, 0);
    return total / filtered.length;
  }

  clearMetrics(): void {
    this.metrics = [];
    this.marks.clear();
  }

  // Get Core Web Vitals if available
  getCoreWebVitals(): Promise<any> {
    return new Promise((resolve) => {
      const vitals: any = {};
      
      // Largest Contentful Paint
      if ('PerformanceObserver' in window) {
        try {
          const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            const lastEntry = entries[entries.length - 1];
            vitals.lcp = lastEntry.startTime;
          });
          lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
          
          // First Input Delay
          const fidObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              vitals.fid = entry.processingStart - entry.startTime;
            });
          });
          fidObserver.observe({ entryTypes: ['first-input'] });
          
          // Cumulative Layout Shift
          const clsObserver = new PerformanceObserver((list) => {
            let clsValue = 0;
            const entries = list.getEntries();
            entries.forEach((entry: any) => {
              if (!entry.hadRecentInput) {
                clsValue += entry.value;
              }
            });
            vitals.cls = clsValue;
          });
          clsObserver.observe({ entryTypes: ['layout-shift'] });
          
          setTimeout(() => resolve(vitals), 1000);
        } catch (error) {
          console.warn('Core Web Vitals measurement failed:', error);
          resolve(vitals);
        }
      } else {
        resolve(vitals);
      }
    });
  }
}

// Export a singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Utility function to measure async operations
export async function measureAsync<T>(
  name: string,
  operation: () => Promise<T>
): Promise<T> {
  performanceMonitor.startMeasure(name);
  try {
    const result = await operation();
    const duration = performanceMonitor.endMeasure(name);
    console.log(`${name} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    performanceMonitor.endMeasure(name);
    throw error;
  }
}

// Utility function to measure sync operations
export function measureSync<T>(
  name: string,
  operation: () => T
): T {
  performanceMonitor.startMeasure(name);
  try {
    const result = operation();
    const duration = performanceMonitor.endMeasure(name);
    console.log(`${name} completed in ${duration.toFixed(2)}ms`);
    return result;
  } catch (error) {
    performanceMonitor.endMeasure(name);
    throw error;
  }
}

// Memory usage monitoring
export function getMemoryUsage(): any {
  if ('memory' in performance) {
    return {
      used: (performance as any).memory.usedJSHeapSize,
      total: (performance as any).memory.totalJSHeapSize,
      limit: (performance as any).memory.jsHeapSizeLimit
    };
  }
  return null;
}