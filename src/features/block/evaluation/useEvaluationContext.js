import { useBlockDependencies } from '@/entities/block';
import { useBlockStore } from '@/entities/block';
import { useEvaluatorRegistry } from './useEvaluatorRegistry';

// Module-level singleton — preserves current behavior (shared across all callers).
let registry = null;

export function useEvaluationContext() {
    const { blocks } = useBlockStore();
    const { dependsOn } = useBlockDependencies({ debounceMs: 0 });

    if (!registry) {
        registry = useEvaluatorRegistry(blocks, dependsOn);
    }

    return {
        getEvaluation: registry.getEvaluation
    };
}
