import { JinnInline } from './inline.js';

export const JinnReference = JinnInline.extend({
    name: 'ref',

    addMarkView() {
        return ({ mark, HTMLAttributes }) => {
            const prefix = this.options.prefix || 'tei-';
            const dom = document.createElement('a');
            const contentDOM = document.createElement(`${prefix}${this.name}`);

            // Mirror mark attributes onto the semantic element (tei-ref / jats-ext-link).
            Object.entries(HTMLAttributes).forEach(([key, value]) => {
                if (value != null && value !== '') {
                    contentDOM.setAttribute(key, value);
                }
            });

            // Set up the anchor element (TEI: target, JATS: xlink:href)
            const targetUrl = mark.attrs.target || mark.attrs['xlink:href'] || '#';
            dom.href = targetUrl;
            dom.title = targetUrl;
            dom.target = '_blank';
            dom.classList.add('reference');

            // Handle clicks with smart detection
            dom.addEventListener('click', (e) => {
                // Check if click is on the pseudo-element (arrow)
                const rect = dom.getBoundingClientRect();
                const clickX = e.clientX - rect.left;
                const contentWidth = contentDOM.getBoundingClientRect().width;

                // If click is on the text content, prevent default and allow cursor positioning
                if (clickX <= contentWidth) {
                    e.preventDefault();
                    // Let TipTap handle cursor positioning
                } else {
                    // Always prevent default and handle manually for better control
                    e.preventDefault();
                    e.stopPropagation();

                    if (dom.href && dom.href !== '#') {
                        // Try multiple approaches to ensure the link opens
                        try {
                            window.open(dom.href, '_blank', 'noopener,noreferrer');
                        } catch (error) {
                            // Fallback: try to navigate in the same window
                            window.location.href = dom.href;
                        }
                    }
                }
            });

            dom.appendChild(contentDOM);

            return {
                dom,
                contentDOM,
            };
        };
    },
});
