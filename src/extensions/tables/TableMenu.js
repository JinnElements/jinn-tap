export class TableMenu {
    /**
     * @param {import('../../jinn-tap').JinnTap} editor - The editor instance.
     */
    constructor(editor) {
        this.tableMenu = editor.querySelector('.table-menu ul');

        const commands = [
            {
                name: 'Insert Column',
                icon: 'vr',
                cb: () => {
                    editor.tiptap.commands.addColumnAfter();
                },
            },
            {
                name: 'Delete Column',
                icon: 'trash',
                cb: () => {
                    editor.tiptap.commands.deleteColumn();
                },
            },
            'divider',
            {
                name: 'Insert Row',
                icon: 'hr',
                cb: () => {
                    editor.tiptap.commands.addRowAfter();
                },
            },
            {
                name: 'Delete Row',
                icon: 'trash',
                cb: () => {
                    editor.tiptap.commands.deleteRow();
                },
            },
            'divider',
            {
                name: 'Merge',
                icon: 'intersect',
                cb: () => {
                    editor.tiptap.commands.mergeCells();
                },
            },
            {
                name: 'Split',
                icon: 'subtract',
                cb: () => {
                    editor.tiptap.commands.splitCell();
                },
            },
        ];

        for (const command of commands) {
            const li = document.createElement('li');
            this.tableMenu.appendChild(li);

            if (command === 'divider') {
                const divider = document.createElement('span');
                divider.classList.add('divider');
                li.appendChild(divider);

                continue;
            }
            const button = document.createElement('a');
            li.appendChild(button);
            button.classList.add('outline');
            button.classList.add('toolbar-button');
            if (command.icon) {
                const i = button.appendChild(document.createElement('i'));
                i.classList.add('bi', `bi-${command.icon}`);
                button.setAttribute('data-tooltip', command.name);
            } else {
                button.innerText = command.name;
            }
            button.addEventListener('click', command.cb);
        }
    }
}
