// Highlighting system types for the newsletter grading system

export interface HighlightRange {
  start: number;
  end: number;
  type: HighlightType;
  priority: HighlightPriority;
  message?: string;
  suggestion?: string;
}

export interface HighlightPosition {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface HighlightColors {
  background: string;
  border: string;
  opacity: number;
}

export interface AnimationState {
  progress: number;
  isAnimating: boolean;
  startTime: number;
  duration: number;
}

export interface HighlightingConfig {
  colors: Record<HighlightType, HighlightColors>;
  animationDuration: number;
  animationEasing: string;
  showTooltips: boolean;
  maxTooltipWidth: number;
}

export interface HighlightingState {
  ranges: HighlightRange[];
  visibleRanges: HighlightRange[];
  animation: AnimationState;
  hoveredRange?: HighlightRange;
}

export interface HighlightingEngine {
  updateHighlights: (ranges: HighlightRange[]) => void;
  clearHighlights: () => void;
  setVisibility: (visible: boolean) => void;
  destroy: () => void;
}

// Newsletter-specific highlight types based on content-tagger.js
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

// Content analysis types
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

// Priority mapping for highlight types
export const HIGHLIGHT_PRIORITIES: Record<HighlightType, HighlightPriority> = {
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

// Color scheme for different highlight types and priorities
export const DEFAULT_HIGHLIGHT_COLORS: Record<HighlightType, HighlightColors> = {
  // High priority - Red
  spam_words: { background: '#FF6B6B', border: '#FF5252', opacity: 0.3 },
  grammar_spelling: { background: '#FF6B6B', border: '#FF5252', opacity: 0.3 },
  claim_without_evidence: { background: '#FF6B6B', border: '#FF5252', opacity: 0.3 },
  
  // Medium priority - Yellow
  hard_to_read: { background: '#FFD93D', border: '#FFC107', opacity: 0.3 },
  fluff: { background: '#FFD93D', border: '#FFC107', opacity: 0.3 },
  hedging: { background: '#FFD93D', border: '#FFC107', opacity: 0.3 },
  vague_date: { background: '#FFD93D', border: '#FFC107', opacity: 0.3 },
  vague_number: { background: '#FFD93D', border: '#FFC107', opacity: 0.3 },
  
  // Low priority - Blue
  emoji_excess: { background: '#6BCF7F', border: '#4CAF50', opacity: 0.3 },
  
  // Informational - Blue
  cta: { background: '#6BCF7F', border: '#4CAF50', opacity: 0.3 },
};

// Tooltip messages for each highlight type
export const HIGHLIGHT_MESSAGES: Record<HighlightType, { message: string; suggestion: string }> = {
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