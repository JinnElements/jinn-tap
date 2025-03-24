import { Editor, Extension, Node, Mark, mergeAttributes } from '@tiptap/core'
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';

const schemaDef = {
    hi: {
        type: 'inline',
        attributes: {
            rend: 'rend',
            type: 'type',
            n: 'n'
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
            level: 'level',
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
        keyboard: {
            'Shift-Mod-1': { type: 'main' }
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

// Custom page break node
const TeiPageBreak = Node.create({
  name: 'teiPb',
  group: 'inline',
  inline: true,
  selectable: false,
  draggable: false,

  addAttributes() {
    return {
      n: {
        default: null,
        parseHTML: element => element.getAttribute('n'),
        renderHTML: attributes => {
          if (!attributes.n) {
            return {}
          }
          return {
            'data-n': attributes.n,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'pb',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['pb', HTMLAttributes]
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('div')
      dom.classList.add('page-break')
      dom.innerHTML = `——— Page ${node.attrs.n || ''} ———`
      if (node.attrs.n) {
        dom.setAttribute('data-n', node.attrs.n)
      }
      return {
        dom,
        update: (updatedNode) => {
          if (updatedNode.type !== node.type) {
            return false
          }
          if (updatedNode.attrs.n !== node.attrs.n) {
            dom.setAttribute('data-n', updatedNode.attrs.n)
          }
          return true
        },
      }
    }
  },
})

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