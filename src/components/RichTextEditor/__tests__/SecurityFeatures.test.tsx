import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import RichTextEditor from '../RichTextEditor';
import type { RichTextEditorRef } from '../RichTextEditor';
import { sanitizeHTML, sanitizePastedContent, validateContent, detectSuspiciousContent } from '../../../utils/sanitization';
import { AutoSaveManager } from '../../../utils/autoSave';
import React from 'react';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('RichTextEditor Security Features', () => {
  let editorRef: React.RefObject<RichTextEditorRef | null>;
  
  beforeEach(() => {
    editorRef = React.createRef();
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Content Sanitization', () => {
    it('should sanitize HTML content to prevent XSS', () => {
      const maliciousHTML = '<script>alert("xss")</script><p>Safe content</p>';
      const sanitized = sanitizeHTML(maliciousHTML);
      
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('alert("xss")');
      expect(sanitized).toContain('Safe content');
    });

    it('should preserve safe formatting while removing dangerous elements', () => {
      const htmlWithMixedContent = `
        <p>Normal paragraph</p>
        <strong>Bold text</strong>
        <script>alert('danger')</script>
        <a href="javascript:alert('xss')">Dangerous link</a>
        <a href="https://example.com">Safe link</a>
      `;
      
      const sanitized = sanitizeHTML(htmlWithMixedContent);
      
      expect(sanitized).toContain('<p>Normal paragraph</p>');
      expect(sanitized).toContain('<strong>Bold text</strong>');
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).not.toContain('javascript:alert');
      expect(sanitized).toContain('https://example.com');
    });

    it('should apply stricter sanitization for pasted content', () => {
      const pastedHTML = `
        <p style="color: red;">Styled paragraph</p>
        <div class="custom-class">Div with class</div>
        <strong>Bold text</strong>
      `;
      
      const sanitized = sanitizePastedContent(pastedHTML);
      
      expect(sanitized).not.toContain('style=');
      expect(sanitized).not.toContain('class=');
      expect(sanitized).toContain('<strong>Bold text</strong>');
    });
  });

  describe('Content Validation', () => {
    it('should validate content length and provide stats', () => {
      const html = '<p>Test content</p>';
      const plainText = 'Test content';
      
      const result = validateContent(html, plainText);
      
      expect(result.isValid).toBe(true);
      expect(result.stats.characterCount).toBe(12);
      expect(result.stats.wordCount).toBe(2);
      expect(result.stats.htmlSize).toBeGreaterThan(0);
    });

    it('should detect content that exceeds limits', () => {
      const longText = 'a'.repeat(60000); // Exceeds MAX_CHARACTERS
      const html = `<p>${longText}</p>`;
      
      const result = validateContent(html, longText);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain(expect.stringContaining('character limit'));
    });

    it('should provide warnings when approaching limits', () => {
      const warningText = 'a'.repeat(45000); // Between WARN and MAX
      const html = `<p>${warningText}</p>`;
      
      const result = validateContent(html, warningText);
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain(expect.stringContaining('approaching character limit'));
    });
  });

  describe('Suspicious Content Detection', () => {
    it('should detect JavaScript URLs', () => {
      const html = '<a href="javascript:alert(1)">Click me</a>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('JavaScript URLs');
    });

    it('should detect event handlers', () => {
      const html = '<div onclick="alert(1)">Click me</div>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('Event handlers');
    });

    it('should detect script tags', () => {
      const html = '<script>alert(1)</script>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toContain('Script tags');
    });

    it('should return empty array for safe content', () => {
      const html = '<p>Safe content with <strong>formatting</strong></p>';
      const issues = detectSuspiciousContent(html);
      
      expect(issues).toHaveLength(0);
    });
  });

  describe('Auto-save Functionality', () => {
    it('should create auto-save manager with correct options', () => {
      const manager = new AutoSaveManager({
        key: 'test-key',
        debounceMs: 1000,
        maxVersions: 3
      });
      
      expect(manager).toBeDefined();
    });

    it('should save content to localStorage', async () => {
      const manager = new AutoSaveManager({
        key: 'test-key',
        debounceMs: 100,
        maxVersions: 3
      });
      
      manager.save('<p>Test content</p>', 'Test content');
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('Test content')
      );
    });

    it('should restore saved content', () => {
      const savedData = {
        html: '<p>Saved content</p>',
        plainText: 'Saved content',
        timestamp: Date.now(),
        version: 1
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const manager = new AutoSaveManager({
        key: 'test-key',
        debounceMs: 1000,
        maxVersions: 3
      });
      
      const restored = manager.restore();
      
      expect(restored).toEqual(savedData);
    });

    it('should clear saved content', () => {
      const manager = new AutoSaveManager({
        key: 'test-key',
        debounceMs: 1000,
        maxVersions: 3
      });
      
      manager.clear();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
    });
  });

  describe('Editor Integration', () => {
    it('should render editor with security features enabled', () => {
      render(
        <RichTextEditor
          ref={editorRef}
          enableAutoSave={true}
          showValidation={true}
          autoSaveKey="test-editor"
        />
      );
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByText(/Auto-save enabled/)).toBeInTheDocument();
    });

    it('should show validation feedback for invalid content', async () => {
      const onValidationChange = vi.fn();
      
      render(
        <RichTextEditor
          ref={editorRef}
          showValidation={true}
          onValidationChange={onValidationChange}
        />
      );
      
      const editor = screen.getByRole('textbox');
      
      // Type content that exceeds limits
      const longText = 'a'.repeat(60000);
      await userEvent.type(editor, longText);
      
      await waitFor(() => {
        expect(onValidationChange).toHaveBeenCalledWith(
          expect.objectContaining({
            isValid: false,
            errors: expect.arrayContaining([
              expect.stringContaining('character limit')
            ])
          })
        );
      });
    });

    it('should handle paste warnings', async () => {
      const onPasteWarning = vi.fn();
      
      render(
        <RichTextEditor
          ref={editorRef}
          showValidation={true}
          onPasteWarning={onPasteWarning}
        />
      );
      
      const editor = screen.getByRole('textbox');
      
      // Simulate paste with suspicious content
      const clipboardData = {
        getData: vi.fn((type) => {
          if (type === 'text/html') {
            return '<script>alert("xss")</script><p>Content</p>';
          }
          return 'Content';
        })
      };
      
      const pasteEvent = new ClipboardEvent('paste', {
        clipboardData: clipboardData as any
      });
      
      fireEvent(editor, pasteEvent);
      
      await waitFor(() => {
        expect(onPasteWarning).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.stringContaining('Script tags')
          ])
        );
      });
    });
  });

  describe('Editor Ref Methods', () => {
    it('should sanitize HTML when getting content', async () => {
      render(<RichTextEditor ref={editorRef} />);
      
      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });
      
      // Set content with potentially dangerous HTML
      editorRef.current!.setContent('<script>alert("xss")</script><p>Safe content</p>');
      
      const html = editorRef.current!.getHTML();
      
      expect(html).not.toContain('<script>');
      expect(html).toContain('Safe content');
    });

    it('should provide auto-save methods', async () => {
      render(
        <RichTextEditor 
          ref={editorRef} 
          enableAutoSave={true}
          autoSaveKey="test-ref"
        />
      );
      
      await waitFor(() => {
        expect(editorRef.current).toBeTruthy();
      });
      
      expect(typeof editorRef.current!.saveNow).toBe('function');
      expect(typeof editorRef.current!.restoreAutoSave).toBe('function');
      expect(typeof editorRef.current!.clearAutoSave).toBe('function');
      expect(typeof editorRef.current!.hasAutoSave).toBe('function');
    });
  });
});