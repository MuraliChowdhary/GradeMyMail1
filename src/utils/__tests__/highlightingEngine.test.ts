import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createHighlightingEngine } from '../highlightingEngine';
import type { HighlightRange, HighlightingEngine } from '../../types/highlighting';

// Mock canvas and DOM APIs
const mockCanvas = {
  getContext: vi.fn(() => ({
    clearRect: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    quadraticCurveTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    scale: vi.fn(),
    measureText: vi.fn(() => ({ width: 100 })),
  })),
  width: 800,
  height: 600,
  style: {},
} as unknown as HTMLCanvasElement;

const mockContainer = {
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
  textContent: 'Sample text content for testing',
} as unknown as HTMLElement;

// Mock DOM APIs
Object.defineProperty(window, 'getComputedStyle', {
  value: vi.fn(() => ({
    fontSize: '16px',
    fontFamily: 'Arial',
    lineHeight: '24px',
  })),
});

Object.defineProperty(document, 'createRange', {
  value: vi.fn(() => ({
    setStart: vi.fn(),
    setEnd: vi.fn(),
    getBoundingClientRect: vi.fn(() => ({
      left: 10,
      top: 20,
      width: 100,
      height: 24,
    })),
    detach: vi.fn(),
  })),
});

Object.defineProperty(document, 'createTreeWalker', {
  value: vi.fn(() => ({
    nextNode: vi.fn()
      .mockReturnValueOnce({ textContent: 'Sample text' })
      .mockReturnValueOnce({ textContent: ' content for' })
      .mockReturnValueOnce({ textContent: ' testing' })
      .mockReturnValue(null),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock requestAnimationFrame
global.requestAnimationFrame = vi.fn((cb) => {
  setTimeout(cb, 16);
  return 1;
});

global.cancelAnimationFrame = vi.fn();

describe('HighlightingEngine', () => {
  let engine: HighlightingEngine;
  
  beforeEach(() => {
    vi.clearAllMocks();
    engine = createHighlightingEngine(mockCanvas, mockContainer);
  });

  afterEach(() => {
    engine.destroy();
  });

  describe('Initialization', () => {
    it('should create engine with default configuration', () => {
      expect(engine).toBeDefined();
      expect(engine.getState).toBeDefined();
      expect(engine.updateHighlights).toBeDefined();
      expect(engine.clearHighlights).toBeDefined();
      expect(engine.setVisibility).toBeDefined();
      expect(engine.destroy).toBeDefined();
    });

    it('should initialize with empty state', () => {
      const state = engine.getState();
      
      expect(state.highlights).toEqual([]);
      expect(state.animationState.progress).toBe(0);
      expect(state.animationState.isAnimating).toBe(false);
      expect(state.isVisible).toBe(true);
      expect(state.textContent).toBe('');
    });
  });

  describe('Highlight Updates', () => {
    const sampleRanges: HighlightRange[] = [
      {
        start: 0,
        end: 6,
        type: 'fluff',
        severity: 'low',
        text: 'Sample',
        id: 'fluff_0_6',
      },
      {
        start: 7,
        end: 11,
        type: 'spam_words',
        severity: 'medium',
        text: 'text',
        id: 'spam_words_7_11',
      },
      {
        start: 12,
        end: 19,
        type: 'hard_to_read',
        severity: 'high',
        text: 'content',
        id: 'hard_to_read_12_19',
      },
    ];

    it('should update highlights with provided ranges', () => {
      engine.updateHighlights(sampleRanges, 'Sample text content for testing');
      
      const state = engine.getState();
      expect(state.textContent).toBe('Sample text content for testing');
      expect(state.animationState.isAnimating).toBe(true);
      expect(state.highlights.length).toBeGreaterThan(0);
    });

    it('should start animation when highlights are updated', () => {
      engine.updateHighlights(sampleRanges, 'Sample text content');
      
      const state = engine.getState();
      expect(state.animationState.isAnimating).toBe(true);
      expect(state.animationState.progress).toBe(0);
      expect(state.animationState.startTime).toBeGreaterThan(0);
    });

    it('should handle empty ranges', () => {
      engine.updateHighlights([], 'Sample text content');
      
      const state = engine.getState();
      expect(state.highlights).toEqual([]);
      expect(state.textContent).toBe('Sample text content');
    });
  });

  describe('Visibility Control', () => {
    it('should set visibility to true by default', () => {
      const state = engine.getState();
      expect(state.isVisible).toBe(true);
    });

    it('should update visibility when setVisibility is called', () => {
      engine.setVisibility(false);
      
      const state = engine.getState();
      expect(state.isVisible).toBe(false);
    });

    it('should toggle visibility correctly', () => {
      engine.setVisibility(false);
      expect(engine.getState().isVisible).toBe(false);
      
      engine.setVisibility(true);
      expect(engine.getState().isVisible).toBe(true);
    });
  });

  describe('Clear Highlights', () => {
    it('should clear all highlights and reset state', () => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      // First add some highlights
      engine.updateHighlights(sampleRanges, 'Sample text');
      expect(engine.getState().highlights.length).toBeGreaterThan(0);
      
      // Then clear them
      engine.clearHighlights();
      
      const state = engine.getState();
      expect(state.highlights).toEqual([]);
      expect(state.animationState.progress).toBe(0);
      expect(state.animationState.isAnimating).toBe(false);
      expect(state.textContent).toBe('');
    });

    it('should cancel ongoing animation when clearing', () => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      engine.updateHighlights(sampleRanges, 'Sample text');
      expect(engine.getState().animationState.isAnimating).toBe(true);
      
      engine.clearHighlights();
      expect(engine.getState().animationState.isAnimating).toBe(false);
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });
  });

  describe('Animation System', () => {
    it('should progress animation over time', (done) => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      engine.updateHighlights(sampleRanges, 'Sample text');
      
      // Check initial state
      expect(engine.getState().animationState.isAnimating).toBe(true);
      expect(engine.getState().animationState.progress).toBe(0);
      
      // Wait for animation to progress
      setTimeout(() => {
        const state = engine.getState();
        // Animation should have progressed or completed
        expect(state.animationState.progress).toBeGreaterThanOrEqual(0);
        done();
      }, 50);
    });

    it('should complete animation and stop animating', (done) => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      // Use short animation duration for testing
      const shortDurationEngine = createHighlightingEngine(mockCanvas, mockContainer, {
        animationDuration: 50, // 50ms for quick testing
      });

      shortDurationEngine.updateHighlights(sampleRanges, 'Sample text');
      
      // Wait for animation to complete
      setTimeout(() => {
        const state = shortDurationEngine.getState();
        expect(state.animationState.isAnimating).toBe(false);
        expect(state.animationState.progress).toBe(1);
        
        shortDurationEngine.destroy();
        done();
      }, 100);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid ranges gracefully', () => {
      const invalidRanges: HighlightRange[] = [
        {
          start: -1,
          end: -1,
          type: 'fluff',
          severity: 'low',
          text: '',
          id: 'invalid',
        },
      ];

      expect(() => {
        engine.updateHighlights(invalidRanges, 'Sample text');
      }).not.toThrow();
    });

    it('should handle empty text content', () => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      expect(() => {
        engine.updateHighlights(sampleRanges, '');
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should handle large number of highlights', () => {
      const manyRanges: HighlightRange[] = Array.from({ length: 100 }, (_, i) => ({
        start: i * 10,
        end: i * 10 + 5,
        type: 'fluff' as const,
        severity: 'low' as const,
        text: `text${i}`,
        id: `fluff_${i}`,
      }));

      const startTime = performance.now();
      engine.updateHighlights(manyRanges, 'Sample text content'.repeat(100));
      const endTime = performance.now();

      // Should complete within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
    });

    it('should reuse canvas context efficiently', () => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      // Update highlights multiple times
      engine.updateHighlights(sampleRanges, 'Sample text 1');
      engine.updateHighlights(sampleRanges, 'Sample text 2');
      engine.updateHighlights(sampleRanges, 'Sample text 3');

      // Canvas context should be reused, not recreated
      expect(mockCanvas.getContext).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cleanup', () => {
    it('should cleanup resources when destroyed', () => {
      const sampleRanges: HighlightRange[] = [
        {
          start: 0,
          end: 6,
          type: 'fluff',
          severity: 'low',
          text: 'Sample',
          id: 'fluff_0_6',
        },
      ];

      engine.updateHighlights(sampleRanges, 'Sample text');
      expect(engine.getState().animationState.isAnimating).toBe(true);
      
      engine.destroy();
      
      // Should cancel animation frame
      expect(cancelAnimationFrame).toHaveBeenCalled();
    });

    it('should disconnect resize observer on destroy', () => {
      const disconnectSpy = vi.fn();
      (global.ResizeObserver as any).mockImplementation(() => ({
        observe: vi.fn(),
        disconnect: disconnectSpy,
      }));

      const testEngine = createHighlightingEngine(mockCanvas, mockContainer);
      testEngine.destroy();
      
      expect(disconnectSpy).toHaveBeenCalled();
    });
  });
});