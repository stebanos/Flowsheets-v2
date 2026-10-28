import { reactive, ref } from 'vue';
import { getHash } from '@/shared/lib/hash';

const library = reactive({});
// Set when the stored library exists but could not be read. Writes are paused until a
// successful load, so a transient or parse failure never ends in the file being replaced.
const loadError = ref(null);

async function _write() {
    if (loadError.value) { return; }
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
        let data = {};
        try {
            const root = await navigator.storage.getDirectory();
            const handle = await root.getFileHandle('system-vizes.json');
            const file = await handle.getFile();
            const text = await file.text();
            data = JSON.parse(text);
        } catch (err) {
            if (err?.name !== 'NotFoundError') {
                loadError.value = `The custom visualization library could not be loaded (${err.message}). Changes to it will not be saved until it loads.`;
                return;
            }
        }
        loadError.value = null;
        for (const key of Object.keys(library)) { delete library[key]; }
        for (const [name, entry] of Object.entries(data)) {
            library[name] = { hash: entry.hash, source: entry.source };
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

    return { library, loadError, loadLibrary, createLibraryEntry, saveLibraryEntry, deleteLibraryEntry, renameLibraryEntry };
}
