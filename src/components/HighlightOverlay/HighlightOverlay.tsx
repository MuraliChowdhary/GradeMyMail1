/**
 * HighlightOverlay Component
 * Renders highlighting overlay for newsletter content analysis
 */

import React, { useEffect, useRef, useCallback, useMemo } from 'react';
import { createHighlightingEngine } from '../../utils/highlightingEngine';
import type { 
  HighlightRange, 
  HighlightingConfig, 
  HighlightingEngine,
  ContentAnalysisResult 
} from '../../types/highlighting';

export interface HighlightOverlayProps {
  /** Container element to overlay highlights on */
  containerRef: React.RefObject<HTMLElement>;
  
  /** Highlight ranges to display */
  ranges?: HighlightRange[];
  
  /** Tagged content from analysis (alternative to ranges) */
  taggedContent?: string;
  
  /** Analysis result for extracting ranges */
  analysisResult?: ContentAnalysisResult;
  
  /** Whether highlights are visible */
  visible?: boolean;
  
  /** Custom highlighting configuration */
  config?: Partial<HighlightingConfig>;
  
  /** Custom CSS class */
  className?: string;
  
  /** Animation speed in milliseconds */
  animationSpeed?: number;
  
  /** Whether to show debug overlay */
  enableDebugMode?: boolean;
  
  /** Callback when highlight is hovered */
  onHighlightHover?: (range: HighlightRange | null) => void;
  
  /** Callback when highlight is clicked */
  onHighlightClick?: (range: HighlightRange) => void;
}

const HighlightOverlay: React.FC<HighlightOverlayProps> = ({
  containerRef,
  ranges = [],
  taggedContent,
  analysisResult,
  visible = true,
  config = {},
  className = '',
  animationSpeed = 300,
  enableDebugMode = false,
  onHighlightHover,
  onHighlightClick,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<HighlightingEngine | null>(null);

  // Memoize configuration to prevent unnecessary re-renders
  const highlightingConfig = useMemo(() => ({
    ...config,
    animationDuration: animationSpeed,
  }), [config, animationSpeed]);

  // Extract ranges from tagged content or analysis result if ranges not provided
  const effectiveRanges = useMemo(() => {
    if (ranges.length > 0) return ranges;
    
    if (analysisResult && containerRef.current) {
      // Extract ranges from analysis result
      const content = containerRef.current.textContent || '';
      return extractRangesFromAnalysis(content, analysisResult);
    }
    
    if (taggedContent && containerRef.current) {
      // Extract ranges from tagged content
      const content = containerRef.current.textContent || '';
      return extractRangesFromTaggedContent(content, taggedContent);
    }
    
    return [];
  }, [ranges, analysisResult, taggedContent, containerRef]);

  // Initialize highlighting engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    
    if (!canvas || !container) {
      console.warn('HighlightOverlay: Canvas or container not available');
      return;
    }

    try {
      engineRef.current = createHighlightingEngine(canvas, container, highlightingConfig);
    } catch (error) {
      console.error('Failed to create highlighting engine:', error);
      return;
    }

    return () => {
      if (engineRef.current) {
        engineRef.current.destroy();
        engineRef.current = null;
      }
    };
  }, [containerRef, highlightingConfig]);

  // Update highlights when ranges change
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.updateHighlights(effectiveRanges);
    }
  }, [effectiveRanges]);

  // Update visibility
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setVisibility(visible);
    }
  }, [visible]);

  // Handle click events
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!onHighlightClick || effectiveRanges.length === 0) return;

    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    // Find clicked highlight range
    // This is a simplified implementation - in practice, you'd need to
    // check against the actual rendered positions
    const clickedRange = effectiveRanges[0]; // Placeholder
    if (clickedRange) {
      onHighlightClick(clickedRange);
    }
  }, [effectiveRanges, onHighlightClick, containerRef]);

  return (
    <canvas
      ref={canvasRef}
      className={`highlight-overlay ${className}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        pointerEvents: onHighlightClick ? 'auto' : 'none',
        zIndex: 1,
        ...(!visible && { display: 'none' }),
        ...(enableDebugMode && { 
          border: '2px dashed red',
          backgroundColor: 'rgba(255, 0, 0, 0.1)' 
        }),
      }}
      onClick={handleCanvasClick}
      data-testid="highlight-canvas"
    />
  );
};

/**
 * Extract highlight ranges from analysis result
 */
function extractRangesFromAnalysis(
  content: string, 
  analysisResult: ContentAnalysisResult
): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  
  for (const sentenceData of analysisResult.report.perSentence) {
    if (sentenceData.tags.length === 0) continue;

    const sentence = sentenceData.sentence.trim();
    if (!sentence) continue;

    const sentenceStart = content.indexOf(sentence);
    if (sentenceStart === -1) continue;

    const sentenceEnd = sentenceStart + sentence.length;

    // Create ranges for each tag
    for (const tag of sentenceData.tags) {
      if (isValidHighlightType(tag)) {
        ranges.push({
          start: sentenceStart,
          end: sentenceEnd,
          type: tag,
          priority: getHighlightPriority(tag),
          message: getHighlightMessage(tag),
          suggestion: getHighlightSuggestion(tag),
        });
      }
    }
  }

  return ranges;
}

/**
 * Extract highlight ranges from tagged content
 */
function extractRangesFromTaggedContent(content: string, taggedContent: string): HighlightRange[] {
  const ranges: HighlightRange[] = [];
  const tagRegex = /<(\w+)>(.*?)<\/\1>/g;
  let match;

  while ((match = tagRegex.exec(taggedContent)) !== null) {
    const [fullMatch, tagType, taggedText] = match;
    
    if (isValidHighlightType(tagType)) {
      const start = content.indexOf(taggedText);
      if (start !== -1) {
        ranges.push({
          start,
          end: start + taggedText.length,
          type: tagType,
          priority: getHighlightPriority(tagType),
          message: getHighlightMessage(tagType),
          suggestion: getHighlightSuggestion(tagType),
        });
      }
    }
  }

  return ranges;
}

// Helper functions
function isValidHighlightType(tag: string): tag is import('../../types/highlighting').HighlightType {
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

function getHighlightPriority(type: string): import('../../types/highlighting').HighlightPriority {
  const priorities = {
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
  } as const;
  
  return priorities[type as keyof typeof priorities] || 'medium';
}

function getHighlightMessage(type: string): string {
  const messages = {
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
  
  return messages[type as keyof typeof messages] || 'Issue detected';
}

function getHighlightSuggestion(type: string): string {
  const suggestions = {
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
  
  return suggestions[type as keyof typeof suggestions] || 'Consider revising this content';
}

export default HighlightOverlay;