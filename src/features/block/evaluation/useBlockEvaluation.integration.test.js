import { createApp, nextTick } from 'vue';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';
import { renameIdentifier } from '@/shared/lib/evaluator';
import { generateUniqueName, generateUniqueNameFromName, useBlockDependencies, useBlockStore } from '@/entities/block';
import { useEvaluatorRegistry } from './useEvaluatorRegistry';

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
// render, priming the chain. In tests, we must do this explicitly for dependencies
// before asserting a downstream block's value.
async function prime(...names) {
    names.forEach(n => getEvaluation(n));
    await nextTick();
}

let getEvaluation, getStatus, dispose;
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
    getStatus = wired.getStatus;
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

// ---------------------------------------------------------------------------
// S9 — error blast radius: getStatus through the real pipeline
// ---------------------------------------------------------------------------

describe('S9 — error blast radius', () => {
    test('healthy chain reports all blocks ok', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'a + 1');
        addTestBlock('3', 'c', 'b + 1');
        await nextTick();
        await prime('a', 'b', 'c');

        expect(getStatus('a')).toBe('ok');
        expect(getStatus('b')).toBe('ok');
        expect(getStatus('c')).toBe('ok');
    });

    test('upstream error marks itself error and downstream dependents blocked', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'a + 1');
        addTestBlock('3', 'c', 'b + 1');
        await nextTick();
        await prime('a', 'b', 'c');
        expect(getStatus('a')).toBe('ok');

        updateBlock('1', { code: 'nonexistent.rate' });
        await nextTick();
        await prime('a', 'b', 'c');

        expect(getStatus('a')).toBe('error');
        expect(getStatus('b')).toBe('blocked');
        expect(getStatus('c')).toBe('blocked');
    });

    test('block whose own code errors with no broken upstream reports error', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'nonexistent.rate');
        await nextTick();
        await prime('a', 'b');

        expect(getStatus('a')).toBe('ok');
        expect(getStatus('b')).toBe('error');
    });

    test('fixing the upstream error flips downstream blocks back to ok', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'a + 1');
        addTestBlock('3', 'c', 'b + 1');
        await nextTick();

        updateBlock('1', { code: 'nonexistent.rate' });
        await nextTick();
        await prime('a', 'b', 'c');
        expect(getStatus('a')).toBe('error');
        expect(getStatus('b')).toBe('blocked');
        expect(getStatus('c')).toBe('blocked');

        updateBlock('1', { code: '1' });
        await nextTick();
        await prime('a', 'b', 'c');

        expect(getStatus('a')).toBe('ok');
        expect(getStatus('b')).toBe('ok');
        expect(getStatus('c')).toBe('ok');
    });
});

// ---------------------------------------------------------------------------
// S10 — evaluation isolation
// ---------------------------------------------------------------------------

describe('S10 — evaluation isolation', () => {
    test('editing one block does not re-run unrelated blocks', async () => {
        globalThis.__fsRuns = 0;
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'counter', 'globalThis.__fsRuns = globalThis.__fsRuns + 1');
        addTestBlock('3', 'c', 'a + 1');
        await prime('a', 'counter', 'c');
        expect(getEvaluation('counter').value).toBe(1);

        updateBlock('1', { code: '2' });
        await prime('a', 'counter', 'c');

        expect(getEvaluation('c').value).toBe(3);
        expect(getEvaluation('counter').value).toBe(1);
        expect(globalThis.__fsRuns).toBe(1);
        delete globalThis.__fsRuns;
    });

    test('a block may declare a local with the same name as another block', async () => {
        addTestBlock('1', 'a', '1');
        addTestBlock('2', 'b', 'const a = 5; return a * 2');
        await prime('a', 'b');
        expect(getEvaluation('b')).toEqual({ value: 10, error: null });
    });

    test('mutual local declarations do not form a phantom cycle', async () => {
        addTestBlock('1', 'a', 'const b = 1; return b');
        addTestBlock('2', 'b', 'const a = 2; return a');
        await prime('a', 'b');
        expect(getEvaluation('a')).toEqual({ value: 1, error: null });
        expect(getEvaluation('b')).toEqual({ value: 2, error: null });
        expect(getStatus('a')).toBe('ok');
        expect(getStatus('b')).toBe('ok');
    });
});

// ---------------------------------------------------------------------------
// S11 — comments and renames
// ---------------------------------------------------------------------------

describe('S11 — comments and renames', () => {
    test('a trailing line comment keeps the expression value', async () => {
        addTestBlock('1', 'a', '1 + 1 // sum');
        await prime('a');
        expect(getEvaluation('a')).toEqual({ value: 2, error: null });
    });

    test('renaming a dependency leaves member properties and prose alone', async () => {
        addTestBlock('1', 'a', '[1, 2]');
        addTestBlock('2', 'b', 'a.length + a[0]', { inputModes: { a: 'all' } });
        addTestBlock('3', 'c', 'a says ${a.length}', { inputModes: { a: 'all' } });
        await nextTick(); // evaluators are registered on the next tick
        await prime('a', 'b', 'c');
        expect(getEvaluation('b')).toEqual({ value: 3, error: null });

        // what useBlockName.saveName() does: rename, rewrite code, carry the inputModes key
        updateBlock('1', { name: 'list' });
        updateBlock('2', { code: renameIdentifier(blocks[1].code, 'a', 'list'), inputModes: { list: 'all' } });
        updateBlock('3', { code: renameIdentifier(blocks[2].code, 'a', 'list'), inputModes: { list: 'all' } });
        await nextTick();
        await prime('list', 'b', 'c');

        expect(blocks[1].code).toBe('list.length + list[0]');
        expect(blocks[2].code).toBe('a says ${list.length}');
        expect(getEvaluation('b')).toEqual({ value: 3, error: null });
        expect(getEvaluation('c')).toEqual({ value: 'a says 2', error: null });
    });
});

// ---------------------------------------------------------------------------
// S12 — user code receives raw values, not reactive proxies
// ---------------------------------------------------------------------------

describe('S12 — raw values', () => {
    const klass = 'class P { #v; constructor(v) { this.#v = v; } get v() { return this.#v; } }';

    test('an object with private fields survives a direct dependency', async () => {
        addTestBlock('1', 'obj', `${klass}; return new P(7)`);
        addTestBlock('2', 'val', 'obj.v');
        await nextTick();
        await prime('obj');
        expect(getEvaluation('val')).toEqual({ value: 7, error: null });
    });

    test('an object with private fields survives each mode', async () => {
        addTestBlock('1', 'objs', `${klass}; return [new P(1), new P(2)]`);
        addTestBlock('2', 'vals', 'objs.v');
        await nextTick();
        await prime('objs');
        expect(getEvaluation('vals')).toEqual({ value: [1, 2], error: null });
    });

    test('an object with private fields survives all mode', async () => {
        addTestBlock('1', 'objs', `${klass}; return [new P(1), new P(2)]`);
        addTestBlock('2', 'sum', 'objs.map(o => o.v).reduce((a, b) => a + b, 0)', { inputModes: { objs: 'all' } });
        await nextTick();
        await prime('objs');
        expect(getEvaluation('sum')).toEqual({ value: 3, error: null });
    });

    test('a dependency value keeps its identity', async () => {
        addTestBlock('1', 'obj', '({ k: 1 })');
        addTestBlock('2', 'same', 'obj === globalThis.__fsObj');
        await nextTick();
        await prime('obj');
        globalThis.__fsObj = getEvaluation('obj').value;
        expect(getEvaluation('same')).toEqual({ value: true, error: null });
        delete globalThis.__fsObj;
    });
});
