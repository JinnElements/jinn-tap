describe('JinnTap Component (DocBook format)', () => {
    beforeEach(() => {
        cy.visit('/test/docbook-test.html');

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

    it('creates a new DocBook article skeleton', () => {
        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('xmlns="http://docbook.org/ns/docbook"');
            expect(editor.xml).to.include('<info>');
            expect(editor.xml).to.include('<section>');
            expect(editor.xml).to.include('<para');
        });
    });

    it('should set content and emit content-change event with correct XML', () => {
        const testContent = '<db-section><db-para>Hello world!</db-para></db-section>';

        cy.get('jinn-tap').then(($component) => {
            const contentChangeSpy = cy.spy().as('contentChangeSpy');
            $component[0].addEventListener('content-change', contentChangeSpy);

            $component[0].content = testContent;

            cy.get('@contentChangeSpy')
                .should('have.been.called')
                .then((spy) => {
                    const eventDetail = spy.getCall(0).args[0].detail;

                    expect(eventDetail.body).to.be.xml;
                    expect(eventDetail.body).to.equal('<section><para>Hello world!</para></section>');
                });
        });
    });

    it('handles nested marks', () => {
        const testContent =
            '<db-section><db-para><db-emphasis>Rudi</db-emphasis> <db-emphasis role="bold">Ruessel</db-emphasis></db-para></db-section>';

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
                        '<section><para><emphasis>Rudi</emphasis> <emphasis role="bold">Ruessel</emphasis></para></section>',
                    );
                });
        });
    });

    it('treats note as an admonition block, not a footnote', () => {
        const testContent =
            '<db-section><db-para>Intro</db-para><db-note><db-para>A callout</db-para></db-note></db-section>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<note>');
            expect(editor.xml).to.include('<para>A callout</para>');
            expect(editor.xml).to.not.include('<footnote');
            expect(editor.xml).to.not.include('listAnnotation');
            expect(editor.xml).to.not.include('fn-group');
        });

        cy.get('jinn-tap db-note').should('exist');
    });

    it('round-trips xml:id and preserves info metadata', () => {
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" xmlns:xlink="http://www.w3.org/1999/xlink" version="5.0">
  <info><title>Meta Title</title><author><orgname>JinnTap</orgname></author></info>
  <section xml:id="intro"><title>Intro</title><para>Hello</para></section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('xml:id="intro"');
            expect(editor.xml).to.include('<info>');
            expect(editor.xml).to.include('Meta Title');
            expect(editor.xml).to.include('<orgname>JinnTap</orgname>');
            expect(editor.xml).to.include('<para>Hello</para>');
        });
    });

    it('flattens figures on import and rebuilds mediaobject on export', () => {
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>Figs</title></info>
  <section>
    <title>S</title>
    <figure>
      <title>Caption</title>
      <mediaobject>
        <imageobject>
          <imagedata fileref="diagram.png" width="512px"/>
        </imageobject>
      </mediaobject>
    </figure>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap db-figure img').should('exist');
        cy.get('jinn-tap db-mediaobject').should('not.exist');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<mediaobject>');
            expect(editor.xml).to.include('<imageobject>');
            expect(editor.xml).to.include('fileref="diagram.png"');
            expect(editor.xml).to.include('<title>Caption</title>');
        });
    });

    it('maps informaltable to editor table and back', () => {
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>Tables</title></info>
  <section>
    <title>S</title>
    <informaltable>
      <thead><tr><td>A</td><td>B</td></tr></thead>
      <tbody><tr><td>C</td><td>D</td></tr></tbody>
    </informaltable>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap table td').should('have.length.at.least', 4);

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<informaltable>');
            expect(editor.xml).to.include('<tbody>');
            expect(editor.xml).to.include('<tr>');
            expect(editor.xml).to.include('<td>A</td>');
            expect(editor.xml).to.include('<td>D</td>');
        });
    });

    it('warns when schema-invalid nesting is present in imported HTML', () => {
        // para only allows inline*; a nested note is illegal in the schema even
        // though ProseMirror may lift it into a sibling rather than drop it.
        const testContent =
            '<db-section><db-para>Before<db-note><db-para>Moved</db-para></db-note> after</db-para></db-section>';

        cy.get('jinn-tap').then(($component) => {
            const errorSpy = cy.spy().as('contentErrorSpy');
            $component[0].addEventListener('content-error', errorSpy);
            $component[0].content = testContent;

            cy.get('@contentErrorSpy')
                .should('have.been.called')
                .then((spy) => {
                    const detail = spy.getCall(0).args[0].detail;
                    expect(detail.message).to.match(/does not match the schema/i);
                    expect(detail.violations?.some((v) => v.parent === 'para' && v.child === 'note')).to.equal(
                        true,
                    );
                });
        });
    });

    it('exports xmlns:xlink when the body contains links', () => {
        const testContent =
            '<db-section><db-para><db-link xlink:href="https://docbook.org/">DocBook</db-link></db-para></db-section>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            const articleOpen = editor.xml.match(/<article\b[^>]*>/)?.[0] || '';
            expect(articleOpen).to.include('xmlns:xlink="http://www.w3.org/1999/xlink"');
            expect(editor.xml).to.include('xlink:href="https://docbook.org/"');
            // Do not re-declare xmlns:xlink on each link
            expect(editor.xml).to.not.match(/<link[^>]*xmlns:xlink=/);
            // Round-trip must parse again
            editor.xml = editor.xml;
            expect(editor.xml).to.include('xlink:href="https://docbook.org/"');
            expect(editor.xml.match(/<article\b[^>]*>/)?.[0] || '').to.include(
                'xmlns:xlink="http://www.w3.org/1999/xlink"',
            );
        });
    });

    it('round-trips synopsis@language', () => {
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>S</title></info>
  <section>
    <title>T</title>
    <synopsis language="css">margin: 1rem;</synopsis>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.match(/<synopsis[^>]*language="css"/);
        });
    });

    it('preserves whitespace in programlisting without xml:space', () => {
        const listing = '{\n  "a": 1,\n  "b": 2\n}';
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>WS</title></info>
  <section>
    <title>S</title>
    <programlisting language="json">${listing.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</programlisting>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap db-programlisting').should(($el) => {
            expect($el.text()).to.equal(listing);
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('xml:space="preserve"');
            expect(editor.xml).to.match(/programlisting[^>]*>\{\n {2}"a": 1,\n {2}"b": 2\n\}/);
        });
    });

    it('preserves whitespace in programlisting with xml:space=preserve', () => {
        const listing = '{\n  "a": 1,\n  "b": 2\n}';
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>WS</title></info>
  <section>
    <title>S</title>
    <programlisting language="json" xml:space="preserve">${listing.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</programlisting>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap db-programlisting').should(($el) => {
            expect($el.text()).to.equal(listing);
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('xml:space="preserve"');
            expect(editor.xml).to.match(/programlisting[^>]*>\{\n {2}"a": 1,\n {2}"b": 2\n\}/);
        });
    });

    it('imports programlisting CDATA sections without failing', () => {
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" version="5.0">
  <info><title>CDATA</title></info>
  <section>
    <title>S</title>
    <programlisting language="xml" xml:space="preserve"><![CDATA[<para>raw & markup</para>]]></programlisting>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            expect(editor.xml).to.include('<programlisting');
            expect(editor.xml).to.include('&lt;para&gt;raw &amp; markup&lt;/para&gt;');
        });
        cy.get('jinn-tap db-programlisting').should('contain.text', '<para>raw & markup</para>');
    });

    it('escapes ampersands in attribute values on export', () => {
        const href = 'http://example.org/?a=1&b=2';
        const doc = `<?xml version="1.0"?>
<article xmlns="http://docbook.org/ns/docbook" xmlns:xlink="http://www.w3.org/1999/xlink" version="5.0">
  <info><title>Attrs</title></info>
  <section>
    <title>S</title>
    <para><link xlink:href="${href.replace(/&/g, '&amp;')}">see</link></para>
  </section>
</article>`;

        cy.get('jinn-tap').then(($component) => {
            $component[0].xml = doc;
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();
            // Must re-escape & so the export fragment is well-formed XML
            expect(editor.xml).to.include('xlink:href="http://example.org/?a=1&amp;b=2"');
            expect(editor.xml).to.not.match(/xlink:href="[^"]*&(?!amp;|lt;|gt;|quot;|apos;|#)/);
        });
    });

    it('handles characters that can be invalid in XML', () => {
        const testContent = '<db-section><db-para></db-para></db-section>';

        cy.get('jinn-tap').then(($component) => {
            $component[0].content = testContent;
        });

        cy.get('jinn-tap .ProseMirror').type('I <3 the & character');

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            expect(editor.xml).to.include('<article');
            expect(editor.xml).to.include('<para>I &lt;3 the &amp; character</para>');
        });
    });
});
