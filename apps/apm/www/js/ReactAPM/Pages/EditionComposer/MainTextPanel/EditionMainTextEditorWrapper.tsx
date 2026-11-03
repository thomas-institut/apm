import {useEffect, useId, useRef} from 'react';
import {FmtText} from '@thomas-inst/fmt-text';
import {EditionMainTextEditor} from '@/EditionComposer/EditionMainTextEditor';

interface EditionMainTextEditorWrapperProps {
  initialText: FmtText;
  lang: string;
  onChange: (text: FmtText) => void;
}

export default function EditionMainTextEditorWrapper({initialText, lang, onChange}: EditionMainTextEditorWrapperProps) {
  const generatedId = useId().replace(/:/g, '');
  const editorId = `edition-main-text-editor-${generatedId}`;
  const onChangeRef = useRef(onChange);
  const initialTextRef = useRef(initialText);
  onChangeRef.current = onChange;
  initialTextRef.current = initialText;

  useEffect(() => {
    const host = document.getElementById(editorId);
    if (host === null) {
      return;
    }
    let editor: EditionMainTextEditor;
    editor = new EditionMainTextEditor({
      containerSelector: `#${editorId}`,
      lang,
      onChange: () => onChangeRef.current(editor.getFmtText())
    });
    editor.setText(initialTextRef.current, true);

    return () => host.replaceChildren();
  }, [editorId, lang]);

  return <div id={editorId} className={`edition-main-text-editor text-${lang}`}/>;
}