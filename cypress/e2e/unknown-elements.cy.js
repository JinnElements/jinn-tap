// Elements that are not described by tei-schema.json must not be dropped: jinntap
// synthesizes generic entries for them so they round-trip through the editor and
// are visibly marked in the reading pane.

const wrapInTEIBoilerplate = (input) => {
    return `<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body>${input}</body></text><standOff/></TEI>`;
};

describe('Unknown elements', () => {
    beforeEach(() => {
        cy.visit('/test/test.html');

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
    });

    // Set content and read back the serialized body from the content-change event.
    const roundtrip = (testContent, assertBody) => {
        cy.get('jinn-tap').then(($component) => {
            const spy = cy.spy().as('contentChangeSpy');
            $component[0].addEventListener('content-change', spy);
            $component[0].content = testContent;

            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((s) => {
                    const { body } = s.getCall(0).args[0].detail;
                    expect(body).to.be.xml;
                    assertBody(body);
                });
        });
    };

    it('preserves an unknown inline element as a mark, with its attributes', () => {
        roundtrip(
            '<tei-div><tei-p>Hello <tei-foreign xml:lang="la">mundus</tei-foreign>!</tei-p></tei-div>',
            (body) => {
                expect(body).to.equal('<div><p>Hello <foreign xml:lang="la">mundus</foreign>!</p></div>');
            },
        );

        // The element is tagged in the reading pane for the author to see.
        cy.get('jinn-tap tei-foreign.jinn-tap-unknown').should('have.attr', 'data-tag', 'foreign');
    });

    it('preserves an unknown block container and its unknown block children', () => {
        roundtrip(
            '<tei-div><tei-sp><tei-speaker>Hamlet</tei-speaker><tei-p>To be</tei-p></tei-sp></tei-div>',
            (body) => {
                expect(body).to.equal('<div><sp><speaker>Hamlet</speaker><p>To be</p></sp></div>');
            },
        );

        cy.get('jinn-tap tei-sp.jinn-tap-unknown').should('exist');
        cy.get('jinn-tap tei-speaker.jinn-tap-unknown').should('exist');
    });

    it('preserves an unknown empty element and its attributes', () => {
        // Loaded through the real import path: a self-closing custom-element tag is
        // not void in HTML, so this must go through the XQuery importer (which emits
        // an explicitly-closed, genuinely empty element) rather than a raw string.
        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = wrapInTEIBoilerplate('<p>A<milestone unit="line"/>B</p>');
        });

        cy.get('jinn-tap').should(($component) => {
            expect($component[0].xml).to.contain('<milestone unit="line"/>');
        });

        cy.get('jinn-tap tei-milestone.jinn-tap-unknown-empty').should('exist');
    });

    it('recovers the original-case element name from the source document', () => {
        cy.get('jinn-tap').then(($component) => {
            // The importer lowercases custom-element tag names; the original camelCase
            // name is recovered from the source XML so it round-trips faithfully.
            $component[0].xml = wrapInTEIBoilerplate('<p>See <soCalled>this</soCalled>.</p>');
        });

        cy.get('jinn-tap').should(($component) => {
            expect($component[0].xml).to.contain('<soCalled>this</soCalled>');
        });
    });

    it('leaves documents without unknown elements unchanged', () => {
        roundtrip('<tei-div><tei-p>Just <tei-hi rend="b">known</tei-hi> markup.</tei-p></tei-div>', (body) => {
            expect(body).to.equal('<div><p>Just <hi rend="b">known</hi> markup.</p></div>');
        });

        cy.get('jinn-tap .jinn-tap-unknown').should('not.exist');
    });
});
