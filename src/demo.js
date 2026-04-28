import './index.js';

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.querySelector('jinn-tap');
    const formatLinks = Array.from(document.querySelectorAll('.editor-format-link'));
    const jatsStylesheet = document.getElementById('jatsEditorStyles');
    const fileInput = document.getElementById('xmlFile');
    const copyButton = editor.querySelector('.toolbar-button[data-tooltip*="Copy"]');
    const newButton = editor.querySelector('[data-tooltip="New Document"]');
    const downloadButton = editor.querySelector('[data-tooltip="Download XML"]');

    if (!fileInput || formatLinks.length === 0) {
        console.error('Required UI elements not found!');
        return;
    }

    const copyTooltip = 'Copy to clipboard';
    const defaultDocumentByFormat = {
        tei: 'docs.xml',
        jats: 'musk-trump-tei-publisher.xml',
    };

    const applyFormatUi = (format) => {
        const normalizedFormat = format === 'jats' ? 'jats' : 'tei';
        formatLinks.forEach((link) => {
            const isActive = link.dataset.format === normalizedFormat;
            link.classList.toggle('is-active', isActive);
            link.setAttribute('aria-current', isActive ? 'page' : 'false');
        });
        if (jatsStylesheet) {
            jatsStylesheet.disabled = normalizedFormat !== 'jats';
        }
    };

    const normalizeFormat = (value) => (value === 'jats' ? 'jats' : 'tei');
    const getDefaultDocumentForFormat = (format) => defaultDocumentByFormat[normalizeFormat(format)];
    const loadDefaultDocumentForFormat = async (format) => {
        const nextUrl = getDefaultDocumentForFormat(format);
        await editor.load(format, nextUrl);
    };

    applyFormatUi(editor.format);
    loadDefaultDocumentForFormat(editor.format).catch((error) => {
        document.dispatchEvent(
            new CustomEvent('jinn-toast', {
                detail: {
                    message: error.message || 'Failed to load default document',
                    type: 'error',
                },
            }),
        );
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

    formatLinks.forEach((link) => {
        link.addEventListener('click', async (event) => {
            event.preventDefault();
            const selectedFormat = normalizeFormat(link.dataset.format);
            if (selectedFormat === editor.format) {
                return;
            }

            const confirmed = window.confirm(
                `Switching to ${selectedFormat.toUpperCase()} will create a new empty document and replace current content. Continue?`,
            );

            if (!confirmed) {
                applyFormatUi(editor.format);
                return;
            }

            try {
                await loadDefaultDocumentForFormat(selectedFormat);
            } catch (error) {
                document.dispatchEvent(
                    new CustomEvent('jinn-toast', {
                        detail: {
                            message: error.message || 'Failed to switch editor format',
                            type: 'error',
                        },
                    }),
                );
                applyFormatUi(editor.format);
                return;
            }
            applyFormatUi(selectedFormat);
        });
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
                    copyButton.dataset.tooltip = copyTooltip;
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
