import { beforeEach, describe, expect, it, vi } from 'vitest';

let useBlockSelection;

beforeEach(async () => {
    vi.resetModules();
    ({ useBlockSelection } = await import('./useBlockSelection'));
});

describe('selectOne', () => {
    it('sets selectedNames to a single-element set containing the given name', () => {
        const { selectOne, selectedNames } = useBlockSelection();
        selectOne('a');
        expect(selectedNames.value).toEqual(new Set(['a']));
    });

    it('replaces a previous selection', () => {
        const { selectOne, selectedNames } = useBlockSelection();
        selectOne('a');
        selectOne('b');
        expect(selectedNames.value).toEqual(new Set(['b']));
        expect(selectedNames.value.size).toBe(1);
    });
});

describe('toggleSelect', () => {
    it('adds the name when not currently selected', () => {
        const { selectOne, toggleSelect, selectedNames } = useBlockSelection();
        selectOne('a');
        toggleSelect('b');
        expect(selectedNames.value).toEqual(new Set(['a', 'b']));
    });

    it('removes the name when already selected', () => {
        const { selectOne, toggleSelect, selectedNames } = useBlockSelection();
        selectOne('a');
        toggleSelect('a');
        expect(selectedNames.value.size).toBe(0);
    });

    it('toggling the same block twice returns to original selection', () => {
        const { selectOne, toggleSelect, selectedNames } = useBlockSelection();
        selectOne('a');
        toggleSelect('b');
        toggleSelect('b');
        expect(selectedNames.value).toEqual(new Set(['a']));
    });
});

describe('selectAll', () => {
    it('selects all block names from the given array', () => {
        const { selectAll, selectedNames } = useBlockSelection();
        selectAll([{ name: 'a' }, { name: 'b' }]);
        expect(selectedNames.value).toEqual(new Set(['a', 'b']));
    });
});

describe('setSelection', () => {
    it('replaces the current selection with the given iterable', () => {
        const { selectOne, setSelection, selectedNames } = useBlockSelection();
        selectOne('a');
        setSelection(['b', 'c']);
        expect(selectedNames.value).toEqual(new Set(['b', 'c']));
    });
});

describe('clearSelection', () => {
    it('empties selectedNames', () => {
        const { selectOne, clearSelection, selectedNames } = useBlockSelection();
        selectOne('a');
        clearSelection();
        expect(selectedNames.value.size).toBe(0);
    });
});

describe('isSelected', () => {
    it('returns true for a name in the selection', () => {
        const { selectOne, isSelected } = useBlockSelection();
        selectOne('a');
        expect(isSelected('a')).toBe(true);
    });

    it('returns false for a name not in the selection', () => {
        const { selectOne, isSelected } = useBlockSelection();
        selectOne('a');
        expect(isSelected('b')).toBe(false);
    });
});
