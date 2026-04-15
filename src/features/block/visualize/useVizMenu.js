import { computed } from 'vue';
import { useBlockStore } from '@/entities/block';
import { VIZ_TYPES } from './viz-types';
import { useCustomViz } from './useCustomViz';

export function useVizMenu(block, onEditViz) {
    const { updateBlock } = useBlockStore();
    const { customVizes } = useCustomViz();

    const currentVizType = computed(() => block.visualizationType ?? 'default');

    const currentVizLabel = computed(() => {
        if (currentVizType.value === 'custom') {
            return block.vizOptions?.customVizName ?? 'Custom';
        }
        return VIZ_TYPES[currentVizType.value]?.label ?? 'Default';
    });

    const activeVizComponent = computed(() =>
        VIZ_TYPES[currentVizType.value]?.component ?? VIZ_TYPES.default.component
    );

    const vizMenuItems = computed(() => {
        const items = [];
        for (const [key, { label }] of Object.entries(VIZ_TYPES)) {
            if (key === 'custom') { continue; }
            items.push({
                label: currentVizType.value === key ? `✔ ${label}` : label,
                command: () => updateBlock(block.id, { visualizationType: key })
            });
        }
        const customNames = Object.keys(customVizes);
        if (customNames.length > 0) {
            items.push({ separator: true });
            for (const name of customNames) {
                const isActive = currentVizType.value === 'custom' && block.vizOptions?.customVizName === name;
                items.push({
                    label: isActive ? `✔ ${name}` : name,
                    command: () => updateBlock(block.id, {
                        visualizationType: 'custom',
                        vizOptions: { ...(block.vizOptions ?? {}), customVizName: name }
                    })
                });
            }
        }
        if (currentVizType.value === 'custom') {
            items.push({ separator: true });
            items.push({
                label: 'Edit viz code…',
                command: () => onEditViz(block.vizOptions?.customVizName ?? null)
            });
        }
        return items;
    });

    return { vizMenuItems, currentVizType, currentVizLabel, activeVizComponent };
}
