import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
} from 'lexical';
import { FORMAT_TEXT_COMMAND } from 'lexical';
import { $createHeadingNode } from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
} from '@lexical/list';
import { TOGGLE_LINK_COMMAND } from '@lexical/link';

const KeyboardShortcutsPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key, ctrlKey, metaKey, shiftKey } = event;

      // Check for Ctrl/Cmd key (cross-platform)
      const isModifierPressed = ctrlKey || metaKey;

      // Handle keyboard shortcuts

      if (isModifierPressed) {
        switch (key.toLowerCase()) {
          case 'b': {
            // Bold (Ctrl/Cmd + B)
            // Apply bold formatting
            event.preventDefault();
            event.stopPropagation();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
            return;
          }
          case 'i': {
            // Italic (Ctrl/Cmd + I)
            // Apply italic formatting
            event.preventDefault();
            event.stopPropagation();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
            return;
          }
          case 'u': {
            // Underline (Ctrl/Cmd + U)
            // Apply underline formatting
            event.preventDefault();
            event.stopPropagation();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
            return;
          }
          case 'k': {
            // Link (Ctrl/Cmd + K)
            event.preventDefault();
            const url = window.prompt('Enter URL:');
            if (url) {
              editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
            }
            return;
          }
          case '1': {
            // Heading 1 (Ctrl/Cmd + Shift + 1)
            if (shiftKey) {
              event.preventDefault();
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  const headingNode = $createHeadingNode('h1');
                  selection.insertNodes([headingNode]);
                }
              });
              return;
            }
            break;
          }
          case '2': {
            // Heading 2 (Ctrl/Cmd + Shift + 2)
            if (shiftKey) {
              event.preventDefault();
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  const headingNode = $createHeadingNode('h2');
                  selection.insertNodes([headingNode]);
                }
              });
              return;
            }
            break;
          }
          case '3': {
            // Heading 3 (Ctrl/Cmd + Shift + 3)
            if (shiftKey) {
              event.preventDefault();
              editor.update(() => {
                const selection = $getSelection();
                if ($isRangeSelection(selection)) {
                  const headingNode = $createHeadingNode('h3');
                  selection.insertNodes([headingNode]);
                }
              });
              return;
            }
            break;
          }
          case '8': {
            // Bullet List (Ctrl/Cmd + Shift + 8)
            if (shiftKey) {
              event.preventDefault();
              editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
              return;
            }
            break;
          }
          case '7': {
            // Numbered List (Ctrl/Cmd + Shift + 7)
            if (shiftKey) {
              event.preventDefault();
              editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
              return;
            }
            break;
          }
          case 'e': {
            // Code (Ctrl/Cmd + E)
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
            return;
          }
          case 'd': {
            // Strikethrough (Ctrl/Cmd + D)
            event.preventDefault();
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough');
            return;
          }
        }
      }
    };

    const editorElement = editor.getRootElement();
    // Setup keyboard shortcuts
    
    if (editorElement) {
      // Add event listener with capture to ensure we get the events first
      editorElement.addEventListener('keydown', handleKeyDown, true);
      
      return () => {
        editorElement.removeEventListener('keydown', handleKeyDown, true);
      };
    } else {
      console.warn('KeyboardShortcuts: No editor element found');
    }
  }, [editor]);

  return null;
};

export default KeyboardShortcutsPlugin;