import React, { memo } from 'react';
import type { DiffLine as DiffLineType } from '../../types/diff';
import './DiffViewer.css';

interface DiffLineProps {
  line: DiffLineType;
  isHighlighted?: boolean;
  isFocused?: boolean;
  onHover?: (lineNumber: number | null) => void;
  onFocus?: (lineNumber: number | null) => void;
  style?: React.CSSProperties;
  synchronizedHover?: boolean;
}

const DiffLine: React.FC<DiffLineProps> = memo(({ 
  line, 
  isHighlighted = false,
  isFocused = false,
  onHover,
  onFocus,
  style,
  synchronizedHover = false
}) => {
  const getLineTypeStyles = (type: DiffLineType['type']) => {
    const baseStyles = 'border-l-4 transition-all duration-300 ease-out transform-gpu';
    switch (type) {
      case 'added':
        return `${baseStyles} bg-green-50 border-green-400 text-green-800 hover:bg-green-100`;
      case 'removed':
        return `${baseStyles} bg-red-50 border-red-400 text-red-800 hover:bg-red-100`;
      case 'modified':
        return `${baseStyles} bg-yellow-50 border-yellow-400 text-yellow-800 hover:bg-yellow-100`;
      case 'unchanged':
      default:
        return `${baseStyles} bg-white border-gray-200 text-gray-700 hover:bg-gray-50`;
    }
  };

  const getLineTypeIcon = (type: DiffLineType['type']) => {
    switch (type) {
      case 'added':
        return '+';
      case 'removed':
        return '-';
      case 'modified':
        return '~';
      case 'unchanged':
      default:
        return ' ';
    }
  };

  const getHighlightStyles = () => {
    if (isHighlighted) {
      return synchronizedHover 
        ? 'ring-2 ring-blue-400 ring-opacity-80 shadow-xl scale-[1.005] translate-x-2 border-l-4 border-blue-500'
        : 'ring-2 ring-blue-300 ring-opacity-60 shadow-lg scale-[1.003] translate-x-1 border-l-2 border-blue-400';
    }
    if (isFocused) {
      return 'ring-1 ring-indigo-300 shadow-md scale-[1.002] translate-x-0.5 border-l-2 border-indigo-400';
    }
    return 'hover:shadow-md hover:scale-[1.001] hover:translate-x-0.5 hover:border-l-2 hover:border-gray-300';
  };

  const handleMouseEnter = () => {
    onHover?.(line.lineNumber);
  };

  const handleMouseLeave = () => {
    onHover?.(null);
  };

  const handleFocus = () => {
    onFocus?.(line.lineNumber);
  };

  const handleBlur = () => {
    onFocus?.(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        // Focus previous line
        const prevElement = event.currentTarget.previousElementSibling as HTMLElement;
        prevElement?.focus();
        break;
      case 'ArrowDown':
        event.preventDefault();
        // Focus next line
        const nextElement = event.currentTarget.nextElementSibling as HTMLElement;
        nextElement?.focus();
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Toggle highlight
        onHover?.(isHighlighted ? null : line.lineNumber);
        break;
      case 'Escape':
        event.preventDefault();
        onHover?.(null);
        onFocus?.(null);
        break;
    }
  };

  return (
    <div
      style={{
        ...style,
        transform: isHighlighted 
          ? synchronizedHover 
            ? 'translateX(2px) scale(1.002) translateZ(0)'
            : 'translateX(1px) scale(1.001) translateZ(0)'
          : isFocused
            ? 'translateX(0.5px) scale(1.0005) translateZ(0)'
            : 'translateX(0) scale(1) translateZ(0)',
        willChange: 'transform, background-color, box-shadow',
        backfaceVisibility: 'hidden',
      }}
      className={`
        flex items-start font-mono text-sm leading-relaxed cursor-pointer
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        ${getLineTypeStyles(line.type)}
        ${getHighlightStyles()}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`${line.type} line ${line.lineNumber}: ${line.content?.substring(0, 50)}${line.content && line.content.length > 50 ? '...' : ''}`}
      aria-pressed={isHighlighted}
      data-line-number={line.lineNumber}
      data-line-type={line.type}
    >
      {/* Enhanced line number and type indicator */}
      <div className={`
        flex-shrink-0 w-16 px-2 py-1 text-xs border-r
        transition-all duration-300 ease-out
        ${isHighlighted 
          ? synchronizedHover
            ? 'text-blue-800 bg-blue-100 border-blue-300 font-semibold'
            : 'text-blue-700 bg-blue-50 border-blue-200'
          : isFocused
            ? 'text-indigo-700 bg-indigo-50 border-indigo-200'
            : 'text-gray-500 bg-gray-50 border-gray-300 hover:text-gray-700 hover:bg-gray-100'
        }
      `}>
        <span className="block text-center">
          {line.originalLineNumber || line.modifiedLineNumber || line.lineNumber}
        </span>
      </div>
      
      {/* Enhanced type indicator */}
      <div className={`
        flex-shrink-0 w-8 px-2 py-1 text-center font-bold
        transition-all duration-300 ease-out
        ${isHighlighted 
          ? synchronizedHover
            ? 'text-blue-800 scale-110'
            : 'text-blue-700 scale-105'
          : isFocused
            ? 'text-indigo-700'
            : ''
        }
      `}>
        {getLineTypeIcon(line.type)}
      </div>
      
      {/* Enhanced content with proper text overflow handling */}
      <div className={`
        flex-1 px-3 py-1 overflow-hidden
        transition-all duration-300 ease-out
        ${isHighlighted 
          ? synchronizedHover
            ? 'font-medium'
            : ''
          : ''
        }
      `}>
        <pre className="whitespace-pre-wrap break-words word-break-break-all m-0 font-inherit overflow-wrap-anywhere">
          {line.content || ' '}
        </pre>
      </div>

      {/* Synchronized hover indicator */}
      {isHighlighted && synchronizedHover && (
        <div className="flex-shrink-0 w-1 bg-blue-400 opacity-75 transition-opacity duration-300">
          <div className="w-full h-full bg-gradient-to-b from-blue-400 to-blue-500 animate-pulse"></div>
        </div>
      )}
    </div>
  );
});

DiffLine.displayName = 'DiffLine';

export default DiffLine;