import { JinnBlock } from './block.js';

export const JinnGraphic = JinnBlock.extend({
    name: 'graphic',
    content: '',
    selectable: true,
    addNodeView() {
        return ({ node }) => {
            const dom = document.createElement('img');
            dom.src = node.attrs.url;
            dom.addEventListener('click', () => {
                const pos = this.editor.view.posAtDOM(dom);
                this.editor.options.element.dispatchEvent(
                    new CustomEvent('empty-element-clicked', { detail: { node, pos } }),
                );
            });
            return {
                dom,
            };
        };
    },
});
