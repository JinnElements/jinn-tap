import './jinn-tap.js';

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
            const xmlText = [];
            try {
                const parser = new DOMParser();
                const xmlDoc = parser.parseFromString(e.target.result, 'application/xml');
                
                // Check for parsing errors
                const parserError = xmlDoc.querySelector('parsererror');
                if (parserError) {
                    console.error('XML Parsing Error:', parserError.textContent);
                    return;
                }

                // Log the parsed XML to console
                console.log('Parsed XML:', xmlDoc);
                
                // You can now process the XML document further
                // For example, you could extract specific elements:
                const nodes = xmlDoc.querySelectorAll('text > body > *');
                nodes.forEach(content => {
                    // Transform node names to tei- prefixed format
                    const transformNode = (node) => {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            // Create new element with tei- prefix
                            const newElement = document.createElement(`tei-${node.tagName}`);
                            
                            // Copy all attributes
                            for (const attr of node.attributes) {
                                newElement.setAttribute(attr.name, attr.value);
                            }
                            
                            // Transform child nodes recursively
                            for (const child of node.childNodes) {
                                newElement.appendChild(transformNode(child));
                            }
                            
                            return newElement;
                        } else {
                            // For text nodes, just clone them
                            return node.cloneNode();
                        }
                    };

                    // Transform the content and replace editor content
                    const transformedContent = transformNode(content);
                    console.log(transformedContent.outerHTML);
                    xmlText.push(transformedContent.outerHTML);
                });
            } catch (error) {
                console.error('Error parsing XML:', error);
            } finally {
                // Reset the file input value so the same file can be selected again
                fileInput.value = '';
            }
            editor.content = xmlText.join('');
        };
        reader.readAsText(file);
    });
});