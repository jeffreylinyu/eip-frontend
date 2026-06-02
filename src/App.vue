<script setup lang="ts">
import { computed, getCurrentInstance, onMounted } from 'vue';
import { RouterLink, RouterView, useRoute } from 'vue-router';
import { useAppOptionStore } from '@/stores/app-option';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAuthStore } from '@/stores/auth';
import { ProgressFinisher, useProgress } from '@marcoschulte/vue3-progress';
import AppSidebar from '@/components/app/Sidebar.vue';
import AppHeader from '@/components/app/Header.vue';
import AppTopNav from '@/components/app/TopNav.vue';
import AppFooter from '@/components/app/Footer.vue';
import AppThemePanel from '@/components/app/ThemePanel.vue';
import ExportLoadingPanel from '@/components/common/ExportLoadingPanel.vue';
import AiAssistantWidget from '@/components/app/AiAssistantWidget.vue';
import router from './router';

const appOption = useAppOptionStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const route = useRoute();
const internalInstance = getCurrentInstance();

/** 帳號引導頁（待關聯單位等）：一律不顯示側欄與頂部列，避免僅依賴 router 守衛寫入 Pinia 時因時序未更新而仍顯示選單 */
const isAccessStatusGuideRoute = computed(() => route.path === '/access-status-guide');
const showAppHeader = computed(
	() => !appOption.appHeaderHide && !isAccessStatusGuideRoute.value
);
const showAppSidebar = computed(
	() => !appOption.appSidebarHide && !isAccessStatusGuideRoute.value
);
const layoutWithoutSidebar = computed(
	() => appOption.appSidebarHide || isAccessStatusGuideRoute.value
);
const layoutWithoutHeader = computed(
	() => appOption.appHeaderHide || isAccessStatusGuideRoute.value
);

/**
 * 監造／營造首頁等共用同一個元件（如 Dashboard.vue）時，若僅換路由前綴 Vue 會重用實例、onMounted 不重跑。
 * 以 path 為 key 強制重掛，切換視角後會重新載入頁面資料。
 */
const routerViewKey = computed(() => route.path);

const progresses = [] as ProgressFinisher[];

router.beforeEach(async (to, from) => {
	progresses.push(useProgress().start());
	appOption.appSidebarMobileToggled = false;
	appOption.appSidebarToggled = false;
	document.body.scrollTop = 0;
  document.documentElement.scrollTop = 0;
  
  var targetElm = [].slice.call(document.querySelectorAll('.app-sidebar .menu-submenu'));
  targetElm.map(function(elm) {
  	elm.style.display = '';
  });
})
router.afterEach(async (to, from) => {
	progresses.pop()?.finish();
})

// 初始化工作空間
onMounted(async () => {
  // 只有在用戶已登入時才初始化工作空間
  if (authStore.isAuthenticated) {
    try {
      await workspaceStore.initWorkspaces()
    } catch (error) {
      console.error('❌ 工作空間初始化失敗:', error)
    }
  }
})

document.querySelector('body').classList.add('app-init');
</script>

<template>
	<div class="app" v-bind:class="{ 
		'app-header-menu-search-toggled': appOption.appHeaderSearchToggled,
		'app-sidebar-toggled': appOption.appSidebarToggled && !appOption.appSidebarCollapsed,
		'app-sidebar-collapsed': appOption.appSidebarCollapsed,
		'app-sidebar-mobile-toggled': appOption.appSidebarMobileToggled,
		'app-sidebar-mobile-closed': appOption.appSidebarMobileClosed,
		'app-content-full-height': appOption.appContentFullHeight,
		'app-content-full-width': layoutWithoutSidebar,
		'app-without-sidebar': layoutWithoutSidebar,
		'app-without-header': layoutWithoutHeader,
		'app-boxed-layout': appOption.appBoxedLayout,
		'app-with-top-nav': appOption.appTopNav,
		'app-footer-fixed': appOption.appFooterFixed,
	}">
		<vue3-progress-bar />
		<app-header v-if="showAppHeader" />
		<app-top-nav v-if="appOption.appTopNav" />
		<app-sidebar v-if="showAppSidebar" />
		<div class="app-content" v-bind:class="appOption.appContentClass">
			<router-view :key="routerViewKey" />
		</div>
		<app-footer v-if="appOption.appFooter" />
		<app-theme-panel />
		<ExportLoadingPanel />
		<AiAssistantWidget />
	</div>
</template>
