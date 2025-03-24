import { Editor, Extension, Node, Mark, mergeAttributes } from '@tiptap/core'
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';
import { TeiPageBreak } from './pb.js';

const schemaDef = {
    hi: {
        type: 'inline',
        attributes: {
            rend: {
                type: 'string',
                default: 'i',
                enum: ['i', 'b', 'u']
            }
        },
        keyboard: {
            'Cmd-b': { rend: 'b' },
            'Cmd-i': { rend: 'i' },
            'Cmd-u': { rend: 'u' }
        }
    },
    title: {
        type: 'inline',
        attributes: {
            level: {
                type: 'string',
                enum: ['m', 's', 'a']
            }
        },
        keyboard: {
            'Mod-Alt-t': { level: 'm' }
        }
    },
    persName: {
        type: 'inline',
        keyboard: {
            'Mod-Shift-p': {}
        }
    },
    p: {
        type: 'block',
        priority: 100
    },
    head: {
        type: 'block',
        attributes: {
            type: {
                type: 'string'
            },
            n: {
                type: 'string'
            }
        },
        keyboard: {
            'Shift-Mod-1': {}
        }
    },
    div: {
        type: 'block',
        defining: true,
        content: 'block+'
    }
};

let editor;

// Custom document extension that requires tei-div
const TeiDocument = Document.extend({
  content: 'div+'
});

// Custom TEI extension
const TEIExtension = Extension.create({
  name: 'tei',
  addStorage() {
    return {
      serializeToTEI: () => serializeToTEI(editor)
    };
  }
});

const extensions = createFromSchema(schemaDef);

// Initialize the editor
editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    TeiDocument,
    Text,
    ...extensions,
    TeiPageBreak,
    TEIExtension,
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

// Dialog handling
const dialog = document.getElementById('pageBreakDialog');
const dialogOverlay = document.getElementById('dialogOverlay');
const pageNumberInput = document.getElementById('pageNumber');
const pageBreakButton = document.getElementById('pageBreakButton');
const confirmPageBreakButton = document.getElementById('confirmPageBreak');
const cancelPageBreakButton = document.getElementById('cancelPageBreak');

function showDialog() {
  dialog.style.display = 'block';
  dialogOverlay.style.display = 'block';
  pageNumberInput.value = '';
  pageNumberInput.focus();
}

function hideDialog() {
  dialog.style.display = 'none';
  dialogOverlay.style.display = 'none';
}

function insertPageBreak() {
  const pageNumber = pageNumberInput.value.trim();
  editor.chain().focus().insertContent({
    type: 'teiPb',
    attrs: { n: pageNumber || null }
  }).run();
  hideDialog();
}

// Event listeners for dialogs
pageBreakButton.addEventListener('click', showDialog);
cancelPageBreakButton.addEventListener('click', hideDialog);
confirmPageBreakButton.addEventListener('click', insertPageBreak);
dialogOverlay.addEventListener('click', hideDialog);

// Handle Enter key in dialogs
pageNumberInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    insertPageBreak();
  }
});

// Add copy functionality
const copyButton = document.querySelector('#copyButton');
const output = document.querySelector('#output');

copyButton.addEventListener('click', () => {
  const teiXml = editor.storage.tei.serializeToTEI();
  output.textContent = teiXml;
});