import React, { useImperativeHandle, forwardRef, useState, useEffect, useCallback } from 'react';
import { $getRoot, $createTextNode } from 'lexical';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { AutoFocusPlugin } from '@lexical/react/LexicalAutoFocusPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { MarkdownShortcutPlugin } from '@lexical/react/LexicalMarkdownShortcutPlugin';
import { TRANSFORMERS } from '@lexical/markdown';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { HeadingNode, QuoteNode } from '@lexical/rich-text';
import { ListItemNode, ListNode } from '@lexical/list';
import { CodeHighlightNode, CodeNode } from '@lexical/code';
import { AutoLinkNode, LinkNode } from '@lexical/link';
import './RichTextEditor.css';

import ToolbarPlugin from './plugins/ToolbarPlugin';
import KeyboardShortcutsPlugin from './plugins/KeyboardShortcutsPlugin';
import InitialContentPlugin from './plugins/InitialContentPlugin';
import PastePlugin from './plugins/PastePlugin';
import SpellCheckPlugin, { GrammarCheckPlugin } from './plugins/SpellCheckPlugin';
import AccessibilityPlugin from './plugins/AccessibilityPlugin';
import CleanEmptyStatePlugin from './plugins/CleanEmptyStatePlugin';
import PlaceholderPlugin from './plugins/PlaceholderPlugin';
import LineBreakPlugin from './plugins/LineBreakPlugin';
import { sanitizeHTML, validateContent } from '../../utils/sanitization';
import type { ContentValidationResult } from '../../utils/sanitization';
import { useAutoSave } from '../../utils/autoSave';

interface RichTextEditorProps {
  placeholder?: string;
  initialValue?: string;
  onChange?: (html: string, text: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  className?: string;
  autoFocus?: boolean;
  readOnly?: boolean;
  // Security and validation options
  enableAutoSave?: boolean;
  autoSaveKey?: string;
  showValidation?: boolean;
  onValidationChange?: (result: ContentValidationResult) => void;
  onPasteWarning?: (warnings: string[]) => void;
  onPasteError?: (error: string) => void;
  onAutoSaveError?: (error: Error) => void;
  // Advanced features for newsletter creation
  enableSpellCheck?: boolean;
  enableGrammarCheck?: boolean;
  enableAccessibility?: boolean;
  customDictionary?: string[];
  onSpellingSuggestion?: (word: string, suggestions: string[]) => void;
  onGrammarIssue?: (issues: string[]) => void;
  onAccessibilityAnnouncement?: (message: string) => void;
}

export interface RichTextEditorRef {
  getHTML: () => string;
  getPlainText: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  clear: () => void;
  // Auto-save methods
  saveNow: () => void;
  restoreAutoSave: () => boolean;
  clearAutoSave: () => void;
  hasAutoSave: () => boolean;
}

// Custom hook to handle editor ref methods
function useEditorRef(autoSaveManager?: ReturnType<typeof useAutoSave>) {
  const [editor] = useLexicalComposerContext();
  
  return {
    getHTML: () => {
      let html = '';
      editor.read(() => {
        try {
          html = $generateHtmlFromNodes(editor, null);
        } catch (error) {
          console.error('Error generating HTML:', error);
          html = '';
        }
      });
      return sanitizeHTML(html); // Always sanitize output
    },
    getPlainText: () => {
      let text = '';
      editor.read(() => {
        text = $getRoot().getTextContent();
      });
      return text;
    },
    setContent: (content: string) => {
      editor.update(() => {
        try {
          // Sanitize content before setting
          const sanitizedContent = sanitizeHTML(content);
          const parser = new DOMParser();
          const dom = parser.parseFromString(sanitizedContent, 'text/html');
          const nodes = $generateNodesFromDOM(editor, dom);
          
          const root = $getRoot();
          root.clear();
          
          // Only append valid nodes
          nodes.forEach(node => {
            if (node) {
              root.append(node);
            }
          });
        } catch (error) {
          console.error('Error setting content:', error);
          // Fallback: just set as plain text
          const root = $getRoot();
          root.clear();
          root.append($createTextNode(content));
        }
      });
    },
    focus: () => {
      editor.focus();
    },
    clear: () => {
      editor.update(() => {
        $getRoot().clear();
      });
      autoSaveManager?.clear();
    },
    // Auto-save methods
    saveNow: () => {
      if (autoSaveManager) {
        editor.read(() => {
          try {
            const html = sanitizeHTML($generateHtmlFromNodes(editor, null));
            const text = $getRoot().getTextContent();
            autoSaveManager.saveImmediate(html, text);
          } catch (error) {
            console.error('Error saving content:', error);
          }
        });
      }
    },
    restoreAutoSave: () => {
      if (autoSaveManager) {
        const saved = autoSaveManager.restore();
        if (saved) {
          editor.update(() => {
            try {
              const parser = new DOMParser();
              const dom = parser.parseFromString(saved.html, 'text/html');
              const nodes = $generateNodesFromDOM(editor, dom);
              
              const root = $getRoot();
              root.clear();
              
              // Only append valid nodes
              nodes.forEach(node => {
                if (node) {
                  root.append(node);
                }
              });
            } catch (error) {
              console.error('Error restoring content:', error);
              // Fallback: set as plain text
              const root = $getRoot();
              root.clear();
              root.append($createTextNode(saved.plainText || ''));
            }
          });
          return true;
        }
      }
      return false;
    },
    clearAutoSave: () => {
      autoSaveManager?.clear();
    },
    hasAutoSave: () => {
      return autoSaveManager?.hasSaved ?? false;
    },
  };
}

// Component to handle ref exposure
function EditorRefHandler({ 
  editorRef, 
  autoSaveManager 
}: { 
  editorRef: React.Ref<RichTextEditorRef>;
  autoSaveManager?: ReturnType<typeof useAutoSave>;
}) {
  const methods = useEditorRef(autoSaveManager);
  
  useImperativeHandle(editorRef, () => methods, [methods]);
  
  return null;
}

// Component to handle change events with auto-save
function ChangeHandler({ 
  onChange, 
  autoSaveManager,
  onValidationChange 
}: { 
  onChange?: (html: string, text: string) => void;
  autoSaveManager?: ReturnType<typeof useAutoSave>;
  onValidationChange?: (result: ContentValidationResult) => void;
}) {
  const [editor] = useLexicalComposerContext();
  
  const handleChange = useCallback((editorState: any) => {
    editorState.read(() => {
      try {
        const html = sanitizeHTML($generateHtmlFromNodes(editor, null));
        const text = $getRoot().getTextContent();
        
        // Content changed
        
        // Validate content
        if (onValidationChange) {
          const validationResult = validateContent(html, text);
          onValidationChange(validationResult);
        }
        
        // Trigger auto-save
        if (autoSaveManager && (html.trim() || text.trim())) {
          autoSaveManager.save(html, text);
        }
        
        onChange?.(html, text);
      } catch (error) {
        console.error('Error generating HTML from editor state:', error);
        // Fallback to just text content
        const text = $getRoot().getTextContent();
        onChange?.('', text);
      }
    });
  }, [editor, onChange, autoSaveManager, onValidationChange]);

  return <OnChangePlugin onChange={handleChange} />;
}

// Lexical editor configuration
const editorConfig = {
  namespace: 'RichTextEditor',
  nodes: [
    HeadingNode,
    ListNode,
    ListItemNode,
    QuoteNode,
    CodeNode,
    CodeHighlightNode,
    AutoLinkNode,
    LinkNode,
  ],
  onError(error: Error) {
    console.error('Lexical Editor Error:', error);
  },
  theme: {
    root: 'editor-input',
    paragraph: 'editor-paragraph',
    heading: {
      h1: 'editor-heading-h1',
      h2: 'editor-heading-h2',
      h3: 'editor-heading-h3',
    },
    list: {
      nested: {
        listitem: 'editor-nested-listitem',
      },
      ol: 'editor-list-ol',
      ul: 'editor-list-ul',
      listitem: 'editor-listitem',
    },
    quote: 'editor-quote',
    code: 'editor-code',
    codeHighlight: {
      atrule: 'editor-tokenAttr',
      attr: 'editor-tokenAttr',
      boolean: 'editor-tokenProperty',
      builtin: 'editor-tokenSelector',
      cdata: 'editor-tokenComment',
      char: 'editor-tokenSelector',
      class: 'editor-tokenFunction',
      'class-name': 'editor-tokenFunction',
      comment: 'editor-tokenComment',
      constant: 'editor-tokenProperty',
      deleted: 'editor-tokenProperty',
      doctype: 'editor-tokenComment',
      entity: 'editor-tokenOperator',
      function: 'editor-tokenFunction',
      important: 'editor-tokenVariable',
      inserted: 'editor-tokenSelector',
      keyword: 'editor-tokenAttr',
      namespace: 'editor-tokenVariable',
      number: 'editor-tokenProperty',
      operator: 'editor-tokenOperator',
      prolog: 'editor-tokenComment',
      property: 'editor-tokenProperty',
      punctuation: 'editor-tokenPunctuation',
      regex: 'editor-tokenVariable',
      selector: 'editor-tokenSelector',
      string: 'editor-tokenSelector',
      symbol: 'editor-tokenProperty',
      tag: 'editor-tokenProperty',
      url: 'editor-tokenOperator',
      variable: 'editor-tokenVariable',
    },
    link: 'editor-link',
    text: {
      bold: 'editor-text-bold',
      italic: 'editor-text-italic',
      underline: 'editor-text-underline',
      strikethrough: 'editor-text-strikethrough',
      code: 'editor-text-code',
    },
  },
};

const RichTextEditor = forwardRef<RichTextEditorRef, RichTextEditorProps>(({
  placeholder = 'type something',
  initialValue = '',
  onChange,
  onBlur,
  onFocus,
  className = '',
  autoFocus = false,
  readOnly = false,
  // Security and validation options
  enableAutoSave = true,
  autoSaveKey = 'newsletter-editor-content',
  showValidation = false, // Simplified - hide validation by default
  onValidationChange,
  onPasteWarning,
  onPasteError,
  onAutoSaveError,
  // Advanced features for newsletter creation
  enableSpellCheck = false, // Simplified - disable by default
  enableGrammarCheck = false, // Simplified - disable by default
  enableAccessibility = true,
  customDictionary = [],
  onSpellingSuggestion,
  onGrammarIssue,
  onAccessibilityAnnouncement,
}, ref) => {
  const [validationResult, setValidationResult] = useState<ContentValidationResult | null>(null);
  const [pasteWarnings, setPasteWarnings] = useState<string[]>([]);
  const [pasteError, setPasteError] = useState<string | null>(null);

  // Initialize auto-save if enabled
  const autoSaveManager = enableAutoSave ? useAutoSave({
    key: autoSaveKey,
    debounceMs: 2000,
    maxVersions: 5,
    onSave: (data) => {
      // Content auto-saved
    },
    onError: onAutoSaveError,
  }) : undefined;

  // Handle validation changes
  const handleValidationChange = useCallback((result: ContentValidationResult) => {
    setValidationResult(result);
    onValidationChange?.(result);
  }, [onValidationChange]);

  // Handle paste warnings
  const handlePasteWarning = useCallback((warnings: string[]) => {
    setPasteWarnings(warnings);
    onPasteWarning?.(warnings);
    // Clear warnings after 5 seconds
    setTimeout(() => setPasteWarnings([]), 5000);
  }, [onPasteWarning]);

  // Handle paste errors
  const handlePasteError = useCallback((error: string) => {
    setPasteError(error);
    onPasteError?.(error);
    // Clear error after 5 seconds
    setTimeout(() => setPasteError(null), 5000);
  }, [onPasteError]);



  // Sanitize initial value
  const sanitizedInitialValue = initialValue ? sanitizeHTML(initialValue) : '';

  // Set initial content if provided
  const initialConfig = {
    ...editorConfig,
    editable: !readOnly,
  };

  // Auto-restore content on mount if available - temporarily disabled
  // useEffect(() => {
  //   if (autoSaveManager && !initialValue) {
  //     const saved = autoSaveManager.restore();
  //     if (saved) {
  //       console.log('Auto-restored content from:', new Date(saved.timestamp));
  //       // Set the content directly using the editor ref
  //       setTimeout(() => {
  //         if (ref && 'current' in ref && ref.current) {
  //           ref.current.setContent(saved.html);
  //         }
  //       }, 100);
  //     }
  //   }
  // }, [autoSaveManager, initialValue, ref]);

  return (
    <div className={`rich-text-editor ${className}`}>
      <LexicalComposer initialConfig={initialConfig}>
        <div className="editor-container">
          {!readOnly && <ToolbarPlugin />}
          <div className="editor-inner">
            <RichTextPlugin
              contentEditable={
                <ContentEditable
                  className="editor-input"
                  onBlur={onBlur}
                  onFocus={onFocus}
                />
              }
              placeholder={null}
              ErrorBoundary={LexicalErrorBoundary}
            />
            <PlaceholderPlugin placeholder={placeholder} />
            <LineBreakPlugin />
            <HistoryPlugin />
            <ListPlugin />
            <LinkPlugin />
            <MarkdownShortcutPlugin transformers={TRANSFORMERS} />
            <KeyboardShortcutsPlugin />
            {/* Temporarily disabled to fix placeholder visibility */}
            {/* <CleanEmptyStatePlugin /> */}
            <InitialContentPlugin initialValue={sanitizedInitialValue} />
            {autoFocus && <AutoFocusPlugin />}
            
            {/* Essential plugins only */}
            <PastePlugin 
              onPasteWarning={handlePasteWarning}
              onPasteError={handlePasteError}
            />
            
            {enableSpellCheck && (
              <SpellCheckPlugin
                enabled={enableSpellCheck}
                customDictionary={customDictionary}
                onSpellingSuggestion={onSpellingSuggestion}
              />
            )}
            
            {enableGrammarCheck && (
              <GrammarCheckPlugin 
                enabled={enableGrammarCheck} 
                onGrammarIssue={onGrammarIssue}
              />
            )}
            
            {enableAccessibility && (
              <AccessibilityPlugin
                announceChanges={false} // Simplified
                enableKeyboardShortcuts={true}
                onAnnouncement={onAccessibilityAnnouncement}
              />
            )}
            
            <ChangeHandler 
              onChange={onChange} 
              autoSaveManager={autoSaveManager}
              onValidationChange={handleValidationChange}
            />
            <EditorRefHandler 
              editorRef={ref} 
              autoSaveManager={autoSaveManager}
            />
          </div>
          
          {/* Minimal validation feedback */}
          {showValidation && (pasteError || (validationResult?.errors.length)) && (
            <div className="validation-feedback">
              {pasteError && (
                <div className="validation-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{pasteError}</span>
                </div>
              )}
              
              {validationResult?.errors.map((error, index) => (
                <div key={index} className="validation-error">
                  <span className="error-icon">⚠️</span>
                  <span className="error-text">{error}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Minimal auto-save indicator */}
          {enableAutoSave && autoSaveManager && autoSaveManager.lastSaveTime && (
            <div className="auto-save-indicator">
              <span className="save-status-icon">💾</span>
              <span>Saved</span>
            </div>
          )}
        </div>
      </LexicalComposer>
    </div>
  );
});

RichTextEditor.displayName = 'RichTextEditor';

export default RichTextEditor;