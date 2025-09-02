import * as React from 'react';
import { 
  Subject, 
  BehaviorSubject, 
  Observable, 
  EMPTY,
  timer,
  of
} from 'rxjs';
import {
  debounceTime,
  distinctUntilChanged,
  switchMap,
  map,
  filter,
  catchError,
  retry,
  share,
  tap,
  takeUntil
} from 'rxjs/operators';
import { apiService, APIError } from './api';
import type { AnalyzeResponse, UnifiedAnalysisResponse } from './api';

// Content extraction interface
export interface ExtractedContent {
  html: string;
  plainText: string;
  wordCount: number;
  characterCount: number;
  isEmpty: boolean;
  contentHash: string; // For deduplication
}

// Analysis state interface
export interface AnalysisState {
  isAnalyzing: boolean;
  content: ExtractedContent | null;
  result: UnifiedAnalysisResponse | null;
  error: APIError | null;
  lastAnalyzedAt: Date | null;
  requestId: string | null;
}

// Analysis configuration
export interface AnalysisConfig {
  debounceMs: number;
  minContentLength: number;
  maxRetries: number;
  retryDelayMs: number;
  enableDeduplication: boolean;
  enableCaching: boolean;
  cacheExpiryMs: number;
}

// Default configuration
const DEFAULT_CONFIG: AnalysisConfig = {
  debounceMs: 1000, // 1 second debounce
  minContentLength: 10, // Minimum 10 characters to trigger analysis
  maxRetries: 3,
  retryDelayMs: 1000,
  enableDeduplication: true,
  enableCaching: true,
  cacheExpiryMs: 5 * 60 * 1000, // 5 minutes cache
};

// Cache entry interface
interface CacheEntry {
  result: UnifiedAnalysisResponse;
  timestamp: Date;
  contentHash: string;
}

// Request deduplication manager
class RequestDeduplicationManager {
  private activeRequests = new Map<string, Observable<UnifiedAnalysisResponse>>();
  private requestCounter = 0;

  // Get or create a request for the given content hash
  getOrCreateRequest(contentHash: string, requestFactory: () => Observable<UnifiedAnalysisResponse>): Observable<UnifiedAnalysisResponse> {
    // Check if there's already an active request for this content
    const existingRequest = this.activeRequests.get(contentHash);
    if (existingRequest) {
      console.log(`🔄 Reusing existing request for content hash: ${contentHash}`);
      return existingRequest;
    }

    // Create new request with cleanup
    const requestId = `req_${++this.requestCounter}`;
    console.log(`🚀 Creating new analysis request: ${requestId} for hash: ${contentHash}`);
    
    const request = requestFactory().pipe(
      tap({
        next: () => console.log(`✅ Request ${requestId} completed successfully`),
        error: (error) => console.error(`❌ Request ${requestId} failed:`, error),
        complete: () => {
          console.log(`🧹 Cleaning up request ${requestId}`);
          this.activeRequests.delete(contentHash);
        }
      }),
      share() // Share the observable among multiple subscribers
    );

    this.activeRequests.set(contentHash, request);
    return request;
  }

  // Cancel all active requests
  cancelAllRequests(): void {
    console.log(`🛑 Cancelling ${this.activeRequests.size} active requests`);
    this.activeRequests.clear();
    apiService.cancelAllRequests();
  }

  // Get active request count
  getActiveRequestCount(): number {
    return this.activeRequests.size;
  }
}

// Analysis cache manager
class AnalysisCacheManager {
  private cache = new Map<string, CacheEntry>();
  private maxCacheSize = 100; // Maximum number of cached entries

  // Get cached result if valid
  get(contentHash: string, expiryMs: number): UnifiedAnalysisResponse | null {
    const entry = this.cache.get(contentHash);
    if (!entry) return null;

    const isExpired = Date.now() - entry.timestamp.getTime() > expiryMs;
    if (isExpired) {
      this.cache.delete(contentHash);
      return null;
    }

    console.log(`💾 Cache hit for content hash: ${contentHash}`);
    return entry.result;
  }

  // Set cached result
  set(contentHash: string, result: UnifiedAnalysisResponse): void {
    // Implement LRU eviction if cache is full
    if (this.cache.size >= this.maxCacheSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    this.cache.set(contentHash, {
      result,
      timestamp: new Date(),
      contentHash,
    });

    console.log(`💾 Cached result for content hash: ${contentHash}`);
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
    console.log('🧹 Analysis cache cleared');
  }

  // Get cache stats
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
    };
  }
}

// Content extraction utilities
export const extractContent = (html: string, plainText: string): ExtractedContent => {
  const trimmedHtml = html.trim();
  const trimmedText = plainText.trim();
  
  // Simple word count (split by whitespace and filter empty strings)
  const wordCount = trimmedText ? trimmedText.split(/\s+/).filter(word => word.length > 0).length : 0;
  const characterCount = trimmedText.length;
  const isEmpty = !trimmedText || wordCount === 0;
  
  // Create content hash for deduplication (simple hash of plain text)
  const contentHash = createSimpleHash(trimmedText);
  
  return {
    html: trimmedHtml,
    plainText: trimmedText,
    wordCount,
    characterCount,
    isEmpty,
    contentHash,
  };
};

// Simple hash function for content deduplication
const createSimpleHash = (content: string): string => {
  let hash = 0;
  if (content.length === 0) return hash.toString();
  
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  return Math.abs(hash).toString(36);
};

// Real-time Analysis Engine
export class RealTimeAnalysisEngine {
  private contentSubject = new Subject<{ html: string; plainText: string }>();
  private destroySubject = new Subject<void>();
  private stateSubject = new BehaviorSubject<AnalysisState>({
    isAnalyzing: false,
    content: null,
    result: null,
    error: null,
    lastAnalyzedAt: null,
    requestId: null,
  });

  private deduplicationManager = new RequestDeduplicationManager();
  private cacheManager = new AnalysisCacheManager();
  private config: AnalysisConfig;

  constructor(config: Partial<AnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.setupAnalysisPipeline();
  }

  // Setup the reactive analysis pipeline
  private setupAnalysisPipeline(): void {
    // Create the main analysis pipeline
    const analysisStream = this.contentSubject.pipe(
      // Extract and validate content
      map(({ html, plainText }) => extractContent(html, plainText)),
      
      // Filter out empty or too short content
      filter(content => !content.isEmpty && content.characterCount >= this.config.minContentLength),
      
      // Debounce to avoid excessive API calls
      debounceTime(this.config.debounceMs),
      
      // Only proceed if content actually changed
      distinctUntilChanged((prev, curr) => prev.contentHash === curr.contentHash),
      
      // Log content changes
      tap(content => {
        console.log(`📝 Content changed: ${content.wordCount} words, ${content.characterCount} chars, hash: ${content.contentHash}`);
        this.updateState({ content, isAnalyzing: true, error: null });
      }),
      
      // Switch to analysis request (cancels previous requests)
      switchMap(content => this.performAnalysis(content)),
      
      // Handle errors gracefully
      catchError(error => {
        console.error('❌ Analysis pipeline error:', error);
        this.updateState({ 
          isAnalyzing: false, 
          error: error as APIError,
          lastAnalyzedAt: new Date()
        });
        return EMPTY; // Continue the stream
      }),
      
      // Share the stream among multiple subscribers
      share(),
      
      // Take until component is destroyed
      takeUntil(this.destroySubject)
    );

    // Subscribe to the analysis stream
    analysisStream.subscribe({
      next: (result) => {
        console.log('✅ Analysis completed successfully');
        this.updateState({
          isAnalyzing: false,
          result,
          error: null,
          lastAnalyzedAt: new Date(),
        });
      },
      error: (error) => {
        console.error('❌ Analysis stream error:', error);
        this.updateState({
          isAnalyzing: false,
          error: error as APIError,
          lastAnalyzedAt: new Date(),
        });
      }
    });

    console.log('🔧 Real-time analysis pipeline initialized');
  }

  // Perform analysis with caching and deduplication using GroqGemma infrastructure
  private performAnalysis(content: ExtractedContent): Observable<UnifiedAnalysisResponse> {
    // Check cache first if enabled
    if (this.config.enableCaching) {
      const cachedResult = this.cacheManager.get(content.contentHash, this.config.cacheExpiryMs);
      if (cachedResult) {
        return of(cachedResult);
      }
    }

    // Create analysis request factory using the new GroqGemma unified endpoint
    const requestFactory = () => {
      const requestId = `analysis_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return timer(0).pipe(
        switchMap(() => {
          console.log(`🔍 Starting GroqGemma unified analysis request: ${requestId}`);
          return apiService.analyzeNewsletter(content.plainText, requestId);
        }),
        retry({
          count: this.config.maxRetries,
          delay: this.config.retryDelayMs,
        }),
        tap(result => {
          // Cache the result if caching is enabled
          if (this.config.enableCaching) {
            this.cacheManager.set(content.contentHash, result);
          }
        })
      );
    };

    // Use deduplication if enabled
    if (this.config.enableDeduplication) {
      return this.deduplicationManager.getOrCreateRequest(content.contentHash, requestFactory);
    } else {
      return requestFactory();
    }
  }

  // Update internal state
  private updateState(updates: Partial<AnalysisState>): void {
    const currentState = this.stateSubject.value;
    const newState = { ...currentState, ...updates };
    this.stateSubject.next(newState);
  }

  // Public API methods

  // Analyze content (main entry point)
  analyzeContent(html: string, plainText: string): void {
    this.contentSubject.next({ html, plainText });
  }

  // Get current state as observable
  getState(): Observable<AnalysisState> {
    return this.stateSubject.asObservable();
  }

  // Get current state value
  getCurrentState(): AnalysisState {
    return this.stateSubject.value;
  }

  // Check if currently analyzing
  isAnalyzing(): boolean {
    return this.stateSubject.value.isAnalyzing;
  }

  // Get last analysis result
  getLastResult(): UnifiedAnalysisResponse | null {
    return this.stateSubject.value.result;
  }

  // Get last error
  getLastError(): APIError | null {
    return this.stateSubject.value.error;
  }

  // Clear current analysis state
  clearAnalysis(): void {
    this.updateState({
      content: null,
      result: null,
      error: null,
      lastAnalyzedAt: null,
      requestId: null,
    });
    this.cacheManager.clear();
  }

  // Cancel all ongoing requests
  cancelAllRequests(): void {
    this.deduplicationManager.cancelAllRequests();
  }

  // Get engine statistics
  getStats() {
    return {
      activeRequests: this.deduplicationManager.getActiveRequestCount(),
      cache: this.cacheManager.getStats(),
      config: this.config,
      currentState: this.getCurrentState(),
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<AnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚙️ Analysis engine configuration updated:', this.config);
  }

  // Destroy the engine and cleanup resources
  destroy(): void {
    console.log('🧹 Destroying analysis engine...');
    this.destroySubject.next();
    this.destroySubject.complete();
    this.contentSubject.complete();
    this.stateSubject.complete();
    this.cancelAllRequests();
    this.cacheManager.clear();
  }
}

// Factory function to create analysis engine instance
export const createAnalysisEngine = (config?: Partial<AnalysisConfig>): RealTimeAnalysisEngine => {
  return new RealTimeAnalysisEngine(config);
};

// Hook for using analysis engine in React components
export const useAnalysisEngine = (config?: Partial<AnalysisConfig>) => {
  const [engine] = React.useState(() => createAnalysisEngine(config));
  
  React.useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);
  
  return engine;
};

// Export types and utilities (AnalysisState already exported above)