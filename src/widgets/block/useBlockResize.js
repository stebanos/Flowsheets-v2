import { ref, onBeforeUnmount } from 'vue';
import { useBlockStore } from '@/entities/block';

export function useBlockResize(props, {
    snapX, snapY, cellWidth, cellHeight,
    manualMinEditorHeight, manualMinOutputHeight, manualMinWidth,
    snappedEditorHeight, snappedEditorWidth, snappedOutputHeight
}) {
    const { updateBlock } = useBlockStore();
    const isResizingLocal = ref(false);
    let resizeCleanup = null;

    function handleStartResizeEditor(event) {
        const startY = event.clientY;
        const startH = snappedEditorHeight.value;
        isResizingLocal.value = true;
        const onMove = (e) => {
            manualMinEditorHeight.value = Math.max(cellHeight.value, snapY(startH + e.clientY - startY));
        };
        const onUp = () => {
            isResizingLocal.value = false;
            updateBlock(props.block.id, { userMinEditorHeight: manualMinEditorHeight.value });
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
        isResizingLocal.value = true;
        const onMove = (e) => {
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            manualMinOutputHeight.value = Math.max(cellHeight.value, snapY(startOutH + dy));
            manualMinWidth.value = Math.max(cellWidth.value, snapX(startW + dx));
        };
        const onUp = () => {
            isResizingLocal.value = false;
            updateBlock(props.block.id, { userMinOutputHeight: manualMinOutputHeight.value, userMinWidth: manualMinWidth.value });
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
