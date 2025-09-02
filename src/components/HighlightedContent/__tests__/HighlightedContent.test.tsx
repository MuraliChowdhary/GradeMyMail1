import React from 'react';
import { render, screen } from '@testing-library/react';
import { HighlightedContent } from '../HighlightedContent';

describe('HighlightedContent', () => {
  it('renders plain text without highlights', () => {
    const plainText = 'This is plain text without any highlights.';
    render(<HighlightedContent content={plainText} />);
    
    expect(screen.getByText(plainText)).toBeInTheDocument();
  });

  it('renders hard_to_read highlights correctly', () => {
    const taggedContent = 'This is <hard_to_read>a very long sentence that should be highlighted as hard to read</hard_to_read> content.';
    render(<HighlightedContent content={taggedContent} />);
    
    expect(screen.getByText('a very long sentence that should be highlighted as hard to read')).toBeInTheDocument();
    expect(screen.getByTitle('This sentence is hard to read (clarity issue)')).toBeInTheDocument();
  });

  it('renders fluff highlights correctly', () => {
    const taggedContent = 'This is <fluff>very</fluff> good content.';
    render(<HighlightedContent content={taggedContent} />);
    
    expect(screen.getByText('very')).toBeInTheDocument();
    expect(screen.getByTitle('This word adds unnecessary fluff (clarity issue)')).toBeInTheDocument();
  });

  it('renders spam_words highlights correctly', () => {
    const taggedContent = 'Get this <spam_words>amazing</spam_words> offer now!';
    render(<HighlightedContent content={taggedContent} />);
    
    expect(screen.getByText('amazing')).toBeInTheDocument();
    expect(screen.getByTitle('This word may seem spammy (engagement issue)')).toBeInTheDocument();
  });

  it('renders multiple highlight types correctly', () => {
    const taggedContent = 'This <fluff>very</fluff> <spam_words>amazing</spam_words> <hard_to_read>sentence is way too long and complex for most readers to understand easily</hard_to_read>.';
    render(<HighlightedContent content={taggedContent} />);
    
    expect(screen.getByTitle('This word adds unnecessary fluff (clarity issue)')).toBeInTheDocument();
    expect(screen.getByTitle('This word may seem spammy (engagement issue)')).toBeInTheDocument();
    expect(screen.getByTitle('This sentence is hard to read (clarity issue)')).toBeInTheDocument();
  });

  it('handles empty content gracefully', () => {
    render(<HighlightedContent content="" />);
    
    const container = screen.getByRole('generic');
    expect(container).toBeInTheDocument();
    expect(container).toBeEmptyDOMElement();
  });

  it('applies custom className', () => {
    const customClass = 'custom-highlight-class';
    render(<HighlightedContent content="Test content" className={customClass} />);
    
    expect(screen.getByRole('generic')).toHaveClass('highlighted-content', customClass);
  });
});