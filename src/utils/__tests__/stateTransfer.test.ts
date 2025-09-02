import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { StateTransferManager, EmailData } from '../stateTransfer';

// Mock fetch for server storage tests
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

Object.defineProperty(window, 'sessionStorage', {
  value: mockSessionStorage,
});

describe('StateTransferManager', () => {
  const mockEmailData = {
    originalText: 'This is a test email with some fluff words.',
    originalHTML: '<p>This is a test email with some <strong>fluff</strong> words.</p>',
    taggedContent: 'This is a test email with some <fluff>fluff</fluff> words.',
    metadata: {
      wordCount: 9,
      emailType: 'business',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('storeEmailData', () => {
    it('should store data in all storage locations successfully', async () => {
      // Mock successful responses
      mockLocalStorage.setItem.mockImplementation(() => {});
      mockSessionStorage.setItem.mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'server-id' }),
      });

      const result = await StateTransferManager.storeEmailData(mockEmailData);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
      expect(mockSessionStorage.setItem).toHaveBeenCalled();
      expect(mockFetch).toHaveBeenCalledWith('/api/store', expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }));
    });

    it('should succeed if at least one storage method works', async () => {
      // Mock localStorage failure, but sessionStorage and server success
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('LocalStorage full');
      });
      mockSessionStorage.setItem.mockImplementation(() => {});
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: 'server-id' }),
      });

      const result = await StateTransferManager.storeEmailData(mockEmailData);

      expect(result.success).toBe(true);
      expect(result.id).toBeDefined();
    });

    it('should fail if all storage methods fail', async () => {
      // Mock all storage failures
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('LocalStorage full');
      });
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('SessionStorage full');
      });
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      const result = await StateTransferManager.storeEmailData(mockEmailData);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const invalidData = {
        originalText: '',
        originalHTML: '<p>Test</p>',
        taggedContent: 'Test',
      };

      const result = await StateTransferManager.storeEmailData(invalidData);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Missing required email data fields');
    });
  });

  describe('loadEmailData', () => {
    const mockStoredData: EmailData = {
      id: 'test-id',
      originalText: mockEmailData.originalText,
      originalHTML: mockEmailData.originalHTML,
      taggedContent: mockEmailData.taggedContent,
      timestamp: Date.now(),
      metadata: mockEmailData.metadata,
    };

    it('should load data from localStorage first', async () => {
      const serializedData = JSON.stringify(mockStoredData);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'test-id': serializedData,
      }));

      const result = await StateTransferManager.loadEmailData('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStoredData);
      expect(mockLocalStorage.getItem).toHaveBeenCalled();
    });

    it('should fallback to sessionStorage if localStorage fails', async () => {
      const serializedData = JSON.stringify(mockStoredData);
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        'test-id': serializedData,
      }));

      const result = await StateTransferManager.loadEmailData('test-id');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockStoredData);
      expect(mockSessionStorage.getItem).toHaveBeenCalled();
    });

    it('should fallback to server if both browser storages fail', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSessionStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({
          payload: {
            fullOriginalText: mockStoredData.originalText,
            fullOriginalHTML: mockStoredData.originalHTML,
            taggedContent: mockStoredData.taggedContent,
            metadata: mockStoredData.metadata,
          },
          created: mockStoredData.timestamp,
        }),
      });

      const result = await StateTransferManager.loadEmailData('test-id');

      expect(result.success).toBe(true);
      expect(result.data?.originalText).toBe(mockStoredData.originalText);
      expect(mockFetch).toHaveBeenCalledWith('/api/load?id=test-id');
    });

    it('should reject expired data', async () => {
      const expiredData = {
        ...mockStoredData,
        timestamp: Date.now() - (31 * 60 * 1000), // 31 minutes ago (expired)
      };
      const serializedData = JSON.stringify(expiredData);
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'test-id': serializedData,
      }));

      const result = await StateTransferManager.loadEmailData('test-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid data found');
    });

    it('should fail if no data found anywhere', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      mockSessionStorage.getItem.mockReturnValue(null);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await StateTransferManager.loadEmailData('test-id');

      expect(result.success).toBe(false);
      expect(result.error).toContain('No valid data found');
    });
  });

  describe('clearEmailData', () => {
    it('should clear data from all storage locations', async () => {
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify({
        'test-id': 'data',
        'other-id': 'other-data',
      }));
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify({
        'test-id': 'data',
        'other-id': 'other-data',
      }));
      mockFetch.mockResolvedValueOnce({ ok: true });

      await StateTransferManager.clearEmailData('test-id');

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'grademymail_data',
        JSON.stringify({ 'other-id': 'other-data' })
      );
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'grademymail_session_data',
        JSON.stringify({ 'other-id': 'other-data' })
      );
      expect(mockFetch).toHaveBeenCalledWith('/api/store?id=test-id', {
        method: 'DELETE',
      });
    });

    it('should handle storage failures gracefully', async () => {
      mockLocalStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      mockSessionStorage.setItem.mockImplementation(() => {
        throw new Error('Storage error');
      });
      mockFetch.mockRejectedValueOnce(new Error('Server error'));

      // Should not throw
      await expect(StateTransferManager.clearEmailData('test-id')).resolves.toBeUndefined();
    });
  });

  describe('serializeEmailData', () => {
    it('should serialize valid email data', () => {
      const data: EmailData = {
        id: 'test-id',
        originalText: 'Test content',
        originalHTML: '<p>Test content</p>',
        taggedContent: 'Test content',
        timestamp: Date.now(),
      };

      const result = StateTransferManager.serializeEmailData(data);
      const parsed = JSON.parse(result);

      expect(parsed.id).toBe(data.id);
      expect(parsed.originalText).toBe(data.originalText);
      expect(parsed.originalHTML).toBe(data.originalHTML);
      expect(parsed.taggedContent).toBe(data.taggedContent);
    });

    it('should sanitize HTML content', () => {
      const data: EmailData = {
        id: 'test-id',
        originalText: 'Test content',
        originalHTML: '<p>Test <script>alert("xss")</script> content</p>',
        taggedContent: 'Test content',
        timestamp: Date.now(),
      };

      const result = StateTransferManager.serializeEmailData(data);
      const parsed = JSON.parse(result);

      expect(parsed.originalHTML).not.toContain('<script>');
      expect(parsed.originalHTML).toContain('<p>Test  content</p>');
    });

    it('should throw error for missing required fields', () => {
      const invalidData = {
        id: 'test-id',
        originalText: '',
        originalHTML: '<p>Test</p>',
        taggedContent: 'Test',
        timestamp: Date.now(),
      } as EmailData;

      expect(() => StateTransferManager.serializeEmailData(invalidData)).toThrow();
    });
  });

  describe('deserializeEmailData', () => {
    it('should deserialize valid email data', () => {
      const data: EmailData = {
        id: 'test-id',
        originalText: 'Test content',
        originalHTML: '<p>Test content</p>',
        taggedContent: 'Test content',
        timestamp: Date.now(),
      };

      const serialized = JSON.stringify(data);
      const result = StateTransferManager.deserializeEmailData(serialized);

      expect(result).toEqual(data);
    });

    it('should throw error for invalid JSON', () => {
      expect(() => StateTransferManager.deserializeEmailData('invalid json')).toThrow();
    });

    it('should throw error for missing required fields', () => {
      const invalidData = {
        id: 'test-id',
        originalText: 'Test content',
        // Missing originalHTML, taggedContent, timestamp
      };

      const serialized = JSON.stringify(invalidData);
      expect(() => StateTransferManager.deserializeEmailData(serialized)).toThrow();
    });
  });
});