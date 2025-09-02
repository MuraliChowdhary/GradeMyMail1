/**
 * Auto-save utility with debounced local storage
 * Provides automatic saving of editor content with configurable debounce timing
 */

export interface AutoSaveData {
  html: string;
  plainText: string;
  timestamp: number;
  version: number;
}

export interface AutoSaveOptions {
  key: string;
  debounceMs: number;
  maxVersions: number;
  onSave?: (data: AutoSaveData) => void;
  onRestore?: (data: AutoSaveData) => void;
  onError?: (error: Error) => void;
}

const DEFAULT_OPTIONS: Partial<AutoSaveOptions> = {
  debounceMs: 2000, // 2 seconds
  maxVersions: 5,
};

export class AutoSaveManager {
  private options: AutoSaveOptions;
  private debounceTimer: NodeJS.Timeout | null = null;
  private currentVersion = 0;
  private isEnabled = true;

  constructor(options: AutoSaveOptions) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.loadCurrentVersion();
  }

  /**
   * Save content with debouncing
   */
  save(html: string, plainText: string): void {
    if (!this.isEnabled) return;

    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.performSave(html, plainText);
    }, this.options.debounceMs);
  }

  /**
   * Save immediately without debouncing
   */
  saveImmediate(html: string, plainText: string): void {
    if (!this.isEnabled) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    this.performSave(html, plainText);
  }

  /**
   * Restore the latest saved content
   */
  restore(): AutoSaveData | null {
    try {
      const saved = localStorage.getItem(this.options.key);
      if (!saved) return null;

      const data: AutoSaveData = JSON.parse(saved);
      
      // Validate the data structure
      if (!this.isValidAutoSaveData(data)) {
        console.warn('Invalid auto-save data found, clearing...');
        this.clear();
        return null;
      }

      this.options.onRestore?.(data);
      return data;
    } catch (error) {
      console.error('Failed to restore auto-saved content:', error);
      this.options.onError?.(error as Error);
      return null;
    }
  }

  /**
   * Get all saved versions (for version history)
   */
  getVersionHistory(): AutoSaveData[] {
    try {
      const versions: AutoSaveData[] = [];
      
      for (let i = 0; i < this.options.maxVersions; i++) {
        const key = `${this.options.key}_v${i}`;
        const saved = localStorage.getItem(key);
        
        if (saved) {
          const data = JSON.parse(saved);
          if (this.isValidAutoSaveData(data)) {
            versions.push(data);
          }
        }
      }

      // Sort by timestamp (newest first)
      return versions.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('Failed to get version history:', error);
      this.options.onError?.(error as Error);
      return [];
    }
  }

  /**
   * Clear all saved data
   */
  clear(): void {
    try {
      // Clear main save
      localStorage.removeItem(this.options.key);
      
      // Clear version history
      for (let i = 0; i < this.options.maxVersions; i++) {
        localStorage.removeItem(`${this.options.key}_v${i}`);
      }
      
      this.currentVersion = 0;
    } catch (error) {
      console.error('Failed to clear auto-save data:', error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Enable or disable auto-save
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
    
    if (!enabled && this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }

  /**
   * Check if there is saved content available
   */
  hasSavedContent(): boolean {
    try {
      const saved = localStorage.getItem(this.options.key);
      return saved !== null && saved.trim() !== '';
    } catch {
      return false;
    }
  }

  /**
   * Get the age of the last save in milliseconds
   */
  getLastSaveAge(): number | null {
    const data = this.restore();
    if (!data) return null;
    
    return Date.now() - data.timestamp;
  }

  /**
   * Format the last save time for display
   */
  getLastSaveTimeFormatted(): string | null {
    const age = this.getLastSaveAge();
    if (age === null) return null;

    const seconds = Math.floor(age / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return `${seconds} second${seconds > 1 ? 's' : ''} ago`;
  }

  /**
   * Cleanup old auto-save data from localStorage
   */
  cleanup(): void {
    try {
      const keys = Object.keys(localStorage);
      const autoSaveKeys = keys.filter(key => 
        key.startsWith(this.options.key) && key !== this.options.key
      );

      // Keep only the most recent versions
      const versionsToKeep = this.options.maxVersions;
      if (autoSaveKeys.length > versionsToKeep) {
        const keysToRemove = autoSaveKeys.slice(versionsToKeep);
        keysToRemove.forEach(key => localStorage.removeItem(key));
      }
    } catch (error) {
      console.error('Failed to cleanup auto-save data:', error);
      this.options.onError?.(error as Error);
    }
  }

  /**
   * Destroy the auto-save manager and cleanup resources
   */
  destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    this.isEnabled = false;
  }

  private performSave(html: string, plainText: string): void {
    try {
      // Don't save empty content
      if (!html.trim() && !plainText.trim()) {
        return;
      }

      this.currentVersion++;
      
      const data: AutoSaveData = {
        html,
        plainText,
        timestamp: Date.now(),
        version: this.currentVersion
      };

      // Save current version
      localStorage.setItem(this.options.key, JSON.stringify(data));

      // Save to version history
      this.saveToVersionHistory(data);

      // Cleanup old versions
      this.cleanup();

      this.options.onSave?.(data);
    } catch (error) {
      console.error('Failed to auto-save content:', error);
      this.options.onError?.(error as Error);
    }
  }

  private saveToVersionHistory(data: AutoSaveData): void {
    try {
      // Shift existing versions
      for (let i = this.options.maxVersions - 1; i > 0; i--) {
        const currentKey = `${this.options.key}_v${i - 1}`;
        const nextKey = `${this.options.key}_v${i}`;
        
        const currentData = localStorage.getItem(currentKey);
        if (currentData) {
          localStorage.setItem(nextKey, currentData);
        }
      }

      // Save new version as v0
      localStorage.setItem(`${this.options.key}_v0`, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save version history:', error);
    }
  }

  private loadCurrentVersion(): void {
    try {
      const saved = localStorage.getItem(this.options.key);
      if (saved) {
        const data: AutoSaveData = JSON.parse(saved);
        this.currentVersion = data.version || 0;
      }
    } catch (error) {
      console.error('Failed to load current version:', error);
      this.currentVersion = 0;
    }
  }

  private isValidAutoSaveData(data: any): data is AutoSaveData {
    return (
      data &&
      typeof data === 'object' &&
      typeof data.html === 'string' &&
      typeof data.plainText === 'string' &&
      typeof data.timestamp === 'number' &&
      typeof data.version === 'number'
    );
  }
}

/**
 * Hook for using auto-save in React components
 */
export function useAutoSave(options: AutoSaveOptions) {
  const [manager] = useState(() => new AutoSaveManager(options));
  const [lastSaveTime, setLastSaveTime] = useState<string | null>(null);
  const [hasSaved, setHasSaved] = useState(false);

  useEffect(() => {
    // Update save time display
    const updateSaveTime = () => {
      setLastSaveTime(manager.getLastSaveTimeFormatted());
      setHasSaved(manager.hasSavedContent());
    };

    updateSaveTime();
    const interval = setInterval(updateSaveTime, 30000); // Update every 30 seconds

    return () => {
      clearInterval(interval);
      manager.destroy();
    };
  }, [manager]);

  const save = useCallback((html: string, plainText: string) => {
    manager.save(html, plainText);
  }, [manager]);

  const saveImmediate = useCallback((html: string, plainText: string) => {
    manager.saveImmediate(html, plainText);
  }, [manager]);

  const restore = useCallback(() => {
    return manager.restore();
  }, [manager]);

  const clear = useCallback(() => {
    manager.clear();
    setLastSaveTime(null);
    setHasSaved(false);
  }, [manager]);

  return {
    save,
    saveImmediate,
    restore,
    clear,
    lastSaveTime,
    hasSaved,
    getVersionHistory: manager.getVersionHistory.bind(manager),
    setEnabled: manager.setEnabled.bind(manager)
  };
}

// Import React for the hook
import { useState, useEffect, useCallback } from 'react';