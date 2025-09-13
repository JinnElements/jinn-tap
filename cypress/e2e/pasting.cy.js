import {
    evaluateXPath,
    evaluateXPathToBoolean,
    evaluateXPathToFirstNode,
    evaluateXPathToNodes,
    evaluateXPathToNumber,
    registerXQueryModule,
} from 'fontoxpath';
import { parseXml } from '../../src/util/util';
//import { importXml } from '../../src/util/xml';

// Some XPath assertions use the TEI namespace
const namespaceResolver = (prefix) => {
    return { tei: 'http://www.tei-c.org/ns/1.0' }[prefix];
};
describe('Tables', () => {
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

    it('can paste some paragraphs', () => {
        const testContent = '<tei-div><tei-p>Text</tei-p></tei-div>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content
            $component[0].content = testContent;
        });

        cy.get('jinn-tap').then((e) => {
            const [jinntap] = e.get();
            jinntap.editor.commands.setTextSelection({ from: 4, to: 4 });
        });

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

            const xml = new DOMParser().parseFromString(editor.xml, 'text/xml');
            const body = evaluateXPathToFirstNode('//tei:body', xml, null, null, { namespaceResolver });

            // Two rows now
            expect(body.outerHTML).to.equal(
                '<body xmlns="http://www.tei-c.org/ns/1.0"><div><p>TeA</p><p>B</p><p>Cxt</p></div></body>',
            );
        });
    });
});
