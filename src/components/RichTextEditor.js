import React, { useEffect, useRef, useState } from 'react';
import {
  FiBold,
  FiItalic,
  FiUnderline,
  FiList,
  FiLink,
  FiAlignLeft,
  FiAlignCenter,
  FiAlignRight,
  FiRotateCcw
} from 'react-icons/fi';
import { toRichHtml } from './richText';
import { useDialog } from './DialogProvider';
import './RichTextEditor.css';

const exec = (command, value = null) => {
  document.execCommand(command, false, value);
};

const RichTextEditor = ({ value, onChange, placeholder = 'Write the content here...', minHeight = 200 }) => {
  const editorRef = useRef(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const { prompt, notify } = useDialog();

  // Push incoming value into the editable node only when it actually differs,
  // otherwise every keystroke would reset the caret to the start.
  useEffect(() => {
    const node = editorRef.current;
    if (!node) return;
    const incoming = toRichHtml(value || '');
    if (node.innerHTML !== incoming) {
      node.innerHTML = incoming;
    }
    setIsEmpty(!node.textContent.trim() && !node.querySelector('img, hr'));
  }, [value]);

  useEffect(() => {
    // Emit <b>/<i> tags rather than inline styled spans.
    try {
      document.execCommand('styleWithCSS', false, false);
    } catch (e) {
      /* not supported — tags are produced anyway */
    }
  }, []);

  const emitChange = () => {
    const node = editorRef.current;
    if (!node) return;
    setIsEmpty(!node.textContent.trim() && !node.querySelector('img, hr'));
    onChange(node.innerHTML === '<br>' ? '' : node.innerHTML);
  };

  const runCommand = (command, commandValue) => {
    editorRef.current?.focus();
    exec(command, commandValue);
    emitChange();
  };

  const handleLink = async () => {
    // Selection is lost while the dialog has focus, so capture it first
    // and restore it before running the command.
    const selection = window.getSelection();
    const savedRange = selection.rangeCount ? selection.getRangeAt(0).cloneRange() : null;

    const url = await prompt({
      title: 'Insert link',
      message: 'Where should this text link to?',
      placeholder: 'https://example.com',
      confirmLabel: 'Insert link',
      tone: 'info'
    });
    if (!url) return;

    const trimmed = String(url).trim();
    if (!/^(https?:|mailto:|tel:)/i.test(trimmed)) {
      await notify({
        title: 'That link looks incomplete',
        message: 'Please enter a full URL starting with https://, mailto: or tel:',
        tone: 'warning'
      });
      return;
    }

    editorRef.current?.focus();
    if (savedRange) {
      selection.removeAllRanges();
      selection.addRange(savedRange);
    }
    runCommand('createLink', trimmed);
  };

  // Paste as plain text so copied styles from Word/webpages don't leak in.
  const handlePaste = (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData).getData('text/plain');
    exec('insertText', text);
    emitChange();
  };

  const toolbarGroups = [
    [
      { command: 'bold', icon: <FiBold />, title: 'Bold (Ctrl+B)' },
      { command: 'italic', icon: <FiItalic />, title: 'Italic (Ctrl+I)' },
      { command: 'underline', icon: <FiUnderline />, title: 'Underline (Ctrl+U)' },
      { command: 'strikeThrough', label: 'S', title: 'Strikethrough', strike: true }
    ],
    [
      { command: 'formatBlock', commandValue: '<h2>', label: 'H2', title: 'Large heading' },
      { command: 'formatBlock', commandValue: '<h3>', label: 'H3', title: 'Small heading' },
      { command: 'formatBlock', commandValue: '<p>', label: 'P', title: 'Normal text' },
      { command: 'formatBlock', commandValue: '<blockquote>', label: '❝', title: 'Quote' }
    ],
    [
      { command: 'insertUnorderedList', icon: <FiList />, title: 'Bulleted list' },
      { command: 'insertOrderedList', label: '1.', title: 'Numbered list' }
    ],
    [
      { command: 'justifyLeft', icon: <FiAlignLeft />, title: 'Align left' },
      { command: 'justifyCenter', icon: <FiAlignCenter />, title: 'Align center' },
      { command: 'justifyRight', icon: <FiAlignRight />, title: 'Align right' }
    ]
  ];

  return (
    <div className="rte">
      <div className="rte-toolbar">
        {toolbarGroups.map((group, groupIndex) => (
          <div className="rte-group" key={groupIndex}>
            {group.map((button) => (
              <button
                key={button.title}
                type="button"
                className="rte-btn"
                title={button.title}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => runCommand(button.command, button.commandValue)}
              >
                {button.icon || (
                  <span style={button.strike ? { textDecoration: 'line-through' } : undefined}>{button.label}</span>
                )}
              </button>
            ))}
          </div>
        ))}
        <div className="rte-group">
          <button
            type="button"
            className="rte-btn"
            title="Insert link"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleLink}
          >
            <FiLink />
          </button>
          <button
            type="button"
            className="rte-btn"
            title="Clear formatting"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => runCommand('removeFormat')}
          >
            <FiRotateCcw />
          </button>
        </div>
      </div>

      <div className="rte-surface">
        {isEmpty && <span className="rte-placeholder">{placeholder}</span>}
        <div
          ref={editorRef}
          className="rte-input rich-content"
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          style={{ minHeight: `${minHeight}px` }}
          onInput={emitChange}
          onBlur={emitChange}
          onPaste={handlePaste}
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
