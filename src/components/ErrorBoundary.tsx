import React, { useCallback, useEffect } from 'react';
import { ErrorBoundary as ReactErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { useAppStore } from '../store';
import { useErrorHandler } from '../hooks/useErrorHandler';
import { ErrorDisplay } from './ErrorDisplay';
import { useAccessibility } from '../utils/accessibility';
// import { StatePreservation } from '../utils/errorRecovery';

// Enhanced error fallback component with recovery features
const ErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const { handleError, enableFallbackMode, checkSystemHealth } = useErrorHandler();
  const { announce, setFocus } = useAccessibility();
  // const { preserveState, restoreState } = useAppStore();

  // Convert boundary error to structured error
  const structuredError = React.useMemo(() => {
    const baseError = handleError(error, { 
      componentStack: 'Error Boundary',
      boundaryError: true 
    });
    
    return {
      ...baseError,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
  }, [error, handleError]);

  // Announce error to screen readers and manage focus
  useEffect(() => {
    announce(
      `Application error occurred: ${error.message}. Please use the retry options below.`,
      'assertive'
    );

    // Focus the error container for keyboard users
    const errorContainer = document.querySelector('[role="alert"]') as HTMLElement;
    if (errorContainer) {
      setTimeout(() => setFocus(errorContainer), 100);
    }
  }, [error, announce, setFocus]);

  const handleReset = useCallback(async () => {
    try {
      announce('Attempting to recover from error...', 'polite');
      
      // Check system health before reset
      const isHealthy = await checkSystemHealth();
      if (!isHealthy) {
        enableFallbackMode(true);
        announce('Enabling safe mode due to system health issues', 'polite');
      }
      
      resetErrorBoundary();
      
      // Focus management after reset
      setTimeout(() => {
        const mainContent = document.getElementById('main-content');
        if (mainContent) {
          setFocus(mainContent);
          announce('Application recovered successfully', 'polite');
        }
      }, 100);
    } catch (resetError) {
      console.error('Reset failed:', resetError);
      announce('Recovery failed. Reloading page...', 'assertive');
      window.location.reload();
    }
  }, [resetErrorBoundary, checkSystemHealth, enableFallbackMode, announce, setFocus]);

  const handleFallbackMode = useCallback(() => {
    announce('Enabling safe mode with limited functionality', 'polite');
    enableFallbackMode(true);
    resetErrorBoundary();
  }, [enableFallbackMode, resetErrorBoundary, announce]);

  const handleReload = useCallback(() => {
    announce('Saving your work and reloading the page...', 'polite');
    
    // Preserve current state before reload
    const currentState = {
      emailContent: useAppStore.getState().emailContent,
      ui: useAppStore.getState().ui
    };
    
    try {
      localStorage.setItem('email-analysis-recovery', JSON.stringify({
        state: currentState,
        timestamp: Date.now(),
        reason: 'error-boundary-reload'
      }));
    } catch (storageError) {
      console.warn('Could not preserve state before reload:', storageError);
    }
    
    window.location.reload();
  }, [announce]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div 
        className="max-w-lg w-full bg-white rounded-lg shadow-lg p-6"
        role="alert"
        aria-live="assertive"
        aria-atomic="true"
        aria-labelledby="error-title"
        aria-describedby="error-description"
      >
        <ErrorDisplay
          error={structuredError}
          onRetry={async () => {
            await handleReset();
          }}
          className="mb-6"
        />
        
        <div className="space-y-3" role="group" aria-labelledby="recovery-options">
          <h3 id="recovery-options" className="sr-only">Recovery Options</h3>
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={handleReset}
              className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
              aria-describedby="try-again-desc"
            >
              Try Again
            </button>
            
            <button
              onClick={handleFallbackMode}
              className="flex-1 bg-yellow-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 transition-colors"
              aria-describedby="safe-mode-desc"
            >
              Safe Mode
            </button>
          </div>
          
          <button
            onClick={handleReload}
            className="w-full bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors"
            aria-describedby="reload-desc"
          >
            Reload Page
          </button>
        </div>
        
        <div className="mt-6 p-4 bg-blue-50 rounded-md" role="region" aria-labelledby="error-explanation">
          <h3 id="error-explanation" className="text-sm font-medium text-blue-800 mb-2">What happened?</h3>
          <p id="error-description" className="text-xs text-blue-700 mb-3">
            The application encountered an unexpected error. Your work has been automatically saved and can be recovered.
          </p>
          <div className="text-xs text-blue-600 space-y-1">
            <p id="try-again-desc">• <strong>Try Again:</strong> Attempt to recover and continue normally</p>
            <p id="safe-mode-desc">• <strong>Safe Mode:</strong> Continue with limited functionality</p>
            <p id="reload-desc">• <strong>Reload Page:</strong> Fresh start with state recovery</p>
          </div>
        </div>
        
        {process.env.NODE_ENV === 'development' && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm text-gray-500 hover:text-gray-700 font-medium">
              Technical Details (Development)
            </summary>
            <div className="mt-2 p-3 bg-gray-100 rounded text-xs font-mono">
              <div className="mb-2">
                <strong>Error:</strong> {error.name}
              </div>
              <div className="mb-2">
                <strong>Message:</strong> {error.message}
              </div>
              <div>
                <strong>Stack:</strong>
                <pre className="mt-1 whitespace-pre-wrap text-red-600 max-h-32 overflow-auto">
                  {error.stack}
                </pre>
              </div>
            </div>
          </details>
        )}
      </div>
    </div>
  );
};

// Enhanced minimal error fallback for smaller components
const MinimalErrorFallback: React.FC<FallbackProps> = ({ error, resetErrorBoundary }) => {
  const { handleError } = useErrorHandler();

  const structuredError = React.useMemo(() => {
    const baseError = handleError(error, { 
      componentStack: 'Component Error Boundary',
      boundaryError: true,
      minimal: true
    });
    
    return {
      ...baseError,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
  }, [error, handleError]);

  return (
    <ErrorDisplay
      error={structuredError}
      onRetry={async () => {
        resetErrorBoundary();
      }}
      compact={true}
      className="my-2"
    />
  );
};

// Enhanced network error fallback
const NetworkErrorFallback: React.FC<FallbackProps & { onRetry?: () => void }> = ({ 
  error,
  resetErrorBoundary,
  onRetry 
}) => {
  const { handleError, checkSystemHealth } = useErrorHandler();

  const structuredError = React.useMemo(() => {
    const baseError = handleError(error, { 
      componentStack: 'Network Error Boundary',
      boundaryError: true,
      networkError: true
    });
    
    return {
      ...baseError,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };
  }, [error, handleError]);

  const handleRetry = useCallback(async () => {
    try {
      // Check system health before retry
      const isHealthy = await checkSystemHealth();
      if (!isHealthy) {
        throw new Error('System health check failed');
      }
      
      if (onRetry) {
        await onRetry();
      }
      resetErrorBoundary();
    } catch (retryError) {
      console.error('Network retry failed:', retryError);
      // Let the error boundary handle the retry failure
    }
  }, [onRetry, resetErrorBoundary, checkSystemHealth]);

  return (
    <ErrorDisplay
      error={structuredError}
      onRetry={handleRetry}
      className="m-4"
    />
  );
};

// Error logging function
const logError = (error: Error, errorInfo: React.ErrorInfo) => {
  // In development, log to console
  if (process.env.NODE_ENV === 'development') {
    console.error('Error Boundary caught an error:', error);
    console.error('Error Info:', errorInfo);
  }
  
  // In production, you would send this to your error tracking service
  // Example: Sentry, LogRocket, Bugsnag, etc.
  // errorTrackingService.captureException(error, { extra: errorInfo });
};

// Main error boundary wrapper
interface AppErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const AppErrorBoundary: React.FC<AppErrorBoundaryProps> = ({
  children,
  fallback = ErrorFallback,
  onError = logError,
}) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onError={onError}
      onReset={() => {
        // Clear any error state and reset the app
        // Store integration can be added later
      }}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Component-level error boundary for smaller sections
interface ComponentErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<FallbackProps>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const ComponentErrorBoundary: React.FC<ComponentErrorBoundaryProps> = ({
  children,
  fallback = MinimalErrorFallback,
  onError = logError,
}) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={fallback}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

// Network-specific error boundary
interface NetworkErrorBoundaryProps {
  children: React.ReactNode;
  onRetry?: () => void;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export const NetworkErrorBoundary: React.FC<NetworkErrorBoundaryProps> = ({
  children,
  onRetry,
  onError = logError,
}) => {
  return (
    <ReactErrorBoundary
      FallbackComponent={(props) => <NetworkErrorFallback {...props} onRetry={onRetry} />}
      onError={onError}
    >
      {children}
    </ReactErrorBoundary>
  );
};

export default AppErrorBoundary;