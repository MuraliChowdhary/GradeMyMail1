/**
 * Highlighting Service
 * Integrates rule-based content analysis with the highlighting system
 */

import type { 
  HighlightRange, 
  ContentAnalysisResult,
  HighlightType,
  HighlightPriority 
} from '../types/highlighting';

export interface HighlightingServiceConfig {
  apiEndpoint?: string;
  enableRealTimeAnalysis?: boolean;
  debounceMs?: number;
}

export class HighlightingService {
  private config: HighlightingServiceConfig;
  private debounceTimer: NodeJS.Timeout | null = null;

  constructor(config: HighlightingServiceConfig = {}) {
    this.config = {
      apiEndpoint: '/api/analyze',
      enableRealTimeAnalysis: true,
      debounceMs: 500,
      ...config,
    };
  }

  /**
   * Analyze content and return highlight ranges
   */
  public async analyzeContent(content: string): Promise<{
    ranges: HighlightRange[];
    analysisResult: ContentAnalysisResult;
    summary: {
      score: number;
      grade: string;
      issueCounts: Record<HighlightPriority, number>;
      issueTypes: HighlightType[];
    };
  }> {
    try {
      const response = await fetch(this.config.apiEndpoint!, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content }),
      });

      if (!response.ok) {
        throw new Error(`Analysis failed: ${response.statusText}`);
      }

      const analysisResult: ContentAnalysisResult = await response.json();
      const ranges = this.extractHighlightRanges(content, analysisResult);
      const summary = this.generateSummary(ranges, analysisResult);

      return {
        ranges,
        analysisResult,
        summary,
      };
    } catch (error) {
      console.error('Content analysis failed:', error);
      
      // Return empty results on error
      return {
        ranges: [],
        analysisResult: {
          annotated: content,
          report: {
            perSentence: [],
            global: {
              wordCount: content.split(/\s+/).length,
              sentenceCount: content.split(/[.!?]+/).length,
              linkCount: 0,
              linkDensityPer100Words: 0,
              longParagraphs: [],
              readability: { fleschKincaidGrade: 0, threshold: 9 },
              flags: [],
            },
          },
        },
        summary: {
          score: 100,
          grade: 'A',
          issueCounts: { high: 0, medium: 0, low: 0, info: 0 },
          issueTypes: [],
        },
      };
    }
  }

  /**
   * Analyze content with debouncing for real-time analysis
   */
  public analyzeContentDebounced(
    content: string,
    callback: (result: Awaited<ReturnType<typeof this.analyzeContent>>) => void
  ): void {
    if (!this.config.enableRealTimeAnalysis) return;

    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(async () => {
      const result = await this.analyzeContent(content);
      callback(result);
    }, this.config.debounceMs);
  }

  /**
   * Extract highlight ranges from analysis result
   */
  private extractHighlightRanges(content: string, analysisResult: ContentAnalysisResult): HighlightRange[] {
    const ranges: HighlightRange[] = [];
    
    for (const sentenceData of analysisResult.report.perSentence) {
      if (sentenceData.tags.length === 0) continue;

      const sentence = sentenceData.sentence.trim();
      if (!sentence) continue;

      // Find sentence position in content
      const sentenceStart = content.indexOf(sentence);
      if (sentenceStart === -1) continue;

      const sentenceEnd = sentenceStart + sentence.length;

      // Create ranges for each tag type
      for (const tag of sentenceData.tags) {
        if (this.isValidHighlightType(tag)) {
          ranges.push({
            start: sentenceStart,
            end: sentenceEnd,
            type: tag,
            priority: this.getHighlightPriority(tag),
            message: this.getHighlightMessage(tag),
            suggestion: this.getHighlightSuggestion(tag),
          });
        }
      }
    }

    return ranges;
  }

  /**
   * Generate analysis summary
   */
  private generateSummary(ranges: HighlightRange[], analysisResult: ContentAnalysisResult) {
    const issueCounts: Record<HighlightPriority, number> = {
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const issueTypes = new Set<HighlightType>();

    for (const range of ranges) {
      issueCounts[range.priority]++;
      issueTypes.add(range.type);
    }

    // Calculate score based on issues
    const totalIssues = issueCounts.high + issueCounts.medium + issueCounts.low;
    const wordCount = analysisResult.report.global.wordCount;
    const score = this.calculateScore(totalIssues, wordCount);

    return {
      score,
      grade: this.scoreToGrade(score),
      issueCounts,
      issueTypes: Array.from(issueTypes),
    };
  }

  /**
   * Calculate overall score
   */
  private calculateScore(totalIssues: number, wordCount: number): number {
    const issuesPerHundred = (totalIssues / Math.max(wordCount, 1)) * 100;
    
    if (issuesPerHundred <= 2) return Math.max(90, 100 - issuesPerHundred * 5);
    if (issuesPerHundred <= 4) return Math.max(80, 90 - (issuesPerHundred - 2) * 5);
    if (issuesPerHundred <= 6) return Math.max(70, 80 - (issuesPerHundred - 4) * 5);
    if (issuesPerHundred <= 8) return Math.max(60, 70 - (issuesPerHundred - 6) * 5);
    return Math.max(0, 60 - (issuesPerHundred - 8) * 2);
  }

  /**
   * Convert score to letter grade
   */
  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  /**
   * Check if tag is a valid highlight type
   */
  private isValidHighlightType(tag: string): tag is HighlightType {
    return [
      'spam_words',
      'grammar_spelling', 
      'hard_to_read',
      'fluff',
      'emoji_excess',
      'cta',
      'hedging',
      'vague_date',
      'vague_number',
      'claim_without_evidence'
    ].includes(tag);
  }

  /**
   * Get priority for highlight type
   */
  private getHighlightPriority(type: HighlightType): HighlightPriority {
    const priorities: Record<HighlightType, HighlightPriority> = {
      spam_words: 'high',
      grammar_spelling: 'high',
      claim_without_evidence: 'high',
      hard_to_read: 'medium',
      fluff: 'medium',
      hedging: 'medium',
      vague_date: 'medium',
      vague_number: 'medium',
      emoji_excess: 'low',
      cta: 'info',
    };
    
    return priorities[type];
  }

  /**
   * Get message for highlight type
   */
  private getHighlightMessage(type: HighlightType): string {
    const messages: Record<HighlightType, string> = {
      spam_words: 'Contains spam-like language that may trigger email filters',
      grammar_spelling: 'Grammar or spelling issue detected',
      hard_to_read: 'This sentence is complex and may be hard to read',
      fluff: 'Contains unnecessary filler words or phrases',
      emoji_excess: 'Too many emojis may appear unprofessional',
      cta: 'Call-to-action detected',
      hedging: 'Uncertain language weakens your message',
      vague_date: 'Vague time reference may confuse readers',
      vague_number: 'Number lacks context or units',
      claim_without_evidence: 'Strong claim without supporting evidence',
    };
    
    return messages[type];
  }

  /**
   * Get suggestion for highlight type
   */
  private getHighlightSuggestion(type: HighlightType): string {
    const suggestions: Record<HighlightType, string> = {
      spam_words: 'Use more natural, conversational language',
      grammar_spelling: 'Review and correct the grammar or spelling',
      hard_to_read: 'Break into shorter sentences or simplify the language',
      fluff: 'Remove filler words to make the message more direct',
      emoji_excess: 'Use emojis sparingly for better impact',
      cta: 'Ensure your CTA is clear and compelling',
      hedging: 'Use more confident, direct language',
      vague_date: 'Use specific dates or timeframes',
      vague_number: 'Add units, percentages, or context to numbers',
      claim_without_evidence: 'Add data, sources, or examples to support your claim',
    };
    
    return suggestions[type];
  }

  /**
   * Clean up resources
   */
  public destroy(): void {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
  }
}

// Export singleton instance
export const highlightingService = new HighlightingService();