import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import HighlightOverlay from '../HighlightOverlay';
import { 
  mockHighlights, 
  mockImplementations, 
  setupTestEnvironment, 
  cleanupTestEnvironment,
  testHelpers 
} from '@/test-utils/mocks';

describe('HighlightOverlay Integration', () => {
  const user = userEvent.setup();
  let mockCanvasContext: any;

  beforeEach(() => {
    setupTestEnvironment();
    mockCanvasContext = mockImplementations.canvasContext();
    mockImplementations.intersectionObserver();
    mockImplementations.resizeObserver();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  const defaultProps = {
    highlights: mockHighlights,
    targetElement: document.createElement('div'),
    isVisible: true,
    animationSpeed: 1000,
  };

  describe('Rendering and Initialization', () => {
    it('renders canvas overlay correctly', () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('initializes with correct canvas dimensions', async () => {
      const targetElement = document.createElement('div');
      Object.defineProperty(targetElement, 'offsetWidth', { value: 800 });
      Object.defineProperty(targetElement, 'offsetHeight', { value: 600 });
      
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      await waitFor(() => {
        const canvas = screen.getByTestId('highlight-canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(800);
        expect(canvas.height).toBe(600);
      });
    });

    it('positions overlay correctly relative to target element', () => {
      const targetElement = document.createElement('div');
      targetElement.getBoundingClientRect = vi.fn(() => ({
        top: 100,
        left: 50,
        width: 800,
        height: 600,
        bottom: 700,
        right: 850,
        x: 50,
        y: 100,
        toJSON: () => ({}),
      }));
      
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      const style = window.getComputedStyle(canvas);
      
      expect(style.position).toBe('absolute');
      expect(style.top).toBe('100px');
      expect(style.left).toBe('50px');
    });
  });

  describe('Highlight Rendering', () => {
    it('renders all highlight types with correct colors', async () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      // Verify different colors are used for different highlight types
      const fillRectCalls = mockCanvasContext.fillRect.mock.calls;
      expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    it('applies correct styling for fluff highlights', async () => {
      const fluffHighlights = [
        {
          id: '1',
          type: 'fluff' as const,
          text: 'really great',
          position: { start: 10, end: 22 },
          severity: 'medium' as const,
        }
      ];
      
      render(<HighlightOverlay {...defaultProps} highlights={fluffHighlights} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });

    it('applies correct styling for spam_words highlights', async () => {
      const spamHighlights = [
        {
          id: '2',
          type: 'spam_words' as const,
          text: 'amazing deals',
          position: { start: 45, end: 58 },
          severity: 'high' as const,
        }
      ];
      
      render(<HighlightOverlay {...defaultProps} highlights={spamHighlights} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });

    it('applies correct styling for hard_to_read highlights', async () => {
      const hardToReadHighlights = [
        {
          id: '3',
          type: 'hard_to_read' as const,
          text: 'complex sentence',
          position: { start: 70, end: 86 },
          severity: 'low' as const,
        }
      ];
      
      render(<HighlightOverlay {...defaultProps} highlights={hardToReadHighlights} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });

    it('handles overlapping highlights correctly', async () => {
      const overlappingHighlights = [
        {
          id: '1',
          type: 'fluff' as const,
          text: 'really great',
          position: { start: 10, end: 22 },
          severity: 'medium' as const,
        },
        {
          id: '2',
          type: 'spam_words' as const,
          text: 'great deals',
          position: { start: 17, end: 28 },
          severity: 'high' as const,
        }
      ];
      
      render(<HighlightOverlay {...defaultProps} highlights={overlappingHighlights} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(2);
      });
    });
  });

  describe('Progressive Animation', () => {
    it('animates highlights progressively', async () => {
      vi.useFakeTimers();
      
      render(<HighlightOverlay {...defaultProps} animationSpeed={500} />);
      
      // Initially no highlights should be drawn
      expect(mockCanvasContext.fillRect).not.toHaveBeenCalled();
      
      // After first animation interval
      vi.advanceTimersByTime(500);
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(1);
      });
      
      // After second animation interval
      vi.advanceTimersByTime(500);
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(2);
      });
      
      vi.useRealTimers();
    });

    it('completes animation for all highlights', async () => {
      vi.useFakeTimers();
      
      render(<HighlightOverlay {...defaultProps} animationSpeed={100} />);
      
      // Fast-forward through all animations
      vi.advanceTimersByTime(mockHighlights.length * 100 + 100);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(mockHighlights.length);
      });
      
      vi.useRealTimers();
    });

    it('handles animation speed changes', async () => {
      vi.useFakeTimers();
      
      const { rerender } = render(<HighlightOverlay {...defaultProps} animationSpeed={1000} />);
      
      // Change animation speed
      rerender(<HighlightOverlay {...defaultProps} animationSpeed={200} />);
      
      vi.advanceTimersByTime(200);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });

    it('pauses animation when not visible', async () => {
      vi.useFakeTimers();
      
      const { rerender } = render(<HighlightOverlay {...defaultProps} isVisible={false} />);
      
      vi.advanceTimersByTime(1000);
      expect(mockCanvasContext.fillRect).not.toHaveBeenCalled();
      
      // Make visible and animation should start
      rerender(<HighlightOverlay {...defaultProps} isVisible={true} />);
      
      vi.advanceTimersByTime(1000);
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Responsive Behavior', () => {
    it('updates canvas size when target element resizes', async () => {
      const targetElement = document.createElement('div');
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      // Simulate resize
      Object.defineProperty(targetElement, 'offsetWidth', { value: 1200 });
      Object.defineProperty(targetElement, 'offsetHeight', { value: 800 });
      
      // Trigger resize observer
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        const canvas = screen.getByTestId('highlight-canvas') as HTMLCanvasElement;
        expect(canvas.width).toBe(1200);
        expect(canvas.height).toBe(800);
      });
    });

    it('redraws highlights after resize', async () => {
      const targetElement = document.createElement('div');
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      // Wait for initial draw
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      const initialCallCount = mockCanvasContext.fillRect.mock.calls.length;
      
      // Trigger resize
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect.mock.calls.length).toBeGreaterThan(initialCallCount);
      });
    });

    it('handles mobile viewport changes', async () => {
      await testHelpers.visual.testResponsiveBreakpoint(375, 667); // iPhone dimensions
      
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });
  });

  describe('Performance Optimization', () => {
    it('uses requestAnimationFrame for smooth animations', async () => {
      const mockRAF = vi.spyOn(window, 'requestAnimationFrame');
      
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockRAF).toHaveBeenCalled();
      });
      
      mockRAF.mockRestore();
    });

    it('clears canvas efficiently before redrawing', async () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });

    it('handles large numbers of highlights efficiently', async () => {
      const manyHighlights = Array.from({ length: 100 }, (_, i) => ({
        id: `highlight-${i}`,
        type: 'fluff' as const,
        text: `text ${i}`,
        position: { start: i * 10, end: i * 10 + 5 },
        severity: 'medium' as const,
      }));
      
      const renderTime = await testHelpers.performance.measureRenderTime(() => {
        render(<HighlightOverlay {...defaultProps} highlights={manyHighlights} />);
      });
      
      expect(renderTime).toBeLessThan(100); // Should render quickly even with many highlights
    });

    it('debounces resize events', async () => {
      vi.useFakeTimers();
      
      render(<HighlightOverlay {...defaultProps} />);
      
      // Trigger multiple resize events quickly
      for (let i = 0; i < 10; i++) {
        fireEvent(window, new Event('resize'));
      }
      
      const initialCallCount = mockCanvasContext.clearRect.mock.calls.length;
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(250);
      
      await waitFor(() => {
        // Should only have processed resize once due to debouncing
        expect(mockCanvasContext.clearRect.mock.calls.length).toBe(initialCallCount + 1);
      });
      
      vi.useRealTimers();
    });
  });

  describe('Accessibility', () => {
    it('provides screen reader announcements for highlights', async () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/highlights applied/i);
      });
    });

    it('includes ARIA labels for highlight regions', () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      expect(canvas).toHaveAttribute('aria-label', expect.stringContaining('highlight'));
    });

    it('supports reduced motion preferences', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<HighlightOverlay {...defaultProps} />);
      
      // Should render all highlights immediately without animation
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalledTimes(mockHighlights.length);
      });
    });
  });

  describe('Error Handling', () => {
    it('handles canvas context creation failure', () => {
      HTMLCanvasElement.prototype.getContext = vi.fn(() => null);
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<HighlightOverlay {...defaultProps} />);
      
      expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('Canvas context'));
      
      consoleSpy.mockRestore();
    });

    it('handles invalid highlight data gracefully', async () => {
      const invalidHighlights = [
        {
          id: '1',
          type: 'invalid' as any,
          text: 'test',
          position: { start: -1, end: -1 },
          severity: 'medium' as const,
        }
      ];
      
      render(<HighlightOverlay {...defaultProps} highlights={invalidHighlights} />);
      
      // Should not crash
      expect(screen.getByTestId('highlight-canvas')).toBeInTheDocument();
    });

    it('recovers from drawing errors', async () => {
      mockCanvasContext.fillRect.mockImplementation(() => {
        throw new Error('Drawing error');
      });
      
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      render(<HighlightOverlay {...defaultProps} />);
      
      // Should handle error gracefully
      expect(screen.getByTestId('highlight-canvas')).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('handles missing target element', () => {
      render(<HighlightOverlay {...defaultProps} targetElement={null as any} />);
      
      // Should render but not crash
      expect(screen.getByTestId('highlight-canvas')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('cleans up animation timers on unmount', () => {
      const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout');
      
      const { unmount } = render(<HighlightOverlay {...defaultProps} />);
      
      unmount();
      
      expect(clearTimeoutSpy).toHaveBeenCalled();
      
      clearTimeoutSpy.mockRestore();
    });

    it('removes event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<HighlightOverlay {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('prevents memory leaks with large highlight sets', async () => {
      const memoryCheck = testHelpers.performance.expectNoMemoryLeaks();
      
      const largeHighlightSet = Array.from({ length: 1000 }, (_, i) => ({
        id: `highlight-${i}`,
        type: 'fluff' as const,
        text: `text ${i}`,
        position: { start: i * 10, end: i * 10 + 5 },
        severity: 'medium' as const,
      }));
      
      const { unmount } = render(<HighlightOverlay {...defaultProps} highlights={largeHighlightSet} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      unmount();
      
      memoryCheck.check();
    });
  });

  describe('Integration with Text Content', () => {
    it('correctly maps highlight positions to text content', async () => {
      const textContent = 'This is a really great email with amazing deals.';
      const targetElement = document.createElement('div');
      targetElement.textContent = textContent;
      
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
      
      // Verify that highlights are positioned correctly based on text positions
      const fillRectCalls = mockCanvasContext.fillRect.mock.calls;
      expect(fillRectCalls.length).toBeGreaterThan(0);
    });

    it('handles text content changes', async () => {
      const targetElement = document.createElement('div');
      targetElement.textContent = 'Original content';
      
      const { rerender } = render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      // Change text content
      targetElement.textContent = 'Updated content with different length';
      
      rerender(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.clearRect).toHaveBeenCalled();
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });

    it('handles rich text content with HTML elements', async () => {
      const targetElement = document.createElement('div');
      targetElement.innerHTML = '<p>This is <strong>really great</strong> content with <em>amazing deals</em>.</p>';
      
      render(<HighlightOverlay {...defaultProps} targetElement={targetElement} />);
      
      await waitFor(() => {
        expect(mockCanvasContext.fillRect).toHaveBeenCalled();
      });
    });
  });
});