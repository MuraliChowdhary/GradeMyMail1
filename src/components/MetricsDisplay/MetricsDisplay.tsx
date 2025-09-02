import React from 'react';

export interface NewsletterMetrics {
  overallGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  audienceFit: number;  // 0-100
  tone: number;         // 0-100
  clarity: number;      // 0-100
  engagement: number;   // 0-100
  spamRisk: number;     // 0-100 (higher = more spammy)
  wordCount?: number;
  readingTime?: number;
  summary?: string[];
  improvements?: string[];
  readabilityGrade?: number;  // Flesch-Kincaid grade level
  linkDensity?: number;       // Links per 100 words
}

export interface MetricsDisplayProps {
  metrics: NewsletterMetrics;
  previousMetrics?: NewsletterMetrics;
  showComparison?: boolean;
  className?: string;
}

// Helper function to get grade color
const getGradeColor = (grade: string): string => {
  switch (grade) {
    case 'A': return 'text-green-600 dark:text-[#30D158]';
    case 'B': return 'text-blue-600 dark:text-[#03FF40]';
    case 'C': return 'text-yellow-600 dark:text-[#FFD60A]';
    case 'D': return 'text-orange-600 dark:text-[#FF9F0A]';
    case 'F': return 'text-red-600 dark:text-[#FF453A]';
    default: return 'text-gray-600 dark:text-[#8E8E93]';
  }
};

// Helper function to get grade background color
const getGradeBgColor = (grade: string): string => {
  switch (grade) {
    case 'A': return 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-[#30D158]/30';
    case 'B': return 'bg-blue-50 border-blue-200 dark:bg-green-900/20 dark:border-[#03FF40]/30';
    case 'C': return 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-[#FFD60A]/30';
    case 'D': return 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-[#FF9F0A]/30';
    case 'F': return 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-[#FF453A]/30';
    default: return 'bg-gray-50 border-gray-200 dark:bg-[#3A3A3C] dark:border-white/10';
  }
};

// Helper function to convert score to grade
const scoreToGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

// Helper function to get metric color based on score (inverted for spam risk)
const getMetricColor = (score: number, isSpamRisk = false): string => {
  const effectiveScore = isSpamRisk ? 100 - score : score; // Invert spam risk (lower is better)
  if (effectiveScore >= 80) return 'text-green-600 dark:text-[#30D158]';
  if (effectiveScore >= 60) return 'text-yellow-600 dark:text-[#FFD60A]';
  return 'text-red-600 dark:text-[#FF453A]';
};

// Progress bar component
const ProgressBar: React.FC<{ 
  score: number; 
  previousScore?: number; 
  showComparison?: boolean;
  color: string;
}> = ({ score, previousScore, showComparison, color }) => {
  const improvement = previousScore ? score - previousScore : 0;
  
  return (
    <div className="relative">
      <div className="w-full bg-gray-100 dark:bg-[#3A3A3C] rounded-full h-2 overflow-hidden">
        <div 
          className={`h-full rounded-full transition-all duration-700 ease-out ${color}`}
          style={{ width: `${Math.max(0, Math.min(100, score))}%` }}
        />
      </div>
      
      {showComparison && previousScore !== undefined && improvement !== 0 && (
        <div className="absolute -top-6 right-0 text-xs font-medium">
          <span className={improvement > 0 ? 'text-green-600' : 'text-red-600'}>
            {improvement > 0 ? '+' : ''}{improvement.toFixed(0)}
          </span>
        </div>
      )}
    </div>
  );
};

// Individual metric component
const MetricItem: React.FC<{
  label: string;
  score: number;
  previousScore?: number;
  showComparison?: boolean;
  icon: string;
  isSpamRisk?: boolean;
}> = ({ label, score, previousScore, showComparison, icon, isSpamRisk = false }) => {
  const colorClass = getMetricColor(score, isSpamRisk);
  const effectiveScore = isSpamRisk ? 100 - score : score; // Invert spam risk for display
  const bgColorClass = effectiveScore >= 80 ? 'bg-green-100 dark:bg-[#30D158]' : effectiveScore >= 60 ? 'bg-yellow-100 dark:bg-[#FFD60A]' : 'bg-red-100 dark:bg-[#FF453A]';
  
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="text-lg">{icon}</span>
          <span className="text-sm font-medium text-gray-700 dark:text-[#EBEBF5]">{label}</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className={`text-lg font-semibold ${colorClass}`}>
            {score}
          </span>
          <span className="text-xs text-gray-500 dark:text-[#8E8E93]">/ 100</span>
        </div>
      </div>
      
      <ProgressBar 
        score={score}
        previousScore={previousScore}
        showComparison={showComparison}
        color={bgColorClass}
      />
    </div>
  );
};

const MetricsDisplay: React.FC<MetricsDisplayProps> = ({
  metrics,
  previousMetrics,
  showComparison = false,
  className = '',
}) => {
  // Calculate weighted average (spam risk is inverted - lower is better)
  const invertedSpamRisk = 100 - metrics.spamRisk;
  const averageScore = Math.round((metrics.audienceFit + metrics.tone + metrics.clarity + metrics.engagement + invertedSpamRisk) / 5);
  const calculatedGrade = scoreToGrade(averageScore);
  const displayGrade = metrics.overallGrade || calculatedGrade;
  
  const previousAverageScore = previousMetrics 
    ? Math.round((previousMetrics.audienceFit + previousMetrics.tone + previousMetrics.clarity + previousMetrics.engagement + (100 - previousMetrics.spamRisk)) / 5)
    : undefined;
  
  const gradeImprovement = previousMetrics && previousAverageScore 
    ? averageScore - previousAverageScore 
    : 0;

  return (
    <div className={`bg-white dark:bg-[#2C2C2E] border border-gray-200 dark:border-white/5 rounded-xl p-6 space-y-6 ${className}`}>
      {/* Overall Grade Section */}
      <div className="text-center">
        <div className="flex items-center justify-center space-x-4">
          <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full border-2 ${getGradeBgColor(displayGrade)}`}>
            <span className={`text-2xl font-bold ${getGradeColor(displayGrade)}`}>
              {displayGrade}
            </span>
          </div>
          
          {showComparison && previousMetrics && gradeImprovement !== 0 && (
            <div className="flex items-center space-x-1">
              <span className="text-gray-400 dark:text-[#8E8E93]">→</span>
              <div className="flex items-center space-x-1">
                <span className={gradeImprovement > 0 ? 'text-green-600' : 'text-red-600'}>
                  {gradeImprovement > 0 ? '↗' : '↘'}
                </span>
                <span className="text-sm font-medium text-gray-600 dark:text-[#EBEBF5]">
                  {Math.abs(gradeImprovement)} pts
                </span>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-2">
          <div className="text-lg font-semibold text-gray-900 dark:text-[#FFFFFF]">Overall Score</div>
          <div className="text-sm text-gray-500 dark:text-[#8E8E93]">{averageScore}/100</div>
        </div>
      </div>

      {/* Individual Metrics */}
      <div className="space-y-4">
        <MetricItem
          label="Audience Fit"
          score={metrics.audienceFit}
          previousScore={showComparison ? previousMetrics?.audienceFit : undefined}
          showComparison={showComparison}
          icon="👥"
        />
        
        <MetricItem
          label="Tone"
          score={metrics.tone}
          previousScore={showComparison ? previousMetrics?.tone : undefined}
          showComparison={showComparison}
          icon="🎭"
        />
        
        <MetricItem
          label="Clarity"
          score={metrics.clarity}
          previousScore={showComparison ? previousMetrics?.clarity : undefined}
          showComparison={showComparison}
          icon="🎯"
        />
        
        <MetricItem
          label="Engagement"
          score={metrics.engagement}
          previousScore={showComparison ? previousMetrics?.engagement : undefined}
          showComparison={showComparison}
          icon="⚡"
        />
        
        <MetricItem
          label="Spam Risk"
          score={metrics.spamRisk}
          previousScore={showComparison ? previousMetrics?.spamRisk : undefined}
          showComparison={showComparison}
          icon="🛡️"
          isSpamRisk={true}
        />
      </div>

      {/* Additional Stats */}
      {(metrics.wordCount || metrics.readingTime) && (
        <div className="pt-4 border-t border-gray-100 dark:border-white/10">
          <div className="flex justify-center space-x-6 text-sm text-gray-500 dark:text-[#8E8E93]">
            {metrics.wordCount && (
              <div className="flex items-center space-x-1">
                <span>📝</span>
                <span>{metrics.wordCount} words</span>
              </div>
            )}
            {metrics.readingTime && (
              <div className="flex items-center space-x-1">
                <span>⏱️</span>
                <span>{metrics.readingTime} min read</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MetricsDisplay;