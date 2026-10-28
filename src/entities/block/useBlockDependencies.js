import { reactive, shallowRef, watch } from 'vue';
import { detectStringMode, extractFreeIdentifiers, extractTemplateIdentifiers } from '@/shared/lib/evaluator';
import { useBlockStore } from './blockStore';

function _sameList(a, b) {
    return a.length === b.length && a.every((v, i) => v === b[i]);
}

export function useBlockDependencies({ debounceMs = 750 } = {}) {
    const { blocks } = useBlockStore();
    const identifiersByBlock = reactive({});
    // Both maps are updated in place and only the keys whose contents changed are
    // reassigned. Evaluators read dependsOn.value[name], so an edit to one block
    // invalidates only the evaluators whose own dependency list changed.
    const depMap = reactive({});
    const dependsOn = shallowRef(depMap);
    const parsed = new Map(); // name → { code, ids } — skip re-parsing unchanged code
    let parseTimer = null;

    function _identifiersFor(name, code) {
        const cached = parsed.get(name);
        if (cached && cached.code === code) { return cached.ids; }
        const ids = Array.from(detectStringMode(code)
            ? extractTemplateIdentifiers(code)
            : extractFreeIdentifiers(code));
        parsed.set(name, { code, ids });
        return ids;
    }

    function updateAll() {
        const nameSet = new Set(blocks.map(b => b.name));
        for (const b of blocks) {
            const ids = _identifiersFor(b.name, b.code || '');
            if (!identifiersByBlock[b.name] || !_sameList(identifiersByBlock[b.name], ids)) {
                identifiersByBlock[b.name] = ids;
            }
            const deps = ids.filter(id => nameSet.has(id) && id !== b.name);
            if (!depMap[b.name] || !_sameList(depMap[b.name], deps)) {
                depMap[b.name] = deps;
            }
        }

        for (const k of Object.keys(identifiersByBlock)) {
            if (nameSet.has(k)) { continue; }
            delete identifiersByBlock[k];
            delete depMap[k];
            parsed.delete(k);
        }
    }

    watch(
        () => blocks.map(b => ({ code: b.code, name: b.name })),
        () => {
            if (debounceMs === 0) {
                updateAll();
                return;
            }
            if (parseTimer) { clearTimeout(parseTimer); }
            parseTimer = setTimeout(() => {
                updateAll();
                parseTimer = null;
            }, debounceMs);
        },
        { deep: true, immediate: true }
    );

    return {
        identifiersByBlock,
        dependsOn
    };
}
