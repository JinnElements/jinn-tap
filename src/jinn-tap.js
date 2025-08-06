import { Editor } from '@tiptap/core';
import { UndoRedo, Placeholder } from '@tiptap/extensions';
import { Collaboration } from '@tiptap/extension-collaboration';
import * as Y from 'yjs';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import { HocuspocusProvider } from '@hocuspocus/provider';
import { serialize } from './util/serialize.js';
import { createFromSchema } from './extensions/extensions.js';
import { FootnoteRules } from './extensions/footnote.js';
import { InputRules } from './extensions/input-rules.js';
import { JinnTapCommands } from './extensions/commands.js';
import { AttributePanel } from './attribute-panel.js';
import { NavigationPanel } from './navigator.js';
import { Toolbar } from './toolbar.js';
import { generateRandomColor, colorCssFromSchema } from './util/colors.js';
import { importXml, exportXml, createDocument } from './util/xml.js';
import { generateUsername } from 'unique-username-generator';
import xmlFormat from 'xml-formatter';
import schema from './schema.json';
import './jinn-tap.css';
import { TableMenu } from './extensions/tables/TableMenu.js';

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
 * @attr {string} notes-wrapper - The wrapper element to use for notes. The default is 'listAnnotation'.
 * @attr {string} notes - Which of the two modes for editing notes should be used. Default is 'connected',
 * i.e. deleting an anchor will delete the associated note. The alternative, 'disconnected', allows notes to be
 * detached from their anchor.
 * @attr {string} server - The websocket server URL to use for collaboration.
 * @attr {string} token - JWT token to use for authentication with the collaboration server.
 * @attr {string} name - Unique name for the collaboration session.
 * @attr {string} user - The user name to use for collaboration.
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
        /**
         * @type {Editor}
         */
        this.editor = null;
        this.toolbar = null;
        this.attributePanel = null;
        this.notesWrapper = 'listAnnotation';
        this.collaboration = null;
        this.provider = null;
        this.notes = 'disconnected';
        this.metadata = {
            title: 'Untitled Document',
            name: 'untitled.xml',
        };
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
            this.dispatchEvent(
                new CustomEvent('error', {
                    detail: { error: error.message },
                }),
            );
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
                const parsed = importXml(xml);
                content = parsed.content;
                this.document = parsed.doc;
            } else if (contentType?.includes('text/html')) {
                content = await response.text();
            } else {
                throw new Error(`Unsupported content type: ${contentType}`);
            }

            if (setContent && this.editor) {
                this.content = content;
            }
            this.metadata = {
                name: url.split('/').pop(),
            };
            return content;
        } catch (error) {
            console.error('Error loading content from URL:', error);
            document.dispatchEvent(
                new CustomEvent('jinn-toast', {
                    detail: {
                        message: `Error loading content from URL: ${error.message}`,
                        type: 'error',
                    },
                }),
            );
        }
    }

    connectedCallback() {
        if (this.hasAttribute('notesWrapper')) {
            this.notesWrapper = this.getAttribute('notes-wrapper');
        }
        this.notes = this.getAttribute('notes') || 'disconnected';

        const collabServer = this.getAttribute('server') || null;
        if (collabServer) {
            const collabToken = this.getAttribute('token') || null;
            const collabName = this.getAttribute('name') || null;
            const collabUser = this.getAttribute('user') || localStorage.getItem('jinn-tap.username') || null;
            const collabColor = this.getAttribute('color') || localStorage.getItem('jinn-tap.color') || null;
            if (!(collabToken && collabName)) {
                console.error('collab-token is required when collab-server is provided');
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: {
                            message: 'collab-token is required when collab-server is provided',
                            type: 'error',
                        },
                    }),
                );
            } else {
                this.collaboration = {
                    url: collabServer,
                    token: collabToken,
                    user: collabUser || generateUsername('-', 2, 16),
                    name: collabName,
                    color: collabColor || generateRandomColor(),
                };
                // Store the username in localStorage if it's not already there
                if (!localStorage.getItem('jinn-tap.username')) {
                    localStorage.setItem('jinn-tap.username', this.collaboration.user);
                }
                if (!localStorage.getItem('jinn-tap.color')) {
                    localStorage.setItem('jinn-tap.color', this.collaboration.color);
                }
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
			<nav class="table-menu"><ul class="toolbar"/></nav>
            <pre class="code-area" style="display: none;"></pre>
            <div class="aside">
                <div class="user-info"></div>
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
            const { doc, content } = createDocument();
            initialContent = content;
            this.document = doc;
        }

        this._codeArea = this.querySelector('.code-area');
        this.addEventListener('content-change', (event) => {
            try {
                this._codeArea.textContent = xmlFormat(event.detail.xml, { collapseContent: true });
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
                onAuthenticated: this.onAuthenticated.bind(this),
                onSynced: () => {
                    if (!this.doc.getMap('config').get('initialContentLoaded') && this.editor) {
                        this.doc.getMap('config').set('initialContentLoaded', true);
                        this.editor.chain().setContent(initialContent).setTextSelection(0).focus().run();
                        this.dispatchContentChange();
                    }
                },
                onAuthenticationFailed: () => {
                    document.dispatchEvent(
                        new CustomEvent('jinn-toast', {
                            detail: {
                                message: 'Authentication failed. Please log in and reload the page.',
                                type: 'error',
                            },
                        }),
                    );
                },
                // onAwarenessChange: ({ states }) => {
                //     console.log('onAwarenessChange: %o', states);
                // }
            });
        }
        const editorConfig = {
            element: this.querySelector('.editor-area'),
            extensions: [
                ...extensions,
                InputRules,
                JinnTapCommands,
                FootnoteRules.configure({
                    notesWrapper: this.notesWrapper,
                    notesWithoutAnchor: this.notes !== 'connected',
                }),
                Placeholder.configure({
                    placeholder: 'Write something...',
                    includeChildren: true,
                }),
            ],
            autofocus: false,
            onCreate: () => {
                this.dispatchEvent(new CustomEvent('ready'));
            },
            onTransaction: ({ editor, transaction }) => {
                if (transaction.docChanged) {
                    this.dispatchContentChange();
                }
            },
            enableContentCheck: true,
            onContentError({ editor, error, disableCollaboration }) {
                const errorMessage = error.cause ? error.cause.message : error.message;
                let toastMessage;
                if (this.collaboration) {
                    toastMessage = `Content does not match schema. Switching to read-only mode. ${errorMessage}`;
                } else {
                    toastMessage = `Content does not match schema. Some markup may be lost on save. ${errorMessage}`;
                }
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: {
                            message: toastMessage,
                            type: 'error',
                            nohtml: true,
                            sticky: true,
                        },
                    }),
                );
                if (this.collaboration) {
                    disableCollaboration();
                    editor.setEditable(false, false);
                }
            },
        };
        if (!this.collaboration) {
            editorConfig.extensions.push(UndoRedo);
            editorConfig.content = initialContent;
        } else {
            editorConfig.extensions.push(
                Collaboration.configure({
                    provider: this.provider,
                    document: this.doc,
                }),
            );
            editorConfig.extensions.push(
                CollaborationCursor.configure({
                    provider: this.provider,
                    user: {
                        name: this.collaboration.user,
                        color: this.collaboration.color,
                    },
                }),
            );
        }

        this.tableMenu = new TableMenu(this);

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
        const body = serialize(this.editor, this._schema);
        this.dispatchEvent(
            new CustomEvent('content-change', {
                detail: {
                    body: body,
                    xml: exportXml(body, this.document, this.metadata),
                },
            }),
        );
    }

    // Getter for the editor's content, i.e. the fragment edited in the editor,
    // not the full XML content.
    get content() {
        return this.editor.getText();
    }

    // Setter for the editor's content, i.e. the fragment edited in the editor,
    // not the full XML content.
    set content(value) {
        this.editor.chain().focus().setContent(value).setTextSelection(0).run();
        this.dispatchContentChange();
    }

    // Getter for the full XML content
    get xml() {
        return exportXml(serialize(this.editor, this._schema), this.document, this.metadata);
    }

    // Setter for the full XML content
    set xml(value) {
        const { doc, content } = importXml(value);
        this.content = content;
        this.document = doc;
    }

    newDocument() {
        const { doc, content } = createDocument();
        this.document = doc;
        this.content = content;
        this.metadata = {
            name: 'untitled.xml',
        };
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
                slotContents.forEach((slotContent) => {
                    // Create temporary node to parse the outerHTML
                    const tempDiv = document.createElement('div');
                    tempDiv.innerHTML = slotContent.outerHTML;
                    const children = Array.from(tempDiv.children);
                    children.forEach((child) => parent.insertBefore(child, slotElement));
                    slotContent.remove();
                });
            }
        }
        // Remove all slot elements after processing
        slotElements.forEach((slot) => slot.remove());
        return content;
    }

    onAuthenticated() {
        const content = (close) => {
            const div = document.createElement('div');
            div.innerHTML = `
                <p>Choose a nickname below.</p>
                <fieldset role="group">
                    <input type="text" id="collab-user" placeholder="Nickname" value="${this.collaboration.user}">
                    <button>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-lg" viewBox="0 0 16 16">
                            <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z"/>
                        </svg>
                    </button>
                </fieldset>
            `;
            const button = div.querySelector('button');
            button.addEventListener('click', () => {
                const newUser = div.querySelector('#collab-user').value;
                this.collaboration.user = newUser;
                localStorage.setItem('jinn-tap-username', newUser);
                this.editor.commands.updateUser({
                    name: newUser,
                    color: generateRandomColor(),
                });
                this.updateUserInfo();
                close();
            });
            return div;
        };
        this.updateUserInfo();
        document.dispatchEvent(
            new CustomEvent('jinn-toast', {
                detail: {
                    message: content,
                    type: 'info',
                    sticky: true,
                },
            }),
        );
    }

    updateUserInfo() {
        this.querySelector('.user-info').textContent = `Connected as ${this.collaboration.user}`;
    }
}

customElements.define('jinn-tap', JinnTap);
