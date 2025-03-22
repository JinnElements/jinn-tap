import { Editor, Extension, Node, Mark, mergeAttributes } from '@tiptap/core'
import Document from '@tiptap/extension-document';
import Text from '@tiptap/extension-text';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';

let editor;

// Custom division node
const TeiDivision = Node.create({
  name: 'tei-div',
  group: 'block',
  content: 'block+',
  defining: true,

  addOptions() {
    return {
      HTMLAttributes: {},
    }
  },

  parseHTML() {
    return [
      {
        tag: 'tei-div',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['tei-div', HTMLAttributes, 0];
  }
});

// Custom hi mark for highlighting
const TeiHi = Mark.create({
  name: 'tei-hi',
  inclusive: true,
  spanning: true,

  addAttributes() {
    return {
      rend: {
        default: null,
        parseHTML: element => element.getAttribute('rend'),
        renderHTML: attributes => {
          if (!attributes.rend) {
            return {}
          }
          return {
            'rend': attributes.rend,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'tei-hi'
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return ['tei-hi', HTMLAttributes]
  },

  addCommands() {
    return {
      setHighlight: attributes => ({ commands }) => {
        return commands.setMark(this.name, attributes)
      },
      toggleHighlight: attributes => ({ commands }) => {
        return commands.toggleMark(this.name, attributes)
      },
      unsetHighlight: () => ({ commands }) => {
        return commands.unsetMark(this.name)
      },
    }
  },

  addKeyboardShortcuts() {
    return {
      'Mod-b': () => {
        console.log('BOLD');
        return this.editor.commands.toggleHighlight({ rend: 'b' })
      },
      'Mod-i': () => this.editor.commands.toggleHighlight({ rend: 'i' })
    }
  }
})

// Custom page break node
const TeiPageBreak = Node.create({
  name: 'pageBreak',
  group: 'block',
  inline: false,
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

// Custom paragraph node for TEI
const TeiParagraph = Node.create({
  name: 'tei-p',
  group: 'block',
  content: 'inline*',

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
            'n': attributes.n,
          }
        },
      },
      rend: {
        default: null,
        parseHTML: element => element.getAttribute('rend'),
        renderHTML: attributes => {
          if (!attributes.rend) {
            return {}
          }
          return {
            'rend': attributes.rend,
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'tei-p',
      },
    ]
  },

  renderHTML({ HTMLAttributes, node }) {
    return ['tei-p', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
  },
});

const TeiHead = Node.create({
    name: 'tei-head',
    group: 'block',
    content: 'inline*',
  
    parseHTML() {
      return [
        {
          tag: 'tei-p',
        },
      ]
    },
  
    renderHTML({ HTMLAttributes, node }) {
      return ['tei-head', mergeAttributes(this.options.HTMLAttributes, HTMLAttributes), 0]
    },

    addCommands() {
      return {
        toggleHead: () => ({ commands }) => {
          return commands.toggleNode('tei-p', 'tei-head')
        },
      }
    },

    addKeyboardShortcuts() {
        return {
        'Shift-Mod-1': () => this.editor.commands.toggleHead(),
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

// Initialize the editor
editor = new Editor({
  element: document.querySelector('#editor'),
  extensions: [
    Document,
    Text,
    TeiParagraph,
    TeiDivision,
    TeiPageBreak,
    TeiHead,
    TeiHi,
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
    type: 'pageBreak',
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