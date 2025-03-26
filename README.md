# jinn-tap

A rich text editor for creating and editing TEI XML documents. This editor provides a user-friendly interface for working with TEI markup while maintaining the structural integrity of the document. 

[Demo](https://wolfgangmm.github.io/editor-test/)

## Features

- Rich text editing with TEI XML support
- Real-time XML preview
- Support for common TEI elements (paragraphs, lists, page breaks)
- Support for TEI inline elements (highlighting, additions, deletions)
- Attribute editing through a side panel
- Copy to clipboard functionality
- Responsive design

## Keyboard Shortcuts

The editor supports the following keyboard shortcuts:

### Text Formatting
- `Ctrl/Cmd + B` - Toggle bold text (hi with rend="bold")
- `Ctrl/Cmd + I` - Toggle italic text (hi with rend="italic")
- `Ctrl/Cmd + U` - Toggle underline text (hi with rend="underline")

### TEI Elements
- `Ctrl/Cmd + Shift + P` - Insert TEI persName
- `Ctrl/Cmd + Shift + L` - Toggle list
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

## Getting Started

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. Open your browser and navigate to `http://localhost:5173`

## Usage

1. Start typing in the editor to create content
2. Use the toolbar or keyboard shortcuts to apply formatting
3. Use the side panel to edit attributes of selected elements
4. Click the "Copy TEI" button to copy the current content as TEI XML

## Development

The project uses:
- Vite for build tooling
- Tiptap for the rich text editor
- ProseMirror for the underlying editor engine

## License

[GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.en.html)