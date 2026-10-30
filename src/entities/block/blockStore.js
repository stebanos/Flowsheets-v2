import { createEntityStore } from '@/shared/lib/entity-store';

const store = createEntityStore();

export const setBeforeMutationHook = store.setBeforeMutationHook;

export function useBlockStore() {
    return {
        blocks: store.items,
        addBlock: store.add,
        removeBlock: store.remove,
        replaceBlocks: store.replace,
        updateBlock: store.update
    };
}
