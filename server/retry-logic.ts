// Retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: any) => boolean;
  onRetry?: (error: any, attempt: number) => void;
  timeout?: number; // Optional timeout for each attempt
  retryableStatusCodes?: number[]; // HTTP status codes that should trigger retry
}

// Default retry configuration
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  backoffFactor: 2,
  jitter: true,
  timeout: 10000, // 10 seconds default timeout
  retryableStatusCodes: [408, 429, 500, 502, 503, 504], // Common retryable HTTP status codes
  retryCondition: (error: any) => {
    // Retry on network errors, timeouts, and 5xx server errors
    return (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ENOTFOUND' ||
      error.code === 'ETIMEDOUT' ||
      error.code === 'TIMEOUT' ||
      (error.response && DEFAULT_RETRY_CONFIG.retryableStatusCodes?.includes(error.response.status)) ||
      error.type === 'NETWORK' ||
      error.type === 'AI_MODEL' ||
      error.type === 'TIMEOUT' ||
      error.type === 'STORAGE' ||
      error.type === 'RATE_LIMIT'
    );
  }
};

// Retry statistics interface
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  lastRetryTime: Date | null;
}

// Enhanced retry statistics interface
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageRetryDelay: number;
  lastRetryTime: Date | null;
  retryDistribution: Record<number, number>; // Count of retries by attempt number
  errorTypeDistribution: Record<string, number>; // Count of retries by error type
  successRateByErrorType: Record<string, { attempts: number; successes: number }>;
}

// Retry manager class
export class RetryManager {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageRetryDelay: 0,
    lastRetryTime: null,
    retryDistribution: {},
    errorTypeDistribution: {},
    successRateByErrorType: {}
  };

  // Calculate delay with exponential backoff and optional jitter
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd
    if (config.jitter) {
      const jitterAmount = delay * 0.1; // 10% jitter
      delay += (Math.random() - 0.5) * 2 * jitterAmount;
    }

    return Math.max(delay, 0);
  }

  // Sleep utility
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Get error type for statistics
  private getErrorType(error: any): string {
    if (error.type) return error.type;
    if (error.code) return error.code;
    if (error.response?.status) return `HTTP_${error.response.status}`;
    return error.name || 'UNKNOWN';
  }

  // Execute function with retry logic
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG
  ): Promise<T> {
    let lastError: any;
    const startTime = Date.now();
    let errorType: string | null = null;

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        this.stats.totalAttempts++;

        // Apply timeout if configured
        const timeoutPromise = config.timeout
          ? new Promise<never>((_, reject) => {
            setTimeout(() => reject(new Error(`Operation timed out after ${config.timeout}ms`)), config.timeout);
          })
          : null;

        // Execute function with optional timeout
        const result = timeoutPromise
          ? await Promise.race([fn(), timeoutPromise]) as T
          : await fn();

        // Success - update stats if this was a retry
        if (attempt > 1) {
          this.stats.successfulRetries++;
          this.stats.lastRetryTime = new Date();

          // Update success rate by error type if we have an error type
          if (errorType) {
            if (!this.stats.successRateByErrorType[errorType]) {
              this.stats.successRateByErrorType[errorType] = { attempts: 0, successes: 0 };
            }
            const stats = this.stats.successRateByErrorType[errorType];
            if (stats) stats.successes++;
          }

          console.log(`✅ Retry successful on attempt ${attempt}`);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        errorType = this.getErrorType(error);

        // Update error type distribution
        this.stats.errorTypeDistribution[errorType] =
          (this.stats.errorTypeDistribution[errorType] || 0) + 1;

        // Update success rate tracking
        if (!this.stats.successRateByErrorType[errorType]) {
          this.stats.successRateByErrorType[errorType] = { attempts: 0, successes: 0 };
        }
        const stats = this.stats.successRateByErrorType[errorType];
        if (stats) stats.attempts++;

        // Check if we should retry
        const shouldRetry = attempt <= config.maxRetries &&
          config.retryCondition ?
          config.retryCondition(error) :
          DEFAULT_RETRY_CONFIG.retryCondition!(error);

        if (!shouldRetry) {
          console.log(`❌ Not retrying error: ${error.message}`);
          break;
        }

        // Update retry distribution
        this.stats.retryDistribution[attempt] =
          (this.stats.retryDistribution[attempt] || 0) + 1;

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);

        // Call retry callback if provided
        if (config.onRetry) {
          config.onRetry(error, attempt);
        }

        console.log(`🔄 Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay. Error: ${error.message}`);

        // Wait before retrying
        await this.sleep(delay);

        // Update average delay
        const totalDelay = Date.now() - startTime;
        this.stats.averageRetryDelay = totalDelay / attempt;
      }
    }

    // All retries failed
    this.stats.failedRetries++;
    console.error(`❌ All retry attempts failed. Final error: ${lastError.message}`);
    throw lastError;
  }

  // Get retry statistics
  getStats(): RetryStats {
    return { ...this.stats };
  }

  // Get detailed statistics
  getDetailedStats(): {
    stats: RetryStats;
    successRate: number;
    averageAttemptsPerSuccess: number;
    mostCommonErrorTypes: Array<{ type: string; count: number }>;
    mostRetriedOperations: Array<{ attempt: number; count: number }>;
  } {
    const successRate = this.stats.totalAttempts > 0
      ? (this.stats.totalAttempts - this.stats.failedRetries) / this.stats.totalAttempts
      : 0;

    const averageAttemptsPerSuccess = this.stats.successfulRetries > 0
      ? this.stats.totalAttempts / this.stats.successfulRetries
      : 0;

    // Get most common error types
    const errorTypes = Object.entries(this.stats.errorTypeDistribution)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Get most retried operations
    const retriedOperations = Object.entries(this.stats.retryDistribution)
      .map(([attempt, count]) => ({ attempt: parseInt(attempt), count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      stats: this.stats,
      successRate,
      averageAttemptsPerSuccess,
      mostCommonErrorTypes: errorTypes,
      mostRetriedOperations: retriedOperations
    };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageRetryDelay: 0,
      lastRetryTime: null,
      retryDistribution: {},
      errorTypeDistribution: {},
      successRateByErrorType: {}
    };
  }
}

// Global retry manager instance
export const retryManager = new RetryManager();

// Convenience function for simple retry operations
export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  return retryManager.executeWithRetry(fn, fullConfig);
}

// Specialized retry configurations for different operations
export const RETRY_CONFIGS = {
  AI_MODEL: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 3,
    baseDelay: 2000, // 2 seconds
    maxDelay: 15000, // 15 seconds
    retryCondition: (error: any) => {
      return error.type === 'AI_MODEL' ||
        error.type === 'NETWORK' ||
        error.type === 'TIMEOUT' ||
        (error.response && error.response.status >= 500);
    },
    onRetry: (error: any, attempt: number) => {
      console.log(`🤖 AI Model retry ${attempt}: ${error.message}`);
    }
  },

  NETWORK: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 5,
    baseDelay: 1000, // 1 second
    maxDelay: 10000, // 10 seconds
    retryCondition: (error: any) => {
      return error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.type === 'NETWORK';
    },
    onRetry: (error: any, attempt: number) => {
      console.log(`🌐 Network retry ${attempt}: ${error.message}`);
    }
  },

  STORAGE: {
    ...DEFAULT_RETRY_CONFIG,
    maxRetries: 2,
    baseDelay: 500, // 0.5 seconds
    maxDelay: 2000, // 2 seconds
    retryCondition: (error: any) => {
      return error.type === 'STORAGE' ||
        error.message?.includes('storage') ||
        error.message?.includes('cache');
    },
    onRetry: (error: any, attempt: number) => {
      console.log(`💾 Storage retry ${attempt}: ${error.message}`);
    }
  }
};

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 2
  ) { }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        console.log('🔄 Circuit breaker: Attempting reset (HALF_OPEN)');
      } else {
        throw new Error('Circuit breaker is OPEN - service unavailable');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private shouldAttemptReset(): boolean {
    return this.lastFailureTime !== null &&
      Date.now() - this.lastFailureTime.getTime() > this.recoveryTimeout;
  }

  private onSuccess(): void {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log('✅ Circuit breaker: Reset to CLOSED state');
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🚨 Circuit breaker: OPEN due to ${this.failures} failures`);
    }
  }

  getState(): { state: string; failures: number; lastFailureTime: Date | null } {
    return {
      state: this.state,
      failures: this.failures,
      lastFailureTime: this.lastFailureTime
    };
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  aiModel: new CircuitBreaker(3, 30000, 1), // 3 failures, 30s timeout
  network: new CircuitBreaker(5, 60000, 2), // 5 failures, 1min timeout
  storage: new CircuitBreaker(10, 10000, 1) // 10 failures, 10s timeout
};