import { useMutation, useQuery, useQueryClient, type UseQueryOptions, type UseMutationOptions } from '@tanstack/react-query';
import { apiService, APIError, type AnalyzeResponse, type FixResponse, type StoreResponse, type LoadResponse, type UnifiedAnalysisResponse } from './api';
import { useAppStore } from '../store';

// Query keys for consistent caching
export const queryKeys = {
  analyze: (content: string) => ['analyze', content] as const,
  analyzeNewsletter: (content: string) => ['analyzeNewsletter', content] as const,
  fix: (taggedContent: string) => ['fix', taggedContent] as const,
  load: (id: string) => ['load', id] as const,
  health: () => ['health'] as const,
} as const;

// Custom hook for email analysis
export const useAnalyzeEmail = (
  content: string,
  options?: Omit<UseQueryOptions<AnalyzeResponse, APIError>, 'queryKey' | 'queryFn'>
) => {
  const { addError, clearAllErrors, setAnalyzing } = useAppStore();
  
  const query = useQuery({
    queryKey: queryKeys.analyze(content),
    queryFn: async () => {
      setAnalyzing(true);
      clearAllErrors();
      try {
        const result = await apiService.analyzeEmail(content);
        setAnalyzing(false);
        clearAllErrors();
        return result;
      } catch (error) {
        setAnalyzing(false);
        const apiError = error as APIError;
        addError({
          type: apiError.type,
          severity: 'medium',
          message: apiError.message,
          userMessage: 'Analysis failed. Please try again.',
          technicalMessage: apiError.message,
          retryable: true,
          suggestions: ['Check your internet connection', 'Try again in a moment'],
        });
        throw error;
      }
    },
    enabled: Boolean(content && content.trim().length > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if ((error as APIError).type === 'validation') return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });

  return query;
};

// Custom hook for GroqGemma newsletter analysis with dual-system approach
export const useAnalyzeNewsletter = (
  content: string,
  options?: Omit<UseQueryOptions<UnifiedAnalysisResponse, APIError>, 'queryKey' | 'queryFn'>
) => {
  const { addError, clearAllErrors, setAnalyzing } = useAppStore();
  
  const query = useQuery({
    queryKey: queryKeys.analyzeNewsletter(content),
    queryFn: async () => {
      setAnalyzing(true);
      clearAllErrors();
      try {
        const result = await apiService.analyzeNewsletter(content);
        setAnalyzing(false);
        clearAllErrors();
        return result;
      } catch (error) {
        setAnalyzing(false);
        const apiError = error as APIError;
        addError({
          type: apiError.type,
          severity: 'medium',
          message: apiError.message,
          userMessage: 'Newsletter analysis failed. Please try again.',
          technicalMessage: apiError.message,
          retryable: true,
          suggestions: ['Check your internet connection', 'Try again in a moment'],
        });
        throw error;
      }
    },
    enabled: Boolean(content && content.trim().length > 0),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if ((error as APIError).type === 'validation') return false;
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    ...options,
  });

  return query;
};

// Custom hook for email fixing
export const useFixEmail = (
  options?: Omit<UseMutationOptions<FixResponse, APIError, string>, 'mutationFn'>
) => {
  const { addError, clearAllErrors, setFixing } = useAppStore();
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (taggedContent: string) => {
      setFixing(true);
      clearAllErrors();
      try {
        const result = await apiService.fixEmail(taggedContent);
        setFixing(false);
        clearAllErrors();
        
        // Cache the result for potential reuse
        queryClient.setQueryData(queryKeys.fix(taggedContent), result);
        
        return result;
      } catch (error) {
        setFixing(false);
        const apiError = error as APIError;
        addError({
          type: apiError.type,
          severity: 'medium',
          message: apiError.message,
          userMessage: 'Failed to fix email. Please try again.',
          technicalMessage: apiError.message,
          retryable: true,
          suggestions: ['Try again', 'Check your internet connection'],
        });
        throw error;
      }
    },
    retry: (failureCount, error) => {
      // Don't retry validation errors
      if ((error as APIError).type === 'validation') return false;
      return failureCount < 2;
    },
    ...options,
  });
};

// Custom hook for storing data
export const useStoreData = (
  options?: Omit<UseMutationOptions<StoreResponse, APIError, {
    fullOriginalText: string;
    fullOriginalHTML: string;
    taggedContent: string;
  }>, 'mutationFn'>
) => {
  const { addError, clearAllErrors } = useAppStore();
  
  return useMutation({
    mutationFn: async (payload) => {
      clearAllErrors();
      try {
        const result = await apiService.storeData(payload);
        return result;
      } catch (error) {
        const apiError = error as APIError;
        addError({
          type: apiError.type,
          severity: 'medium',
          message: apiError.message,
          userMessage: 'Failed to store data. Please try again.',
          technicalMessage: apiError.message,
          retryable: true,
          suggestions: ['Try again', 'Check your internet connection'],
        });
        throw error;
      }
    },
    retry: 1,
    ...options,
  });
};

// Custom hook for loading data
export const useLoadData = (
  id: string,
  options?: Omit<UseQueryOptions<LoadResponse, APIError>, 'queryKey' | 'queryFn'>
) => {
  const { addError, clearAllErrors } = useAppStore();
  
  return useQuery({
    queryKey: queryKeys.load(id),
    queryFn: async () => {
      clearAllErrors();
      try {
        const result = await apiService.loadData(id);
        return result;
      } catch (error) {
        const apiError = error as APIError;
        addError({
          type: apiError.type,
          severity: 'medium',
          message: apiError.message,
          userMessage: 'Failed to load data. Please try again.',
          technicalMessage: apiError.message,
          retryable: true,
          suggestions: ['Try again', 'Check your internet connection'],
        });
        throw error;
      }
    },
    enabled: Boolean(id),
    staleTime: 0, // Always fetch fresh data for temporary storage
    gcTime: 1 * 60 * 1000, // 1 minute cache
    retry: (failureCount, error) => {
      // Don't retry if data not found
      if ((error as APIError).status === 404) return false;
      return failureCount < 2;
    },
    ...options,
  });
};

// Custom hook for API health check
export const useAPIHealth = (
  options?: Omit<UseQueryOptions<boolean, APIError>, 'queryKey' | 'queryFn'>
) => {
  return useQuery({
    queryKey: queryKeys.health(),
    queryFn: async () => {
      try {
        const response = await fetch('/api/health', { 
          method: 'GET',
          signal: AbortSignal.timeout(5000)
        });
        return response.ok;
      } catch {
        return false;
      }
    },
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 60 * 1000, // 1 minute
    retry: false,
    refetchOnWindowFocus: false,
    ...options,
  });
};

// Utility hooks for query management
export const useQueryUtils = () => {
  const queryClient = useQueryClient();
  
  return {
    // Invalidate all analysis queries
    invalidateAnalysis: () => {
      queryClient.invalidateQueries({ queryKey: ['analyze'] });
      queryClient.invalidateQueries({ queryKey: ['analyzeNewsletter'] });
    },
    
    // Invalidate all fix queries
    invalidateFix: () => {
      queryClient.invalidateQueries({ queryKey: ['fix'] });
    },
    
    // Clear all cached data
    clearCache: () => {
      queryClient.clear();
    },
    
    // Prefetch analysis for content
    prefetchAnalysis: (content: string) => {
      if (content && content.trim().length > 0) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.analyze(content),
          queryFn: () => apiService.analyzeEmail(content),
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    
    // Prefetch newsletter analysis for content
    prefetchNewsletterAnalysis: (content: string) => {
      if (content && content.trim().length > 0) {
        queryClient.prefetchQuery({
          queryKey: queryKeys.analyzeNewsletter(content),
          queryFn: () => apiService.analyzeNewsletter(content),
          staleTime: 5 * 60 * 1000,
        });
      }
    },
    
    // Cancel all ongoing queries
    cancelQueries: () => {
      queryClient.cancelQueries();
      apiService.cancelAllRequests();
    },
  };
};

// Hook for optimistic updates
export const useOptimisticUpdates = () => {
  const queryClient = useQueryClient();
  
  return {
    // Optimistically update analysis result
    updateAnalysisOptimistically: (content: string, result: AnalyzeResponse) => {
      queryClient.setQueryData(queryKeys.analyze(content), result);
    },
    
    // Optimistically update newsletter analysis result
    updateNewsletterAnalysisOptimistically: (content: string, result: UnifiedAnalysisResponse) => {
      queryClient.setQueryData(queryKeys.analyzeNewsletter(content), result);
    },
    
    // Optimistically update fix result
    updateFixOptimistically: (taggedContent: string, result: FixResponse) => {
      queryClient.setQueryData(queryKeys.fix(taggedContent), result);
    },
    
    // Rollback optimistic update
    rollbackOptimisticUpdate: (queryKey: readonly unknown[]) => {
      queryClient.invalidateQueries({ queryKey });
    },
  };
};

// Background sync utilities
export const useBackgroundSync = () => {
  const queryClient = useQueryClient();
  
  return {
    // Sync data in background
    syncInBackground: () => {
      // Refetch all active queries in background
      queryClient.refetchQueries({ type: 'active' });
    },
    
    // Sync specific query
    syncQuery: (queryKey: readonly unknown[]) => {
      queryClient.refetchQueries({ queryKey });
    },
  };
};