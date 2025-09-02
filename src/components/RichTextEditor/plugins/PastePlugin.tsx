import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $generateNodesFromDOM } from '@lexical/html';
import { $insertNodes, $createTextNode } from 'lexical';
import { useEffect } from 'react';
import { sanitizePastedContent, detectSuspiciousContent } from '../../../utils/sanitization';

interface PastePluginProps {
  onPasteWarning?: (warnings: string[]) => void;
  onPasteError?: (error: string) => void;
}

export default function PastePlugin({ onPasteWarning, onPasteError }: PastePluginProps) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      // Get HTML content from clipboard
      const htmlData = clipboardData.getData('text/html');
      const textData = clipboardData.getData('text/plain');

      // If there's HTML content, process it
      if (htmlData) {
        event.preventDefault();

        try {
          // Check for suspicious content before sanitization
          const suspiciousContent = detectSuspiciousContent(htmlData);
          if (suspiciousContent.length > 0) {
            onPasteWarning?.(suspiciousContent.map(issue => 
              `Potentially unsafe content detected: ${issue}`
            ));
          }

          // Sanitize the HTML content
          const sanitizedHTML = sanitizePastedContent(htmlData);

          // If sanitization removed everything, fall back to plain text
          if (!sanitizedHTML.trim() && textData.trim()) {
            editor.update(() => {
              $insertNodes([$createTextNode(textData)]);
            });
            return;
          }

          // Insert sanitized HTML
          if (sanitizedHTML.trim()) {
            editor.update(() => {
              try {
                const parser = new DOMParser();
                const dom = parser.parseFromString(sanitizedHTML, 'text/html');
                const nodes = $generateNodesFromDOM(editor, dom);
                
                // Only insert valid nodes
                const validNodes = nodes.filter(node => node != null);
                if (validNodes.length > 0) {
                  $insertNodes(validNodes);
                }
              } catch (error) {
                console.error('Error inserting pasted content:', error);
                // Fallback to plain text
                if (textData) {
                  $insertNodes([$createTextNode(textData)]);
                }
              }
            });
          }

          // Show warning if content was modified during sanitization
          if (htmlData !== sanitizedHTML) {
            onPasteWarning?.(['Some formatting or content was removed for security reasons']);
          }

        } catch (error) {
          console.error('Error processing pasted content:', error);
          onPasteError?.('Failed to process pasted content. Please try again.');
          
          // Fall back to plain text
          if (textData) {
            editor.update(() => {
              $insertNodes([$createTextNode(textData)]);
            });
          }
        }
      }
      // If only plain text, let the default handler work
      else if (textData) {
        // Allow default paste behavior for plain text
        return;
      }
    };

    // Register paste event listener
    const editorElement = editor.getRootElement();
    if (editorElement) {
      editorElement.addEventListener('paste', handlePaste);
      
      return () => {
        editorElement.removeEventListener('paste', handlePaste);
      };
    }
  }, [editor, onPasteWarning, onPasteError]);

  return null;
}