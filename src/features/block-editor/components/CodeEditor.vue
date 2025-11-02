<script setup>
import { computed } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { javascript } from '@codemirror/lang-javascript';
import { autocompletion } from '@codemirror/autocomplete';

const props = defineProps({
    code: {
        type: String,
        required: true
    }
})

const emit = defineEmits(['update:code']);

const lang = javascript();

const code = computed({
    get() { return props.code; },
    set(code) { emit('update:code', code); }
})
</script>

<template>
    <code-mirror basic v-model="code" :lang :extensions="[autocompletion({ activateOnTyping: false })]" />
</template>
