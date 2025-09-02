import React, { useEffect, useState } from 'react';
import { type StructuredError } from '../../store';

interface ErrorToastProps {
  error: StructuredError;
  onDismiss: (errorId: string) => void;
  onRetry?: (errorId: string) => Promise<void>;
  autoHide?: boolean;
  hideDelay?: number;
}

const ErrorToast: React.FC<ErrorToastProps> = ({
  error,
  onDismiss,
  onRetry,
  autoHide = true,
  hideDelay = 5000
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);

  useEffect(() => {
    if (autoHide && error.severity !== 'critical') {
      const timer = setTimeout(() => {
        handleDismiss();
      }, hideDelay);

      return () => clearTimeout(timer);
    }
  }, [autoHide, hideDelay, error.severity]);

  const handleDismiss = () => {
    setIsVisible(false);
    setTimeout(() => onDismiss(error.id), 300); // Allow fade out animation
  };

  const handleRetry = async () => {
    if (!onRetry) return;
    
    setIsRetrying(true);
    try {
      await onRetry(error.id);
    } catch (retryError) {
      console.error('Toast retry failed:', retryError);
    } finally {
      setIsRetrying(false);
    }
  };

  const getSeverityStyles = (severity: string) => {
    switch (severity) {
      case 'critical':
        return {
          container: 'bg-red-600 border-red-700',
          text: 'text-white',
          button: 'bg-red-500 hover:bg-red-400 text-white'
        };
      case 'high':
        return {
          container: 'bg-red-500 border-red-600',
          text: 'text-white',
          button: 'bg-red-400 hover:bg-red-300 text-white'
        };
      case 'medium':
        return {
          container: 'bg-yellow-500 border-yellow-600',
          text: 'text-white',
          button: 'bg-yellow-400 hover:bg-yellow-300 text-white'
        };
      case 'low':
      default:
        return {
          container: 'bg-blue-500 border-blue-600',
          text: 'text-white',
          button: 'bg-blue-400 hover:bg-blue-300 text-white'
        };
    }
  };

  const getErrorIcon = (type: string) => {
    switch (type) {
      case 'network':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
          </svg>
        );
      case 'ai':
        return (
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        );
      default:
        return (
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  const styles = getSeverityStyles(error.severity);

  return (
    <div
      className={`
        fixed top-4 right-4 z-50 max-w-sm w-full
        transform transition-all duration-300 ease-in-out
        ${isVisible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
    >
      <div className={`rounded-lg border shadow-lg ${styles.container}`}>
        <div className="p-4">
          <div className="flex items-start">
            <div className={`flex-shrink-0 ${styles.text}`}>
              {getErrorIcon(error.type)}
            </div>
            <div className="ml-3 flex-1">
              <p className={`text-sm font-medium ${styles.text}`}>
                {error.type.charAt(0).toUpperCase() + error.type.slice(1)} Error
              </p>
              <p className={`mt-1 text-xs ${styles.text} opacity-90`}>
                {error.userMessage}
              </p>
            </div>
            <div className="ml-4 flex-shrink-0 flex space-x-2">
              {error.retryable && onRetry && (
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className={`text-xs px-2 py-1 rounded ${styles.button} transition-colors disabled:opacity-50`}
                >
                  {isRetrying ? '...' : '↻'}
                </button>
              )}
              <button
                onClick={handleDismiss}
                className={`text-xs px-2 py-1 rounded ${styles.button} transition-colors`}
              >
                ×
              </button>
            </div>
          </div>
        </div>
        
        {/* Progress bar for auto-hide */}
        {autoHide && error.severity !== 'critical' && (
          <div className="h-1 bg-black bg-opacity-20">
            <div 
              className="h-full bg-white bg-opacity-30 transition-all ease-linear"
              style={{
                width: '100%',
                animation: `shrink ${hideDelay}ms linear forwards`
              }}
            />
          </div>
        )}
      </div>
      
      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default ErrorToast;