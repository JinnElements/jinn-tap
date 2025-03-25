import { Editor, Extension } from '@tiptap/core';
import Document from '@tiptap/extension-document';
import History from '@tiptap/extension-history';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';
import { AttributePanel } from './attribute-panel.js';
import { Toolbar } from './toolbar.js';
import schema from './schema.json';

document.addEventListener('DOMContentLoaded', () => {

    let editor;

    // Custom document extension that requires tei-div
    const TeiDocument = Document.extend({
        content: 'div+'
    });

    const extensions = createFromSchema(schema);

    // Initialize the editor
    editor = new Editor({
        element: document.querySelector('#editor'),
        extensions: [
            TeiDocument,
            Text,
            ...extensions,
            History,
            Placeholder.configure({
                placeholder: 'Insert text here',
            })
        ],
        content: `
    <tei-div>
      <tei-p>This is a TEI paragraph.</tei-p>
    </tei-div>
  `,
        autofocus: true,
    });

    // Initialize toolbar
    const toolbar = new Toolbar(editor, schema);

    // Initialize attribute panel
    const attributePanel = new AttributePanel(editor, schema);

    // Add copy functionality
    const copyButton = document.querySelector('#copyButton');
    const output = document.querySelector('#output');

    copyButton.addEventListener('click', () => {
        const teiXml = serializeToTEI(editor);
        output.textContent = teiXml;
    });
});