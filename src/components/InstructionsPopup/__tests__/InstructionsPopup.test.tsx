import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import InstructionsPopup from '../InstructionsPopup';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

describe('InstructionsPopup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render if already dismissed', () => {
    localStorageMock.getItem.mockReturnValue('true');
    
    render(<InstructionsPopup />);
    
    expect(screen.queryByText('How it works')).not.toBeInTheDocument();
  });

  it('should contain instruction content when not dismissed', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    // Mock setTimeout to execute immediately for testing
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
    
    render(<InstructionsPopup />);
    
    expect(screen.getByText('How it works')).toBeInTheDocument();
    expect(screen.getByText('Paste or type your newsletter content')).toBeInTheDocument();
    expect(screen.getByText('Click "Analyze" to identify issues')).toBeInTheDocument();
    expect(screen.getByText('Review highlighted areas for clarity, engagement, and tone')).toBeInTheDocument();
    expect(screen.getByText('Click "Improve" to see suggested enhancements')).toBeInTheDocument();
  });

  it('should show color legend', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
    
    render(<InstructionsPopup />);
    
    expect(screen.getByText('Issue types:')).toBeInTheDocument();
    expect(screen.getByText('Clarity issues')).toBeInTheDocument();
    expect(screen.getByText('Engagement problems')).toBeInTheDocument();
    expect(screen.getByText('Tone inconsistencies')).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
    
    render(<InstructionsPopup />);
    
    const closeButton = screen.getByLabelText('Dismiss instructions');
    expect(closeButton).toBeInTheDocument();
    expect(closeButton).toHaveAttribute('aria-label', 'Dismiss instructions');
  });

  it('should call localStorage.setItem when dismissed', () => {
    localStorageMock.getItem.mockReturnValue(null);
    
    vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
      fn();
      return 1 as any;
    });
    
    render(<InstructionsPopup />);
    
    const closeButton = screen.getByLabelText('Dismiss instructions');
    fireEvent.click(closeButton);
    
    expect(localStorageMock.setItem).toHaveBeenCalledWith('instructions-popup-dismissed', 'true');
  });
});