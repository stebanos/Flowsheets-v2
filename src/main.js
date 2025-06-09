import { createApp } from 'vue';

import 'primeicons/primeicons.css';
import './assets/main.css';
import store, {StoreSymbol} from './store/store';


import App from './App.vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Badge from 'primevue/badge';
import Breadcrumb from 'primevue/breadcrumb';
import Button from 'primevue/button';
import Card from 'primevue/card';
import Checkbox from 'primevue/checkbox';
import Column from 'primevue/column';
import DataTable from 'primevue/datatable';
import DatePicker from 'primevue/datepicker';
import Dialog from 'primevue/dialog';
import Divider from 'primevue/divider';
import Drawer from 'primevue/drawer';
import InputText from 'primevue/inputtext';
import Listbox from 'primevue/listbox';
import Message from 'primevue/message';
import Panel from 'primevue/panel';
import Popover from 'primevue/popover';
import ProgressSpinner from 'primevue/progressspinner';
import RadioButton from 'primevue/radiobutton';
import Select from 'primevue/select';
import Tab from 'primevue/tab';
import TabList from 'primevue/tablist';
import TabPanel from 'primevue/tabpanel';
import TabPanels from 'primevue/tabpanels';
import Tabs from 'primevue/tabs';
import Tag from 'primevue/tag';
import Toast from 'primevue/toast';
import ToggleButton from 'primevue/togglebutton';
import Tooltip from 'primevue/tooltip';
import TreeTable from 'primevue/treetable';
import Aura from '@primevue/themes/aura';

const app = createApp(App);
app.provide(StoreSymbol, store);
app.use(PrimeVue, { theme: { preset: Aura } });
app.use(ToastService);
app.component('p-badge', Badge);
app.component('p-breadcrumb', Breadcrumb);
app.component('p-button', Button);
app.component('p-card', Card);
app.component('p-checkbox', Checkbox);
app.component('p-column', Column);
app.component('p-data-table', DataTable);
app.component('p-date-picker', DatePicker);
app.component('p-dialog', Dialog);
app.component('p-divider', Divider);
app.component('p-drawer', Drawer);
app.component('p-input-text', InputText);
app.component('p-listbox', Listbox);
app.component('p-message', Message);
app.component('p-panel', Panel);
app.component('p-popover', Popover);
app.component('p-progress-spinner', ProgressSpinner);
app.component('p-radio-button', RadioButton);
app.component('p-select', Select);
app.component('p-tab', Tab);
app.component('p-tab-list', TabList);
app.component('p-tab-panel', TabPanel);
app.component('p-tab-panels', TabPanels);
app.component('p-tabs', Tabs);
app.component('p-tag', Tag);
app.component('p-toast', Toast);
app.component('p-toggle-button', ToggleButton);
app.component('p-tree-table', TreeTable);
app.directive('tooltip', Tooltip);
app.mount('#app');



