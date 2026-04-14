import VizDefault from './VizDefault.vue';
import VizHtml from './VizHtml.vue';
import VizJson from './VizJson.vue';
import VizTextDiff from './VizTextDiff.vue';
import VizCustom from './VizCustom.vue';

export { useCustomViz } from './useCustomViz';

export const VIZ_TYPES = {
    default: { label: 'Default', component: VizDefault },
    html: { label: 'HTML', component: VizHtml },
    json: { label: 'JSON', component: VizJson },
    'text-diff': { label: 'Text diff', component: VizTextDiff },
    custom: { label: 'Custom', component: VizCustom }
};
