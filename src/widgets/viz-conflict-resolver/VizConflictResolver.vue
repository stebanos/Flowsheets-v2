<script setup>
import { computed, ref } from 'vue';

const props = defineProps({
    conflict: {
        type: Object,
        required: true
    },
    systemVizNames: {
        type: Array,
        required: true
    }
});

const emit = defineEmits(['resolve']);

const remapTarget = ref(null);
const showRemapSelect = ref(false);

const remapOptions = computed(() =>
    props.systemVizNames
        .filter(n => n !== props.conflict.importedName)
        .map(n => ({ label: n, value: n }))
);

function keepSystem() {
    emit('resolve', { action: 'use-system' });
}

function addAsNew() {
    emit('resolve', { action: 'add-as-new' });
}

function openRemap() {
    remapTarget.value = remapOptions.value[0]?.value ?? null;
    showRemapSelect.value = true;
}

function confirmRemap() {
    if (!remapTarget.value) { return; }
    emit('resolve', { action: 'remap', targetName: remapTarget.value });
}

function cancelRemap() {
    showRemapSelect.value = false;
    remapTarget.value = null;
}
</script>

<template>
    <div class="conflict-resolver">
        <h3 class="conflict-title">Viz conflict: {{ conflict.importedName }}</h3>
        <div class="columns">
            <div class="column">
                <div class="column-header">System version</div>
                <div v-for="panel in ['template', 'script', 'style']" :key="panel" class="panel-block">
                    <div class="panel-label">{{ panel }}</div>
                    <pre class="panel-code">{{ conflict.systemEntry.source?.[panel] ?? '' }}</pre>
                </div>
            </div>
            <div class="column">
                <div class="column-header">Imported version</div>
                <div v-for="panel in ['template', 'script', 'style']" :key="panel" class="panel-block">
                    <div class="panel-label">{{ panel }}</div>
                    <pre class="panel-code">{{ conflict.importedEntry.source?.[panel] ?? '' }}</pre>
                </div>
            </div>
        </div>
        <div class="actions">
            <p-button label="Keep system version" severity="secondary" @click="keepSystem" />
            <p-button label="Add as new" severity="secondary" @click="addAsNew" />
            <template v-if="!showRemapSelect">
                <p-button label="Remap to…" severity="secondary" @click="openRemap" />
            </template>
            <template v-else>
                <p-select
                    v-model="remapTarget"
                    :options="remapOptions"
                    option-label="label"
                    option-value="value"
                    placeholder="Select a viz"
                    class="remap-select"
                />
                <p-button label="Confirm remap" :disabled="!remapTarget" @click="confirmRemap" />
                <p-button label="Cancel" severity="secondary" text @click="cancelRemap" />
            </template>
        </div>
    </div>
</template>

<style scoped>
.conflict-resolver {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

.conflict-title {
    font-size: 0.9375rem;
    font-weight: 600;
    color: #111827;
    margin: 0;
}

.columns {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
}

.column {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
}

.column-header {
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6b7280;
    padding-bottom: 0.25rem;
    border-bottom: 1px solid #e5e7eb;
}

.panel-block {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
}

.panel-label {
    font-size: 0.6875rem;
    font-weight: 500;
    color: #9ca3af;
    text-transform: capitalize;
}

.panel-code {
    margin: 0;
    padding: 0.5rem;
    background: #f9fafb;
    border: 1px solid #e5e7eb;
    border-radius: 4px;
    font-size: 0.6875rem;
    font-family: ui-monospace, 'SFMono-Regular', Menlo, monospace;
    line-height: 1.5;
    overflow-x: auto;
    white-space: pre;
    color: #374151;
    max-height: 10rem;
    overflow-y: auto;
}

.actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
}

.remap-select {
    min-width: 10rem;
}
</style>
