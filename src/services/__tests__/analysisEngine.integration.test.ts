import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { waitFor } from '@testing-library/react';
import { analyzeContent, fixContent } from '../analysisEngine';
import { 
  mockAIResponses, 
  mockApiServer, 
  setupTestEnvironment, 
  cleanupTestEnvironment 
} from '@/test-utils/mocks';

describe('Analysis Engine Integration', () => {
  beforeEach(() => {
    setupTestEnvironment();
  });

  afterEach(() => {
    cleanupTestEnvironment();
  });

  describe('analyzeContent', () => {
    it('successfully analyzes content with multiple issue types', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.multipleIssues);
      
      const content = 'Hey there! I hope this email finds you well. We have AMAZING DEALS that you CANNOT MISS!';
      const result = await analyzeContent(content);
      
      expect(result).toBeDefined();
      expect(result.message.content).toContain('<fluff>');
      expect(result.message.content).toContain('<spam_words>');
      expect(result.message.content).toContain('<hard_to_read>');
    });

    it('handles content with only fluff issues', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.fluffOnly);
      
      const content = 'I hope this email finds you well. I wanted to reach out regarding the project.';
      const result = await analyzeContent(content);
      
      expect(result.message.content).toContain('<fluff>');
      expect(result.message.content).not.toContain('<spam_words>');
      expect(result.message.content).not.toContain('<hard_to_read>');
    });

    it('handles content with only spam words', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.spamWordsOnly);
      
      const content = 'Check out our AMAZING DEALS and LIMITED TIME OFFERS!';
      const result = await analyzeContent(content);
      
      expect(result.message.content).toContain('<spam_words>');
      expect(result.message.content).not.toContain('<fluff>');
      expect(result.message.content).not.toContain('<hard_to_read>');
    });

    it('handles content with only hard-to-read sentences', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.hardToReadOnly);
      
      const content = 'The project status update includes multiple interconnected components...';
      const result = await analyzeContent(content);
      
      expect(result.message.content).toContain('<hard_to_read>');
      expect(result.message.content).not.toContain('<fluff>');
      expect(result.message.content).not.toContain('<spam_words>');
    });

    it('handles well-written content with no issues', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.noIssues);
      
      const content = 'This is a well-written professional email with clear communication.';
      const result = await analyzeContent(content);
      
      expect(result.message.content).not.toContain('<fluff>');
      expect(result.message.content).not.toContain('<spam_words>');
      expect(result.message.content).not.toContain('<hard_to_read>');
    });

    it('handles empty content gracefully', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.emptyContent);
      
      const result = await analyzeContent('');
      
      expect(result.message.content).toBe('');
    });

    it('handles API errors gracefully', async () => {
      mockApiServer.error(500, 'Analysis service temporarily unavailable');
      
      await expect(analyzeContent('Test content')).rejects.toThrow('Analysis service temporarily unavailable');
    });

    it('handles network errors with retry logic', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAIResponses.analyze.success),
        });
      });
      
      const result = await analyzeContent('Test content');
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });

    it('handles timeout errors', async () => {
      mockApiServer.error(408, 'Request timeout - please try again');
      
      await expect(analyzeContent('Test content')).rejects.toThrow('Request timeout - please try again');
    });

    it('validates input content', async () => {
      // Test with null/undefined
      await expect(analyzeContent(null as any)).rejects.toThrow();
      await expect(analyzeContent(undefined as any)).rejects.toThrow();
      
      // Test with non-string input
      await expect(analyzeContent(123 as any)).rejects.toThrow();
      await expect(analyzeContent({} as any)).rejects.toThrow();
    });

    it('handles very long content', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const longContent = 'A'.repeat(10000);
      const result = await analyzeContent(longContent);
      
      expect(result).toBeDefined();
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/analyze'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          body: expect.stringContaining(longContent),
        })
      );
    });

    it('handles special characters and unicode', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const unicodeContent = 'Hello 👋 World! Special chars: @#$%^&*() 中文 العربية';
      const result = await analyzeContent(unicodeContent);
      
      expect(result).toBeDefined();
    });
  });

  describe('fixContent', () => {
    it('successfully fixes content with multiple improvements', async () => {
      mockApiServer.fix(mockAIResponses.fix.multipleImprovements);
      
      const taggedContent = 'I hope this email finds you well. We have AMAZING DEALS that you CANNOT MISS!';
      const result = await fixContent(taggedContent);
      
      expect(result.message.content).toContain('<old_draft>');
      expect(result.message.content).toContain('<optimized_draft>');
      expect(result.message.content).toContain('I hope you\'re doing well.');
      expect(result.message.content).toContain('great offers');
    });

    it('handles single improvement', async () => {
      mockApiServer.fix(mockAIResponses.fix.singleImprovement);
      
      const taggedContent = 'I wanted to reach out regarding the project.';
      const result = await fixContent(taggedContent);
      
      expect(result.message.content).toContain('<old_draft>I wanted to reach out</old_draft>');
      expect(result.message.content).toContain('<optimized_draft>I\'m writing to discuss</optimized_draft>');
    });

    it('handles content with no improvements needed', async () => {
      mockApiServer.fix(mockAIResponses.fix.noImprovements);
      
      const taggedContent = 'This is already well-written content.';
      const result = await fixContent(taggedContent);
      
      expect(result.message.content).toBe('');
    });

    it('handles partial success scenarios', async () => {
      mockApiServer.fix(mockAIResponses.fix.partialSuccess);
      
      const taggedContent = 'Some content with mixed quality.';
      const result = await fixContent(taggedContent);
      
      expect(result.message.content).toContain('<old_draft>');
      expect(result.message.content).toContain('<optimized_draft>');
    });

    it('handles API errors gracefully', async () => {
      mockApiServer.error(500, 'Improvement service temporarily unavailable');
      
      await expect(fixContent('Tagged content')).rejects.toThrow('Improvement service temporarily unavailable');
    });

    it('handles invalid tagged content format', async () => {
      mockApiServer.error(400, 'Invalid tagged content format');
      
      await expect(fixContent('Invalid format')).rejects.toThrow('Invalid tagged content format');
    });

    it('validates input content', async () => {
      // Test with null/undefined
      await expect(fixContent(null as any)).rejects.toThrow();
      await expect(fixContent(undefined as any)).rejects.toThrow();
      
      // Test with non-string input
      await expect(fixContent(123 as any)).rejects.toThrow();
      await expect(fixContent({} as any)).rejects.toThrow();
    });

    it('handles network errors with retry logic', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount < 3) {
          return Promise.reject(new Error('Network error'));
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAIResponses.fix.success),
        });
      });
      
      const result = await fixContent('Tagged content');
      
      expect(global.fetch).toHaveBeenCalledTimes(3);
      expect(result).toBeDefined();
    });
  });

  describe('Performance Tests', () => {
    it('completes analysis within acceptable time limits', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const startTime = performance.now();
      await analyzeContent('Test content for performance');
      const endTime = performance.now();
      
      const duration = endTime - startTime;
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('handles concurrent analysis requests', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const promises = Array.from({ length: 5 }, (_, i) => 
        analyzeContent(`Test content ${i}`)
      );
      
      const results = await Promise.all(promises);
      
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toBeDefined();
      });
    });

    it('handles memory efficiently with large content', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const memoryCheck = testHelpers.performance.expectNoMemoryLeaks();
      
      // Process multiple large content pieces
      for (let i = 0; i < 10; i++) {
        const largeContent = `Large content piece ${i}: ${'A'.repeat(1000)}`;
        await analyzeContent(largeContent);
      }
      
      memoryCheck.check();
    });
  });

  describe('Error Recovery', () => {
    it('recovers from temporary service outages', async () => {
      let callCount = 0;
      global.fetch = vi.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) {
          return Promise.resolve({
            ok: false,
            status: 503,
            json: () => Promise.resolve({ error: 'Service temporarily unavailable' }),
          });
        }
        return Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(mockAIResponses.analyze.success),
        });
      });
      
      // First call should fail, second should succeed
      await expect(analyzeContent('Test content')).rejects.toThrow();
      
      const result = await analyzeContent('Test content');
      expect(result).toBeDefined();
    });

    it('handles malformed API responses', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: 'response format' }),
      });
      
      await expect(analyzeContent('Test content')).rejects.toThrow();
    });

    it('handles JSON parsing errors', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.reject(new Error('Invalid JSON')),
      });
      
      await expect(analyzeContent('Test content')).rejects.toThrow();
    });
  });

  describe('Rate Limiting', () => {
    it('handles rate limiting gracefully', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });
      
      await expect(analyzeContent('Test content')).rejects.toThrow('Rate limit exceeded');
    });

    it('respects retry-after headers', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        headers: new Headers({ 'Retry-After': '2' }),
        json: () => Promise.resolve({ error: 'Rate limit exceeded' }),
      });
      
      const startTime = Date.now();
      await expect(analyzeContent('Test content')).rejects.toThrow();
      const endTime = Date.now();
      
      // Should have waited at least 2 seconds
      expect(endTime - startTime).toBeGreaterThan(1900);
    });
  });

  describe('Content Validation', () => {
    it('sanitizes input content before sending to API', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const maliciousContent = '<script>alert("xss")</script>Hello world';
      await analyzeContent(maliciousContent);
      
      expect(global.fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: expect.not.stringContaining('<script>'),
        })
      );
    });

    it('handles content with mixed encodings', async () => {
      mockApiServer.analyze(mockAIResponses.analyze.success);
      
      const mixedContent = 'ASCII text 中文字符 العربية русский 🎉';
      const result = await analyzeContent(mixedContent);
      
      expect(result).toBeDefined();
    });

    it('validates content length limits', async () => {
      const veryLongContent = 'A'.repeat(100000); // 100KB
      
      await expect(analyzeContent(veryLongContent)).rejects.toThrow(/content too long/i);
    });
  });
});