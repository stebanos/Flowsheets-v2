import { reactive } from 'vue';

export function createEntityStore() {
    const items = reactive([]);

    let _beforeMutation = null;

    function setBeforeMutationHook(fn) {
        _beforeMutation = fn;
    }

    function add(item, tag) {
        _beforeMutation?.(tag ?? null);
        items.push(item);
    }

    function remove(id, tag) {
        const idx = items.findIndex(i => i.id === id);
        if (idx !== -1) {
            _beforeMutation?.(tag ?? null);
            items.splice(idx, 1);
        }
    }

    function update(id, patch, tag) {
        const item = items.find(i => i.id === id);
        if (item) {
            _beforeMutation?.(tag ?? null);
            Object.assign(item, patch);
        }
    }

    function replace(next, tag) {
        _beforeMutation?.(tag ?? null);
        const newById = new Map(next.map(i => [i.id, i]));
        for (let i = items.length - 1; i >= 0; i--) {
            if (!newById.has(items[i].id)) { items.splice(i, 1); }
        }
        for (const existing of items) {
            const incoming = newById.get(existing.id);
            for (const key of Object.keys(existing)) {
                if (!(key in incoming)) { delete existing[key]; }
            }
            Object.assign(existing, incoming);
            newById.delete(existing.id);
        }
        for (const item of newById.values()) { items.push(item); }
    }

    return { items, add, remove, update, replace, setBeforeMutationHook };
}
