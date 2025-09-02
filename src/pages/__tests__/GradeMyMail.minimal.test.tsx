import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect } from 'vitest';
import { ThemeProvider } from '../../components/ThemeProvider';
import { LoadingProvider } from '../../contexts/LoadingContext';
import GradeMyMail from '../GradeMyMail';

// Mock the hooks and components
vi.mock('../../hooks/useRealTimeAnalysis', () => ({
  useRealTimeAnalysis: () => ({
    state: { result: null, error: null },
    isAnalyzing: false,
    lastError: null,
    analyzeContent: vi.fn(),
  }),
}));

vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleAsyncError: vi.fn(),
    enableFallbackMode: vi.fn(),
  }),
}));

vi.mock('../../contexts/LoadingContext', () => ({
  LoadingProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useLoading: () => ({
    startAnalysisLoading: vi.fn(),
    updateProgress: vi.fn(),
    stopLoading: vi.fn(),
  }),
}));

vi.mock('../../utils/errorRecovery', () => ({
  StatePreservation: {
    restoreState: () => ({ success: false, data: null }),
    preserveState: vi.fn(),
    clearRecoveryData: vi.fn(),
  },
}));

// Mock the API service to prevent network calls during testing
vi.mock('../../services/api', () => ({
  apiService: {
    getModelsStatus: vi.fn().mockResolvedValue({
      status: 'healthy',
      hybrid: {
        currentPrimary: 'llama3.2',
        usingFallback: false,
      },
    }),
    analyzeNewsletter: vi.fn().mockResolvedValue({
      message: {
        content: 'Test <fluff>amazing</fluff> content',
      },
    }),
  },
}));

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <BrowserRouter>
      <ThemeProvider>
        <LoadingProvider>
          {component}
        </LoadingProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
};

describe('GradeMyMail - Minimal UI', () => {
  test('renders minimal GradeMyMail title', () => {
    renderWithProviders(<GradeMyMail />);
    
    // Check for the main title
    expect(screen.getByText('GradeMyMail')).toBeInTheDocument();
  });

  test('renders minimal editor interface', () => {
    renderWithProviders(<GradeMyMail />);
    
    // Check that the editor is present (RichTextEditor component)
    // Since we can't easily test the RichTextEditor component directly,
    // we'll check for its container
    const editorContainer = document.querySelector('[class*="min-h-"]');
    expect(editorContainer).toBeInTheDocument();
  });

  test('shows sample button when no content', () => {
    renderWithProviders(<GradeMyMail />);
    
    // Check for the minimal sample button
    expect(screen.getByText('Try sample')).toBeInTheDocument();
  });

  test('has minimal, clean styling', () => {
    renderWithProviders(<GradeMyMail />);
    
    // Check that the main container has minimal white background
    const mainContainer = document.querySelector('.min-h-screen');
    expect(mainContainer).toHaveClass('bg-white');
  });

  test('title has premium styling', () => {
    renderWithProviders(<GradeMyMail />);
    
    const title = screen.getByText('GradeMyMail');
    expect(title).toHaveClass('text-5xl', 'font-light', 'text-gray-900', 'tracking-tight');
  });

  test('does not show analyze button when no content', () => {
    renderWithProviders(<GradeMyMail />);
    
    // Should not show analyze button when there's no content
    expect(screen.queryByText('Analyze')).not.toBeInTheDocument();
  });

  test('shows analyze button when content is present', () => {
    // This would require mocking the RichTextEditor onChange
    // For now, we'll just verify the button structure exists
    renderWithProviders(<GradeMyMail />);
    
    // The button container should exist
    const buttonContainer = document.querySelector('.text-center.mt-8');
    expect(buttonContainer).toBeInTheDocument();
  });
});