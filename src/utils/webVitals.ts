import { onCLS, onFCP, onLCP, onTTFB, onINP, type Metric } from 'web-vitals';

// Types for Web Vitals metrics
export interface WebVitalsMetric {
  name: string;
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  delta: number;
  id: string;
  navigationType: string;
}

// Extended performance metrics
export interface PerformanceMetrics {
  webVitals: Record<string, WebVitalsMetric>;
  memory: {
    usedJSHeapSize: number;
    totalJSHeapSize: number;
    jsHeapSizeLimit: number;
    percentage: number;
  };
  timing: {
    domContentLoaded: number;
    loadComplete: number;
    totalTime: number;
  };
  resources: {
    totalResources: number;
    totalSize: number;
    slowResources: Array<{
      name: string;
      duration: number;
      size: number;
    }>;
  };
  longTasks: Array<{
    duration: number;
    startTime: number;
    name: string;
  }>;
}

// Performance monitoring configuration
export interface PerformanceConfig {
  enableWebVitals: boolean;
  enableMemoryMonitoring: boolean;
  enableResourceMonitoring: boolean;
  enableLongTaskMonitoring: boolean;
  memoryThreshold: number; // MB
  longTaskThreshold: number; // ms
  reportingInterval: number; // ms
}

// Performance thresholds based on Web Vitals recommendations
const THRESHOLDS = {
  CLS: { good: 0.1, poor: 0.25 },
  INP: { good: 200, poor: 500 },
  FCP: { good: 1800, poor: 3000 },
  LCP: { good: 2500, poor: 4000 },
  TTFB: { good: 800, poor: 1800 },
};

// Rate metric based on thresholds
function rateMetric(name: string, value: number): 'good' | 'needs-improvement' | 'poor' {
  const threshold = THRESHOLDS[name as keyof typeof THRESHOLDS];
  if (!threshold) return 'good';
  
  if (value <= threshold.good) return 'good';
  if (value <= threshold.poor) return 'needs-improvement';
  return 'poor';
}

// Send metrics to analytics service and monitoring system
function sendToAnalytics(metric: WebVitalsMetric) {
  // Send to monitoring service
  try {
    const { monitoringService } = require('../services/monitoringService');
    monitoringService.trackPerformanceMetric(
      `web_vital_${metric.name.toLowerCase()}`,
      metric.value,
      metric.name === 'CLS' ? 'count' : 'ms',
      {
        rating: metric.rating,
        delta: metric.delta,
        id: metric.id,
        navigationType: metric.navigationType
      }
    );
  } catch (error) {
    console.warn('Failed to send metric to monitoring service:', error);
  }
  
  // Log for debugging
  console.log('Web Vitals Metric:', metric);
  
  // Store in localStorage for development debugging
  const metrics = JSON.parse(localStorage.getItem('webVitalsMetrics') || '[]');
  metrics.push({
    ...metric,
    timestamp: Date.now(),
    url: window.location.href,
  });
  
  // Keep only last 50 metrics
  if (metrics.length > 50) {
    metrics.splice(0, metrics.length - 50);
  }
  
  localStorage.setItem('webVitalsMetrics', JSON.stringify(metrics));
}

// Convert web-vitals Metric to our WebVitalsMetric format
function convertMetric(metric: Metric, name: string): WebVitalsMetric {
  return {
    name,
    value: metric.value,
    rating: rateMetric(name, metric.value),
    delta: metric.delta,
    id: metric.id,
    navigationType: metric.navigationType || 'unknown',
  };
}

// Initialize Web Vitals monitoring
export function initWebVitals() {
  // Monitor Cumulative Layout Shift
  onCLS((metric) => {
    sendToAnalytics(convertMetric(metric, 'CLS'));
  });

  // Monitor Interaction to Next Paint (replaces FID)
  onINP((metric) => {
    sendToAnalytics(convertMetric(metric, 'INP'));
  });

  // Monitor First Contentful Paint
  onFCP((metric) => {
    sendToAnalytics(convertMetric(metric, 'FCP'));
  });

  // Monitor Largest Contentful Paint
  onLCP((metric) => {
    sendToAnalytics(convertMetric(metric, 'LCP'));
  });

  // Monitor Time to First Byte
  onTTFB((metric) => {
    sendToAnalytics(convertMetric(metric, 'TTFB'));
  });
}

// Get current Web Vitals metrics (for debugging)
export async function getCurrentMetrics(): Promise<Record<string, WebVitalsMetric>> {
  return new Promise((resolve) => {
    const metrics: Record<string, WebVitalsMetric> = {};
    let collected = 0;
    const totalMetrics = 5;

    const checkComplete = () => {
      collected++;
      if (collected >= totalMetrics) {
        resolve(metrics);
      }
    };

    // Get current metrics
    onCLS((metric) => {
      metrics.CLS = convertMetric(metric, 'CLS');
      checkComplete();
    }, { reportAllChanges: true });

    onINP((metric) => {
      metrics.INP = convertMetric(metric, 'INP');
      checkComplete();
    }, { reportAllChanges: true });

    onFCP((metric) => {
      metrics.FCP = convertMetric(metric, 'FCP');
      checkComplete();
    }, { reportAllChanges: true });

    onLCP((metric) => {
      metrics.LCP = convertMetric(metric, 'LCP');
      checkComplete();
    }, { reportAllChanges: true });

    onTTFB((metric) => {
      metrics.TTFB = convertMetric(metric, 'TTFB');
      checkComplete();
    }, { reportAllChanges: true });

    // Timeout after 2 seconds
    setTimeout(() => resolve(metrics), 2000);
  });
}

// Performance monitoring class
class PerformanceMonitor {
  private config: PerformanceConfig;
  private observers: PerformanceObserver[] = [];
  private longTasks: Array<{ duration: number; startTime: number; name: string }> = [];
  private memoryWarnings: number = 0;
  private reportingInterval?: number;
  private cleanupCallbacks: Array<() => void> = [];

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableWebVitals: true,
      enableMemoryMonitoring: true,
      enableResourceMonitoring: true,
      enableLongTaskMonitoring: true,
      memoryThreshold: 50, // 50MB
      longTaskThreshold: 50, // 50ms
      reportingInterval: 30000, // 30 seconds
      ...config,
    };
  }

  // Initialize all performance monitoring
  init(): void {
    if (this.config.enableWebVitals) {
      this.initWebVitals();
    }

    if (this.config.enableLongTaskMonitoring) {
      this.initLongTaskMonitoring();
    }

    if (this.config.enableResourceMonitoring) {
      this.initResourceMonitoring();
    }

    if (this.config.enableMemoryMonitoring) {
      this.initMemoryMonitoring();
    }

    // Start periodic reporting
    this.startPeriodicReporting();

    // Setup cleanup on page unload
    this.setupCleanup();
  }

  // Initialize Web Vitals monitoring
  private initWebVitals(): void {
    onCLS((metric) => {
      this.reportMetric(convertMetric(metric, 'CLS'));
    });

    onINP((metric) => {
      this.reportMetric(convertMetric(metric, 'INP'));
    });

    onFCP((metric) => {
      this.reportMetric(convertMetric(metric, 'FCP'));
    });

    onLCP((metric) => {
      this.reportMetric(convertMetric(metric, 'LCP'));
    });

    onTTFB((metric) => {
      this.reportMetric(convertMetric(metric, 'TTFB'));
    });
  }

  // Initialize long task monitoring
  private initLongTaskMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const longTaskObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.duration > this.config.longTaskThreshold) {
            const longTask = {
              duration: entry.duration,
              startTime: entry.startTime,
              name: entry.name || 'unknown',
            };

            this.longTasks.push(longTask);
            
            // Keep only last 50 long tasks
            if (this.longTasks.length > 50) {
              this.longTasks.shift();
            }

            // Report critical long tasks immediately
            if (entry.duration > 100) {
              console.warn('Critical long task detected:', longTask);
              this.reportLongTask(longTask);
            }
          }
        }
      });

      longTaskObserver.observe({ entryTypes: ['longtask'] });
      this.observers.push(longTaskObserver);
    } catch (e) {
      console.warn('Long task monitoring not supported:', e);
    }
  }

  // Initialize resource monitoring
  private initResourceMonitoring(): void {
    if (!('PerformanceObserver' in window)) return;

    try {
      const resourceObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const resourceEntry = entry as PerformanceResourceTiming;
          
          // Monitor slow resources (> 1 second)
          if (resourceEntry.duration > 1000) {
            console.warn('Slow resource detected:', {
              name: resourceEntry.name,
              duration: resourceEntry.duration,
              size: resourceEntry.transferSize || 0,
              type: resourceEntry.initiatorType,
            });
          }
        }
      });

      resourceObserver.observe({ entryTypes: ['resource'] });
      this.observers.push(resourceObserver);
    } catch (e) {
      console.warn('Resource monitoring not supported:', e);
    }
  }

  // Initialize memory monitoring
  private initMemoryMonitoring(): void {
    if (!('memory' in performance)) return;

    const checkMemory = () => {
      const memory = (performance as any).memory;
      const usedMB = memory.usedJSHeapSize / 1024 / 1024;
      const limitMB = memory.jsHeapSizeLimit / 1024 / 1024;
      const percentage = (usedMB / limitMB) * 100;

      if (usedMB > this.config.memoryThreshold) {
        this.memoryWarnings++;
        console.warn('High memory usage detected:', {
          usedMB: usedMB.toFixed(2),
          limitMB: limitMB.toFixed(2),
          percentage: percentage.toFixed(1) + '%',
          warnings: this.memoryWarnings,
        });

        // Suggest garbage collection if available
        if ('gc' in window && typeof (window as any).gc === 'function') {
          console.log('Triggering garbage collection...');
          (window as any).gc();
        }
      }
    };

    // Check memory every 10 seconds
    const memoryInterval = setInterval(checkMemory, 10000);
    this.cleanupCallbacks.push(() => clearInterval(memoryInterval));
  }

  // Start periodic reporting
  private startPeriodicReporting(): void {
    this.reportingInterval = window.setInterval(() => {
      this.generatePerformanceReport();
    }, this.config.reportingInterval);

    this.cleanupCallbacks.push(() => {
      if (this.reportingInterval) {
        clearInterval(this.reportingInterval);
      }
    });
  }

  // Setup cleanup on page unload
  private setupCleanup(): void {
    const cleanup = () => {
      this.cleanup();
    };

    window.addEventListener('beforeunload', cleanup);
    window.addEventListener('pagehide', cleanup);
    
    this.cleanupCallbacks.push(() => {
      window.removeEventListener('beforeunload', cleanup);
      window.removeEventListener('pagehide', cleanup);
    });
  }

  // Report individual metric
  private reportMetric(metric: WebVitalsMetric): void {
    sendToAnalytics(metric);
  }

  // Report long task
  private reportLongTask(task: { duration: number; startTime: number; name: string }): void {
    // Send to analytics service
    console.log('Long task reported:', task);
  }

  // Generate comprehensive performance report
  async generatePerformanceReport(): Promise<PerformanceMetrics> {
    const webVitals = await getCurrentMetrics();
    
    const report: PerformanceMetrics = {
      webVitals,
      memory: this.getMemoryInfo(),
      timing: this.getTimingInfo(),
      resources: this.getResourceInfo(),
      longTasks: [...this.longTasks],
    };

    // Store report for debugging
    localStorage.setItem('performanceReport', JSON.stringify({
      ...report,
      timestamp: Date.now(),
      url: window.location.href,
    }));

    return report;
  }

  // Get memory information
  private getMemoryInfo(): PerformanceMetrics['memory'] {
    if (!('memory' in performance)) {
      return {
        usedJSHeapSize: 0,
        totalJSHeapSize: 0,
        jsHeapSizeLimit: 0,
        percentage: 0,
      };
    }

    const memory = (performance as any).memory;
    return {
      usedJSHeapSize: memory.usedJSHeapSize,
      totalJSHeapSize: memory.totalJSHeapSize,
      jsHeapSizeLimit: memory.jsHeapSizeLimit,
      percentage: (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100,
    };
  }

  // Get timing information
  private getTimingInfo(): PerformanceMetrics['timing'] {
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    
    if (!navigation) {
      return {
        domContentLoaded: 0,
        loadComplete: 0,
        totalTime: 0,
      };
    }

    return {
      domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
      loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
      totalTime: navigation.loadEventEnd - navigation.fetchStart,
    };
  }

  // Get resource information
  private getResourceInfo(): PerformanceMetrics['resources'] {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
    
    const slowResources = resources
      .filter(resource => resource.duration > 1000)
      .map(resource => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || 0,
      }))
      .sort((a, b) => b.duration - a.duration)
      .slice(0, 10); // Top 10 slowest resources

    const totalSize = resources.reduce((sum, resource) => sum + (resource.transferSize || 0), 0);

    return {
      totalResources: resources.length,
      totalSize,
      slowResources,
    };
  }

  // Cleanup all observers and intervals
  cleanup(): void {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];

    // Run all cleanup callbacks
    this.cleanupCallbacks.forEach(callback => callback());
    this.cleanupCallbacks = [];

    // Clear data
    this.longTasks = [];
    this.memoryWarnings = 0;

    console.log('Performance monitoring cleaned up');
  }

  // Get current performance status
  getStatus(): {
    isMonitoring: boolean;
    observersCount: number;
    longTasksCount: number;
    memoryWarnings: number;
  } {
    return {
      isMonitoring: this.observers.length > 0,
      observersCount: this.observers.length,
      longTasksCount: this.longTasks.length,
      memoryWarnings: this.memoryWarnings,
    };
  }
}

// Global performance monitor instance
let performanceMonitor: PerformanceMonitor | null = null;

// Initialize performance monitoring
export function initPerformanceMonitoring(config?: Partial<PerformanceConfig>): PerformanceMonitor {
  if (performanceMonitor) {
    performanceMonitor.cleanup();
  }

  performanceMonitor = new PerformanceMonitor(config);
  performanceMonitor.init();
  
  return performanceMonitor;
}

// Get current performance monitor instance
export function getPerformanceMonitor(): PerformanceMonitor | null {
  return performanceMonitor;
}

// Cleanup performance monitoring
export function cleanupPerformanceMonitoring(): void {
  if (performanceMonitor) {
    performanceMonitor.cleanup();
    performanceMonitor = null;
  }
}

// Performance observer for custom metrics (legacy function for backward compatibility)
export function observePerformance() {
  console.warn('observePerformance is deprecated. Use initPerformanceMonitoring instead.');
  initPerformanceMonitoring();
}