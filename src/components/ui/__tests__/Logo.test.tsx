import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import Logo from '../Logo';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { it } from 'node:test';
import { beforeEach } from 'node:test';
import { describe } from 'node:test';

// Mock useNavigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('Logo Component', () => {
  beforeEach(() => {
    mockNavigate.mockClear();
  });

  it('renders logo with default props', () => {
    renderWithRouter(<Logo />);
    
    expect(screen.getByAltText('Pick and Partner')).toBeInTheDocument();
    expect(screen.getByText('Pick & Partner')).toBeInTheDocument();
  });

  it('renders logo without text when showText is false', () => {
    renderWithRouter(<Logo showText={false} />);
    
    expect(screen.getByAltText('Pick and Partner')).toBeInTheDocument();
    expect(screen.queryByText('Pick & Partner')).not.toBeInTheDocument();
  });

  it('applies correct size classes', () => {
    const { rerender } = renderWithRouter(<Logo size="sm" />);
    expect(screen.getByText('Pick & Partner')).toHaveClass('text-lg');
    
    rerender(<BrowserRouter><Logo size="lg" /></BrowserRouter>);
    expect(screen.getByText('Pick & Partner')).toHaveClass('text-2xl');
  });

  it('navigates to home when clicked', () => {
    renderWithRouter(<Logo />);
    
    const logoContainer = screen.getByRole('button');
    fireEvent.click(logoContainer);
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('calls custom onClick handler when provided', () => {
    const mockOnClick = vi.fn();
    renderWithRouter(<Logo onClick={mockOnClick} />);
    
    const logoContainer = screen.getByRole('button');
    fireEvent.click(logoContainer);
    
    expect(mockOnClick).toHaveBeenCalled();
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it('is not clickable when clickable is false', () => {
    renderWithRouter(<Logo clickable={false} />);
    
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('handles keyboard navigation', () => {
    renderWithRouter(<Logo />);
    
    const logoContainer = screen.getByRole('button');
    fireEvent.keyDown(logoContainer, { key: 'Enter' });
    
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('shows loading state', () => {
    renderWithRouter(<Logo loading={true} />);
    
    // Should show loading skeleton instead of image
    expect(screen.queryByAltText('Pick and Partner')).not.toBeInTheDocument();
  });

  it('handles image load error gracefully', () => {
    renderWithRouter(<Logo />);
    
    const image = screen.getByAltText('Pick and Partner');
    fireEvent.error(image);
    
    // Should show fallback logo
    expect(screen.getByText('P&P')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    renderWithRouter(<Logo className="custom-class" />);
    
    const logoContainer = screen.getByRole('button');
    expect(logoContainer).toHaveClass('custom-class');
  });

  it('shows subtitle for large size', () => {
    renderWithRouter(<Logo size="lg" />);
    
    expect(screen.getByText('Email Analysis Platform')).toBeInTheDocument();
  });
});