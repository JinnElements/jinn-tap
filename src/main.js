import { Editor } from '@tiptap/core';
import History from '@tiptap/extension-history';
// import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';
import { AttributePanel } from './attribute-panel.js';
import { Toolbar } from './toolbar.js';
import schema from './schema.json';

document.addEventListener('DOMContentLoaded', () => {

    let editor;

    const extensions = createFromSchema(schema);

    // Initialize the editor
    editor = new Editor({
        element: document.querySelector('#editor'),
        extensions: [
            // Placeholder.configure({
            //     placeholder: 'Insert text here',
            //     includeChildren: true
            // }),
            ...extensions,
            History
        ],
        content: `
    <tei-div>
      <tei-p>This is a TEI paragraph.</tei-p>
    </tei-div>
  `,
        autofocus: true,
    });

    // Initialize toolbar
    new Toolbar(editor, schema);

    // Initialize attribute panel
    new AttributePanel(editor, schema);

    // Add copy functionality
    const copyButton = document.querySelector('#copyButton');
    const output = document.querySelector('#output');

    copyButton.addEventListener('click', () => {
        const teiXml = serializeToTEI(editor);
        output.textContent = teiXml;
    });
});