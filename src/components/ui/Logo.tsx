import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface LogoProps {
  /** Size variant for the logo */
  size?: 'sm' | 'md' | 'lg' | 'lg-xl' | 'xl';
  /** Whether to show the text alongside the logo */
  showText?: boolean;
  /** Custom className for styling */
  className?: string;
  /** Whether the logo should be clickable for navigation */
  clickable?: boolean;
  /** Custom click handler - overrides default navigation */
  onClick?: () => void;
  /** Loading state for the logo */
  loading?: boolean;
}

const Logo: React.FC<LogoProps> = ({
  size = 'md',
  showText = true,
  className = '',
  clickable = true,
  onClick,
  loading = false,
}) => {
  const navigate = useNavigate();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);

  // Size configurations
  const sizeConfig = {
    sm: {
      container: 'h-8',
      image: 'h-8 w-auto',
      text: 'text-lg font-semibold',
      spacing: 'space-x-2',
    },
    md: {
      container: 'h-10',
      image: 'h-10 w-auto',
      text: 'text-xl font-semibold',
      spacing: 'space-x-3',
    },
    lg: {
      container: 'h-12',
      image: 'h-12 w-auto',
      text: 'text-2xl font-bold',
      spacing: 'space-x-4',
    },
    xl: {
      container: 'h-24',
      image: 'h-24 w-auto',
      text: 'text-4xl font-bold',
      spacing: 'space-x-6',
    },
    'lg-xl': {
      container: 'h-16',
      image: 'h-16 w-auto',
      text: 'text-3xl font-bold',
      spacing: 'space-x-5',
    },
  };

  const config = sizeConfig[size];

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
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageError(true);
    setImageLoading(false);
  }, []);

  // Fallback logo component when image fails to load
  const FallbackLogo = () => (
    <div className={`${config.container} flex items-center justify-center bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white font-bold`}>
      <span className="text-sm">P&P</span>
    </div>
  );

  // Loading skeleton
  const LoadingSkeleton = () => (
    <div className={`${config.container} bg-gray-200 animate-pulse rounded-lg`} />
  );

  return (
    <div
      className={`
        flex items-center ${config.spacing}
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
      aria-label={clickable ? 'Navigate to home page' : 'Pick and Partner logo'}
    >
      {/* Logo Image */}
      <div className={`${config.container} flex items-center justify-center relative`}>
        {loading || imageLoading ? (
          <LoadingSkeleton />
        ) : imageError ? (
          <FallbackLogo />
        ) : (
          <>
            <img
              src="/Logo/PickandPArtner.Png"
              alt="Pick and Partner"
              className={`
                ${config.image} 
                object-contain
                transition-all duration-200
                ${clickable ? 'group-hover:scale-105' : ''}
              `}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="eager"
            />
            {/* Hover effect overlay */}
            {clickable && (
              <div className="absolute inset-0 bg-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 rounded-lg" />
            )}
          </>
        )}
      </div>

      {/* Logo Text */}
      {showText && (
        <div className="flex flex-col">
          <span 
            className={`
              ${config.text} 
              text-gray-900 
              transition-colors duration-200
              ${clickable ? 'group-hover:text-blue-600' : ''}
            `}
          >
            Pick & Partner
          </span>
          {size === 'lg' && (
            <span className="text-sm text-gray-500 -mt-1">
              Email Analysis Platform
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default Logo;