const waitForComponent = () => {
    cy.window().then((win) => {
        expect(win.customElements.get('jinn-tap')).to.not.be.undefined;
    });

    cy.get('jinn-tap', { timeout: 10000 })
        .should('exist')
        .then(($component) => {
            return new Cypress.Promise((resolve) => {
                const checkConnected = () => {
                    if ($component[0].isConnected) {
                        resolve();
                    } else {
                        setTimeout(checkConnected, 100);
                    }
                };
                checkConnected();
            });
        });
};

/**
 * Position right after the text of the last text block inside the given node type.
 */
const endOfLastTextblock = (doc, typeName) => {
    let result = null;
    doc.descendants((node, pos) => {
        if (node.type.name !== typeName) {
            return;
        }
        node.descendants((child, childPos) => {
            if (child.isTextblock) {
                result = pos + 1 + childPos + 1 + child.content.size;
            }
        });
    });
    return result;
};

const describeDoc = (node) =>
    node.type.name +
    (node.childCount
        ? `(${[...Array(node.childCount)].map((_, i) => describeDoc(node.child(i))).join(',')})`
        : node.isText
          ? `"${node.text}"`
          : '');

const testFormat = ({ label, fixture, figName, capName, containerName, content }) => {
    describe(`Figures (${label})`, () => {
        beforeEach(() => {
            cy.visit(fixture);
            waitForComponent();
        });

        it('does not add anything to a document ending in a figure', () => {
            cy.get('jinn-tap').then(($component) => {
                $component[0].content = content;

                cy.wrap(null).should(() => {
                    const container = $component[0].editor.state.doc.firstChild;
                    expect(container.lastChild.type.name).to.equal(figName);
                    expect($component[0].xml).to.not.match(/<p\s*\/>|<p><\/p>/);
                });
            });
        });

        it('places a gap cursor after the figure on Enter', () => {
            cy.get('jinn-tap').then(($component) => {
                const editor = $component[0].editor;
                $component[0].content = content;

                cy.wrap(null)
                    .should(() => {
                        expect(endOfLastTextblock(editor.state.doc, figName)).to.not.be.null;
                    })
                    .then(() => {
                        editor.commands.focus(endOfLastTextblock(editor.state.doc, figName));
                    });

                cy.get('jinn-tap .ProseMirror').type('{enter}');

                cy.wrap(null).should(() => {
                    const container = editor.state.doc.firstChild;
                    // the caption is untouched and no paragraph was inserted yet
                    expect(container.lastChild.type.name).to.equal(figName);
                    expect(editor.state.selection.toJSON().type).to.equal('gapcursor');
                });

                // typing at the gap cursor is what creates the paragraph
                cy.wrap(null).then(() => {
                    editor.commands.insertContent('Continued');
                });

                cy.wrap(null).should(() => {
                    const container = editor.state.doc.firstChild;
                    expect(container.lastChild.type.name).to.equal('p');
                    expect(container.lastChild.textContent).to.equal('Continued');
                    expect(container.child(container.childCount - 2).type.name).to.equal(figName);
                });
            });
        });

        it('keeps Enter inside the caption when the cursor is not at its end', () => {
            cy.get('jinn-tap').then(($component) => {
                const editor = $component[0].editor;
                $component[0].content = content;

                cy.wrap(null).then(() => {
                    editor.commands.focus(endOfLastTextblock(editor.state.doc, figName) - 3);
                });

                cy.get('jinn-tap .ProseMirror').type('{enter}');

                cy.wrap(null).should(() => {
                    const figure = editor.state.doc.firstChild.lastChild;
                    expect(figure.type.name).to.equal(figName);
                    // the caption was split, the cursor never left the figure
                    expect(describeDoc(figure)).to.contain(capName);
                    expect(editor.state.selection.$from.node(2).type.name).to.be.oneOf([figName, capName, 'p']);
                });
            });
        });

        it('reaches the gap cursor with ArrowDown from the caption', () => {
            cy.get('jinn-tap').then(($component) => {
                const editor = $component[0].editor;
                $component[0].content = content;

                cy.wrap(null).then(() => {
                    editor.commands.focus(endOfLastTextblock(editor.state.doc, figName));
                });

                cy.get('jinn-tap .ProseMirror').type('{downArrow}');

                cy.wrap(null).should(() => {
                    expect(editor.state.selection.toJSON().type).to.equal('gapcursor');
                });
            });
        });
    });
};

testFormat({
    label: 'TEI',
    fixture: '/test/test.html',
    figName: 'figure',
    capName: 'head',
    containerName: 'div',
    content:
        '<tei-div><tei-p>Hello</tei-p><tei-figure><tei-graphic url="image.png"></tei-graphic><tei-head>Caption</tei-head></tei-figure></tei-div>',
});

testFormat({
    label: 'JATS',
    fixture: '/test/jats-test.html',
    figName: 'fig',
    capName: 'caption',
    containerName: 'sec',
    content:
        '<jats-sec><jats-p>Hello</jats-p><jats-fig><jats-graphic xlink:href="image.png"></jats-graphic><jats-caption><jats-p>Caption</jats-p></jats-caption></jats-fig></jats-sec>',
});
