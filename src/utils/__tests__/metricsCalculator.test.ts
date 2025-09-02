import { describe, it, expect } from 'vitest';
import {
  extractIssuesFromTaggedContent,
  calculateReadingTime,
  countWords,
  calculateMetricScores,
  scoreToGrade,
  calculateNewsletterMetrics,
  generateSampleMetrics
} from '../metricsCalculator';

describe('metricsCalculator', () => {
  describe('extractIssuesFromTaggedContent', () => {
    it('extracts issues from tagged content correctly', () => {
      const taggedContent = `
        <fluff>I hope this email finds you well</fluff> and 
        <spam_words>amazing opportunity</spam_words> for 
        <hard_to_read>synergistic solutions</hard_to_read>.
      `;
      
      const issues = extractIssuesFromTaggedContent(taggedContent);
      
      expect(issues).toHaveLength(3);
      expect(issues[0].type).toBe('clarity');
      expect(issues[0].text).toBe('I hope this email finds you well');
      expect(issues[1].type).toBe('engagement');
      expect(issues[1].text).toBe('amazing opportunity');
      expect(issues[2].type).toBe('tone');
      expect(issues[2].text).toBe('synergistic solutions');
    });

    it('handles content with no issues', () => {
      const taggedContent = 'This is clean content with no issues.';
      const issues = extractIssuesFromTaggedContent(taggedContent);
      
      expect(issues).toHaveLength(0);
    });

    it('handles multiple issues of the same type', () => {
      const taggedContent = `
        <fluff>first issue</fluff> and <fluff>second issue</fluff>
      `;
      
      const issues = extractIssuesFromTaggedContent(taggedContent);
      
      expect(issues).toHaveLength(2);
      expect(issues[0].type).toBe('clarity');
      expect(issues[1].type).toBe('clarity');
    });
  });

  describe('calculateReadingTime', () => {
    it('calculates reading time correctly', () => {
      expect(calculateReadingTime(200)).toBe(1); // 200 words = 1 minute
      expect(calculateReadingTime(400)).toBe(2); // 400 words = 2 minutes
      expect(calculateReadingTime(150)).toBe(1); // Rounds up
    });

    it('handles zero words', () => {
      expect(calculateReadingTime(0)).toBe(0);
    });
  });

  describe('countWords', () => {
    it('counts words correctly', () => {
      expect(countWords('Hello world')).toBe(2);
      expect(countWords('  Hello   world  ')).toBe(2); // Handles extra spaces
      expect(countWords('')).toBe(0);
      expect(countWords('   ')).toBe(0); // Only spaces
    });

    it('handles complex text', () => {
      const text = 'This is a test email with multiple sentences. It has punctuation!';
      expect(countWords(text)).toBe(11); // Actual word count
    });

    it('strips HTML tags correctly', () => {
      const htmlText = '<p class="editor-paragraph"><span style="white-space: pre-wrap;">what is your name?</span></p><p class="editor-paragraph"><br></p>';
      expect(countWords(htmlText)).toBe(4);
    });

    it('handles HTML with no text content', () => {
      const emptyHtml = '<p><br></p>';
      expect(countWords(emptyHtml)).toBe(0);
    });
  });

  describe('calculateMetricScores', () => {
    it('calculates scores based on issue density', () => {
      const issues = [
        { type: 'clarity' as const, text: 'issue1', severity: 'medium' as const, position: { start: 0, end: 6 } },
        { type: 'clarity' as const, text: 'issue2', severity: 'medium' as const, position: { start: 7, end: 13 } },
        { type: 'engagement' as const, text: 'issue3', severity: 'medium' as const, position: { start: 14, end: 20 } }
      ];
      
      const scores = calculateMetricScores(issues, 100); // 100 words
      
      expect(scores.clarity).toBe(80); // 2 issues per 100 words = 20 point deduction
      expect(scores.engagement).toBe(90); // 1 issue per 100 words = 10 point deduction
      expect(scores.tone).toBe(100); // No tone issues
    });

    it('handles zero word count', () => {
      const issues = [
        { type: 'clarity' as const, text: 'issue', severity: 'medium' as const, position: { start: 0, end: 5 } }
      ];
      
      const scores = calculateMetricScores(issues, 0);
      
      expect(scores.clarity).toBe(100);
      expect(scores.engagement).toBe(100);
      expect(scores.tone).toBe(100);
    });

    it('enforces minimum score of 20', () => {
      const manyIssues = Array.from({ length: 20 }, (_, i) => ({
        type: 'clarity' as const,
        text: `issue${i}`,
        severity: 'medium' as const,
        position: { start: i * 5, end: (i + 1) * 5 }
      }));
      
      const scores = calculateMetricScores(manyIssues, 10); // Very high issue density
      
      expect(scores.clarity).toBe(20); // Should not go below 20
    });
  });

  describe('scoreToGrade', () => {
    it('converts scores to correct grades', () => {
      expect(scoreToGrade(95)).toBe('A');
      expect(scoreToGrade(90)).toBe('A');
      expect(scoreToGrade(85)).toBe('B');
      expect(scoreToGrade(80)).toBe('B');
      expect(scoreToGrade(75)).toBe('C');
      expect(scoreToGrade(70)).toBe('C');
      expect(scoreToGrade(65)).toBe('D');
      expect(scoreToGrade(60)).toBe('D');
      expect(scoreToGrade(55)).toBe('F');
      expect(scoreToGrade(0)).toBe('F');
    });
  });

  describe('calculateNewsletterMetrics', () => {
    it('calculates complete metrics from tagged content', () => {
      const taggedContent = '<fluff>unnecessary text</fluff> and <spam_words>buy now</spam_words>';
      const originalText = 'This is a test newsletter with some unnecessary text and buy now call to action.';
      
      const metrics = calculateNewsletterMetrics(taggedContent, originalText);
      
      expect(metrics.overallGrade).toBeDefined();
      expect(metrics.clarity).toBeGreaterThan(0);
      expect(metrics.engagement).toBeGreaterThan(0);
      expect(metrics.tone).toBeGreaterThan(0);
      expect(metrics.wordCount).toBe(15);
      expect(metrics.readingTime).toBe(1);
    });

    it('handles content with no issues', () => {
      const taggedContent = 'Clean content with no issues';
      const originalText = 'Clean content with no issues';
      
      const metrics = calculateNewsletterMetrics(taggedContent, originalText);
      
      expect(metrics.clarity).toBe(100);
      expect(metrics.engagement).toBe(100);
      expect(metrics.tone).toBe(100);
      expect(metrics.overallGrade).toBe('A');
    });
  });

  describe('generateSampleMetrics', () => {
    it('generates sample metrics with default values', () => {
      const metrics = generateSampleMetrics();
      
      expect(metrics.clarity).toBe(75);
      expect(metrics.engagement).toBe(68);
      expect(metrics.tone).toBe(82);
      expect(metrics.overallGrade).toBe('C'); // Average of 75
      expect(metrics.wordCount).toBe(245);
      expect(metrics.readingTime).toBe(2);
    });

    it('generates sample metrics with custom values', () => {
      const metrics = generateSampleMetrics(90, 85, 95);
      
      expect(metrics.clarity).toBe(90);
      expect(metrics.engagement).toBe(85);
      expect(metrics.tone).toBe(95);
      expect(metrics.overallGrade).toBe('A'); // Average of 90
    });
  });
});