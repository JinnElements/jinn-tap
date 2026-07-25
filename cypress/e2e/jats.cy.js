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

        cy.get('jinn-tap .ProseMirror').type('I <3 the & character');

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

        cy.get('jinn-tap[block-typing] .ProseMirror')
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

        cy.get('jinn-tap .ProseMirror').type('Hello There! ');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<p>Hello There! Initial Content</p>');
        });
    });

    it('creates a footnote with bare rid pointing at fn id', () => {
        const testContent = '<jats-sec><jats-p>Hello world!</jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').then(($component) => {
            const editor = $component[0].editor;
            editor.chain().focus().setTextSelection({ from: 2, to: 2 }).addAnchor({ 'ref-type': 'fn' }).run();
        });

        cy.get('jinn-tap').should((e) => {
            const [component] = e.get();
            const xml = component.xml;
            expect(xml).to.match(/<xref[^>]*ref-type="fn"[^>]*rid="[^#"]+"/);
            expect(xml).to.not.match(/rid="#[^"]+"/);
            const ridMatch = xml.match(/rid="([^"]+)"/);
            expect(xml).to.match(new RegExp(`<fn[^>]*\\sid="${ridMatch[1]}"`));
            expect(xml).to.not.match(/<fn[^>]*xml:id=/);
        });
    });

    it('reconnects an orphaned fn by setting xref rid to the fn id', () => {
        // Orphaned fn (no xref pointing at it) — inserting a new xref should pick up fn.id
        const testContent =
            '<jats-sec><jats-p>Hello world!</jats-p></jats-sec>' +
            '<jats-fnGroup><jats-fn id="fn-orphan"><jats-p>Orphaned note</jats-p></jats-fn></jats-fnGroup>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').then(($component) => {
            const editor = $component[0].editor;
            editor.chain().focus().setTextSelection({ from: 2, to: 2 }).addAnchor({ 'ref-type': 'fn' }).run();
        });

        cy.get('jinn-tap').should((e) => {
            const [component] = e.get();
            const xml = component.xml;
            expect(xml).to.match(/rid="fn-orphan"/);
            expect(xml).to.not.match(/rid="#fn-orphan"/);
            // Still only one fn — must not have created a second note
            const fnCount = (xml.match(/<fn[\s>]/g) || []).length;
            expect(fnCount).to.equal(1);
            expect(xml).to.include('Orphaned note');
        });
    });

    it('round-trips footnotes through xml export/import without breaking rid', () => {
        const testContent = '<jats-sec><jats-p>Hello world!</jats-p></jats-sec>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').then(($component) => {
            const editor = $component[0].editor;
            editor.chain().focus().setTextSelection({ from: 2, to: 2 }).addAnchor({ 'ref-type': 'fn' }).run();
        });

        cy.get('jinn-tap').then(($component) => {
            const xml = $component[0].xml;
            const rid = xml.match(/rid="([^"]+)"/)[1];
            // Simulate IndexedDB restore
            $component[0].xml = xml;
            cy.wrap(null).then(() => {
                const restored = $component[0].xml;
                expect(restored).to.match(new RegExp(`rid="${rid}"`));
                expect(restored).to.match(new RegExp(`<fn[^>]*\\sid="${rid}"`));
                expect(restored).to.not.match(/<fn[^>]*xml:id=/);
            });
        });
    });
});
