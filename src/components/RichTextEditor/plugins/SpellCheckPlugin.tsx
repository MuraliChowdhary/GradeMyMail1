import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { useEffect, useState, useCallback } from 'react';

interface SpellCheckPluginProps {
  enabled?: boolean;
  onSpellingSuggestion?: (word: string, suggestions: string[]) => void;
  customDictionary?: string[];
}

interface SpellingError {
  word: string;
  position: { start: number; end: number };
  suggestions: string[];
}

export default function SpellCheckPlugin({ 
  enabled = true,
  onSpellingSuggestion,
  customDictionary = []
}: SpellCheckPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [spellingErrors, setSpellingErrors] = useState<SpellingError[]>([]);

  // Initialize spell check plugin

  // Simple spell check implementation using browser's built-in capabilities
  const checkSpelling = useCallback(async (text: string): Promise<SpellingError[]> => {
    if (!enabled || !text.trim()) return [];

    const errors: SpellingError[] = [];
    const words = text.match(/\b[a-zA-Z]+\b/g) || [];
    
    for (const word of words) {
      // Skip if word is in custom dictionary
      if (customDictionary.includes(word.toLowerCase())) continue;
      
      // Use a simple heuristic for common misspellings
      // In a real implementation, you'd use a proper spell-check API
      if (await isLikelyMisspelled(word)) {
        const suggestions = await getSuggestions(word);
        const position = getWordPosition(text, word);
        
        if (position) {
          errors.push({
            word,
            position,
            suggestions
          });
        }
      }
    }

    return errors;
  }, [enabled, customDictionary]);

  // Simple misspelling detection (expanded for demo purposes)
  const isLikelyMisspelled = async (word: string): Promise<boolean> => {
    // Common misspellings for demo purposes
    const commonMisspellings = [
      'teh', 'recieve', 'seperate', 'occured', 'definately',
      'neccessary', 'accomodate', 'begining', 'beleive', 'calender',
      'wierd', 'freind', 'thier', 'youre', 'its', 'alot', 'loose',
      'affect', 'effect', 'then', 'than', 'there', 'their', 'theyre'
    ];
    
    return commonMisspellings.includes(word.toLowerCase());
  };

  // Get spelling suggestions (expanded implementation)
  const getSuggestions = async (word: string): Promise<string[]> => {
    const suggestionMap: Record<string, string[]> = {
      'teh': ['the'],
      'recieve': ['receive'],
      'seperate': ['separate'],
      'occured': ['occurred'],
      'definately': ['definitely'],
      'neccessary': ['necessary'],
      'accomodate': ['accommodate'],
      'begining': ['beginning'],
      'beleive': ['believe'],
      'calender': ['calendar'],
      'wierd': ['weird'],
      'freind': ['friend'],
      'thier': ['their'],
      'youre': ["you're"],
      'its': ["it's"],
      'alot': ['a lot'],
      'loose': ['lose'],
      'affect': ['effect'],
      'effect': ['affect'],
      'then': ['than'],
      'than': ['then'],
      'there': ['their', "they're"],
      'their': ['there', "they're"],
      'theyre': ["they're"]
    };

    return suggestionMap[word.toLowerCase()] || [];
  };

  // Get word position in text
  const getWordPosition = (text: string, word: string): { start: number; end: number } | null => {
    const index = text.indexOf(word);
    if (index === -1) return null;
    
    return {
      start: index,
      end: index + word.length
    };
  };

  // Apply spelling correction (currently unused but available for future use)
  // const applySuggestion = useCallback((error: SpellingError, suggestion: string) => {
  //   editor.update(() => {
  //     const selection = $getSelection();
  //     if ($isRangeSelection(selection)) {
  //       // In a full implementation, you'd replace the specific word
  //       // For now, we'll just notify about the suggestion
  //       onSpellingSuggestion?.(error.word, [suggestion]);
  //     }
  //   });
  // }, [editor, onSpellingSuggestion]);

  // Check spelling on content change with debouncing
  useEffect(() => {
    if (!enabled) return;

    let timeoutId: NodeJS.Timeout;

    const unregister = editor.registerUpdateListener(({ editorState }) => {
      // Clear previous timeout
      clearTimeout(timeoutId);
      
      // Debounce the spell check to avoid excessive calls
      timeoutId = setTimeout(() => {
        editorState.read(async () => {
          try {
            const textContent = editorState._nodeMap.get('root')?.getTextContent() || '';
            if (textContent.trim()) {
              const errors = await checkSpelling(textContent);
              setSpellingErrors(errors);
              
              // Notify parent component about spelling issues
              if (onSpellingSuggestion) {
                // Only send unique errors to avoid duplicates
                const uniqueErrors = errors.filter((error, index, self) => 
                  index === self.findIndex(e => e.word.toLowerCase() === error.word.toLowerCase())
                );
                
                uniqueErrors.forEach(error => {
                  onSpellingSuggestion(error.word, error.suggestions);
                });
              }
            }
          } catch (error) {
            console.warn('Spell check error:', error);
          }
        });
      }, 500); // 500ms debounce
    });

    return () => {
      clearTimeout(timeoutId);
      unregister();
    };
  }, [editor, enabled, checkSpelling, onSpellingSuggestion]);

  // Add context menu for spelling suggestions
  useEffect(() => {
    if (!enabled) return;

    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleContextMenu = (_event: MouseEvent) => {
      // In a full implementation, you'd show a context menu with suggestions
      // For now, we'll just log the spelling errors
      // Handle spelling errors if needed
    };

    editorElement.addEventListener('contextmenu', handleContextMenu);

    return () => {
      editorElement.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [editor, enabled, spellingErrors]);

  return null;
}

// Grammar checking plugin (enhanced implementation)
export function GrammarCheckPlugin({ 
  enabled = true, 
  onGrammarIssue 
}: { 
  enabled?: boolean;
  onGrammarIssue?: (issues: string[]) => void;
}) {
  const [editor] = useLexicalComposerContext();

  // Initialize grammar check plugin

  useEffect(() => {
    if (!enabled) return;

    let timeoutId: NodeJS.Timeout;
    let lastCheckedText = '';

    const checkGrammar = (text: string) => {
      // Skip if text hasn't changed
      if (text === lastCheckedText) return;
      lastCheckedText = text;

      // Basic grammar rules for demo
      const grammarIssues = [];
      
      // Check for double spaces
      if (text.includes('  ')) {
        grammarIssues.push('Multiple consecutive spaces found');
      }
      
      // Check for sentences starting with lowercase
      const sentences = text.split(/[.!?]+/);
      for (const sentence of sentences) {
        const trimmed = sentence.trim();
        if (trimmed && /^[a-z]/.test(trimmed)) {
          grammarIssues.push('Sentence should start with capital letter');
        }
      }
      
      // Check for missing punctuation at end of sentences
      const lines = text.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.length > 10 && !/[.!?]$/.test(trimmed) && !trimmed.endsWith(':')) {
          grammarIssues.push('Consider adding punctuation at end of sentence');
        }
      }
      
      // Check for repeated words
      const words = text.toLowerCase().split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        if (words[i] === words[i + 1] && words[i].length > 2) {
          grammarIssues.push(`Repeated word: "${words[i]}"`);
        }
      }
      
      // Always call the callback, even with empty array
      if (onGrammarIssue) {
        onGrammarIssue(grammarIssues);
      }
    };

    const unregister = editor.registerUpdateListener(({ editorState }) => {
      // Clear previous timeout
      clearTimeout(timeoutId);
      
      // Debounce the grammar check
      timeoutId = setTimeout(() => {
        editorState.read(() => {
          try {
            const textContent = editorState._nodeMap.get('root')?.getTextContent() || '';
            // Check grammar
            checkGrammar(textContent);
          } catch (error) {
            console.warn('Grammar check error:', error);
          }
        });
      }, 750); // 750ms debounce for grammar (slightly longer)
    });

    return () => {
      clearTimeout(timeoutId);
      unregister();
    };
  }, [editor, enabled, onGrammarIssue]);

  return null;
}