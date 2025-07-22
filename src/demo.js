import { JinnTap, JinnToast } from './index.js';

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.querySelector('jinn-tap');
    const output = document.getElementById('output');
    const fileInput = document.getElementById('xmlFile');
    const copyButton = editor.querySelector('[data-tooltip="Copy TEI to clipboard"]');
    const newButton = editor.querySelector('[data-tooltip="New Document"]');
    const downloadButton = editor.querySelector('[data-tooltip="Download XML"]');

    if (!fileInput) {
        console.error('File input element not found!');
        return;
    }

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
                editor.xml = e.target.result;
                editor.metadata = {
                    name: file.name,
                };
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
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: {
                            message: 'XML content copied to clipboard',
                            type: 'info',
                        },
                    }),
                );
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
            editor.newDocument();
        });
    }

    if (downloadButton) {
        downloadButton.addEventListener('click', async (event) => {
            event.preventDefault();
            try {
                const xml = editor.xml;
                console.log(xml);
                const blob = new Blob([xml], { type: 'application/xml' });

                // Try to use the File System Access API if available
                if ('showSaveFilePicker' in window) {
                    try {
                        const handle = await window.showSaveFilePicker({
                            suggestedName: editor.metadata?.name || 'document.xml',
                            types: [
                                {
                                    description: 'XML Files',
                                    accept: {
                                        'application/xml': ['.xml'],
                                    },
                                },
                            ],
                        });

                        const writable = await handle.createWritable();
                        await writable.write(blob);
                        await writable.close();

                        document.dispatchEvent(
                            new CustomEvent('jinn-toast', {
                                detail: {
                                    message: 'XML file saved successfully',
                                    type: 'info',
                                },
                            }),
                        );
                    } catch (error) {
                        // User cancelled the save dialog
                        if (error.name === 'AbortError') {
                            return;
                        }
                        throw error;
                    }
                } else {
                    // Fallback for browsers that don't support showSaveFilePicker
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = editor.metadata?.name || 'document.xml';

                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(url);

                    document.dispatchEvent(
                        new CustomEvent('jinn-toast', {
                            detail: {
                                message: 'XML file downloaded successfully',
                                type: 'info',
                            },
                        }),
                    );
                }
            } catch (error) {
                console.error('Failed to save XML:', error);
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: {
                            message: 'Failed to save XML file',
                            type: 'error',
                        },
                    }),
                );
            }
        });
    }
});
