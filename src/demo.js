import './jinn-tap.js';
import { fromTeiXml } from './util.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');
    const editor = document.querySelector('jinn-tap');
    const output = document.getElementById('output');
    const fileInput = document.getElementById('xmlFile');
    
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
                editor.content = fromTeiXml(e.target.result);
            } catch (error) {
                console.error('Error parsing XML:', error);
            } finally {
                // Reset the file input value so the same file can be selected again
                fileInput.value = '';
            }
        };
        reader.readAsText(file);
    });
});