import { Extension, textInputRule } from '@tiptap/core';

const emdash = textInputRule({
    find: /---|–-/,
    replace: '—',
});

const endash = textInputRule({
    find: /--(?!-)/,
    replace: '–',
});

export const InputRules = Extension.create({
    name: 'inputRules',

    addInputRules() {
        return [emdash, endash];
    },
});
