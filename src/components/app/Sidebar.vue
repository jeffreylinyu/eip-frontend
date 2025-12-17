<script setup lang="ts">
import { computed, watch, nextTick } from 'vue';
import { useRoute } from 'vue-router';
import { useAppSidebarMenuStore } from '@/stores/app-sidebar-menu';
import { useAppAdminSidebarMenuStore } from '@/stores/app-admin-sidebar-menu';
import { useAppOptionStore } from '@/stores/app-option';
import { onMounted } from 'vue';
import SidebarNav from '@/components/app/SidebarNav.vue';

const route = useRoute();
const appSidebarMenu = useAppSidebarMenuStore();
const appAdminSidebarMenu = useAppAdminSidebarMenuStore();
const appOption = useAppOptionStore();

// 判斷是否為系統管理頁面
const isAdminPage = computed(() => {
  return route.path.startsWith('/admin');
});

// 根據路由選擇使用哪個側邊欄
const currentSidebarMenu = computed(() => {
  return isAdminPage.value ? appAdminSidebarMenu : appSidebarMenu;
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
};

// 重設監聽器當選單變更時 (例如切換 Admin/User 模式)
watch(currentSidebarMenu, () => {
    nextTick(() => {
        initSidebarHandles();
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