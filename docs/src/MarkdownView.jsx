import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function MarkdownView({ path }) {
  const [html, setHtml] = useState('Laden...');

  useEffect(() => {
    fetch('/' + path)
      .then(r => r.text())
      .then(text => setHtml(marked.parse(text)))
      .catch(e => setHtml('Fout bij laden document: ' + e.message));
  }, [path]);

  return (
    <div className="view-container">
      <div
        className="markdown-content"
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  );
}
