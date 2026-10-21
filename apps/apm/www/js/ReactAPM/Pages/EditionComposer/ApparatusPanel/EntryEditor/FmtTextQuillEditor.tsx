import {JSX, useEffect, useRef, useState} from "react";
import {Button} from "react-bootstrap";
import {TypeBold, TypeItalic} from "react-bootstrap-icons";
import 'quill/dist/quill.core.css';
import Quill from '@/QuillLoader';
import Small from '@/EditionComposer/QuillBlots/Small';
import Superscript from '@/EditionComposer/QuillBlots/Superscript';
import Sigla from '@/EditionComposer/QuillBlots/Sigla';
import {QuillDeltaRenderer} from '@/EditionComposer/QuillDelta/QuillDeltaRenderer';
import {CustomApparatusQuillDeltaConverter} from '@/EditionComposer/QuillDelta/CustomApparatusQuillDeltaConverter';
import {toolbarCharactersDefinition} from '@/EditionComposer/ToolbarCharactersDefinition';
import {CompactFmtText, FmtText, fromCompactFmtText, getPlainText} from '@thomas-inst/fmt-text';
import {isRtl, removeWhiteSpace} from '@/toolbox/Util';
import './FmtTextQuillEditor.css';

Quill.register({
  'formats/small': Small, 'formats/superscript': Superscript, 'formats/sigla': Sigla
}, true);

type SimpleFormat = 'bold' | 'italic' | 'small' | 'superscript';

const formatButtons: { format: SimpleFormat, title: string, content: JSX.Element }[] = [
  {format: 'bold', title: 'Bold', content: <TypeBold/>},
  {format: 'italic', title: 'Italic', content: <TypeItalic/>},
  {format: 'small', title: 'Small Font', content: <small className="fte-icon">S</small>},
  {format: 'superscript', title: 'Superscript', content: <small className="fte-icon">x<sup>2</sup></small>},
];

interface FmtTextQuillEditorProps {
  lang: string;
  /** The text to load when the editor is created. Later changes to this prop are ignored. */
  initialText: CompactFmtText;
  onChange: (fmtText: FmtText) => void;
}

/**
 * A React wrapper around a Quill editor for one-line formatted text.
 *
 * The editor is created once, when the component is mounted. To load a different
 * text, remount the component using a different key.
 */
export default function FmtTextQuillEditor({lang, initialText, onChange}: FmtTextQuillEditorProps) {
  const editorElementRef = useRef<HTMLDivElement>(null);
  const quillRef = useRef<Quill | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const [activeFormats, setActiveFormats] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const element = editorElementRef.current;
    if (element === null) {
      return;
    }
    element.innerHTML = '';
    const quill = new Quill(element, {});
    quillRef.current = quill;
    const deltaRenderer = new QuillDeltaRenderer({
      classToAttrTranslators: {
        sigla: (attr: any) => {
          attr.sigla = true;
          return attr;
        }
      }
    });
    quill.setContents(deltaRenderer.render(fromCompactFmtText(initialText)), 'silent');

    const updateActiveFormats = () => {
      const format = quill.getFormat();
      setActiveFormats({
        bold: !!format['bold'],
        italic: !!format['italic'],
        small: !!format['small'],
        superscript: !!format['superscript'],
      });
    };
    quill.on('text-change', () => {
      let fmtText = CustomApparatusQuillDeltaConverter.toFmtText(quill.getContents());
      if (removeWhiteSpace(getPlainText(fmtText)) === '') {
        fmtText = [];
      }
      onChangeRef.current(fmtText);
      updateActiveFormats();
    });
    quill.on('selection-change', (range: any) => {
      if (range !== null) {
        updateActiveFormats();
      }
    });

    return () => {
      quillRef.current = null;
      element.innerHTML = '';
    };
    // The editor is created once; see the component documentation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFormat = (format: SimpleFormat) => {
    const quill = quillRef.current;
    if (quill === null) {
      return;
    }
    const currentState = !!quill.getFormat()[format];
    quill.format(format, !currentState);
    setActiveFormats((previous) => ({...previous, [format]: !currentState}));
  };

  const insertCharacter = (character: string) => {
    const quill = quillRef.current;
    const range = quill?.getSelection();
    if (!quill || !range) {
      return;
    }
    quill.deleteText(range.index, range.length);
    quill.insertText(range.index, character);
  };

  const characters = toolbarCharactersDefinition[lang] ?? {};

  return <div className={`fmt-text-quill-editor text-${lang}`}>
    <div className="fte-toolbar">
      {formatButtons.map(({format, title, content}) =>
        <Button key={format} type="button" title={title}
                className={`${format}-btn${activeFormats[format] ? ' on' : ''}`}
                onMouseDown={(ev) => ev.preventDefault()}
                onClick={() => toggleFormat(format)}>{content}</Button>)}
      <span className="mte-tb-sep">&nbsp;</span>
      {Object.keys(characters).map((key) => {
        const definition = characters[key];
        const character = isRtl(lang) && definition.rtlVersion !== undefined ? definition.rtlVersion : definition.character;
        return <Button key={key} type="button" title={definition.title} className={`${key}-btn`}
                       onMouseDown={(ev) => ev.preventDefault()}
                       onClick={() => insertCharacter(definition.character)}>{character}</Button>;
      })}
    </div>
    <div ref={editorElementRef} className={`fte-editor text-${lang}`}></div>
  </div>;
}
