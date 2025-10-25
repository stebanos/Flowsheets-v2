<script setup>
import { ref, computed } from 'vue';
import { useBlockName } from '../composables';

const props = defineProps({
    name: {
        type: String,
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

const { isEditing, editName, startEdit, saveName, cancelEdit } = useBlockName(name, nameInput);
</script>

<template>
    <div>
        <input v-if="isEditing" ref="nameInput" v-model="editName" class="px-2 py-0.5 rounded outline-none"
            @blur="saveName"
            @keydown.enter.prevent="saveName"
            @keydown.esc.prevent="cancelEdit"
            @mousedown.stop />
        <span v-else class="x-3 cursor-default" @dblclick.stop="startEdit">
            {{ name }}
        </span>
    </div>
</template>
