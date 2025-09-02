import React, { useMemo, useState } from 'react';
import type { DiffViewerProps, DiffMapping, WordDiff } from '../../types/diff';
import { cleanHtmlForDisplay } from '../../utils/sanitization';
import './DiffViewer.css';

// Helper function to determine why content was changed
const getChangeReason = (oldText: string, newText: string): string => {
  const oldLower = oldText.toLowerCase();
  const newLower = newText.toLowerCase();
  
  // Check for spam word replacements
  const spamWords = ['free', 'urgent', 'act now', 'limited time', 'amazing', 'incredible', 'fantastic'];
  const hasSpamWord = spamWords.some(word => oldLower.includes(word));
  if (hasSpamWord) {
    return `Spam risk: Replaced "${oldText}" with "${newText}" to reduce spam-like language`;
  }
  
  // Check for readability improvements
  if (oldText.length > newText.length && oldText.split(' ').length > 15) {
    return `Readability: Simplified long sentence "${oldText}" to improve clarity`;
  }
  
  // Check for tone improvements
  if (oldLower.includes('must') || oldLower.includes('should') || oldLower.includes('need to')) {
    return `Tone: Softened demanding language "${oldText}" to be more friendly`;
  }
  
  // Check for fluff removal
  const fluffWords = ['very', 'really', 'quite', 'extremely', 'absolutely'];
  const hasFluff = fluffWords.some(word => oldLower.includes(word));
  if (hasFluff) {
    return `Clarity: Removed unnecessary qualifier "${oldText}" to make content more direct`;
  }
  
  // Generic improvement
  return `Improved: Changed "${oldText}" to "${newText}" for better clarity and engagement`;
};

// Helper function to explain why content was inserted
const getInsertionReason = (newText: string): string => {
  const newLower = newText.toLowerCase();
  
  // Check for transition words
  const transitions = ['however', 'therefore', 'additionally', 'furthermore', 'meanwhile'];
  if (transitions.some(word => newLower.includes(word))) {
    return `Flow: Added "${newText}" to improve content flow and readability`;
  }
  
  // Check for clarifying words
  if (newLower.includes('for example') || newLower.includes('specifically') || newLower.includes('in other words')) {
    return `Clarity: Added "${newText}" to provide better explanation`;
  }
  
  // Generic addition
  return `Enhancement: Added "${newText}" to improve content quality`;
};

// Helper function to explain why content was deleted
const getDeletionReason = (oldText: string): string => {
  const oldLower = oldText.toLowerCase();
  
  // Check for spam words
  const spamWords = ['free', 'urgent', 'act now', 'limited time', 'click here', 'buy now'];
  if (spamWords.some(word => oldLower.includes(word))) {
    return `Spam risk: Removed "${oldText}" - flagged as spam-like language`;
  }
  
  // Check for fluff words
  const fluffWords = ['amazing', 'incredible', 'fantastic', 'awesome', 'unbelievable'];
  if (fluffWords.some(word => oldLower.includes(word))) {
    return `Fluff: Removed "${oldText}" - unnecessary promotional language`;
  }
  
  // Check for redundancy
  if (oldText.split(' ').length < 3 && (oldLower.includes('very') || oldLower.includes('really'))) {
    return `Conciseness: Removed "${oldText}" - redundant qualifier`;
  }
  
  // Generic removal
  return `Clarity: Removed "${oldText}" to improve content focus`;
};

// Component for individual improvements with copy functionality
const ImprovementWithCopy: React.FC<{
  content: string;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}> = ({ content, children, className, style, title }) => {
  const [showCopy, setShowCopy] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy improvement:', error);
    }
  };

  return (
    <span 
      className={`improvement-with-copy ${className || ''}`}
      style={style}
    >
      {children}
      <button
        onClick={handleCopy}
        className={`copy-improvement-btn ${copied ? 'copied' : ''}`}
        title={copied ? 'Copied!' : 'Copy this improvement'}
      >
        {copied ? (
          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </button>
    </span>
  );
};

const VirtualizedDiffViewer: React.FC<DiffViewerProps> = ({
  originalContent,
  modifiedContent,
  gmmEditorData,
  height = 600,
  className = ''
}) => {
  const [copiedState, setCopiedState] = useState<'idle' | 'copying' | 'copied'>('idle');

  // Debug logging
  console.log('🔍 VirtualizedDiffViewer received:', {
    originalContentLength: originalContent.length,
    originalContentPreview: originalContent.substring(0, 200) + '...',
    modifiedContentLength: modifiedContent.length,
    hasGMMeditorData: !!gmmEditorData,
    mappingsCount: gmmEditorData?.mappings?.length || 0,
    hasHtmlTagsInOriginal: /<[^>]*>/.test(originalContent),
    hasAnalysisTagsInOriginal: /<(fluff|spam_words|hard_to_read)>/.test(originalContent)
  });

  // Use GMMeditor mappings if available, otherwise fallback to the old parsing
  const improvedText = useMemo(() => {
    if (gmmEditorData?.mappings && gmmEditorData.mappings.length > 0) {
      // Use the rich GMMeditor data
      console.log('✅ Using GMMeditor mappings for improved text');
      return cleanHtmlForDisplay(gmmEditorData.rewritten);
    }
    
    // Fallback to the modified content if no mappings
    console.log('⚠️ No GMMeditor mappings available, using modified content');
    return cleanHtmlForDisplay(modifiedContent) || 'No improvements available';
  }, [gmmEditorData, modifiedContent]);

  // Copy improved content to clipboard with enhanced UX
  const handleCopyImproved = async () => {
    if (copiedState !== 'idle') return;
    
    setCopiedState('copying');
    
    try {
      await navigator.clipboard.writeText(improvedText);
      setCopiedState('copied');
      
      // Reset after 2 seconds
      setTimeout(() => setCopiedState('idle'), 2000);
    } catch (error) {
      console.error('Failed to copy improved content:', error);
      // Fallback method
      const textArea = document.createElement('textarea');
      textArea.value = improvedText;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      
      setCopiedState('copied');
      setTimeout(() => setCopiedState('idle'), 2000);
    }
  };

  const getCopyButtonContent = () => {
    switch (copiedState) {
      case 'copying':
        return (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </>
        );
      case 'copied':
        return (
          <>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </>
        );
      default:
        return (
          <>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
            Copy
          </>
        );
    }
  };

  return (
    <div className={`premium-diff-viewer ${className}`}>
      {/* Premium Header */}
      <div className="premium-header">
        <div className="header-section original-header">
          <h2 className="section-title">Original</h2>
          <div className="section-subtitle">Your current content</div>
        </div>
        
        <div className="header-divider"></div>
        
        <div className="header-section improved-header">
          <div className="improved-title-section">
            <h2 className="section-title">Improved</h2>
            <div className="section-subtitle">
              {gmmEditorData?.mappings ? 
                `${gmmEditorData.mappings.filter(m => m.type === 'changed').length} improvements applied` : 
                'Enhanced version'
              }
            </div>
          </div>
          
          <button
            onClick={handleCopyImproved}
            disabled={copiedState !== 'idle'}
            className={`copy-button ${copiedState}`}
            title="Copy improved content to clipboard"
          >
            {getCopyButtonContent()}
          </button>
        </div>
      </div>



      {/* Premium Content Area */}
      <div className="premium-content" style={{ height: height - (gmmEditorData?.mappings ? 160 : 80) }}>
        {/* Original Content */}
        <div className="content-pane original-pane">
          <div className="content-wrapper">
            {gmmEditorData?.mappings && gmmEditorData.mappings.length > 0 ? (
              <PremiumOriginalContent 
                originalText={originalContent}
                mappings={gmmEditorData.mappings}
              />
            ) : (
              <div className="premium-text original-text" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>
                {cleanHtmlForDisplay(originalContent) || 'No original content available'}
              </div>
            )}
          </div>
        </div>

        {/* Content Divider */}
        <div className="content-divider"></div>

        {/* Improved Content */}
        <div className="content-pane improved-pane">
          <div className="content-wrapper">
            {gmmEditorData?.mappings && gmmEditorData.mappings.length > 0 ? (
              <PremiumImprovedContent 
                originalText={originalContent}
                mappings={gmmEditorData.mappings}
              />
            ) : (
              <div className="premium-text improved-text" style={{ whiteSpace: 'pre-wrap' }}>
                {improvedText}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Enhanced component for improved content with word-level highlighting
const PremiumImprovedContent: React.FC<{
  originalText: string;
  mappings: DiffMapping[];
}> = ({ originalText, mappings }) => {
  const renderedContent = useMemo(() => {
    return mappings.map((mapping, index) => {
      const animationDelay = index * 0.05; // Stagger animations
      
      switch (mapping.type) {
        case 'unchanged':
          return (
            <span 
              key={`unchanged-${index}`}
              className="diff-unchanged"
              style={{ animationDelay: `${animationDelay}s` }}
            >
              {cleanHtmlForDisplay(mapping.new)}
            </span>
          );
          
        case 'changed':
          return (
            <ImprovementWithCopy
              key={`changed-${index}`}
              content={cleanHtmlForDisplay(mapping.new)}
              className="diff-changed"
              style={{ animationDelay: `${animationDelay}s` }}
            >
              {mapping.wordDiff ? (
                <WordLevelDiff wordDiff={mapping.wordDiff} />
              ) : (
                cleanHtmlForDisplay(mapping.new)
              )}
            </ImprovementWithCopy>
          );
          
        case 'inserted':
          return (
            <ImprovementWithCopy
              key={`inserted-${index}`}
              content={cleanHtmlForDisplay(mapping.new)}
              className="diff-inserted"
              style={{ animationDelay: `${animationDelay}s` }}
            >
              {cleanHtmlForDisplay(mapping.new)}
            </ImprovementWithCopy>
          );
          
        case 'deleted':
          // Don't render deleted content in the improved view
          return null;
          
        default:
          return null;
      }
    }).filter(Boolean);
  }, [mappings]);

  return (
    <div className="premium-text improved-text enhanced-diff-content">
      {renderedContent}
    </div>
  );
};

// Component for rendering word-level differences
const WordLevelDiff: React.FC<{ wordDiff: WordDiff[] }> = ({ wordDiff }) => {
  return (
    <>
      {wordDiff.map((word, index) => {
        if (word.removed) {
          // Don't render removed words in the improved view
          return null;
        }
        
        if (word.added) {
          return (
            <span 
              key={`word-added-${index}`}
              className="word-added"
              title="New word"
            >
              {cleanHtmlForDisplay(word.value)}
            </span>
          );
        }
        
        return (
          <span 
            key={`word-unchanged-${index}`}
            className="word-unchanged"
          >
            {cleanHtmlForDisplay(word.value)}
          </span>
        );
      })}
    </>
  );
};

// Component for rendering original content with deletions highlighted
const PremiumOriginalContent: React.FC<{
  originalText: string;
  mappings: DiffMapping[];
}> = ({ originalText, mappings }) => {
  const renderedContent = useMemo(() => {
    return mappings.map((mapping, index) => {
      const animationDelay = index * 0.05;
      
      switch (mapping.type) {
        case 'unchanged':
          return (
            <span 
              key={`orig-unchanged-${index}`}
              className="diff-unchanged"
              style={{ animationDelay: `${animationDelay}s` }}
            >
              {cleanHtmlForDisplay(mapping.old)}
            </span>
          );
          
        case 'changed':
          return (
            <span 
              key={`orig-changed-${index}`}
              className="diff-original-changed"
              style={{ animationDelay: `${animationDelay}s` }}
              title={getChangeReason(mapping.old, mapping.new)}
            >
              {mapping.wordDiff ? (
                <OriginalWordLevelDiff wordDiff={mapping.wordDiff} />
              ) : (
                cleanHtmlForDisplay(mapping.old)
              )}
            </span>
          );
          
        case 'deleted':
          return (
            <span 
              key={`orig-deleted-${index}`}
              className="diff-deleted"
              style={{ animationDelay: `${animationDelay}s` }}
              title={getDeletionReason(mapping.old)}
            >
              {cleanHtmlForDisplay(mapping.old)}
            </span>
          );
          
        case 'inserted':
          // Don't render inserted content in the original view
          return null;
          
        default:
          return null;
      }
    }).filter(Boolean);
  }, [mappings]);

  return (
    <div className="premium-text original-text enhanced-diff-content">
      {renderedContent}
    </div>
  );
};

// Component for rendering word-level differences in original content
const OriginalWordLevelDiff: React.FC<{ wordDiff: WordDiff[] }> = ({ wordDiff }) => {
  return (
    <>
      {wordDiff.map((word, index) => {
        if (word.added) {
          // Don't render added words in the original view
          return null;
        }
        
        if (word.removed) {
          return (
            <span 
              key={`orig-word-removed-${index}`}
              className="word-removed"
              title="This word will be removed"
            >
              {cleanHtmlForDisplay(word.value)}
            </span>
          );
        }
        
        return (
          <span 
            key={`orig-word-unchanged-${index}`}
            className="word-unchanged"
          >
            {cleanHtmlForDisplay(word.value)}
          </span>
        );
      })}
    </>
  );
};

// Component to show a summary of improvements made
const ImprovementsSummary: React.FC<{ mappings: DiffMapping[] }> = ({ mappings }) => {
  const summary = useMemo(() => {
    const changes = mappings.filter(m => m.type === 'changed');
    const deletions = mappings.filter(m => m.type === 'deleted');
    const insertions = mappings.filter(m => m.type === 'inserted');
    
    const categories = {
      spam: 0,
      fluff: 0,
      readability: 0,
      tone: 0,
      clarity: 0
    };
    
    // Categorize changes and deletions
    [...changes, ...deletions].forEach(mapping => {
      const text = mapping.old.toLowerCase();
      const spamWords = ['free', 'urgent', 'act now', 'limited time', 'click here', 'buy now'];
      const fluffWords = ['amazing', 'incredible', 'fantastic', 'awesome', 'unbelievable'];
      
      if (spamWords.some(word => text.includes(word))) {
        categories.spam++;
      } else if (fluffWords.some(word => text.includes(word))) {
        categories.fluff++;
      } else if (text.split(' ').length > 15) {
        categories.readability++;
      } else if (text.includes('must') || text.includes('should')) {
        categories.tone++;
      } else {
        categories.clarity++;
      }
    });
    
    return {
      total: changes.length + deletions.length + insertions.length,
      changes: changes.length,
      deletions: deletions.length,
      insertions: insertions.length,
      categories
    };
  }, [mappings]);

  if (summary.total === 0) return null;

  return (
    <div className="improvements-summary">
      <div className="summary-header">
        <h3 className="summary-title">
          {summary.total} Improvements Applied
        </h3>
        <div className="summary-stats">
          {summary.changes > 0 && (
            <span className="stat-item changed">
              {summary.changes} changed
            </span>
          )}
          {summary.deletions > 0 && (
            <span className="stat-item deleted">
              {summary.deletions} removed
            </span>
          )}
          {summary.insertions > 0 && (
            <span className="stat-item inserted">
              {summary.insertions} added
            </span>
          )}
        </div>
      </div>
      
      <div className="summary-categories">
        {summary.categories.spam > 0 && (
          <div className="category-item spam">
            <span className="category-icon">🚫</span>
            <span className="category-text">
              {summary.categories.spam} spam-like words removed
            </span>
          </div>
        )}
        {summary.categories.fluff > 0 && (
          <div className="category-item fluff">
            <span className="category-icon">✂️</span>
            <span className="category-text">
              {summary.categories.fluff} unnecessary words removed
            </span>
          </div>
        )}
        {summary.categories.readability > 0 && (
          <div className="category-item readability">
            <span className="category-icon">📖</span>
            <span className="category-text">
              {summary.categories.readability} sentences simplified
            </span>
          </div>
        )}
        {summary.categories.tone > 0 && (
          <div className="category-item tone">
            <span className="category-icon">💬</span>
            <span className="category-text">
              {summary.categories.tone} tone improvements
            </span>
          </div>
        )}
        {summary.categories.clarity > 0 && (
          <div className="category-item clarity">
            <span className="category-icon">💡</span>
            <span className="category-text">
              {summary.categories.clarity} clarity improvements
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default VirtualizedDiffViewer;