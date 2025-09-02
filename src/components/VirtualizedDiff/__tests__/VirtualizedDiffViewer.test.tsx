import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import VirtualizedDiffViewer from '../VirtualizedDiffViewer';
import { 
  mockImplementations, 
  setupTestEnvironment, 
  cleanupTestEnvironment,
  testHelpers 
} from '@/test-utils/mocks';

// Mock react-window
vi.mock('react-window', () => ({
  FixedSizeList: ({ children, itemCount, itemSize, height, width }: any) => (
    <div 
      data-testid="virtualized-list"
      style={{ height, width }}
    >
      {Array.from({ length: Math.min(itemCount, 10) }, (_, index) => 
        children({ index, style: { height: itemSize } })
      )}
    </div>
  ),
}));

describe('VirtualizedDiffViewer', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    setupTestEnvironment();
    mockImplementations.resizeObserver();
    mockImplementations.intersectionObserver();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  const mockDiffData = [
    {
      type: 'unchanged' as const,
      content: 'This is unchanged content.',
      lineNumber: 1,
      originalLineNumber: 1,
      improvedLineNumber: 1,
    },
    {
      type: 'removed' as const,
      content: 'This line was removed.',
      lineNumber: 2,
      originalLineNumber: 2,
      improvedLineNumber: null,
    },
    {
      type: 'added' as const,
      content: 'This line was added.',
      lineNumber: 3,
      originalLineNumber: null,
      improvedLineNumber: 2,
    },
    {
      type: 'unchanged' as const,
      content: 'Another unchanged line.',
      lineNumber: 4,
      originalLineNumber: 3,
      improvedLineNumber: 3,
    },
  ];

  const defaultProps = {
    originalContent: 'This is unchanged content.\nThis line was removed.\nAnother unchanged line.',
    improvedContent: 'This is unchanged content.\nThis line was added.\nAnother unchanged line.',
    diffData: mockDiffData,
    onHover: vi.fn(),
    isLoading: false,
  };

  describe('Rendering and Layout', () => {
    it('renders split-pane layout with original and improved columns', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
      expect(screen.getByTestId('original-column')).toBeInTheDocument();
      expect(screen.getByTestId('improved-column')).toBeInTheDocument();
    });

    it('displays column headers correctly', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      expect(screen.getByText('Original')).toBeInTheDocument();
      expect(screen.getByText('Improved')).toBeInTheDocument();
    });

    it('renders virtualized lists for both columns', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const virtualizedLists = screen.getAllByTestId('virtualized-list');
      expect(virtualizedLists).toHaveLength(2);
    });

    it('applies correct styling to diff viewer container', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveClass('diff-viewer');
    });
  });

  describe('Diff Line Rendering', () => {
    it('renders unchanged lines in both columns', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      expect(screen.getAllByText('This is unchanged content.')).toHaveLength(2);
      expect(screen.getAllByText('Another unchanged line.')).toHaveLength(2);
    });

    it('renders removed lines only in original column', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const removedLines = screen.getAllByText('This line was removed.');
      expect(removedLines).toHaveLength(1);
      
      // Should be in original column
      const originalColumn = screen.getByTestId('original-column');
      expect(originalColumn).toContainElement(removedLines[0]);
    });

    it('renders added lines only in improved column', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const addedLines = screen.getAllByText('This line was added.');
      expect(addedLines).toHaveLength(1);
      
      // Should be in improved column
      const improvedColumn = screen.getByTestId('improved-column');
      expect(improvedColumn).toContainElement(addedLines[0]);
    });

    it('applies correct CSS classes to different line types', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const unchangedLine = screen.getAllByText('This is unchanged content.')[0];
      expect(unchangedLine.closest('.diff-line')).toHaveClass('unchanged');
      
      const removedLine = screen.getByText('This line was removed.');
      expect(removedLine.closest('.diff-line')).toHaveClass('removed');
      
      const addedLine = screen.getByText('This line was added.');
      expect(addedLine.closest('.diff-line')).toHaveClass('added');
    });

    it('displays line numbers correctly', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      expect(screen.getByText('1')).toBeInTheDocument(); // Line number
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText('3')).toBeInTheDocument();
    });
  });

  describe('Hover Synchronization', () => {
    it('calls onHover when hovering over diff lines', async () => {
      const mockOnHover = vi.fn();
      render(<VirtualizedDiffViewer {...defaultProps} onHover={mockOnHover} />);
      
      const diffLine = screen.getAllByText('This is unchanged content.')[0];
      await user.hover(diffLine);
      
      expect(mockOnHover).toHaveBeenCalledWith(
        expect.objectContaining({
          lineNumber: expect.any(Number),
          type: 'unchanged',
        })
      );
    });

    it('highlights corresponding lines in both columns on hover', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const originalLine = screen.getAllByText('This is unchanged content.')[0];
      await user.hover(originalLine);
      
      await waitFor(() => {
        const highlightedLines = screen.getAllByText('This is unchanged content.');
        highlightedLines.forEach(line => {
          expect(line.closest('.diff-line')).toHaveClass('highlighted');
        });
      });
    });

    it('removes highlight when mouse leaves', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const originalLine = screen.getAllByText('This is unchanged content.')[0];
      await user.hover(originalLine);
      await user.unhover(originalLine);
      
      await waitFor(() => {
        const lines = screen.getAllByText('This is unchanged content.');
        lines.forEach(line => {
          expect(line.closest('.diff-line')).not.toHaveClass('highlighted');
        });
      });
    });

    it('handles hover on removed lines correctly', async () => {
      const mockOnHover = vi.fn();
      render(<VirtualizedDiffViewer {...defaultProps} onHover={mockOnHover} />);
      
      const removedLine = screen.getByText('This line was removed.');
      await user.hover(removedLine);
      
      expect(mockOnHover).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'removed',
          content: 'This line was removed.',
        })
      );
    });

    it('handles hover on added lines correctly', async () => {
      const mockOnHover = vi.fn();
      render(<VirtualizedDiffViewer {...defaultProps} onHover={mockOnHover} />);
      
      const addedLine = screen.getByText('This line was added.');
      await user.hover(addedLine);
      
      expect(mockOnHover).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'added',
          content: 'This line was added.',
        })
      );
    });
  });

  describe('Virtualization Performance', () => {
    it('handles large diff data efficiently', async () => {
      const largeDiffData = Array.from({ length: 10000 }, (_, i) => ({
        type: 'unchanged' as const,
        content: `Line ${i + 1} content`,
        lineNumber: i + 1,
        originalLineNumber: i + 1,
        improvedLineNumber: i + 1,
      }));
      
      const renderTime = await testHelpers.performance.measureRenderTime(() => {
        render(<VirtualizedDiffViewer {...defaultProps} diffData={largeDiffData} />);
      });
      
      expect(renderTime).toBeLessThan(200); // Should render quickly even with large data
    });

    it('only renders visible items in viewport', () => {
      const largeDiffData = Array.from({ length: 1000 }, (_, i) => ({
        type: 'unchanged' as const,
        content: `Line ${i + 1} content`,
        lineNumber: i + 1,
        originalLineNumber: i + 1,
        improvedLineNumber: i + 1,
      }));
      
      render(<VirtualizedDiffViewer {...defaultProps} diffData={largeDiffData} />);
      
      // Should only render a subset of items (mocked to 10 in our mock)
      const renderedLines = screen.getAllByText(/Line \d+ content/);
      expect(renderedLines.length).toBeLessThan(largeDiffData.length);
    });

    it('updates efficiently when diff data changes', async () => {
      const { rerender } = render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const newDiffData = [
        {
          type: 'added' as const,
          content: 'New added line.',
          lineNumber: 1,
          originalLineNumber: null,
          improvedLineNumber: 1,
        },
      ];
      
      rerender(<VirtualizedDiffViewer {...defaultProps} diffData={newDiffData} />);
      
      await waitFor(() => {
        expect(screen.getByText('New added line.')).toBeInTheDocument();
      });
    });
  });

  describe('Responsive Design', () => {
    it('adjusts layout for mobile screens', async () => {
      await testHelpers.visual.testResponsiveBreakpoint(375); // Mobile width
      
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveClass('mobile-layout');
    });

    it('maintains split-pane layout on desktop', async () => {
      await testHelpers.visual.testResponsiveBreakpoint(1024); // Desktop width
      
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveClass('desktop-layout');
    });

    it('handles window resize events', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      // Trigger resize
      fireEvent(window, new Event('resize'));
      
      await waitFor(() => {
        // Should re-render without errors
        expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
      });
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when isLoading is true', () => {
      render(<VirtualizedDiffViewer {...defaultProps} isLoading={true} />);
      
      expect(screen.getByTestId('diff-loading')).toBeInTheDocument();
      expect(screen.getByText(/loading/i)).toBeInTheDocument();
    });

    it('hides content while loading', () => {
      render(<VirtualizedDiffViewer {...defaultProps} isLoading={true} />);
      
      expect(screen.queryByTestId('original-column')).not.toBeInTheDocument();
      expect(screen.queryByTestId('improved-column')).not.toBeInTheDocument();
    });

    it('shows content when loading completes', () => {
      const { rerender } = render(<VirtualizedDiffViewer {...defaultProps} isLoading={true} />);
      
      rerender(<VirtualizedDiffViewer {...defaultProps} isLoading={false} />);
      
      expect(screen.queryByTestId('diff-loading')).not.toBeInTheDocument();
      expect(screen.getByTestId('original-column')).toBeInTheDocument();
      expect(screen.getByTestId('improved-column')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('handles empty diff data gracefully', () => {
      render(<VirtualizedDiffViewer {...defaultProps} diffData={[]} />);
      
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
      expect(screen.getByText(/no changes/i)).toBeInTheDocument();
    });

    it('handles malformed diff data', () => {
      const malformedData = [
        {
          type: 'invalid' as any,
          content: null,
          lineNumber: null,
        },
      ];
      
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      render(<VirtualizedDiffViewer {...defaultProps} diffData={malformedData} />);
      
      expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
      expect(consoleSpy).toHaveBeenCalled();
      
      consoleSpy.mockRestore();
    });

    it('recovers from rendering errors', () => {
      const ErrorBoundary = ({ children }: { children: React.ReactNode }) => {
        try {
          return <>{children}</>;
        } catch (error) {
          return <div data-testid="error-fallback">Error occurred</div>;
        }
      };
      
      // Mock a component that throws
      vi.mocked(mockDiffData[0]).content = null as any;
      
      render(
        <ErrorBoundary>
          <VirtualizedDiffViewer {...defaultProps} />
        </ErrorBoundary>
      );
      
      // Should either render successfully or show error fallback
      expect(
        screen.getByTestId('diff-viewer') || screen.getByTestId('error-fallback')
      ).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels for columns', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const originalColumn = screen.getByTestId('original-column');
      const improvedColumn = screen.getByTestId('improved-column');
      
      expect(originalColumn).toHaveAttribute('aria-label', 'Original content');
      expect(improvedColumn).toHaveAttribute('aria-label', 'Improved content');
    });

    it('supports keyboard navigation', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const firstLine = screen.getAllByText('This is unchanged content.')[0];
      firstLine.focus();
      
      await user.keyboard('{ArrowDown}');
      
      // Should move focus to next line
      expect(document.activeElement).not.toBe(firstLine);
    });

    it('announces changes to screen readers', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toHaveTextContent(/diff loaded/i);
    });

    it('provides proper role attributes', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label', 'Content comparison');
    });

    it('supports high contrast mode', async () => {
      // Mock high contrast media query
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });
      
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveClass('high-contrast');
    });
  });

  describe('Content Reconstruction Integration', () => {
    it('correctly displays reconstructed content', () => {
      const reconstructedProps = {
        ...defaultProps,
        originalContent: 'Original text with issues.',
        improvedContent: 'Improved text without issues.',
      };
      
      render(<VirtualizedDiffViewer {...reconstructedProps} />);
      
      expect(screen.getByText('Original text with issues.')).toBeInTheDocument();
      expect(screen.getByText('Improved text without issues.')).toBeInTheDocument();
    });

    it('handles HTML content in diff', () => {
      const htmlProps = {
        ...defaultProps,
        originalContent: '<p>Original <strong>bold</strong> text</p>',
        improvedContent: '<p>Improved <em>italic</em> text</p>',
      };
      
      render(<VirtualizedDiffViewer {...htmlProps} />);
      
      // Should render HTML content safely
      expect(screen.getByText(/Original.*text/)).toBeInTheDocument();
      expect(screen.getByText(/Improved.*text/)).toBeInTheDocument();
    });

    it('preserves formatting in diff display', () => {
      const formattedProps = {
        ...defaultProps,
        originalContent: 'Line 1\nLine 2\nLine 3',
        improvedContent: 'Line 1\nImproved Line 2\nLine 3',
      };
      
      render(<VirtualizedDiffViewer {...formattedProps} />);
      
      // Should maintain line breaks and structure
      expect(screen.getByText('Line 1')).toBeInTheDocument();
      expect(screen.getByText('Line 2')).toBeInTheDocument();
      expect(screen.getByText('Improved Line 2')).toBeInTheDocument();
      expect(screen.getByText('Line 3')).toBeInTheDocument();
    });
  });

  describe('Memory Management', () => {
    it('cleans up event listeners on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');
      
      const { unmount } = render(<VirtualizedDiffViewer {...defaultProps} />);
      
      unmount();
      
      expect(removeEventListenerSpy).toHaveBeenCalledWith('resize', expect.any(Function));
      
      removeEventListenerSpy.mockRestore();
    });

    it('prevents memory leaks with large datasets', async () => {
      const memoryCheck = testHelpers.performance.expectNoMemoryLeaks();
      
      const largeDiffData = Array.from({ length: 5000 }, (_, i) => ({
        type: 'unchanged' as const,
        content: `Large content line ${i}`,
        lineNumber: i + 1,
        originalLineNumber: i + 1,
        improvedLineNumber: i + 1,
      }));
      
      const { unmount } = render(<VirtualizedDiffViewer {...defaultProps} diffData={largeDiffData} />);
      
      await waitFor(() => {
        expect(screen.getByTestId('diff-viewer')).toBeInTheDocument();
      });
      
      unmount();
      
      memoryCheck.check();
    });
  });
});