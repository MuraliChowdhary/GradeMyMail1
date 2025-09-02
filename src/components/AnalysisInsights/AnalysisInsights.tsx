import React from 'react';
import { NewsletterMetrics } from '../MetricsDisplay/MetricsDisplay';

export interface AnalysisInsightsProps {
  metrics: NewsletterMetrics;
  className?: string;
}

// Helper function to get readability grade interpretation
const getReadabilityInterpretation = (grade?: number): { label: string; color: string; description: string } => {
  if (!grade) return { label: 'Unknown', color: 'text-gray-500 dark:text-[#8E8E93]', description: 'Readability not available' };
  
  if (grade <= 6) return { 
    label: 'Elementary', 
    color: 'text-green-600 dark:text-[#30D158]', 
    description: 'Very easy to read' 
  };
  if (grade <= 9) return { 
    label: 'Middle School', 
    color: 'text-blue-600 dark:text-[#007AFF]', 
    description: 'Easy to read' 
  };
  if (grade <= 12) return { 
    label: 'High School', 
    color: 'text-yellow-600 dark:text-[#FFD60A]', 
    description: 'Moderately easy' 
  };
  if (grade <= 16) return { 
    label: 'College', 
    color: 'text-orange-600 dark:text-[#FF9F0A]', 
    description: 'Difficult to read' 
  };
  return { 
    label: 'Graduate', 
    color: 'text-red-600 dark:text-[#FF453A]', 
    description: 'Very difficult' 
  };
};

// Helper function to get link density interpretation
const getLinkDensityInterpretation = (density?: number): { status: string; color: string; description: string } => {
  if (!density) return { status: 'Unknown', color: 'text-gray-500 dark:text-[#8E8E93]', description: 'Link density not available' };
  
  if (density <= 2) return { 
    status: 'Optimal', 
    color: 'text-green-600 dark:text-[#30D158]', 
    description: 'Good balance of links' 
  };
  if (density <= 4) return { 
    status: 'Moderate', 
    color: 'text-yellow-600 dark:text-[#FFD60A]', 
    description: 'Acceptable link density' 
  };
  return { 
    status: 'High', 
    color: 'text-red-600 dark:text-[#FF453A]', 
    description: 'May appear spammy' 
  };
};

const AnalysisInsights: React.FC<AnalysisInsightsProps> = ({
  metrics,
  className = '',
}) => {
  // Debug: Log what we're receiving
  React.useEffect(() => {
    console.log('📊 AnalysisInsights received metrics:', {
      summary: metrics.summary,
      improvements: metrics.improvements,
      hasValidSummary: metrics.summary && metrics.summary.length > 0,
      hasValidImprovements: metrics.improvements && metrics.improvements.length > 0
    });
  }, [metrics]);
  
  // Check if we have valid AI insights (not fallback messages)
  const hasValidSummary = metrics.summary && metrics.summary.length > 0 && 
    !metrics.summary.some(item => item.includes('limited AI functionality') || item.includes('temporarily unavailable'));
  
  const hasValidImprovements = metrics.improvements && metrics.improvements.length > 0 && 
    !metrics.improvements.some(item => item.includes('limited AI functionality') || item.includes('temporarily unavailable'));

  // Combine all content for display
  const allContent = [
    ...(metrics.summary || []),
    ...(metrics.improvements || [])
  ];

  return (
    <div className={`${className}`}>
      <div className="text-center max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Analysis & Next Steps</h2>
        </div>
        
        {/* Content Display - Simplified without glitchy animations */}
        {allContent.length > 0 ? (
          <div className="space-y-6">
            {/* Show notice only for actual fallback content */}
            {!hasValidSummary && !hasValidImprovements && (
              <div className="mb-8 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  ⚠️ AI analysis temporarily unavailable - showing basic analysis
                </p>
              </div>
            )}
            
            {/* Readability Alert - Show if grade is very high */}
            {metrics.readabilityGrade && metrics.readabilityGrade > 16 && (
              <div className="mb-8 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/30 rounded-xl">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <svg className="w-5 h-5 text-red-500 dark:text-red-400" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="text-left">
                    <p className="text-sm font-medium text-red-800 dark:text-red-200 mb-1">
                      Complex Writing Detected
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Your content reads at a {metrics.readabilityGrade.toFixed(1)} grade level. For newsletters, aim for 6-9 grade (middle school) to reach more readers.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Summary Section */}
            {metrics.summary && metrics.summary.length > 0 && (
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Summary</h3>
                <div className="space-y-3">
                  {metrics.summary.map((text, index) => (
                    <p key={`summary-${index}`} className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      • {text}
                    </p>
                  ))}
                </div>
              </div>
            )}
            
            {/* Improvements Section */}
            {metrics.improvements && metrics.improvements.length > 0 && (
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Improve Next</h3>
                <div className="space-y-3">
                  {metrics.improvements.map((text, index) => (
                    <p key={`improvement-${index}`} className="text-base text-gray-700 dark:text-gray-300 leading-relaxed text-left">
                      • {text}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="py-12">
            <p className="text-lg text-gray-500 dark:text-gray-400">No analysis content available</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-2">
              Try analyzing some content to see insights here
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisInsights;