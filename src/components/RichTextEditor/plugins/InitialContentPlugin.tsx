import { useEffect, useRef } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot, $createParagraphNode, $createTextNode } from 'lexical';
import { $generateNodesFromDOM } from '@lexical/html';

interface InitialContentPluginProps {
  initialValue?: string;
}

const InitialContentPlugin: React.FC<InitialContentPluginProps> = ({ initialValue }) => {
  const [editor] = useLexicalComposerContext();
  const hasInitialized = useRef(false);

  useEffect(() => {
    if (initialValue && initialValue.trim() && !hasInitialized.current) {
      hasInitialized.current = true;
      
      editor.update(() => {
        try {
          // Check if initialValue contains HTML markup
          if (initialValue.includes('<') && initialValue.includes('>')) {
            // If it contains HTML, parse it properly
            const parser = new DOMParser();
            const dom = parser.parseFromString(initialValue, 'text/html');
            const nodes = $generateNodesFromDOM(editor, dom);
            
            const root = $getRoot();
            root.clear();
            
            if (nodes.length > 0) {
              nodes.forEach(node => {
                if (node) {
                  root.append(node);
                }
              });
            } else {
              // Fallback: create empty paragraph
              const paragraph = $createParagraphNode();
              root.append(paragraph);
            }
          } else {
            // Plain text: create a paragraph with text
            const root = $getRoot();
            root.clear();
            const paragraph = $createParagraphNode();
            paragraph.append($createTextNode(initialValue));
            root.append(paragraph);
          }
        } catch (error) {
          console.error('Error setting initial content:', error);
          // Fallback: create empty paragraph
          const root = $getRoot();
          root.clear();
          const paragraph = $createParagraphNode();
          root.append(paragraph);
        }
      });
    }
  }, [editor, initialValue]);

  return null;
};

export default InitialContentPlugin;