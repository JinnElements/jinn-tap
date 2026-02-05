describe('JinnTap Component', () => {
    beforeEach(() => {
        cy.visit('/test.html');

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
            $component[0].xml = `<TEI xmlns="http://www.tei-c.org/ns/1.0">
<teiHeader>
<!-- ... -->
</teiHeader>
<facsimile id="firstpage">
<graphic url="firstpage.png" />
</facsimile>
<text xml:lang="en">
<body><p>Hello World</p></body>
</text>
</TEI>
         `;
        });

        cy.get('jinn-tap').type('More Text!');

        cy.get('jinn-tap').should(($component) => {
            const jinntap = $component[0];

            expect(jinntap.xml).to.be.xml;
            expect(jinntap.xml).to.equal(`<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader>
<!-- ... -->
</teiHeader><text xml:lang="en">
<body><p>More Text!Hello World</p>
</body>
</text><facsimile id="firstpage">
<graphic url="firstpage.png"/>
</facsimile><standOff><listAnnotation/></standOff></TEI>`);
        });
    });

    it('handle nested marks', () => {
        const testContent =
            '<tei-div><tei-p><tei-persName><tei-hi rend="b">Rudi</tei-hi> <tei-hi rend="i">Rüssel</tei-hi></tei-hi></tei-persName></tei-p></tei-div>';

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

            cy.get('jinn-tap').type('I <3 the & character');

            cy.get('jinn-tap').should((e) => {
                const [editor] = e.get();

                expect(editor.xml).to.equal(
                    '<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body><p>I &lt;3 the &amp; character</p></body></text><standOff/></TEI>',
                );
            });
        });
    });
});
