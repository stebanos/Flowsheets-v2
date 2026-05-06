import { createApp, ref } from 'vue';
import { describe, expect, test } from 'vitest';
import { useBlockOutput } from './useBlockOutput';

function withSetup(composable) {
    let result;
    const app = createApp({ setup() { result = composable(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

describe('useBlockOutput', () => {
    test('manualMinOutputHeight is initialised from block.userMinOutputHeight', () => {
        const block = { visualizationType: null, userMinOutputHeight: 120 };
        const { manualMinOutputHeight } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref(null) })
        );

        expect(manualMinOutputHeight.value).toBe(120);
    });

    test('snappedOutputHeight floors at manualMinOutputHeight when auto height is shorter', () => {
        const block = { visualizationType: null, userMinOutputHeight: 120 };
        const { snappedOutputHeight } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref({ value: 42 }) })
        );

        // auto height: max(1, ceil(40/40)) * 40 = 40, below manualMinOutputHeight(120)
        expect(snappedOutputHeight.value).toBe(120);
    });

    test('snappedOutputHeight auto-sizes above manualMinOutputHeight when content is taller', () => {
        const block = { visualizationType: null, userMinOutputHeight: 40 };
        const result = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref({ value: 42 }) })
        );

        result.rawOutputHeight.value = 200; // 5 rows of content
        // floor is 40 (1 row), but auto height is 200 — should grow past the floor
        expect(result.snappedOutputHeight.value).toBe(200);
    });
});
