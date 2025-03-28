import './jinn-tap.js';

document.addEventListener('DOMContentLoaded', () => {
    const editor = document.querySelector('jinn-tap');
    const output = document.querySelector('#output');
    
    editor.addEventListener('content-change', (event) => {
        output.textContent = event.detail.teiXml;
    });
}); 