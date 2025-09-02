import type { NavigateFunction } from 'react-router-dom';
import { StateTransferManager, type EmailData } from './stateTransfer';

export interface NavigationState {
  isLoading: boolean;
  error: string | null;
  progress: number;
}

export type NavigationStateCallback = (state: NavigationState) => void;

/**
 * Navigation utilities with loading states and data transfer
 */
export class NavigationManager {
  /**
   * Navigate from GradeMyMail to FixMyMail with data transfer
   */
  static async navigateToFixMyMail(
    navigate: NavigateFunction,
    emailData: Omit<EmailData, 'id' | 'timestamp'>,
    onStateChange?: NavigationStateCallback
  ): Promise<void> {
    const updateState = (state: Partial<NavigationState>) => {
      if (onStateChange) {
        onStateChange({
          isLoading: false,
          error: null,
          progress: 0,
          ...state,
        });
      }
    };

    try {
      updateState({ isLoading: true, progress: 10 });

      // Validate email data before storing
      if (!emailData.originalText || !emailData.originalHTML || !emailData.taggedContent) {
        throw new Error('Invalid email data: missing required fields');
      }

      updateState({ progress: 25 });

      // Add a small delay to show the "Securing data transfer" step
      await new Promise(resolve => setTimeout(resolve, 300));
      updateState({ progress: 40 });

      // Store data using parallel storage strategy
      const storeResult = await StateTransferManager.storeEmailData(emailData);
      
      if (!storeResult.success) {
        throw new Error(storeResult.error || 'Failed to store email data');
      }

      updateState({ progress: 65 });

      // Add another small delay to show the "Initializing AI models" step
      await new Promise(resolve => setTimeout(resolve, 200));
      updateState({ progress: 80 });

      // Navigate with the data ID
      navigate(`/fixmymail/${storeResult.id}`, {
        state: { 
          dataId: storeResult.id,
          hasData: true,
          timestamp: Date.now(),
        },
      });

      updateState({ progress: 100, isLoading: false });

    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        progress: 0,
      });
      throw error;
    }
  }

  /**
   * Navigate back to GradeMyMail with optional data cleanup
   */
  static async navigateToGradeMyMail(
    navigate: NavigateFunction,
    dataId?: string,
    onStateChange?: NavigationStateCallback
  ): Promise<void> {
    const updateState = (state: Partial<NavigationState>) => {
      if (onStateChange) {
        onStateChange({
          isLoading: false,
          error: null,
          progress: 0,
          ...state,
        });
      }
    };

    try {
      updateState({ isLoading: true, progress: 20 });

      // Clean up stored data if provided
      if (dataId) {
        await StateTransferManager.clearEmailData(dataId);
      }

      updateState({ progress: 80 });

      // Navigate back to GradeMyMail
      navigate('/', {
        state: { 
          fromFixMyMail: true,
          timestamp: Date.now(),
        },
      });

      updateState({ progress: 100, isLoading: false });

    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Navigation failed',
        progress: 0,
      });
      // Don't throw here - navigation should still work even if cleanup fails
      console.warn('Navigation cleanup failed:', error);
      
      // Still navigate even if cleanup fails
      navigate('/', {
        state: { 
          fromFixMyMail: true,
          timestamp: Date.now(),
        },
      });
    }
  }

  /**
   * Load email data for FixMyMail with validation
   */
  static async loadEmailDataForFixMyMail(
    dataId: string,
    onStateChange?: NavigationStateCallback
  ): Promise<EmailData | null> {
    const updateState = (state: Partial<NavigationState>) => {
      if (onStateChange) {
        onStateChange({
          isLoading: false,
          error: null,
          progress: 0,
          ...state,
        });
      }
    };

    try {
      updateState({ isLoading: true, progress: 20 });

      const loadResult = await StateTransferManager.loadEmailData(dataId);

      updateState({ progress: 60 });

      if (!loadResult.success || !loadResult.data) {
        throw new Error(loadResult.error || 'Failed to load email data');
      }

      // Validate loaded data
      const data = loadResult.data;
      if (!data.originalText || !data.originalHTML || !data.taggedContent) {
        throw new Error('Loaded data is incomplete or corrupted');
      }

      updateState({ progress: 100, isLoading: false });
      return data;

    } catch (error) {
      updateState({
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load data',
        progress: 0,
      });
      return null;
    }
  }

  /**
   * Check if navigation state indicates data is available
   */
  static hasValidNavigationData(state: any): boolean {
    return !!(state && state.hasData && state.dataId && typeof state.dataId === 'string');
  }

  /**
   * Extract data ID from navigation state
   */
  static getDataIdFromState(state: any): string | null {
    if (this.hasValidNavigationData(state)) {
      return state.dataId;
    }
    return null;
  }

  /**
   * Create loading state for components
   */
  static createLoadingState(
    isLoading: boolean = false,
    error: string | null = null,
    progress: number = 0
  ): NavigationState {
    return { isLoading, error, progress };
  }
}

/**
 * Hook-like utility for managing navigation state in components
 */
export class NavigationStateManager {
  private callbacks: Set<NavigationStateCallback> = new Set();
  private currentState: NavigationState = {
    isLoading: false,
    error: null,
    progress: 0,
  };

  subscribe(callback: NavigationStateCallback): () => void {
    this.callbacks.add(callback);
    // Immediately call with current state
    callback(this.currentState);
    
    // Return unsubscribe function
    return () => {
      this.callbacks.delete(callback);
    };
  }

  updateState(newState: Partial<NavigationState>): void {
    this.currentState = { ...this.currentState, ...newState };
    this.callbacks.forEach(callback => callback(this.currentState));
  }

  getCurrentState(): NavigationState {
    return { ...this.currentState };
  }

  reset(): void {
    this.updateState({
      isLoading: false,
      error: null,
      progress: 0,
    });
  }
}