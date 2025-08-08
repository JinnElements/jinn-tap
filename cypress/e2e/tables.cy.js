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

    it.only('can handle tables', () => {
        const testContent =
            '<tei-table><tei-head>The title</tei-head><tei-row><tei-cell>A</tei-cell><tei-cell>B</tei-cell></tei-row><tei-row><tei-cell>C</tei-cell><tei-cell>D</tei-cell></tei-row></tei-table>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content
            $component[0].content = testContent;

            cy.get('jinn-tap').should((e) => {
                const [editor] = e.get();
                expect(editor.xml).to.equal(
                    '<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body><div><head>The title</head><table><row><cell>A</cell><cell>B</cell></row><row><cell>C</cell><cell>D</cell></row></table></div></body></text><standOff/></TEI>',
                );
            });

            $component[0].content = testContent;

            // Set the selection to in the table, around the 'A'
            $component[0].editor.commands.setTextSelection({ from: 15, to: 16 });

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

                expect(evaluateXPathToNumber('count(//*:row)', xml, null, null, namespaceResolver)).to.equal(
                    3,
                    'There should now be three rows!',
                );
            });
        });
    });

    it('can handle pb elements in tables', () => {
        const testContent =
            '<TEI xmlns="http://www.tei-c.org/ns/1.0"><teiHeader><fileDesc><titleStmt><title>Untitled Document</title></titleStmt><publicationStmt><p>Information about publication or distribution</p></publicationStmt><sourceDesc><p>Information about the source</p></sourceDesc></fileDesc></teiHeader><text><body><table cols="2" rows="2"><row><cell>A</cell><cell>B</cell></row><pb/><row><cell>C</cell><cell>D</cell></row></table></body></text><standOff/></TEI>';

        // Get the component instance
        cy.get('jinn-tap').then(($component) => {
            // Set the content

            cy.readFile('src/util/module.xq', 'utf-8').then((text) => {
                registerXQueryModule(text);

                const output = evaluateXPathToNodes(
                    `
            import module namespace jt="http://jinntec.de/jinntap";

            jt:import(.)
        `,
                    parseXml(testContent),
                    null,
                    null,
                    {
                        language: evaluateXPath.XQUERY_3_1_LANGUAGE,
                        // we want to create HTML, not XML nodes
                        nodesFactory: document,
                    },
                );
                const xmlText = [];
                output.forEach((node) => {
                    xmlText.push(node.outerHTML);
                });

                $component[0].content = xmlText.join('');
            });
        });

        cy.get('jinn-tap').should((e) => {
            const [editor] = e.get();

            const xml = new DOMParser().parseFromString(editor.xml, 'text/xml');
            const table = evaluateXPathToFirstNode('//tei:table', xml, null, null, { namespaceResolver });

            expect(evaluateXPathToNumber('count(tei:row)', table, null, null, { namespaceResolver })).to.equal(
                2,
                'There should be two rows',
            );
            expect(
                evaluateXPathToNumber('count(tei:row[1]/tei:cell)', table, null, null, {
                    namespaceResolver,
                }),
            ).to.equal(2, 'There should be two cells in the first row');
            expect(
                evaluateXPathToNumber('count(tei:row[2]/tei:cell)', table, null, null, {
                    namespaceResolver,
                }),
            ).to.equal(2, 'There should be two cells in the second row');
            expect(
                evaluateXPathToBoolean('tei:row/preceding-sibling::*[1]/self::tei:pb', table, null, null, {
                    namespaceResolver,
                }),
            ).to.equal(true, 'There should be a `pb` before the second row');

            expect(table.outerHTML).to.equal(
                '<table xmlns="http://www.tei-c.org/ns/1.0" cols="2" rows="2"><row><cell>A</cell><cell>B</cell></row><pb/><row><cell>C</cell><cell>D</cell></row></table>',
                'The full contents of the table should match',
            );
        });
    });
});
