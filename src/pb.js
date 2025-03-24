import { Node } from '@tiptap/core'

// Custom page break node
export const TeiPageBreak = Node.create({
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
  }
}) 