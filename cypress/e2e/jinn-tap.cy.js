import { evaluateXPathToNumber } from 'fontoxpath';

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

    it('can handle tables', () => {
        const testContent =
            '<tei-table><tei-head>The title</tei-head><tei-row><tei-cell>A</tei-cell><tei-cell>B</tei-cell></tei-row><tei-row><tei-cell>C</tei-cell><tei-cell>D</tei-cell></tei-row></tei-table>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content
            $component[0].content = testContent;

            cy.get('jinn-tap').should((e) => {
                const [editor] = e.get();
                expect(editor.xml).to.equal(
                    '<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body><table cols="2" rows="2"><head>The title</head><row><cell>A</cell><cell>B</cell></row><row><cell>C</cell><cell>D</cell></row></table></body></text><standOff/></TEI>',
                );
            });

            $component[0].content = testContent;

            // Set the selection to in the table, around the 'A'
            $component[0].editor.commands.setTextSelection({ from: 14, to: 15 });

            cy.window().invoke('getSelection').invoke('toString').should('eq', 'A');

            cy.get('jinn-tap').press(Cypress.Keyboard.Keys.TAB);
            cy.window().invoke('getSelection').invoke('toString').should('eq', 'B');

            // Whoop, next row!
            cy.get('jinn-tap').press(Cypress.Keyboard.Keys.TAB);
            cy.window().invoke('getSelection').invoke('toString').should('eq', 'C');

            cy.get('jinn-tap').press(Cypress.Keyboard.Keys.TAB);
            cy.window().invoke('getSelection').invoke('toString').should('eq', 'D');

            // And for our next trick: new row!
            cy.get('jinn-tap').press(Cypress.Keyboard.Keys.TAB);
            cy.get('jinn-tap').should((e) => {
                const [editor] = e;

                const xml = new DOMParser().parseFromString(editor.xml, 'text/xml');

                expect(evaluateXPathToNumber('count(//*:row)', xml)).to.equal(3, 'There should now be three rows!');
            });
        });
    });
});
