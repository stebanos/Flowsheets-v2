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
    test('outputHeight is initialised from block.outputHeight', () => {
        const block = { visualizationType: null, outputHeight: 120 };
        const { outputHeight } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref(null) })
        );

        expect(outputHeight.value).toBe(120);
    });

    test('outputHeight falls back to 3*cellHeight when block.outputHeight is missing', () => {
        const block = { visualizationType: null };
        const { outputHeight } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref(null) })
        );

        expect(outputHeight.value).toBe(120); // 3 * 40
    });

    test('snappedOutputHeight equals outputHeight directly', () => {
        const block = { visualizationType: null, outputHeight: 120 };
        const { snappedOutputHeight } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref({ value: 42 }) })
        );

        expect(snappedOutputHeight.value).toBe(120);
    });

    test('snappedOutputHeight reflects changes to outputHeight ref', () => {
        const block = { visualizationType: null, outputHeight: 120 };
        const result = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref({ value: 42 }) })
        );

        result.outputHeight.value = 200;
        expect(result.snappedOutputHeight.value).toBe(200);
    });

    test('outputOverflowY is "hidden" for non-default viz types', () => {
        const block = { visualizationType: 'html', outputHeight: 120 };
        const { outputOverflowY } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref(null) })
        );

        expect(outputOverflowY.value).toBe('hidden');
    });

    test('outputOverflowY is "auto" for default viz type', () => {
        const block = { visualizationType: 'default', outputHeight: 120 };
        const { outputOverflowY } = withSetup(() =>
            useBlockOutput(block, { cellHeight: ref(40), blockEval: ref(null) })
        );

        expect(outputOverflowY.value).toBe('auto');
    });
});
