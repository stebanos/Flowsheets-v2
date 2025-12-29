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
        <input v-if="isEditing" ref="nameInput" v-model="editName" name="block" class="py-0.5 outline-none w-full"
            @blur="saveName"
            @keydown.enter.prevent="saveName"
            @keydown.esc.prevent="cancelEdit"
            @mousedown.stop />
        <span v-else class="px-1 cursor-default" @dblclick.stop="startEdit">
            {{ name }}
        </span>
    </div>
</template>
