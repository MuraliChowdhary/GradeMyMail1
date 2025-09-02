import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import FixMyMailMetrics from '../FixMyMailMetrics';
import type { NewsletterMetrics } from '../MetricsDisplay';
import type { GMMeditorMetadata } from '../../../types/gmmeditor';

describe('FixMyMailMetrics', () => {
  const mockOriginalMetrics: NewsletterMetrics = {
    overallGrade: 'C',
    audienceFit: 65,
    tone: 70,
    clarity: 60,
    engagement: 55,
    spamRisk: 30,
    wordCount: 250,
    readingTime: 2,
    summary: ['Test summary'],
    improvements: []
  };

  const mockGMMeditorMetadata: GMMeditorMetadata = {
    model: 'llama-3.1-8b-instant',
    processingTime: 3500,
    toneUsed: 'friendly',
    originalLength: 1200,
    rewrittenLength: 1350
  };

  it('renders original metrics only when no GMMeditor metadata is provided', () => {
    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
      />
    );

    expect(screen.getByText('Original Content Metrics')).toBeInTheDocument();
    expect(screen.getByText('Content quality before improvements')).toBeInTheDocument();
  });

  it('renders before/after comparison when both original metrics and GMMeditor metadata are provided', () => {
    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
        gmmEditorMetadata={mockGMMeditorMetadata}
        isUsingActualGradeMyMailData={true}
      />
    );

    expect(screen.getByText('Content Improvement Analysis')).toBeInTheDocument();
    expect(screen.getByText('Before and after comparison of your content quality')).toBeInTheDocument();
    expect(screen.getByText('Processing Details')).toBeInTheDocument();
    expect(screen.getByText('Before')).toBeInTheDocument();
    expect(screen.getByText('After')).toBeInTheDocument();
    expect(screen.getByText('Original: Grade My Mail analysis')).toBeInTheDocument();
  });

  it('displays processing metadata correctly', () => {
    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
        gmmEditorMetadata={mockGMMeditorMetadata}
      />
    );

    expect(screen.getByText('Model: llama-3.1-8b-instant')).toBeInTheDocument();
    expect(screen.getByText('Processing: 3.5s')).toBeInTheDocument();
    expect(screen.getByText('Tone: friendly')).toBeInTheDocument();
    expect(screen.getByText('Length: 1200 → 1350')).toBeInTheDocument();
  });

  it('shows improvement summary when improvements are calculated', () => {
    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
        gmmEditorMetadata={mockGMMeditorMetadata}
      />
    );

    expect(screen.getByText('Key Improvements Applied')).toBeInTheDocument();
    expect(screen.getByText('Potential clarity improvements')).toBeInTheDocument();
    expect(screen.getByText('Possible tone optimization')).toBeInTheDocument();
    expect(screen.getByText('Estimated readability changes')).toBeInTheDocument();
    expect(screen.getByText('Conservative improvement estimates')).toBeInTheDocument();
  });

  it('renders improved metrics only when no original metrics are provided', () => {
    const mockImprovedMetrics: NewsletterMetrics = {
      overallGrade: 'A',
      audienceFit: 85,
      tone: 90,
      clarity: 88,
      engagement: 82,
      spamRisk: 15,
      wordCount: 280,
      readingTime: 2,
      summary: ['Improved content'],
      improvements: ['Better clarity']
    };

    render(
      <FixMyMailMetrics 
        improvedMetrics={mockImprovedMetrics}
      />
    );

    expect(screen.getByText('Improved Content Metrics')).toBeInTheDocument();
    expect(screen.getByText('Content quality after AI improvements')).toBeInTheDocument();
  });

  it('returns null when no metrics are provided', () => {
    const { container } = render(<FixMyMailMetrics />);
    expect(container.firstChild).toBeNull();
  });

  it('shows warning when using estimated data instead of actual Grade My Mail data', () => {
    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
        gmmEditorMetadata={mockGMMeditorMetadata}
        isUsingActualGradeMyMailData={false}
        isUsingActualImprovedAnalysis={false}
      />
    );

    expect(screen.getByText('Original: Estimated metrics')).toBeInTheDocument();
    expect(screen.getByText('Improved: Estimated (NOT ANALYZED)')).toBeInTheDocument();
  });

  it('shows correct indicators when using real analysis for both original and improved content', () => {
    const mockImprovedMetrics: NewsletterMetrics = {
      overallGrade: 'A',
      audienceFit: 85,
      tone: 90,
      clarity: 88,
      engagement: 82,
      spamRisk: 15,
      wordCount: 280,
      readingTime: 2,
      summary: ['Improved content'],
      improvements: ['Better clarity']
    };

    render(
      <FixMyMailMetrics 
        originalMetrics={mockOriginalMetrics}
        improvedMetrics={mockImprovedMetrics}
        gmmEditorMetadata={mockGMMeditorMetadata}
        isUsingActualGradeMyMailData={true}
        isUsingActualImprovedAnalysis={true}
      />
    );

    expect(screen.getByText('Original: Grade My Mail analysis')).toBeInTheDocument();
    expect(screen.getByText('Improved: Real analysis')).toBeInTheDocument();
  });
});