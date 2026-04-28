describe('JinnTap Component (JATS format)', () => {
    beforeEach(() => {
        cy.visit('/test/jats-test.html');

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

    it('should set content and emit content-change event with correct XML', () => {
        const testContent = '<jats-sec><jats-p>Hello world!</jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            const contentChangeSpy = cy.spy().as('contentChangeSpy');
            $component[0].addEventListener('content-change', contentChangeSpy);

            $component[0].content = testContent;

            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    const eventDetail = spy.getCall(0).args[0].detail;

                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal('<sec><p>Hello world!</p></sec>');
                });
        });
    });

    it('handles nested marks', () => {
        const testContent =
            '<jats-sec><jats-p><jats-bold>Rudi</jats-bold> <jats-italic>Ruessel</jats-italic></jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            const contentChangeSpy = cy.spy().as('contentChangeSpy');
            $component[0].addEventListener('content-change', contentChangeSpy);

            $component[0].content = testContent;

            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    const eventDetail = spy.getCall(0).args[0].detail;

                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal(
                        '<sec><p><bold>Rudi</bold> <italic>Ruessel</italic></p></sec>',
                    );
                });
        });
    });

    it('should apply bold formatting to selected text', () => {
        const testContent = '<jats-sec><jats-p>Hello world!</jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            const contentChangeSpy = cy.spy().as('contentChangeSpy');
            $component[0].addEventListener('content-change', contentChangeSpy);
            $component[0].content = testContent;

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
                            const eventDetail = spy.getCall(2).args[0].detail;

                            expect(eventDetail.body).to.be.xml;
                            expect(eventDetail.body).to.equal('<sec><p>Hello <bold>world</bold>!</p></sec>');
                        });
                });
        });
    });

    it('handles characters that can be invalid in XML', () => {
        const testContent = '<jats-sec><jats-p></jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').type('I <3 the & character');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.include('<article');
            expect(editor.xml).to.include('<p>I &lt;3 the &amp; character</p>');
        });
    });

    it('handles becoming semi read-only', () => {
        const testContent = '<jats-sec><jats-p>Initial Content</jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });
        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.togglePreventTyping();
        });

        cy.get('jinn-tap[block-typing]')
            .type('Hello there!')
            .press(Cypress.Keyboard.Keys.BACKSPACE)
            .press(Cypress.Keyboard.Keys.DELETE);

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<p>Initial Content</p>');
            expect(editor.xml).to.not.include('Hello there!');
        });

        cy.get('jinn-tap').then(($component) => {
            $component[0].editor.commands.togglePreventTyping();
            $component[0].editor.commands.setTextSelection({ from: 1, to: 1 });
        });

        cy.get('jinn-tap').type('Hello There! ');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<p>Hello There! Initial Content</p>');
        });
    });
});
