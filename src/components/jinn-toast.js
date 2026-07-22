/**
 * Show a sticky toast with confirm/cancel actions.
 *
 * @param {string|Node|((close: () => void) => Node)} message
 * @param {object} [options]
 * @param {string} [options.confirmLabel='OK']
 * @param {string} [options.cancelLabel='Cancel']
 * @param {string} [options.type='info']
 * @param {boolean} [options.nohtml=false]
 * @returns {Promise<boolean>} Resolves to `true` on confirm, `false` on cancel/close
 */
export function jinnToastConfirm(message, options = {}) {
    const { confirmLabel = 'OK', cancelLabel = 'Cancel', type = 'info', nohtml = false } = options;

    return new Promise((resolve) => {
        document.dispatchEvent(
            new CustomEvent('jinn-toast', {
                detail: {
                    message,
                    type,
                    nohtml,
                    sticky: true,
                    confirm: {
                        confirmLabel,
                        cancelLabel,
                        onConfirm: () => resolve(true),
                        onCancel: () => resolve(false),
                    },
                },
            }),
        );
    });
}

export class JinnToast extends HTMLElement {
    constructor() {
        super();
        this.duration = 3000; // Default duration in milliseconds
        this.stickyDuration = 30000; // Default sticky duration in milliseconds
    }

    static get observedAttributes() {
        return ['duration'];
    }

    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'duration') {
            this.duration = parseInt(newValue) || 3000;
        }
    }

    connectedCallback() {
        this.render();
        this.setupEventListeners();
    }

    render() {
        this.innerHTML = `
            <style>
                jinn-toast .jinn-toast-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                    z-index: var(--jinn-toast-z-index, 1000);
                }

                jinn-toast .jinn-toast {
                    padding: 12px 24px;
                    margin: 8px 0;
                    border-radius: 4px;
                    color: var(--jinn-toast-color, #F0F0F0);
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s, transform 0.3s;
                    max-width: var(--jinn-toast-max-width, 30vw);
                    word-wrap: break-word;
                    pointer-events: none;
                    position: relative;
                }

                jinn-toast .jinn-toast p {
                    color: var(--jinn-toast-color, #F0F0F0);
                }

                jinn-toast .jinn-toast input {
                    width: min-content;
                }

                jinn-toast .jinn-toast.sticky,
                jinn-toast .jinn-toast.confirm {
                    pointer-events: auto;
                }

                jinn-toast .jinn-toast.confirm {
                    padding-bottom: 0.75rem;
                }

                jinn-toast .jinn-toast-body {
                    padding-right: 1.25rem;
                }

                jinn-toast .jinn-toast-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin-top: 0.75rem;
                }

                jinn-toast .jinn-toast-action {
                    border: 1px solid rgba(255, 255, 255, 0.35);
                    border-radius: 4px;
                    background: rgba(255, 255, 255, 0.12);
                    color: inherit;
                    cursor: pointer;
                    font: inherit;
                    font-size: 0.875rem;
                    line-height: 1.2;
                    padding: 0.35rem 0.75rem;
                }

                jinn-toast .jinn-toast-action:hover {
                    background: rgba(255, 255, 255, 0.22);
                }

                jinn-toast .jinn-toast-action.primary {
                    background: rgba(255, 255, 255, 0.92);
                    border-color: transparent;
                    color: #1a1816;
                    font-weight: 600;
                }

                jinn-toast .jinn-toast.warn .jinn-toast-action.primary {
                    color: #1a1816;
                }

                jinn-toast .close-button {
                    position: absolute;
                    top: 4px;
                    right: 4px;
                    background: none;
                    border: none;
                    color: inherit;
                    cursor: pointer;
                    font-size: 16px;
                    line-height: 1;
                    padding: 4px;
                    opacity: 0.7;
                    transition: opacity 0.2s;
                }

                jinn-toast .close-button:hover {
                    opacity: 1;
                }

                jinn-toast .jinn-toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                jinn-toast .jinn-toast.error {
                    background-color: var(--jinn-toast-error-color, #EE402E);
                }

                jinn-toast .jinn-toast.warn {
                    background-color: var(--jinn-toast-warn-color, #FF9500);
                    color: #000;
                }

                jinn-toast .jinn-toast.info {
                    background-color: var(--jinn-toast-info-color, #33790F);
                }
            </style>
            <div class="jinn-toast-container"></div>
        `;
    }

    setupEventListeners() {
        document.addEventListener('jinn-toast', (event) => {
            const { message, type, nohtml, sticky, confirm } = event.detail;
            if (confirm) {
                this.showConfirmToast(message, type || 'info', nohtml || false, confirm);
            } else {
                this.showToast(message, type || 'info', nohtml || false, sticky || false);
            }
        });
    }

    /**
     * @param {string|Node|((close: () => void) => Node)} message
     * @param {string} type
     * @param {boolean} nohtml
     * @param {boolean} sticky
     */
    showToast(message, type, nohtml = false, sticky = false) {
        const toast = document.createElement('div');
        toast.className = `jinn-toast ${type} ${sticky ? 'sticky' : ''}`;

        const closeToast = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        };

        this._setToastContent(toast, message, nohtml, closeToast);

        if (sticky) {
            const closeButton = document.createElement('button');
            closeButton.className = 'close-button';
            closeButton.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                    <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
                </svg>
            `;
            closeButton.addEventListener('click', closeToast);
            toast.appendChild(closeButton);
        }

        const container = this.querySelector('.jinn-toast-container');
        container.appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;
        toast.classList.add('show');

        if (!sticky) {
            setTimeout(closeToast, this.duration);
        }
    }

    /**
     * @param {string|Node|((close: () => void) => Node)} message
     * @param {string} type
     * @param {boolean} nohtml
     * @param {{ confirmLabel?: string, cancelLabel?: string, onConfirm?: () => void, onCancel?: () => void }} confirm
     */
    showConfirmToast(message, type, nohtml, confirm) {
        const toast = document.createElement('div');
        toast.className = `jinn-toast confirm ${type}`;

        let settled = false;
        const settle = (confirmed) => {
            if (settled) {
                return;
            }
            settled = true;
            if (confirmed) {
                confirm.onConfirm?.();
            } else {
                confirm.onCancel?.();
            }
            closeToast();
        };

        const closeToast = () => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        };

        const body = document.createElement('div');
        body.className = 'jinn-toast-body';
        this._setToastContent(body, message, nohtml, closeToast);
        toast.appendChild(body);

        const actions = document.createElement('div');
        actions.className = 'jinn-toast-actions';

        const cancelButton = document.createElement('button');
        cancelButton.type = 'button';
        cancelButton.className = 'jinn-toast-action';
        cancelButton.textContent = confirm.cancelLabel || 'Cancel';
        cancelButton.addEventListener('click', () => settle(false));

        const confirmButton = document.createElement('button');
        confirmButton.type = 'button';
        confirmButton.className = 'jinn-toast-action primary';
        confirmButton.textContent = confirm.confirmLabel || 'OK';
        confirmButton.addEventListener('click', () => settle(true));

        actions.appendChild(cancelButton);
        actions.appendChild(confirmButton);
        toast.appendChild(actions);

        const closeButton = document.createElement('button');
        closeButton.className = 'close-button';
        closeButton.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-x" viewBox="0 0 16 16">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708"/>
            </svg>
        `;
        closeButton.addEventListener('click', () => settle(false));
        toast.appendChild(closeButton);

        const container = this.querySelector('.jinn-toast-container');
        container.appendChild(toast);

        toast.offsetHeight;
        toast.classList.add('show');
    }

    /**
     * @param {HTMLElement} target
     * @param {string|Node|((close: () => void) => Node)} message
     * @param {boolean} nohtml
     * @param {() => void} closeToast
     */
    _setToastContent(target, message, nohtml, closeToast) {
        if (typeof message === 'string') {
            if (nohtml) {
                target.textContent = message;
            } else {
                target.innerHTML = message;
            }
        } else if (message instanceof Node) {
            target.appendChild(message);
        } else if (typeof message === 'function') {
            const content = message(closeToast);
            if (content instanceof Node) {
                target.appendChild(content);
            } else {
                console.warn('Function message did not return a valid Node.');
            }
        } else {
            console.warn('Invalid message type for toast. Expected string, Node, or function.');
        }
    }
}

if (!customElements.get('jinn-toast')) {
    customElements.define('jinn-toast', JinnToast);
}
