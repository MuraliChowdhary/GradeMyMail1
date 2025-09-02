import React from 'react';

interface SkeletonLoaderProps {
  variant?: 'text' | 'rectangular' | 'circular' | 'rounded';
  width?: string | number;
  height?: string | number;
  lines?: number;
  className?: string;
  animated?: boolean;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({
  variant = 'text',
  width = '100%',
  height,
  lines = 1,
  className = '',
  animated = true,
}) => {
  const getSkeletonClass = () => {
    const baseClass = `
      bg-gradient-to-r from-gray-200 via-gray-300 to-gray-200 
      dark:from-gray-700 dark:via-gray-600 dark:to-gray-700
      ${animated ? 'animate-pulse' : ''}
    `;

    switch (variant) {
      case 'circular':
        return `${baseClass} rounded-full`;
      case 'rounded':
        return `${baseClass} rounded-lg`;
      case 'rectangular':
        return `${baseClass} rounded-none`;
      case 'text':
      default:
        return `${baseClass} rounded`;
    }
  };

  const getDefaultHeight = () => {
    if (height) return height;
    switch (variant) {
      case 'text':
        return '1rem';
      case 'circular':
        return width;
      default:
        return '2rem';
    }
  };

  const skeletonStyle = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof getDefaultHeight() === 'number' ? `${getDefaultHeight()}px` : getDefaultHeight(),
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={`space-y-2 ${className}`}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={getSkeletonClass()}
            style={{
              ...skeletonStyle,
              width: index === lines - 1 ? '75%' : skeletonStyle.width, // Last line shorter
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${getSkeletonClass()} ${className}`}
      style={skeletonStyle}
    />
  );
};

export default SkeletonLoader;