import axios, { type AxiosInstance, type AxiosResponse, type AxiosError } from 'axios';

// ValidationError class for client-side validation
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

// API response interfaces for GroqGemma dual-system
export interface AnalyzeResponse {
  message: {
    content: string; // Tagged content with XML-style markers
  };
}

export interface FixResponse {
  message: {
    content: string; // Improved pairs in old_draft/optimized_draft format
  };
  gmmEditor?: {
    rewritten: string;
    mappings: Array<{
      type: 'unchanged' | 'changed' | 'inserted' | 'deleted';
      old: string;
      new: string;
      wordDiff: Array<{
        added?: boolean;
        removed?: boolean;
        value: string;
      }> | null;
    }>;
    metadata?: any;
  };
}

export interface StoreResponse {
  id: string; // UUID for temporary storage
}

export interface LoadResponse {
  payload: {
    fullOriginalText: string;
    fullOriginalHTML: string;
    taggedContent: string;
  };
}

// New GroqGemma unified analysis response
export interface UnifiedAnalysisResponse {
  // Rule-based highlighting data
  analysisResult: {
    annotated: string;
    report: {
      perSentence: Array<{
        sentence: string;
        tags: string[];
        reasons: Record<string, any>;
      }>;
      global: {
        wordCount: number;
        sentenceCount: number;
        linkCount: number;
        linkDensityPer100Words: number;
        longParagraphs: number[];
        readability: {
          fleschKincaidGrade: number;
          threshold: number;
        };
        flags: Array<{
          tag: string;
          reasons: Record<string, any>;
        }>;
      };
    };
  };
  summary: {
    score: number;
    grade: string;
    issueCounts: {
      high: number;
      medium: number;
      low: number;
      info: number;
    };
    issueTypes: string[];
    metrics: {
      wordCount: number;
      sentenceCount: number;
      readabilityGrade: number;
      linkDensity: number;
    };
    globalFlags: Array<{
      tag: string;
      reasons: Record<string, any>;
    }>;
  };
  ranges: Array<{
    start: number;
    end: number;
    type: string;
    priority: string;
    message?: string;
    suggestion?: string;
  }>;
  // Gemma AI scoring data
  metrics: {
    overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
    audienceFit: number;
    tone: number;
    clarity: number;
    engagement: number;
    spamRisk: number;
    wordCount: number;
    readingTime: number;
    summary: string[];
    improvements: string[];
  };
  // Unified metadata
  metadata: {
    model: string;
    systems: {
      highlighting: string;
      scoring: string;
    };
    timestamp: string;
    processingTime: number;
    cached: boolean;
    systemHealth: {
      ruleBased: boolean;
      gemmaAI: boolean;
    };
  };
}

// Error types for classification
export type APIErrorType = 'network' | 'validation' | 'ai' | 'client' | 'server' | 'storage';

export class APIError extends Error {
  public type: APIErrorType;
  public status?: number;
  public originalError?: Error;
  public context?: Record<string, any>;

  constructor(message: string, type: APIErrorType, status?: number, originalError?: Error) {
    super(message);
    this.name = 'APIError';
    this.type = type;
    this.status = status;
    this.originalError = originalError;
  }
}

// Retry configuration
interface RetryConfig {
  retries: number;
  retryDelay: number;
  retryCondition: (error: AxiosError) => boolean;
}

const defaultRetryConfig: RetryConfig = {
  retries: 3,
  retryDelay: 1000, // Base delay in ms
  retryCondition: (error: AxiosError) => {
    // Retry on network errors or 5xx server errors
    return !error.response || (error.response.status >= 500 && error.response.status < 600);
  },
};

// Request cancellation manager
class RequestCancellationManager {
  private controllers = new Map<string, AbortController>();
  private lastRequestTimes = new Map<string, number>();
  private readonly MIN_REQUEST_INTERVAL = 500; // 0.5 seconds between requests (reduced from 2 seconds)

  createController(key: string): AbortController {
    // Check rate limiting
    const now = Date.now();
    const lastRequestTime = this.lastRequestTimes.get(key);
    
    if (lastRequestTime && (now - lastRequestTime) < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - (now - lastRequestTime);
      throw new APIError(
        `Please wait ${Math.ceil(waitTime / 1000)} seconds before making another request.`,
        'client',
        429
      );
    }

    // Cancel existing request with the same key
    this.cancelRequest(key);
    
    const controller = new AbortController();
    this.controllers.set(key, controller);
    this.lastRequestTimes.set(key, now);
    return controller;
  }

  cancelRequest(key: string): void {
    const controller = this.controllers.get(key);
    if (controller) {
      controller.abort();
      this.controllers.delete(key);
    }
  }

  cancelAllRequests(): void {
    this.controllers.forEach((controller) => controller.abort());
    this.controllers.clear();
  }

  cleanup(key: string): void {
    this.controllers.delete(key);
  }
}

// Create request cancellation manager instance
export const requestManager = new RequestCancellationManager();

// Exponential backoff delay calculation
const calculateRetryDelay = (retryCount: number, baseDelay: number): number => {
  return Math.min(baseDelay * Math.pow(2, retryCount), 10000); // Max 10 seconds
};

// Sleep utility for retry delays
const sleep = (ms: number): Promise<void> => 
  new Promise((resolve) => setTimeout(resolve, ms));

// Retry logic implementation
const withRetry = async <T>(
  fn: () => Promise<T>,
  config: RetryConfig = defaultRetryConfig
): Promise<T> => {
  let lastError: AxiosError | undefined;
  
  for (let attempt = 0; attempt <= config.retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as AxiosError;
      
      // Don't retry if it's the last attempt or retry condition is not met
      if (attempt === config.retries || !config.retryCondition(lastError)) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = calculateRetryDelay(attempt, config.retryDelay);
      await sleep(delay);
    }
  }
  
  throw lastError || new Error('Unknown error occurred during retry');
};

// Create axios instance with base configuration
const createAPIClient = (): AxiosInstance => {
  const client = axios.create({
    baseURL: process.env.NODE_ENV === 'production' ? '/api' : 'http://localhost:3001/api',
    timeout: 30000, // 30 seconds timeout
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      // Add timestamp to prevent caching
      config.params = {
        ...config.params,
        _t: Date.now(),
      };
      
      // Log request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      }
      
      return config;
    },
    (error) => {
      console.error('❌ Request interceptor error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response: AxiosResponse) => {
      // Log successful response in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      }
      
      return response;
    },
    (error: AxiosError) => {
      // Log error in development
      if (process.env.NODE_ENV === 'development') {
        console.error(`❌ API Error: ${error.response?.status} ${error.config?.url}`, error.message);
      }
      
      // Transform axios error to our custom APIError
      const apiError = transformAxiosError(error);
      return Promise.reject(apiError);
    }
  );

  return client;
};

// Transform axios error to APIError
const transformAxiosError = (error: AxiosError): APIError => {
  if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
    return new APIError('Request timeout. Please try again.', 'network', undefined, error);
  }
  
  if (error.code === 'ERR_NETWORK' || !error.response) {
    return new APIError('Network error. Please check your connection.', 'network', undefined, error);
  }
  
  const status = error.response.status;
  const message = (error.response.data as { message?: string })?.message || error.message;
  
  if (status >= 400 && status < 500) {
    if (status === 400) {
      return new APIError(message || 'Invalid request data.', 'validation', status, error);
    }
    if (status === 429) {
      return new APIError(message || 'Too many requests. Please wait a moment and try again.', 'client', status, error);
    }
    return new APIError(message || 'Client error occurred.', 'client', status, error);
  }
  
  if (status >= 500) {
    return new APIError(message || 'Server error occurred.', 'server', status, error);
  }
  
  return new APIError(message || 'An unexpected error occurred.', 'client', status, error);
};

// Enhanced health check utility
export const checkAPIHealth = async (): Promise<{ healthy: boolean; details?: any }> => {
  try {
    const response = await apiClient.get('/health', { timeout: 5000 });
    return { 
      healthy: true, 
      details: response.data 
    };
  } catch (error) {
    return { 
      healthy: false, 
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Service status checker
export const getServiceStatus = async (): Promise<{
  api: boolean;
  ai: boolean;
  storage: boolean;
}> => {
  const status = {
    api: false,
    ai: false,
    storage: false
  };

  try {
    // Check API health
    const apiHealth = await checkAPIHealth();
    status.api = apiHealth.healthy;

    // Check AI service using GroqGemma infrastructure
    try {
      await apiClient.post('/analyze', { content: 'health check' }, { timeout: 10000 });
      status.ai = true;
    } catch {
      status.ai = false;
    }

    // Check storage
    try {
      const testData = { test: 'data' };
      await apiClient.post('/store', { payload: testData }, { timeout: 5000 });
      status.storage = true;
    } catch {
      status.storage = false;
    }
  } catch (error) {
    console.error('Service status check failed:', error);
  }

  return status;
};

// Create API client instance
export const apiClient = createAPIClient();

// API service functions
export const apiService = {
  // Analyze email content with enhanced error handling
  async analyzeEmail(content: string, requestKey = 'analyze'): Promise<AnalyzeResponse> {
    const controller = requestManager.createController(requestKey);
    
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new APIError('Content cannot be empty', 'validation', 400);
      }
      
      if (content.length > 50000) { // 50KB limit
        throw new APIError('Content too large. Please reduce the size and try again.', 'validation', 400);
      }

      const response = await withRetry(
        () => apiClient.post<AnalyzeResponse>(
          '/analyze',
          { message: content },
          { signal: controller.signal }
        ),
        {
          ...defaultRetryConfig,
          retryCondition: (error: AxiosError) => {
            // Don't retry validation errors
            if (error.response?.status === 400) return false;
            return defaultRetryConfig.retryCondition(error);
          }
        }
      );
      
      requestManager.cleanup(requestKey);
      
      // Validate response
      if (!response.data?.message?.content) {
        throw new APIError('Invalid response from analysis service', 'ai', 502);
      }
      
      return response.data;
    } catch (error) {
      requestManager.cleanup(requestKey);
      
      // Enhanced error context
      if (error instanceof APIError) {
        error.context = {
          ...error.context,
          contentLength: content.length,
          requestKey,
          operation: 'analyzeEmail'
        };
      }
      
      throw error;
    }
  },

  // Fix tagged content with enhanced error handling - Updated to use GMMeditor
  async fixEmail(taggedContent: string, options?: { tone?: string }, requestKey?: string): Promise<FixResponse> {
    // Generate a truly unique request key to prevent conflicts
    const uniqueKey = requestKey || `fix-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const controller = requestManager.createController(uniqueKey);
    
    try {
      console.log(`🔧 [DEBUG] fixEmail called with content length: ${taggedContent.length}`);
      
      // Validate input
      if (!taggedContent || taggedContent.trim().length === 0) {
        throw new APIError('Tagged content cannot be empty', 'validation', 400);
      }

      // For GMMeditor, we need to extract the original text from tagged content
      // Remove XML tags to get clean text for GMMeditor
      const originalText = taggedContent
        .replace(/<(fluff|spam_words|hard_to_read)>/g, '')
        .replace(/<\/(fluff|spam_words|hard_to_read)>/g, '')
        .trim();

      console.log(`🔧 [DEBUG] Extracted original text length: ${originalText.length}`);

      // Call the new GMMeditor endpoint
      const response = await withRetry(
        () => apiClient.post(
          '/newsletter/improve',
          { 
            originalText,
            toneKey: options?.tone || 'friendly',
            analysis: {},
            suggestions: [],
            options: {}
          },
          { 
            signal: controller.signal,
            timeout: 60000 // 60 seconds timeout for GMMeditor
          }
        ),
        {
          ...defaultRetryConfig,
          retries: 2,
          retryCondition: (error: AxiosError) => {
            if (error.response?.status && error.response.status < 500) return false;
            return defaultRetryConfig.retryCondition(error);
          }
        }
      );
      
      requestManager.cleanup(uniqueKey);
      
      console.log(`🔧 [DEBUG] GMMeditor response received:`, response.data);
      
      // Return GMMeditor response directly with rich mapping data
      if (response.data?.rewritten) {
        // Return the full GMMeditor response with mappings for enhanced diff display
        const gmmEditorResponse = {
          message: {
            content: response.data.rewritten
          },
          // Preserve the rich GMMeditor data for better diff visualization
          gmmEditor: {
            rewritten: response.data.rewritten,
            mappings: response.data.mappings || [],
            metadata: response.data.metadata
          }
        };
        
        console.log(`🔧 [DEBUG] Returning enhanced GMMeditor response with ${response.data.mappings?.length || 0} mappings`);
        return gmmEditorResponse;
      }
      
      throw new APIError('Invalid response from GMMeditor service', 'ai', 502);
    } catch (error) {
      requestManager.cleanup(uniqueKey);
      
      console.error(`❌ [DEBUG] fixEmail error:`, error);
      
      // Enhanced error context
      if (error instanceof APIError) {
        error.context = {
          ...error.context,
          taggedContentLength: taggedContent.length,
          requestKey: uniqueKey,
          operation: 'fixEmail'
        };
      }
      
      throw error;
    }
  },

  // Store temporary data with enhanced error handling
  async storeData(payload: {
    fullOriginalText: string;
    fullOriginalHTML: string;
    taggedContent: string;
  }, requestKey = 'store'): Promise<StoreResponse> {
    const controller = requestManager.createController(requestKey);
    
    try {
      // Validate payload
      if (!payload.fullOriginalText || !payload.taggedContent) {
        throw new APIError('Invalid payload: missing required fields', 'validation', 400);
      }

      // Check payload size
      const payloadSize = JSON.stringify(payload).length;
      if (payloadSize > 1000000) { // 1MB limit
        throw new APIError('Payload too large for storage', 'validation', 413);
      }

      const response = await withRetry(
        () => apiClient.post<StoreResponse>(
          '/store',
          { payload },
          { signal: controller.signal }
        ),
        {
          ...defaultRetryConfig,
          retries: 1 // Only retry once for storage operations
        }
      );
      
      requestManager.cleanup(requestKey);
      
      // Validate response
      if (!response.data?.id) {
        throw new APIError('Invalid response from storage service', 'storage', 502);
      }
      
      return response.data;
    } catch (error) {
      requestManager.cleanup(requestKey);
      
      // Enhanced error context
      if (error instanceof APIError) {
        error.context = {
          ...error.context,
          payloadSize: JSON.stringify(payload).length,
          requestKey,
          operation: 'storeData'
        };
      }
      
      throw error;
    }
  },

  // Load stored data with enhanced error handling
  async loadData(id: string, requestKey = 'load'): Promise<LoadResponse> {
    const controller = requestManager.createController(requestKey);
    
    try {
      // Validate input
      if (!id || id.trim().length === 0) {
        throw new APIError('Data ID cannot be empty', 'validation', 400);
      }

      // Basic UUID format validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(id)) {
        throw new APIError('Invalid data ID format', 'validation', 400);
      }

      const response = await withRetry(
        () => apiClient.get<LoadResponse>(
          `/load?id=${encodeURIComponent(id)}`,
          { signal: controller.signal }
        ),
        {
          ...defaultRetryConfig,
          retries: 2 // Moderate retries for load operations
        }
      );
      
      requestManager.cleanup(requestKey);
      
      // Validate response
      if (!response.data?.payload) {
        throw new APIError('Invalid response from load service', 'storage', 502);
      }
      
      return response.data;
    } catch (error) {
      requestManager.cleanup(requestKey);
      
      // Enhanced error context
      if (error instanceof APIError) {
        error.context = {
          ...error.context,
          dataId: id,
          requestKey,
          operation: 'loadData'
        };
      }
      
      throw error;
    }
  },

  // Cancel specific request
  cancelRequest: (key: string) => requestManager.cancelRequest(key),
  
  // Cancel all requests
  cancelAllRequests: () => requestManager.cancelAllRequests(),
  
  // Enhanced health check
  checkAPIHealth,
  
  // Service status check
  getServiceStatus,

  // Unified newsletter analysis with GroqGemma dual-system approach (highlighting + scoring)
  async analyzeNewsletter(content: string, requestKey = 'newsletter-analyze', context?: { intendedAudience?: string; goal?: string }): Promise<UnifiedAnalysisResponse> {
    const controller = requestManager.createController(requestKey);
    
    try {
      // Validate input
      if (!content || content.trim().length === 0) {
        throw new APIError('Content cannot be empty', 'validation', 400);
      }
      
      if (content.length > 50000) {
        throw new APIError('Content too large. Please reduce the size and try again.', 'validation', 400);
      }

      const response = await withRetry(
        () => apiClient.post<UnifiedAnalysisResponse>(
          '/analyze',
          { content, context },
          { signal: controller.signal }
        ),
        {
          ...defaultRetryConfig,
          retries: 2, // Allow retries for dual-system analysis
          retryCondition: (error: AxiosError) => {
            if (error.response?.status === 400) return false;
            return defaultRetryConfig.retryCondition(error);
          }
        }
      );
      
      requestManager.cleanup(requestKey);
      
      // Validate unified response
      if (!response.data?.analysisResult || !response.data?.metrics) {
        throw new APIError('Invalid response from unified analysis service', 'ai', 502);
      }
      
      return response.data;
    } catch (error) {
      requestManager.cleanup(requestKey);
      
      if (error instanceof APIError) {
        error.context = {
          ...error.context,
          contentLength: content.length,
          requestKey,
          operation: 'analyzeNewsletter'
        };
      }
      
      throw error;
    }
  },

  // Legacy newsletter scoring endpoint (kept for backward compatibility)
  async scoreNewsletter(content: string, requestKey = 'newsletter-score'): Promise<{
    metrics: {
      overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
      audienceFit: number;
      tone: number;
      clarity: number;
      engagement: number;
      spamRisk: number;
      wordCount: number;
      readingTime: number;
      summary: string[];
      improvements: string[];
    };
    metadata: any;
  }> {
    // Use the unified endpoint for better performance
    const unifiedResponse = await this.analyzeNewsletter(content, requestKey);
    return {
      metrics: unifiedResponse.metrics,
      metadata: unifiedResponse.metadata
    };
  },

  // Legacy newsletter improvement (will be enhanced later)
  async improveNewsletter(taggedContent: string, requestKey = 'newsletter-improve'): Promise<FixResponse> {
    // This will be implemented with the new GroqGemma system
    return this.fixEmail(taggedContent, requestKey);
  },
};