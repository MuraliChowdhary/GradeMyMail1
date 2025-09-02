import { NewsletterMetrics } from '../components/MetricsDisplay';

export interface AnalysisIssue {
  type: 'clarity' | 'engagement' | 'tone';
  text: string;
  severity: 'low' | 'medium' | 'high';
  position: { start: number; end: number };
}

/**
 * Extract issues from tagged content
 */
export const extractIssuesFromTaggedContent = (taggedContent: string): AnalysisIssue[] => {
  const issues: AnalysisIssue[] = [];
  
  // Map tag names to correct metric types
  const tagMapping = {
    'hard_to_read': 'clarity',    // Hard to read = clarity issue
    'fluff': 'clarity',           // Fluff words = clarity issue  
    'spam_words': 'engagement',   // Spam words = engagement issue
    'caps': 'tone',              // ALL CAPS = tone issue
    'exclamation': 'tone'        // Excessive ! = tone issue
  } as const;
  
  // Extract issues from each tag type
  Object.entries(tagMapping).forEach(([tagName, metricType]) => {
    const regex = new RegExp(`<${tagName}>(.*?)</${tagName}>`, 'gs');
    let match;
    
    while ((match = regex.exec(taggedContent)) !== null) {
      const issueText = match[1].trim();
      
      // Skip empty or placeholder content
      if (issueText && 
          issueText !== 'fa7d50ac-e828-45da-827e-bc11be984993' && 
          issueText !== '56354cd0-12ca-4873-b4c5-e6cb9fcea6ba') {
        
        // Determine severity based on content length and type
        let severity: 'low' | 'medium' | 'high' = 'medium';
        if (tagName === 'hard_to_read' && issueText.split(' ').length > 30) {
          severity = 'high';
        } else if (tagName === 'spam_words') {
          severity = 'high';
        } else if (tagName === 'fluff') {
          severity = 'low';
        }
        
        issues.push({
          type: metricType,
          text: issueText,
          severity,
          position: {
            start: match.index,
            end: match.index + match[0].length
          }
        });
      }
    }
  });
  
  // Debug logging
  console.log('🔍 Metrics Calculator Debug:');
  console.log(`📝 Tagged content length: ${taggedContent.length}`);
  console.log(`📊 Issues found: ${issues.length}`);
  issues.forEach((issue, index) => {
    console.log(`   ${index + 1}. ${issue.type.toUpperCase()}: "${issue.text.substring(0, 50)}${issue.text.length > 50 ? '...' : ''}" (${issue.severity})`);
  });
  
  return issues;
};

/**
 * Calculate reading time based on word count
 */
export const calculateReadingTime = (wordCount: number): number => {
  // Average reading speed: 200 words per minute
  return Math.ceil(wordCount / 200);
};

/**
 * Count words in text content
 */
export const countWords = (text: string): number => {
  // Strip HTML tags and get plain text content
  const plainText = text.replace(/<[^>]*>/g, '').trim();
  
  // Handle empty content
  if (!plainText) return 0;
  
  // Split by whitespace and filter out empty strings
  const words = plainText.split(/\s+/).filter(word => word.length > 0);
  
  return words.length;
};

/**
 * Calculate individual metric scores based on issues found
 */
export const calculateMetricScores = (
  issues: AnalysisIssue[],
  wordCount: number
): { clarity: number; engagement: number; tone: number } => {
  const issuesByType = {
    clarity: issues.filter(issue => issue.type === 'clarity'),
    engagement: issues.filter(issue => issue.type === 'engagement'),
    tone: issues.filter(issue => issue.type === 'tone')
  };
  
  // Calculate scores based on issue count and content length
  const calculateScore = (issueCount: number): number => {
    if (wordCount === 0) return 100;
    
    // More realistic scoring algorithm
    let score = 100;
    
    if (issueCount > 0) {
      // Base penalty per issue
      const basePenalty = 15;
      
      // Additional penalty for high issue density
      const issueRatio = issueCount / Math.max(1, Math.floor(wordCount / 50)); // Issues per 50 words
      const densityPenalty = Math.min(30, issueRatio * 10);
      
      // Total penalty
      const totalPenalty = (issueCount * basePenalty) + densityPenalty;
      
      // Apply penalty with minimum score of 10
      score = Math.max(10, 100 - totalPenalty);
    }
    
    return Math.round(score);
  };
  
  const scores = {
    clarity: calculateScore(issuesByType.clarity.length),
    engagement: calculateScore(issuesByType.engagement.length),
    tone: calculateScore(issuesByType.tone.length)
  };
  
  // Debug logging
  console.log('📊 Score Calculation:');
  console.log(`   • Clarity issues: ${issuesByType.clarity.length} → Score: ${scores.clarity}`);
  console.log(`   • Engagement issues: ${issuesByType.engagement.length} → Score: ${scores.engagement}`);
  console.log(`   • Tone issues: ${issuesByType.tone.length} → Score: ${scores.tone}`);
  console.log(`   • Word count: ${wordCount}`);
  
  return scores;
};

/**
 * Convert average score to letter grade
 */
export const scoreToGrade = (score: number): 'A' | 'B' | 'C' | 'D' | 'F' => {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
};

/**
 * Calculate complete newsletter metrics from tagged content
 */
export const calculateNewsletterMetrics = (
  taggedContent: string,
  originalText: string
): NewsletterMetrics => {
  const issues = extractIssuesFromTaggedContent(taggedContent);
  const wordCount = countWords(originalText);
  const readingTime = calculateReadingTime(wordCount);
  
  const scores = calculateMetricScores(issues, wordCount);
  const averageScore = Math.round((scores.clarity + scores.engagement + scores.tone) / 3);
  const overallGrade = scoreToGrade(averageScore);
  
  return {
    overallGrade,
    clarity: scores.clarity,
    engagement: scores.engagement,
    tone: scores.tone,
    wordCount,
    readingTime
  };
};

/**
 * Generate sample metrics for demonstration
 */
export const generateSampleMetrics = (
  clarityScore: number = 75,
  engagementScore: number = 68,
  toneScore: number = 82
): NewsletterMetrics => {
  const averageScore = Math.round((clarityScore + engagementScore + toneScore) / 3);
  const overallGrade = scoreToGrade(averageScore);
  
  return {
    overallGrade,
    clarity: clarityScore,
    engagement: engagementScore,
    tone: toneScore,
    wordCount: 245,
    readingTime: 2
  };
};