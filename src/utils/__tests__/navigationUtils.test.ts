import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NavigationManager, NavigationStateManager } from '../navigationUtils';
import { StateTransferManager } from '../stateTransfer';

// Mock StateTransferManager
vi.mock('../stateTransfer', () => ({
  StateTransferManager: {
    storeEmailData: vi.fn(),
    loadEmailData: vi.fn(),
    clearEmailData: vi.fn(),
  },
}));

const mockStateTransferManager = StateTransferManager as any;

describe('NavigationManager', () => {
  const mockNavigate = vi.fn();
  const mockOnStateChange = vi.fn();

  const mockEmailData = {
    originalText: 'Test email content',
    originalHTML: '<p>Test email content</p>',
    taggedContent: 'Test email <fluff>content</fluff>',
    metadata: {
      wordCount: 3,
      emailType: 'business',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('navigateToFixMyMail', () => {
    it('should successfully navigate with valid data', async () => {
      mockStateTransferManager.storeEmailData.mockResolvedValue({
        success: true,
        id: 'test-id-123',
      });

      await NavigationManager.navigateToFixMyMail(
        mockNavigate,
        mockEmailData,
        mockOnStateChange
      );

      expect(mockStateTransferManager.storeEmailData).toHaveBeenCalledWith(mockEmailData);
      expect(mockNavigate).toHaveBeenCalledWith('/fixmymail/test-id-123', {
        state: {
          dataId: 'test-id-123',
          hasData: true,
          timestamp: expect.any(Number),
        },
      });
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false, progress: 100 })
      );
    });

    it('should call onStateChange with progress updates', async () => {
      mockStateTransferManager.storeEmailData.mockResolvedValue({
        success: true,
        id: 'test-id-123',
      });

      await NavigationManager.navigateToFixMyMail(
        mockNavigate,
        mockEmailData,
        mockOnStateChange
      );

      // Check that progress updates were called
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: true, progress: 10 })
      );
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 30 })
      );
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ progress: 70 })
      );
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false, progress: 100 })
      );
    });

    it('should handle storage failure', async () => {
      mockStateTransferManager.storeEmailData.mockResolvedValue({
        success: false,
        error: 'Storage failed',
      });

      await expect(
        NavigationManager.navigateToFixMyMail(mockNavigate, mockEmailData, mockOnStateChange)
      ).rejects.toThrow('Storage failed');

      expect(mockNavigate).not.toHaveBeenCalled();
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: 'Storage failed',
          progress: 0,
        })
      );
    });

    it('should validate email data before storing', async () => {
      const invalidData = {
        originalText: '',
        originalHTML: '<p>Test</p>',
        taggedContent: 'Test',
      };

      await expect(
        NavigationManager.navigateToFixMyMail(mockNavigate, invalidData, mockOnStateChange)
      ).rejects.toThrow('Invalid email data: missing required fields');

      expect(mockStateTransferManager.storeEmailData).not.toHaveBeenCalled();
      expect(mockNavigate).not.toHaveBeenCalled();
    });

    it('should work without onStateChange callback', async () => {
      mockStateTransferManager.storeEmailData.mockResolvedValue({
        success: true,
        id: 'test-id-123',
      });

      await expect(
        NavigationManager.navigateToFixMyMail(mockNavigate, mockEmailData)
      ).resolves.toBeUndefined();

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('navigateToGradeMyMail', () => {
    it('should navigate back successfully', async () => {
      mockStateTransferManager.clearEmailData.mockResolvedValue(undefined);

      await NavigationManager.navigateToGradeMyMail(
        mockNavigate,
        'test-id-123',
        mockOnStateChange
      );

      expect(mockStateTransferManager.clearEmailData).toHaveBeenCalledWith('test-id-123');
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        state: {
          fromFixMyMail: true,
          timestamp: expect.any(Number),
        },
      });
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false, progress: 100 })
      );
    });

    it('should navigate without cleanup if no dataId provided', async () => {
      await NavigationManager.navigateToGradeMyMail(mockNavigate, undefined, mockOnStateChange);

      expect(mockStateTransferManager.clearEmailData).not.toHaveBeenCalled();
      expect(mockNavigate).toHaveBeenCalledWith('/', {
        state: {
          fromFixMyMail: true,
          timestamp: expect.any(Number),
        },
      });
    });

    it('should handle cleanup failure gracefully', async () => {
      mockStateTransferManager.clearEmailData.mockRejectedValue(new Error('Cleanup failed'));

      // Should not throw
      await NavigationManager.navigateToGradeMyMail(mockNavigate, 'test-id-123', mockOnStateChange);

      expect(mockNavigate).toHaveBeenCalled();
    });
  });

  describe('loadEmailDataForFixMyMail', () => {
    const mockEmailDataWithId = {
      id: 'test-id-123',
      originalText: 'Test email content',
      originalHTML: '<p>Test email content</p>',
      taggedContent: 'Test email <fluff>content</fluff>',
      timestamp: Date.now(),
      metadata: {
        wordCount: 3,
        emailType: 'business',
      },
    };

    it('should load data successfully', async () => {
      mockStateTransferManager.loadEmailData.mockResolvedValue({
        success: true,
        data: mockEmailDataWithId,
      });

      const result = await NavigationManager.loadEmailDataForFixMyMail(
        'test-id-123',
        mockOnStateChange
      );

      expect(result).toEqual(mockEmailDataWithId);
      expect(mockStateTransferManager.loadEmailData).toHaveBeenCalledWith('test-id-123');
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({ isLoading: false, progress: 100 })
      );
    });

    it('should handle load failure', async () => {
      mockStateTransferManager.loadEmailData.mockResolvedValue({
        success: false,
        error: 'Data not found',
      });

      const result = await NavigationManager.loadEmailDataForFixMyMail(
        'test-id-123',
        mockOnStateChange
      );

      expect(result).toBeNull();
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: 'Data not found',
          progress: 0,
        })
      );
    });

    it('should validate loaded data', async () => {
      const incompleteData = {
        id: 'test-id-123',
        originalText: '',
        originalHTML: '<p>Test</p>',
        taggedContent: 'Test',
        timestamp: Date.now(),
      };

      mockStateTransferManager.loadEmailData.mockResolvedValue({
        success: true,
        data: incompleteData,
      });

      const result = await NavigationManager.loadEmailDataForFixMyMail(
        'test-id-123',
        mockOnStateChange
      );

      expect(result).toBeNull();
      expect(mockOnStateChange).toHaveBeenCalledWith(
        expect.objectContaining({
          isLoading: false,
          error: 'Loaded data is incomplete or corrupted',
        })
      );
    });
  });

  describe('hasValidNavigationData', () => {
    it('should return true for valid navigation state', () => {
      const validState = {
        hasData: true,
        dataId: 'test-id-123',
        timestamp: Date.now(),
      };

      expect(NavigationManager.hasValidNavigationData(validState)).toBe(true);
    });

    it('should return false for invalid navigation state', () => {
      expect(NavigationManager.hasValidNavigationData(null)).toBe(false);
      expect(NavigationManager.hasValidNavigationData(undefined)).toBe(false);
      expect(NavigationManager.hasValidNavigationData({})).toBe(false);
      expect(NavigationManager.hasValidNavigationData({ hasData: false })).toBe(false);
      expect(NavigationManager.hasValidNavigationData({ hasData: true })).toBe(false);
      expect(NavigationManager.hasValidNavigationData({ hasData: true, dataId: 123 })).toBe(false);
    });
  });

  describe('getDataIdFromState', () => {
    it('should extract dataId from valid state', () => {
      const validState = {
        hasData: true,
        dataId: 'test-id-123',
        timestamp: Date.now(),
      };

      expect(NavigationManager.getDataIdFromState(validState)).toBe('test-id-123');
    });

    it('should return null for invalid state', () => {
      expect(NavigationManager.getDataIdFromState(null)).toBeNull();
      expect(NavigationManager.getDataIdFromState({})).toBeNull();
      expect(NavigationManager.getDataIdFromState({ hasData: false })).toBeNull();
    });
  });

  describe('createLoadingState', () => {
    it('should create loading state with default values', () => {
      const state = NavigationManager.createLoadingState();

      expect(state).toEqual({
        isLoading: false,
        error: null,
        progress: 0,
      });
    });

    it('should create loading state with custom values', () => {
      const state = NavigationManager.createLoadingState(true, 'Test error', 50);

      expect(state).toEqual({
        isLoading: true,
        error: 'Test error',
        progress: 50,
      });
    });
  });
});

describe('NavigationStateManager', () => {
  let manager: NavigationStateManager;
  const mockCallback = vi.fn();

  beforeEach(() => {
    manager = new NavigationStateManager();
    vi.clearAllMocks();
  });

  describe('subscribe', () => {
    it('should call callback immediately with current state', () => {
      manager.subscribe(mockCallback);

      expect(mockCallback).toHaveBeenCalledWith({
        isLoading: false,
        error: null,
        progress: 0,
      });
    });

    it('should return unsubscribe function', () => {
      const unsubscribe = manager.subscribe(mockCallback);

      expect(typeof unsubscribe).toBe('function');

      // Test unsubscribe
      unsubscribe();
      manager.updateState({ isLoading: true });

      // Should only have been called once (on subscribe)
      expect(mockCallback).toHaveBeenCalledTimes(1);
    });
  });

  describe('updateState', () => {
    it('should update state and notify subscribers', () => {
      manager.subscribe(mockCallback);
      vi.clearAllMocks();

      manager.updateState({ isLoading: true, progress: 50 });

      expect(mockCallback).toHaveBeenCalledWith({
        isLoading: true,
        error: null,
        progress: 50,
      });
    });

    it('should notify multiple subscribers', () => {
      const mockCallback2 = vi.fn();
      manager.subscribe(mockCallback);
      manager.subscribe(mockCallback2);
      vi.clearAllMocks();

      manager.updateState({ error: 'Test error' });

      expect(mockCallback).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Test error',
        progress: 0,
      });
      expect(mockCallback2).toHaveBeenCalledWith({
        isLoading: false,
        error: 'Test error',
        progress: 0,
      });
    });
  });

  describe('getCurrentState', () => {
    it('should return current state', () => {
      const state = manager.getCurrentState();

      expect(state).toEqual({
        isLoading: false,
        error: null,
        progress: 0,
      });
    });

    it('should return updated state', () => {
      manager.updateState({ isLoading: true, progress: 75 });
      const state = manager.getCurrentState();

      expect(state).toEqual({
        isLoading: true,
        error: null,
        progress: 75,
      });
    });
  });

  describe('reset', () => {
    it('should reset state to defaults', () => {
      manager.updateState({ isLoading: true, error: 'Test error', progress: 100 });
      manager.subscribe(mockCallback);
      vi.clearAllMocks();

      manager.reset();

      expect(mockCallback).toHaveBeenCalledWith({
        isLoading: false,
        error: null,
        progress: 0,
      });
    });
  });
});