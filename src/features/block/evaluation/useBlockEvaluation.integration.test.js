import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { createApp, nextTick } from 'vue';
import { useBlockStore } from '@/entities/block';
import { useBlockDependencies } from '@/entities/block';
import { useEvaluatorRegistry } from './useEvaluatorRegistry';
import { renameIdentifier } from '@/shared/lib/evaluator';
import { generateUniqueName, generateUniqueNameFromName } from '@/entities/block';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function withSetup(fn) {
    let result;
    const app = createApp({ setup() { result = fn(); return () => {}; } });
    app.mount(document.createElement('div'));
    return result;
}

// Evaluator computeds are lazy — results[name] is only populated once the evaluator
// is accessed. In the real app Block.vue calls getEvaluation for every block on each
// render, priming the chain. In tests we must do this explicitly for dependencies
// before asserting a downstream block's value.
async function prime(...names) {
    names.forEach(n => getEvaluation(n));
    await nextTick();
}

let getEvaluation, dispose;
let addBlock, removeBlock, updateBlock, blocks;

beforeEach(() => {
    ({ blocks, addBlock, removeBlock, updateBlock } = useBlockStore());
    // Drain the singleton store
    [...blocks].forEach(b => removeBlock(b.id));

    // Wire real deps into a fresh registry for this test
    const wired = withSetup(() => {
        const { dependsOn } = useBlockDependencies({ debounceMs: 0 });
        return useEvaluatorRegistry(blocks, dependsOn);
    });
    getEvaluation = wired.getEvaluation;
    dispose = wired.dispose;
});

afterEach(() => {
    dispose();
});

function addTestBlock(id, name, code, extra = {}) {
    addBlock({ id, name, code, isStringConcat: false, inputModes: {}, ...extra });
}

// ---------------------------------------------------------------------------
// S1 — Basic evaluation
// ---------------------------------------------------------------------------

describe('S1 — basic evaluation', () => {
    test('independent block evaluates correctly', async () => {
        addTestBlock('1', 'a', '1 + 1');
        await nextTick();
        expect(getEvaluation('a').value).toBe(2);
        expect(getEvaluation('a').error).toBeNull();
    });

    test('block referencing another evaluates correctly', async () => {
        addTestBlock('1', 'a', '2');
        addTestBlock('2', 'b', 'a * 3');
        await nextTick();
        await prime('a');
        expect(getEvaluation('b').value).toBe(6);
    });
});

// ---------------------------------------------------------------------------
// S2 — Reactive re-evaluation
// ---------------------------------------------------------------------------

describe('S2 — reactive re-evaluation', () => {
    test('dependent block updates when dependency code changes', async () => {
        addTestBlock('1', 'a', '10');
        addTestBlock('2', 'b', 'a + 5');
        await nextTick();
        await prime('a');
        expect(getEvaluation('b').value).toBe(15);

        updateBlock('1', { code: '20' });
        await nextTick();
        await prime('a');
        expect(getEvaluation('b').value).toBe(25);
    });
});

// ---------------------------------------------------------------------------
// S3 — Rename propagates to evaluator
// ---------------------------------------------------------------------------

describe('S3 — rename propagates to evaluator', () => {
    test('old name errors, new name resolves, dependent code rewritten', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'a + 1');
        await nextTick();

        // Simulate what useBlockName.saveName() does
        updateBlock('1', { name: 'x' });
        updateBlock('2', { code: renameIdentifier('a + 1', 'a', 'x') });
        await nextTick();

        expect(getEvaluation('x').value).toBe(1);
        expect(getEvaluation('a').error).toMatch(/no block named/);
        expect(blocks.find(b => b.id === '2').code).toBe('x + 1');
        expect(getEvaluation('b').value).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// S4 — Block deletion cleans up evaluator
// ---------------------------------------------------------------------------

describe('S4 — block deletion cleans up evaluator', () => {
    test('deleted block returns error', async () => {
        addTestBlock('1', 'a', '42');
        await nextTick();
        expect(getEvaluation('a').value).toBe(42);

        removeBlock('1');
        await nextTick();
        expect(getEvaluation('a').error).toMatch(/no block named/);
    });

    test('dependent block errors when its dependency is deleted', async () => {
        addTestBlock('1', 'a', '10');
        addTestBlock('2', 'b', 'a + 1');
        await nextTick();
        await prime('a');
        expect(getEvaluation('b').value).toBe(11);

        removeBlock('1');
        await nextTick();
        expect(getEvaluation('b').error).toBeTruthy();
    });
});

// ---------------------------------------------------------------------------
// S5 — Circular dependency detection
// ---------------------------------------------------------------------------

describe('S5 — circular dependency detection', () => {
    test('both blocks in a cycle report a circular error', async () => {
        addTestBlock('1', 'a', 'b + 1');
        addTestBlock('2', 'b', 'a + 1');
        await nextTick();
        expect(getEvaluation('a').error).toMatch(/circular/i);
        expect(getEvaluation('b').error).toMatch(/circular/i);
    });

    test('breaking the cycle resolves evaluation', async () => {
        addTestBlock('1', 'a', 'b + 1');
        addTestBlock('2', 'b', 'a + 1');
        await nextTick();

        updateBlock('1', { code: '1' });
        await nextTick();
        await prime('a');
        expect(getEvaluation('b').value).toBe(2);
    });
});

// ---------------------------------------------------------------------------
// S6 — Name uniqueness on create
// ---------------------------------------------------------------------------

describe('S6 — name uniqueness', () => {
    test('generateUniqueName produces sequential names', () => {
        const names = [];
        for (let i = 0; i < 3; i++) {
            names.push(generateUniqueName(names));
        }
        expect(names).toEqual(['a', 'b', 'c']);
    });

    test('generateUniqueNameFromName deduplicates with suffix', () => {
        const existing = ['a', 'b', 'c'];
        expect(generateUniqueNameFromName('a', existing)).toBe('a_1');
        expect(generateUniqueNameFromName('d', existing)).toBe('d');
    });
});

// ---------------------------------------------------------------------------
// S7 — string mode auto-detection end-to-end
// ---------------------------------------------------------------------------

describe('S7 — string mode auto-detection end-to-end', () => {
    test('block with ${} interpolation evaluates as template literal', async () => {
        addTestBlock('1', 'who', "'world'");
        addTestBlock('2', 'msg', 'hello ${who}');
        await nextTick();
        await prime('who');
        expect(getEvaluation('msg').value).toBe('hello world');
    });

    test('template literal block reacts when dependency changes', async () => {
        addTestBlock('1', 'who', "'world'");
        addTestBlock('2', 'msg', 'hello ${who}');
        await nextTick();
        await prime('who');
        expect(getEvaluation('msg').value).toBe('hello world');

        updateBlock('1', { code: "'there'" });
        await nextTick();
        await prime('who');
        expect(getEvaluation('msg').value).toBe('hello there');
    });
});

// ---------------------------------------------------------------------------
// S8 — inputModes each/all with real dep map
// ---------------------------------------------------------------------------

describe('S8 — inputModes each/all', () => {
    test('each mode (default): iterates over array dependency element-wise', async () => {
        addTestBlock('1', 'nums', '[1, 2, 3]');
        addTestBlock('2', 'doubled', 'nums * 2');
        await nextTick();
        await prime('nums');
        expect(getEvaluation('doubled').value).toEqual([2, 4, 6]);
    });

    test('all mode: passes the full array to the dependent block', async () => {
        addTestBlock('1', 'nums', '[1, 2, 3]');
        addTestBlock('2', 'len', 'nums.length', { inputModes: { nums: 'all' } });
        await nextTick();
        await prime('nums');
        expect(getEvaluation('len').value).toBe(3);
    });

    test('switching from each to all updates result reactively', async () => {
        addTestBlock('1', 'nums', '[10, 20]');
        addTestBlock('2', 'result', 'nums * 2');
        await nextTick();
        await prime('nums');
        expect(getEvaluation('result').value).toEqual([20, 40]);

        updateBlock('2', { inputModes: { nums: 'all' } });
        await nextTick();
        // With all mode, nums is [10, 20] — nums * 2 is NaN for an array,
        // but nums.length would be 2. Just verify it's no longer iterating.
        expect(Array.isArray(getEvaluation('result').value)).toBe(false);
    });
});
