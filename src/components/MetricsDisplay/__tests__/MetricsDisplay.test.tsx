import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import MetricsDisplay, { type NewsletterMetrics } from '../MetricsDisplay';

const mockMetrics: NewsletterMetrics = {
  overallGrade: 'B',
  clarity: 85,
  engagement: 72,
  tone: 88,
  wordCount: 245,
  readingTime: 2
};

const mockPreviousMetrics: NewsletterMetrics = {
  overallGrade: 'C',
  clarity: 70,
  engagement: 65,
  tone: 75,
  wordCount: 230,
  readingTime: 2
};

describe('MetricsDisplay', () => {
  it('renders metrics correctly', () => {
    render(<MetricsDisplay metrics={mockMetrics} />);

    // Check overall grade
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('Overall Score')).toBeInTheDocument();

    // Check individual metrics
    expect(screen.getByText('Clarity')).toBeInTheDocument();
    expect(screen.getByText('Engagement')).toBeInTheDocument();
    expect(screen.getByText('Tone')).toBeInTheDocument();

    // Check scores
    expect(screen.getByText('85')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument();

    // Check additional stats
    expect(screen.getByText('245 words')).toBeInTheDocument();
    expect(screen.getByText('2 min read')).toBeInTheDocument();
  });

  it('displays comparison when previous metrics are provided', () => {
    render(
      <MetricsDisplay
        metrics={mockMetrics}
        previousMetrics={mockPreviousMetrics}
        showComparison={true}
      />
    );

    // Should show improvement indicators
    expect(screen.getByText('↗')).toBeInTheDocument();
    expect(screen.getByText('12 pts')).toBeInTheDocument(); // Average improvement (82-70=12)
  });

  it('applies correct grade colors', () => {
    const aGradeMetrics: NewsletterMetrics = {
      overallGrade: 'A',
      clarity: 95,
      engagement: 92,
      tone: 98
    };

    render(<MetricsDisplay metrics={aGradeMetrics} />);

    const gradeElement = screen.getByText('A');
    expect(gradeElement).toHaveClass('text-green-600');
  });

  it('handles metrics without additional stats', () => {
    const minimalMetrics: NewsletterMetrics = {
      overallGrade: 'C',
      clarity: 75,
      engagement: 68,
      tone: 72
    };

    render(<MetricsDisplay metrics={minimalMetrics} />);

    // Should not show word count or reading time
    expect(screen.queryByText(/words/)).not.toBeInTheDocument();
    expect(screen.queryByText(/min read/)).not.toBeInTheDocument();
  });

  it('calculates average score correctly when overallGrade is not provided', () => {
    const metricsWithoutGrade = {
      clarity: 80,
      engagement: 70,
      tone: 90
    } as NewsletterMetrics;

    render(<MetricsDisplay metrics={metricsWithoutGrade} />);

    // Average should be 80, which is a B grade
    expect(screen.getByText('B')).toBeInTheDocument();
    expect(screen.getByText('80/100')).toBeInTheDocument();
  });

  it('shows progress bars for each metric', () => {
    render(<MetricsDisplay metrics={mockMetrics} />);

    // Should have progress bars (they have specific styling)
    const progressBars = document.querySelectorAll('.bg-gray-100.rounded-full.h-2');
    expect(progressBars).toHaveLength(3); // One for each metric
  });

  it('applies custom className', () => {
    const { container } = render(
      <MetricsDisplay metrics={mockMetrics} className="custom-class" />
    );

    expect(container.firstChild).toHaveClass('custom-class');
  });
});