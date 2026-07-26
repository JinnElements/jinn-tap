const wrapInTEIBoilerplate = (input) => {
    return `<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body><p>${input}</p></body></text></TEI>`;
};

describe('JinnTap Component', () => {
    beforeEach(() => {
        cy.visit('/test/test.html');

        // Wait for the component to be defined
        cy.window().then((win) => {
            expect(win.customElements.get('jinn-tap')).to.not.be.undefined;
        });

        // Wait for the component to be connected
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
            })
            .then(() => {
                // Log the component state
                cy.log('Component connected, checking editor state...');
            });
    });

    it('should set content and emit content-change event with correct XML', () => {
        const testContent = '<tei-div><tei-p>Hello world!</tei-p></tei-div>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Create a spy for the content-change event
            const contentChangeSpy = cy.spy().as('contentChangeSpy');

            // Add event listener for content-change event
            $component[0].addEventListener('content-change', contentChangeSpy);

            // Set the content
            $component[0].content = testContent;

            // Wait for the content-change event
            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    // Get the event detail from the spy
                    const eventDetail = spy.getCall(0).args[0].detail;

                    // Compare XML using chai-xml
                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal('<div><p>Hello world!</p></div>');
                });
        });
    });

    it('keeps all ignored metadata elements intact', () => {
        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = `<?xml-model href="tei.rng" type="application/xml" schematypens="http://relaxng.org/ns/structure/1.0"?>
<?oxy_custom_start type="insert" author="ed"?>
<TEI xmlns="http://www.tei-c.org/ns/1.0">
<!-- root note -->
<teiHeader>
<!-- ... -->
</teiHeader>
<?oxy_comment_start author="ed"?>
<facsimile id="firstpage">
<graphic url="firstpage.png" />
</facsimile>
<text xml:lang="en">
<!-- before body -->
<body><p>Hello World</p></body>
</text>
</TEI>
         `;
        });

        cy.get('jinn-tap .ProseMirror').type('More Text!');

        cy.get('jinn-tap').should(($component) => {
            const jinntap = $component[0];
            const xml = jinntap.xml;

            expect(xml).to.be.xml;
            // Document-order children outside the edited body (incl. Oxygen PIs).
            expect(xml).to.contain('<?xml-model href="tei.rng"');
            expect(xml).to.contain('<?oxy_custom_start type="insert" author="ed"?>');
            expect(xml).to.contain('<!-- root note -->');
            expect(xml).to.contain('<!-- ... -->');
            expect(xml).to.contain('<?oxy_comment_start author="ed"?>');
            expect(xml).to.contain('<!-- before body -->');
            expect(xml).to.contain('<facsimile id="firstpage">');
            expect(xml).to.contain('<graphic url="firstpage.png"/>');
            expect(xml).to.contain('<p>More Text!Hello World</p>');
            // Document order preserved: facsimile stays before text.
            expect(xml.indexOf('facsimile')).to.be.lessThan(xml.indexOf('<text'));
        });
    });

    it('handle nested marks', () => {
        const testContent =
            '<tei-div><tei-p><tei-persName><tei-hi rend="b">Rudi</tei-hi> <tei-hi rend="i">Rüssel</tei-hi></tei-persName></tei-p></tei-div>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Create a spy for the content-change event
            const contentChangeSpy = cy.spy().as('contentChangeSpy');

            // Add event listener for content-change event
            $component[0].addEventListener('content-change', contentChangeSpy);

            // Set the content
            $component[0].content = testContent;

            // Wait for the content-change event
            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    // Get the event detail from the spy
                    const eventDetail = spy.getCall(0).args[0].detail;

                    // Compare XML using chai-xml
                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal(
                        '<div><p><persName><hi rend="b">Rudi</hi> <hi rend="i">Rüssel</hi></persName></p></div>',
                    );
                });
        });
    });

    // Regression for https://github.com/JinnElements/jinn-tap/issues/21
    it('closes nested inlines in order before a following empty element', () => {
        const testContent =
            '<tei-div><tei-p><tei-hi>In the outer inline<tei-term>In the inner inline</tei-term></tei-hi><tei-lb/></tei-p></tei-div>';

        cy.get('jinn-tap').then(($component) => {
            const contentChangeSpy = cy.spy().as('nestedInlineSpy');
            $component[0].addEventListener('content-change', contentChangeSpy);
            $component[0].content = testContent;

            cy.get('@nestedInlineSpy')
                .should('have.been.called')
                .then((spy) => {
                    const eventDetail = spy.getCall(0).args[0].detail;
                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal(
                        '<div><p><hi rend="i">In the outer inline<term>In the inner inline</term></hi><lb/></p></div>',
                    );
                });
        });
    });

    // Regression for https://github.com/JinnElements/jinn-tap/issues/6
    it('orders footnotes by anchor position in the main text', () => {
        // Notes deliberately listed as 1, 10, 2 (alphabetical order) — must become 1, 2, 10
        const testContent =
            '<tei-div><tei-p>' +
            'A<tei-anchor id="n1" type="note"></tei-anchor>' +
            'B<tei-anchor id="n2" type="note"></tei-anchor>' +
            'C<tei-anchor id="n10" type="note"></tei-anchor>' +
            '</tei-p></tei-div>' +
            '<tei-listAnnotation>' +
            '<tei-note target="#n1"><tei-p>Note 1</tei-p></tei-note>' +
            '<tei-note target="#n10"><tei-p>Note 10</tei-p></tei-note>' +
            '<tei-note target="#n2"><tei-p>Note 2</tei-p></tei-note>' +
            '</tei-listAnnotation>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').should(($component) => {
            const xml = $component[0].xml;
            const noteOrder = [...xml.matchAll(/<note[^>]*\starget="([^"]+)"/g)].map((m) => m[1]);
            expect(noteOrder).to.deep.equal(['#n1', '#n2', '#n10']);
        });
    });

    it('handle choice/abbr/expan', () => {
        const testContent =
            '<tei-div><tei-p><tei-choice><tei-abbr>WYSIWYM</tei-abbr><tei-expan>What you see is what you mean</tei-expan></tei-choice>.</tei-p></tei-div>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Create a spy for the content-change event
            const contentChangeSpy = cy.spy().as('contentChangeSpy');

            // Add event listener for content-change event
            $component[0].addEventListener('content-change', contentChangeSpy);

            // Set the content
            $component[0].content = testContent;

            // Wait for the content-change event
            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    // Get the event detail from the spy
                    const eventDetail = spy.getCall(0).args[0].detail;

                    // Compare XML using chai-xml
                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal(
                        '<div><p><choice xml:space="preserve"><abbr>WYSIWYM</abbr><expan>What you see is what you mean</expan></choice>.</p></div>',
                    );
                });
        });
    });

    it('should apply bold formatting to selected text', () => {
        const testContent = '<tei-div><tei-p>Hello world!</tei-p></tei-div>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Create a spy for the content-change event
            const contentChangeSpy = cy.spy().as('contentChangeSpy');

            // Add event listener for content-change event
            $component[0].addEventListener('content-change', contentChangeSpy);

            // Set the content
            $component[0].content = testContent;

            // Wait for the content-change event
            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then(() => {
                    const editor = $component[0].editor;
                    editor.chain().focus().setTextSelection({ from: 8, to: 13 }).run();
                    cy.wait(500);
                    cy.get('jinn-tap .toolbar-button[data-tooltip="Bold"]').click();
                    cy.wait(500);
                    cy.get('@contentChangeSpy')
                        .should('have.been.calledThrice')
                        .then((spy) => {
                            // Get the event detail from the second call
                            const eventDetail = spy.getCall(2).args[0].detail;

                            // Log the XML after formatting
                            cy.log('XML after formatting:', eventDetail.body);

                            // Compare XML using chai-xml
                            expect(eventDetail.body).to.be.xml;
                            expect(eventDetail.body).to.equal('<div><p>Hello <hi rend="b">world</hi>!</p></div>');
                        });
                });
        });
    });

    it('handles characters that can be invalid in XML', () => {
        const testContent = '<tei-p></tei-p>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content
            $component[0].content = testContent;
        });

        cy.get('jinn-tap .ProseMirror').type('I <3 the & character');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('I &lt;3 the &amp; character'));
        });
    });

    it('handles becoming semi read-only', () => {
        const testContent = '<tei-p>Initial Content</tei-p>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content
            $component[0].content = testContent;
        });
        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.togglePreventTyping();
        });

        // Typing, backspace, CUT should all be blocked now
        cy.get('jinn-tap[block-typing] .ProseMirror')
            .type('Hello there!')
            .press(Cypress.Keyboard.Keys.BACKSPACE)
            .press(Cypress.Keyboard.Keys.DELETE);

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('Initial Content'));
        });

        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.setTextSelection({ from: 1, to: 4 });
        });

        // Emulate a 'cut'. Should not change the content
        cy.get('jinn-tap tei-p').then(([jinntap]) => {
            const cutEvent = Object.assign(new Event('cut', { bubbles: true, cancelable: true }), {
                clipboardData: { setData: () => {}, clearData: () => {} },
            });
            jinntap.dispatchEvent(cutEvent);
        });
        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('Initial Content'));
        });

        // Simulate a 'paste' Should also not be applied
        cy.get('jinn-tap tei-p').then(([jinntap]) => {
            const payload = {
                'text/html': `<div><p>A</p><br/><p>B</p><br/><p>C</p></div>`,
            };
            const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
                clipboardData: {
                    getData: (type) => payload[type],
                },
            });
            jinntap.dispatchEvent(pasteEvent);
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('Initial Content'));
        });
        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.togglePreventTyping();
        });
        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.setTextSelection({ from: 1, to: 1 });
        });

        cy.get('jinn-tap .ProseMirror').type('Hello There! ');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('Hello There! Initial Content'));
        });

        // Test whether 'cut' works now!
        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.setTextSelection({ from: 1, to: 14 });
        });

        cy.get('jinn-tap tei-p').then(([jinntap]) => {
            const cutEvent = Object.assign(new Event('cut', { bubbles: true, cancelable: true }), {
                clipboardData: { setData: () => {}, clearData: () => {} },
            });
            jinntap.dispatchEvent(cutEvent);
        });
        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('Initial Content'));
        });
        // Paste should work again!
        cy.get('jinn-tap tei-p').then(([jinntap]) => {
            const payload = {
                'text/html': `<div><p>A</p><br/><p>B</p><br/><p>C</p></div>`,
            };
            const pasteEvent = Object.assign(new Event('paste', { bubbles: true, cancelable: true }), {
                clipboardData: {
                    getData: (type) => payload[type],
                },
            });
            jinntap.dispatchEvent(pasteEvent);
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.equal(wrapInTEIBoilerplate('A</p>\n<p>B</p>\n<p>CInitial Content'));
        });
    });
});
