import { describe, test, expect, beforeEach } from 'vitest';
import { nextTick, createApp } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useBlockDependencies } from '@/entities/block';
import { useEvaluatorRegistry } from '@/features/block/evaluation';

function withSetup(fn) {
    let result;
    const app = createApp({ setup() { result = fn(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

const { blocks, addBlock, removeBlock } = useBlockStore();

beforeEach(() => { blocks.splice(0); });

describe('delete block — reactive chain', () => {
    test('deleting a block causes dependent blocks to show an evaluation error', async () => {
        addBlock({ id: '1', name: 'a', code: '10' });
        addBlock({ id: '2', name: 'b', code: 'a * 2' });

        const { getEvaluation } = withSetup(() => {
            const { dependsOn } = useBlockDependencies({ debounceMs: 0 });
            return useEvaluatorRegistry(blocks, dependsOn);
        });

        await nextTick();
        expect(getEvaluation('a').value).toBe(10);
        expect(getEvaluation('b').value).toBe(20);

        removeBlock('1');
        await nextTick();

        expect(getEvaluation('b').error).toBeTruthy();
    });
});
