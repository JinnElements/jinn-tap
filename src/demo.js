import { JinnTap, JinnToast } from './index.js';
import { fromXml } from './util.js';

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.querySelector('jinn-tap');
    const output = document.getElementById('output');
    const fileInput = document.getElementById('xmlFile');
    const copyButton = editor.querySelector('[data-tooltip="Copy TEI to clipboard"]');
    const newButton = editor.querySelector('[data-tooltip="New Document"]');
    if (!fileInput) {
        console.error('File input element not found!');
        return;
    }

    // Handle content changes
    editor.addEventListener('content-change', (event) => {
        try {
            output.textContent = xmlFormatter(`<body>${event.detail.xml}</body>`, { collapseContent: true });
        } catch (error) {
            output.textContent = event.detail.xml;
        }
    });

    // Handle file upload
    fileInput.addEventListener('change', (event) => {
        const file = event.target.files[0];
        if (!file) {
            console.log('No file selected');
            return;
        }
        console.log('File selected:', file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                editor.content = fromXml(e.target.result);
            } catch (error) {
                console.error('Error parsing XML:', error);
            } finally {
                // Reset the file input value so the same file can be selected again
                fileInput.value = '';
            }
        };
        reader.readAsText(file);
    });

    // Handle copy to clipboard
    if (copyButton) {
        copyButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const xml = editor.xml;
                await navigator.clipboard.writeText(xml);
                
                // Show success message
                document.dispatchEvent(new CustomEvent('jinn-toast', {
                    detail: {
                        message: 'XML content copied to clipboard',
                        type: 'info'
                    }
                }));
                const originalTooltip = copyButton.dataset.tooltip;
                copyButton.dataset.tooltip = 'Copied!';
                setTimeout(() => {
                    copyButton.dataset.tooltip = originalTooltip;
                }, 2000);
            } catch (error) {
                console.error('Failed to copy to clipboard:', error);
                copyButton.dataset.tooltip = 'Failed to copy';
                setTimeout(() => {
                    copyButton.dataset.tooltip = 'Copy TEI to clipboard';
                }, 2000);
            }
        });
    }

    if (newButton) {
        newButton.addEventListener('click', (event) => {
            event.preventDefault();
            editor.content = '<tei-div><tei-p></tei-p></tei-div>';
        });
    }
});