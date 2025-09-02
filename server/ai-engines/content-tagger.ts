/**
 * TypeScript wrapper for the rule-based content tagger
 * Provides type-safe interface for newsletter content analysis
 */

import * as contentTaggerJsModule from './content-tagger.engine.js';

// Define types locally to avoid import issues
export interface ContentAnalysisResult {
  annotated: string;
  report: {
    perSentence: SentenceAnalysis[];
    global: GlobalAnalysis;
  };
}

export interface SentenceAnalysis {
  sentence: string;
  tags: HighlightType[];
  reasons: Record<string, any>;
}

export interface GlobalAnalysis {
  wordCount: number;
  sentenceCount: number;
  linkCount: number;
  linkDensityPer100Words: number;
  longParagraphs: number[];
  readability: {
    fleschKincaidGrade: number;
    threshold: number;
  };
  flags: Array<{
    tag: string;
    reasons: Record<string, any>;
  }>;
}

export interface HighlightRange {
  start: number;
  end: number;
  type: HighlightType;
  priority: HighlightPriority;
  message?: string;
  suggestion?: string;
}

export type HighlightType =
  | 'spam_words'
  | 'grammar_spelling'
  | 'hard_to_read'
  | 'fluff'
  | 'emoji_excess'
  | 'cta'
  | 'hedging'
  | 'vague_date'
  | 'vague_number'
  | 'claim_without_evidence';

export type HighlightPriority = 'high' | 'medium' | 'low' | 'info';

// Priority mapping for highlight types
const HIGHLIGHT_PRIORITIES: Record<HighlightType, HighlightPriority> = {
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

// Tooltip messages for each highlight type
const HIGHLIGHT_MESSAGES: Record<HighlightType, { message: string; suggestion: string }> = {
  spam_words: {
    message: 'Contains spam-like language that may trigger email filters',
    suggestion: 'Use more natural, conversational language'
  },
  grammar_spelling: {
    message: 'Grammar or spelling issue detected',
    suggestion: 'Review and correct the grammar or spelling'
  },
  hard_to_read: {
    message: 'This sentence is complex and may be hard to read',
    suggestion: 'Break into shorter sentences or simplify the language'
  },
  fluff: {
    message: 'Contains unnecessary filler words or phrases',
    suggestion: 'Remove filler words to make the message more direct'
  },
  emoji_excess: {
    message: 'Too many emojis may appear unprofessional',
    suggestion: 'Use emojis sparingly for better impact'
  },
  cta: {
    message: 'Call-to-action detected',
    suggestion: 'Ensure your CTA is clear and compelling'
  },
  hedging: {
    message: 'Uncertain language weakens your message',
    suggestion: 'Use more confident, direct language'
  },
  vague_date: {
    message: 'Vague time reference may confuse readers',
    suggestion: 'Use specific dates or timeframes'
  },
  vague_number: {
    message: 'Number lacks context or units',
    suggestion: 'Add units, percentages, or context to numbers'
  },
  claim_without_evidence: {
    message: 'Strong claim without supporting evidence',
    suggestion: 'Add data, sources, or examples to support your claim'
  },
};

export interface ContentTaggerOptions {
  sentenceLength?: { maxLength: number };
  allCaps?: { maxAllowed: number };
  excessivePunctuation?: { maxExclamations: number };
  passiveVoice?: { enabled: boolean };
  thresholds?: {
    fluffPhrases: number;
    mildJargon: number;
    heavyJargon: number;
    spamWords: number;
  };
  maxEmojiPerSentence?: number;
  maxLinksPer100Words?: number;
  ctaPhrases?: string[];
  hedgeWords?: string[];
  vagueDates?: string[];
  baldClaimVerbs?: string[];
  redundancy?: {
    similarityThreshold: number;
    minSentenceWords: number;
  };
  readability?: {
    gradeThreshold: number;
  };
  grammar?: {
    enabled: boolean;
    dictionary?: Set<string> | string[];
    minWordLength: number;
    skipProperNouns: boolean;
    skipNonLexical: boolean;
    maxMisspellingsListed: number;
  };
  annotate?: boolean;
}

export class ContentTagger {
  private options: ContentTaggerOptions;

  constructor(options: Partial<ContentTaggerOptions> = {}) {
    // Initialize with default options optimized for newsletter content
    this.options = {
      sentenceLength: { maxLength: 22 },
      allCaps: { maxAllowed: 2 },
      excessivePunctuation: { maxExclamations: 3 },
      passiveVoice: { enabled: true },
      thresholds: {
        fluffPhrases: 2,
        mildJargon: 2,
        heavyJargon: 1,
        spamWords: 2
      },
      maxEmojiPerSentence: 3,
      maxLinksPer100Words: 3,
      // Enable grammar checking with reasonable settings
      grammar: {
        enabled: true, // Re-enabled with balanced settings
        minWordLength: 5, // Skip short words (acronyms, names, etc.)
        skipProperNouns: true, // Skip capitalized words (company names, etc.)
        skipNonLexical: true, // Skip technical terms and abbreviations
        maxMisspellingsListed: 2, // Limit to keep UI clean
        dictionary: undefined // Use the expanded default dictionary
      },
      ...options
    };
  }

  /**
   * Analyze newsletter content and return structured results
   */
  public analyzeNewsletter(content: string): ContentAnalysisResult {
    if (!contentTaggerJsModule.analyzeContent) {
      throw new Error('Content tagger analyzeContent function not available');
    }

    // Update options with loaded defaults if available
    if (contentTaggerJsModule.DEFAULT_OPTIONS) {
      this.options = { ...contentTaggerJsModule.DEFAULT_OPTIONS, ...this.options };
    }

    return contentTaggerJsModule.analyzeContent(content, this.options);
  }

  /**
   * Extract highlight ranges from analysis results
   */
  public extractHighlightRanges(content: string, analysisResult: ContentAnalysisResult): HighlightRange[] {
    const ranges: HighlightRange[] = [];

    // Process sentence-level highlights
    for (const sentenceData of analysisResult.report.perSentence) {
      if (sentenceData.tags.length === 0) continue;

      const sentence = sentenceData.sentence.trim();
      if (!sentence) continue;

      // Find the sentence position in the original content
      const sentenceStart = content.indexOf(sentence);
      if (sentenceStart === -1) continue;

      const sentenceEnd = sentenceStart + sentence.length;

      // Create highlight ranges for each tag type found in this sentence
      for (const tag of sentenceData.tags) {
        if (this.isValidHighlightType(tag)) {
          const priority = HIGHLIGHT_PRIORITIES[tag];
          const messages = HIGHLIGHT_MESSAGES[tag];

          ranges.push({
            start: sentenceStart,
            end: sentenceEnd,
            type: tag,
            priority,
            message: messages.message,
            suggestion: messages.suggestion,
          });
        }
      }
    }

    return ranges;
  }

  /**
   * Get analysis summary with metrics
   */
  public getAnalysisSummary(analysisResult: ContentAnalysisResult) {
    const { global, perSentence } = analysisResult.report;

    // Count issues by priority
    const issueCounts = {
      high: 0,
      medium: 0,
      low: 0,
      info: 0,
    };

    const issueTypes = new Set<HighlightType>();

    for (const sentence of perSentence) {
      for (const tag of sentence.tags) {
        if (this.isValidHighlightType(tag)) {
          issueTypes.add(tag);
          const priority = HIGHLIGHT_PRIORITIES[tag];
          issueCounts[priority]++;
        }
      }
    }

    // Calculate overall score (A-F scale)
    const totalIssues = issueCounts.high + issueCounts.medium + issueCounts.low;
    const score = this.calculateOverallScore(totalIssues, global.wordCount);

    return {
      score,
      grade: this.scoreToGrade(score),
      issueCounts,
      issueTypes: Array.from(issueTypes),
      metrics: {
        wordCount: global.wordCount,
        sentenceCount: global.sentenceCount,
        readabilityGrade: global.readability.fleschKincaidGrade,
        linkDensity: global.linkDensityPer100Words,
      },
      globalFlags: global.flags,
    };
  }

  /**
   * Update analysis options
   */
  public updateOptions(newOptions: Partial<ContentTaggerOptions>): void {
    this.options = { ...this.options, ...newOptions };
  }

  /**
   * Get current options
   */
  public getOptions(): ContentTaggerOptions {
    return { ...this.options };
  }

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

  private calculateOverallScore(totalIssues: number, wordCount: number): number {
    // Score based on issues per 100 words
    const issuesPerHundred = (totalIssues / Math.max(wordCount, 1)) * 100;

    // Scale: 0-2 issues per 100 words = A (90-100)
    //        2-4 issues per 100 words = B (80-89)
    //        4-6 issues per 100 words = C (70-79)
    //        6-8 issues per 100 words = D (60-69)
    //        8+ issues per 100 words = F (0-59)

    if (issuesPerHundred <= 2) return Math.max(90, 100 - issuesPerHundred * 5);
    if (issuesPerHundred <= 4) return Math.max(80, 90 - (issuesPerHundred - 2) * 5);
    if (issuesPerHundred <= 6) return Math.max(70, 80 - (issuesPerHundred - 4) * 5);
    if (issuesPerHundred <= 8) return Math.max(60, 70 - (issuesPerHundred - 6) * 5);
    return Math.max(0, 60 - (issuesPerHundred - 8) * 2);
  }

  private scoreToGrade(score: number): string {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }
}

// Export singleton instance for easy use
export const contentTagger = new ContentTagger();
