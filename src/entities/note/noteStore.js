import { createEntityStore } from '@/shared/lib/entity-store';

const store = createEntityStore();

export const setBeforeMutationHook = store.setBeforeMutationHook;

export function useNoteStore() {
    return {
        notes: store.items,
        addNote: store.add,
        removeNote: store.remove,
        replaceNotes: store.replace,
        updateNote: store.update
    };
}
