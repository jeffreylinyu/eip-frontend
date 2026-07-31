<script setup lang="ts">
import { computed, watch, nextTick, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { useAppSidebarMenuStore } from '@/stores/app-sidebar-menu';
import { useAppAdminSidebarMenuStore } from '@/stores/app-admin-sidebar-menu';
import { useAppContractorSidebarMenuStore } from '@/stores/app-contractor-sidebar-menu';
import { useAppOptionStore } from '@/stores/app-option';
import { useAuthStore } from '@/stores/auth';
import SidebarNav from '@/components/app/SidebarNav.vue';
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective';

const route = useRoute();
const appSidebarMenu = useAppSidebarMenuStore();
const appAdminSidebarMenu = useAppAdminSidebarMenuStore();
const appContractorSidebarMenu = useAppContractorSidebarMenuStore();
// 不使用 storeToRefs：在 `as any` + 自訂 [Symbol.iterator]/get length 的 store 上，
// storeToRefs 取回的可能是靜態快照而非 live ref（見 ExportCenter.vue 同樣改採 computed 包裝）。
// 直接在 computed 內讀取 store 屬性，Pinia 會自動 unwrap ref，
// 於 computed 內讀取即建立可靠的 reactive 依賴，動態項目載入後 sidebar 會即時重繪。
const contractorPMenuDebugText = computed(
  () => (appContractorSidebarMenu as any).dynamicPMenuDebugText ?? ''
);
const contractorMenuItems = computed<any[]>(() => {
  const m = (appContractorSidebarMenu as any).menuItems;
  return Array.isArray(m) ? m : [];
});
const contractorDynamicPMenuItems = computed(
  () => (appContractorSidebarMenu as any).dynamicPMenuItems ?? []
);
const contractorDocClassRows = computed(
  () => (appContractorSidebarMenu as any).contractorDocClassRows ?? []
);
const supervisoryMenuItems = computed<any[]>(() => {
  const m = (appSidebarMenu as any).menuItems;
  return Array.isArray(m) ? m : [];
});
const supervisoryDocClassRows = computed(
  () => (appSidebarMenu as any).supervisoryDocClassRows ?? []
);
const appOption = useAppOptionStore();
const authStore = useAuthStore();
const { viewType } = useViewPerspective();
const showPMenuDebug = computed(() => route.query.pMenuDebug === '1');
const pMenuDebugText = computed(() => contractorPMenuDebugText.value || '無除錯資訊');

// 判斷是否為系統管理頁面
const isAdminPage = computed(() => {
  return route.path.startsWith('/admin');
});

// 根據路由路徑判斷視角（優先使用路由，因為路由是單一來源）
const routeViewType = computed(() => {
  if (route.path.startsWith('/contractor/')) {
    return ViewType.CONTRACTOR;
  } else if (route.path.startsWith('/supervisory/')) {
    return ViewType.SUPERVISORY;
  } else if (route.path.startsWith('/shared/')) {
    return ViewType.SHARED;
  }
  return null; // 使用 viewType computed 作為後備
});

// 根據路由和視角類型選擇使用哪個側邊欄
const currentSidebarMenu = computed(() => {
  // 系統管理頁面使用管理員側邊欄
  if (isAdminPage.value) {
    const items = (appAdminSidebarMenu as any).menuItems;
    const result = Array.isArray(items) ? items.filter(Boolean) : [];
    return result;
  }
  
  // 優先使用路由判斷的視角，如果沒有則使用 viewType computed
  const effectiveViewType = routeViewType.value ?? viewType.value;
  
  // 營造視角使用營造側邊欄（須訂閱 dynamicPMenuItems / contractorDocClassRows，
  // 否則 P 類或 B/E/G/R/T/Q 類動態載入後畫面不會即時重繪）
  if (effectiveViewType === ViewType.CONTRACTOR) {
    void contractorDynamicPMenuItems.value;
    void contractorDocClassRows.value;
    return contractorMenuItems.value;
  }

  // 預設使用監造側邊欄（SUPERVISORY 或其他視角）
  // 與營造一致：明確訂閱動態書架 ref 後回傳陣列，
  // 否則 B/C/D/H/I/L 類動態項目載入後 sidebar 不會即時重繪。
  void supervisoryDocClassRows.value;
  return supervisoryMenuItems.value;
});

// 當側邊欄「清單模式」切換時（例如：未開通清單 <-> 一般清單），強制重新建立 DOM
// 避免 Vue 重用舊 DOM 造成 click handler / submenu state 不一致，導致子項打不開。
const sidebarRenderKey = computed(() => {
  const effectiveViewType = routeViewType.value ?? viewType.value;
  const isOnboardingMenu =
    !isAdminPage.value &&
    (effectiveViewType === ViewType.SUPERVISORY || effectiveViewType === ViewType.CONTRACTOR) &&
    Array.isArray(currentSidebarMenu.value) &&
    currentSidebarMenu.value.some((m: any) => m?.is_header && (m?.text === '工程開通' || m?.text === '提示'));

  return `${isAdminPage.value ? 'admin' : 'app'}:${effectiveViewType}:${isOnboardingMenu ? 'onboarding' : 'normal'}`;
});

function appSidebarMobileToggled() {
	appOption.appSidebarMobileToggled = !appOption.appSidebarMobileToggled;
}

async function copyPMenuDebugText() {
  try {
    await navigator.clipboard.writeText(String(pMenuDebugText.value || ''));
    console.info('[P-MENU-DEBUG] 已複製到剪貼簿');
  } catch (e) {
    console.warn('[P-MENU-DEBUG] 複製失敗', e);
  }
}

onMounted(() => {
  const effectiveViewType = routeViewType.value ?? viewType.value;
  if (effectiveViewType !== ViewType.CONTRACTOR) return;
  const contractorStore = appContractorSidebarMenu as any;
  if (typeof contractorStore?.refreshDynamicPMenuItems === 'function') {
    contractorStore.refreshDynamicPMenuItems();
  }
});

const expandActiveMenus = () => {
    // 找到所有包含 active 子項目的父菜單項，並自動展開
    const activeMenuItems = document.querySelectorAll('.app-sidebar .menu-item.active:not(.has-sub)');
    activeMenuItems.forEach((activeItem) => {
        // 向上查找所有父級 has-sub 菜單項並展開
        let current = activeItem.parentElement;
        while (current && current !== document.body) {
            const parentMenuItem = current.closest('.menu-item.has-sub');
            if (parentMenuItem) {
                const submenu = parentMenuItem.querySelector('.menu-submenu') as HTMLElement | null;
                if (submenu) {
                    // 添加 expand 和 active class，並顯示子菜單
                    parentMenuItem.classList.add('expand', 'active');
                    submenu.style.display = 'block';
                }
                // 繼續向上查找
                current = parentMenuItem.parentElement;
            } else {
                current = current.parentElement;
            }
        }
    });
};

// 監聽 authStore.user 的變化，確保當用戶載入完成時側邊欄能正確更新
watch(() => authStore.user, (newUser, oldUser) => {
    nextTick(() => {
        expandActiveMenus();
    });
});

// 監聽路由變化，自動展開包含當前路由的父菜單項
watch(() => route.path, () => {
    nextTick(() => {
        expandActiveMenus();
    });
});
</script>
<template>
	<div id="sidebar" class="app-sidebar">
		<perfect-scrollbar :key="sidebarRenderKey" class="app-sidebar-content">
			<div class="menu">
				<template
					v-for="(menu, idx) in currentSidebarMenu"
					:key="menu?.url ? `url:${menu.url}` : (menu?.is_header ? `header:${menu.text}:${idx}` : `item:${menu?.text || 'unknown'}:${idx}`)"
				>
					<div class="menu-header" v-if="menu && menu.is_header">{{ menu.text }}</div>
					<div class="menu-divider" v-else-if="menu && menu.is_divider"></div>
					<template v-else-if="menu">
						<sidebar-nav v-if="menu.text" v-bind:menu="menu"></sidebar-nav>
					</template>
				</template>
				<div v-if="showPMenuDebug" class="px-3 pb-3">
					<div class="small text-warning mb-1">P 類側邊欄 Debug（?pMenuDebug=1）</div>
					<textarea
						class="form-control form-control-sm mb-2"
						rows="8"
						readonly
						:value="pMenuDebugText"
					></textarea>
					<button class="btn btn-sm btn-outline-warning w-100" @click="copyPMenuDebugText">
						一鍵複製 Debug Log
					</button>
				</div>
			</div>
		</perfect-scrollbar>
	</div>
	<button class="app-sidebar-mobile-backdrop" v-on:click="appSidebarMobileToggled"></button>
</template>
