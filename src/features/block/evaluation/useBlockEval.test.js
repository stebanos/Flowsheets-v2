import { reactive } from 'vue';
import { describe, expect, test } from 'vitest';
import { useBlockEval } from './useBlockEval';

function fakeContext({ evaluations = {}, statuses = {}, previous = {}, withPrevious = true } = {}) {
    const context = {
        getEvaluation: name => evaluations[name],
        getStatus: name => statuses[name] ?? 'ok'
    };
    if (withPrevious) { context.getPrevious = name => previous[name]; }
    return context;
}

describe('useBlockEval', () => {
    test('exposes the evaluation, value and a null error for a successful block', () => {
        const block = reactive({ name: 'a' });
        const context = fakeContext({ evaluations: { a: { value: 42, error: null } } });
        const { blockEval, status, isBlocked, error, value, paramValue } = useBlockEval(block, context);

        expect(blockEval.value).toEqual({ value: 42, error: null });
        expect(status.value).toBe('ok');
        expect(isBlocked.value).toBe(false);
        expect(error.value).toBeNull();
        expect(value.value).toBe(42);
        expect(paramValue.value).toBe(42);
    });

    test('error: error is passed through, paramValue is undefined', () => {
        const block = reactive({ name: 'a' });
        const context = fakeContext({ evaluations: { a: { value: 3, error: 'boom' } }, statuses: { a: 'error' } });
        const { status, error, value, paramValue } = useBlockEval(block, context);

        expect(status.value).toBe('error');
        expect(error.value).toBe('boom');
        expect(value.value).toBe(3);
        expect(paramValue.value).toBeUndefined();
    });

    test('missing evaluation yields undefined value and null error', () => {
        const block = reactive({ name: 'a' });
        const { blockEval, error, value, paramValue, isList, outputItems } = useBlockEval(block, fakeContext());

        expect(blockEval.value).toBeUndefined();
        expect(error.value).toBeNull();
        expect(value.value).toBeUndefined();
        expect(paramValue.value).toBeUndefined();
        expect(isList.value).toBe(false);
        expect(outputItems.value).toEqual([]);
    });

    test('blocked status sets isBlocked', () => {
        const block = reactive({ name: 'a' });
        const { status, isBlocked } = useBlockEval(block, fakeContext({ statuses: { a: 'blocked' } }));

        expect(status.value).toBe('blocked');
        expect(isBlocked.value).toBe(true);
    });

    test('list values are detected and formatted item by item', () => {
        const block = reactive({ name: 'a' });
        const context = fakeContext({ evaluations: { a: { value: [1, 'a', null, { x: 1 }], error: null } } });
        const { isList, outputItems } = useBlockEval(block, context);

        expect(isList.value).toBe(true);
        expect(outputItems.value).toEqual(['1', 'a', 'null', '{"x":1}']);
    });

    test('non-list values give no output items', () => {
        const block = reactive({ name: 'a' });
        const { isList, outputItems } = useBlockEval(block, fakeContext({ evaluations: { a: { value: 'text', error: null } } }));

        expect(isList.value).toBe(false);
        expect(outputItems.value).toEqual([]);
    });

    test('previousEval comes from getPrevious and is null when absent', () => {
        const block = reactive({ name: 'a' });
        const prev = { value: 1, error: null };
        expect(useBlockEval(block, fakeContext({ previous: { a: prev } })).previousEval.value).toBe(prev);
        expect(useBlockEval(block, fakeContext()).previousEval.value).toBeNull();
    });

    test('previousEval is null when the context has no getPrevious', () => {
        const block = reactive({ name: 'a' });
        expect(useBlockEval(block, fakeContext({ withPrevious: false })).previousEval.value).toBeNull();
    });

    test('renaming the block re-reads everything under the new name', () => {
        const block = reactive({ name: 'a' });
        const context = fakeContext({
            evaluations: { a: { value: 1, error: null }, b: { value: [2], error: 'bad' } },
            statuses: { a: 'ok', b: 'blocked' },
            previous: { b: { value: 0, error: null } }
        });
        const { blockEval, status, isBlocked, error, value, paramValue, isList, outputItems, previousEval } =
            useBlockEval(block, context);

        expect(value.value).toBe(1);
        block.name = 'b';

        expect(blockEval.value).toEqual({ value: [2], error: 'bad' });
        expect(status.value).toBe('blocked');
        expect(isBlocked.value).toBe(true);
        expect(error.value).toBe('bad');
        expect(value.value).toEqual([2]);
        expect(paramValue.value).toBeUndefined();
        expect(isList.value).toBe(true);
        expect(outputItems.value).toEqual(['2']);
        expect(previousEval.value).toEqual({ value: 0, error: null });
    });
});
