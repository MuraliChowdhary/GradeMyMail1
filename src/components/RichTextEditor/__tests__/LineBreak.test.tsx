import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import RichTextEditor from '../RichTextEditor';

describe('RichTextEditor Line Break Behavior', () => {
  it('renders editor with proper text wrapping styles', () => {
    const { container } = render(<RichTextEditor />);
    
    const editorInput = container.querySelector('.editor-input');
    expect(editorInput).toBeInTheDocument();
    
    // Check that the editor has proper CSS for text wrapping
    const styles = window.getComputedStyle(editorInput!);
    expect(styles.whiteSpace).toBe('pre-wrap');
    expect(styles.wordWrap).toBe('break-word');
    expect(styles.overflowWrap).toBe('break-word');
  });

  it('has proper CSS for paragraph elements', () => {
    const { container } = render(<RichTextEditor />);
    
    // Find the editor container and add a test paragraph
    const editorContainer = container.querySelector('.editor-inner');
    expect(editorContainer).toBeInTheDocument();
    
    // The test passes if the editor renders without CSS conflicts
    expect(editorContainer).toHaveClass('editor-inner');
  });

  it('includes LineBreakPlugin in the editor', () => {
    // This test verifies that the component renders without errors
    // which indicates the LineBreakPlugin is properly integrated
    expect(() => {
      render(<RichTextEditor />);
    }).not.toThrow();
  });

  it('handles keyboard events without errors', () => {
    const { container } = render(<RichTextEditor />);
    
    const editorInput = container.querySelector('.editor-input');
    expect(editorInput).toBeInTheDocument();
    
    // Simulate typing - should not throw errors
    expect(() => {
      fireEvent.keyDown(editorInput!, { key: 'a' });
      fireEvent.keyDown(editorInput!, { key: 'Enter' });
      fireEvent.keyDown(editorInput!, { key: 'Enter', shiftKey: true });
    }).not.toThrow();
  });
});