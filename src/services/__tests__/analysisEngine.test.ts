import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { RealTimeAnalysisEngine, extractContent, createAnalysisEngine } from '../analysisEngine';
import { mockFetch, mockAIResponses, setupTestEnvironment, cleanupTestEnvironment } from '../../test-utils/mocks';

describe('Analysis Engine', () => {
  let engine: RealTimeAnalysisEngine;

  beforeEach(() => {
    setupTestEnvironment();
    engine = createAnalysisEngine();
  });

  afterEach(() => {
    cleanupTestEnvironment();
    engine.destroy();
  });

  describe('extractContent', () => {
    it('should extract content correctly', () => {
      const html = '<p>This is a <strong>test</strong> email.</p>';
      const plainText = 'This is a test email.';

      const result = extractContent(html, plainText);

      expect(result.html).toBe(html);
      expect(result.plainText).toBe(plainText);
      expect(result.wordCount).toBe(5);
      expect(result.characterCount).toBe(21);
      expect(result.isEmpty).toBe(false);
      expect(result.contentHash).toBeDefined();
    });

    it('should handle empty content', () => {
      const result = extractContent('', '');

      expect(result.isEmpty).toBe(true);
      expect(result.wordCount).toBe(0);
      expect(result.characterCount).toBe(0);
    });

    it('should calculate word count correctly', () => {
      const result = extractContent('', 'Hello world test email content');

      expect(result.wordCount).toBe(5);
      expect(result.characterCount).toBe(30);
    });

    it('should generate consistent content hash', () => {
      const content = 'Same content';
      const result1 = extractContent('', content);
      const result2 = extractContent('', content);

      expect(result1.contentHash).toBe(result2.contentHash);
    });
  });

  describe('RealTimeAnalysisEngine', () => {
    it('should initialize with default state', () => {
      const state = engine.getCurrentState();

      expect(state.isAnalyzing).toBe(false);
      expect(state.content).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
      expect(state.lastAnalyzedAt).toBeNull();
    });

    it('should update state when analyzing content', (done) => {
      global.fetch = mockFetch('/api/analyze', true);

      const subscription = engine.getState().subscribe(state => {
        if (state.isAnalyzing) {
          expect(state.content).toBeDefined();
          expect(state.content?.plainText).toBe('Test content for analysis');
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content for analysis</p>', 'Test content for analysis');
    });

    it('should handle successful analysis', (done) => {
      global.fetch = mockFetch('/api/analyze', true);

      const subscription = engine.getState().subscribe(state => {
        if (state.result && !state.isAnalyzing) {
          expect(state.result).toBeDefined();
          expect(state.error).toBeNull();
          expect(state.lastAnalyzedAt).toBeDefined();
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content</p>', 'Test content for analysis');
    });

    it('should handle analysis errors', (done) => {
      global.fetch = mockFetch('/api/analyze', false);

      const subscription = engine.getState().subscribe(state => {
        if (state.error && !state.isAnalyzing) {
          expect(state.error).toBeDefined();
          expect(state.result).toBeNull();
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content</p>', 'Test content for analysis');
    });

    it('should filter out empty content', () => {
      const initialState = engine.getCurrentState();
      
      engine.analyzeContent('', '');
      
      // State should not change for empty content
      const newState = engine.getCurrentState();
      expect(newState).toEqual(initialState);
    });

    it('should filter out content that is too short', () => {
      const initialState = engine.getCurrentState();
      
      engine.analyzeContent('<p>Hi</p>', 'Hi');
      
      // State should not change for content that's too short
      const newState = engine.getCurrentState();
      expect(newState).toEqual(initialState);
    });
  });

  describe('Engine Management', () => {
    it('should provide engine statistics', () => {
      const stats = engine.getStats();

      expect(stats).toHaveProperty('activeRequests');
      expect(stats).toHaveProperty('cache');
      expect(stats).toHaveProperty('config');
      expect(stats).toHaveProperty('currentState');
      expect(stats.activeRequests).toBe(0);
    });

    it('should update configuration', () => {
      const newConfig = { debounceMs: 500, minContentLength: 5 };
      
      engine.updateConfig(newConfig);
      
      const stats = engine.getStats();
      expect(stats.config.debounceMs).toBe(500);
      expect(stats.config.minContentLength).toBe(5);
    });

    it('should clear analysis state', () => {
      engine.clearAnalysis();
      
      const state = engine.getCurrentState();
      expect(state.content).toBeNull();
      expect(state.result).toBeNull();
      expect(state.error).toBeNull();
    });

    it('should cancel all requests', () => {
      engine.cancelAllRequests();
      
      const stats = engine.getStats();
      expect(stats.activeRequests).toBe(0);
    });
  });

  describe('Error handling', () => {
    it('should handle network errors gracefully', (done) => {
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const subscription = engine.getState().subscribe(state => {
        if (state.error && !state.isAnalyzing) {
          expect(state.error).toBeDefined();
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content</p>', 'Test content for analysis');
    });

    it('should handle API timeout', (done) => {
      global.fetch = vi.fn().mockImplementation(() => 
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Request timeout')), 100)
        )
      );

      const subscription = engine.getState().subscribe(state => {
        if (state.error && !state.isAnalyzing) {
          expect(state.error).toBeDefined();
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content</p>', 'Test content for analysis');
    });

    it('should handle malformed responses', (done) => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ invalid: 'response' }),
      });

      const subscription = engine.getState().subscribe(state => {
        if (state.error && !state.isAnalyzing) {
          expect(state.error).toBeDefined();
          subscription.unsubscribe();
          done();
        }
      });

      engine.analyzeContent('<p>Test content</p>', 'Test content for analysis');
    });
  });

  describe('Performance', () => {
    it('should handle large content efficiently', () => {
      const largeContent = 'word '.repeat(1000);
      
      const start = performance.now();
      const result = extractContent(`<p>${largeContent}</p>`, largeContent);
      const end = performance.now();

      expect(result.wordCount).toBe(1000);
      expect(end - start).toBeLessThan(100); // Should complete within 100ms
    });

    it('should generate content hash efficiently', () => {
      const content = 'test content '.repeat(1000);
      
      const start = performance.now();
      const result1 = extractContent('', content);
      const result2 = extractContent('', content);
      const end = performance.now();

      expect(result1.contentHash).toBe(result2.contentHash);
      expect(end - start).toBeLessThan(50); // Should complete within 50ms
    });

    it('should handle concurrent analysis requests', () => {
      global.fetch = mockFetch('/api/analyze', true);
      
      // Start multiple analysis requests
      engine.analyzeContent('<p>Content 1</p>', 'Content 1 for analysis');
      engine.analyzeContent('<p>Content 2</p>', 'Content 2 for analysis');
      engine.analyzeContent('<p>Content 3</p>', 'Content 3 for analysis');
      
      const stats = engine.getStats();
      expect(stats.activeRequests).toBeLessThanOrEqual(1); // Should deduplicate or manage requests
    });
  });
});