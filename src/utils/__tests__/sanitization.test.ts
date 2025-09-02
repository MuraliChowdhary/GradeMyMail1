import { describe, it, expect } from 'vitest';
import { 
  sanitizeHTML, 
  sanitizePastedContent, 
  validateContent, 
  detectSuspiciousContent,
  extractCleanText,
  CONTENT_LIMITS 
} from '../sanitization';

describe('Sanitization Utilities', () => {
  describe('sanitizeHTML', () => {
    it('should remove script tags', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("xss")');
      expect(sanitized).toContain('Safe content');
    });

    it('should preserve safe HTML elements', () => {
      const safeHTML = '<p><strong>Bold</strong> and <em>italic</em> text</p>';
      const sanitized = sanitizeHTML(safeHTML);
      
      expect(sanitized).toContain('<p>');
      expect(sanitized).toContain('<strong>Bold</strong>');
      expect(sanitized).toContain('<em>italic</em>');
    });

    it('should remove dangerous attributes', () => {
      const htmlWithEvents = '<div onclick="alert(1)" onload="alert(2)">Content</div>';
      const sanitized = sanitizeHTML(htmlWithEvents);
      
      expect(sanitized).not.toContain('onclick');
      expect(sanitized).not.toContain('onload');
      expect(sanitized).toContain('Content');
    });

    it('should handle empty or invalid input', () => {
      expect(sanitizeHTML('')).toBe('');
      expect(sanitizeHTML(null as any)).toBe('');
      expect(sanitizeHTML(undefined as any)).toBe('');
    });
  });

  describe('sanitizePastedContent', () => {
    it('should apply stricter sanitization for pasted content', () => {
      const pastedHTML = '<p style="color: red;" class="custom">Styled content</p>';
      const sanitized = sanitizePastedContent(pastedHTML);
      
      expect(sanitized).not.toContain('style=');
      expect(sanitized).not.toContain('class=');
      expect(sanitized).toContain('Styled content');
    });
  });

  describe('validateContent', () => {
    it('should validate normal content as valid', () => {
      const html = '<p>Normal content</p>';
      const plainText = 'Normal content';
      
      const result = validateContent(html, plainText);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.stats.characterCount).toBe(14);
      expect(result.stats.wordCount).toBe(2);
    });

    it('should detect content exceeding character limits', () => {
      const longText = 'a'.repeat(CONTENT_LIMITS.MAX_CHARACTERS + 1);
      const html = `<p>${longText}</p>`;
      
      const result = validateContent(html, longText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('character');
    });

    it('should provide warnings when approaching limits', () => {
      const warningText = 'a'.repeat(CONTENT_LIMITS.WARN_CHARACTERS + 1);
      const html = `<p>${warningText}</p>`;
      
      const result = validateContent(html, warningText);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings[0]).toContain('approaching');
    });

    it('should detect suspicious script content', () => {
      const html = '<script>alert(1)</script><p>Content</p>';
      const plainText = 'Content';
      
      const result = validateContent(html, plainText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('script');
    });
  });

  describe('detectSuspiciousContent', () => {
    it('should detect JavaScript URLs', () => {
      const html = '<a href="javascript:alert(1)">Link</a>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('JavaScript URLs');
    });

    it('should detect event handlers', () => {
      const html = '<div onclick="alert(1)">Content</div>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('Event handlers');
    });

    it('should detect script tags', () => {
      const html = '<script>alert(1)</script>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('Script tags');
    });

    it('should return empty array for safe content', () => {
      const html = '<p>Safe <strong>content</strong></p>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('extractCleanText', () => {
    it('should extract text from HTML', () => {
      const html = '<p>Hello <strong>world</strong>!</p>';
      const text = extractCleanText(html);
      
      expect(text).toBe('Hello world!');
    });

    it('should handle complex HTML structures', () => {
      const html = `
        <div>
          <h1>Title</h1>
          <p>Paragraph with <em>emphasis</em></p>
          <ul>
            <li>Item 1</li>
            <li>Item 2</li>
          </ul>
        </div>
      `;
      const text = extractCleanText(html);
      
      expect(text).toContain('Title');
      expect(text).toContain('Paragraph with emphasis');
      expect(text).toContain('Item 1');
      expect(text).toContain('Item 2');
    });
  });
});