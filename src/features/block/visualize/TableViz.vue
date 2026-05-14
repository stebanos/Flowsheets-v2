<script setup>
import { computed } from 'vue';

const props = defineProps({
    value: {},
    error: { type: String, default: null }
});

function renderCell(v) {
    if (v === null || v === undefined) { return '—'; }
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
    if (typeof v === 'number' && !Number.isInteger(v)) { return v.toFixed(3); }
    return String(v);
}

function renderTitle(v) {
    if (v === null || v === undefined) { return '—'; }
    if (typeof v === 'object') { try { return JSON.stringify(v); } catch { return String(v); } }
    return String(v);
}

const tableData = computed(() => {
    const v = props.value;
    if (!Array.isArray(v) || v.length === 0) { return null; }

    const first = v[0];

    if (Array.isArray(first)) {
        const maxCols = Math.max(...v.map(row => Array.isArray(row) ? row.length : 0));
        const headers = Array.from({ length: maxCols }, (_, i) => String(i));
        const rows = v.map(row =>
            headers.map((_, i) => {
                const raw = Array.isArray(row) ? row[i] : undefined;
                return { display: Array.isArray(row) ? renderCell(raw) : '—', title: renderTitle(raw) };
            })
        );
        return { headers, rows };
    }

    if (first !== null && typeof first === 'object') {
        const headers = Object.keys(first);
        const rows = v.map(row =>
            headers.map(key => ({ display: renderCell(row?.[key]), title: renderTitle(row?.[key]) }))
        );
        return { headers, rows };
    }

    const rows = v.map(item => [{ display: renderCell(item), title: renderTitle(item) }]);
    return { headers: ['value'], rows };
});
</script>

<template>
    <div class="h-full overflow-y-hidden hover:overflow-y-auto" @wheel.stop>
        <div v-if="error" class="px-2 py-1 text-red-600 text-[13px] font-mono">{{ error }}</div>
        <div v-else-if="!tableData" class="px-2 py-1 text-gray-400 text-[12px] font-mono italic">not an array</div>
        <table v-else class="w-full table-fixed border-collapse text-[12px] font-mono">
            <thead>
                <tr>
                    <th v-for="header in tableData.headers" :key="header"
                        class="sticky top-0 px-2 py-0.5 leading-4 text-left text-[10px] tracking-wide text-gray-500 bg-gray-100 border-b border-gray-200 font-semibold truncate">
                        {{ header }}
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="(row, i) in tableData.rows" :key="i" class="border-b border-gray-100 last:border-0">
                    <td v-for="(cell, j) in row" :key="j"
                        class="px-2 py-0.5 leading-4 text-gray-700 truncate"
                        :title="cell.title">{{ cell.display }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>
