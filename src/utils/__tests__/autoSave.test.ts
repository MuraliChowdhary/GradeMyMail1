import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { AutoSaveManager } from '../autoSave';

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

describe('AutoSave Utilities', () => {
  let manager: AutoSaveManager;
  
  beforeEach(() => {
    localStorageMock.getItem.mockClear();
    localStorageMock.setItem.mockClear();
    localStorageMock.removeItem.mockClear();
    localStorageMock.clear.mockClear();
    
    manager = new AutoSaveManager({
      key: 'test-key',
      debounceMs: 100,
      maxVersions: 3
    });
  });

  afterEach(() => {
    manager.destroy();
    vi.clearAllMocks();
  });

  describe('AutoSaveManager', () => {
    it('should create manager with correct options', () => {
      expect(manager).toBeDefined();
    });

    it('should save content after debounce delay', async () => {
      manager.save('<p>Test content</p>', 'Test content');
      
      // Should not save immediately
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      
      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('Test content')
      );
    });

    it('should save immediately when using saveImmediate', () => {
      manager.saveImmediate('<p>Immediate content</p>', 'Immediate content');
      
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('Immediate content')
      );
    });

    it('should not save empty content', async () => {
      manager.save('', '');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });

    it('should restore saved content', () => {
      const savedData = {
        html: '<p>Saved content</p>',
        plainText: 'Saved content',
        timestamp: Date.now(),
        version: 1
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const restored = manager.restore();
      
      expect(restored).toEqual(savedData);
    });

    it('should return null when no saved content exists', () => {
      localStorageMock.getItem.mockReturnValue(null);
      
      const restored = manager.restore();
      
      expect(restored).toBeNull();
    });

    it('should clear all saved data', () => {
      manager.clear();
      
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key');
      // Should also clear version history
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key_v0');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key_v1');
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('test-key_v2');
    });

    it('should check if saved content exists', () => {
      localStorageMock.getItem.mockReturnValue('{"html":"<p>Content</p>"}');
      
      expect(manager.hasSavedContent()).toBe(true);
      
      localStorageMock.getItem.mockReturnValue(null);
      
      expect(manager.hasSavedContent()).toBe(false);
    });

    it('should enable and disable auto-save', async () => {
      manager.setEnabled(false);
      manager.save('<p>Test</p>', 'Test');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).not.toHaveBeenCalled();
      
      manager.setEnabled(true);
      manager.save('<p>Test</p>', 'Test');
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should handle localStorage errors gracefully', () => {
      localStorageMock.setItem.mockImplementation(() => {
        throw new Error('Storage quota exceeded');
      });
      
      const onError = vi.fn();
      const errorManager = new AutoSaveManager({
        key: 'error-test',
        debounceMs: 10,
        maxVersions: 3,
        onError
      });
      
      errorManager.saveImmediate('<p>Test</p>', 'Test');
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      
      errorManager.destroy();
    });

    it('should get version history', () => {
      const versions = [
        { html: '<p>Version 1</p>', plainText: 'Version 1', timestamp: 1000, version: 1 },
        { html: '<p>Version 2</p>', plainText: 'Version 2', timestamp: 2000, version: 2 }
      ];
      
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'test-key_v0') return JSON.stringify(versions[1]);
        if (key === 'test-key_v1') return JSON.stringify(versions[0]);
        return null;
      });
      
      const history = manager.getVersionHistory();
      
      expect(history).toHaveLength(2);
      expect(history[0].timestamp).toBe(2000); // Newest first
      expect(history[1].timestamp).toBe(1000);
    });

    it('should calculate last save age', () => {
      const now = Date.now();
      const savedData = {
        html: '<p>Content</p>',
        plainText: 'Content',
        timestamp: now - 5000, // 5 seconds ago
        version: 1
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const age = manager.getLastSaveAge();
      
      expect(age).toBeGreaterThanOrEqual(4900); // Allow for small timing differences
      expect(age).toBeLessThanOrEqual(5100);
    });

    it('should format last save time for display', () => {
      const now = Date.now();
      const savedData = {
        html: '<p>Content</p>',
        plainText: 'Content',
        timestamp: now - 65000, // 65 seconds ago (1 minute 5 seconds)
        version: 1
      };
      
      localStorageMock.getItem.mockReturnValue(JSON.stringify(savedData));
      
      const formatted = manager.getLastSaveTimeFormatted();
      
      expect(formatted).toContain('minute');
    });
  });
});