import React, { useEffect, Suspense, lazy, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { ThemeProvider } from './components/ThemeProvider';
import { LoadingProvider } from './contexts/LoadingContext';
import { apiService } from './services/api';
import { LoadingScreen } from './components/LoadingScreen';
import { AppErrorBoundary } from './components/ErrorBoundary';
import { useErrorHandler } from './hooks/useErrorHandler';

// Simple lazy loading for main pages
const GradeMyMail = lazy(() => import('./pages/GradeMyMail'));
const FixMyMail = lazy(() => import('./pages/FixMyMail'));



// Simple navigation handler
const NavigationHandler: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();

  useEffect(() => {
    // Cancel all pending requests when navigation changes
    apiService.cancelAllRequests();
  }, [location.pathname]);

  return <>{children}</>;
};

// Simple loading fallback
const RouteLoadingFallback: React.FC<{ route?: string }> = ({ route }) => (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingScreen isVisible={true} />
  </div>
);

function App() {
  // Initialize error handling
  const { handleError } = useErrorHandler();

  return (
    <ThemeProvider>
      <LoadingProvider>
        <Router>
          <NavigationHandler>
            <Routes>
              {/* Main application routes */}
              <Route 
                path="/" 
                element={
                  <AppErrorBoundary>
                    <Suspense fallback={<RouteLoadingFallback route="GradeMyMail" />}>
                      <GradeMyMail />
                    </Suspense>
                  </AppErrorBoundary>
                } 
              />
              <Route 
                path="/fixmymail/:dataId" 
                element={
                  <AppErrorBoundary>
                    <Suspense fallback={<RouteLoadingFallback route="FixMyMail" />}>
                      <FixMyMail />
                    </Suspense>
                  </AppErrorBoundary>
                } 
              />
            </Routes>
          </NavigationHandler>
        </Router>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
