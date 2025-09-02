import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ToneSelector from '../ToneSelector';
import type { ToneKey } from '../../../types/gmmeditor';
import { beforeEach } from 'node:test';

describe('ToneSelector', () => {
  const mockOnToneChange = vi.fn();

  beforeEach(() => {
    mockOnToneChange.mockClear();
  });

  it('renders with default props', () => {
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
      />
    );

    expect(screen.getByText('Writing Tone')).toBeInTheDocument();
    expect(screen.getByText('Friendly & conversational')).toBeInTheDocument();
  });

  it('opens dropdown when button is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
      />
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    await user.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Professional & formal')).toBeInTheDocument();
    expect(screen.getByText('Persuasive & motivational')).toBeInTheDocument();
  });

  it('calls onToneChange when option is selected', async () => {
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
      />
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    fireEvent.click(button);

    const professionalOption = screen.getByRole('option', { name: /professional & formal/i });
    fireEvent.click(professionalOption);

    expect(mockOnToneChange).toHaveBeenCalledWith('professional');
  });

  it('closes dropdown when clicking outside', async () => {
    render(
      <div>
        <ToneSelector
          selectedTone="friendly"
          onToneChange={mockOnToneChange}
        />
        <div data-testid="outside">Outside element</div>
      </div>
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    fireEvent.click(button);

    expect(screen.getByRole('listbox')).toBeInTheDocument();

    const outsideElement = screen.getByTestId('outside');
    fireEvent.mouseDown(outsideElement);

    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
      />
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    await user.click(button);

    // Press ArrowDown to select next option
    await user.keyboard('{ArrowDown}');
    expect(mockOnToneChange).toHaveBeenCalledWith('persuasive');

    // Press Escape to close dropdown
    await user.keyboard('{Escape}');
    
    await waitFor(() => {
      expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
    });
  });

  it('shows selected option with check icon', async () => {
    const user = userEvent.setup();
    
    render(
      <ToneSelector
        selectedTone="professional"
        onToneChange={mockOnToneChange}
      />
    );

    const button = screen.getByRole('button', { name: /professional & formal/i });
    await user.click(button);

    const selectedOption = screen.getByRole('option', { selected: true });
    expect(selectedOption).toHaveTextContent('Professional & formal');
    
    // Check icon should be present
    const checkIcon = selectedOption.querySelector('.check-icon');
    expect(checkIcon).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
        disabled={true}
      />
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    expect(button).toBeDisabled();
  });

  it('applies custom className', () => {
    const { container } = render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
        className="custom-class"
      />
    );

    const toneSelector = container.querySelector('.tone-selector');
    expect(toneSelector).toHaveClass('custom-class');
  });

  it('displays all available tone options', async () => {
    render(
      <ToneSelector
        selectedTone="friendly"
        onToneChange={mockOnToneChange}
      />
    );

    const button = screen.getByRole('button', { name: /friendly & conversational/i });
    fireEvent.click(button);

    // Check that all tone options are present using role selectors
    expect(screen.getByRole('option', { name: /professional & formal/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /friendly & conversational/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /persuasive & motivational/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /analytical & insight-driven/i })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: /storytelling with light anecdotes/i })).toBeInTheDocument();
  });
});