import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import { $getRoot } from 'lexical';
import { useEffect, useState } from 'react';
import { validateContent, sanitizeHTML } from '../../../utils/sanitization';
import type { ContentValidationResult } from '../../../utils/sanitization';

interface ValidationPluginProps {
  onValidationChange?: (result: ContentValidationResult) => void;
  showWarnings?: boolean;
  autoSanitize?: boolean;
}

export default function ValidationPlugin({ 
  onValidationChange, 
  showWarnings = true,
  autoSanitize = true 
}: ValidationPluginProps) {
  const [editor] = useLexicalComposerContext();
  const [validationResult, setValidationResult] = useState<ContentValidationResult | null>(null);

  useEffect(() => {
    const validateEditorContent = () => {
      editor.read(() => {
        const html = $generateHtmlFromNodes(editor, null);
        const plainText = $getRoot().getTextContent();
        
        // Validate content
        const result = validateContent(html, plainText);
        setValidationResult(result);
        onValidationChange?.(result);

        // Auto-sanitize if enabled and content is valid
        if (autoSanitize && result.isValid && html) {
          const sanitizedHTML = sanitizeHTML(html);
          
          // If sanitization changed the content, update the editor
          if (sanitizedHTML !== html) {
            editor.update(() => {
              const parser = new DOMParser();
              const dom = parser.parseFromString(sanitizedHTML, 'text/html');
              const root = $getRoot();
              root.clear();
              
              // Import sanitized nodes using Lexical's built-in function
              const nodes = $generateNodesFromDOM(editor, dom);
              root.append(...nodes);
            });
          }
        }
      });
    };

    // Validate on content change
    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        validateEditorContent();
      });
    });

    // Initial validation
    validateEditorContent();

    return unregister;
  }, [editor, onValidationChange, autoSanitize]);

  // Render validation warnings/errors if enabled
  if (!showWarnings || !validationResult) {
    return null;
  }

  const { errors, warnings, stats } = validationResult;

  if (errors.length === 0 && warnings.length === 0) {
    return null;
  }

  return (
    <div className="validation-feedback">
      {errors.length > 0 && (
        <div className="validation-errors">
          {errors.map((error, index) => (
            <div key={index} className="validation-error">
              <span className="error-icon">⚠️</span>
              <span className="error-text">{error}</span>
            </div>
          ))}
        </div>
      )}
      
      {warnings.length > 0 && (
        <div className="validation-warnings">
          {warnings.map((warning, index) => (
            <div key={index} className="validation-warning">
              <span className="warning-icon">⚡</span>
              <span className="warning-text">{warning}</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="content-stats">
        <span className="stat">
          {stats.characterCount.toLocaleString()} characters
        </span>
        <span className="stat-separator">•</span>
        <span className="stat">
          {stats.wordCount.toLocaleString()} words
        </span>
        <span className="stat-separator">•</span>
        <span className="stat">
          {(stats.htmlSize / 1024).toFixed(1)}KB
        </span>
      </div>
    </div>
  );
}