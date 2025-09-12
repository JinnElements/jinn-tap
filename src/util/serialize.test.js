import { Serializer } from './serialize.js';
import { describe, it } from 'node:test';

describe('serialize', () => {
    it('can roundtrip oddly nested marks', (t) => {
        const input = {
            type: 'head',
            attrs: { rend: null, id: null, type: null, n: null },
            content: [
                {
                    type: 'text',
                    marks: [{ type: 'outer' }],
                    text: 'In the outer inline',
                },
                {
                    type: 'text',
                    marks: [{ type: 'outer' }, { type: 'inner' }],
                    text: 'In the inner inline',
                },
                {
                    type: 'empty-element-needed-for-test',
                },
            ],
        };

        // Stub some things needed for serialization
        global.document = {
            createTextNode(value) {
                return value;
            },
        };
        global.XMLSerializer = class {
            serializeToString(x) {
                return x.toString();
            }
        };
        const serializer = new Serializer(null, {
            schema: { outer: {}, inner: {}, 'empty-element-needed-for-test': {}, head: {} },
        });
        const result = serializer.serialize(input, null, null);
        t.assert.equal(
            result,
            '<head><outer>In the outer inline<inner>In the inner inline</inner></outer><empty-element-needed-for-test/></head>',
        );
    });
});
