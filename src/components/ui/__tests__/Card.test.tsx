import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import Card from '../Card';

describe('Card Component', () => {
  it('renders default card correctly', () => {
    render(<Card>Card content</Card>);
    const card = screen.getByText('Card content');
    expect(card).toBeInTheDocument();
    expect(card).toHaveClass('card', 'card-default');
  });

  it('renders compact variant', () => {
    render(<Card variant="compact">Compact card</Card>);
    const card = screen.getByText('Compact card');
    expect(card).toHaveClass('card-compact');
  });

  it('renders spacious variant', () => {
    render(<Card variant="spacious">Spacious card</Card>);
    const card = screen.getByText('Spacious card');
    expect(card).toHaveClass('card-spacious');
  });

  it('renders minimal variant', () => {
    render(<Card variant="minimal">Minimal card</Card>);
    const card = screen.getByText('Minimal card');
    expect(card).toHaveClass('card-minimal');
  });

  it('renders elevated variant', () => {
    render(<Card variant="elevated">Elevated card</Card>);
    const card = screen.getByText('Elevated card');
    expect(card).toHaveClass('card-elevated');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable card</Card>);
    const card = screen.getByText('Clickable card');
    expect(card).toHaveClass('card-clickable');
    
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies hover class by default', () => {
    render(<Card>Hoverable card</Card>);
    const card = screen.getByText('Hoverable card');
    expect(card).toHaveClass('card-hover');
  });

  it('can disable hover', () => {
    render(<Card hover={false}>No hover card</Card>);
    const card = screen.getByText('No hover card');
    expect(card).not.toHaveClass('card-hover');
  });

  it('can disable border', () => {
    render(<Card border={false}>Borderless card</Card>);
    const card = screen.getByText('Borderless card');
    expect(card).toHaveClass('card-borderless');
  });
});