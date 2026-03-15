import VizDefault from './VizDefault.vue';
import VizHtml from './VizHtml.vue';
import VizJson from './VizJson.vue';
import VizTextDiff from './VizTextDiff.vue';

export const VIZ_TYPES = {
    default: { label: 'Default', component: VizDefault },
    html: { label: 'HTML', component: VizHtml },
    json: { label: 'JSON', component: VizJson },
    'text-diff': { label: 'Text diff', component: VizTextDiff }
};
