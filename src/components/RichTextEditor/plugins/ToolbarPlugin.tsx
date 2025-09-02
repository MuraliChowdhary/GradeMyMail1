import React, { useCallback, useEffect, useState } from 'react';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import {
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  UNDO_COMMAND,
  REDO_COMMAND,
  CAN_UNDO_COMMAND,
  CAN_REDO_COMMAND,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
} from 'lexical';
import {
  $createHeadingNode,
  $createQuoteNode,
  $isHeadingNode,
  type HeadingTagType,
} from '@lexical/rich-text';
import {
  INSERT_UNORDERED_LIST_COMMAND,
  INSERT_ORDERED_LIST_COMMAND,
  REMOVE_LIST_COMMAND,
  $isListNode,
} from '@lexical/list';
import { $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { $findMatchingParent, mergeRegister } from '@lexical/utils';

const ToolbarPlugin: React.FC = () => {
  const [editor] = useLexicalComposerContext();
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isCode, setIsCode] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');

  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      // Update text formatting states
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsCode(selection.hasFormat('code'));

      // Update link state
      const node = selection.anchor.getNode();
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      // Update block type
      const anchorNode = selection.anchor.getNode();
      let element =
        anchorNode.getKey() === 'root'
          ? anchorNode
          : $findMatchingParent(anchorNode, (e) => {
              const parent = e.getParent();
              return parent !== null && parent.getKey() === 'root';
            });

      if (element === null) {
        element = anchorNode.getTopLevelElementOrThrow();
      }

      const elementKey = element.getKey();
      const elementDOM = editor.getElementByKey(elementKey);

      if (elementDOM !== null) {
        if ($isListNode(element)) {
          const parentList = $findMatchingParent(
            anchorNode,
            (parent) => $isListNode(parent) && parent.getParent()?.getKey() === 'root'
          );
          const type = parentList && $isListNode(parentList)
            ? parentList.getListType()
            : element.getListType();
          setBlockType(type);
        } else {
          const type = $isHeadingNode(element)
            ? element.getTag()
            : element.getType();
          if (type in blockTypeToBlockName) {
            setBlockType(type as keyof typeof blockTypeToBlockName);
          }
        }
      }
    }
  }, [editor]);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => {
          updateToolbar();
        });
      }),
      editor.registerCommand(
        CAN_UNDO_COMMAND,
        (payload) => {
          setCanUndo(payload);
          return false;
        },
        1
      ),
      editor.registerCommand(
        CAN_REDO_COMMAND,
        (payload) => {
          setCanRedo(payload);
          return false;
        },
        1
      )
    );
  }, [editor, updateToolbar]);

  const formatText = (format: 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code') => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, format);
  };

  const formatHeading = (headingSize: HeadingTagType) => {
    if (blockType !== headingSize) {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : $findMatchingParent(anchorNode, (e) => {
                  const parent = e.getParent();
                  return parent !== null && parent.getKey() === 'root';
                });

          if (element !== null) {
            const headingNode = $createHeadingNode(headingSize);
            element.replace(headingNode, true);
          }
        }
      });
    } else {
      // If clicking the same heading type, convert back to paragraph
      formatParagraph();
    }
  };

  const formatParagraph = () => {
    if (blockType !== 'paragraph') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : $findMatchingParent(anchorNode, (e) => {
                  const parent = e.getParent();
                  return parent !== null && parent.getKey() === 'root';
                });

          if (element !== null) {
            const paragraphNode = $createParagraphNode();
            element.replace(paragraphNode, true);
          }
        }
      });
    }
  };

  const formatQuote = () => {
    if (blockType !== 'quote') {
      editor.update(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          const anchorNode = selection.anchor.getNode();
          const element =
            anchorNode.getKey() === 'root'
              ? anchorNode
              : $findMatchingParent(anchorNode, (e) => {
                  const parent = e.getParent();
                  return parent !== null && parent.getKey() === 'root';
                });

          if (element !== null) {
            const quoteNode = $createQuoteNode();
            element.replace(quoteNode, true);
          }
        }
      });
    } else {
      formatParagraph();
    }
  };

  const formatBulletList = () => {
    if (blockType !== 'bullet') {
      editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const formatNumberedList = () => {
    if (blockType !== 'number') {
      editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
    } else {
      editor.dispatchCommand(REMOVE_LIST_COMMAND, undefined);
    }
  };

  const insertLink = useCallback(() => {
    if (!isLink) {
      const url = window.prompt('Enter URL:');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  }, [editor, isLink]);

  return (
    <div className="toolbar">
      {/* Essential text formatting only */}
      <button
        onClick={() => formatText('bold')}
        className={`toolbar-item ${isBold ? 'active' : ''}`}
        title="Bold (⌘B)"
        aria-label="Bold"
      >
        <strong>B</strong>
      </button>
      <button
        onClick={() => formatText('italic')}
        className={`toolbar-item ${isItalic ? 'active' : ''}`}
        title="Italic (⌘I)"
        aria-label="Italic"
      >
        <em>I</em>
      </button>

      <div className="divider" />

      {/* Essential headings */}
      <button
        onClick={() => formatHeading('h1')}
        className={`toolbar-item ${blockType === 'h1' ? 'active' : ''}`}
        title="Heading"
        aria-label="Heading"
      >
        H1
      </button>
      <button
        onClick={() => formatHeading('h2')}
        className={`toolbar-item ${blockType === 'h2' ? 'active' : ''}`}
        title="Subheading"
        aria-label="Subheading"
      >
        H2
      </button>

      <div className="divider" />

      {/* Essential lists */}
      <button
        onClick={formatBulletList}
        className={`toolbar-item ${blockType === 'bullet' ? 'active' : ''}`}
        title="Bullet List"
        aria-label="Bullet List"
      >
        •
      </button>
      <button
        onClick={formatNumberedList}
        className={`toolbar-item ${blockType === 'number' ? 'active' : ''}`}
        title="Numbered List"
        aria-label="Numbered List"
      >
        1.
      </button>

      <div className="divider" />

      {/* Link */}
      <button
        onClick={insertLink}
        className={`toolbar-item ${isLink ? 'active' : ''}`}
        title="Add Link"
        aria-label="Add Link"
      >
        🔗
      </button>
    </div>
  );
};

const blockTypeToBlockName = {
  bullet: 'Bulleted List',
  code: 'Code Block',
  h1: 'Heading 1',
  h2: 'Heading 2',
  h3: 'Heading 3',
  h4: 'Heading 4',
  h5: 'Heading 5',
  h6: 'Heading 6',
  number: 'Numbered List',
  paragraph: 'Normal',
  quote: 'Quote',
};

export default ToolbarPlugin;