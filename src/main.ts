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
import '@/firebase';

// Syncfusion License 註冊
import { registerLicense, setCulture, L10n } from '@syncfusion/ej2-base'
if (import.meta.env.VITE_SYNCFUSION_LICENSE_KEY) {
    registerLicense(import.meta.env.VITE_SYNCFUSION_LICENSE_KEY);
  }
setCulture('zh-TW')

// 設定繁體中文語系
L10n.load({
    'zh-TW': {
        'grid': {
            'EmptyRecord': '目前無資料',
            'GroupDropArea': '將欄位標題拖曳至此進行分組',
            'UnGroup': '取消分組',
            'EmptyDataSourceError': 'DataSource 必須在初始載入時不為空，因為已生成欄位',
            'Item': '項目',
            'Items': '項目',
            'Search': '搜尋',
            'ClearButton': '清除',
            'EnterValue': '輸入值',
            'ChooseDate': '選擇日期',
            'Matchs': '無符合資料',
            'FilterButton': '過濾',
            'ClearFilter': '清除過濾',
            'StartsWith': '開始於',
            'EndsWith': '結束於',
            'Contains': '包含',
            'Equal': '等於',
            'NotEqual': '不等於',
            'LessThan': '小於',
            'LessThanOrEqual': '小於或等於',
            'GreaterThan': '大於',
            'GreaterThanOrEqual': '大於或等於',
            'Copy': '複製',
            'Group': '分組',
            'Ungroup': '取消分組',
            'autoFitAll': '自動調整所有欄位寬度',
            'autoFit': '自動調整此欄位寬度',
            'Export': '匯出',
            'FirstPage': '第一頁',
            'LastPage': '最後一頁',
            'PreviousPage': '上一頁',
            'NextPage': '下一頁',
            'SortAscending': '升冪排序',
            'SortDescending': '降冪排序',
            'EditRecord': '編輯',
            'DeleteRecord': '刪除',
            'Save': '儲存',
            'Cancel': '取消'
        },
        'pager': {
            'currentPageInfo': '{0} / {1} 頁 ({2} 個項目)',
            'totalItemsInfo': '({0} 個項目)',
            'firstPageTooltip': '第一頁',
            'lastPageTooltip': '最後一頁',
            'nextPageTooltip': '下一頁',
            'previousPageTooltip': '上一頁',
            'nextPagerTooltip': '下一頁',
            'previousPagerTooltip': '上一頁',
            'pagerDropDown': '每頁顯示筆數',
            'pagerAllDropDown': '全部'
        }
    }
});

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
import { TreeGridComponent, ColumnsDirective as TreeColumns, ColumnDirective as TreeColumn } from '@syncfusion/ej2-vue-treegrid';
import { GridComponent, ColumnsDirective as GridColumns, ColumnDirective as GridColumn } from '@syncfusion/ej2-vue-grids';
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

// Syncfusion components
app.component('ejs-treegrid', TreeGridComponent);
app.component('ejs-grid', GridComponent);

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
