import VizCustom from './VizCustom.vue';
import VizDefault from './VizDefault.vue';
import VizHtml from './VizHtml.vue';
import VizJson from './VizJson.vue';
import VizTable from './TableViz.vue';
import VizTextDiff from './VizTextDiff.vue';

export const VIZ_TYPES = {
    default: { label: 'Default', component: VizDefault },
    html: { label: 'HTML', component: VizHtml },
    json: { label: 'JSON', component: VizJson },
    table: { label: 'Table', component: VizTable },
    'text-diff': { label: 'Text diff', component: VizTextDiff },
    custom: { label: 'Custom', component: VizCustom }
};
