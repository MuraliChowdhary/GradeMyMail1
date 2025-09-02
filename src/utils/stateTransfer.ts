import { v4 as uuidv4 } from 'uuid';
import type { NewsletterMetrics } from '../components/MetricsDisplay';

export interface EmailData {
  id: string;
  originalText: string;
  originalHTML: string;
  taggedContent: string;
  timestamp: number;
  gradeMyMailMetrics?: NewsletterMetrics; // Add the original Grade My Mail metrics
  metadata?: {
    wordCount: number;
    emailType?: string;
    tone?: string;
  };
}

export interface StorageResult {
  success: boolean;
  id?: string;
  error?: string;
}

export interface LoadResult {
  success: boolean;
  data?: EmailData;
  error?: string;
}

/**
 * Parallel storage strategy implementation
 * Stores data in localStorage, sessionStorage, and server simultaneously
 */
export class StateTransferManager {
  private static readonly LOCAL_STORAGE_KEY = 'grademymail_data';
  private static readonly SESSION_STORAGE_KEY = 'grademymail_session_data';
  private static readonly SERVER_ENDPOINT = '/api/store';
  private static readonly LOAD_ENDPOINT = '/api/load';
  private static readonly TTL_MINUTES = 30;

  /**
   * Store email data using parallel storage strategy
   */
  static async storeEmailData(data: Omit<EmailData, 'id' | 'timestamp'>): Promise<StorageResult> {
    const emailData: EmailData = {
      ...data,
      id: uuidv4(),
      timestamp: Date.now(),
    };

    const results = await Promise.allSettled([
      this.storeInLocalStorage(emailData),
      this.storeInSessionStorage(emailData),
      this.storeOnServer(emailData),
    ]);

    // Check if at least one storage method succeeded
    const hasSuccess = results.some(result => result.status === 'fulfilled' && result.value.success);

    if (hasSuccess) {
      return { success: true, id: emailData.id };
    }

    // If all failed, return the first error
    const firstError = results.find(result => result.status === 'fulfilled' && !result.value.success);
    return {
      success: false,
      error: firstError?.status === 'fulfilled' ? firstError.value.error : 'All storage methods failed',
    };
  }

  /**
   * Load email data with fallback strategy
   */
  static async loadEmailData(id: string): Promise<LoadResult> {
    // Try loading from different sources in order of preference
    const loadStrategies = [
      () => this.loadFromLocalStorage(id),
      () => this.loadFromSessionStorage(id),
      () => this.loadFromServer(id),
    ];

    for (const loadStrategy of loadStrategies) {
      try {
        const result = await loadStrategy();
        if (result.success && result.data) {
          // Validate data freshness
          if (this.isDataFresh(result.data)) {
            return result;
          }
        }
      } catch (error) {
        console.warn('Storage load strategy failed:', error);
      }
    }

    return { success: false, error: 'No valid data found in any storage location' };
  }

  /**
   * Clear data from all storage locations
   */
  static async clearEmailData(id: string): Promise<void> {
    await Promise.allSettled([
      this.clearFromLocalStorage(id),
      this.clearFromSessionStorage(id),
      this.clearFromServer(id),
    ]);
  }

  /**
   * Validate and serialize email data
   */
  static serializeEmailData(data: EmailData): string {
    try {
      // Validate required fields
      if (!data.originalText || !data.originalHTML || !data.taggedContent) {
        throw new Error('Missing required email data fields');
      }

      // Sanitize HTML content
      const sanitizedData = {
        ...data,
        originalHTML: this.sanitizeHTML(data.originalHTML),
      };

      return JSON.stringify(sanitizedData);
    } catch (error) {
      throw new Error(`Failed to serialize email data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deserialize and validate email data
   */
  static deserializeEmailData(serializedData: string): EmailData {
    try {
      const data = JSON.parse(serializedData) as EmailData;
      
      // Validate structure
      if (!data.id || !data.originalText || !data.originalHTML || !data.taggedContent || !data.timestamp) {
        throw new Error('Invalid email data structure');
      }

      return data;
    } catch (error) {
      throw new Error(`Failed to deserialize email data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Private storage implementations

  private static async storeInLocalStorage(data: EmailData): Promise<StorageResult> {
    try {
      const serialized = this.serializeEmailData(data);
      const storageData = {
        [data.id]: serialized,
        ...this.getExistingLocalStorageData(),
      };
      
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(storageData));
      return { success: true, id: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: `LocalStorage failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async storeInSessionStorage(data: EmailData): Promise<StorageResult> {
    try {
      const serialized = this.serializeEmailData(data);
      const storageData = {
        [data.id]: serialized,
        ...this.getExistingSessionStorageData(),
      };
      
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(storageData));
      return { success: true, id: data.id };
    } catch (error) {
      return { 
        success: false, 
        error: `SessionStorage failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async storeOnServer(data: EmailData): Promise<StorageResult> {
    try {
      const response = await fetch(this.SERVER_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: data.id,
          payload: {
            fullOriginalText: data.originalText,
            fullOriginalHTML: data.originalHTML,
            taggedContent: data.taggedContent,
            metadata: data.metadata,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      return { success: true, id: result.id || data.id };
    } catch (error) {
      return { 
        success: false, 
        error: `Server storage failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async loadFromLocalStorage(id: string): Promise<LoadResult> {
    try {
      const storageData = this.getExistingLocalStorageData();
      const serializedData = storageData[id];
      
      if (!serializedData) {
        return { success: false, error: 'Data not found in localStorage' };
      }

      const data = this.deserializeEmailData(serializedData);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `LocalStorage load failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async loadFromSessionStorage(id: string): Promise<LoadResult> {
    try {
      const storageData = this.getExistingSessionStorageData();
      const serializedData = storageData[id];
      
      if (!serializedData) {
        return { success: false, error: 'Data not found in sessionStorage' };
      }

      const data = this.deserializeEmailData(serializedData);
      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `SessionStorage load failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async loadFromServer(id: string): Promise<LoadResult> {
    try {
      const response = await fetch(`${this.LOAD_ENDPOINT}?id=${encodeURIComponent(id)}`);
      
      if (!response.ok) {
        throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      
      if (!result.payload) {
        return { success: false, error: 'No data found on server' };
      }

      const data: EmailData = {
        id,
        originalText: result.payload.fullOriginalText,
        originalHTML: result.payload.fullOriginalHTML,
        taggedContent: result.payload.taggedContent,
        timestamp: result.created || Date.now(),
        metadata: result.payload.metadata,
      };

      return { success: true, data };
    } catch (error) {
      return { 
        success: false, 
        error: `Server load failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
      };
    }
  }

  private static async clearFromLocalStorage(id: string): Promise<void> {
    try {
      const storageData = this.getExistingLocalStorageData();
      delete storageData[id];
      localStorage.setItem(this.LOCAL_STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to clear from localStorage:', error);
    }
  }

  private static async clearFromSessionStorage(id: string): Promise<void> {
    try {
      const storageData = this.getExistingSessionStorageData();
      delete storageData[id];
      sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(storageData));
    } catch (error) {
      console.warn('Failed to clear from sessionStorage:', error);
    }
  }

  private static async clearFromServer(id: string): Promise<void> {
    try {
      await fetch(`${this.SERVER_ENDPOINT}?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      });
    } catch (error) {
      console.warn('Failed to clear from server:', error);
    }
  }

  // Helper methods

  private static getExistingLocalStorageData(): Record<string, string> {
    try {
      const existing = localStorage.getItem(this.LOCAL_STORAGE_KEY);
      return existing ? JSON.parse(existing) : {};
    } catch {
      return {};
    }
  }

  private static getExistingSessionStorageData(): Record<string, string> {
    try {
      const existing = sessionStorage.getItem(this.SESSION_STORAGE_KEY);
      return existing ? JSON.parse(existing) : {};
    } catch {
      return {};
    }
  }

  private static isDataFresh(data: EmailData): boolean {
    const now = Date.now();
    const ttlMs = this.TTL_MINUTES * 60 * 1000;
    return (now - data.timestamp) < ttlMs;
  }

  private static sanitizeHTML(html: string): string {
    // Basic HTML sanitization - in production, use DOMPurify
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/on\w+\s*=/gi, '');
  }
}