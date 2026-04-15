<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useBlockName } from '../composables/useBlockName';
import { usePendingNameFocus } from '@/shared/composables';

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    blocks: {
        type: Array,
        required: true
    },
    identifiersByBlock: {
        type: Object,
        required: true
    }
});

const emit = defineEmits(['update:name', 'editing-change']);

const nameInput = ref(null);

const name = computed({
    get() {
        return props.name;
    },
    set(name) {
        emit('update:name', name);
    }
});

const { isEditing, editName, startEdit, saveName, cancelEdit } = useBlockName(name, nameInput, props.blocks, props.identifiersByBlock);

watch(isEditing, (val) => emit('editing-change', val));

const { consumeFocus } = usePendingNameFocus();

onMounted(() => {
    if (consumeFocus(props.name)) { startEdit(); }
});
</script>

<template>
    <div class="w-full">
        <p-input-text v-if="isEditing" ref="nameInput" v-model="editName" name="block" class="block-name-edit py-0.5 outline-none w-full text-center bg-black text-white text-[.875rem] border-white rounded-sm"
            @blur="saveName"
            @keydown.enter.prevent="saveName"
            @keydown.esc.prevent="cancelEdit"
            @mousedown.stop />
        <span v-else data-block-name class="pl-2 pr-1 cursor-default font-mono text-xs" @dblclick.stop="startEdit">
            {{ name }}
        </span>
    </div>
</template>
