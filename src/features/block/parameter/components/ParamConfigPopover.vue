<script setup>
import { computed, ref } from 'vue';
import { useBlockStore } from '@/entities/block';
import { WIDGET_TYPES } from '../widget-types';

const props = defineProps({
    block: {
        type: Object,
        required: true
    },
    hasDependencies: {
        type: Boolean,
        default: false
    }
});

const emit = defineEmits(['close']);

const { updateBlock } = useBlockStore();

function initialFields(param) {
    const fields = {};
    for (const [widget, def] of Object.entries(WIDGET_TYPES)) {
        for (const field of def.configFields) {
            const current = param?.widget === widget ? param[field.key] : undefined;
            const value = current ?? field.default;
            fields[field.key] = field.type === 'list' ? value.join('\n') : String(value);
        }
    }
    return fields;
}

const widget = ref(props.block.param?.widget ?? 'slider');
const fields = ref(initialFields(props.block.param));

const widgetOptions = Object.entries(WIDGET_TYPES).map(([value, def]) => ({ value, label: def.label }));
const activeFields = computed(() => WIDGET_TYPES[widget.value].configFields);
const isEditing = computed(() => props.block.param != null);

function parseList(text) {
    return text.split('\n').map(s => s.trim()).filter(s => s !== '');
}

const param = computed(() => {
    const out = { widget: widget.value };
    for (const field of activeFields.value) {
        const raw = fields.value[field.key];
        out[field.key] = field.type === 'list' ? parseList(raw) : Number(raw);
    }
    return out;
});

const isValid = computed(() => {
    const p = param.value;
    if (p.widget === 'slider') {
        return [p.min, p.max, p.step].every(Number.isFinite) && p.min < p.max && p.step > 0;
    }
    if (p.widget === 'options') { return p.options.length > 0; }
    return true;
});

function onSave() {
    if (!isValid.value) { return; }
    updateBlock(props.block.id, { param: param.value, editorCollapsed: true });
    emit('close');
}

function onRemove() {
    updateBlock(props.block.id, { param: null, editorCollapsed: false });
    emit('close');
}
</script>

<template>
    <div class="param-config-popover w-56 bg-white text-gray-800 border border-gray-300 rounded shadow-lg text-[12px] p-2 flex flex-col gap-2"
         @mousedown.stop>
        <div class="text-[10px] uppercase tracking-wide text-gray-500">
            {{ isEditing ? 'Edit parameter' : 'Make parameter' }}
        </div>
        <label class="flex flex-col gap-1">
            <span class="text-gray-600">Widget</span>
            <p-select v-model="widget"
                class="param-widget-select"
                size="small"
                append-to="self"
                :options="widgetOptions"
                option-label="label"
                option-value="value" />
        </label>
        <label v-for="field in activeFields" :key="field.key" class="flex flex-col gap-1">
            <span class="text-gray-600">{{ field.label }}</span>
            <p-textarea v-if="field.type === 'list'"
                v-model="fields[field.key]"
                :data-field="field.key"
                rows="4"
                class="text-[12px]!" />
            <p-input-text v-else
                v-model="fields[field.key]"
                :data-field="field.key"
                type="number"
                size="small" />
        </label>
        <div v-if="hasDependencies" class="param-deps-warning text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-1">
            This block has dependencies — using the widget will replace this block's code.
        </div>
        <div class="flex items-center gap-1 justify-end">
            <p-button v-if="isEditing" class="param-remove mr-auto" label="Remove" size="small" severity="danger" text @click="onRemove" />
            <p-button class="param-cancel" label="Cancel" size="small" severity="secondary" text @click="emit('close')" />
            <p-button class="param-save" label="Save" size="small" :disabled="!isValid" @click="onSave" />
        </div>
    </div>
</template>
