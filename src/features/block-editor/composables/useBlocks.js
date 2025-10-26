import { reactive } from 'vue';

const blocks = reactive([]);

export function useBlocks() {
    return {
        blocks
    };
}
