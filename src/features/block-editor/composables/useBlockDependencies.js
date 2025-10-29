import { reactive, computed, watch } from 'vue';
import { useBlocks } from '.';
import { extractFreeIdentifiers } from '../utils/ast';

export function useBlockDependencies({ debounceMs = 750 } = {}) {
    const { blocks } = useBlocks();
    const identifiersByBlock = reactive({});
    let parseTimer = null;

    function updateAll() {
        const nameSet = new Set(blocks.map(b => b.name));
        for (const b of blocks) {
            const code = b.code || '';
            const ids = new Set(extractFreeIdentifiers(code));
            identifiersByBlock[b.name] = Array.from(ids);
        }

        for (const k of Object.keys(identifiersByBlock)) {
            if (!nameSet.has(k)) { delete identifiersByBlock[k]; }
        }
    }

    watch(
        () => blocks.map(b => ({code: b.code, name: b.name})),
        () => {
            if (parseTimer) { clearTimeout(parseTimer); }
            parseTimer = setTimeout(() => {
                updateAll();
                parseTimer = null;
            }, debounceMs);
        },
        { deep: true, immediate: true }
    );

    const dependsOn = computed(() => {
        const map = {};
        const names = new Set(blocks.map(b => b.name));
        for (const b of blocks) {
            const myName = b.name;
            const ids = identifiersByBlock[myName] || [];
            map[myName] = ids.filter(id => names.has(id) && id !== myName);
        }
        return map;
    });

    return {
        identifiersByBlock,
        dependsOn
    };
}
