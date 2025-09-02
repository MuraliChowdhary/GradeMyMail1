import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Input from '../Input';

describe('Input Component', () => {
  it('renders default input correctly', () => {
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    expect(input).toBeInTheDocument();
    expect(input).toHaveClass('input', 'input-default');
  });

  it('renders with label', () => {
    render(<Input label="Username" placeholder="Enter username" />);
    expect(screen.getByText('Username')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter username')).toBeInTheDocument();
  });

  it('renders minimal variant', () => {
    render(<Input variant="minimal" placeholder="Minimal input" />);
    const input = screen.getByPlaceholderText('Minimal input');
    expect(input).toHaveClass('input-minimal');
  });

  it('renders ghost variant', () => {
    render(<Input variant="ghost" placeholder="Ghost input" />);
    const input = screen.getByPlaceholderText('Ghost input');
    expect(input).toHaveClass('input-ghost');
  });

  it('shows error state', () => {
    render(<Input error="This field is required" placeholder="Error input" />);
    const input = screen.getByPlaceholderText('Error input');
    expect(input).toHaveClass('input-error');
    expect(screen.getByText('This field is required')).toBeInTheDocument();
  });

  it('renders with icon', () => {
    const icon = <span data-testid="search-icon">🔍</span>;
    render(<Input icon={icon} placeholder="Search" />);
    expect(screen.getByTestId('search-icon')).toBeInTheDocument();
  });

  it('applies fullWidth by default', () => {
    render(<Input placeholder="Full width" />);
    const container = screen.getByPlaceholderText('Full width').closest('.input-container');
    expect(container).toHaveClass('w-full');
  });

  it('can disable fullWidth', () => {
    render(<Input fullWidth={false} placeholder="Not full width" />);
    const container = screen.getByPlaceholderText('Not full width').closest('.input-container');
    expect(container).not.toHaveClass('w-full');
  });
});