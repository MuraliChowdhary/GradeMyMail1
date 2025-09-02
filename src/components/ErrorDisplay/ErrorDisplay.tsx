import React, { useState, useCallback } from 'react';
import { type StructuredError, type RecoveryAction } from '../../store';

interface ErrorDisplayProps {
  error: StructuredError;
  onDismiss?: (errorId: string) => void;
  onRetry?: (errorId: string) => Promise<void>;
  className?: string;
  compact?: boolean;
}

const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onDismiss,
  onRetry,
  className = '',
  compact = false
}) => {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-600',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-100 text-red-800 hover:bg-red-200'
        };
      case 'high':
        return {
          container: 'bg-red-50 border-red-200',
          icon: 'text-red-500',
          title: 'text-red-800',
          message: 'text-red-700',
          button: 'bg-red-100 text-red-800 hover:bg-red-200'
        };
      case 'medium':
        return {
          container: 'bg-yellow-50 border-yellow-200',
          icon: 'text-yellow-500',
          title: 'text-yellow-800',
          message: 'text-yellow-700',
          button: 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
        };
      case 'low':
      default:
        return {
          container: 'bg-blue-50 border-blue-200',
          icon: 'text-blue-500',
          title: 'text-blue-800',
          message: 'text-blue-700',
          button: 'bg-blue-100 text-blue-800 hover:bg-blue-200'
        };
    }
  };

  const getErrorIcon = (type: string, severity: string) => {
    if (severity === 'critical') {
      return (
        <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
      );
    }

    switch (type) {
      case 'network':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'ai':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      case 'storage':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'validation':
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const handleRecoveryAction = useCallback(async (action: RecoveryAction) => {
    if (action.id === 'retry' && onRetry) {
      setIsRetrying(true);
      try {
        await onRetry(error.id);
      } catch (retryError) {
        console.error('Retry failed:', retryError);
      } finally {
        setIsRetrying(false);
      }
    } else {
      try {
        await action.action();
      } catch (actionError) {
        console.error('Recovery action failed:', actionError);
      }
    }
  }, [error.id, onRetry]);

  const styles = getSeverityStyles(error.severity);

  if (compact) {
    return (
      <div className={`p-3 border rounded-md ${styles.container} ${className}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className={`flex-shrink-0 ${styles.icon}`}>
              {getErrorIcon(error.type, error.severity)}
            </div>
            <p className={`text-sm font-medium ${styles.title}`}>
              {error.userMessage}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {error.retryable && onRetry && (
              <button
                onClick={() => handleRecoveryAction({ id: 'retry', label: 'Retry', description: '', action: () => onRetry(error.id) })}
                disabled={isRetrying}
                className={`text-xs px-2 py-1 rounded ${styles.button} transition-colors disabled:opacity-50`}
              >
                {isRetrying ? 'Retrying...' : 'Retry'}
              </button>
            )}
            {onDismiss && (
              <button
                onClick={() => onDismiss(error.id)}
                className={`text-xs px-2 py-1 rounded ${styles.button} transition-colors`}
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg ${styles.container} ${className}`}>
      <div className="p-4">
        <div className="flex items-start">
          <div className={`flex-shrink-0 ${styles.icon}`}>
            {getErrorIcon(error.type, error.severity)}
          </div>
          <div className="ml-3 flex-1">
            <h3 className={`text-sm font-medium ${styles.title}`}>
              {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
              {error.severity === 'critical' && ' (Critical)'}
            </h3>
            <p className={`mt-1 text-sm ${styles.message}`}>
              {error.userMessage}
            </p>
            
            {/* Error timestamp */}
            <p className="mt-1 text-xs text-gray-500">
              Occurred at {error.timestamp.toLocaleTimeString()}
            </p>

            {/* Suggestions */}
            {error.suggestions && error.suggestions.length > 0 && (
              <div className="mt-3">
                <button
                  onClick={() => setShowSuggestions(!showSuggestions)}
                  className={`text-xs ${styles.button} px-2 py-1 rounded transition-colors`}
                >
                  {showSuggestions ? 'Hide' : 'Show'} Suggestions ({error.suggestions?.length || 0})
                </button>
                
                {showSuggestions && (
                  <ul className={`mt-2 text-xs ${styles.message} space-y-1`}>
                    {error.suggestions.map((suggestion, index) => (
                      <li key={index} className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>{suggestion}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {/* Technical details (development only) */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-3">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className={`text-xs ${styles.button} px-2 py-1 rounded transition-colors`}
                >
                  {showDetails ? 'Hide' : 'Show'} Technical Details
                </button>
                
                {showDetails && (
                  <div className="mt-2 p-2 bg-gray-100 rounded text-xs font-mono">
                    <div><strong>Type:</strong> {error.type}</div>
                    <div><strong>Severity:</strong> {error.severity}</div>
                    <div><strong>ID:</strong> {error.id}</div>
                    <div><strong>Retryable:</strong> {error.retryable ? 'Yes' : 'No'}</div>
                    {error.context && (
                      <div className="mt-1">
                        <strong>Context:</strong>
                        <pre className="mt-1 whitespace-pre-wrap">
                          {JSON.stringify(error.context, null, 2)}
                        </pre>
                      </div>
                    )}
                    <div className="mt-1">
                      <strong>Technical Message:</strong>
                      <pre className="mt-1 whitespace-pre-wrap text-red-600">
                        {error.technicalMessage}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Recovery Actions */}
        {error.recoveryActions && error.recoveryActions.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {error.recoveryActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleRecoveryAction(action)}
                disabled={isRetrying && action.id === 'retry'}
                className={`text-sm px-3 py-1 rounded transition-colors ${
                  action.primary 
                    ? `${styles.button} font-medium` 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
                title={action.description}
              >
                {isRetrying && action.id === 'retry' ? 'Retrying...' : action.label}
              </button>
            ))}
          </div>
        )}

        {/* Dismiss button */}
        {onDismiss && (
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => onDismiss(error.id)}
              className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ErrorDisplay;