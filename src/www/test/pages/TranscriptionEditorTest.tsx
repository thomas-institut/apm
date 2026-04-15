import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import TranscriptionEditor from "@/ReactAPM/Components/TranscriptionEditor";

const TranscriptionEditorTest = () => {
  const [content, setContent] = useState('<p>Hello, this is a <strong>bold</strong> and <em>italic</em> text.</p><p>Here is some <b class="rubric">rubric text</b> and an <b class="abbr" alttext="expansion" handid="1">abbreviation</b>.</p>');

  const handleChange = (newContent: string) => {
    setContent(newContent);
    console.log('Editor content changed:', newContent);
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
        <h3>Raw HTML Output</h3>
        <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '12px' }}>
          {content}
        </pre>
      </div>

      <div style={{ marginTop: '20px' }}>
        <h3>Preview (dangerouslySetInnerHTML)</h3>
        <div 
          style={{ border: '1px solid #ddd', padding: '10px' }}
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      </div>
    </div>
  );
};

const rootElement = document.getElementById('app');
if (rootElement) {
  const root = createRoot(rootElement);
  root.render(<TranscriptionEditorTest />);
}
