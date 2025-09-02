// Production configuration and scaling strategies
export interface ProductionConfig {
  // Rate limiting
  rateLimiting: {
    enabled: boolean;
    strategy: 'memory' | 'redis' | 'database';
    redisUrl?: string;
  };
  
  // AI service configuration
  aiServices: {
    // Primary AI provider
    primary: {
      provider: 'groq' | 'openai' | 'anthropic';
      apiKey: string;
      model: string;
      maxRequestsPerMinute: number;
      maxRequestsPerDay: number;
    };
    
    // Fallback AI providers for redundancy
    fallbacks: Array<{
      provider: string;
      apiKey: string;
      model: string;
      priority: number; // Lower number = higher priority
    }>;
    
    // Circuit breaker configuration
    circuitBreaker: {
      failureThreshold: number; // Number of failures before opening circuit
      resetTimeout: number; // Time to wait before trying again (ms)
      monitoringWindow: number; // Time window for failure counting (ms)
    };
  };
  
  // Caching strategy
  caching: {
    enabled: boolean;
    strategy: 'memory' | 'redis' | 'cdn';
    ttl: number; // Time to live in seconds
    maxSize: number; // Max cache size
    
    // Content-based caching
    contentHashing: boolean;
    compressionEnabled: boolean;
  };
  
  // Queue system for handling high load
  queueing: {
    enabled: boolean;
    provider: 'redis' | 'aws-sqs' | 'rabbitmq';
    maxQueueSize: number;
    processingTimeout: number;
    retryAttempts: number;
  };
  
  // Monitoring and alerting
  monitoring: {
    enabled: boolean;
    metricsProvider: 'prometheus' | 'datadog' | 'newrelic';
    alerting: {
      errorRateThreshold: number; // Percentage
      responseTimeThreshold: number; // Milliseconds
      queueSizeThreshold: number;
    };
  };
}

// Production environment configurations
export const PRODUCTION_CONFIGS: Record<string, ProductionConfig> = {
  // Small production deployment (< 1000 users)
  small: {
    rateLimiting: {
      enabled: true,
      strategy: 'redis',
      redisUrl: process.env.REDIS_URL
    },
    aiServices: {
      primary: {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY!,
        model: 'gemma-2-9b-it',
        maxRequestsPerMinute: 100,
        maxRequestsPerDay: 10000
      },
      fallbacks: [
        {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY!,
          model: 'gpt-3.5-turbo',
          priority: 1
        }
      ],
      circuitBreaker: {
        failureThreshold: 5,
        resetTimeout: 60000, // 1 minute
        monitoringWindow: 300000 // 5 minutes
      }
    },
    caching: {
      enabled: true,
      strategy: 'redis',
      ttl: 1800, // 30 minutes
      maxSize: 1000,
      contentHashing: true,
      compressionEnabled: true
    },
    queueing: {
      enabled: true,
      provider: 'redis',
      maxQueueSize: 1000,
      processingTimeout: 30000,
      retryAttempts: 3
    },
    monitoring: {
      enabled: true,
      metricsProvider: 'prometheus',
      alerting: {
        errorRateThreshold: 5, // 5%
        responseTimeThreshold: 5000, // 5 seconds
        queueSizeThreshold: 500
      }
    }
  },
  
  // Large production deployment (> 10000 users)
  large: {
    rateLimiting: {
      enabled: true,
      strategy: 'redis',
      redisUrl: process.env.REDIS_CLUSTER_URL
    },
    aiServices: {
      primary: {
        provider: 'groq',
        apiKey: process.env.GROQ_API_KEY!,
        model: 'gemma-2-9b-it',
        maxRequestsPerMinute: 1000,
        maxRequestsPerDay: 100000
      },
      fallbacks: [
        {
          provider: 'openai',
          apiKey: process.env.OPENAI_API_KEY!,
          model: 'gpt-3.5-turbo',
          priority: 1
        },
        {
          provider: 'anthropic',
          apiKey: process.env.ANTHROPIC_API_KEY!,
          model: 'claude-3-haiku',
          priority: 2
        }
      ],
      circuitBreaker: {
        failureThreshold: 10,
        resetTimeout: 30000, // 30 seconds
        monitoringWindow: 180000 // 3 minutes
      }
    },
    caching: {
      enabled: true,
      strategy: 'cdn', // Use CDN for better global performance
      ttl: 3600, // 1 hour
      maxSize: 10000,
      contentHashing: true,
      compressionEnabled: true
    },
    queueing: {
      enabled: true,
      provider: 'aws-sqs',
      maxQueueSize: 10000,
      processingTimeout: 60000,
      retryAttempts: 5
    },
    monitoring: {
      enabled: true,
      metricsProvider: 'datadog',
      alerting: {
        errorRateThreshold: 2, // 2%
        responseTimeThreshold: 3000, // 3 seconds
        queueSizeThreshold: 2000
      }
    }
  }
};

// Auto-scaling recommendations
export const SCALING_STRATEGIES = {
  // Horizontal scaling (multiple server instances)
  horizontal: {
    minInstances: 2,
    maxInstances: 10,
    scaleUpThreshold: {
      cpuPercent: 70,
      memoryPercent: 80,
      queueSize: 100,
      responseTime: 2000
    },
    scaleDownThreshold: {
      cpuPercent: 30,
      memoryPercent: 40,
      queueSize: 10,
      responseTime: 500
    }
  },
  
  // Database scaling
  database: {
    readReplicas: 2,
    connectionPoolSize: 20,
    queryTimeout: 5000,
    indexOptimization: true
  },
  
  // CDN and caching
  cdn: {
    enabled: true,
    regions: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
    cacheHeaders: {
      'Cache-Control': 'public, max-age=3600',
      'Vary': 'Accept-Encoding'
    }
  }
};

// Cost optimization strategies
export const COST_OPTIMIZATION = {
  // AI request optimization
  aiOptimization: {
    // Batch similar requests
    batchProcessing: true,
    batchSize: 10,
    batchTimeout: 2000,
    
    // Use cheaper models for simple tasks
    modelSelection: {
      simple: 'gemma-2-2b-it', // Cheaper, faster
      complex: 'gemma-2-9b-it', // More expensive, better quality
      threshold: 1000 // Character count threshold
    },
    
    // Aggressive caching for repeated content
    aggressiveCaching: {
      enabled: true,
      similarityThreshold: 0.95, // Cache if 95% similar
      ttl: 7200 // 2 hours
    }
  },
  
  // Infrastructure optimization
  infrastructure: {
    // Use spot instances for non-critical workloads
    spotInstances: true,
    
    // Auto-shutdown during low usage
    autoShutdown: {
      enabled: true,
      lowUsageThreshold: 5, // Requests per minute
      shutdownDelay: 300000 // 5 minutes
    },
    
    // Resource right-sizing
    resourceOptimization: {
      cpuOptimized: false, // Use memory-optimized instances
      memoryOptimized: true,
      storageOptimized: false
    }
  }
};