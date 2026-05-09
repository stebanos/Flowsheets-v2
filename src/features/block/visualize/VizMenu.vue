<script setup>
import { ref } from 'vue';

defineProps({
    model: {
        type: Array,
        required: true
    },
    label: {
        type: String,
        default: 'Default'
    }
});

const menu = ref(null);

function toggle(e) {
    menu.value.toggle(e);
}
</script>

<template>
    <button class="w-full flex items-center gap-1 px-2 border-t border-gray-100 text-[10px] text-gray-400 hover:text-gray-600 hover:bg-gray-50 cursor-pointer shrink-0 transition-colors"
            style="height: 20px"
            @click.stop="toggle($event)">
        {{ label }}
        <svg viewBox="0 0 10 6" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round">
            <path d="M1 1l4 4 4-4"/>
        </svg>
    </button>
    <p-menu ref="menu" :model="model" popup
            :pt="{
                list: { class: 'py-0.5 min-w-[120px]' },
                item: { class: 'px-0 py-0' },
                itemContent: { class: 'px-0 py-0' },
                separator: { class: 'my-0.5' }
            }">
        <template #item="{ item }">
            <div v-if="!item.separator"
                 class="flex items-center gap-1.5 px-2 py-0.75 text-[11px] cursor-pointer select-none"
                 :class="item.class">
                <span class="w-2 shrink-0 flex items-center justify-center">
                    <svg v-if="item.active" viewBox="0 0 8 8" width="5" height="5">
                        <circle cx="4" cy="4" r="3" fill="currentColor"/>
                    </svg>
                </span>
                <span>{{ item.label }}</span>
            </div>
        </template>
    </p-menu>
</template>

