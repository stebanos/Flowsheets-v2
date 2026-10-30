import VizBarChart from './VizBarChart.vue';
import VizCustom from './VizCustom.vue';
import VizDefault from './VizDefault.vue';
import VizHtml from './VizHtml.vue';
import VizJson from './VizJson.vue';
import VizSparkline from './VizSparkline.vue';
import VizTable from './VizTable.vue';
import VizTextDiff from './VizTextDiff.vue';
import VizTimeline from './VizTimeline.vue';

export const VIZ_TYPES = {
    default: { label: 'Default', component: VizDefault },
    html: { label: 'HTML', component: VizHtml },
    json: { label: 'JSON', component: VizJson },
    table: { label: 'Table', component: VizTable },
    bar: { label: 'Bar chart', component: VizBarChart },
    sparkline: { label: 'Sparkline', component: VizSparkline },
    timeline: { label: 'Timeline', component: VizTimeline },
    'text-diff': { label: 'Text diff', component: VizTextDiff },
    custom: { label: 'Custom', component: VizCustom }
};
