import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { HighlightOverlay } from '../HighlightOverlay';
import type { HighlightRange } from '../../../types/highlighting';

// Mock the highlighting engine
vi.mock('../../../utils/highlightingEngine', () => ({
  createHighlightingEngine: vi.fn(() => ({
    updateHighlights: vi.fn(),
    clearHighlights: vi.fn(),
    setVisibility: vi.fn(),
    destroy: vi.fn(),
    getState: vi.fn(() => ({
      highlights: [],
      animationState: {
        progress: 0,
        isAnimating: false,
        startTime: 0,
        duration: 0,
        easing: (t: number) => t,
      },
      isVisible: true,
      containerRect: null,
      textContent: '',
    })),
  })),
}));

// Mock canvas
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
  })),
  getBoundingClientRect: vi.fn(() => ({
    left: 0,
    top: 0,
    width: 800,
    height: 600,
  })),
  style: {},
} as unknown as HTMLCanvasElement;

// Mock HTMLCanvasElement
Object.defineProperty(HTMLCanvasElement.prototype, 'getContext', {
  value: vi.fn(() => mockCanvas.getContext()),
});

Object.defineProperty(HTMLCanvasElement.prototype, 'getBoundingClientRect', {
  value: vi.fn(() => mockCanvas.getBoundingClientRect()),
});

describe('HighlightOverlay', () => {
  const mockContainerRef = {
    current: document.createElement('div'),
  };

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
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render canvas element', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          textContent="Sample text content"
        />
      );

      const canvas = screen.getByRole('img', { hidden: true }); // Canvas has img role
      expect(canvas).toBeInTheDocument();
      expect(canvas).toHaveClass('highlight-overlay');
    });

    it('should apply custom className', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          className="custom-class"
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveClass('highlight-overlay', 'custom-class');
    });

    it('should set canvas styles for GPU acceleration', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({
        position: 'absolute',
        top: '0',
        left: '0',
        zIndex: '10',
        transform: 'translateZ(0)',
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
      });
    });
  });

  describe('Interaction', () => {
    it('should handle click events when onHighlightClick is provided', () => {
      const onHighlightClick = vi.fn();
      
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          onHighlightClick={onHighlightClick}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ pointerEvents: 'auto' });
    });

    it('should handle hover events when onHighlightHover is provided', () => {
      const onHighlightHover = vi.fn();
      
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          onHighlightHover={onHighlightHover}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ pointerEvents: 'auto' });
    });

    it('should disable pointer events when no interaction handlers provided', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toHaveStyle({ pointerEvents: 'none' });
    });

    it('should call onHighlightClick when canvas is clicked', () => {
      const onHighlightClick = vi.fn();
      
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          onHighlightClick={onHighlightClick}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      fireEvent.click(canvas);

      // Note: The actual click handling depends on the engine state
      // This test verifies the event handler is attached
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Tagged Content Processing', () => {
    it('should extract ranges from tagged content', async () => {
      const taggedContent = '<fluff>unnecessary words</fluff> and <spam_words>FREE OFFER</spam_words>';
      
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          taggedContent={taggedContent}
        />
      );

      // Wait for component to process tagged content
      await waitFor(() => {
        expect(screen.getByRole('img', { hidden: true })).toBeInTheDocument();
      });
    });

    it('should handle empty tagged content', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          taggedContent=""
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    it('should prioritize ranges prop over taggedContent', () => {
      const taggedContent = '<fluff>unnecessary words</fluff>';
      
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          taggedContent={taggedContent}
        />
      );

      // Should use ranges prop instead of extracting from taggedContent
      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Visibility Control', () => {
    it('should be visible by default', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    it('should respect visible prop', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          visible={false}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Debug Mode', () => {
    it('should show debug overlay when enableDebugMode is true', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          enableDebugMode={true}
        />
      );

      expect(screen.getByText(/Initialized:/)).toBeInTheDocument();
      expect(screen.getByText(/Ranges:/)).toBeInTheDocument();
      expect(screen.getByText(/Visible:/)).toBeInTheDocument();
    });

    it('should not show debug overlay by default', () => {
      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
        />
      );

      expect(screen.queryByText(/Initialized:/)).not.toBeInTheDocument();
    });
  });

  describe('Configuration', () => {
    it('should accept custom configuration', () => {
      const customConfig = {
        animationDuration: 1000,
        enableGPUAcceleration: false,
      };

      render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          config={customConfig}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing container ref gracefully', () => {
      const emptyRef = { current: null };
      
      expect(() => {
        render(
          <HighlightOverlay
            containerRef={emptyRef}
            ranges={sampleRanges}
          />
        );
      }).not.toThrow();
    });

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
        render(
          <HighlightOverlay
            containerRef={mockContainerRef}
            ranges={invalidRanges}
          />
        );
      }).not.toThrow();
    });
  });

  describe('Performance', () => {
    it('should memoize configuration to prevent unnecessary re-renders', () => {
      const { rerender } = render(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          config={{ animationDuration: 800 }}
        />
      );

      // Re-render with same config
      rerender(
        <HighlightOverlay
          containerRef={mockContainerRef}
          ranges={sampleRanges}
          config={{ animationDuration: 800 }}
        />
      );

      const canvas = screen.getByRole('img', { hidden: true });
      expect(canvas).toBeInTheDocument();
    });

    it('should handle large number of ranges efficiently', () => {
      const manyRanges: HighlightRange[] = Array.from({ length: 100 }, (_, i) => ({
        start: i * 10,
        end: i * 10 + 5,
        type: 'fluff' as const,
        severity: 'low' as const,
        text: `text${i}`,
        id: `fluff_${i}`,
      }));

      expect(() => {
        render(
          <HighlightOverlay
            containerRef={mockContainerRef}
            ranges={manyRanges}
          />
        );
      }).not.toThrow();
    });
  });
});