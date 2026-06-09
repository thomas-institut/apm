import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { JSONContent } from '@tiptap/react';
import TranscriptionEditor from "@/ReactAPM/Components/TranscriptionEditor/TranscriptionEditor";
import 'bootstrap/dist/css/bootstrap.min.css';

const initialContent: JSONContent = {
  type: 'doc',
  content: [
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Hello, this is a ' },
        { type: 'text', text: 'bold', marks: [{ type: 'bold' }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'italic', marks: [{ type: 'italic' }] },
        { type: 'text', text: ' text.' },
      ],
    },
    {
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Here is some ' },
        { type: 'text', text: 'rubric text', marks: [{ type: 'rubric' }] },
        { type: 'text', text: ' and an ' },
        { type: 'text', text: 'abbreviation', marks: [{ type: 'abbreviation', attrs: { expansion: 'expansion', handId: 1 } }] },
        { type: 'text', text: ' and ' },
        { type: 'text', text: 'sic text', marks: [{ type: 'sic', attrs: { correction: 'correction', handId: 2 } }] },
        { type: 'text', text: '.' },
      ],
    },
  ],
};

const TranscriptionEditorTest = () => {
  const [content, setContent] = useState<JSONContent>(initialContent);

  const handleChange = (newContent: JSONContent) => {
    setContent(newContent);
  };

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Transcription Editor Test</h1>
      
      <div style={{ marginBottom: '20px' }}>
        <h3>Editor</h3>
        <TranscriptionEditor 
          content={content} 
          onChange={handleChange} 
          options={{ handIdLimit: 5 }}
        />
      </div>

      <div style={{ marginTop: '40px', border: '1px solid #ddd', padding: '10px', backgroundColor: '#f9f9f9' }}>
        <h3>JSON Output</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
          {JSON.stringify(content, null, 2)}
        </pre>
      </div>

    </div>
  );
};

const rootElement = document.getElementById('app');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<TranscriptionEditorTest />);
}
