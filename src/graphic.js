import { TeiBlock } from "./block.js";

export const TeiGraphic = TeiBlock.extend({
    name: 'graphic',
    content: '',

    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('img');
            dom.src = node.attrs.url;
            dom.addEventListener('click', () => {
                this.editor.options.element.dispatchEvent(new CustomEvent('empty-element-clicked', { detail: { node } }));
            });
            return {
                dom
            }
        }
    }
});