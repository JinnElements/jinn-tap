describe('p-authority integration', () => {
    beforeEach(() => {
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
});
