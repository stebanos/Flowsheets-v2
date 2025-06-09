import './assets/main.css';
import 'primeicons/primeicons.css';

import { createApp } from 'vue';
import PrimeVue from 'primevue/config';
import ToastService from 'primevue/toastservice';
import Tooltip from 'primevue/tooltip';

import App from './App.vue';
import Aura from '@primevue/themes/aura';

const app = createApp(App);
app.use(PrimeVue, { theme: { preset: Aura } });
app.use(ToastService);
app.directive('tooltip', Tooltip);
app.mount('#app');