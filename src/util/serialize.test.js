import { Serializer } from './serialize.js';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('serialize', () => {
    it('closes nested marks in LIFO order before a following empty element', () => {
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

        // Stub DOM APIs used to escape text content
        globalThis.document = {
            createTextNode(value) {
                return value;
            },
        };
        globalThis.XMLSerializer = class {
            serializeToString(x) {
                return x.toString();
            }
        };

        const serializer = new Serializer(null, {
            schema: { outer: {}, inner: {}, 'empty-element-needed-for-test': {}, head: {} },
        });
        const result = serializer.serialize(input, null, null);
        assert.equal(
            result,
            '<head><outer>In the outer inline<inner>In the inner inline</inner></outer><empty-element-needed-for-test/></head>',
        );
    });
});
