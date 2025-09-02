import { useEffect, useCallback, useRef, useState } from 'react';
import { Subscription } from 'rxjs';
import { 
  RealTimeAnalysisEngine, 
  createAnalysisEngine, 
  type AnalysisState, 
  type AnalysisConfig,
  type ExtractedContent 
} from '../services/analysisEngine';
import { useAppStore } from '../store';

// Hook options interface
export interface UseRealTimeAnalysisOptions extends Partial<AnalysisConfig> {
  // Enable/disable the analysis
  enabled?: boolean;
  
  // Callback when analysis starts
  onAnalysisStart?: (content: ExtractedContent) => void;
  
  // Callback when analysis completes
  onAnalysisComplete?: (result: any, content: ExtractedContent) => void;
  
  // Callback when analysis fails
  onAnalysisError?: (error: any, content: ExtractedContent) => void;
  
  // Callback for state changes
  onStateChange?: (state: AnalysisState) => void;
}

// Return type for the hook
export interface UseRealTimeAnalysisReturn {
  // Current analysis state
  state: AnalysisState;
  
  // Analyze content manually
  analyzeContent: (html: string, plainText: string) => void;
  
  // Check if currently analyzing
  isAnalyzing: boolean;
  
  // Get last analysis result
  lastResult: any | null;
  
  // Get last error
  lastError: any | null;
  
  // Clear analysis state
  clearAnalysis: () => void;
  
  // Cancel ongoing requests
  cancelRequests: () => void;
  
  // Get engine statistics
  getStats: () => any;
  
  // Update configuration
  updateConfig: (config: Partial<AnalysisConfig>) => void;
}

/**
 * Hook for real-time email content analysis
 * Integrates with the RealTimeAnalysisEngine and provides React-friendly interface
 */
export const useRealTimeAnalysis = (options: UseRealTimeAnalysisOptions = {}): UseRealTimeAnalysisReturn => {
  const {
    enabled = true,
    onAnalysisStart,
    onAnalysisComplete,
    onAnalysisError,
    onStateChange,
    ...engineConfig
  } = options;

  // Store integration
  const { setAnalyzing, addError, clearAllErrors } = useAppStore();
  
  // Engine instance (created once and reused)
  const engineRef = useRef<RealTimeAnalysisEngine | null>(null);
  const subscriptionRef = useRef<Subscription | null>(null);
  
  // Local state for the current analysis state
  const [state, setState] = useState<AnalysisState>({
    isAnalyzing: false,
    content: null,
    result: null,
    error: null,
    lastAnalyzedAt: null,
    requestId: null,
  });

  // Initialize engine on first render
  useEffect(() => {
    if (!engineRef.current) {
      console.log('🔧 Initializing real-time analysis engine...');
      engineRef.current = createAnalysisEngine(engineConfig);
    }
  }, []); // Empty dependency array - only run once

  // Subscribe to engine state changes
  useEffect(() => {
    if (!engineRef.current || !enabled) return;

    console.log('🔗 Subscribing to analysis engine state changes...');
    
    subscriptionRef.current = engineRef.current.getState().subscribe({
      next: (newState) => {
        console.log('📊 Analysis state updated:', {
          isAnalyzing: newState.isAnalyzing,
          hasResult: !!newState.result,
          hasError: !!newState.error,
          contentHash: newState.content?.contentHash,
        });

        setState(newState);
        
        // Update global store
        setAnalyzing(newState.isAnalyzing);
        
        if (newState.error) {
          addError({
            type: 'ai',
            severity: 'medium',
            message: newState.error.message,
            userMessage: 'Analysis failed. Please try again.',
            technicalMessage: newState.error.message,
            retryable: true,
            suggestions: ['Check your internet connection', 'Try again in a moment'],
          });
        } else {
          clearAllErrors();
        }

        // Trigger callbacks based on state changes
        if (newState.content) {
          if (newState.isAnalyzing && !state.isAnalyzing) {
            // Analysis started
            onAnalysisStart?.(newState.content);
          } else if (!newState.isAnalyzing && state.isAnalyzing) {
            // Analysis completed
            if (newState.result) {
              onAnalysisComplete?.(newState.result, newState.content);
            } else if (newState.error) {
              onAnalysisError?.(newState.error, newState.content);
            }
          }
        }

        // General state change callback
        onStateChange?.(newState);
      },
      error: (error) => {
        console.error('❌ Analysis engine subscription error:', error);
        addError({
          type: 'client',
          severity: 'high',
          message: 'Analysis engine error',
          userMessage: 'Analysis engine encountered an error. Please refresh the page.',
          technicalMessage: error.message || 'Unknown error',
          retryable: true,
          suggestions: ['Refresh the page', 'Check your internet connection'],
        });
      }
    });

    return () => {
      console.log('🧹 Unsubscribing from analysis engine...');
      subscriptionRef.current?.unsubscribe();
      subscriptionRef.current = null;
    };
  }, [enabled, onAnalysisStart, onAnalysisComplete, onAnalysisError, onStateChange, setAnalyzing, addError, clearAllErrors, state.isAnalyzing]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      console.log('🧹 Cleaning up real-time analysis hook...');
      subscriptionRef.current?.unsubscribe();
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, []);

  // Analyze content function
  const analyzeContent = useCallback((html: string, plainText: string) => {
    if (!engineRef.current || !enabled) {
      console.warn('⚠️ Analysis engine not available or disabled');
      return;
    }

    console.log('🔍 Triggering content analysis...', {
      htmlLength: html.length,
      textLength: plainText.length,
      enabled,
    });

    engineRef.current.analyzeContent(html, plainText);
  }, [enabled]);

  // Clear analysis function
  const clearAnalysis = useCallback(() => {
    if (!engineRef.current) return;
    
    console.log('🧹 Clearing analysis state...');
    engineRef.current.clearAnalysis();
    clearAllErrors();
  }, [clearAllErrors]);

  // Cancel requests function
  const cancelRequests = useCallback(() => {
    if (!engineRef.current) return;
    
    console.log('🛑 Cancelling analysis requests...');
    engineRef.current.cancelAllRequests();
  }, []);

  // Get stats function
  const getStats = useCallback(() => {
    if (!engineRef.current) return null;
    return engineRef.current.getStats();
  }, []);

  // Update config function
  const updateConfig = useCallback((config: Partial<AnalysisConfig>) => {
    if (!engineRef.current) return;
    
    console.log('⚙️ Updating analysis engine configuration...', config);
    engineRef.current.updateConfig(config);
  }, []);

  return {
    state,
    analyzeContent,
    isAnalyzing: state.isAnalyzing,
    lastResult: state.result,
    lastError: state.error,
    clearAnalysis,
    cancelRequests,
    getStats,
    updateConfig,
  };
};

/**
 * Hook that automatically connects a rich text editor to real-time analysis
 * This is a convenience hook that handles the editor change events
 */
export const useEditorAnalysis = (
  editorRef: React.RefObject<{ getHTML: () => string; getPlainText: () => string }>,
  options: UseRealTimeAnalysisOptions = {}
) => {
  const analysis = useRealTimeAnalysis(options);
  
  // Auto-analyze when editor content changes
  const handleEditorChange = useCallback((html: string, plainText: string) => {
    analysis.analyzeContent(html, plainText);
  }, [analysis]);

  // Manual trigger using editor ref
  const triggerAnalysis = useCallback(() => {
    if (!editorRef.current) {
      console.warn('⚠️ Editor ref not available for analysis');
      return;
    }

    try {
      const html = editorRef.current.getHTML();
      const plainText = editorRef.current.getPlainText();
      analysis.analyzeContent(html, plainText);
    } catch (error) {
      console.error('❌ Error getting content from editor:', error);
    }
  }, [editorRef, analysis]);

  return {
    ...analysis,
    handleEditorChange,
    triggerAnalysis,
  };
};

// Export types
export type { AnalysisState, AnalysisConfig, ExtractedContent };