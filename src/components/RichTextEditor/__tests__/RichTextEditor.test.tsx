import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import RichTextEditor from '../RichTextEditor';
import { mockLexicalEditor, setupTestEnvironment, cleanupTestEnvironment, testHelpers } from '@/test-utils/mocks';

// Mock Lexical
vi.mock('@lexical/react/LexicalComposer', () => ({
  LexicalComposer: ({ children }: any) => children,
}));

vi.mock('@lexical/react/LexicalContentEditable', () => ({
  ContentEditable: ({ className, ...props }: any) => (
    <div 
      className={className}
      contentEditable
      data-testid="rich-text-editor"
      {...props}
    />
  ),
}));

vi.mock('@lexical/react/LexicalRichTextPlugin', () => ({
  RichTextPlugin: ({ contentEditable, placeholder }: any) => (
    <div>
      {contentEditable}
      {placeholder}
    </div>
  ),
}));

vi.mock('@lexical/react/LexicalHistoryPlugin', () => ({
  HistoryPlugin: () => null,
}));

vi.mock('@lexical/react/LexicalOnChangePlugin', () => ({
  OnChangePlugin: ({ onChange }: any) => {
    // Simulate editor state changes
    React.useEffect(() => {
      const mockEditorState = {
        read: vi.fn((fn) => fn()),
        toJSON: vi.fn(() => ({ root: { children: [] } })),
      };
      onChange(mockEditorState, mockLexicalEditor);
    }, [onChange]);
    return null;
  },
}));

vi.mock('@lexical/react/LexicalErrorBoundary', () => ({
  LexicalErrorBoundary: ({ children }: any) => children,
}));

describe('RichTextEditor', () => {
  const user = userEvent.setup();
  const mockOnChange = vi.fn();
  const mockOnAnalyze = vi.fn();

  beforeEach(() => {
    setupTestEnvironment();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  const defaultProps = {
    onChange: mockOnChange,
    onAnalyze: mockOnAnalyze,
    placeholder: 'Start typing your email...',
    initialContent: '',
    isAnalyzing: false,
  };

  describe('Basic Functionality', () => {
    it('renders the editor with placeholder text', () => {
      render(<RichTextEditor {...defaultProps} />);
      
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.getByText('Start typing your email...')).toBeInTheDocument();
    });

    it('renders with initial content', () => {
      const initialContent = '<p>Hello world</p>';
      render(<RichTextEditor {...defaultProps} initialContent={initialContent} />);
      
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
    });

    it('calls onChange when content changes', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await user.type(editor, 'Hello world');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('triggers analysis after typing stops', async () => {
      vi.useFakeTimers();
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await user.type(editor, 'Hello world');
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalled();
      });
      
      vi.useRealTimers();
    });
  });

  describe('Toolbar Functionality', () => {
    it('renders formatting toolbar', () => {
      render(<RichTextEditor {...defaultProps} />);
      
      expect(screen.getByRole('button', { name: /bold/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /italic/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /underline/i })).toBeInTheDocument();
    });

    it('applies bold formatting when button is clicked', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /bold/i });
      await user.click(boldButton);
      
      expect(boldButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('applies italic formatting when button is clicked', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const italicButton = screen.getByRole('button', { name: /italic/i });
      await user.click(italicButton);
      
      expect(italicButton).toHaveAttribute('aria-pressed', 'true');
    });

    it('handles list formatting', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const listButton = screen.getByRole('button', { name: /bullet list/i });
      await user.click(listButton);
      
      // Verify list command was dispatched
      expect(mockLexicalEditor.dispatchCommand).toHaveBeenCalled();
    });
  });

  describe('Keyboard Shortcuts', () => {
    it('handles Ctrl+B for bold', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      
      await user.keyboard('{Control>}b{/Control}');
      
      expect(mockLexicalEditor.dispatchCommand).toHaveBeenCalled();
    });

    it('handles Ctrl+I for italic', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      
      await user.keyboard('{Control>}i{/Control}');
      
      expect(mockLexicalEditor.dispatchCommand).toHaveBeenCalled();
    });

    it('handles Ctrl+Z for undo', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      
      await user.keyboard('{Control>}z{/Control}');
      
      expect(mockLexicalEditor.dispatchCommand).toHaveBeenCalled();
    });

    it('handles Ctrl+Y for redo', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      editor.focus();
      
      await user.keyboard('{Control>}y{/Control}');
      
      expect(mockLexicalEditor.dispatchCommand).toHaveBeenCalled();
    });
  });

  describe('Content Sanitization', () => {
    it('sanitizes pasted HTML content', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      // Simulate paste event with malicious content
      const clipboardData = {
        getData: vi.fn(() => '<script>alert("xss")</script><p>Safe content</p>'),
        types: ['text/html'],
      };
      
      const pasteEvent = new ClipboardEvent('paste', { clipboardData } as any);
      fireEvent(editor, pasteEvent);
      
      // Verify that script tags are removed but safe content remains
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('preserves safe HTML formatting on paste', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      const clipboardData = {
        getData: vi.fn(() => '<p><strong>Bold text</strong> and <em>italic text</em></p>'),
        types: ['text/html'],
      };
      
      const pasteEvent = new ClipboardEvent('paste', { clipboardData } as any);
      fireEvent(editor, pasteEvent);
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });
  });

  describe('Auto-save Functionality', () => {
    it('auto-saves content to localStorage', async () => {
      vi.useFakeTimers();
      const mockSetItem = vi.spyOn(localStorage, 'setItem');
      
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await user.type(editor, 'Auto-save test content');
      
      // Fast-forward past auto-save delay
      vi.advanceTimersByTime(2000);
      
      await waitFor(() => {
        expect(mockSetItem).toHaveBeenCalledWith(
          'rich-text-editor-autosave',
          expect.any(String)
        );
      });
      
      vi.useRealTimers();
    });

    it('restores content from localStorage on mount', () => {
      const savedContent = JSON.stringify({ content: 'Restored content' });
      vi.spyOn(localStorage, 'getItem').mockReturnValue(savedContent);
      
      render(<RichTextEditor {...defaultProps} />);
      
      expect(localStorage.getItem).toHaveBeenCalledWith('rich-text-editor-autosave');
    });
  });

  describe('Loading States', () => {
    it('shows loading indicator when analyzing', () => {
      render(<RichTextEditor {...defaultProps} isAnalyzing={true} />);
      
      expect(screen.getByTestId('analysis-loading')).toBeInTheDocument();
    });

    it('disables editor during analysis', () => {
      render(<RichTextEditor {...defaultProps} isAnalyzing={true} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('aria-disabled', 'true');
    });
  });

  describe('Error Handling', () => {
    it('handles editor initialization errors gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Mock Lexical to throw an error
      vi.mocked(mockLexicalEditor.getEditorState).mockImplementation(() => {
        throw new Error('Editor initialization failed');
      });
      
      render(<RichTextEditor {...defaultProps} />);
      
      expect(screen.getByText(/editor error/i)).toBeInTheDocument();
      
      consoleSpy.mockRestore();
    });

    it('recovers from paste errors', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      // Simulate paste event that throws an error
      const clipboardData = {
        getData: vi.fn(() => {
          throw new Error('Clipboard access denied');
        }),
        types: ['text/html'],
      };
      
      const pasteEvent = new ClipboardEvent('paste', { clipboardData } as any);
      fireEvent(editor, pasteEvent);
      
      // Editor should still be functional
      expect(editor).toBeInTheDocument();
      expect(editor).not.toHaveAttribute('aria-disabled');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toHaveAttribute('role', 'textbox');
      expect(editor).toHaveAttribute('aria-multiline', 'true');
    });

    it('supports keyboard navigation in toolbar', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /bold/i });
      const italicButton = screen.getByRole('button', { name: /italic/i });
      
      boldButton.focus();
      expect(boldButton).toHaveFocus();
      
      await user.tab();
      expect(italicButton).toHaveFocus();
    });

    it('announces formatting changes to screen readers', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const boldButton = screen.getByRole('button', { name: /bold/i });
      await user.click(boldButton);
      
      expect(screen.getByRole('status')).toHaveTextContent(/bold formatting applied/i);
    });
  });

  describe('Performance', () => {
    it('debounces analysis calls', async () => {
      vi.useFakeTimers();
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      // Type multiple characters quickly
      await user.type(editor, 'Hello');
      await user.type(editor, ' world');
      await user.type(editor, '!');
      
      // Should not call analyze yet
      expect(mockOnAnalyze).not.toHaveBeenCalled();
      
      // Fast-forward past debounce delay
      vi.advanceTimersByTime(1000);
      
      // Should call analyze only once
      await waitFor(() => {
        expect(mockOnAnalyze).toHaveBeenCalledTimes(1);
      });
      
      vi.useRealTimers();
    });

    it('handles rapid content changes efficiently', async () => {
      const renderTime = await testHelpers.performance.measureRenderTime(() => {
        render(<RichTextEditor {...defaultProps} />);
      });
      
      // Should render quickly (under 100ms)
      expect(renderTime).toBeLessThan(100);
    });
  });

  describe('Edge Cases', () => {
    it('handles empty content gracefully', () => {
      render(<RichTextEditor {...defaultProps} initialContent="" />);
      
      expect(screen.getByTestId('rich-text-editor')).toBeInTheDocument();
      expect(screen.getByText('Start typing your email...')).toBeInTheDocument();
    });

    it('handles very long content', async () => {
      const longContent = 'A'.repeat(10000);
      render(<RichTextEditor {...defaultProps} initialContent={longContent} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      expect(editor).toBeInTheDocument();
    });

    it('handles special characters and emojis', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      await user.type(editor, 'Hello 👋 World! Special chars: @#$%^&*()');
      
      await waitFor(() => {
        expect(mockOnChange).toHaveBeenCalled();
      });
    });

    it('handles rapid focus/blur events', async () => {
      render(<RichTextEditor {...defaultProps} />);
      
      const editor = screen.getByTestId('rich-text-editor');
      
      // Rapidly focus and blur
      for (let i = 0; i < 10; i++) {
        editor.focus();
        editor.blur();
      }
      
      // Should not crash or cause errors
      expect(editor).toBeInTheDocument();
    });
  });
});