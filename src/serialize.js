/**
 * Serializes the editor's content to TEI XML format
 * @param {Editor} editor - The Tiptap editor instance
 * @returns {string} The complete TEI XML document
 */
export function serializeToTEI(editor) {
  const doc = editor.state.doc;
  const json = doc.toJSON();
  const serializer = new Serializer(editor);
  let teiContent = [];

  // Serialize content
  json.content.forEach(node => {
    teiContent.push(serializer.serialize(node));
  });

  return teiContent.join('\n');
}

function compareMarks(mark1, mark2) {
  return mark1.type === mark2.type && 
    JSON.stringify(mark1.attrs) === JSON.stringify(mark2.attrs);
}

class Serializer {

  constructor(editor) {
    this.editor = editor;
    this.openMarks = [];
  }

  serialize(node) {
    if (node.type === 'text') {
      let text = '';
      // Close any marks that are no longer active
      this.openMarks.forEach((openMark, index) => {
        let isStillActive = false;
        if (node.marks) {
          isStillActive = node.marks.find(mark => compareMarks(mark, openMark));
        }
        if (!isStillActive) {
          const tagName = openMark.type.replace('tei-', '');
          text += `</${tagName}>`;
          this.openMarks.splice(index, 1);
        }
      });
      text += node.text;
      // Handle marks on text nodes
      if (node.marks && node.marks.length > 0) {
        // Apply marks from innermost to outermost
        node.marks.forEach(mark => {
          let isOpen = this.openMarks.find(openMark => compareMarks(mark, openMark));
          if (!isOpen) {
            const tagName = mark.type;
            const attrs = mark.attrs ? Object.entries(mark.attrs)
              .filter(([_, value]) => value !== null)
              .map(([key, value]) => `${key}="${value}"`)
              .join(' ') : '';
            text = `<${tagName}${attrs ? ' ' + attrs : ''}>${text}`;
            this.openMarks.unshift(mark);
          }
        });
      }
      return text;
    }

    const tagName = node.type;
    const attrs = node.attrs ? Object.entries(node.attrs)
      .filter(([key, value]) => value !== null && !key.startsWith('_'))
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ') : '';
  
    const content = node.content
      ? node.content.map(child => this.serialize(child)).join('')
      : '';
  
    return `<${tagName}${attrs ? ' ' + attrs : ''}>${content}${this.closeMarks()}</${tagName}>`;
  }

  closeMarks() {
    let text = '';
    this.openMarks.forEach(openMark => {
      const tagName = openMark.type;
      text += `</${tagName}>`;
    });
    this.openMarks = [];
    return text;
  }
}