import VizBarChart from './VizBarChart.vue';
import VizCustom from './VizCustom.vue';
import VizDefault from './VizDefault.vue';
import VizHtml from './VizHtml.vue';
import VizJson from './VizJson.vue';
import VizSparkline from './VizSparkline.vue';
import VizTable from './VizTable.vue';
import VizTextDiff from './VizTextDiff.vue';
import VizTimeline from './VizTimeline.vue';

// the prop contract lives in its own module so the components can import it
// without a cycle through this file's component imports
export { VIZ_PROPS } from './viz-props';

// inMenu: listed in the flat part of the viz menu
// fillsContainer: the viz sizes itself to its box rather than growing with its content
export const VIZ_TYPES = {
    default: { label: 'Default', component: VizDefault, inMenu: true, fillsContainer: false },
    html: { label: 'HTML', component: VizHtml, inMenu: true, fillsContainer: true },
    json: { label: 'JSON', component: VizJson, inMenu: true, fillsContainer: true },
    table: { label: 'Table', component: VizTable, inMenu: true, fillsContainer: true },
    bar: { label: 'Bar chart', component: VizBarChart, inMenu: true, fillsContainer: true },
    sparkline: { label: 'Sparkline', component: VizSparkline, inMenu: true, fillsContainer: true },
    timeline: { label: 'Timeline', component: VizTimeline, inMenu: true, fillsContainer: true },
    'text-diff': { label: 'Text diff', component: VizTextDiff, inMenu: true, fillsContainer: true },
    custom: { label: 'Custom', component: VizCustom, inMenu: false, fillsContainer: true }
};

// the one place that encodes "unknown or missing type falls back to default"
export function getVizDef(type) {
    return VIZ_TYPES[type ?? 'default'] ?? VIZ_TYPES.default;
}
