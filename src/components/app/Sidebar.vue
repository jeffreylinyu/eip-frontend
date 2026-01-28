<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAppSidebarMenuStore } from '@/stores/app-sidebar-menu';
import { useAppAdminSidebarMenuStore } from '@/stores/app-admin-sidebar-menu';
import { useAppContractorSidebarMenuStore } from '@/stores/app-contractor-sidebar-menu';
import { useAppOptionStore } from '@/stores/app-option';
import { onMounted } from 'vue';
import SidebarNav from '@/components/app/SidebarNav.vue';
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective';

const route = useRoute();
const appSidebarMenu = useAppSidebarMenuStore();
const appAdminSidebarMenu = useAppAdminSidebarMenuStore();
const appContractorSidebarMenu = useAppContractorSidebarMenuStore();
const appOption = useAppOptionStore();
const { viewType } = useViewPerspective();

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
    return appAdminSidebarMenu;
  }
  
  // 優先使用路由判斷的視角，如果沒有則使用 viewType computed
  const effectiveViewType = routeViewType.value ?? viewType.value;
  
  // 營造視角使用營造側邊欄
  if (effectiveViewType === ViewType.CONTRACTOR) {
    // 營造 store 返回的是包含 menuItems getter 的對象
    const contractorStore = appContractorSidebarMenu as any;
    const menuItems = contractorStore.menuItems || contractorStore;
    return menuItems;
  }
  
  // 預設使用監造側邊欄（SUPERVISORY 或其他視角）
  // 監造 store 返回的是 Object.assign(menuItems.value, {...})，可以直接使用
  return appSidebarMenu;
});

function appSidebarMobileToggled() {
	appOption.appSidebarMobileToggled = !appOption.appSidebarMobileToggled;
}

const handleSidebarMenuToggle = function(menus) {
    menus.map(function(menu) {
        menu.onclick = function(e) {
            e.preventDefault();
            var target = this.nextElementSibling;
            
            // Close other menus at the same level
            menus.map(function(m) {
                var otherTarget = m.nextElementSibling;
                if (otherTarget !== target) {
                    otherTarget.style.display = 'none';
                    otherTarget.closest('.menu-item').classList.remove('expand');
                }
            });

            var targetItemElm = target.closest('.menu-item');

            if (targetItemElm.classList.contains('expand') || (targetItemElm.classList.contains('active') && !target.style.display)) {
                targetItemElm.classList.remove('expand');
                target.style.display = 'none';
            } else {
                targetItemElm.classList.add('expand');
                target.style.display = 'block';
            }
        }
    });
};

const expandActiveMenus = () => {
    // 找到所有包含 active 子項目的父菜單項，並自動展開
    const activeMenuItems = document.querySelectorAll('.app-sidebar .menu-item.active:not(.has-sub)');
    activeMenuItems.forEach((activeItem) => {
        // 向上查找所有父級 has-sub 菜單項並展開
        let current = activeItem.parentElement;
        while (current && current !== document.body) {
            const parentMenuItem = current.closest('.menu-item.has-sub');
            if (parentMenuItem) {
                const submenu = parentMenuItem.querySelector('.menu-submenu');
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

const initSidebarHandles = () => {
    var menuBaseSelector = '.app-sidebar .menu > .menu-item.has-sub';
    var submenuBaseSelector = ' > .menu-submenu > .menu-item.has-sub';

    // menu
    var menuLinkSelector =  menuBaseSelector + ' > .menu-link';
    var menus = [].slice.call(document.querySelectorAll(menuLinkSelector));
    handleSidebarMenuToggle(menus);

    // submenu lvl 1
    var submenuLvl1Selector = menuBaseSelector + submenuBaseSelector;
    var submenusLvl1 = [].slice.call(document.querySelectorAll(submenuLvl1Selector + ' > .menu-link'));
    handleSidebarMenuToggle(submenusLvl1);

    // submenu lvl 2
    var submenuLvl2Selector = menuBaseSelector + submenuBaseSelector + submenuBaseSelector;
    var submenusLvl2 = [].slice.call(document.querySelectorAll(submenuLvl2Selector + ' > .menu-link'));
    handleSidebarMenuToggle(submenusLvl2);
    
    // 自動展開包含當前路由的父菜單項
    nextTick(() => {
        expandActiveMenus();
    });
};

// 重設監聽器當選單變更時 (例如切換 Admin/User 模式)
watch(currentSidebarMenu, () => {
    nextTick(() => {
        initSidebarHandles();
    });
}, { deep: true });

// 監聽路由變化，自動展開包含當前路由的父菜單項
watch(() => route.path, () => {
    nextTick(() => {
        expandActiveMenus();
    });
});

onMounted(() => {
	initSidebarHandles();
});
</script>
<template>
	<div id="sidebar" class="app-sidebar">
		<perfect-scrollbar class="app-sidebar-content">
			<div class="menu">
				<template v-for="menu in currentSidebarMenu">
					<div class="menu-header" v-if="menu.is_header">{{ menu.text }}</div>
					<div class="menu-divider" v-else-if="menu.is_divider"></div>
					<template v-else>
						<sidebar-nav v-if="menu.text" v-bind:menu="menu"></sidebar-nav>
					</template>
				</template>
			</div>
		</perfect-scrollbar>
	</div>
	<button class="app-sidebar-mobile-backdrop" v-on:click="appSidebarMobileToggled"></button>
</template>