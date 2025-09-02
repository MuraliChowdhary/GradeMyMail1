// GMMeditor service integration layer
import type {
  GMMeditorRequest,
  GMMeditorResponse,
  GMMeditorResult,
  ToneOption,
  ToneKey,
  GMMeditorAnalysis,
  GMMeditorOptions,
} from '../types/gmmeditor';
import { TONES } from '../types/gmmeditor';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export class GMMeditorService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Rewrite content using GMMeditor's Llama 3.1 AI capabilities
   */
  async rewriteContent(params: {
    originalText: string;
    toneKey?: ToneKey;
    analysis?: GMMeditorAnalysis;
    suggestions?: string[];
    options?: GMMeditorOptions;
  }): Promise<GMMeditorResult> {
    const {
      originalText,
      toneKey = 'friendly',
      analysis = {},
      suggestions = [],
      options = {},
    } = params;

    if (!originalText?.trim()) {
      throw new Error('Original text is required');
    }

    const request: GMMeditorRequest = {
      originalText,
      toneKey,
      analysis,
      suggestions,
      options: {
        model: 'llama-3.1-8b-instant',
        temperature: 0.65,
        maxTokens: 1200,
        targetGradeLow: 6,
        targetGradeHigh: 9,
        ...options,
      },
    };

    try {
      const startTime = Date.now();
      const response = await fetch(`${this.baseUrl}/api/newsletter/improve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const result: GMMeditorResponse = await response.json();
      const processingTime = Date.now() - startTime;

      return {
        ...result,
        metadata: {
          model: options.model || 'llama-3.1-8b-instant',
          processingTime,
          toneUsed: toneKey,
          originalLength: originalText.length,
          rewrittenLength: result.rewritten.length,
        },
      };
    } catch (error) {
      console.error('GMMeditor service error:', error);
      
      if (error instanceof Error) {
        throw error;
      }
      
      throw new Error('Failed to improve content with GMMeditor');
    }
  }

  /**
   * Get available tone options for the tone selector
   */
  getToneOptions(): ToneOption[] {
    return Object.entries(TONES).map(([key, label]) => ({
      key,
      label,
    }));
  }

  /**
   * Check if GMMeditor service is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);

      return response.ok;
    } catch (error) {
      console.warn('GMMeditor health check failed:', error);
      return false;
    }
  }

  /**
   * Check if Groq API is available
   */
  async checkGroqHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/groq/health`, {
        method: 'GET',
        timeout: 5000,
      } as RequestInit);

      return response.ok;
    } catch (error) {
      console.warn('Groq API health check failed:', error);
      return false;
    }
  }

  /**
   * Get processing status for long-running operations
   */
  async getProcessingStatus(requestId: string): Promise<{
    status: 'pending' | 'processing' | 'completed' | 'failed';
    progress?: number;
    message?: string;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/newsletter/improve/status/${requestId}`,
        {
          method: 'GET',
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Failed to get processing status:', error);
      return { status: 'failed', message: 'Failed to get status' };
    }
  }
}

// Create singleton instance
export const gmmEditorService = new GMMeditorService();

// Export for testing
export default GMMeditorService;