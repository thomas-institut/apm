import React from 'react';
import { useEditor, EditorContent, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Mark, mergeAttributes } from '@tiptap/core';
import TranscriptionMarkDialog, { TranscriptionMarkData } from './TranscriptionMarkDialog';
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
        return ['b', mergeAttributes(HTMLAttributes, { class: 'bold-text' }), 0];
    },
    parseHTML() {
        return [
            { tag: 'b.bold-text' },
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
        return ['b', mergeAttributes(HTMLAttributes, { class: 'italic-text' }), 0];
    },
    parseHTML() {
        return [
            { tag: 'b.italic-text' },
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
        parseHTML: element => element.getAttribute('expansion'),
        renderHTML: attributes => ({ expansion: attributes.expansion }),
      },
      handId: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('handId') || '1'),
        renderHTML: attributes => {
          const attrs: Record<string, any> = { handId: attributes.handId };
          if (attributes.handId > 0) {
              attrs.class = `hand-${attributes.handId}`;
          }
          return attrs;
        },
      },
      editorialNote: {
        default: '',
        parseHTML: element => element.getAttribute('editorialNote'),
        renderHTML: attributes => ({ editorialNote: attributes.editorialNote }),
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

/**
 * Custom Sic Mark
 * Sic requires asking the user for the correction of the selected text,
 * a hand id (1, 2, 3, up to a configurable limit) and an optional editorial note.
 */
const Sic = Mark.create({
  name: 'sic',

  addAttributes() {
    return {
      correction: {
        default: '',
        parseHTML: element => element.getAttribute('correction'),
        renderHTML: attributes => ({ correction: attributes.correction }),
      },
      handId: {
        default: 1,
        parseHTML: element => parseInt(element.getAttribute('handId') || '1'),
        renderHTML: attributes => {
          const attrs: Record<string, any> = { handId: attributes.handId };
          if (attributes.handId > 0) {
              attrs.class = `hand-${attributes.handId}`;
          }
          return attrs;
        },
      },
      editorialNote: {
        default: '',
        parseHTML: element => element.getAttribute('editorialNote'),
        renderHTML: attributes => ({ editorialNote: attributes.editorialNote }),
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'b.sic',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return ['b', mergeAttributes(HTMLAttributes, { class: 'sic' }), 0];
  },
});

export interface TranscriptionEditorOptions {
    handIdLimit?: number;
}

export interface TranscriptionEditorProps {
  content?: JSONContent;
  onChange?: (content: JSONContent) => void;
  options?: TranscriptionEditorOptions;
}

/**
 * TranscriptionEditor component using TipTap.
 * 
 * Implements: Bold, Italic, Rubric, Abbreviation, and Sic.
 */

export default function TranscriptionEditor({
  content,
  onChange,
  options = {},
}: TranscriptionEditorProps) {
  const handIdLimit = options.handIdLimit ?? HandIdLimit;

  const [dialogConfig, setDialogConfig] = React.useState<{
    show: boolean;
    type: 'abbreviation' | 'sic';
    initialData?: TranscriptionMarkData;
  }>({
    show: false,
    type: 'abbreviation',
  });

  // This forces a re-render. The state is unused, but triggers a re-render by increasing
  // the value every time forceUpdate (the reducer's dispatch function) is called.
  const [, forceUpdate] = React.useReducer(x => x + 1, 0);

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
      Sic,
    ],
    content,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getJSON());
      }
    },
    onSelectionUpdate: () => {
      forceUpdate();
    },
  });

  if (!editor) {
    return null;
  }

  /**
   * Opens the abbreviation dialog.
   */
  const addAbbreviation = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert('Please select some text first.');
      return;
    }
    
    const attrs = editor.getAttributes('abbreviation');
    setDialogConfig({
      show: true,
      type: 'abbreviation',
      initialData: {
        value: attrs.expansion || '',
        handId: attrs.handId || 1,
        editorialNote: attrs.editorialNote || '',
      },
    });
  };

  /**
   * Opens the sic dialog.
   */
  const addSic = () => {
    const { from, to } = editor.state.selection;
    if (from === to) {
      alert('Please select some text first.');
      return;
    }
    
    const attrs = editor.getAttributes('sic');
    setDialogConfig({
      show: true,
      type: 'sic',
      initialData: {
        value: attrs.correction || '',
        handId: attrs.handId || 1,
        editorialNote: attrs.editorialNote || '',
      },
    });
  };

  /**
   * Applies mark parameters from the dialog.
   */
  const handleDialogSubmit = (data: TranscriptionMarkData) => {
    const markAttrs: Record<string, any> = {
      handId: data.handId,
      editorialNote: data.editorialNote,
    };
    if (dialogConfig.type === 'abbreviation') {
      markAttrs.expansion = data.value;
    } else {
      markAttrs.correction = data.value;
    }
    editor.chain().focus().setMark(dialogConfig.type, markAttrs).run();
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
        <button
          onClick={addSic}
          className={editor.isActive('sic') ? 'is-active' : ''}
          type="button"
          title="Sic"
        >
          Sic
        </button>
        <button
          onClick={() => editor.chain().focus().unsetAllMarks().run()}
          type="button"
          title="Clear formatting"
        >
          Clear
        </button>
      </div>
      <EditorContent editor={editor} className="editor-content-wrapper" />
      <TranscriptionMarkDialog
        show={dialogConfig.show}
        onHide={() => setDialogConfig({ ...dialogConfig, show: false })}
        onSubmit={handleDialogSubmit}
        initialData={dialogConfig.initialData}
        handIdLimit={handIdLimit}
        title={dialogConfig.type === 'abbreviation' ? 'Abbreviation Parameters' : 'Sic Parameters'}
        label={dialogConfig.type === 'abbreviation' ? 'Expansion' : 'Correction'}
        placeholder={dialogConfig.type === 'abbreviation' ? 'Enter expansion' : 'Enter correction'}
      />
    </div>
  );
}


