import { useBlockStore } from '@/entities/block';
import { useEvaluatorRegistry } from './useEvaluatorRegistry';

// Module-level singleton — preserves current behavior (shared across all callers).
// Caller is responsible for providing dependsOn (from useBlockDependencies).
let registry = null;

export function useBlockEvaluation(dependsOn) {
    const { blocks } = useBlockStore();

    if (!registry) {
        registry = useEvaluatorRegistry(blocks, dependsOn);
    }

    return {
        getEvaluation: registry.getEvaluation
    };
}
