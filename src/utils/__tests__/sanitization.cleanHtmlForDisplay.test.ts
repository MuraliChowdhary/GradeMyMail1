import { cleanHtmlForDisplay } from '../sanitization';

describe('cleanHtmlForDisplay', () => {
  describe('Input Validation', () => {
    it('should return empty string for null input', () => {
      expect(cleanHtmlForDisplay(null as any)).toBe('');
    });

    it('should return empty string for undefined input', () => {
      expect(cleanHtmlForDisplay(undefined as any)).toBe('');
    });

    it('should return empty string for non-string input', () => {
      expect(cleanHtmlForDisplay(123 as any)).toBe('');
      expect(cleanHtmlForDisplay({} as any)).toBe('');
      expect(cleanHtmlForDisplay([] as any)).toBe('');
    });

    it('should return empty string for empty string input', () => {
      expect(cleanHtmlForDisplay('')).toBe('');
    });
  });

  describe('Analysis Tag Removal', () => {
    it('should remove fluff tags', () => {
      const input = 'This is <fluff>really great</fluff> content.';
      const expected = 'This is really great content.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should remove spam_words tags', () => {
      const input = 'Get <spam_words>amazing deals</spam_words> now!';
      const expected = 'Get amazing deals now!';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should remove hard_to_read tags', () => {
      const input = 'This is <hard_to_read>a very complex sentence with lots of words</hard_to_read>.';
      const expected = 'This is a very complex sentence with lots of words.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should remove multiple analysis tags', () => {
      const input = '<fluff>Really</fluff> <spam_words>urgent</spam_words> <hard_to_read>message</hard_to_read>!';
      const expected = 'Really urgent message!';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle nested analysis tags', () => {
      const input = '<fluff>This is <spam_words>really urgent</spam_words> content</fluff>.';
      const expected = 'This is really urgent content.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('HTML Block Element Conversion', () => {
    it('should convert paragraph tags to line breaks', () => {
      const input = '<p>Paragraph 1</p><p>Paragraph 2</p>';
      const expected = 'Paragraph 1\nParagraph 2';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert div tags to line breaks', () => {
      const input = '<div>Content 1</div><div>Content 2</div>';
      const expected = 'Content 1\nContent 2';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert heading tags to line breaks', () => {
      const input = '<h1>Title</h1><h2>Subtitle</h2><p>Content</p>';
      const expected = 'Title\nSubtitle\nContent';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert list elements', () => {
      const input = '<ul><li>Item 1</li><li>Item 2</li></ul>';
      const expected = 'Item 1\nItem 2';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert br tags to line breaks', () => {
      const input = 'Line 1<br>Line 2<br/>Line 3';
      const expected = 'Line 1\nLine 2\nLine 3';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('Inline Formatting Preservation', () => {
    it('should convert strong tags to markdown bold', () => {
      const input = 'This is <strong>bold</strong> text.';
      const expected = 'This is **bold** text.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert b tags to markdown bold', () => {
      const input = 'This is <b>bold</b> text.';
      const expected = 'This is **bold** text.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert em tags to markdown italic', () => {
      const input = 'This is <em>italic</em> text.';
      const expected = 'This is *italic* text.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert i tags to markdown italic', () => {
      const input = 'This is <i>italic</i> text.';
      const expected = 'This is *italic* text.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should convert u tags to markdown underline', () => {
      const input = 'This is <u>underlined</u> text.';
      const expected = 'This is _underlined_ text.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle links with href', () => {
      const input = 'Visit <a href="https://example.com">our website</a> for more info.';
      const expected = 'Visit our website (https://example.com) for more info.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle links without href', () => {
      const input = 'Visit <a>our website</a> for more info.';
      const expected = 'Visit our website for more info.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('HTML Entity Decoding', () => {
    it('should decode common HTML entities', () => {
      const input = 'Price: &pound;100 &amp; free shipping!';
      const expected = 'Price: £100 & free shipping!';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should decode numeric HTML entities', () => {
      const input = 'Copyright &#169; 2024';
      const expected = 'Copyright © 2024';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should decode hexadecimal HTML entities', () => {
      const input = 'Copyright &#xa9; 2024';
      const expected = 'Copyright © 2024';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should decode multiple entities', () => {
      const input = '&quot;Hello&quot; &amp; &lt;goodbye&gt;';
      const expected = '"Hello" & <goodbye>';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should decode special punctuation entities', () => {
      const input = 'It&rsquo;s a &ldquo;great&rdquo; day&hellip;';
      const expected = 'It\'s a "great" day...';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('Whitespace Normalization', () => {
    it('should normalize multiple spaces to single space', () => {
      const input = 'This  has    multiple   spaces.';
      const expected = 'This has multiple spaces.';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should limit consecutive line breaks to maximum of 2', () => {
      const input = 'Line 1\n\n\n\n\nLine 2';
      const expected = 'Line 1\n\nLine 2';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should remove spaces at start and end of lines', () => {
      const input = '  Line with spaces  \n  Another line  ';
      const expected = 'Line with spaces\nAnother line';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should remove leading and trailing newlines', () => {
      const input = '\n\n\nContent here\n\n\n';
      const expected = 'Content here';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should trim the final result', () => {
      const input = '   Content with spaces   ';
      const expected = 'Content with spaces';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('Complex HTML Content', () => {
    it('should handle complex nested HTML with analysis tags', () => {
      const input = `
        <div>
          <h1>Newsletter Title</h1>
          <p>This is <fluff>really great</fluff> content with <spam_words>amazing deals</spam_words>.</p>
          <p>Visit <a href="https://example.com">our website</a> for <strong>more info</strong>.</p>
          <ul>
            <li>Feature 1</li>
            <li>Feature 2</li>
          </ul>
        </div>
      `;
      const expected = 'Newsletter Title\nThis is really great content with amazing deals.\nVisit our website (https://example.com) for **more info**.\nFeature 1\nFeature 2';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle malformed HTML gracefully', () => {
      const input = '<p>Unclosed paragraph<div>Mixed tags</p></div>';
      const result = cleanHtmlForDisplay(input);
      expect(result).toBe('Unclosed paragraph\nMixed tags');
    });

    it('should handle empty tags', () => {
      const input = '<p></p><div></div>Content<span></span>';
      const expected = 'Content';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const input = `<p>${longContent}</p>`;
      const expected = longContent;
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle content with only HTML tags', () => {
      const input = '<div><p></p><span></span></div>';
      const expected = '';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle content with only analysis tags', () => {
      const input = '<fluff></fluff><spam_words></spam_words>';
      const expected = '';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle mixed content with special characters', () => {
      const input = '<p>Price: $100 & €50 (£40)</p>';
      const expected = 'Price: $100 & €50 (£40)';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });

    it('should handle content with script tags (security)', () => {
      const input = '<p>Safe content</p><script>alert("xss")</script><p>More content</p>';
      const expected = 'Safe content\nalert("xss")\nMore content';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should handle extremely nested HTML', () => {
      const nestedDivs = '<div>'.repeat(100) + 'Content' + '</div>'.repeat(100);
      const result = cleanHtmlForDisplay(nestedDivs);
      expect(result).toContain('Content');
    });

    it('should not throw errors on malformed entities', () => {
      const input = 'Invalid entities: &invalid; &#999999; &#xZZZZ;';
      expect(() => cleanHtmlForDisplay(input)).not.toThrow();
    });

    it('should handle regex-breaking characters', () => {
      const input = '<p>Content with [brackets] and (parentheses) and {braces}</p>';
      const expected = 'Content with [brackets] and (parentheses) and {braces}';
      expect(cleanHtmlForDisplay(input)).toBe(expected);
    });
  });
});