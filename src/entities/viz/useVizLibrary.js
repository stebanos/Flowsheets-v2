import { reactive } from 'vue';
import { getHash } from '@/shared/lib/hash';

const library = reactive({});

async function _write() {
    const root = await navigator.storage.getDirectory();
    const handle = await root.getFileHandle('system-vizes.json', { create: true });
    const writable = await handle.createWritable();
    const data = {};
    for (const [name, entry] of Object.entries(library)) {
        data[name] = { hash: entry.hash, source: entry.source };
    }
    await writable.write(JSON.stringify(data));
    await writable.close();
}

export function useVizLibrary() {
    async function loadLibrary() {
        try {
            const root = await navigator.storage.getDirectory();
            const handle = await root.getFileHandle('system-vizes.json');
            const file = await handle.getFile();
            const text = await file.text();
            const data = JSON.parse(text);
            for (const key of Object.keys(library)) { delete library[key]; }
            for (const [name, entry] of Object.entries(data)) {
                library[name] = { hash: entry.hash, source: entry.source };
            }
        } catch {
            for (const key of Object.keys(library)) { delete library[key]; }
        }
    }

    function createLibraryEntry(name) {
        library[name] = { hash: null, source: null };
        _write();
    }

    async function saveLibraryEntry(name, source) {
        const hash = await getHash(source);
        library[name] = { hash, source: { ...source } };
        await _write();
        return hash;
    }

    function deleteLibraryEntry(name) {
        delete library[name];
        _write();
    }

    function renameLibraryEntry(oldName, newName) {
        if (!library[oldName] || library[newName]) { return false; }
        const entries = Object.entries(library).map(([k, v]) => [k === oldName ? newName : k, v]);
        for (const key of Object.keys(library)) { delete library[key]; }
        for (const [k, v] of entries) { library[k] = v; }
        _write();
        return true;
    }

    return { library, loadLibrary, createLibraryEntry, saveLibraryEntry, deleteLibraryEntry, renameLibraryEntry };
}
