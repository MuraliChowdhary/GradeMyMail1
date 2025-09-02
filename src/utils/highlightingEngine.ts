/**
 * Highlighting Engine for Newsletter Content Analysis
 * Provides smooth, performant highlighting with animations and tooltips
 */

import type {
  HighlightRange,
  HighlightPosition,
  HighlightingConfig,
  HighlightingEngine,
  HighlightingState,
  AnimationState,
} from '../types/highlighting';

import { DEFAULT_HIGHLIGHT_COLORS } from '../types/highlighting';

const DEFAULT_CONFIG: HighlightingConfig = {
  colors: DEFAULT_HIGHLIGHT_COLORS,
  animationDuration: 300,
  animationEasing: 'ease-out',
  showTooltips: true,
  maxTooltipWidth: 300,
};

export function createHighlightingEngine(
  canvas: HTMLCanvasElement,
  container: HTMLElement,
  config: Partial<HighlightingConfig> = {}
): HighlightingEngine {
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not get 2D context from canvas');
  }

  const fullConfig: HighlightingConfig = { ...DEFAULT_CONFIG, ...config };
  
  let state: HighlightingState = {
    ranges: [],
    visibleRanges: [],
    animation: {
      progress: 0,
      isAnimating: false,
      startTime: 0,
      duration: fullConfig.animationDuration,
    },
    hoveredRange: undefined,
  };

  let animationFrameId: number | null = null;
  let isVisible = true;

  /**
   * Update canvas size to match container
   */
  function updateCanvasSize(): void {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    
    ctx.scale(dpr, dpr);
  }

  /**
   * Get text positions for highlight ranges
   */
  function getTextPositions(ranges: HighlightRange[]): HighlightPosition[] {
    const positions: HighlightPosition[] = [];
    const containerRect = container.getBoundingClientRect();
    
    for (const range of ranges) {
      try {
        const textRange = document.createRange();
        const walker = document.createTreeWalker(
          container,
          NodeFilter.SHOW_TEXT,
          null,
          false
        );

        let currentPos = 0;
        let startNode: Node | null = null;
        let endNode: Node | null = null;
        let startOffset = 0;
        let endOffset = 0;

        // Find start and end nodes
        let node = walker.nextNode();
        while (node) {
          const nodeLength = node.textContent?.length || 0;
          
          if (!startNode && currentPos + nodeLength > range.start) {
            startNode = node;
            startOffset = range.start - currentPos;
          }
          
          if (!endNode && currentPos + nodeLength >= range.end) {
            endNode = node;
            endOffset = range.end - currentPos;
            break;
          }
          
          currentPos += nodeLength;
          node = walker.nextNode();
        }

        if (startNode && endNode) {
          textRange.setStart(startNode, startOffset);
          textRange.setEnd(endNode, endOffset);
          
          const rects = textRange.getClientRects();
          for (let i = 0; i < rects.length; i++) {
            const rect = rects[i];
            positions.push({
              x: rect.left - containerRect.left,
              y: rect.top - containerRect.top,
              width: rect.width,
              height: rect.height,
            });
          }
        }
      } catch (error) {
        console.warn('Error getting text position for range:', range, error);
      }
    }

    return positions;
  }

  /**
   * Draw highlight rectangles with smooth animations
   */
  function drawHighlights(): void {
    if (!isVisible || state.visibleRanges.length === 0) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const positions = getTextPositions(state.visibleRanges);
    const alpha = easeOut(state.animation.progress);

    for (let i = 0; i < state.visibleRanges.length; i++) {
      const range = state.visibleRanges[i];
      const position = positions[i];
      
      if (!position) continue;

      const colors = fullConfig.colors[range.type];
      if (!colors) continue;

      // Draw background highlight
      ctx.save();
      ctx.globalAlpha = colors.opacity * alpha;
      ctx.fillStyle = colors.background;
      ctx.fillRect(position.x, position.y, position.width, position.height);
      
      // Draw border if needed
      if (colors.border && range === state.hoveredRange) {
        ctx.globalAlpha = alpha;
        ctx.strokeStyle = colors.border;
        ctx.lineWidth = 1;
        ctx.strokeRect(position.x, position.y, position.width, position.height);
      }
      
      ctx.restore();
    }
  }

  /**
   * Easing function for smooth animations
   */
  function easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  /**
   * Animation loop
   */
  function animate(): void {
    if (!state.animation.isAnimating) return;

    const now = performance.now();
    const elapsed = now - state.animation.startTime;
    const progress = Math.min(elapsed / state.animation.duration, 1);

    state.animation.progress = progress;
    drawHighlights();

    if (progress >= 1) {
      state.animation.isAnimating = false;
      animationFrameId = null;
    } else {
      animationFrameId = requestAnimationFrame(animate);
    }
  }

  /**
   * Start animation
   */
  function startAnimation(): void {
    if (state.animation.isAnimating && animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }

    state.animation = {
      progress: 0,
      isAnimating: true,
      startTime: performance.now(),
      duration: fullConfig.animationDuration,
    };

    animationFrameId = requestAnimationFrame(animate);
  }

  /**
   * Update highlights with new ranges
   */
  function updateHighlights(ranges: HighlightRange[]): void {
    state.ranges = [...ranges];
    state.visibleRanges = isVisible ? ranges : [];
    
    if (ranges.length > 0 && isVisible) {
      startAnimation();
    } else {
      drawHighlights();
    }
  }

  /**
   * Clear all highlights
   */
  function clearHighlights(): void {
    state.ranges = [];
    state.visibleRanges = [];
    state.hoveredRange = undefined;
    
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
    
    state.animation.isAnimating = false;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  /**
   * Set visibility of highlights
   */
  function setVisibility(visible: boolean): void {
    isVisible = visible;
    state.visibleRanges = visible ? state.ranges : [];
    
    if (visible && state.ranges.length > 0) {
      startAnimation();
    } else {
      drawHighlights();
    }
  }

  /**
   * Handle mouse events for tooltips
   */
  function handleMouseMove(event: MouseEvent): void {
    if (!fullConfig.showTooltips || state.visibleRanges.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const positions = getTextPositions(state.visibleRanges);
    let hoveredRange: HighlightRange | undefined;

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      if (x >= pos.x && x <= pos.x + pos.width && 
          y >= pos.y && y <= pos.y + pos.height) {
        hoveredRange = state.visibleRanges[i];
        break;
      }
    }

    if (hoveredRange !== state.hoveredRange) {
      state.hoveredRange = hoveredRange;
      drawHighlights();
    }
  }

  /**
   * Cleanup resources
   */
  function destroy(): void {
    if (animationFrameId) {
      cancelAnimationFrame(animationFrameId);
    }
    
    canvas.removeEventListener('mousemove', handleMouseMove);
    clearHighlights();
  }

  // Initialize
  updateCanvasSize();
  canvas.addEventListener('mousemove', handleMouseMove);

  // Handle resize
  const resizeObserver = new ResizeObserver(() => {
    updateCanvasSize();
    drawHighlights();
  });
  resizeObserver.observe(container);

  return {
    updateHighlights,
    clearHighlights,
    setVisibility,
    destroy: () => {
      resizeObserver.disconnect();
      destroy();
    },
  };
}