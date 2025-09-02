import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../hooks/useTheme';

interface ThemeResponsiveLogoProps {
  /** Size variant for the logo */
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  /** Custom className for styling */
  className?: string;
  /** Whether the logo should be clickable for navigation */
  clickable?: boolean;
  /** Custom click handler - overrides default navigation */
  onClick?: () => void;
  /** Loading state for the logo */
  loading?: boolean;
  /** Show fallback text if images fail */
  showFallbackText?: boolean;
}

const ThemeResponsiveLogo: React.FC<ThemeResponsiveLogoProps> = ({
  size = 'md',
  className = '',
  clickable = true,
  onClick,
  loading = false,
  showFallbackText = true,
}) => {
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Size configurations with Apple-style proportions
  const sizeConfig = {
    sm: {
      height: '32px',
      containerClass: 'h-8',
    },
    md: {
      height: '40px',
      containerClass: 'h-10',
    },
    lg: {
      height: '48px',
      containerClass: 'h-12',
    },
    xl: {
      height: '64px',
      containerClass: 'h-16',
    },
    hero: {
      height: '83px',
      containerClass: 'h-[83px]',
    },
  };

  const config = sizeConfig[size];

  // Get the appropriate logo based on theme
  const logoSrc = resolvedTheme === 'dark' ? `/gmm1.png?v=2024-12-09-new` : '/gmm2.png';

  const handleClick = useCallback(() => {
    if (!clickable) return;
    
    if (onClick) {
      onClick();
    } else {
      // Default navigation to home/GradeMyMail
      navigate('/');
    }
  }, [clickable, onClick, navigate]);

  const handleImageLoad = useCallback(() => {
    console.log(`✅ Logo loaded successfully: ${logoSrc}`);
    setImageLoading(false);
    setImageError(false);
  }, [logoSrc]);

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    console.error(`❌ Logo failed to load: ${logoSrc}`, e);
    setImageError(true);
    setImageLoading(false);
  }, [logoSrc]);

  // Loading skeleton with Apple-style shimmer
  const LoadingSkeleton = () => (
    <div 
      className={`${config.containerClass} bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse relative overflow-hidden`}
      style={{ width: 'auto', aspectRatio: '16/9' }}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 dark:via-gray-600/20 to-transparent animate-shimmer"></div>
    </div>
  );

  // Fallback text with premium styling
  const FallbackText = () => (
    <div className={`${config.containerClass} flex items-center justify-center`}>
      <h1 className={`
        font-light text-gray-900 dark:text-white tracking-tight cursor-default select-none
        transition-all duration-300 hover:scale-105
        ${size === 'hero' ? 'text-5xl' : 
          size === 'xl' ? 'text-3xl' : 
          size === 'lg' ? 'text-2xl' : 
          size === 'md' ? 'text-xl' : 'text-lg'}
      `}>
        GradeMyMail
      </h1>
    </div>
  );

  return (
    <div
      className={`
        flex items-center justify-center
        ${clickable ? 'cursor-pointer group' : 'cursor-default'}
        ${className}
      `}
      onClick={handleClick}
      role={clickable ? 'button' : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={clickable ? (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      } : undefined}
      aria-label={clickable ? 'Navigate to home page' : 'GradeMyMail logo'}
    >
      {/* Logo Container */}
      <div className={`${config.containerClass} flex items-center justify-center relative`}>
        {loading || imageLoading ? (
          <LoadingSkeleton />
        ) : imageError ? (
          showFallbackText ? <FallbackText /> : null
        ) : (
          <>
            <img
              src={logoSrc}
              alt="GradeMyMail"
              className={`
                w-auto object-contain
                transition-all duration-300 ease-out
                ${clickable ? 'group-hover:scale-105 group-active:scale-102' : ''}
                gpu-accelerated
              `}
              style={{ height: config.height }}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="eager"
            />
            
            {/* Premium hover effect overlay */}
            {clickable && (
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-lg pointer-events-none" />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ThemeResponsiveLogo;