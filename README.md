# JinnTap

![JinnTap Logo](public/jinntap-logo.png)

Edit TEI XML documents using a rich text editor. JinnTap preserves the structure of the XML in the editor. There's no need for complex transformation steps from TEI to HTML and back. The representation of the document in the editor corresponds directly with the XML. TEI elements are converted to HTML custom elements, preserving all attributes and structural features.

JinnTap comes as a web component. While it can be used standalone, it is usually meant to be embedded into a larger application context such as TEI Publisher 10, which will include JinnTap and does allow saving and reloading documents. TP 10 has not been released yet.

## Installation

```bash
npm install @jinntec/jinntap
```

## Development Setup

### Prerequisites
- Node.js (v16 or higher)
- npm (v7 or higher)

### Building the Project

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Build the demo
npm run build:demo
```

### Running the Demo

```bash
# Start the development server
npm run dev

# Preview the built demo
npm run preview
```

### Running Tests

```bash
# Open Cypress test runner
npm run cypress:open

# Run tests in headless mode
npm run cypress:run
```

## Usage

### Basic Usage

```html
<!DOCTYPE html>
<html>
<head>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@picocss/pico@2/css/pico.min.css">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
	<!-- Import the general editor styles-->
    <link rel="stylesheet" href="node_modules/@jinntec/jinntap/dist/jinn-tap.css" />
	<!-- Import the styles for displaying TEI documents -->
    <link rel="stylesheet" href="node_modules/@jinntec/jinntap/dist/editor-styles.css" />
    <script type="module" src="node_modules/@jinntec/jinntap/dist/jinn-tap.es.js"></script>
</head>
<body>
    <jinn-tap></jinn-tap>
    <pre id="output"></pre>
    <script>
        document.addEventListener('DOMContentLoaded', () => {
            const editor = document.querySelector('jinn-tap');
            const output = document.querySelector('#output');

            editor.addEventListener('content-change', (event) => {
                output.textContent = event.detail.teiXml;
            });
        });
    </script>
</body>
</html>
```

### With Initial Content

```html
<jinn-tap content="<tei-div><tei-p>Initial content</tei-p></tei-div>"></jinn-tap>
```

### JavaScript API

```javascript
// Get the editor instance
const editor = document.querySelector('jinn-tap').tiptap;

// Set content programmatically
editor.commands.setContent('<tei-div><tei-p>New content</tei-p></tei-div>');

// Get content as HTML
const htmlContent = editor.getHTML();

// Get content as TEI XML
const teiXml = editor.teiXml;

// Focus the editor
editor.focus();
```

## Keyboard Shortcuts

The editor supports the following keyboard shortcuts:

### Text Formatting
- `Ctrl/Cmd + B` - Toggle bold text (hi with rend="bold")
- `Ctrl/Cmd + I` - Toggle italic text (hi with rend="italic")
- `Ctrl/Cmd + U` - Toggle underline text (hi with rend="underline")

### TEI Elements
- `Ctrl/Cmd + Shift + P` - Insert TEI persName
- `Ctrl/Cmd + Shift + L` - Toggle list
- `Ctrl/Cmd + Shift + U` - Insert footnote
- `Tab` - Indent list item
- `Shift + Tab` - Outdent list item
- `Enter` - Create new list item
- `Backspace` at start of list item - Convert to paragraph

### General
- `Ctrl/Cmd + C` - Copy selected text
- `Ctrl/Cmd + V` - Paste text
- `Ctrl/Cmd + X` - Cut text
- `Ctrl/Cmd + Z` - Undo
- `Ctrl/Cmd + Shift + Z` - Redo

## Events

The component dispatches the following events:

### content-change
Fired when the editor content changes.

```javascript
editor.addEventListener('content-change', (event) => {
    const { content, teiXml } = event.detail;
    // content: HTML content
    // teiXml: TEI XML content
});
```

## License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)
