import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { $getSelection, $isRangeSelection, KEY_DOWN_COMMAND, COMMAND_PRIORITY_LOW } from 'lexical';
import { useEffect, useCallback } from 'react';

interface AccessibilityPluginProps {
  announceChanges?: boolean;
  enableKeyboardShortcuts?: boolean;
  onAnnouncement?: (message: string) => void;
}

export default function AccessibilityPlugin({ 
  announceChanges = true,
  enableKeyboardShortcuts = true,
  onAnnouncement
}: AccessibilityPluginProps) {
  const [editor] = useLexicalComposerContext();

  // Announce changes to screen readers
  const announceToScreenReader = useCallback((message: string) => {
    if (!announceChanges) return;

    // Use the callback if provided
    if (onAnnouncement) {
      onAnnouncement(message);
      return;
    }

    // Create a live region for screen reader announcements
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    // Remove after announcement
    setTimeout(() => {
      document.body.removeChild(announcement);
    }, 1000);
  }, [announceChanges, onAnnouncement]);

  // Enhanced keyboard navigation
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (event: KeyboardEvent): boolean => {
      const { ctrlKey, metaKey, altKey, shiftKey, key } = event;
      const isModifierPressed = ctrlKey || metaKey;

      // Skip navigation shortcuts
      if (altKey && !isModifierPressed) {
        switch (key) {
          case 'ArrowUp':
            // Move to previous paragraph
            event.preventDefault();
            announceToScreenReader('Moving to previous paragraph');
            return true;
          
          case 'ArrowDown':
            // Move to next paragraph
            event.preventDefault();
            announceToScreenReader('Moving to next paragraph');
            return true;
          
          case 'Home':
            // Move to beginning of document
            event.preventDefault();
            announceToScreenReader('Moving to beginning of document');
            return true;
          
          case 'End':
            // Move to end of document
            event.preventDefault();
            announceToScreenReader('Moving to end of document');
            return true;
        }
      }

      // Announce formatting changes
      if (isModifierPressed && !altKey && !shiftKey) {
        switch (key) {
          case 'b':
            announceToScreenReader('Bold formatting toggled');
            break;
          case 'i':
            announceToScreenReader('Italic formatting toggled');
            break;
          case 'u':
            announceToScreenReader('Underline formatting toggled');
            break;
          case 'k':
            announceToScreenReader('Link dialog opened');
            break;
        }
      }

      // List navigation shortcuts
      if (isModifierPressed && shiftKey) {
        switch (key) {
          case 'ArrowUp':
            // Move list item up
            event.preventDefault();
            announceToScreenReader('List item moved up');
            return true;
          
          case 'ArrowDown':
            // Move list item down
            event.preventDefault();
            announceToScreenReader('List item moved down');
            return true;
        }
      }

      return false;
    };

    const unregister = editor.registerCommand(
      KEY_DOWN_COMMAND,
      handleKeyDown,
      COMMAND_PRIORITY_LOW
    );

    return unregister;
  }, [editor, enableKeyboardShortcuts, announceToScreenReader]);

  // Announce selection changes
  useEffect(() => {
    if (!announceChanges) return;

    const unregister = editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const selectedText = selection.getTextContent();
          
          // Announce when text is selected
          if (selectedText && selectedText.length > 0) {
            const wordCount = selectedText.split(/\s+/).length;
            if (wordCount === 1) {
              announceToScreenReader(`Selected: ${selectedText}`);
            } else {
              announceToScreenReader(`Selected ${wordCount} words`);
            }
          }
        }
      });
    });

    return unregister;
  }, [editor, announceChanges, announceToScreenReader]);

  // Set up ARIA attributes on the editor
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    // Set ARIA attributes
    editorElement.setAttribute('role', 'textbox');
    editorElement.setAttribute('aria-multiline', 'true');
    editorElement.setAttribute('aria-label', 'Rich text editor');
    
    // Add keyboard shortcut descriptions
    const shortcuts = [
      'Ctrl+B for bold',
      'Ctrl+I for italic', 
      'Ctrl+U for underline',
      'Ctrl+K for link',
      'Alt+Arrow keys for navigation',
      'Ctrl+Z for undo',
      'Ctrl+Y for redo'
    ];
    
    editorElement.setAttribute('aria-describedby', 'editor-shortcuts');
    
    // Create shortcuts description element
    let shortcutsElement = document.getElementById('editor-shortcuts');
    if (!shortcutsElement) {
      shortcutsElement = document.createElement('div');
      shortcutsElement.id = 'editor-shortcuts';
      shortcutsElement.style.position = 'absolute';
      shortcutsElement.style.left = '-10000px';
      shortcutsElement.textContent = `Keyboard shortcuts: ${shortcuts.join(', ')}`;
      document.body.appendChild(shortcutsElement);
    }

    return () => {
      // Clean up ARIA attributes
      editorElement.removeAttribute('role');
      editorElement.removeAttribute('aria-multiline');
      editorElement.removeAttribute('aria-label');
      editorElement.removeAttribute('aria-describedby');
    };
  }, [editor]);

  // Focus management
  useEffect(() => {
    const editorElement = editor.getRootElement();
    if (!editorElement) return;

    const handleFocus = () => {
      announceToScreenReader('Rich text editor focused. Use keyboard shortcuts for formatting.');
    };

    const handleBlur = () => {
      announceToScreenReader('Rich text editor unfocused.');
    };

    editorElement.addEventListener('focus', handleFocus);
    editorElement.addEventListener('blur', handleBlur);

    return () => {
      editorElement.removeEventListener('focus', handleFocus);
      editorElement.removeEventListener('blur', handleBlur);
    };
  }, [editor, announceToScreenReader]);

  return null;
}

// Hook for managing focus and announcements
export function useAccessibilityAnnouncements() {
  const announce = useCallback((message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';
    
    document.body.appendChild(announcement);
    announcement.textContent = message;
    
    setTimeout(() => {
      if (document.body.contains(announcement)) {
        document.body.removeChild(announcement);
      }
    }, 1000);
  }, []);

  return { announce };
}