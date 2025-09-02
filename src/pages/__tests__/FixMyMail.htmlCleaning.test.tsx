import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { vi } from 'vitest';
import FixMyMail from '../FixMyMail';
import { cleanHtmlForDisplay } from '../../utils/sanitization';

// Mock the required modules
vi.mock('../../utils/navigationUtils', () => ({
  NavigationManager: {
    loadEmailDataForFixMyMail: vi.fn()
  }
}));

vi.mock('../../services/api', () => ({
  apiService: {
    fixEmail: vi.fn(),
    analyzeNewsletter: vi.fn()
  }
}));

vi.mock('../../contexts/LoadingContext', () => ({
  useLoading: () => ({
    startLoading: vi.fn(),
    updateProgress: vi.fn(),
    stopLoading: vi.fn()
  })
}));

vi.mock('../../hooks/useErrorHandler', () => ({
  useErrorHandler: () => ({
    handleAsyncError: vi.fn(),
    clearError: vi.fn(),
    enableFallbackMode: vi.fn()
  })
}));

vi.mock('../../store', () => ({
  useAppStore: () => ({
    error: null
  })
}));

describe('FixMyMail HTML Cleaning Integration', () => {
  describe('cleanHtmlForDisplay function', () => {
    it('should properly clean HTML content with analysis tags', () => {
      const htmlContent = `
        <div>
          <h1>Newsletter Title</h1>
          <p>This is <fluff>really great</fluff> content with <spam_words>amazing deals</spam_words>.</p>
          <p>Visit <a href="https://example.com">our website</a> for <strong>more info</strong>.</p>
        </div>
      `;
      
      const result = cleanHtmlForDisplay(htmlContent);
      
      // Should remove HTML tags
      expect(result).not.toContain('<div>');
      expect(result).not.toContain('<p>');
      expect(result).not.toContain('<h1>');
      
      // Should remove analysis tags
      expect(result).not.toContain('<fluff>');
      expect(result).not.toContain('</fluff>');
      expect(result).not.toContain('<spam_words>');
      expect(result).not.toContain('</spam_words>');
      
      // Should preserve text content
      expect(result).toContain('Newsletter Title');
      expect(result).toContain('really great');
      expect(result).toContain('amazing deals');
      expect(result).toContain('our website');
      
      // Should convert formatting
      expect(result).toContain('**more info**');
      expect(result).toContain('our website (https://example.com)');
    });

    it('should handle complex email content with multiple issues', () => {
      const complexContent = `
        <html>
          <body>
            <div class="header">
              <h1>Special <spam_words>Limited Time</spam_words> Offer!</h1>
            </div>
            <div class="content">
              <p>Dear Customer,</p>
              <p>We are <fluff>absolutely thrilled</fluff> to announce our <spam_words>amazing</spam_words> new product!</p>
              <ul>
                <li>Feature 1: <hard_to_read>This is a very long and complex description that might be difficult for users to understand and process</hard_to_read></li>
                <li>Feature 2: Simple and clear</li>
              </ul>
              <p>Visit <a href="https://example.com/offer">our special page</a> for <strong>exclusive deals</strong>!</p>
              <p>Price: &pound;99.99 &amp; free shipping!</p>
            </div>
          </body>
        </html>
      `;
      
      const result = cleanHtmlForDisplay(complexContent);
      
      // Should not contain any HTML tags
      expect(result).not.toMatch(/<[^>]*>/);
      
      // Should not contain analysis tags
      expect(result).not.toContain('<spam_words>');
      expect(result).not.toContain('<fluff>');
      expect(result).not.toContain('<hard_to_read>');
      
      // Should preserve and clean content
      expect(result).toContain('Special Limited Time Offer!');
      expect(result).toContain('absolutely thrilled');
      expect(result).toContain('amazing');
      expect(result).toContain('This is a very long and complex description');
      expect(result).toContain('**exclusive deals**');
      expect(result).toContain('our special page (https://example.com/offer)');
      expect(result).toContain('£99.99 & free shipping!');
    });

    it('should handle edge cases gracefully', () => {
      // Empty content
      expect(cleanHtmlForDisplay('')).toBe('');
      
      // Only HTML tags
      expect(cleanHtmlForDisplay('<div><p></p></div>')).toBe('');
      
      // Only analysis tags
      expect(cleanHtmlForDisplay('<fluff></fluff><spam_words></spam_words>')).toBe('');
      
      // Malformed HTML
      const malformed = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
      const result = cleanHtmlForDisplay(malformed);
      expect(result).toBe('Unclosed paragraph\nMixed tags');
    });

    it('should maintain performance with large content', () => {
      const largeContent = '<p>' + 'A'.repeat(10000) + '</p>';
      const startTime = performance.now();
      const result = cleanHtmlForDisplay(largeContent);
      const endTime = performance.now();
      
      expect(result).toBe('A'.repeat(10000));
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
    });
  });

  describe('Error handling', () => {
    it('should handle invalid input gracefully', () => {
      expect(() => cleanHtmlForDisplay(null as any)).not.toThrow();
      expect(() => cleanHtmlForDisplay(undefined as any)).not.toThrow();
      expect(() => cleanHtmlForDisplay(123 as any)).not.toThrow();
      expect(() => cleanHtmlForDisplay({} as any)).not.toThrow();
    });

    it('should provide fallback for processing errors', () => {
      // Test with content that might cause regex issues
      const problematicContent = '<p>Content with [brackets] and (parentheses) and {braces}</p>';
      expect(() => cleanHtmlForDisplay(problematicContent)).not.toThrow();
      
      const result = cleanHtmlForDisplay(problematicContent);
      expect(result).toContain('Content with [brackets] and (parentheses) and {braces}');
    });
  });
});