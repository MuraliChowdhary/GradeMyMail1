import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { 
  setupTestEnvironment, 
  cleanupTestEnvironment, 
  testHelpers,
  mockHighlights 
} from '@/test-utils/mocks';
import RichTextEditor from '@/components/RichTextEditor/RichTextEditor';
import HighlightOverlay from '@/components/HighlightOverlay/HighlightOverlay';
import VirtualizedDiffViewer from '@/components/VirtualizedDiff/VirtualizedDiffViewer';
import HighlightLegend from '@/components/HighlightLegend/HighlightLegend';

describe('Accessibility Tests', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('Rich Text Editor Accessibility', () => {
    const defaultProps = {
      onChange: vi.fn(),
      onAnalyze: vi.fn(),
      placeholder: 'Start typing your email...',
      initialContent: '',
      isAnalyzing: false,
    };

    it('has proper ARIA labels and roles', () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('role', 'textbox');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
      expect(editor).toHaveAttribute('aria-label', expect.stringContaining('email editor'));
    });

    it('supports keyboard navigation in toolbar', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const toolbar = screen.getByRole('toolbar');
      expect(toolbar).toBeInTheDocument();
      
      const buttons = screen.getAllByRole('button');
      
      // Should be able to tab through toolbar buttons
      buttons[0].focus();
      expect(buttons[0]).toHaveFocus();
      
      await user.tab();
      expect(buttons[1]).toHaveFocus();
      
      await user.tab();
      expect(buttons[2]).toHaveFocus();
    });

    it('provides keyboard shortcuts with proper announcements', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      
      // Test Ctrl+B for bold
      await user.keyboard('{Control>}b{/Control}');
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/bold.*applied/i);
      });
    });

    it('announces formatting changes to screen readers', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /bold/i });
      await user.click(boldButton);
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/bold formatting applied/i);
      });
    });

    it('provides proper focus management', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      const boldButton = screen.getByRole('button', { name: /bold/i });
      
      // Focus should move properly between editor and toolbar
      editor.focus();
      expect(editor).toHaveFocus();
      
      await user.tab();
      expect(boldButton).toHaveFocus();
      
      await user.keyboard('{Enter}');
      // Focus should return to editor after toolbar action
      expect(editor).toHaveFocus();
    });

    it('supports screen reader navigation', () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('aria-describedby');
      
      const description = document.getElementById(editor.getAttribute('aria-describedby')!);
      expect(description).toHaveTextContent(/rich text editor/i);
    });

    it('handles high contrast mode', () => {
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
      
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveClass('high-contrast');
    });

    it('supports reduced motion preferences', () => {
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
      
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveClass('reduced-motion');
    });

    it('provides proper error announcements', async () => {
      const { rerender } = render(<RichTextEditor {...defaultProps} />);
      
      // Simulate error state
      rerender(<RichTextEditor {...defaultProps} error="Editor initialization failed" />);
      
      await waitFor(() => {
        const errorAlert = screen.getByRole('alert');
        expect(errorAlert).toHaveTextContent('Editor initialization failed');
      });
    });

    it('supports voice control commands', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      // Should support voice commands through aria-label
      expect(editor).toHaveAttribute('aria-label', expect.stringContaining('email editor'));
      
      // Voice commands should work through button labels
      const boldButton = screen.getByRole('button', { name: /bold/i });
      expect(boldButton).toHaveAttribute('aria-label', 'Bold');
    });
  });

  describe('Highlight Overlay Accessibility', () => {
    const defaultProps = {
      highlights: mockHighlights,
      targetElement: document.createElement('div'),
      isVisible: true,
      animationSpeed: 1000,
    };

    it('provides screen reader announcements for highlights', async () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/3 issues highlighted/i);
      });
    });

    it('includes proper ARIA labels for highlight canvas', () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      expect(canvas).toHaveAttribute('aria-label', 'Email content highlights');
      expect(canvas).toHaveAttribute('role', 'img');
    });

    it('provides detailed descriptions for screen readers', () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      expect(canvas).toHaveAttribute('aria-describedby');
      
      const description = document.getElementById(canvas.getAttribute('aria-describedby')!);
      expect(description).toHaveTextContent(/fluff.*spam.*hard to read/i);
    });

    it('respects reduced motion preferences', async () => {
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
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/highlights applied instantly/i);
      });
    });

    it('provides keyboard navigation for highlight information', async () => {
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      
      // Should be focusable
      expect(canvas).toHaveAttribute('tabindex', '0');
      
      canvas.focus();
      expect(canvas).toHaveFocus();
      
      // Should provide keyboard interaction
      await user.keyboard('{Enter}');
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/highlight details/i);
      });
    });

    it('supports high contrast mode with enhanced visibility', () => {
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
      
      render(<HighlightOverlay {...defaultProps} />);
      
      const canvas = screen.getByTestId('highlight-canvas');
      expect(canvas).toHaveClass('high-contrast');
    });
  });

  describe('Highlight Legend Accessibility', () => {
    const legendItems = [
      { type: 'fluff', label: 'Unnecessary words', color: '#06b6d4', count: 2 },
      { type: 'spam_words', label: 'Spam-like words', color: '#eab308', count: 1 },
      { type: 'hard_to_read', label: 'Hard to read', color: '#ef4444', count: 1 },
    ];

    it('provides proper semantic structure', () => {
      render(<HighlightLegend items={legendItems} />);
      
      const legend = screen.getByRole('list');
      expect(legend).toHaveAttribute('aria-label', 'Highlight legend');
      
      const items = screen.getAllByRole('listitem');
      expect(items).toHaveLength(3);
    });

    it('includes color information for screen readers', () => {
      render(<HighlightLegend items={legendItems} />);
      
      const fluffItem = screen.getByText('Unnecessary words');
      expect(fluffItem.closest('li')).toHaveAttribute('aria-label', 
        expect.stringContaining('cyan color')
      );
    });

    it('provides count information accessibly', () => {
      render(<HighlightLegend items={legendItems} />);
      
      const fluffItem = screen.getByText('Unnecessary words');
      expect(fluffItem.closest('li')).toHaveAttribute('aria-label', 
        expect.stringContaining('2 instances')
      );
    });

    it('supports keyboard navigation', async () => {
      render(<HighlightLegend items={legendItems} />);
      
      const legendItems = screen.getAllByRole('listitem');
      
      // Should be able to navigate through items
      legendItems[0].focus();
      expect(legendItems[0]).toHaveFocus();
      
      await user.keyboard('{ArrowDown}');
      expect(legendItems[1]).toHaveFocus();
      
      await user.keyboard('{ArrowDown}');
      expect(legendItems[2]).toHaveFocus();
    });
  });

  describe('Diff Viewer Accessibility', () => {
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
    ];

    const defaultProps = {
      originalContent: 'Original content',
      improvedContent: 'Improved content',
      diffData: mockDiffData,
      onHover: vi.fn(),
      isLoading: false,
    };

    it('has proper ARIA labels for columns', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const originalColumn = screen.getByTestId('original-column');
      const improvedColumn = screen.getByTestId('improved-column');
      
      expect(originalColumn).toHaveAttribute('aria-label', 'Original content');
      expect(improvedColumn).toHaveAttribute('aria-label', 'Improved content');
      expect(originalColumn).toHaveAttribute('role', 'region');
      expect(improvedColumn).toHaveAttribute('role', 'region');
    });

    it('provides proper semantic structure for diff lines', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const diffLines = screen.getAllByRole('listitem');
      expect(diffLines.length).toBeGreaterThan(0);
      
      // Check that removed lines have proper ARIA attributes
      const removedLine = screen.getByText('This line was removed.');
      expect(removedLine.closest('[role="listitem"]')).toHaveAttribute('aria-label', 
        expect.stringContaining('removed')
      );
    });

    it('supports keyboard navigation between columns', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const originalColumn = screen.getByTestId('original-column');
      const improvedColumn = screen.getByTestId('improved-column');
      
      originalColumn.focus();
      expect(originalColumn).toHaveFocus();
      
      await user.keyboard('{Tab}');
      expect(improvedColumn).toHaveFocus();
    });

    it('provides line-by-line navigation with arrow keys', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const firstLine = screen.getAllByText(/This is unchanged content/)[0];
      firstLine.focus();
      
      await user.keyboard('{ArrowDown}');
      
      // Should move to next line
      expect(document.activeElement).not.toBe(firstLine);
    });

    it('announces diff changes to screen readers', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const announcement = screen.getByRole('status', { hidden: true });
      expect(announcement).toHaveTextContent(/diff loaded.*1 addition.*1 removal/i);
    });

    it('provides detailed descriptions for complex changes', () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveAttribute('aria-describedby');
      
      const description = document.getElementById(container.getAttribute('aria-describedby')!);
      expect(description).toHaveTextContent(/side-by-side comparison/i);
    });

    it('supports high contrast mode', () => {
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

    it('provides proper focus indicators', async () => {
      render(<VirtualizedDiffViewer {...defaultProps} />);
      
      const diffLine = screen.getAllByText('This is unchanged content.')[0];
      
      await user.click(diffLine);
      
      expect(diffLine.closest('.diff-line')).toHaveClass('focused');
      expect(diffLine.closest('.diff-line')).toHaveAttribute('aria-selected', 'true');
    });
  });

  describe('Loading States Accessibility', () => {
    it('provides proper loading announcements', () => {
      render(
        <VirtualizedDiffViewer
          originalContent=""
          improvedContent=""
          diffData={[]}
          onHover={vi.fn()}
          isLoading={true}
        />
      );
      
      const loadingIndicator = screen.getByRole('status');
      expect(loadingIndicator).toHaveTextContent(/loading/i);
      expect(loadingIndicator).toHaveAttribute('aria-live', 'polite');
    });

    it('announces completion of loading', async () => {
      const { rerender } = render(
        <VirtualizedDiffViewer
          originalContent=""
          improvedContent=""
          diffData={[]}
          onHover={vi.fn()}
          isLoading={true}
        />
      );
      
      rerender(
        <VirtualizedDiffViewer
          originalContent="Content"
          improvedContent="Improved content"
          diffData={[]}
          onHover={vi.fn()}
          isLoading={false}
        />
      );
      
      await waitFor(() => {
        const announcement = screen.getByRole('status', { hidden: true });
        expect(announcement).toHaveTextContent(/content loaded/i);
      });
    });
  });

  describe('Error States Accessibility', () => {
    it('provides proper error announcements', () => {
      const ErrorComponent = () => (
        <div role="alert" aria-live="assertive">
          Analysis failed. Please try again.
        </div>
      );
      
      render(<ErrorComponent />);
      
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toHaveTextContent('Analysis failed. Please try again.');
      expect(errorAlert).toHaveAttribute('aria-live', 'assertive');
    });

    it('provides recovery instructions', () => {
      const ErrorComponent = () => (
        <div role="alert">
          <p>Analysis failed. Please try again.</p>
          <button type="button" aria-describedby="retry-help">
            Retry Analysis
          </button>
          <p id="retry-help">
            Click this button to retry the email analysis
          </p>
        </div>
      );
      
      render(<ErrorComponent />);
      
      const retryButton = screen.getByRole('button', { name: /retry analysis/i });
      expect(retryButton).toHaveAttribute('aria-describedby', 'retry-help');
      
      const helpText = screen.getByText(/click this button to retry/i);
      expect(helpText).toHaveAttribute('id', 'retry-help');
    });
  });

  describe('Mobile Accessibility', () => {
    it('supports touch navigation', async () => {
      // Mock touch device
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 5,
      });
      
      render(
        <RichTextEditor
          onChange={vi.fn()}
          onAnalyze={vi.fn()}
          placeholder="Type here..."
          initialContent=""
          isAnalyzing={false}
        />
      );
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveClass('touch-enabled');
    });

    it('provides larger touch targets', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        value: 375,
      });
      
      render(
        <RichTextEditor
          onChange={vi.fn()}
          onAnalyze={vi.fn()}
          placeholder="Type here..."
          initialContent=""
          isAnalyzing={false}
        />
      );
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        const styles = window.getComputedStyle(button);
        const minHeight = parseInt(styles.minHeight);
        expect(minHeight).toBeGreaterThanOrEqual(44); // WCAG minimum touch target size
      });
    });

    it('supports voice-over navigation on iOS', () => {
      // Mock iOS VoiceOver
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)',
      });
      
      render(
        <VirtualizedDiffViewer
          originalContent="Original"
          improvedContent="Improved"
          diffData={[]}
          onHover={vi.fn()}
          isLoading={false}
        />
      );
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveAttribute('aria-label');
      expect(container).toHaveAttribute('role', 'region');
    });
  });

  describe('Internationalization Accessibility', () => {
    it('supports RTL languages', () => {
      // Mock RTL language
      document.documentElement.setAttribute('dir', 'rtl');
      document.documentElement.setAttribute('lang', 'ar');
      
      render(
        <RichTextEditor
          onChange={vi.fn()}
          onAnalyze={vi.fn()}
          placeholder="اكتب هنا..."
          initialContent=""
          isAnalyzing={false}
        />
      );
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('dir', 'rtl');
      
      // Cleanup
      document.documentElement.removeAttribute('dir');
      document.documentElement.setAttribute('lang', 'en');
    });

    it('provides proper language attributes', () => {
      render(
        <div lang="es">
          <RichTextEditor
            onChange={vi.fn()}
            onAnalyze={vi.fn()}
            placeholder="Escribe aquí..."
            initialContent=""
            isAnalyzing={false}
          />
        </div>
      );
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor.closest('[lang]')).toHaveAttribute('lang', 'es');
    });
  });

  describe('Screen Reader Compatibility', () => {
    it('works with NVDA screen reader', () => {
      // Mock NVDA detection
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) NVDA/2021.1',
      });
      
      render(
        <RichTextEditor
          onChange={vi.fn()}
          onAnalyze={vi.fn()}
          placeholder="Type here..."
          initialContent=""
          isAnalyzing={false}
        />
      );
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('aria-label');
      expect(editor).toHaveAttribute('role', 'textbox');
    });

    it('works with JAWS screen reader', () => {
      // Mock JAWS detection
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) JAWS/2021',
      });
      
      render(
        <HighlightLegend 
          items={[
            { type: 'fluff', label: 'Unnecessary words', color: '#06b6d4', count: 2 }
          ]} 
        />
      );
      
      const legend = screen.getByRole('list');
      expect(legend).toHaveAttribute('aria-label');
    });

    it('works with VoiceOver on macOS', () => {
      // Mock VoiceOver detection
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        value: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) VoiceOver',
      });
      
      render(
        <VirtualizedDiffViewer
          originalContent="Original"
          improvedContent="Improved"
          diffData={[]}
          onHover={vi.fn()}
          isLoading={false}
        />
      );
      
      const container = screen.getByTestId('diff-viewer');
      expect(container).toHaveAttribute('role', 'region');
      expect(container).toHaveAttribute('aria-label');
    });
  });
});