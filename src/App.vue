<script setup lang="ts">
import { getCurrentInstance, onMounted } from 'vue';
import { RouterLink, RouterView } from 'vue-router';
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
import router from './router';

const appOption = useAppOptionStore();
const workspaceStore = useWorkspaceStore();
const authStore = useAuthStore();
const internalInstance = getCurrentInstance();

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
		'app-content-full-width': appOption.appSidebarHide,
		'app-without-sidebar': appOption.appSidebarHide,
		'app-without-header': appOption.appHeaderHide,
		'app-boxed-layout': appOption.appBoxedLayout,
		'app-with-top-nav': appOption.appTopNav,
		'app-footer-fixed': appOption.appFooterFixed,
	}">
		<vue3-progress-bar />
		<app-header v-if="!appOption.appHeaderHide" />
		<app-top-nav v-if="appOption.appTopNav" />
		<app-sidebar v-if="!appOption.appSidebarHide" />
		<div class="app-content" v-bind:class="appOption.appContentClass">
			<router-view></router-view>
		</div>
		<app-footer v-if="appOption.appFooter" />
		<app-theme-panel />
		<ExportLoadingPanel />
	</div>
</template>
