<script setup>
import { computed, ref } from 'vue';
import { useDrag } from '@/features/block/drag';
import { useNoteStore } from '@/entities/note';
import { useDeleteNote } from '@/features/note/useDeleteNote';
import { useFocusedNote } from '@/features/note/useFocusedNote';

const props = defineProps({
    note: {
        type: Object,
        required: true
    }
});

const { updateNote } = useNoteStore();
const { deleteNote } = useDeleteNote();
const { focusedNoteId, selectNote, clearNote } = useFocusedNote();

const noteTitle = computed({
    get: () => props.note.title,
    set: (val) => updateNote(props.note.id, { title: val })
});

const noteBody = computed({
    get: () => props.note.body,
    set: (val) => updateNote(props.note.id, { body: val })
});

const identity = x => x;
const { startDrag } = useDrag(identity, identity, updateNote);

const menuRef = ref(null);
const menuItems = computed(() => [
    ...(props.note.title
        ? [
            { label: 'Edit title', command: onTitleClick },
            { label: 'Remove title', command: () => updateNote(props.note.id, { title: '' }) }
        ]
        : [
            { label: 'Add title', command: onTitleClick }
        ]
    ),
    { label: 'Delete note', command: () => deleteNote(props.note) }
]);

function onMenuButtonClick(event) {
    event.stopPropagation();
    menuRef.value.toggle(event);
}

const MIN_WIDTH = 120;
const MIN_HEIGHT = 80;

const isFocused = computed(() => focusedNoteId.value === props.note.id);

const wrapperStyle = computed(() => ({
    position: 'absolute',
    left: `${props.note.x}px`,
    top: `${props.note.y}px`,
    width: `${props.note.width}px`,
    height: `${props.note.height}px`,
    zIndex: isFocused.value ? 10 : 1
}));

const editingTitle = ref(false);
const titleInput = ref(null);
const bodyTextarea = ref(null);

function onWrapperFocus() {
    selectNote(props.note.id);
}

function onWrapperBlur(event) {
    const wrapper = event.currentTarget;
    if (!wrapper.contains(event.relatedTarget)) {
        clearNote();
    }
}

function onWrapperKeydown(event) {
    if (event.key === 'Delete' || event.key === 'Backspace') {
        const tag = document.activeElement?.tagName?.toLowerCase();
        if (tag === 'textarea' || tag === 'input') { return; }
        deleteNote(props.note);
    }
}

function onDragHandleMousedown(event) {
    if (event.button !== 0) { return; }
    if (event.target.matches('textarea, input, [contenteditable]')) { return; }
    startDrag(props.note, event);
}

function onTitleClick() {
    editingTitle.value = true;
    setTimeout(() => titleInput.value?.focus(), 0);
}

const resizing = ref(false);
let resizeStartX = 0;
let resizeStartY = 0;
let resizeStartWidth = 0;
let resizeStartHeight = 0;

function onResizeMousedown(event) {
    if (event.button !== 0) { return; }
    event.stopPropagation();
    resizing.value = true;
    resizeStartX = event.clientX;
    resizeStartY = event.clientY;
    resizeStartWidth = props.note.width;
    resizeStartHeight = props.note.height;
    window.addEventListener('mousemove', onResizeMousemove);
    window.addEventListener('mouseup', onResizeMouseup);
}

function onResizeMousemove(event) {
    const dx = event.clientX - resizeStartX;
    const dy = event.clientY - resizeStartY;
    updateNote(props.note.id, {
        width: Math.max(MIN_WIDTH, resizeStartWidth + dx),
        height: Math.max(MIN_HEIGHT, resizeStartHeight + dy)
    });
}

function onResizeMouseup() {
    resizing.value = false;
    window.removeEventListener('mousemove', onResizeMousemove);
    window.removeEventListener('mouseup', onResizeMouseup);
}
</script>

<template>
    <div
        class="canvas-note"
        data-note
        tabindex="0"
        :style="wrapperStyle"
        @focus="onWrapperFocus"
        @blur="onWrapperBlur"
        @keydown="onWrapperKeydown"
    >
        <div class="canvas-note__drag-strip" @mousedown="onDragHandleMousedown" />
        <div
            class="canvas-note__header"
            :class="{ 'canvas-note__header--titled': note.title || editingTitle }"
            @mousedown="onDragHandleMousedown"
        >
            <input
                v-if="editingTitle"
                ref="titleInput"
                class="canvas-note__title-input"
                v-model="noteTitle"
                @blur="editingTitle = false"
                @keydown.enter="titleInput.blur()"
            />
            <span v-else-if="note.title" class="canvas-note__title-text">
                {{ note.title.toUpperCase() }}
            </span>
        </div>
        <div class="canvas-note__body-wrap">
            <textarea
                ref="bodyTextarea"
                class="canvas-note__body"
                v-model="noteBody"
            />
        </div>
        <button class="canvas-note__menu-btn" @click="onMenuButtonClick" aria-label="Note options">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
                <circle cx="6" cy="2" r="1.2" />
                <circle cx="6" cy="6" r="1.2" />
                <circle cx="6" cy="10" r="1.2" />
            </svg>
        </button>
        <div class="canvas-note__resize" @mousedown.stop="onResizeMousedown" />
        <p-menu ref="menuRef" :model="menuItems" popup />
    </div>
</template>

<style scoped>
.canvas-note {
    background: #fef9c3;
    font-family: ui-sans-serif, system-ui, sans-serif;
    box-shadow: 0 4px 6px -1px rgb(0 0 0 / .10), 0 2px 4px -2px rgb(0 0 0 / .10);
    border: 1px solid #fde047;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    outline: none;
}

.canvas-note__drag-strip {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 10px;
    z-index: 1;
    cursor: grab;
}

.canvas-note__drag-strip:active {
    cursor: grabbing;
}

.canvas-note__header {
    background: #fde047;
    color: #713f12;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    padding: 0 28px 0 8px;
    cursor: grab;
    user-select: none;
    flex-shrink: 0;
    display: flex;
    align-items: center;
    position: relative;
    z-index: 2;
    max-height: 0;
    min-height: 0;
    overflow: hidden;
    opacity: 0;
    transition: max-height 0.12s, opacity 0.12s;
}

.canvas-note__header--titled {
    max-height: 36px;
    min-height: 26px;
    padding-top: 5px;
    padding-bottom: 5px;
    opacity: 1;
}

.canvas-note__header:active {
    cursor: grabbing;
}

.canvas-note__title-text {
    flex: 1;
}

.canvas-note__title-input {
    background: transparent;
    border: none;
    outline: none;
    color: #713f12;
    font-family: inherit;
    font-size: 10px;
    font-weight: 700;
    letter-spacing: 0.06em;
    width: 100%;
    text-transform: uppercase;
}

.canvas-note__body-wrap {
    flex: 1;
    display: flex;
    overflow: hidden;
}


.canvas-note__body {
    flex: 1;
    background: transparent;
    border: none;
    outline: none;
    resize: none;
    font-family: inherit;
    font-size: 12px;
    line-height: 1.5;
    padding: 8px;
    color: #1c1917;
    width: 100%;
    height: 100%;
    cursor: text;
}

.canvas-note__menu-btn {
    position: absolute;
    top: 4px;
    right: 4px;
    z-index: 3;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    line-height: 1;
    letter-spacing: 0.05em;
    color: #94a3b8;
    background: transparent;
    border: none;
    border-radius: 2px;
    cursor: pointer;
    opacity: 0;
    transition: opacity 0.1s, color 0.1s;
    padding: 0;
}

.canvas-note:hover .canvas-note__menu-btn {
    opacity: 1;
}

.canvas-note__menu-btn:hover {
    color: #334155;
}

.canvas-note__resize {
    position: absolute;
    bottom: 0;
    right: 0;
    width: 12px;
    height: 12px;
    cursor: se-resize;
    opacity: 0;
    transition: opacity 0.1s;
    background: linear-gradient(
        135deg,
        transparent 40%,
        rgba(0, 0, 0, 0.2) 40%,
        rgba(0, 0, 0, 0.2) 60%,
        transparent 60%,
        transparent 75%,
        rgba(0, 0, 0, 0.2) 75%
    );
}

.canvas-note:hover .canvas-note__resize {
    opacity: 1;
}
</style>
