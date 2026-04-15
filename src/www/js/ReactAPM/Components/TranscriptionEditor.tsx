import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Mark, mergeAttributes } from '@tiptap/core';
import './TranscriptionEditor.css';

import { Bold } from '@tiptap/extension-bold';
import { Italic } from '@tiptap/extension-italic';


const HandIdLimit = 3;
/**
 * Custom Rubric Mark
 * Rubric text is shown visually as bold blue in the editor.
 */
const Rubric = Mark.create({
  name: 'rubric',

  parseHTML() {
    return [
      {
        tag: 'b.rubric',
      },
      {
        tag: 'span',
        getAttrs: node => (node as HTMLElement).classList.contains('rubric') && null,
      }
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['b', mergeAttributes(HTMLAttributes, { class: 'rubric' }), 0];
  },
});

/**
 * Custom Bold Mark
 * Matches existing b.boldtext format.
 */
const CustomBold = Bold.extend({
    renderHTML({ HTMLAttributes }) {
        return ['b', mergeAttributes(HTMLAttributes, { class: 'boldtext' }), 0];
    },
    parseHTML() {
        return [
            { tag: 'b.boldtext' },
            { tag: 'strong' },
            {
                tag: 'b',
                getAttrs: node => (node as HTMLElement).style.fontWeight === 'bold' && null,
            },
        ];
    },
});

/**
 * Custom Italic Mark
 * Matches existing b.italictext format.
 */
const CustomItalic = Italic.extend({
    renderHTML({ HTMLAttributes }) {
        return ['b', mergeAttributes(HTMLAttributes, { class: 'italictext' }), 0];
    },
    parseHTML() {
        return [
            { tag: 'b.italictext' },
            { tag: 'em' },
            { tag: 'i' },
            {
                tag: 'b',
                getAttrs: node => (node as HTMLElement).style.fontStyle === 'italic' && null,
            },
        ];
    },
});

/**
 * Custom Abbreviation Mark
 * Abbreviation requires asking the user for the expansion of the selected text,
 * a hand id (1, 2, 3, up to a configurable limit) and an optional editorial note.
 */
const Abbreviation = Mark.create({
  name: 'abbreviation',

  addAttributes() {
    return {
      expansion: {
        default: '',
        parseHTML: element => element.getAttribute('alttext'),
        renderHTML: attributes => ({ alttext: attributes.expansion }),
      },
      handId: {
        default: 0,
        parseHTML: element => parseInt(element.getAttribute('handid') || '0'),
        renderHTML: attributes => {
          const attrs: Record<string, any> = { handid: attributes.handId };
          if (attributes.handId > 0) {
              attrs.class = `hand${attributes.handId}`;
          }
          return attrs;
        },
      },
      editorialNote: {
        default: '',
        parseHTML: element => element.getAttribute('extrainfo'),
        renderHTML: attributes => ({ extrainfo: attributes.editorialNote }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'b.abbr',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['b', mergeAttributes(HTMLAttributes, { class: 'abbr' }), 0];
  },
});

export interface TranscriptionEditorOptions {
    handIdLimit?: number;
}

export interface TranscriptionEditorProps {
  content?: string;
  onChange?: (content: string) => void;
  options?: TranscriptionEditorOptions;
}

/**
 * TranscriptionEditor component using TipTap.
 * 
 * Implements: Bold, Italic, Rubric, and Abbreviation.
 */

export default function TranscriptionEditor({
  content = '',
  onChange,
  options = {},
}: TranscriptionEditorProps) {
  const handIdLimit = options.handIdLimit ?? HandIdLimit;

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bold: false,
        italic: false,
      }),
      CustomBold,
      CustomItalic,
      Rubric,
      Abbreviation,
    ],
    content,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
  });

  if (!editor) {
    return null;
  }

  /**
   * Prompts user for abbreviation details and applies the mark.
   */
  const addAbbreviation = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert('Please select some text first.');
      return;
    }
    const selectedText = editor.state.doc.textBetween(from, to);
    
    const expansion = window.prompt(`Expansion of "${selectedText}":`, '');
    if (expansion === null) return;

    const handIdStr = window.prompt(`Hand ID (1-${handIdLimit}):`, '1');
    if (handIdStr === null) return;
    const handId = Math.max(0, parseInt(handIdStr) - 1);

    const editorialNote = window.prompt('Editorial Note (optional):', '') || '';
    if (editorialNote === null) return;

    editor.chain().focus().setMark('abbreviation', { expansion, handId, editorialNote }).run();
  };

  return (
    <div className="transcription-editor">
      <div className="toolbar">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'is-active' : ''}
          type="button"
          title="Bold"
        >
          <b>B</b>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'is-active' : ''}
          type="button"
          title="Italic"
        >
          <i>I</i>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleMark('rubric').run()}
          className={editor.isActive('rubric') ? 'is-active' : ''}
          type="button"
          title="Rubric"
        >
          R
        </button>
        <button
          onClick={addAbbreviation}
          className={editor.isActive('abbreviation') ? 'is-active' : ''}
          type="button"
          title="Abbreviation"
        >
          Abbr
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content-wrapper" />
    </div>
  );
}


