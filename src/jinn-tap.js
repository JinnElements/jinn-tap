import { Editor } from '@tiptap/core';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';
import { FootnoteRules } from './footnote.js';
import { AttributePanel } from './attribute-panel.js';
import { NavigationPanel } from './navigator.js';
import { Toolbar } from './toolbar.js';
import { colorCssFromSchema } from './colors.js';
import { fromXml } from './util.js';
import schema from './schema.json';

// Create a style element for the component's styles
const style = document.createElement('style');
style.textContent = `
    jinn-tap {
        display: grid;
        grid-template-rows: min-content 1fr;
        grid-template-columns: 1fr minmax(30vw, 460px);
        grid-template-areas:
            "toolbar aside"
            "editor aside";
        column-gap: 1rem;
        height: 100%;
    }

    jinn-tap nav {
        grid-area: toolbar;
        position: sticky;
        top: 0;
        z-index: 100;
        background-color: white;
    }

    jinn-tap .editor-area {
        min-height: 1rem;
    }
        
    jinn-tap .aside {
        grid-area: aside;
        background: white;
        padding: 20px;
        max-height: fit-content;
        position: sticky;
        top: 0;
        z-index: 10;
    }

    jinn-tap .ProseMirror {
        outline: none;
        height: 100%;
    }

    jinn-tap .ProseMirror p {
        margin: 0;
    }

    ${colorCssFromSchema(schema)}
`;

// Add the style element to the document
// Only add styles once
if (!document.querySelector('#jinn-tap-styles')) {
    style.id = 'jinn-tap-styles';
    document.head.appendChild(style);
}

/**
 * JinnTap - A TEI XML Editor Web Component
 * 
 * A custom element that provides a rich text editor specialized for TEI XML editing.
 * It includes a toolbar for text formatting and element insertion, and an attribute panel
 * for editing element attributes.
 * 
 * @element jinn-tap
 * 
 * @attr {string} content - Initial TEI XML content for the editor. If not provided,
 *                         a default template with a basic TEI structure will be used.
 * 
 * @fires {CustomEvent} content-change - Fired when the editor content changes.
 *                                      The event detail contains:
 *                                      {string} teiXml - The current editor content as TEI XML
 * @fires {CustomEvent} ready - Fired when the component and the editor are ready.
 */
export class JinnTap extends HTMLElement {
    static get observedAttributes() {
        return ['debug', 'url'];
    }

    constructor() {
        super();
        this.editor = null;
        this.toolbar = null;
        this.attributePanel = null;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'debug') {
            if (newValue !== null) {
                this.classList.add('debug');
            } else {
                this.classList.remove('debug');
            }
        } else if (name === 'url' && newValue) {
            this.loadFromUrl(newValue);
        }
    }

    async loadFromUrl(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const content = await response.text();
            const html = fromXml(content);            
            if (this.editor) {
                this.content = html;
            } else {
                // Store the content to be used when editor is initialized
                this._pendingContent = html;
            }
        } catch (error) {
            console.error('Error loading content from URL:', error);
            this.dispatchEvent(new CustomEvent('error', {
                detail: { error: error.message }
            }));
        }
    }

    connectedCallback() {
        this.setupEditor();
    }

    setupEditor() {
        const toolbarSlot = this.querySelector('[slot="toolbar"]');
        // Create a temporary container to parse the content
        const temp = document.createElement('div');
        temp.innerHTML = this.innerHTML;
        // Remove the toolbar slot element
        const slotElement = temp.querySelector('[slot="toolbar"]');
        if (slotElement) {
            slotElement.remove();
        }
        const initialContent = temp.innerHTML.trim();

        // Create the editor container structure
        this.innerHTML = `
            <nav>
                <ul class="toolbar"></ul>
            </nav>
            <div class="editor-area"></div>
            <div class="aside">
                <nav class="navigation-panel" aria-label="breadcrumb"></nav>
                <form class="attribute-panel" action="" method="post"></form>
            </div>
        `;

        // Initialize the editor
        const extensions = createFromSchema(schema);
        this.editor = new Editor({
            element: this.querySelector('.editor-area'),
            extensions: [
                ...extensions,
                FootnoteRules,
                History,
                Placeholder.configure({
                    placeholder: 'Write something...',
                    includeChildren: true,
                })
            ],
            content: this._pendingContent || initialContent || `
                <tei-div>
                    <tei-p></tei-p>
                </tei-div>
            `,
            autofocus: true,
            onCreate: () => {
                this.dispatchContentChange();
                this.dispatchEvent(new CustomEvent('ready'));
            },
            onUpdate: () => this.dispatchContentChange()
        });

        // Initialize toolbar
        this.toolbar = new Toolbar(this, schema, toolbarSlot);

        // Initialize attribute panel
        this.attributePanel = new AttributePanel(this, schema);

        // Initialize navigation panel
        this.navigationPanel = new NavigationPanel(this, this.attributePanel);

        // Check if URL attribute is present
        const url = this.getAttribute('url');
        if (url) {
            this.loadFromUrl(url);
        }
    }

    dispatchContentChange() {
        this.dispatchEvent(new CustomEvent('content-change', {
            detail: {
                content: this.editor.getText(),
                xml: serializeToTEI(this.editor)
            }
        }));
    }

    // Getter for the editor's content
    get content() {
        return this.editor.getText();
    }

    // Setter for the editor's content
    set content(value) {
        this.editor.chain().focus().setContent(value).setTextSelection(0).run();
        this.dispatchContentChange();
    }

    // Getter for the TEI XML content
    get xml() {
        return serializeToTEI(this.editor);
    }

    // Method to focus the editor
    focus() {
        this.editor.commands.focus();
    }

    // Method to get the editor instance
    get tiptap() {
        return this.editor;
    }
}

customElements.define('jinn-tap', JinnTap); 