import { useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getRoot } from 'lexical';

interface PlaceholderPluginProps {
  placeholder: string;
}

const PlaceholderPlugin: React.FC<PlaceholderPluginProps> = ({ placeholder }) => {
  const [editor] = useLexicalComposerContext();
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const updatePlaceholderVisibility = () => {
      editor.read(() => {
        const root = $getRoot();
        const textContent = root.getTextContent().trim();
        setIsEmpty(textContent === '');
      });
    };

    // Check initial state
    updatePlaceholderVisibility();

    // Listen for changes
    const removeListener = editor.registerUpdateListener(() => {
      updatePlaceholderVisibility();
    });

    return removeListener;
  }, [editor]);

  if (!isEmpty) {
    return null;
  }

  return (
    <div className="editor-placeholder-js">
      {placeholder}
    </div>
  );
};

export default PlaceholderPlugin;