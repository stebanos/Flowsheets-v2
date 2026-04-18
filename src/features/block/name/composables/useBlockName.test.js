import { ref, computed } from 'vue';
import { describe, test, expect, beforeEach, vi } from 'vitest';

const mockUpdateBlock = vi.fn();

vi.mock('@/entities/block', async () => {
    const real = await vi.importActual('@/entities/block');
    return {
        ...real,
        useBlockStore: () => ({ updateBlock: mockUpdateBlock })
    };
});

const { useBlockName } = await import('./useBlockName');

// Helpers to build the reactive arguments useBlockName expects
function makeName(initial) {
    const nameRef = ref(initial);
    return computed({
        get: () => nameRef.value,
        set: (v) => { nameRef.value = v; }
    });
}

function makeNameInput() {
    return ref({ $el: { focus: vi.fn() } });
}

beforeEach(() => {
    mockUpdateBlock.mockClear();
});

describe('saveName — no-op cases', () => {
    test('empty string does not change the name', () => {
        const name = makeName('foo');
        const { editName, saveName } = useBlockName(name, makeNameInput(), [], {});
        editName.value = '';
        saveName();
        expect(name.value).toBe('foo');
    });

    test('whitespace-only input does not change the name', () => {
        const name = makeName('foo');
        const { editName, saveName } = useBlockName(name, makeNameInput(), [], {});
        editName.value = '   ';
        saveName();
        expect(name.value).toBe('foo');
    });

    test('same name does not change the name', () => {
        const name = makeName('foo');
        const { editName, saveName } = useBlockName(name, makeNameInput(), [], {});
        editName.value = 'foo';
        saveName();
        expect(name.value).toBe('foo');
    });

    test('any no-op case still clears isEditing', () => {
        const name = makeName('foo');
        const { isEditing, editName, startEdit, saveName } = useBlockName(name, makeNameInput(), [], {});
        startEdit();
        editName.value = '';
        saveName();
        expect(isEditing.value).toBe(false);
    });
});

describe('saveName — rename', () => {
    test('updates name to the trimmed new value', () => {
        const name = makeName('foo');
        const blocks = [{ id: '1', name: 'foo', code: '' }];
        const { editName, saveName } = useBlockName(name, makeNameInput(), blocks, {});
        editName.value = '  bar  ';
        saveName();
        expect(name.value).toBe('bar');
    });

    test('deduplicates when the new name already exists', () => {
        const name = makeName('foo');
        const blocks = [
            { id: '1', name: 'foo', code: '' },
            { id: '2', name: 'bar', code: '' }
        ];
        const { editName, saveName } = useBlockName(name, makeNameInput(), blocks, {});
        editName.value = 'bar';
        saveName();
        // 'bar' is taken, so it should become 'bar_1' (or similar unique variant)
        expect(name.value).not.toBe('bar');
        expect(name.value).toMatch(/^bar/);
    });

    test('clears isEditing after a successful rename', () => {
        const name = makeName('foo');
        const { isEditing, editName, startEdit, saveName } = useBlockName(name, makeNameInput(), [], {});
        startEdit();
        editName.value = 'newName';
        saveName();
        expect(isEditing.value).toBe(false);
    });
});

describe('saveName — cascade rename', () => {
    test('calls updateBlock for blocks that reference the old name', () => {
        const name = makeName('a');
        const blocks = [
            { id: '1', name: 'a', code: '' },
            { id: '2', name: 'b', code: 'a + 1' }
        ];
        const identifiersByBlock = { b: ['a'] };
        const { editName, saveName } = useBlockName(name, makeNameInput(), blocks, identifiersByBlock);
        editName.value = 'renamed';
        saveName();
        expect(mockUpdateBlock).toHaveBeenCalledWith('2', expect.objectContaining({ code: expect.stringContaining('renamed') }));
    });

    test('skips blocks that do not reference the old name', () => {
        const name = makeName('a');
        const blocks = [
            { id: '1', name: 'a', code: '' },
            { id: '2', name: 'b', code: 'x + 1' }
        ];
        const identifiersByBlock = { b: [] }; // b does not reference a
        const { editName, saveName } = useBlockName(name, makeNameInput(), blocks, identifiersByBlock);
        editName.value = 'renamed';
        saveName();
        expect(mockUpdateBlock).not.toHaveBeenCalled();
    });

    test('does not throw when renameIdentifier fails (silent catch)', () => {
        // Force renameIdentifier to throw by giving it a block with null code
        // and ensuring identifiersByBlock claims a reference exists
        const name = makeName('a');
        const badBlock = { id: '99', name: 'b', code: null };
        const blocks = [badBlock];
        const identifiersByBlock = { b: ['a'] };
        const { editName, saveName } = useBlockName(name, makeNameInput(), blocks, identifiersByBlock);
        editName.value = 'renamed';
        expect(() => saveName()).not.toThrow();
    });
});

describe('cancelEdit', () => {
    test('clears isEditing and editName', () => {
        const name = makeName('foo');
        const { isEditing, editName, startEdit, cancelEdit } = useBlockName(name, makeNameInput(), [], {});
        startEdit();
        editName.value = 'partial';
        cancelEdit();
        expect(isEditing.value).toBe(false);
        expect(editName.value).toBe('');
    });
});
