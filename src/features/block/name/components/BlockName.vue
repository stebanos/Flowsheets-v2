<script setup>
import { ref, computed, onMounted } from 'vue';
import { useBlockName } from '../composables/useBlockName';
import { usePendingNameFocus } from '../composables/usePendingNameFocus';

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

const emit = defineEmits(['update:name']);

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

const { pendingFocusBlockName } = usePendingNameFocus();

onMounted(() => {
    if (pendingFocusBlockName.value === props.name) {
        pendingFocusBlockName.value = null;
        startEdit();
    }
});
</script>

<template>
    <div>
        <p-input-text v-if="isEditing" ref="nameInput" v-model="editName" name="block" class="block-name-edit py-0.5 outline-none w-full text-center bg-black text-white text-[.875rem] border-white rounded-sm"
            @blur="saveName"
            @keydown.enter.prevent="saveName"
            @keydown.esc.prevent="cancelEdit"
            @mousedown.stop />
        <span v-else class="px-1 cursor-default" @dblclick.stop="startEdit">
            {{ name }}
        </span>
    </div>
</template>
