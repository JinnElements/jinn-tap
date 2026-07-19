describe('p-authority integration', () => {
    beforeEach(() => {
        // Stub the GND lookups so the test doesn't depend on the live lobid.org
        // service (which is unreachable/rate-limited from CI and makes the test
        // flaky). Fixtures are real captured lobid responses for "Piet Heyn":
        // the search endpoint feeds the result list, and the per-record .json
        // endpoint resolves the label shown once a link has been made.
        cy.intercept('https://lobid.org/gnd/search*', { fixture: 'lobid-piet-heyn.json' }).as('gndSearch');
        cy.intercept('https://lobid.org/gnd/*.json', { fixture: 'lobid-record-118774352.json' }).as('gndRecord');

        cy.visit('/test/test-authority.html');

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
                        if ($component[0].isConnected && $component[0].editor) {
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

    it('show a pb-authority for attributes that are configured as such', () => {
        // Yoink the selection into the GND
        cy.get('jinn-tap').then((e) => {
            const [jinntap] = e.get();
            jinntap.editor.commands.setTextSelection({ from: 16, to: 20 });
        });

        cy.get('pb-authority-lookup').get('pb-authority').should('have.attr', 'connector', 'GND');

        // Yoink the selection into the Airtable
        cy.get('jinn-tap').then((e) => {
            const [jinntap] = e.get();
            jinntap.editor.commands.setTextSelection({ from: 32, to: 36 });
        });

        cy.get('pb-authority-lookup')
            .get('pb-authority')
            .should('have.attr', 'base', 'my-base')
            .should('have.attr', 'connector', 'Airtable')
            .should('have.attr', 'name', 'organisation')
            .should('have.attr', 'api-key', 'my-api-key')
            .should('have.attr', 'table', 'Organisations')
            .should('have.attr', 'tokenize', 'Name, Variants')
            .should('have.attr', 'filter', "or(find('${key}', lower({Name})), find('${key}', lower({Abbreviation})))")
            .should('have.attr', 'fields', 'Name, Abbreviation')
            .should('have.attr', 'label', '${Name}');
    });

    it('can make a new GND entity', () => {
        cy.get('jinn-tap').then((e) => {
            const [jinntap] = e.get();
            jinntap.editor.commands.setTextSelection({ from: 47, to: 56 });
        });

        // Apply the element
        cy.get('jinn-tap').then((e) => {
            const [jinntap] = e.get();
            jinntap.editor.commands.toggleMark('rs', { type: 'gnd' });
        });

        // Wait for the stubbed GND lookup to resolve before querying results
        cy.wait('@gndSearch');

        // Make the link
        cy.get('pb-authority-lookup')
            .shadow()
            .find('div:has(a[href="https://d-nb.info/gnd/118774352"])')
            .find('button')
            .first()
            .click();

        // Check that the link was made correctly
        cy.get('.attribute-panel').find('input').first().should('have.value', 'gnd-118774352');

        // Finally, assert the lookup shows the link
        cy.get('.attribute-panel').find('.label').should('contain', 'Heyn, Piet');
    });
});
