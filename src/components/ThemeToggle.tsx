import React from 'react';
import { useTheme } from '../hooks/useTheme';

interface ThemeToggleProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ 
  className = '',
  size = 'md'
}) => {
  const { resolvedTheme, toggleTheme } = useTheme();

  const sizeClasses = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  };

  const iconSize = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizeClasses[size]}
        inline-flex items-center justify-center
        bg-white/90 dark:bg-[#2C2C2E]/90
        backdrop-blur-xl
        border border-gray-200/60 dark:border-white/5
        rounded-full
        text-gray-500 dark:text-[#8E8E93]
        hover:text-gray-900 dark:hover:text-[#FFFFFF]
        hover:bg-white dark:hover:bg-[#3A3A3C]
        hover:border-gray-300 dark:hover:border-white/8
        hover:shadow-lg hover:shadow-black/5 dark:hover:shadow-[0_4px_20px_rgba(0,0,0,0.4)]
        active:scale-95
        transition-all duration-300 cubic-bezier(0.4, 0, 0.2, 1)
        focus:outline-none focus:ring-2 focus:ring-[#03FF40]/30 focus:ring-offset-2 focus:ring-offset-transparent
        group
        gpu-accelerated
        ${className}
      `}
      title={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
      aria-label={`Switch to ${resolvedTheme === 'light' ? 'dark' : 'light'} mode`}
    >
      {/* Light mode icon (sun) */}
      <svg 
        className={`
          ${iconSize[size]}
          transition-all duration-300 ease-out
          ${resolvedTheme === 'light' 
            ? 'opacity-100 rotate-0 scale-100' 
            : 'opacity-0 rotate-180 scale-75 absolute'
          }
        `}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" 
        />
      </svg>

      {/* Dark mode icon (moon) */}
      <svg 
        className={`
          ${iconSize[size]}
          transition-all duration-300 ease-out
          ${resolvedTheme === 'dark' 
            ? 'opacity-100 rotate-0 scale-100' 
            : 'opacity-0 -rotate-180 scale-75 absolute'
          }
        `}
        fill="none" 
        viewBox="0 0 24 24" 
        stroke="currentColor"
        strokeWidth={2}
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" 
        />
      </svg>

      {/* Premium hover effect */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-br from-[#03FF40]/10 to-[#00e639]/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
    </button>
  );
};

export default ThemeToggle;