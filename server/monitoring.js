// Simple monitoring system for the Newsletter Grading System
// This provides basic metrics collection and health monitoring

class MetricsCollector {
  constructor() {
    this.metrics = {
      requests: 0,
      errors: 0,
      aiRequests: 0,
      aiErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTime: [],
      startTime: Date.now(),
    };
  }

  recordRequest() {
    this.metrics.requests++;
  }

  recordError() {
    this.metrics.errors++;
  }

  recordAIRequest(success, duration) {
    this.metrics.aiRequests++;
    if (!success) {
      this.metrics.aiErrors++;
    }
    this.metrics.responseTime.push(duration);
    
    // Keep only last 100 response times
    if (this.metrics.responseTime.length > 100) {
      this.metrics.responseTime.shift();
    }
  }

  recordCacheHit() {
    this.metrics.cacheHits++;
  }

  recordCacheMiss() {
    this.metrics.cacheMisses++;
  }

  getStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgResponseTime = this.metrics.responseTime.length > 0 
      ? this.metrics.responseTime.reduce((a, b) => a + b, 0) / this.metrics.responseTime.length 
      : 0;

    return {
      uptime,
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests) * 100 : 0,
      aiRequests: this.metrics.aiRequests,
      aiErrors: this.metrics.aiErrors,
      aiErrorRate: this.metrics.aiRequests > 0 ? (this.metrics.aiErrors / this.metrics.aiRequests) * 100 : 0,
      cacheHits: this.metrics.cacheHits,
      cacheMisses: this.metrics.cacheMisses,
      cacheHitRate: (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 
        ? (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 
        : 0,
      avgResponseTime,
    };
  }

  reset() {
    this.metrics = {
      requests: 0,
      errors: 0,
      aiRequests: 0,
      aiErrors: 0,
      cacheHits: 0,
      cacheMisses: 0,
      responseTime: [],
      startTime: Date.now(),
    };
  }
}

// Create singleton instance
const metricsCollector = new MetricsCollector();

// Middleware for request tracking
const metricsMiddleware = (req, res, next) => {
  const startTime = Date.now();
  
  metricsCollector.recordRequest();
  
  // Track response time
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    if (req.path.includes('/api/')) {
      metricsCollector.recordAIRequest(res.statusCode < 400, duration);
    }
  });
  
  next();
};

// Health check handler
const healthCheckHandler = (req, res) => {
  const stats = metricsCollector.getStats();
  const isHealthy = stats.errorRate < 50; // Consider healthy if error rate < 50%
  
  res.status(isHealthy ? 200 : 503).json({
    status: isHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: stats.uptime,
    metrics: stats,
  });
};

// Metrics handler
const metricsHandler = (req, res) => {
  const stats = metricsCollector.getStats();
  
  res.json({
    timestamp: new Date().toISOString(),
    metrics: stats,
  });
};

// Performance logging utility
const logPerformance = (operation, duration, success, metadata = {}) => {
  const status = success ? '✅' : '❌';
  console.log(`${status} ${operation}: ${duration.toFixed(2)}ms`, metadata);
};

export {
  metricsCollector,
  metricsMiddleware,
  healthCheckHandler,
  metricsHandler,
  logPerformance,
};