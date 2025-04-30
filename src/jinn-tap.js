import { Editor } from '@tiptap/core';
import History from '@tiptap/extension-history';
import Placeholder from '@tiptap/extension-placeholder';
import { Collaboration } from '@tiptap/extension-collaboration';
import * as Y from 'yjs'
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from "@hocuspocus/provider";
import { serializeToTEI } from './util/serialize.js';
import { createFromSchema } from './extensions/extensions.js';
import { FootnoteRules } from './extensions/footnote.js';
import { InputRules } from './extensions/input-rules.js';
import { JinnTapCommands } from './extensions/commands.js';
import { AttributePanel } from './attribute-panel.js';
import { NavigationPanel } from './navigator.js';
import { Toolbar } from './toolbar.js';
import { generateRandomColor, colorCssFromSchema } from './util/colors.js';
import { fromXml } from './util/xml.js';
import { generateUsername } from "unique-username-generator";
import xmlFormat from 'xml-formatter';
import schema from './schema.json';
import './jinn-tap.css';

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
 * @attr {string} notes - The wrapper element to use for notes. The default is 'listAnnotation'.
 * @attr {string} collab-document - The name of the document to use for collaboration.
 * @attr {string} collab-user - The name of the user to use for collaboration.
 * @attr {string} collab-port - The port to use for collaboration if no collab-server is provided.
 * The server address will be computed from the current page's hostname.
 * @attr {string} collab-server - The websocket server to use for collaboration, including the port.
 * The collab-port attribute is ignored if collab-server is provided.
 * 
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
        this.notesWrapper = 'listAnnotation';
        this.collaboration = null;
        this.provider = null;
        this._schema = schema; // Default schema
        this._initialized = false;
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'debug') {
            if (newValue !== null) {
                this.classList.add('debug');
            } else {
                this.classList.remove('debug');
            }
        } else if (name === 'url' && newValue && this._initialized) {
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

    async loadFromUrl(url, setContent = true) {
        try {
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const contentType = response.headers.get('content-type');
            let content;
            
            if (contentType?.includes('application/xml') || contentType?.includes('text/xml')) {
                const xml = await response.text();
                content = fromXml(xml);
            } else if (contentType?.includes('text/html')) {
                content = await response.text();
            } else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }
            
            if (setContent && this.editor) {
                this.content = content;
            }
            return content;
        } catch (error) {
            console.error('Error loading content from URL:', error);
            document.dispatchEvent(new CustomEvent('jinn-toast', {
                detail: {
                    message: `Error loading content from URL: ${error.message}`,
                    type: 'error'
                }
            }));
        }
    }

    connectedCallback() {
        if (this.hasAttribute('notesWrapper')) {
            this.notesWrapper = this.getAttribute('notes');
        }

        const collabPort = this.getAttribute('port') || null;
        const collabServer = this.getAttribute('server') || null;
        const collabToken = this.getAttribute('token') || null;
        const collabName = this.getAttribute('name') || null;
        if (collabPort || collabServer) {
            if (!(collabToken && collabName)) {
                console.error('collab-token is required when collab-port or collab-server is provided');
                document.dispatchEvent(new CustomEvent('jinn-toast', {
                    detail: {
                        message: 'collab-token is required when collab-port or collab-server is provided',
                        type: 'error'
                    }
                }));
            } else {
                this.collaboration = {
                    token: collabToken,
                    user: this.getAttribute('user') || generateUsername("", 2),
                    name: collabName
                };
                let collabUrl = collabServer;
                if (!collabUrl) {
                    // Compute the collaboration URL from the current page's hostname
                    const hostname = window.location.hostname;
                    collabUrl = `ws://${hostname}:${collabPort}`;
                }
                this.collaboration.url = collabUrl;
            }
        }

        // Generate CSS for schema colors
        const colorCss = colorCssFromSchema(this._schema);
        let style = document.getElementById('jinn-tap-color-css');
        if (!style) {
            style = document.createElement('style');
            style.id = 'jinn-tap-color-css';
            style.textContent = colorCss;
            document.head.appendChild(style);
        } else {
            style.textContent = colorCss;
        }

        this.setupEditor();

        this._initialized = true;
    }

    async setupEditor() {
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
            <pre class="code-area" style="display: none;"></pre>
            <div class="aside">
                <slot name="aside"></slot>
                <nav class="navigation-panel" aria-label="breadcrumb"></nav>
                <div class="attribute-panel"></div>
            </div>
        `;

        // Fill in the slots and clean up the current content
        this.applySlots(temp);
        let initialContent = temp.innerHTML.trim();

        // Check if URL attribute is present
        const url = this.getAttribute('url');
        // load initial content from URL if present
        if (url) {
            initialContent = await this.loadFromUrl(url, false);
        }
        // if no initial content, create a default document
        if (!initialContent) {
            initialContent = `
                <tei-div>
                    <tei-p></tei-p>
                </tei-div>
            `;
        }

        this._codeArea = this.querySelector('.code-area');
        this.addEventListener('content-change', (event) => {
            try {
                this._codeArea.textContent = xmlFormat(`<body>${event.detail.xml}</body>`, { collapseContent: true });
            } catch (error) {
                this._codeArea.textContent = event.detail.xml;
            }
        });

        // Initialize the editor
        const extensions = createFromSchema(this._schema);

        if (this.collaboration) {
            // configure Y.js document and provider if collaboration is enabled
            this.doc = new Y.Doc();
            this.provider = new HocuspocusProvider({
                name: this.collaboration.name,
                token: this.collaboration.token,
                url: this.collaboration.url,
                document: this.doc,
                onAuthenticated: () => {
                    document.dispatchEvent(new CustomEvent('jinn-toast', {
                        detail: {
                            message: 'Connected to collaboration server',
                            type: 'info'
                        }
                    }));
                },
                onSynced: () => {
                    if (!this.doc.getMap('config').get('initialContentLoaded') && this.editor) {
                        this.doc.getMap('config').set('initialContentLoaded', true);
                        this.editor.chain().setContent(initialContent).setTextSelection(0).focus().run();
                        this.dispatchContentChange();
                    }
                },
                onAuthenticationFailed: () => {
                    document.dispatchEvent(new CustomEvent('jinn-toast', {
                        detail: {
                            message: 'Authentication failed. Please log in.',
                            type: 'error'
                        }
                    }));
                },
                // onAwarenessChange: ({ states }) => {
                //     console.log('onAwarenessChange: %o', states);
                // }
            });
        }
        const editorConfig ={
            element: this.querySelector('.editor-area'),
            extensions: [
                ...extensions,
                InputRules,
                JinnTapCommands,
                FootnoteRules.configure({
                    notesWrapper: this.notesWrapper,
                    notesWithoutAnchor: false
                }),
                Placeholder.configure({
                    placeholder: 'Write something...',
                    includeChildren: true,
                })
            ],
            autofocus: false,
            onCreate: () => {
                this.dispatchEvent(new CustomEvent('ready'));
            },
            onTransaction: ({editor, transaction}) => {
                if (transaction.docChanged) {
                    this.dispatchContentChange();
                }
            }
        };
        if (!this.collaboration) {
            editorConfig.extensions.push(History);
        } else {
            editorConfig.extensions.push(Collaboration.configure({
                provider: this.provider,
                document: this.doc
            }));
            editorConfig.extensions.push(CollaborationCursor.configure({
                provider: this.provider,
                user: {
                    name: this.collaboration.user,
                    color: generateRandomColor()
                }
            }));
        }
        this.editor = new Editor(editorConfig);
        
        // Initialize attribute panel
        this.attributePanel = new AttributePanel(this, this._schema);
        
        // Initialize navigation panel
        this.navigationPanel = new NavigationPanel(this, this.attributePanel);
        
        // Initialize toolbar
        this.toolbar = new Toolbar(this, this._schema);

        if (!this.collaboration) {
            this.content = initialContent;
        }
    }

    dispatchContentChange() {
        this.dispatchEvent(new CustomEvent('content-change', {
            detail: {
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