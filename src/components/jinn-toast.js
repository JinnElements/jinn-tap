export class JinnToast extends HTMLElement {
    constructor() {
        super();
        this.attachShadow({ mode: 'open' });
        this.duration = 3000; // Default duration in milliseconds
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
        this.shadowRoot.innerHTML = `
            <style>
                :host {
                    display: block;
                    position: fixed;
                    bottom: 0;
                    right: 0;
                    z-index: var(--jinn-toast-z-index, 1000);
                    pointer-events: none;
                }

                .toast-container {
                    position: fixed;
                    bottom: 20px;
                    right: 20px;
                    display: flex;
                    flex-direction: column;
                    align-items: flex-end;
                }

                .toast {
                    padding: 12px 24px;
                    margin: 8px 0;
                    border-radius: 4px;
                    color: white;
                    opacity: 0;
                    transform: translateY(20px);
                    transition: opacity 0.3s, transform 0.3s;
                    max-width: var(--jinn-toast-max-width, 300px);
                    word-wrap: break-word;
                    pointer-events: none;
                }

                .toast.show {
                    opacity: 1;
                    transform: translateY(0);
                }

                .toast.error {
                    background-color: var(--jinn-toast-error-color, #EE402E);
                }

                .toast.warn {
                    background-color: var(--jinn-toast-warn-color, #FF9500);
                    color: #000;
                }

                .toast.info {
                    background-color: var(--jinn-toast-info-color, #33790F);
                }
            </style>
            <div class="toast-container"></div>
        `;
    }

    setupEventListeners() {
        document.addEventListener('jinn-toast', (event) => {
            this.showToast(event.detail.message, event.detail.type || 'info');
        });
    }

    showToast(message, type) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        const container = this.shadowRoot.querySelector('.toast-container');
        container.appendChild(toast);

        // Trigger reflow to enable animation
        toast.offsetHeight;
        toast.classList.add('show');

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                container.removeChild(toast);
            }, 300); // Wait for fade out animation
        }, this.duration);
    }
}

customElements.define('jinn-toast', JinnToast); 