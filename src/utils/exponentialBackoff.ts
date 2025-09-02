import { type ErrorType } from '../store';
// Removed errorMonitoring import - not available

// Retry configuration interface
export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  jitter: boolean;
  retryCondition?: (error: any, attempt: number) => boolean;
  onRetry?: (error: any, attempt: number, delay: number) => void;
  onSuccess?: (attempt: number) => void;
  onFailure?: (error: any, totalAttempts: number) => void;
  timeout?: number;
  abortSignal?: AbortSignal;
}

// Default retry configurations for different error types
export const DEFAULT_RETRY_CONFIGS: Record<ErrorType, RetryConfig> = {
  network: {
    maxRetries: 5,
    baseDelay: 1000,
    maxDelay: 30000,
    backoffFactor: 2,
    jitter: true,
    timeout: 10000,
    retryCondition: (error: any, attempt: number) => {
      // More aggressive retries for network errors
      return attempt <= 5 && (
        error.code === 'ECONNREFUSED' ||
        error.code === 'ENOTFOUND' ||
        error.code === 'ETIMEDOUT' ||
        error.type === 'network' ||
        !error.response
      );
    }
  },
  
  ai: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 15000,
    backoffFactor: 2,
    jitter: true,
    timeout: 30000,
    retryCondition: (error: any, attempt: number) => {
      // Retry AI errors but be more conservative
      return attempt <= 3 && (
        error.type === 'ai' ||
        error.message?.includes('AI') ||
        error.message?.includes('model') ||
        (error.response?.status >= 500 && error.response?.status < 600)
      );
    }
  },
  
  server: {
    maxRetries: 4,
    baseDelay: 1500,
    maxDelay: 20000,
    backoffFactor: 2,
    jitter: true,
    timeout: 15000,
    retryCondition: (error: any, attempt: number) => {
      // Retry server errors
      return attempt <= 4 && (
        error.type === 'server' ||
        (error.response?.status >= 500 && error.response?.status < 600)
      );
    }
  },
  
  timeout: {
    maxRetries: 3,
    baseDelay: 2000,
    maxDelay: 10000,
    backoffFactor: 1.5,
    jitter: true,
    timeout: 45000, // Longer timeout for retry attempts
    retryCondition: (error: any, attempt: number) => {
      return attempt <= 3 && (
        error.type === 'timeout' ||
        error.code === 'ECONNABORTED' ||
        error.message?.includes('timeout')
      );
    }
  },
  
  rate_limit: {
    maxRetries: 3,
    baseDelay: 5000, // Longer initial delay for rate limits
    maxDelay: 60000, // Up to 1 minute
    backoffFactor: 3, // More aggressive backoff
    jitter: false, // No jitter for rate limits
    timeout: 10000,
    retryCondition: (error: any, attempt: number) => {
      return attempt <= 3 && (
        error.type === 'rate_limit' ||
        error.response?.status === 429 ||
        error.message?.includes('rate limit')
      );
    }
  },
  
  storage: {
    maxRetries: 2,
    baseDelay: 500,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
    timeout: 5000,
    retryCondition: (error: any, attempt: number) => {
      return attempt <= 2 && (
        error.type === 'storage' ||
        error.message?.includes('storage') ||
        error.message?.includes('localStorage') ||
        error.message?.includes('sessionStorage')
      );
    }
  },
  
  validation: {
    maxRetries: 0, // Don't retry validation errors
    baseDelay: 0,
    maxDelay: 0,
    backoffFactor: 1,
    jitter: false,
    retryCondition: () => false
  },
  
  client: {
    maxRetries: 1,
    baseDelay: 1000,
    maxDelay: 2000,
    backoffFactor: 2,
    jitter: true,
    timeout: 10000,
    retryCondition: (error: any, attempt: number) => {
      // Only retry certain client errors
      return attempt <= 1 && (
        error.response?.status === 408 || // Request timeout
        error.response?.status === 409 || // Conflict (might resolve)
        error.response?.status === 423    // Locked (might unlock)
      );
    }
  }
};

// Retry statistics interface
export interface RetryStats {
  totalAttempts: number;
  successfulRetries: number;
  failedRetries: number;
  averageDelay: number;
  maxDelay: number;
  totalDelay: number;
  errorTypes: Record<string, number>;
  successRateByErrorType: Record<string, { attempts: number; successes: number }>;
}

// Enhanced exponential backoff class
export class ExponentialBackoff {
  private stats: RetryStats = {
    totalAttempts: 0,
    successfulRetries: 0,
    failedRetries: 0,
    averageDelay: 0,
    maxDelay: 0,
    totalDelay: 0,
    errorTypes: {},
    successRateByErrorType: {}
  };

  // Calculate delay with exponential backoff and jitter
  private calculateDelay(attempt: number, config: RetryConfig): number {
    const exponentialDelay = config.baseDelay * Math.pow(config.backoffFactor, attempt - 1);
    let delay = Math.min(exponentialDelay, config.maxDelay);

    // Add jitter to prevent thundering herd problem
    if (config.jitter) {
      const jitterRange = delay * 0.1; // 10% jitter
      const jitter = (Math.random() - 0.5) * 2 * jitterRange;
      delay = Math.max(0, delay + jitter);
    }

    return Math.round(delay);
  }

  // Sleep utility with abort signal support
  private sleep(ms: number, abortSignal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      if (abortSignal?.aborted) {
        reject(new Error('Operation aborted'));
        return;
      }

      const timeout = setTimeout(resolve, ms);
      
      const abortHandler = () => {
        clearTimeout(timeout);
        reject(new Error('Operation aborted'));
      };

      abortSignal?.addEventListener('abort', abortHandler, { once: true });
    });
  }

  // Get error type for classification
  private getErrorType(error: any): string {
    if (error.type) return error.type;
    if (error.response?.status) return `HTTP_${error.response.status}`;
    if (error.code) return error.code;
    return error.name || 'UNKNOWN';
  }

  // Update statistics
  private updateStats(errorType: string, attempt: number, delay: number, success: boolean): void {
    this.stats.totalAttempts++;
    this.stats.totalDelay += delay;
    this.stats.maxDelay = Math.max(this.stats.maxDelay, delay);
    this.stats.averageDelay = this.stats.totalDelay / this.stats.totalAttempts;

    // Track error types
    this.stats.errorTypes[errorType] = (this.stats.errorTypes[errorType] || 0) + 1;

    // Track success rate by error type
    if (!this.stats.successRateByErrorType[errorType]) {
      this.stats.successRateByErrorType[errorType] = { attempts: 0, successes: 0 };
    }
    this.stats.successRateByErrorType[errorType].attempts++;

    if (success) {
      this.stats.successfulRetries++;
      this.stats.successRateByErrorType[errorType].successes++;
    } else if (attempt === 1) { // Only count as failed retry on final attempt
      this.stats.failedRetries++;
    }
  }

  // Execute function with exponential backoff retry
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    errorType: ErrorType,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = {
      ...DEFAULT_RETRY_CONFIGS[errorType],
      ...customConfig
    };

    let lastError: any;
    let errorId: string | undefined;
    const startTime = Date.now();

    for (let attempt = 1; attempt <= config.maxRetries + 1; attempt++) {
      try {
        // Create timeout promise if configured
        const timeoutPromise = config.timeout
          ? new Promise<never>((_, reject) => {
              setTimeout(() => reject(new Error(`Operation timed out after ${config.timeout}ms`)), config.timeout);
            })
          : null;

        // Execute function with optional timeout and abort signal
        const promises: Promise<T>[] = [fn()];
        if (timeoutPromise) promises.push(timeoutPromise);
        if (config.abortSignal) {
          promises.push(new Promise<never>((_, reject) => {
            config.abortSignal!.addEventListener('abort', () => reject(new Error('Operation aborted')), { once: true });
          }));
        }

        const result = await Promise.race(promises);

        // Success - update stats and call success callback
        if (attempt > 1) {
          const errorTypeStr = this.getErrorType(lastError);
          this.updateStats(errorTypeStr, attempt, 0, true);
          
          if (errorId) {
            console.log('Retry successful:', errorId, attempt);
          }
          
          config.onSuccess?.(attempt);
          console.log(`✅ Retry successful on attempt ${attempt}/${config.maxRetries + 1}`);
        }

        return result;
      } catch (error: any) {
        lastError = error;
        const errorTypeStr = this.getErrorType(error);
        
        // Store error ID for tracking
        if (!errorId && error.id) {
          errorId = error.id;
        }

        // Check if we should retry
        const shouldRetry = attempt <= config.maxRetries && 
                           (config.retryCondition ? config.retryCondition(error, attempt) : true);

        if (!shouldRetry) {
          // Final failure - update stats and call failure callback
          this.updateStats(errorTypeStr, attempt, 0, false);
          
          if (errorId) {
            console.log('Retry attempt failed:', errorId, attempt);
          }
          
          config.onFailure?.(error, attempt);
          console.error(`❌ All retry attempts failed after ${attempt} attempts`);
          break;
        }

        // Calculate delay for next attempt
        const delay = this.calculateDelay(attempt, config);
        this.updateStats(errorTypeStr, attempt, delay, false);
        
        if (errorId) {
          console.log('All retries failed:', errorId, attempt);
        }

        // Call retry callback
        config.onRetry?.(error, attempt, delay);
        
        console.warn(`🔄 Retry attempt ${attempt}/${config.maxRetries} after ${delay}ms delay. Error: ${error.message}`);

        // Wait before retrying
        try {
          await this.sleep(delay, config.abortSignal);
        } catch (sleepError) {
          // Sleep was aborted
          throw sleepError;
        }
      }
    }

    // All retries exhausted
    const totalTime = Date.now() - startTime;
    console.error(`❌ Operation failed after ${config.maxRetries + 1} attempts in ${totalTime}ms`);
    throw lastError;
  }

  // Get retry statistics
  getStats(): RetryStats {
    return { ...this.stats };
  }

  // Get detailed statistics with success rates
  getDetailedStats(): {
    stats: RetryStats;
    overallSuccessRate: number;
    averageAttemptsPerSuccess: number;
    errorTypeBreakdown: Array<{
      type: string;
      count: number;
      successRate: number;
    }>;
  } {
    const overallSuccessRate = this.stats.totalAttempts > 0
      ? this.stats.successfulRetries / this.stats.totalAttempts
      : 0;

    const averageAttemptsPerSuccess = this.stats.successfulRetries > 0
      ? this.stats.totalAttempts / this.stats.successfulRetries
      : 0;

    const errorTypeBreakdown = Object.entries(this.stats.errorTypes).map(([type, count]) => {
      const successData = this.stats.successRateByErrorType[type];
      const successRate = successData ? successData.successes / successData.attempts : 0;
      
      return {
        type,
        count,
        successRate
      };
    }).sort((a, b) => b.count - a.count);

    return {
      stats: this.stats,
      overallSuccessRate,
      averageAttemptsPerSuccess,
      errorTypeBreakdown
    };
  }

  // Reset statistics
  resetStats(): void {
    this.stats = {
      totalAttempts: 0,
      successfulRetries: 0,
      failedRetries: 0,
      averageDelay: 0,
      maxDelay: 0,
      totalDelay: 0,
      errorTypes: {},
      successRateByErrorType: {}
    };
  }
}

// Global exponential backoff instance
export const exponentialBackoff = new ExponentialBackoff();

// Convenience function for simple retry operations
export async function withExponentialBackoff<T>(
  fn: () => Promise<T>,
  errorType: ErrorType,
  customConfig?: Partial<RetryConfig>
): Promise<T> {
  return exponentialBackoff.executeWithRetry(fn, errorType, customConfig);
}

// Specialized retry functions for common operations
export const retryStrategies = {
  // Network operations with aggressive retry
  network: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'network', customConfig),

  // AI operations with moderate retry
  ai: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'ai', customConfig),

  // Server operations with standard retry
  server: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'server', customConfig),

  // Storage operations with quick retry
  storage: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'storage', customConfig),

  // Rate limit operations with patient retry
  rateLimit: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'rate_limit', customConfig),

  // Timeout operations with extended retry
  timeout: <T>(fn: () => Promise<T>, customConfig?: Partial<RetryConfig>) =>
    withExponentialBackoff(fn, 'timeout', customConfig)
};

// Circuit breaker pattern for preventing cascading failures
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime: Date | null = null;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private successCount = 0;

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeout: number = 60000, // 1 minute
    private successThreshold: number = 3
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (this.shouldAttemptReset()) {
        this.state = 'HALF_OPEN';
        this.successCount = 0;
        console.log('🔄 Circuit breaker: Attempting reset (HALF_OPEN)');
      } else {
        throw new Error(`Circuit breaker is OPEN - service unavailable. Try again in ${this.getTimeUntilReset()}ms`);
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

  private getTimeUntilReset(): number {
    if (!this.lastFailureTime) return 0;
    return Math.max(0, this.recoveryTimeout - (Date.now() - this.lastFailureTime.getTime()));
  }

  private onSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.reset();
      }
    } else {
      this.reset();
    }
  }

  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === 'HALF_OPEN' || this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`🚨 Circuit breaker: OPEN due to ${this.failures} failures`);
    }
  }

  private reset(): void {
    this.failures = 0;
    this.successCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    console.log('✅ Circuit breaker: Reset to CLOSED state');
  }

  getState(): {
    state: string;
    failures: number;
    successCount: number;
    lastFailureTime: Date | null;
    timeUntilReset: number;
  } {
    return {
      state: this.state,
      failures: this.failures,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      timeUntilReset: this.getTimeUntilReset()
    };
  }
}

// Global circuit breakers for different services
export const circuitBreakers = {
  ai: new CircuitBreaker(3, 30000, 2),      // 3 failures, 30s timeout, 2 successes to reset
  network: new CircuitBreaker(5, 60000, 3), // 5 failures, 1min timeout, 3 successes to reset
  server: new CircuitBreaker(4, 45000, 2),  // 4 failures, 45s timeout, 2 successes to reset
  storage: new CircuitBreaker(10, 10000, 1) // 10 failures, 10s timeout, 1 success to reset
};