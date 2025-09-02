import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'minimal' | 'dots';
  className?: string;
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  variant = 'default',
  className = '' 
}) => {
  if (variant === 'dots') {
    return (
      <div className={`loading-dots loading-dots-${size} ${className}`} role="status" aria-label="Loading">
        <div></div>
        <div></div>
        <div></div>
        <span className="sr-only">Loading...</span>
      </div>
    );
  }

  return (
    <div 
      className={`loading-spinner loading-spinner-${size} ${className}`}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;