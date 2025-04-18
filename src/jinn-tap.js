import { Editor } from '@tiptap/core';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import { serializeToTEI } from './serialize.js';
import { createFromSchema } from './extensions.js';
import { FootnoteRules } from './footnote.js';
import { InputRules } from './input-rules.js';
import { JinnTapCommands } from './commands.js';
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

    jinn-tap > nav {
        grid-area: toolbar;
        position: sticky;
        top: 0;
        z-index: 100;
        background-color: white;
    }

    jinn-tap .editor-area {
        grid-area: editor;
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

    jinn-tap .attribute-panel > div {
        overflow-y: auto;
    }

    jinn-tap pb-authority-lookup {
        overflow-y: auto;
        height: 20rem;
    }
    
    jinn-tap .occurrences {
        margin-top: 1rem;
        overflow-y: auto;
    }

    jinn-tap .occurrences [role="group"] {
        float: right;
        width: fit-content;
    }
    
    jinn-tap .occurrences ul {
        height: 20rem;
        overflow-y: auto;
        margin: 0;
        padding: 0;
    }

    jinn-tap .occurrences li {
        list-style: none;
    }

    jinn-tap .toolbar .disabled {
        opacity: 0.5;
        cursor: not-allowed;
        pointer-events: none;
    }
    
    jinn-tap .ProseMirror {
        outline: none;
        height: 100%;
    }

    jinn-tap .ProseMirror p {
        margin: 0;
    }

    .jinn-tap.overlay {
        border: 5px dashed #EE402E;
        border-radius: 5px;
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
 * @attr {string} url - URL to load the initial content from. The content will be fetched
 *                      and loaded into the editor when this attribute is set.
 * @attr {string} schema - URL to load the TEI schema from. The schema will be fetched
 *                         and used to configure the editor's capabilities. If not provided,
 *                         a default schema will be used.
 * @attr {boolean} debug - When present, enables debug mode which adds a debug class
 *                         to the component for styling purposes.
 * 
 * @property {string} content - The current text content of the editor. Can be set to update
 *                             the editor's content programmatically.
 * @property {string} xml - The current TEI XML content of the editor.
 * 
 * @slot toolbar - Content to be placed in the toolbar area at the top of the editor.
 *                This slot is intended for custom toolbar buttons or controls.
 * @slot aside - Content to be placed in the sidebar area on the right side of the editor.
 *              This slot is intended for additional panels or controls.
 * 
 * @fires {CustomEvent} content-change - Fired when the editor content changes.
 *                                      The event detail contains:
 *                                      {string} content - The current text content
 *                                      {string} xml - The current TEI XML content
 * @fires {CustomEvent} ready - Fired when the component and the editor are ready.
 * @fires {CustomEvent} error - Fired when an error occurs, such as failing to load
 *                             content or schema from a URL. The event detail contains:
 *                             {string} error - The error message
 */
export class JinnTap extends HTMLElement {
    static get observedAttributes() {
        return ['debug', 'url', 'schema'];
    }

    constructor() {
        super();
        this.editor = null;
        this.toolbar = null;
        this.attributePanel = null;
        this._schema = schema; // Default schema
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
        } else if (name === 'schema' && newValue) {
            this.loadSchema(newValue);
        }
    }

    async loadSchema(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            this._schema = await response.json();
            
            // If editor is already initialized, recreate it with new schema
            if (this.editor) {
                this.setupEditor();
            }
        } catch (error) {
            console.error('Error loading schema from URL:', error);
            this.dispatchEvent(new CustomEvent('error', {
                detail: { error: error.message }
            }));
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
        // Create a temporary container to parse the content
        const temp = document.createElement('div');
        temp.innerHTML = this.innerHTML;

        // Create the editor container structure
        this.innerHTML = `
            <nav>
                <ul class="toolbar">
                    <slot name="toolbar"></slot>
                </ul>
            </nav>
            <div class="editor-area"></div>
            <div class="aside">
                <slot name="aside"></slot>
                <nav class="navigation-panel" aria-label="breadcrumb"></nav>
                <div class="attribute-panel"></div>
            </div>
        `;

        // Fill in the slots and clean up the current content
        this.applySlots(temp);
        const initialContent = temp.innerHTML.trim();

        // Initialize the editor
        const extensions = createFromSchema(this._schema);
        this.editor = new Editor({
            element: this.querySelector('.editor-area'),
            extensions: [
                ...extensions,
                InputRules,
                JinnTapCommands,
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
        
        // Initialize attribute panel
        this.attributePanel = new AttributePanel(this, this._schema);
        
        // Initialize navigation panel
        this.navigationPanel = new NavigationPanel(this, this.attributePanel);
        
        // Initialize toolbar
        this.toolbar = new Toolbar(this, this._schema);

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

    applySlots(content) {
        const slotElements = this.querySelectorAll('slot');
        for (const slotElement of slotElements) {
            const name = slotElement.name;
            const slotContents = content.querySelectorAll(`[slot="${name}"]`);
            if (slotContents.length > 0) {
                const parent = slotElement.parentNode;
                slotContents.forEach(slotContent => {
                    // Create temporary node to parse the outerHTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = slotContent.outerHTML;
                    const children = Array.from(tempDiv.children);
                    children.forEach(child => parent.insertBefore(child, slotElement));
                    slotContent.remove();
                });
            }
        }
        // Remove all slot elements after processing
        slotElements.forEach(slot => slot.remove());
        return content;
    }
}

customElements.define('jinn-tap', JinnTap); 