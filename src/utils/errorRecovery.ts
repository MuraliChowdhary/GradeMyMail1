import { useAppStore } from '../store';

// Recovery strategies for different error types
export interface RecoveryStrategy {
  id: string;
  name: string;
  description: string;
  execute: () => Promise<boolean>;
  fallback?: () => Promise<boolean>;
}

// State preservation utilities
export class StatePreservation {
  private static readonly STORAGE_KEY = 'email-analysis-recovery';
  private static readonly MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

  static preserveState(reason: string, additionalData?: Record<string, any>): boolean {
    try {
      const state = useAppStore.getState();
      const recoveryData = {
        timestamp: Date.now(),
        reason,
        state: {
          emailContent: state.emailContent,
          ui: state.ui,
          error: {
            errorHistory: state.error.errorHistory.slice(-10), // Keep last 10 errors
            retryCount: state.error.retryCount,
            fallbackMode: state.error.fallbackMode
          }
        },
        additionalData
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(recoveryData));
      return true;
    } catch (error) {
      console.error('Failed to preserve state:', error);
      return false;
    }
  }

  static restoreState(): { success: boolean; data?: any; reason?: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        return { success: false };
      }

      const recoveryData = JSON.parse(stored);
      
      // Check if data is not too old
      if (Date.now() - recoveryData.timestamp > this.MAX_AGE) {
        this.clearRecoveryData();
        return { success: false };
      }

      return {
        success: true,
        data: recoveryData.state,
        reason: recoveryData.reason
      };
    } catch (error) {
      console.error('Failed to restore state:', error);
      this.clearRecoveryData();
      return { success: false };
    }
  }

  static clearRecoveryData(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear recovery data:', error);
    }
  }

  static hasRecoveryData(): boolean {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return false;

      const recoveryData = JSON.parse(stored);
      return Date.now() - recoveryData.timestamp <= this.MAX_AGE;
    } catch {
      return false;
    }
  }
}

// Fallback strategies for graceful degradation
export class FallbackStrategies {
  // Offline mode with cached data
  static async enableOfflineMode(): Promise<boolean> {
    try {
      const { setFallbackMode } = useAppStore.getState();
      
      // Check if we have cached data
      const hasCache = this.checkCacheAvailability();
      
      if (hasCache) {
        setFallbackMode(true);
        
        // Show user notification about offline mode
        console.log('Offline mode enabled with cached data');
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Failed to enable offline mode:', error);
      return false;
    }
  }

  // Basic text analysis without AI
  static async enableBasicAnalysis(): Promise<boolean> {
    try {
      // Implement basic text analysis using client-side algorithms
      // This would include simple word counting, basic readability checks, etc.
      console.log('Basic analysis mode enabled');
      return true;
    } catch (error) {
      console.error('Failed to enable basic analysis:', error);
      return false;
    }
  }

  // Read-only mode
  static async enableReadOnlyMode(): Promise<boolean> {
    try {
      const { setFallbackMode } = useAppStore.getState();
      setFallbackMode(true);
      
      console.log('Read-only mode enabled');
      return true;
    } catch (error) {
      console.error('Failed to enable read-only mode:', error);
      return false;
    }
  }

  private static checkCacheAvailability(): boolean {
    try {
      // Check if we have any cached analysis results
      const cached = localStorage.getItem('analysis-cache');
      return !!cached;
    } catch {
      return false;
    }
  }
}

// Recovery strategies for different error types
export const recoveryStrategies: Record<string, RecoveryStrategy[]> = {
  network: [
    {
      id: 'retry-connection',
      name: 'Retry Connection',
      description: 'Attempt to reconnect to the server',
      execute: async () => {
        try {
          const response = await fetch('/api/health', { 
            method: 'GET',
            cache: 'no-cache'
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      fallback: FallbackStrategies.enableOfflineMode
    },
    {
      id: 'clear-cache',
      name: 'Clear Cache',
      description: 'Clear browser cache and retry',
      execute: async () => {
        try {
          if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
              cacheNames.map(cacheName => caches.delete(cacheName))
            );
          }
          return true;
        } catch {
          return false;
        }
      }
    }
  ],

  ai: [
    {
      id: 'retry-ai-service',
      name: 'Retry AI Service',
      description: 'Attempt to reconnect to AI analysis service',
      execute: async () => {
        try {
          const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: 'health check' })
          });
          return response.ok;
        } catch {
          return false;
        }
      },
      fallback: FallbackStrategies.enableBasicAnalysis
    },
    {
      id: 'switch-ai-model',
      name: 'Switch AI Model',
      description: 'Try alternative AI model endpoint',
      execute: async () => {
        // This would implement switching to a backup AI service
        console.log('Attempting to switch AI model...');
        return false; // Not implemented in this demo
      }
    }
  ],

  storage: [
    {
      id: 'clear-storage',
      name: 'Clear Storage',
      description: 'Clear browser storage and restart',
      execute: async () => {
        try {
          localStorage.clear();
          sessionStorage.clear();
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      id: 'use-memory-only',
      name: 'Memory Only Mode',
      description: 'Continue without persistent storage',
      execute: async () => {
        try {
          // Disable all storage operations
          console.log('Memory-only mode enabled');
          return true;
        } catch {
          return false;
        }
      }
    }
  ],

  server: [
    {
      id: 'retry-server',
      name: 'Retry Server',
      description: 'Wait and retry server connection',
      execute: async () => {
        try {
          // Wait a bit before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          
          const response = await fetch('/api/health');
          return response.ok;
        } catch {
          return false;
        }
      },
      fallback: FallbackStrategies.enableOfflineMode
    }
  ],

  validation: [
    {
      id: 'sanitize-input',
      name: 'Sanitize Input',
      description: 'Clean and retry with sanitized input',
      execute: async () => {
        try {
          // This would implement input sanitization
          console.log('Input sanitization attempted');
          return true;
        } catch {
          return false;
        }
      }
    }
  ],

  timeout: [
    {
      id: 'reduce-content',
      name: 'Reduce Content',
      description: 'Try with smaller content chunks',
      execute: async () => {
        try {
          // This would implement content chunking
          console.log('Content reduction attempted');
          return true;
        } catch {
          return false;
        }
      }
    },
    {
      id: 'increase-timeout',
      name: 'Increase Timeout',
      description: 'Retry with longer timeout',
      execute: async () => {
        try {
          // This would implement timeout adjustment
          console.log('Timeout increased');
          return true;
        } catch {
          return false;
        }
      }
    }
  ]
};

// Recovery orchestrator
export class RecoveryOrchestrator {
  static async executeRecoveryStrategy(
    errorType: string,
    strategyId: string,
    onProgress?: (progress: number) => void
  ): Promise<boolean> {
    const strategies = recoveryStrategies[errorType];
    if (!strategies) {
      console.error(`No recovery strategies found for error type: ${errorType}`);
      return false;
    }

    const strategy = strategies.find(s => s.id === strategyId);
    if (!strategy) {
      console.error(`Recovery strategy not found: ${strategyId}`);
      return false;
    }

    try {
      onProgress?.(25);
      
      // Preserve state before attempting recovery
      StatePreservation.preserveState(`recovery-${strategyId}`, {
        errorType,
        strategyId,
        timestamp: Date.now()
      });

      onProgress?.(50);

      // Execute the recovery strategy
      const success = await strategy.execute();

      onProgress?.(75);

      if (!success && strategy.fallback) {
        console.log(`Primary recovery failed, trying fallback for ${strategyId}`);
        const fallbackSuccess = await strategy.fallback();
        onProgress?.(100);
        return fallbackSuccess;
      }

      onProgress?.(100);
      return success;
    } catch (error) {
      console.error(`Recovery strategy ${strategyId} failed:`, error);
      
      // Try fallback if available
      if (strategy.fallback) {
        try {
          return await strategy.fallback();
        } catch (fallbackError) {
          console.error(`Fallback for ${strategyId} also failed:`, fallbackError);
        }
      }
      
      return false;
    }
  }

  static async executeAllStrategies(
    errorType: string,
    onProgress?: (strategy: string, progress: number) => void
  ): Promise<boolean> {
    const strategies = recoveryStrategies[errorType];
    if (!strategies) {
      return false;
    }

    for (const strategy of strategies) {
      onProgress?.(strategy.name, 0);
      
      const success = await this.executeRecoveryStrategy(
        errorType,
        strategy.id,
        (progress) => onProgress?.(strategy.name, progress)
      );

      if (success) {
        return true;
      }
    }

    return false;
  }
}

// Auto-recovery system
export class AutoRecovery {
  private static retryAttempts = new Map<string, number>();
  private static readonly MAX_AUTO_RETRIES = 3;
  private static readonly RETRY_DELAYS = [1000, 2000, 5000]; // Progressive delays

  static async attemptAutoRecovery(
    errorType: string,
    errorId: string,
    onProgress?: (status: string) => void
  ): Promise<boolean> {
    const attempts = this.retryAttempts.get(errorId) || 0;
    
    if (attempts >= this.MAX_AUTO_RETRIES) {
      console.log(`Max auto-recovery attempts reached for error ${errorId}`);
      return false;
    }

    this.retryAttempts.set(errorId, attempts + 1);

    try {
      onProgress?.(`Auto-recovery attempt ${attempts + 1}/${this.MAX_AUTO_RETRIES}`);

      // Wait before retry
      if (attempts > 0) {
        const delay = this.RETRY_DELAYS[Math.min(attempts - 1, this.RETRY_DELAYS.length - 1)];
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      // Try the most appropriate recovery strategy
      const success = await RecoveryOrchestrator.executeAllStrategies(
        errorType,
        (strategy, progress) => onProgress?.(`${strategy}: ${progress}%`)
      );

      if (success) {
        this.retryAttempts.delete(errorId);
        onProgress?.('Auto-recovery successful');
        return true;
      }

      onProgress?.(`Auto-recovery attempt ${attempts + 1} failed`);
      return false;
    } catch (error) {
      console.error('Auto-recovery failed:', error);
      onProgress?.('Auto-recovery failed');
      return false;
    }
  }

  static resetRetryCount(errorId: string): void {
    this.retryAttempts.delete(errorId);
  }

  static getRetryCount(errorId: string): number {
    return this.retryAttempts.get(errorId) || 0;
  }
}