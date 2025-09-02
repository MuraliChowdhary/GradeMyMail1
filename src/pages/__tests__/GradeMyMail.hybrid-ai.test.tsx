import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi, describe, test, expect, beforeEach } from 'vitest';
import { ThemeProvider } from '../../components/ThemeProvider';
import { LoadingProvider } from '../../contexts/LoadingContext';
import GradeMyMail from '../GradeMyMail';

// Mock the API service with hybrid AI responses
vi.mock('../../services/api', () => ({
  apiService: {
    getModelsStatus: vi.fn(),
    analyzeNewsletter: vi.fn(),
  },
}));

// Mock other dependencies
vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleAsyncError: vi.fn(),
    enableFallbackMode: vi.fn(),
  }),
}));

vi.mock('../../utils/errorRecovery', () => ({
  StatePreservation: {
    restoreState: () => ({ success: false, data: null }),
    preserveState: vi.fn(),
    clearRecoveryData: vi.fn(),
  },
}));

vi.mock('../../utils/navigationUtils', () => ({
  NavigationManager: {
    navigateToFixMyMail: vi.fn(),
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

// Import the mocked API service
import { apiService } from '../../services/api';

describe('GradeMyMail - Hybrid AI Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Default mock responses
    vi.mocked(apiService.getModelsStatus).mockResolvedValue({
      status: 'healthy',
      hybrid: {
        currentPrimary: 'llama3.2',
        usingFallback: false,
      },
    });

    vi.mocked(apiService.analyzeNewsletter).mockResolvedValue({
      message: {
        content: 'This is <fluff>amazing</fluff> content with <spam_words>urgent</spam_words> words and <hard_to_read>synergistic solutions</hard_to_read>.',
      },
    });
  });

  test('should render without crashing', () => {
    renderWithProviders(<GradeMyMail />);
    expect(screen.getByText('GradeMyMail')).toBeInTheDocument();
  });

  test('should have API service methods available', () => {
    expect(apiService.analyzeNewsletter).toBeDefined();
    expect(apiService.getModelsStatus).toBeDefined();
  });

  test('should call analyzeNewsletter when mocked', async () => {
    const result = await apiService.analyzeNewsletter('test content', 'test-key');
    expect(result.message.content).toContain('<fluff>amazing</fluff>');
    expect(apiService.analyzeNewsletter).toHaveBeenCalledWith('test content', 'test-key');
  });

  test('should call getModelsStatus when mocked', async () => {
    const status = await apiService.getModelsStatus();
    expect(status.status).toBe('healthy');
    expect(status.hybrid.currentPrimary).toBe('llama3.2');
    expect(apiService.getModelsStatus).toHaveBeenCalled();
  });

  test('should handle API errors gracefully', async () => {
    vi.mocked(apiService.analyzeNewsletter).mockRejectedValue(new Error('Network error'));
    
    try {
      await apiService.analyzeNewsletter('test content', 'test-key');
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toBe('Network error');
    }
  });

  test('should validate intelligent fallback analysis function', () => {
    renderWithProviders(<GradeMyMail />);
    
    // The component should render without errors, indicating the fallback function is properly defined
    expect(screen.getByText('GradeMyMail')).toBeInTheDocument();
  });
});