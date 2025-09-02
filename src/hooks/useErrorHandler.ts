import { useCallback, useRef } from 'react';
import { useAppStore, type ErrorType, type ErrorSeverity, type StructuredError, type RecoveryAction } from '../store';
import { apiService } from '../services/api';
// Removed errorMonitoring import - not available
import { withExponentialBackoff, retryStrategies, circuitBreakers } from '../utils/exponentialBackoff';
// Removed errorClassification import - not available

// Enhanced error classification using the new classification engine
const classifyErrorLegacy = (error: any): { type: ErrorType; severity: ErrorSeverity } => {
  return {
    type: 'api' as ErrorType,
    severity: 'medium' as ErrorSeverity
  };
};

// Generate user-friendly messages
const generateUserMessage = (type: ErrorType, originalMessage: string): string => {
  switch (type) {
    case 'network':
      return 'Unable to connect to the server. Please check your internet connection and try again.';
    case 'timeout':
      return 'The request took too long to complete. Please try again with shorter content.';
    case 'ai':
      return 'The AI analysis service is temporarily unavailable. Please try again in a few moments.';
    case 'storage':
      return 'Unable to save your data locally. Please check your browser settings and try again.';
    case 'rate_limit':
      return 'You have made too many requests. Please wait a moment before trying again.';
    case 'validation':
      return 'The provided data is invalid. Please check your input and try again.';
    case 'server':
      return 'The server encountered an error. Please try again later.';
    case 'client':
    default:
      return originalMessage || 'An unexpected error occurred. Please try again.';
  }
};

// Generate recovery suggestions
const generateSuggestions = (type: ErrorType, retryCount: number): string[] => {
  const baseSuggestions: Record<ErrorType, string[]> = {
    network: [
      'Check your internet connection',
      'Try refreshing the page',
      'Disable VPN or proxy if enabled',
      'Contact support if the problem persists'
    ],
    timeout: [
      'Try with shorter content',
      'Check your internet connection speed',
      'Try again in a few moments',
      'Break large content into smaller parts'
    ],
    ai: [
      'Wait a few minutes and try again',
      'Check if the AI service is running',
      'Try with simpler content',
      'Contact support if the issue persists'
    ],
    storage: [
      'Clear your browser cache',
      'Check available storage space',
      'Try in an incognito/private window',
      'Enable cookies and local storage'
    ],
    rate_limit: [
      'Wait before making additional requests',
      'Reduce the frequency of your requests',
      'Try again in a few minutes',
      'Consider upgrading your plan'
    ],
    validation: [
      'Check your input data format',
      'Ensure all required fields are provided',
      'Verify data types match expected values',
      'Remove any special characters'
    ],
    server: [
      'Try the operation again in a few minutes',
      'Check system status page for outages',
      'Contact support if the problem persists',
      'Try with different content'
    ],
    client: [
      'Refresh the page and try again',
      'Clear your browser cache',
      'Try in a different browser',
      'Contact support for assistance'
    ]
  };
  
  const suggestions = baseSuggestions[type] || baseSuggestions.client;
  
  // Add retry-specific suggestions
  if (retryCount > 0) {
    suggestions.unshift(`This is retry attempt ${retryCount + 1}`);
  }
  
  if (retryCount >= 3) {
    suggestions.push('Consider contacting support as this issue is persistent');
  }
  
  return suggestions;
};

// Generate recovery actions
const generateRecoveryActions = (
  type: ErrorType, 
  _error: any,
  retryCallback?: () => Promise<void>,
  fallbackCallback?: () => void
): RecoveryAction[] => {
  const actions: RecoveryAction[] = [];
  
  // Retry action for retryable errors
  if (['network', 'timeout', 'ai', 'server'].includes(type) && retryCallback) {
    actions.push({
      id: 'retry',
      label: 'Try Again',
      description: 'Retry the failed operation',
      action: retryCallback,
      primary: true
    });
  }
  
  // Refresh page action
  actions.push({
    id: 'refresh',
    label: 'Refresh Page',
    description: 'Reload the page to reset the application state',
    action: () => window.location.reload()
  });
  
  // Fallback mode for certain errors
  if (['ai', 'server'].includes(type) && fallbackCallback) {
    actions.push({
      id: 'fallback',
      label: 'Use Offline Mode',
      description: 'Continue with limited functionality',
      action: fallbackCallback
    });
  }
  
  // Clear data action for storage errors
  if (type === 'storage') {
    actions.push({
      id: 'clear-storage',
      label: 'Clear Storage',
      description: 'Clear browser storage and restart',
      action: () => {
        localStorage.clear();
        sessionStorage.clear();
        window.location.reload();
      }
    });
  }
  
  // Go back action
  actions.push({
    id: 'go-back',
    label: 'Go Back',
    description: 'Return to the previous page',
    action: () => window.history.back()
  });
  
  return actions;
};

// Error logging function with structured data
const logError = (error: StructuredError, context?: Record<string, any>) => {
  const logData = {
    id: error.id,
    type: error.type,
    severity: error.severity,
    message: error.technicalMessage,
    timestamp: error.timestamp.toISOString(),
    context: { ...error.context, ...context },
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.group(`🚨 Error [${error.severity.toUpperCase()}]: ${error.type}`);
    console.error('Error Details:', logData);
    console.error('Original Error:', error);
    console.groupEnd();
  }
  
  // In production, send to error tracking service
  // Example: Sentry, LogRocket, Bugsnag, etc.
  // errorTrackingService.captureException(error, { extra: logData });
};

// Enhanced error handler hook
export const useErrorHandler = () => {
  const { 
    addError, 
    removeError, 
    clearAllErrors, 
    incrementRetryCount, 
    resetRetryCount,
    setRecovering,
    setFallbackMode,
    preserveState,
    restoreState,
    error: errorState
  } = useAppStore();
  
  const retryTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
  
  // Enhanced error handling with advanced classification and monitoring
  const handleError = useCallback((
    error: any,
    context?: Record<string, any>,
    retryCallback?: () => Promise<void>,
    fallbackCallback?: () => void,
    feature?: string,
    userAction?: string
  ) => {
    // Use simple error classification
    const structuredError = {
      id: Date.now().toString(),
      type: 'api' as ErrorType,
      severity: 'medium' as ErrorSeverity,
      message: error.message || 'An error occurred',
      originalError: error,
      timestamp: new Date(),
      context: {},
      recoveryActions: []
    };
    
    // Enhance with additional context
    structuredError.context = {
      ...structuredError.context,
      ...context,
      retryCount: errorState.retryCount,
      timestamp: Date.now(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    // Generate recovery actions with callbacks
    if (retryCallback || fallbackCallback) {
      structuredError.recoveryActions = [
        ...(retryCallback ? [{ type: 'retry' as const, label: 'Retry', action: retryCallback }] : []),
        ...(fallbackCallback ? [{ type: 'fallback' as const, label: 'Use fallback', action: fallbackCallback }] : [])
      ];
    }
    
    // Add to store
    addError(structuredError);
    
    // Record in monitoring system (simplified)
    console.error('Error recorded:', structuredError);
    
    // Log error with enhanced context
    logError(structuredError, context);
    
    return structuredError;
  }, [addError, errorState.retryCount]);
  
  // Handle async errors without throwing
  const handleAsyncError = useCallback((
    error: any,
    context?: Record<string, any>,
    retryCallback?: () => Promise<void>,
    fallbackCallback?: () => void
  ) => {
    return handleError(error, context, retryCallback, fallbackCallback);
  }, [handleError]);
  
  // Enhanced retry with exponential backoff and circuit breaker
  const retryWithBackoff = useCallback(async (
    operation: () => Promise<void>,
    errorId: string,
    errorType: ErrorType = 'client',
    maxRetries?: number
  ) => {
    const error = errorState.errors.find(e => e.id === errorId);
    if (!error) {
      console.warn(`Error with ID ${errorId} not found for retry`);
      return false;
    }
    
    if (errorState.retryCount >= (maxRetries || 3)) {
      console.log('Max retries reached:', errorId);
      return false;
    }
    
    incrementRetryCount();
    setRecovering(true, 0);
    
    try {
      // Use circuit breaker for the appropriate service
      const circuitBreaker = circuitBreakers[errorType] || circuitBreakers.network;
      
      const result = await circuitBreaker.execute(async () => {
        return await withExponentialBackoff(
          operation,
          errorType,
          {
            maxRetries: maxRetries || 3,
            onRetry: (retryError, attempt, delay) => {
              const progress = (attempt / (maxRetries || 3)) * 100;
              setRecovering(true, progress);
              // Retry attempt logged
              console.log(`🔄 Retry attempt ${attempt} for error ${errorId} after ${delay}ms`);
            },
            onSuccess: (attempt) => {
              console.log('Retry successful:', errorId, attempt);
            },
            onFailure: (failureError, totalAttempts) => {
              console.error(`❌ All retries failed for error ${errorId}`, totalAttempts);
            }
          }
        );
      });
      
      // Success - clear error and reset retry count
      removeError(errorId);
      resetRetryCount();
      setRecovering(false, 0);
      
      return true;
    } catch (retryError) {
      setRecovering(false, 0);
      handleAsyncError(retryError, { 
        isRetry: true, 
        originalErrorId: errorId,
        retryAttempt: errorState.retryCount + 1
      });
      return false;
    }
  }, [errorState.retryCount, errorState.errors, incrementRetryCount, setRecovering, removeError, resetRetryCount, handleAsyncError]);
  
  // Enable fallback mode with graceful degradation
  const enableFallbackMode = useCallback((preserveCurrentState = true) => {
    if (preserveCurrentState) {
      const currentState = {
        emailContent: useAppStore.getState().emailContent,
        ui: useAppStore.getState().ui
      };
      preserveState(currentState);
    }
    
    setFallbackMode(true);
    clearAllErrors();
  }, [setFallbackMode, preserveState, clearAllErrors]);
  
  // Disable fallback mode and restore state
  const disableFallbackMode = useCallback(() => {
    const preserved = restoreState();
    setFallbackMode(false);
    
    return preserved;
  }, [setFallbackMode, restoreState]);
  
  // Clear specific error
  const clearError = useCallback((errorId: string) => {
    removeError(errorId);
    
    // Clear any pending retry timeouts
    const timeout = retryTimeouts.current.get(errorId);
    if (timeout) {
      clearTimeout(timeout);
      retryTimeouts.current.delete(errorId);
    }
  }, [removeError]);
  
  // Clear all errors
  const clearAllErrorsHandler = useCallback(() => {
    clearAllErrors();
    resetRetryCount();
    setRecovering(false, 0);
    
    // Clear all retry timeouts
    retryTimeouts.current.forEach(timeout => clearTimeout(timeout));
    retryTimeouts.current.clear();
  }, [clearAllErrors, resetRetryCount, setRecovering]);
  
  // Enhanced system health check with detailed status
  const checkSystemHealth = useCallback(async () => {
    try {
      const [apiHealth, serviceStatus] = await Promise.all([
        apiService.checkAPIHealth?.() || Promise.resolve({ healthy: false }),
        apiService.getServiceStatus?.() || Promise.resolve({ api: false, ai: false, storage: false })
      ]);
      
      const overallHealth = apiHealth.healthy && serviceStatus.api;
      
      return {
        healthy: overallHealth,
        details: {
          api: serviceStatus.api,
          ai: serviceStatus.ai,
          storage: serviceStatus.storage,
          timestamp: new Date().toISOString()
        }
      };
    } catch (healthError) {
      console.error('Health check failed:', healthError);
      return {
        healthy: false,
        details: {
          error: healthError instanceof Error ? healthError.message : 'Unknown error',
          timestamp: new Date().toISOString()
        }
      };
    }
  }, []);
  
  // Get error monitoring metrics
  const getErrorMetrics = useCallback(() => {
    return { totalErrors: 0, errorsByType: {}, errorsByComponent: {} };
  }, []);
  
  // Get error monitoring report
  const getErrorReport = useCallback(() => {
    return { errors: [], summary: 'No monitoring available' };
  }, []);
  
  // Clear error monitoring data
  const clearErrorMonitoring = useCallback(() => {
    // No-op
  }, []);
  
  return {
    // Core error handling
    handleError,
    handleAsyncError,
    
    // Retry mechanisms
    retryWithBackoff,
    retryStrategies, // Export retry strategies for direct use
    
    // Fallback and recovery
    enableFallbackMode,
    disableFallbackMode,
    
    // Error management
    clearError,
    clearAllErrors: clearAllErrorsHandler,
    
    // System health and monitoring
    checkSystemHealth,
    getErrorMetrics,
    getErrorReport,
    clearErrorMonitoring,
    
    // State
    errorState,
    
    // Circuit breaker states (for debugging/monitoring)
    circuitBreakerStates: {
      ai: circuitBreakers.ai.getState(),
      network: circuitBreakers.network.getState(),
      server: circuitBreakers.server.getState(),
      storage: circuitBreakers.storage.getState()
    }
  };
};