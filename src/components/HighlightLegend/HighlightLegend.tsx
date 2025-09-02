import React from 'react';
import type { HighlightColors } from '../../types/highlighting';
import { Tooltip } from '../Tooltip';

interface LegendItem {
  type: 'fluff' | 'spam_words' | 'hard_to_read';
  label: string;
  description: string;
  icon: string;
}

interface HighlightLegendProps {
  visible?: boolean;
  colors?: HighlightColors;
  className?: string;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  animated?: boolean;
  onClose?: () => void;
}

const DEFAULT_COLORS: HighlightColors = {
  fluff: {
    background: 'rgba(6, 182, 212, 0.2)',
    border: 'rgba(6, 182, 212, 0.4)',
    opacity: 0.8,
  },
  spam_words: {
    background: 'rgba(234, 179, 8, 0.2)',
    border: 'rgba(234, 179, 8, 0.4)',
    opacity: 0.8,
  },
  hard_to_read: {
    background: 'rgba(239, 68, 68, 0.2)',
    border: 'rgba(239, 68, 68, 0.4)',
    opacity: 0.8,
  },
};

const LEGEND_ITEMS: LegendItem[] = [
  {
    type: 'fluff',
    label: 'Fluff',
    description: 'Unnecessary words that can be removed',
    icon: '💨',
  },
  {
    type: 'spam_words',
    label: 'Spam Words',
    description: 'Words that might trigger spam filters',
    icon: '⚠️',
  },
  {
    type: 'hard_to_read',
    label: 'Hard to Read',
    description: 'Complex sentences that need simplification',
    icon: '🔍',
  },
];

const POSITION_CLASSES = {
  'top-right': 'top-4 right-4',
  'top-left': 'top-4 left-4',
  'bottom-right': 'bottom-4 right-4',
  'bottom-left': 'bottom-4 left-4',
};

export const HighlightLegend: React.FC<HighlightLegendProps> = ({
  visible = true,
  colors = DEFAULT_COLORS,
  className = '',
  position = 'top-right',
  animated = true,
  onClose,
}) => {
  if (!visible) {
    return null;
  }

  const positionClass = POSITION_CLASSES[position];

  return (
    <div
      className={`
        fixed ${positionClass} z-50 
        bg-white dark:bg-gray-800 
        border border-gray-200 dark:border-gray-700 
        rounded-lg shadow-lg 
        p-4 min-w-64 max-w-80
        ${animated ? 'animate-in slide-in-from-top-2 fade-in duration-200' : ''}
        ${className}
      `}
      style={{
        // GPU acceleration for smooth animations
        transform: 'translateZ(0)',
        willChange: animated ? 'transform, opacity' : 'auto',
        backfaceVisibility: 'hidden',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
          Highlight Legend
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="
              text-gray-400 hover:text-gray-600 dark:hover:text-gray-300
              transition-colors duration-150
              p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700
            "
            aria-label="Close legend"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Legend items */}
      <div className="space-y-2">
        {LEGEND_ITEMS.map((item, index) => {
          const itemColors = colors[item.type];
          
          return (
            <Tooltip
              key={item.type}
              content={
                <div className="text-center">
                  <div className="font-medium mb-1">{item.label}</div>
                  <div className="text-xs opacity-90">{item.description}</div>
                  <div className="text-xs opacity-75 mt-1">
                    Click to highlight all {item.label.toLowerCase()} instances
                  </div>
                </div>
              }
              position="left"
              delay={300}
            >
              <div
                className={`
                  flex items-start space-x-3 p-3 rounded-lg cursor-pointer
                  transition-all duration-200 ease-out
                  hover:bg-gray-50 dark:hover:bg-gray-700/50
                  hover:shadow-sm hover:scale-[1.02]
                  active:scale-[0.98] active:transition-none
                  ${animated ? `animate-in slide-in-from-left-1 fade-in duration-300` : ''}
                `}
                style={{
                  animationDelay: animated ? `${index * 100}ms` : '0ms',
                }}
                onClick={() => {
                  // Add haptic feedback simulation
                  const element = document.activeElement as HTMLElement;
                  element?.blur();
                }}
              >
                {/* Enhanced color indicator with pulse effect */}
                <div
                  className="
                    flex-shrink-0 w-5 h-5 rounded-md border-2 mt-0.5
                    transition-all duration-200 ease-out
                    hover:scale-110 hover:shadow-md
                    relative overflow-hidden
                  "
                  style={{
                    backgroundColor: itemColors.background,
                    borderColor: itemColors.border,
                    opacity: itemColors.opacity,
                  }}
                >
                  {/* Subtle shine effect */}
                  <div 
                    className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-200"
                  />
                </div>
                
                {/* Enhanced content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    <span 
                      className="text-base transition-transform duration-200 hover:scale-110" 
                      role="img" 
                      aria-label={item.label}
                    >
                      {item.icon}
                    </span>
                    <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                      {item.label}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {/* Subtle arrow indicator */}
                <div className="flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <svg 
                    className="w-3 h-3 text-gray-400 dark:text-gray-500" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d="M9 5l7 7-7 7" 
                    />
                  </svg>
                </div>
              </div>
            </Tooltip>
          );
        })}
      </div>

      {/* Footer */}
      <div className="mt-4 pt-3 border-t border-gray-200 dark:border-gray-700">
        <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
          Hover over highlights for more details
        </p>
      </div>
    </div>
  );
};

export default HighlightLegend;