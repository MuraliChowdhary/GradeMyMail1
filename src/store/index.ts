import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Email content state interface
interface EmailContent {
  id: string;
  originalText: string;
  originalHTML: string;
  taggedContent?: string;
  analyzedSentences?: Array<{
    type: 'fluff' | 'spam_words' | 'hard_to_read';
    sentence: string;
    position: { start: number; end: number };
    severity: 'low' | 'medium' | 'high';
  }>;
  metadata?: {
    emailType?: 'business' | 'marketing' | 'personal' | 'follow-up';
    tone?: 'professional' | 'casual' | 'urgent' | 'friendly';
    readabilityScore?: number;
    engagementScore?: number;
    wordCount?: number;
    estimatedReadTime?: number;
    createdAt?: Date;
    lastModified?: Date;
    version?: number;
  };
}

// UI state interface
interface UIState {
  isAnalyzing: boolean;
  isFixing: boolean;
  currentStep: 'grade' | 'fix';
  showLegend: boolean;
  theme: 'light' | 'dark';
}

// Enhanced error classification types
export type ErrorType = 'network' | 'validation' | 'ai' | 'client' | 'server' | 'storage' | 'timeout' | 'rate_limit';
export type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

// Structured error interface
export interface StructuredError {
  id: string;
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  technicalMessage: string;
  timestamp: Date;
  retryable: boolean;
  suggestions: string[];
  context?: Record<string, any>;
  recoveryActions?: RecoveryAction[];
}

// Recovery action interface
export interface RecoveryAction {
  id: string;
  label: string;
  description: string;
  action: () => Promise<void> | void;
  primary?: boolean;
}

// Error state interface with enhanced features
export interface ErrorState {
  hasError: boolean;
  errors: StructuredError[];
  currentError?: StructuredError;
  errorHistory: StructuredError[];
  retryCount: number;
  lastRetryAt?: Date;
  isRecovering: boolean;
  recoveryProgress: number;
  fallbackMode: boolean;
  preservedState?: Record<string, any>;
}

// Combined store interface
interface AppStore {
  // Email content state
  emailContent: EmailContent | null;
  
  // UI state
  ui: UIState;
  
  // Error state
  error: ErrorState;
  
  // Actions for email content
  setEmailContent: (content: Partial<EmailContent>) => void;
  updateEmailContent: (updates: Partial<EmailContent>) => void;
  clearEmailContent: () => void;
  
  // Actions for UI state
  setAnalyzing: (isAnalyzing: boolean) => void;
  setFixing: (isFixing: boolean) => void;
  setCurrentStep: (step: 'grade' | 'fix') => void;
  toggleLegend: () => void;
  setTheme: (theme: 'light' | 'dark') => void;
  
  // Enhanced actions for error handling
  addError: (error: Omit<StructuredError, 'id' | 'timestamp'>) => void;
  removeError: (errorId: string) => void;
  setCurrentError: (errorId?: string) => void;
  clearAllErrors: () => void;
  incrementRetryCount: () => void;
  resetRetryCount: () => void;
  setRecovering: (isRecovering: boolean, progress?: number) => void;
  setFallbackMode: (enabled: boolean) => void;
  preserveState: (state: Record<string, any>) => void;
  restoreState: () => Record<string, any> | undefined;
  getErrorById: (errorId: string) => StructuredError | undefined;
  
  // Utility actions
  reset: () => void;
}

// Initial states
const initialEmailContent: EmailContent | null = null;

const initialUIState: UIState = {
  isAnalyzing: false,
  isFixing: false,
  currentStep: 'grade',
  showLegend: false,
  theme: 'light',
};

const initialErrorState: ErrorState = {
  hasError: false,
  errors: [],
  currentError: undefined,
  errorHistory: [],
  retryCount: 0,
  lastRetryAt: undefined,
  isRecovering: false,
  recoveryProgress: 0,
  fallbackMode: false,
  preservedState: undefined,
};

// Create the store
export const useAppStore = create<AppStore>()(
  devtools(
    (set): AppStore => ({
      // Initial state
      emailContent: initialEmailContent,
      ui: initialUIState,
      error: initialErrorState,
      
      // Email content actions
      setEmailContent: (content) =>
        set(
          () => ({
            emailContent: {
              id: content.id || crypto.randomUUID(),
              originalText: content.originalText || '',
              originalHTML: content.originalHTML || '',
              ...content,
            },
          }),
          false,
          'setEmailContent'
        ),
      
      updateEmailContent: (updates) =>
        set(
          (state) => ({
            emailContent: state.emailContent
              ? { ...state.emailContent, ...updates }
              : null,
          }),
          false,
          'updateEmailContent'
        ),
      
      clearEmailContent: () =>
        set({ emailContent: null }, false, 'clearEmailContent'),
      
      // UI actions
      setAnalyzing: (isAnalyzing) =>
        set(
          (state) => ({
            ui: { ...state.ui, isAnalyzing },
          }),
          false,
          'setAnalyzing'
        ),
      
      setFixing: (isFixing) =>
        set(
          (state) => ({
            ui: { ...state.ui, isFixing },
          }),
          false,
          'setFixing'
        ),
      
      setCurrentStep: (currentStep) =>
        set(
          (state) => ({
            ui: { ...state.ui, currentStep },
          }),
          false,
          'setCurrentStep'
        ),
      
      toggleLegend: () =>
        set(
          (state) => ({
            ui: { ...state.ui, showLegend: !state.ui.showLegend },
          }),
          false,
          'toggleLegend'
        ),
      
      setTheme: (theme) =>
        set(
          (state) => ({
            ui: { ...state.ui, theme },
          }),
          false,
          'setTheme'
        ),
      
      // Enhanced error actions
      addError: (errorData) =>
        set(
          (state) => {
            const error: StructuredError = {
              ...errorData,
              id: crypto.randomUUID(),
              timestamp: new Date(),
            };
            
            const errors = [...state.error.errors, error];
            const errorHistory = [...state.error.errorHistory, error].slice(-50); // Keep last 50 errors
            
            return {
              error: {
                ...state.error,
                hasError: true,
                errors,
                errorHistory,
                currentError: error,
              },
            };
          },
          false,
          'addError'
        ),
      
      removeError: (errorId) =>
        set(
          (state) => {
            const errors = state.error.errors.filter(e => e.id !== errorId);
            const currentError = state.error.currentError?.id === errorId 
              ? errors[errors.length - 1] 
              : state.error.currentError;
            
            return {
              error: {
                ...state.error,
                errors,
                currentError,
                hasError: errors.length > 0,
              },
            };
          },
          false,
          'removeError'
        ),
      
      setCurrentError: (errorId) =>
        set(
          (state) => {
            const currentError = errorId 
              ? state.error.errors.find(e => e.id === errorId)
              : undefined;
            
            return {
              error: {
                ...state.error,
                currentError,
              },
            };
          },
          false,
          'setCurrentError'
        ),
      
      clearAllErrors: () =>
        set(
          (state) => ({
            error: {
              ...initialErrorState,
              errorHistory: state.error.errorHistory, // Preserve history
            },
          }),
          false,
          'clearAllErrors'
        ),
      
      incrementRetryCount: () =>
        set(
          (state) => ({
            error: {
              ...state.error,
              retryCount: state.error.retryCount + 1,
              lastRetryAt: new Date(),
            },
          }),
          false,
          'incrementRetryCount'
        ),
      
      resetRetryCount: () =>
        set(
          (state) => ({
            error: {
              ...state.error,
              retryCount: 0,
              lastRetryAt: undefined,
            },
          }),
          false,
          'resetRetryCount'
        ),
      
      setRecovering: (isRecovering, progress = 0) =>
        set(
          (state) => ({
            error: {
              ...state.error,
              isRecovering,
              recoveryProgress: progress,
            },
          }),
          false,
          'setRecovering'
        ),
      
      setFallbackMode: (enabled) =>
        set(
          (state) => ({
            error: {
              ...state.error,
              fallbackMode: enabled,
            },
          }),
          false,
          'setFallbackMode'
        ),
      
      preserveState: (stateToPreserve) =>
        set(
          (state) => ({
            error: {
              ...state.error,
              preservedState: stateToPreserve,
            },
          }),
          false,
          'preserveState'
        ),
      
      restoreState: () => {
        const state = useAppStore.getState();
        const preservedState = state.error.preservedState;
        
        // Clear preserved state after restoration
        set(
          (currentState) => ({
            error: {
              ...currentState.error,
              preservedState: undefined,
            },
          }),
          false,
          'restoreState'
        );
        
        return preservedState;
      },
      
      getErrorById: (errorId: string) => {
        const state = useAppStore.getState();
        return state.error.errors.find(e => e.id === errorId);
      },
      
      // Utility actions
      reset: () =>
        set(
          {
            emailContent: initialEmailContent,
            ui: initialUIState,
            error: initialErrorState,
          },
          false,
          'reset'
        ),
    }),
    {
      name: 'email-analysis-store',
    }
  )
);

// Selector hooks for better performance
export const useEmailContent = () => useAppStore((state) => state.emailContent);
export const useUIState = () => useAppStore((state) => state.ui);
export const useErrorState = () => useAppStore((state) => state.error);
export const useIsAnalyzing = () => useAppStore((state) => state.ui.isAnalyzing);
export const useIsFixing = () => useAppStore((state) => state.ui.isFixing);
export const useCurrentStep = () => useAppStore((state) => state.ui.currentStep);