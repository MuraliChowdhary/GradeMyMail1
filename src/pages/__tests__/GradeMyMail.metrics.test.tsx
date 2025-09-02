import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import GradeMyMail from '../GradeMyMail';

// Mock the RichTextEditor component
vi.mock('../../components/RichTextEditor/RichTextEditor', () => ({
  default: ({ onChange, placeholder, initialValue }: any) => (
    <textarea
      data-testid="rich-text-editor"
      placeholder={placeholder}
      defaultValue={initialValue}
      onChange={(e) => onChange(e.target.value, e.target.value)}
    />
  ),
}));

// Mock the HighlightOverlay component
vi.mock('../../components/HighlightOverlay/HighlightOverlay', () => ({
  HighlightOverlay: () => <div data-testid="highlight-overlay" />,
}));

// Mock the InstructionsPopup component
vi.mock('../../components/InstructionsPopup', () => ({
  InstructionsPopup: () => <div data-testid="instructions-popup" />,
}));

// Mock the Logo component
vi.mock('../../components/ui/Logo', () => ({
  default: () => <div data-testid="logo" />,
}));

// Mock the MinimalPulsePopup component
vi.mock('../../components/LoadingScreen/MinimalLoadingPopup', () => ({
  MinimalPulsePopup: ({ isVisible, message }: any) => 
    isVisible ? <div data-testid="loading-popup">{message}</div> : null,
}));

const renderWithRouter = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('GradeMyMail Metrics Integration', () => {
  it('displays metrics after analysis', async () => {
    renderWithRouter(<GradeMyMail />);
    
    // Enter some content
    const editor = screen.getByTestId('rich-text-editor');
    fireEvent.change(editor, {
      target: { value: 'I hope this email finds you well and this is an amazing opportunity for synergistic solutions.' }
    });
    
    // Click analyze button
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-popup')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that metrics are displayed
    expect(screen.getByText('Overall Score')).toBeInTheDocument();
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Tone')).toBeInTheDocument();
    
    // Check that a grade is displayed (A, B, C, D, or F)
    const gradeRegex = /^[ABCDF]$/;
    const gradeElements = screen.getAllByText(gradeRegex);
    expect(gradeElements.length).toBeGreaterThan(0);
    
    // Check that progress bars are present
    const progressBars = document.querySelectorAll('.bg-gray-100.rounded-full.h-2');
    expect(progressBars.length).toBe(3); // One for each metric
    
    // Check that word count and reading time are displayed
    expect(screen.getByText(/\d+ words/)).toBeInTheDocument();
    expect(screen.getByText(/\d+ min read/)).toBeInTheDocument();
  });

  it('shows improve button after analysis', async () => {
    renderWithRouter(<GradeMyMail />);
    
    // Enter content and analyze
    const editor = screen.getByTestId('rich-text-editor');
    fireEvent.change(editor, {
      target: { value: 'Test email content for analysis.' }
    });
    
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading-popup')).not.toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Check that improve button appears
    expect(screen.getByText('Improve')).toBeInTheDocument();
  });

  it('hides metrics when content changes after analysis', async () => {
    renderWithRouter(<GradeMyMail />);
    
    // Enter content and analyze
    const editor = screen.getByTestId('rich-text-editor');
    fireEvent.change(editor, {
      target: { value: 'Original content for analysis.' }
    });
    
    const analyzeButton = screen.getByText('Analyze');
    fireEvent.click(analyzeButton);
    
    // Wait for analysis to complete
    await waitFor(() => {
      expect(screen.getByText('Overall Score')).toBeInTheDocument();
    }, { timeout: 3000 });
    
    // Change content
    fireEvent.change(editor, {
      target: { value: 'Modified content that should hide metrics.' }
    });
    
    // Metrics should be hidden
    expect(screen.queryByText('Overall Score')).not.toBeInTheDocument();
    
    // Analyze button should be visible again
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });

  it('displays sample button when no content', () => {
    renderWithRouter(<GradeMyMail />);
    
    // Should show sample button when empty
    expect(screen.getByText('Try sample')).toBeInTheDocument();
  });

  it('loads sample content when sample button is clicked', async () => {
    renderWithRouter(<GradeMyMail />);
    
    // Click sample button
    const sampleButton = screen.getByText('Try sample');
    fireEvent.click(sampleButton);
    
    // Wait for content to be loaded and check that sample button is hidden
    await waitFor(() => {
      expect(screen.queryByText('Try sample')).not.toBeInTheDocument();
    });
    
    // Should populate editor with sample content
    const editor = screen.getByTestId('rich-text-editor') as HTMLTextAreaElement;
    expect(editor.defaultValue || editor.value).toContain('Quarterly Sales Meeting');
    expect(editor.defaultValue || editor.value).toContain('I hope this email finds you well');
    
    // Analyze button should be visible
    expect(screen.getByText('Analyze')).toBeInTheDocument();
  });
});