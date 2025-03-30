describe('JinnTap Component', () => {
    beforeEach(() => {
        cy.visit('/')

        // Wait for the component to be defined
        cy.window().then((win) => {
            expect(win.customElements.get('jinn-tap')).to.not.be.undefined
        })

        // Wait for the component to be connected
        cy.get('jinn-tap', { timeout: 10000 })
            .should('exist')
            .then(($component) => {
                return new Cypress.Promise((resolve) => {
                    const checkConnected = () => {
                        if ($component[0].isConnected) {
                            resolve()
                        } else {
                            setTimeout(checkConnected, 100)
                        }
                    }
                    checkConnected()
                })
            })
            .then(() => {
                // Log the component state
                cy.log('Component connected, checking editor state...')
            })
    })

    it('should set content and emit content-change event with correct XML', () => {
        const testContent = '<tei-div><tei-p>Hello world!</tei-p></tei-div>'

        // Get the component instance
        cy.get('jinn-tap')
            .then(($component) => {
                // Create a spy for the content-change event
                const contentChangeSpy = cy.spy().as('contentChangeSpy')

                // Add event listener for content-change event
                $component[0].addEventListener('content-change', contentChangeSpy)

                // Set the content
                $component[0].content = testContent

                // Wait for the content-change event
                cy.get('@contentChangeSpy')
                    .should('have.been.called')
                    .then((spy) => {
                        // Get the event detail from the spy
                        const eventDetail = spy.getCall(0).args[0].detail

                        // Compare XML using chai-xml
                        expect(eventDetail.xml).to.be.xml
                        expect(eventDetail.xml).to.equal('<div><p>Hello world!</p></div>')
                    })
            })
    })

    it('should apply bold formatting to selected text', () => {
        const testContent = '<tei-div><tei-p>Hello world!</tei-p></tei-div>'

        // Get the component instance
        cy.get('jinn-tap')
            .then(($component) => {
                // Create a spy for the content-change event
                const contentChangeSpy = cy.spy().as('contentChangeSpy')

                // Add event listener for content-change event
                $component[0].addEventListener('content-change', contentChangeSpy)

                // Get the editor instance
                const editor = $component[0].editor

                // Select the word "world" using proper TipTap commands
                editor.chain()
                    .setContent(testContent)
                    .setTextSelection({ from: 8, to: 13 })
                    .focus()
                    .run()

                // Log the selection state
                cy.log('Selection:', editor.state.selection)

                // Click the bold button
                cy.get('jinn-tap .toolbar-button[title="Bold"]').click()

                // Wait for the content-change event to be called twice
                cy.get('@contentChangeSpy')
                    .should('have.been.calledTwice')
                    .then((spy) => {
                        // Get the event detail from the second call
                        const eventDetail = spy.getCall(1).args[0].detail

                        // Log the XML after formatting
                        cy.log('XML after formatting:', eventDetail.xml)

                        // Compare XML using chai-xml
                        expect(eventDetail.xml).to.be.xml
                        expect(eventDetail.xml).to.equal('<div><p>Hello <hi rend="b">world</hi>!</p></div>')
                    })
            })

    })
}) 