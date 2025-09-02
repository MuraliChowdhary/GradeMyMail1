import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

/**
 * Plugin to ensure clean empty state without HTML markup showing as text
 */
const CleanEmptyStatePlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Initialize with clean empty state - don't create empty paragraph initially
    editor.update(() => {
      const root = $getRoot();
      const children = root.getChildren();
      
      // Only clean up if there's problematic content, don't create empty paragraph
      children.forEach(child => {
        const textContent = child.getTextContent();
        if (textContent.includes('<') && textContent.includes('>')) {
          // Remove nodes with HTML markup
          child.remove();
        }
      });
    });

    // Listen for editor updates to clean up any HTML markup that appears as text
    const removeListener = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const root = $getRoot();
        const children = root.getChildren();
        
        children.forEach(child => {
          const textContent = child.getTextContent();
          // If we find HTML markup as text content, clean it up
          if (textContent.includes('<p class="editor-paragraph">') || 
              textContent.includes('<br>') || 
              textContent.includes('</p>')) {
            
            editor.update(() => {
              child.remove();
              // Don't automatically create empty paragraph - let placeholder show
            });
          }
        });
      });
    });

    return removeListener;
  }, [editor]);

  return null;
};

export default CleanEmptyStatePlugin;