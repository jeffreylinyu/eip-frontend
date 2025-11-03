import { createApp } from 'vue';
import { createPinia } from 'pinia';
import { Vue3ProgressPlugin } from '@marcoschulte/vue3-progress';
import { PerfectScrollbarPlugin } from 'vue3-perfect-scrollbar';
import mitt from 'mitt';
import 'vue3-perfect-scrollbar/style.css';
import '@marcoschulte/vue3-progress/dist/index.css';
import '@fortawesome/fontawesome-free/scss/fontawesome.scss';
import '@fortawesome/fontawesome-free/scss/regular.scss';
import '@fortawesome/fontawesome-free/scss/solid.scss';
import '@fortawesome/fontawesome-free/scss/brands.scss';
import '@fortawesome/fontawesome-free/scss/v4-shims.scss';
import 'bootstrap-icons/font/bootstrap-icons.css';
import 'bootstrap';
import './scss/styles.scss';

// Syncfusion License 註冊
import { registerLicense, setCulture } from '@syncfusion/ej2-base'
if (import.meta.env.VITE_SYNCFUSION_LICENSE_KEY) {
    registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);
  }
setCulture('zh-TW')

// 2) 載入主題 CSS（擇一主題）- 完整載入所有相依樣式
// 使用 Bootstrap 暗色主題
import '@syncfusion/ej2-base/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-buttons/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-calendars/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-dropdowns/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-inputs/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-navigations/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-popups/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-splitbuttons/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-layouts/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-grids/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-treegrid/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-vue-gantt/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-vue-diagrams/styles/bootstrap5-dark.css'
import '@syncfusion/ej2-vue-treegrid/styles/bootstrap5-dark.css'
// Charts 使用預設樣式，不需要額外導入

import App from './App.vue';
import router from './router';
import { useAuthStore } from '@/stores/auth';
import { ToastPlugin } from '@/components/bootstrap/ToastService.js';

import Card from '@/components/bootstrap/Card.vue';
import CardBody from '@/components/bootstrap/CardBody.vue';
import CardHeader from '@/components/bootstrap/CardHeader.vue';
import CardFooter from '@/components/bootstrap/CardFooter.vue';
import CardGroup from '@/components/bootstrap/CardGroup.vue';
import CardImgOverlay from '@/components/bootstrap/CardImgOverlay.vue';
import CardExpandToggler from '@/components/bootstrap/CardExpandToggler.vue';
import Modal from '@/components/bootstrap/Modal.vue';
import Drawer from '@/components/bootstrap/Drawer.vue';
import PageHeader from '@/components/bootstrap/PageHeader.vue';
import { TreeGridComponent, ColumnsDirective, ColumnDirective } from '@syncfusion/ej2-vue-treegrid';
import { Edit, Toolbar, ContextMenu, Filter, Sort, Resize, Reorder } from '@syncfusion/ej2-vue-treegrid';
import { ChartPlugin, AccumulationChartPlugin } from '@syncfusion/ej2-vue-charts';

const emitter = mitt();
const app = createApp(App);

app.component('Card', Card);
app.component('CardBody', CardBody);
app.component('CardHeader', CardHeader);
app.component('CardFooter', CardFooter);
app.component('CardGroup', CardGroup);
app.component('CardImgOverlay', CardImgOverlay);
app.component('CardExpandToggler', CardExpandToggler);
app.component('Modal', Modal);
app.component('Drawer', Drawer);
app.component('PageHeader', PageHeader);

// Syncfusion TreeGrid 組件（只註冊 TreeGrid，不註冊 e-columns 和 e-column，避免與 Charts 衝突）
app.component('ejs-treegrid', TreeGridComponent);

// Syncfusion Charts 插件註冊（會自動註冊 e-column 等組件）
app.use(ChartPlugin);
app.use(AccumulationChartPlugin);

const pinia = createPinia();
app.use(pinia);
app.use(router);
app.use(Vue3ProgressPlugin);
app.use(PerfectScrollbarPlugin);
app.use(ToastPlugin);

app.config.globalProperties.emitter = emitter;

// 初始化認證狀態
const authStore = useAuthStore();
authStore.initAuth();

app.mount('#app');
