<script setup>
import { ref } from 'vue';
import CodeMirror from 'vue-codemirror6';
import { javascript } from '@codemirror/lang-javascript';
const value = ref('let x = 1;');
const lang = javascript();

</script>

<template>
    <code-mirror basic v-model="value" :lang="lang" />
</template>
