import { useEffect } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  KEY_ENTER_COMMAND,
  COMMAND_PRIORITY_HIGH,
} from 'lexical';
import { $createLineBreakNode } from 'lexical';

const LineBreakPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    return editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        const selection = $getSelection();
        
        if ($isRangeSelection(selection)) {
          // If Shift+Enter, create a line break (soft return)
          if (event?.shiftKey) {
            event.preventDefault();
            selection.insertNodes([$createLineBreakNode()]);
            return true;
          }
          
          // For regular Enter, let Lexical handle paragraph creation
          // but ensure it flows naturally
          return false;
        }
        
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );
  }, [editor]);

  return null;
};

export default LineBreakPlugin;