import { onBeforeUnmount, ref } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useBlockResize(props, {
    snapX, snapY, cellHeight, unitX,
    editorHeight, outputHeight, editorWidth,
    snappedEditorHeight, snappedOutputHeight, snappedEditorWidth
}) {
    const { updateBlock } = useBlockStore();
    const isResizingLocal = ref(false);
    let resizeCleanup = null;

    function handleStartResizeEditor(event) {
        const startY = event.clientY;
        const startH = snappedEditorHeight.value;
        const MIN_EDITOR_H = cellHeight.value;
        isResizingLocal.value = true;
        const onMove = (e) => {
            editorHeight.value = Math.max(MIN_EDITOR_H, snapY(startH + e.clientY - startY));
        };
        const onUp = () => {
            isResizingLocal.value = false;
            updateBlock(props.block.id, { editorHeight: editorHeight.value });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            resizeCleanup = null;
        };
        resizeCleanup = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    function handleStartResizeOutput(event) {
        const startX = event.clientX;
        const startY = event.clientY;
        const startOutH = snappedOutputHeight.value;
        const startW = snappedEditorWidth.value;
        const MIN_OUTPUT_H = 2 * cellHeight.value;
        const MIN_WIDTH = unitX.value;
        isResizingLocal.value = true;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            outputHeight.value = Math.max(MIN_OUTPUT_H, snapY(startOutH + dy));
            editorWidth.value = Math.max(MIN_WIDTH, snapX(startW + dx));
        };
        const onUp = () => {
            isResizingLocal.value = false;
            updateBlock(props.block.id, { outputHeight: outputHeight.value, width: editorWidth.value });
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
            resizeCleanup = null;
        };
        resizeCleanup = () => {
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }

    onBeforeUnmount(() => { resizeCleanup?.(); });

    return { isResizingLocal, handleStartResizeEditor, handleStartResizeOutput };
}
