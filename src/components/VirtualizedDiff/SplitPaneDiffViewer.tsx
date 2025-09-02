import React, { useState, useCallback, useMemo } from 'react';
import { Panel, PanelGroup, PanelResizeHandle } from 'react-resizable-panels';
import { FixedSizeList as List } from 'react-window';
import { DiffEngine } from '../../utils/diffEngine';
import { useHoverSynchronization } from '../../hooks/useHoverSynchronization';
import type { DiffViewerProps } from '../../types/diff';
import './DiffViewer.css';

interface SplitPaneContentProps {
  content: string;
  title: string;
  highlightedLine?: number | null;
  onLineHover?: (lineNumber: number | null, paneType?: 'original' | 'improved') => void;
  height: number;
  itemSize: number;
  paneType: 'original' | 'improved';
  focusedLine?: number | null;
  onKeyDown?: (event: React.KeyboardEvent) => void;
  onLineFocus?: (lineNumber: number | null) => void;
  synchronizedHover?: boolean;
}

interface ContentLineProps {
  index: number;
  style: React.CSSProperties;
  data: {
    lines: string[];
    highlightedLine: number | null;
    focusedLine: number | null;
    onLineHover: (lineNumber: number | null, paneType?: 'original' | 'improved') => void;
    onLineFocus: (lineNumber: number | null) => void;
    paneType: 'original' | 'improved';
    synchronizedHover: boolean;
  };
}

const ContentLine: React.FC<ContentLineProps> = ({ index, style, data }) => {
  const { lines, highlightedLine, focusedLine, onLineHover, onLineFocus, paneType, synchronizedHover } = data;
  const line = lines[index];
  const lineNumber = index + 1;
  const isHighlighted = highlightedLine === lineNumber;
  const isFocused = focusedLine === lineNumber;

  const handleMouseEnter = () => {
    onLineHover?.(lineNumber, paneType);
  };

  const handleMouseLeave = () => {
    onLineHover?.(null, paneType);
  };

  const handleFocus = () => {
    onLineFocus?.(lineNumber);
  };

  const handleBlur = () => {
    onLineFocus?.(null);
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    switch (event.key) {
      case 'ArrowUp':
        event.preventDefault();
        if (lineNumber > 1) {
          onLineFocus?.(lineNumber - 1);
          // Smooth focus transition to previous line
          setTimeout(() => {
            const currentElement = event.currentTarget as HTMLElement;
            const prevElement = currentElement.previousElementSibling as HTMLElement;
            prevElement?.focus();
          }, 50);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (lineNumber < lines.length) {
          onLineFocus?.(lineNumber + 1);
          // Smooth focus transition to next line
          setTimeout(() => {
            const currentElement = event.currentTarget as HTMLElement;
            const nextElement = currentElement.nextElementSibling as HTMLElement;
            nextElement?.focus();
          }, 50);
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        // Toggle highlight with enhanced feedback
        onLineHover?.(isHighlighted ? null : lineNumber, paneType);
        // Add visual feedback for selection with smooth animation
        const selectTarget = event.currentTarget as HTMLElement;
        selectTarget.style.transition = 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)';
        selectTarget.style.transform = 'scale(0.98) translateZ(0)';
        setTimeout(() => {
          selectTarget.style.transform = '';
          setTimeout(() => {
            selectTarget.style.transition = '';
          }, 150);
        }, 150);
        break;
      case 'Escape':
        event.preventDefault();
        onLineHover?.(null, paneType);
        onLineFocus?.(null);
        // Add visual feedback for clearing with smooth animation
        const clearTarget = event.currentTarget as HTMLElement;
        clearTarget.style.transition = 'opacity 0.2s ease-out, transform 0.2s ease-out';
        clearTarget.style.opacity = '0.7';
        clearTarget.style.transform = 'scale(0.99) translateZ(0)';
        setTimeout(() => {
          clearTarget.style.opacity = '';
          clearTarget.style.transform = '';
          setTimeout(() => {
            clearTarget.style.transition = '';
          }, 200);
        }, 200);
        break;
      case 'Home':
        event.preventDefault();
        onLineFocus?.(1);
        // Focus first line
        const homeCurrentElement = event.currentTarget as HTMLElement;
        const firstElement = homeCurrentElement.parentElement?.firstElementChild as HTMLElement;
        firstElement?.focus();
        break;
      case 'End':
        event.preventDefault();
        onLineFocus?.(lines.length);
        // Focus last line
        const endCurrentElement = event.currentTarget as HTMLElement;
        const lastElement = endCurrentElement.parentElement?.lastElementChild as HTMLElement;
        lastElement?.focus();
        break;
    }
  };

  // Enhanced styling with GPU acceleration and smooth transitions
  const getTransformStyle = () => {
    if (isHighlighted) {
      return synchronizedHover 
        ? 'translateX(8px) scale(1.005) translateZ(0) rotateX(1deg) perspective(1000px)' 
        : 'translateX(4px) scale(1.003) translateZ(0)';
    }
    if (isFocused) {
      return 'translateX(2px) scale(1.002) translateZ(0)';
    }
    return 'translateX(0) scale(1) translateZ(0)';
  };

  const getBackgroundStyle = () => {
    if (isHighlighted) {
      return synchronizedHover 
        ? 'bg-gradient-to-r from-blue-50 via-blue-100 via-blue-50 to-blue-100 ring-2 ring-blue-400 ring-opacity-80 shadow-xl backdrop-blur-sm border-l-4 border-blue-500' 
        : 'bg-gradient-to-r from-blue-50 to-blue-100 ring-2 ring-blue-300 ring-opacity-70 shadow-lg border-l-2 border-blue-400';
    }
    if (isFocused) {
      return 'bg-gradient-to-r from-indigo-50 to-indigo-100 ring-1 ring-indigo-300 shadow-md border-l-2 border-indigo-400';
    }
    return 'bg-white hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 hover:shadow-md hover:border-l-2 hover:border-gray-300';
  };

  const getGlowEffect = () => {
    if (isHighlighted && synchronizedHover) {
      return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-400/30 before:via-blue-300/20 before:to-blue-400/30 before:blur-md before:-z-10 after:absolute after:inset-0 after:bg-gradient-to-r after:from-transparent after:via-blue-200/10 after:to-transparent after:animate-pulse after:-z-10';
    }
    if (isHighlighted) {
      return 'before:absolute before:inset-0 before:bg-gradient-to-r before:from-blue-300/20 before:to-transparent before:blur-sm before:-z-10';
    }
    return '';
  };

  return (
    <div
      style={{
        ...style,
        transform: getTransformStyle(),
        willChange: 'transform, background-color, box-shadow, filter',
        backfaceVisibility: 'hidden', // Optimize for GPU acceleration
        perspective: '1000px',
        transformStyle: 'preserve-3d',
        zIndex: isHighlighted ? (synchronizedHover ? 20 : 15) : isFocused ? 10 : 1,
      }}
      className={`
        diff-line relative flex items-start font-mono text-sm leading-relaxed cursor-pointer
        transition-all duration-700 ease-out
        transform-gpu border-b border-gray-100
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50
        hover:transition-all hover:duration-300 hover:z-20
        ${getBackgroundStyle()}
        ${getGlowEffect()}
        ${isHighlighted && synchronizedHover ? 'synchronized-hover' : ''}
      `}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      role="button"
      tabIndex={0}
      aria-label={`Line ${lineNumber}: ${line?.substring(0, 50)}${line && line.length > 50 ? '...' : ''}`}
      aria-pressed={isHighlighted}
      aria-describedby={isHighlighted ? `line-${lineNumber}-description` : undefined}
      data-line-number={lineNumber}
    >
      {/* Line number with enhanced styling and micro-interactions */}
      <div className={`
        diff-line-number flex-shrink-0 w-12 px-2 py-1 text-xs text-center border-r
        transition-all duration-700 ease-out transform-gpu
        ${isHighlighted 
          ? synchronizedHover
            ? 'text-blue-900 bg-gradient-to-b from-blue-200 via-blue-250 to-blue-300 border-blue-500 font-bold shadow-inner scale-110 rotate-1'
            : 'text-blue-800 bg-gradient-to-b from-blue-100 to-blue-200 border-blue-400 font-semibold scale-105'
          : isFocused
            ? 'text-indigo-800 bg-gradient-to-b from-indigo-100 to-indigo-200 border-indigo-400 font-medium scale-102'
            : 'text-gray-500 bg-gradient-to-b from-gray-50 to-gray-100 border-gray-200 hover:text-gray-700 hover:bg-gradient-to-b hover:from-gray-100 hover:to-gray-200 hover:scale-102'
        }
      `}>
        <span className={`inline-block transition-all duration-500 transform-gpu ${
          isHighlighted && synchronizedHover 
            ? 'animate-pulse scale-110 font-extrabold rotate-1' 
            : isHighlighted 
              ? 'scale-105 font-bold'
              : isFocused
                ? 'scale-102 font-medium'
                : 'hover:scale-105 hover:font-medium'
        }`}>
          {lineNumber}
        </span>
      </div>
      
      {/* Content with enhanced micro-interactions and proper text overflow handling */}
      <div className={`
        diff-line-text flex-1 px-3 py-1 relative
        transition-all duration-700 ease-out
        ${isHighlighted 
          ? synchronizedHover
            ? 'text-blue-900 font-semibold tracking-wide z-10'
            : 'text-blue-900 font-medium z-5'
          : isFocused 
            ? 'text-indigo-900 font-medium z-5' 
            : 'text-gray-800 hover:text-gray-900 hover:font-medium hover:z-10'
        }
      `}>
        <pre className={`
          diff-line-content whitespace-pre-wrap break-words word-break-break-all m-0 font-inherit 
          transition-all duration-500 overflow-visible
          ${isHighlighted && synchronizedHover ? 'text-shadow-sm' : ''}
        `}>
          {line || ' '}
        </pre>
      </div>

      {/* Enhanced synchronized hover indicator with sophisticated animations */}
      {isHighlighted && synchronizedHover && (
        <div className="flex-shrink-0 w-3 bg-gradient-to-b from-blue-400 via-blue-500 to-blue-400 opacity-90 transition-all duration-500 transform scale-y-110 animate-pulse">
          <div className="w-full h-full bg-gradient-to-b from-blue-300 via-blue-400 to-blue-300 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-ping"></div>
            <div className="absolute inset-0 bg-gradient-to-t from-blue-200/50 via-transparent to-blue-200/50 animate-bounce"></div>
            <div className="w-full h-full bg-gradient-to-r from-transparent via-blue-100/20 to-transparent animate-pulse"></div>
          </div>
        </div>
      )}
      
      {/* Subtle indicator for regular highlight */}
      {isHighlighted && !synchronizedHover && (
        <div className="flex-shrink-0 w-1 bg-blue-400 opacity-60 transition-all duration-300">
          <div className="w-full h-full bg-gradient-to-b from-blue-300 to-blue-400"></div>
        </div>
      )}
    </div>
  );
};

const SplitPaneContent: React.FC<SplitPaneContentProps> = ({
  content,
  title,
  highlightedLine,
  onLineHover,
  onLineFocus,
  height,
  itemSize,
  paneType,
  focusedLine,
  synchronizedHover = true
}) => {
  const lines = useMemo(() => content.split(/\r?\n/), [content]);

  const listData = useMemo(() => ({
    lines,
    highlightedLine: highlightedLine ?? null,
    focusedLine: focusedLine ?? null,
    onLineHover: onLineHover || (() => {}),
    onLineFocus: onLineFocus || (() => {}),
    paneType,
    synchronizedHover
  }), [lines, highlightedLine, focusedLine, onLineHover, onLineFocus, paneType, synchronizedHover]);

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header with enhanced styling */}
      <div className="flex-shrink-0 px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-md font-semibold text-gray-800 flex items-center">
              {title}
              {paneType === 'original' && (
                <span className="ml-2 px-2 py-1 text-xs bg-gray-200 text-gray-600 rounded-full">
                  Original
                </span>
              )}
              {paneType === 'improved' && (
                <span className="ml-2 px-2 py-1 text-xs bg-green-200 text-green-700 rounded-full">
                  Improved
                </span>
              )}
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              {lines.length} lines
              {highlightedLine && (
                <span className="ml-2 text-blue-600 font-medium">
                  • Line {highlightedLine} highlighted
                </span>
              )}
            </p>
          </div>
          
          {/* Keyboard navigation hint */}
          <div className="text-xs text-gray-500 hidden md:block">
            <div>↑↓ Navigate • Enter/Space Select • Esc Clear</div>
          </div>
        </div>
      </div>

      {/* Content with enhanced accessibility and proper overflow handling */}
      <div 
        className="flex-1 overflow-y-auto focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-opacity-20 diff-pane-container"
        role="region"
        aria-label={`${title} content with ${lines.length} lines`}
        style={{ position: 'relative', isolation: 'isolate' }}
      >
        <List
          height={height - 80} // Account for header height
          width="100%"
          itemCount={lines.length}
          itemSize={itemSize}
          itemData={listData}
          style={{ overflowX: 'visible' }}
        >
          {ContentLine}
        </List>
      </div>
    </div>
  );
};

interface SplitPaneDiffViewerProps extends DiffViewerProps {
  showUnifiedDiff?: boolean;
}

const SplitPaneDiffViewer: React.FC<SplitPaneDiffViewerProps> = ({
  originalContent,
  modifiedContent,
  height = 600,
  itemSize = 40,
  onLineHover,
  highlightedLine,
  className = '',
  showUnifiedDiff = false
}) => {
  const [viewMode, setViewMode] = useState<'split' | 'unified'>(showUnifiedDiff ? 'unified' : 'split');
  
  // Enhanced hover synchronization with the new hook
  const [hoverState, hoverActions] = useHoverSynchronization({
    initialSyncEnabled: true,
    animationDuration: 300,
    debounceDelay: 50,
    onHoverChange: onLineHover
  });

  // Use external or internal highlighted line
  const currentHighlightedLine = highlightedLine ?? hoverState.hoveredLine;

  // Enhanced line hover handler with synchronized highlighting
  const handleLineHover = useCallback((lineNumber: number | null, paneType?: 'original' | 'improved') => {
    hoverActions.setHoveredLine(lineNumber, paneType);
    onLineHover?.(lineNumber);
  }, [hoverActions, onLineHover]);

  // Enhanced line focus handler for keyboard navigation
  const handleLineFocus = useCallback((lineNumber: number | null) => {
    hoverActions.setFocusedLine(lineNumber);
  }, [hoverActions]);

  // Get hover source for enhanced visual feedback
  const hoverSource = hoverState.hoverSource;
  const focusedLine = hoverState.focusedLine;
  const synchronizedHover = hoverState.synchronizedHover;

  // Generate diff statistics
  const diffStats = useMemo(() => {
    const diffData = DiffEngine.generateDiff(originalContent, modifiedContent);
    return {
      added: diffData.addedLines,
      removed: diffData.removedLines,
      modified: diffData.modifiedLines,
      total: diffData.totalLines
    };
  }, [originalContent, modifiedContent]);

  if (viewMode === 'unified') {
    // Import the unified diff viewer
    const VirtualizedDiffViewer = React.lazy(() => import('./VirtualizedDiffViewer'));
    
    return (
      <div className={`flex flex-col ${className}`}>
        {/* Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setViewMode('split')}
              className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50"
            >
              Split View
            </button>
            <button
              onClick={() => setViewMode('unified')}
              className="px-3 py-1 text-sm bg-blue-500 text-white rounded"
            >
              Unified View
            </button>
          </div>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-green-600">+{diffStats.added}</span>
            <span className="text-red-600">-{diffStats.removed}</span>
            <span className="text-yellow-600">~{diffStats.modified}</span>
          </div>
        </div>

        <React.Suspense fallback={<div className="flex items-center justify-center h-32">Loading...</div>}>
          <VirtualizedDiffViewer
            originalContent={originalContent}
            modifiedContent={modifiedContent}
            height={height - 60}
            itemSize={itemSize}
            onLineHover={handleLineHover}
            highlightedLine={currentHighlightedLine}
          />
        </React.Suspense>
      </div>
    );
  }

  return (
    <div className={`flex flex-col border rounded-lg shadow-sm bg-white ${className}`}>
      {/* Enhanced Controls */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b rounded-t-lg">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setViewMode('split')}
            className="px-3 py-1 text-sm bg-blue-500 text-white rounded transition-all duration-200 hover:bg-blue-600 focus:ring-2 focus:ring-blue-300"
          >
            Split View
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className="px-3 py-1 text-sm bg-white border rounded hover:bg-gray-50 transition-all duration-200 focus:ring-2 focus:ring-gray-300"
          >
            Unified View
          </button>
          
          {/* Enhanced Synchronization toggle */}
          <div className="flex items-center space-x-2 ml-4">
            <label className="flex items-center space-x-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={hoverState.synchronizedHover}
                onChange={(e) => hoverActions.setSynchronizedHover(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span>Enhanced Sync</span>
            </label>
            {hoverState.isAnimating && (
              <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Hover status indicator */}
          {currentHighlightedLine && (
            <div className="flex items-center space-x-2 text-sm">
              <div className={`w-2 h-2 rounded-full ${
                hoverSource === 'original' ? 'bg-blue-400' : 
                hoverSource === 'improved' ? 'bg-green-400' : 'bg-gray-400'
              } animate-pulse`}></div>
              <span className="text-gray-600">
                Line {currentHighlightedLine} 
                {hoverSource && ` (${hoverSource})`}
              </span>
            </div>
          )}
          
          {/* Diff statistics */}
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-green-600 flex items-center">
              <span className="w-2 h-2 bg-green-400 rounded-full mr-1"></span>
              +{diffStats.added}
            </span>
            <span className="text-red-600 flex items-center">
              <span className="w-2 h-2 bg-red-400 rounded-full mr-1"></span>
              -{diffStats.removed}
            </span>
            <span className="text-yellow-600 flex items-center">
              <span className="w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>
              ~{diffStats.modified}
            </span>
          </div>
        </div>
      </div>

      {/* Split pane content with enhanced synchronization */}
      <div style={{ height: height - 60 }}>
        <PanelGroup direction="horizontal">
          {/* Original content pane */}
          <Panel defaultSize={50} minSize={20}>
            <SplitPaneContent
              content={originalContent}
              title="Original"
              highlightedLine={currentHighlightedLine}
              focusedLine={focusedLine}
              onLineHover={handleLineHover}
              onLineFocus={handleLineFocus}
              height={height - 60}
              itemSize={itemSize}
              paneType="original"
              synchronizedHover={synchronizedHover}
            />
          </Panel>

          {/* Enhanced resize handle */}
          <PanelResizeHandle className="w-2 bg-gray-200 hover:bg-blue-300 transition-all duration-200 cursor-col-resize relative group">
            <div className="absolute inset-y-0 left-1/2 transform -translate-x-1/2 w-1 bg-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
          </PanelResizeHandle>

          {/* Modified content pane */}
          <Panel defaultSize={50} minSize={20}>
            <SplitPaneContent
              content={modifiedContent}
              title="Improved"
              highlightedLine={currentHighlightedLine}
              focusedLine={focusedLine}
              onLineHover={handleLineHover}
              onLineFocus={handleLineFocus}
              height={height - 60}
              itemSize={itemSize}
              paneType="improved"
              synchronizedHover={synchronizedHover}
            />
          </Panel>
        </PanelGroup>
      </div>
    </div>
  );
};

export default SplitPaneDiffViewer;