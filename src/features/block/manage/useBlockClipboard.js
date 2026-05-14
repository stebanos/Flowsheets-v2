import { useBlockStore, generateUniqueNameFromName } from '@/entities/block';
import { generateUniqueId } from '@/shared/utils';

export function useBlockClipboard() {
    const { blocks: storeBlocks, addBlock, removeBlock } = useBlockStore();

    async function copySelected(blocks, selectedNames) {
        const selected = blocks.filter(b => selectedNames.includes(b.name));
        if (!selected.length) { return false; }

        const minX = Math.min(...selected.map(b => b.x));
        const minY = Math.min(...selected.map(b => b.y));

        const payload = {
            type: 'flowsheets/blocks',
            blocks: selected.map(b => ({ ...b, x: b.x - minX, y: b.y - minY }))
        };

        try {
            await navigator.clipboard.writeText(JSON.stringify(payload));
            return true;
        } catch {
            return false;
        }
    }

    async function cutSelected(blocks, selectedNames) {
        const ids = blocks
            .filter(b => selectedNames.includes(b.name))
            .map(b => b.id);

        const ok = await copySelected(blocks, selectedNames);
        if (!ok) { return false; }

        for (const id of ids) { removeBlock(id); }
        return true;
    }

    async function pasteBlocks({ canvasX, canvasY, canvasEl, panX, panY }) {
        let payload;
        try {
            const text = await navigator.clipboard.readText();
            payload = JSON.parse(text);
        } catch {
            return null;
        }

        if (payload?.type !== 'flowsheets/blocks') { return null; }

        const pastedBlocks = payload.blocks ?? [];
        if (!pastedBlocks.length) { return []; }

        const currentBlockNames = storeBlocks.map(b => b.name);
        const nameMap = new Map();
        const alreadyAssigned = [];

        for (const b of pastedBlocks) {
            const taken = [...currentBlockNames, ...alreadyAssigned];
            const newName = generateUniqueNameFromName(b.name, taken);
            nameMap.set(b.name, newName);
            alreadyAssigned.push(newName);
        }

        let offsetX, offsetY;
        if (canvasX != null && canvasY != null) {
            offsetX = canvasX;
            offsetY = canvasY;
        } else {
            offsetX = -panX.value + canvasEl.offsetWidth / 2;
            offsetY = -panY.value + canvasEl.offsetHeight / 2;
        }

        const newNames = [];
        for (const b of pastedBlocks) {
            const newName = nameMap.get(b.name);
            let code = b.code || '';
            for (const [oldName, mappedName] of nameMap) {
                const re = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
                code = code.replace(re, mappedName);
            }
            addBlock({
                ...b,
                id: generateUniqueId(storeBlocks.map(bl => bl.id)),
                name: newName,
                code,
                x: b.x + offsetX,
                y: b.y + offsetY
            });
            newNames.push(newName);
        }

        return newNames;
    }

    function duplicateSelected(blocks, selectedNames, { cellWidth, unitY }) {
        const selected = blocks.filter(b => selectedNames.includes(b.name));
        if (!selected.length) { return null; }

        const currentBlockNames = storeBlocks.map(b => b.name);
        const nameMap = new Map();
        const alreadyAssigned = [];

        for (const b of selected) {
            const taken = [...currentBlockNames, ...alreadyAssigned];
            const newName = generateUniqueNameFromName(b.name, taken);
            nameMap.set(b.name, newName);
            alreadyAssigned.push(newName);
        }

        const newNames = [];
        for (const b of selected) {
            const newName = nameMap.get(b.name);
            let code = b.code || '';
            for (const [oldName, mappedName] of nameMap) {
                const re = new RegExp(`\\b${oldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
                code = code.replace(re, mappedName);
            }
            addBlock({
                ...b,
                id: generateUniqueId(storeBlocks.map(bl => bl.id)),
                name: newName,
                code,
                x: Math.floor((b.x + 50) / cellWidth.value) * cellWidth.value,
                y: Math.floor((b.y + 50) / unitY.value) * unitY.value
            });
            newNames.push(newName);
        }

        return newNames;
    }

    return { copySelected, cutSelected, pasteBlocks, duplicateSelected };
}
