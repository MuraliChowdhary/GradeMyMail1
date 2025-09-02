import React, { createContext, useContext, ReactNode } from 'react';
import { useLoadingState, type LoadingType } from '../hooks/useLoadingState';
import { LoadingScreen } from '../components/LoadingScreen/LoadingScreen';

interface LoadingContextType {
  startLoading: (type: LoadingType, message?: string) => void;
  updateProgress: (progress: number) => void;
  stopLoading: () => void;
  setMessage: (message: string) => void;
  simulateProgress: (duration?: number) => void;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

interface LoadingProviderProps {
  children: ReactNode;
}

export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
  const {
    loadingState,
    startLoading,
    updateProgress,
    stopLoading,
    setMessage,
    simulateProgress,
  } = useLoadingState();

  const contextValue: LoadingContextType = {
    startLoading,
    updateProgress,
    stopLoading,
    setMessage,
    simulateProgress,
  };

  return (
    <LoadingContext.Provider value={contextValue}>
      {children}
      
      <LoadingScreen
        isVisible={loadingState.isLoading}
        type={loadingState.type}
        message={loadingState.message}
        progress={loadingState.progress}
        onComplete={stopLoading}
      />
    </LoadingContext.Provider>
  );
};

export const useLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useLoading must be used within a LoadingProvider');
  }
  return context;
};

export default LoadingProvider;