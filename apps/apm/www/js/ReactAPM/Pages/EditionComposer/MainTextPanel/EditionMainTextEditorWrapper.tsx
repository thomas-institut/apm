import {useEffect, useId, useRef} from 'react';
import {FmtText} from '@thomas-inst/fmt-text';
import {EditionMainTextEditor, EditionMainTextEditorFormatState} from '@/EditionComposer/EditionMainTextEditor';

interface EditionMainTextEditorWrapperProps {
  initialText: FmtText;
  lang: string;
  onChange: (text: FmtText) => void;
  onEditorReady: (editor: EditionMainTextEditor | null) => void;
  onFormatStateChange: (formatState: EditionMainTextEditorFormatState) => void;
}

export default function EditionMainTextEditorWrapper({initialText, lang, onChange, onEditorReady,
                                                       onFormatStateChange}: EditionMainTextEditorWrapperProps) {
  const generatedId = useId().replace(/:/g, '');
  const editorId = `edition-main-text-editor-${generatedId}`;
  const onChangeRef = useRef(onChange);
  const onEditorReadyRef = useRef(onEditorReady);
  const onFormatStateChangeRef = useRef(onFormatStateChange);
  const initialTextRef = useRef(initialText);
  onChangeRef.current = onChange;
  onEditorReadyRef.current = onEditorReady;
  onFormatStateChangeRef.current = onFormatStateChange;
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
      onChange: () => onChangeRef.current(editor.getFmtText()),
      onFormatStateChange: formatState => onFormatStateChangeRef.current(formatState)
    });
    editor.setText(initialTextRef.current, true);
    onEditorReadyRef.current(editor);

    return () => {
      onEditorReadyRef.current(null);
      host.replaceChildren();
    };
  }, [editorId, lang]);

  return <div id={editorId} className={`edition-main-text-editor text-${lang}`}/>;
}