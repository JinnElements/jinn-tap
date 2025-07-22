/**
 * Serializes the editor's content to XML
 * @param {Editor} editor - The Tiptap editor instance
 * @returns {string} The complete XML document
 */
export function serialize(editor, schemaDef) {
  const doc = editor.state.doc;
  const json = doc.toJSON();
  const serializer = new Serializer(editor, schemaDef);
  let content = [];

  // Serialize content
  json.content.forEach(node => {
    content.push(serializer.serialize(node));
  });

  return content.join('\n');
}

function compareMarks(mark1, mark2) {
  return mark1.type === mark2.type && 
    JSON.stringify(mark1.attrs) === JSON.stringify(mark2.attrs);
}

class Serializer {

  constructor(editor, schemaDef) {
    this.editor = editor;
    this.openMarks = [];
    this.schemaDef = schemaDef;
  }

  serialize(node, previous, next) {
    if (node.type === 'text') {
      // Note that these text nodes are not always directly valid in XML. For example, a text node like `I <3 the &
      // character` contains characters that can not be included directly.  Roundtrip through XMLSerializer to
      // circumvent this
      // @TODO: also clean up attribute contents. Or better: construct an XML DOM instead of a string
      const rawNodeText = node.text;
      const textNode = document.createTextNode(rawNodeText);
      const cleanNodeText = new XMLSerializer().serializeToString(textNode);
      let text = '';
      if (node.marks && node.marks.length > 0) {
        if (previous?.marks) {
          previous.marks.forEach(prevMark => {
            const isStillActive = node.marks.some(mark => compareMarks(mark, prevMark));
            if (!isStillActive) {
              const lastOpen = this.openMarks.pop();
              if (!compareMarks(lastOpen, prevMark)) {
                console.error('Serialization mismatch');
              }
              text += `</${prevMark.type}>`;
            }
          });
        }
        let openingMarks = [];
        node.marks.forEach(mark => {
          const isPreviouslyActive = previous?.marks?.some(prevMark => compareMarks(prevMark, mark));
          if (!isPreviouslyActive) {
            openingMarks.push(mark);
          }
        });
        openingMarks.sort((a, b) => {
          const aInNext = next?.marks?.some(mark => compareMarks(mark, a)) ? 1 : 0;
          const bInNext = next?.marks?.some(mark => compareMarks(mark, b)) ? 1 : 0;
          return bInNext - aInNext;
        });
        openingMarks.forEach(mark => {
          this.openMarks.push(mark);
          const nodeDef = this.schemaDef.schema[mark.type];
          const tagName = mark.type;
          const attrs = mark.attrs ? Object.entries(mark.attrs)
            .filter(([_, value]) => value !== null)
            .map(([key, value]) => `${key}="${value}"`) : [];
          if (nodeDef.preserveSpace) {
            attrs.push('xml:space="preserve"');
          };
          text += `<${tagName}${attrs.length > 0 ? ' ' + attrs.join(' ') : ''}>`;
        });
        text += cleanNodeText;
        if (!next) {
          this.openMarks.reverse().forEach(mark => {
            text += `</${mark.type}>`;
          });
          this.openMarks = [];
        }
      } else {
        this.openMarks.reverse().forEach(prevMark => {
          text += `</${prevMark.type}>`;
        });
        this.openMarks = [];
        text += cleanNodeText;
      }
      return text;
    }

    const tagName = node.type;
    const attrs = node.attrs ? Object.entries(node.attrs)
      .filter(([key, value]) => value !== null && !key.startsWith('_'))
      .map(([key, value]) => {
        if (key === 'id') {
          return `xml:id="${value}"`;
        }
        return `${key}="${value}"`;
      })
      .join(' ') : '';
  
    let content = '';
    if (node.content) {
      for (let i = 0; i < node.content.length; i++) {
        const child = node.content[i];
        const previous = i > 0 ? node.content[i - 1] : null;
        const next = i < node.content.length - 1 ? node.content[i + 1] : null;
        content += this.serialize(child, previous, next);
      }
    }
  
    // If content is empty, output as self-closing element
    if (!content) {
      return `${this.closeMarks(next)}<${tagName}${attrs ? ' ' + attrs : ''}/>`;
    }
  
    return `${this.closeMarks(next)}<${tagName}${attrs ? ' ' + attrs : ''}>${content}</${tagName}>`;
  }

  closeMarks(next) {
    let text = '';
    this.openMarks.forEach(openMark => {
      if (next?.isText && next.marks.some(mark => compareMarks(mark, openMark))) {
        return '';
      }
      const tagName = openMark.type;
      this.openMarks = this.openMarks.filter(mark => !compareMarks(mark, openMark));
      text += `</${tagName}>`;
    });
    return text;
  }
}