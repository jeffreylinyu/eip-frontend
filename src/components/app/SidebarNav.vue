<script setup lang="ts">
import SidebarNav from '@/components/app/SidebarNav.vue';
import { nextTick, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

type SidebarMenu = {
	icon?: string,
	text?: string,
	url?: string,
	highlight?: boolean,
	children?: SidebarMenu[],
	label?: string
}

const props = defineProps<{
  menu: {
  	icon?: string,
  	text?: string,
  	url?: string,
  	highlight?: boolean,
  	children?: SidebarMenu[],
  	label?: string
  };
}>();

const route = useRoute();
const menuRoot = ref<HTMLElement | null>(null);
let wasAutoExpanded = false;

function matchesMenuUrl(menuUrl: string | undefined): boolean {
	if (!menuUrl) return false;
	if (menuUrl.includes('?')) {
		const [menuPath, queryString = ''] = menuUrl.split('?');
		if (route.path !== menuPath && !route.path.startsWith(`${menuPath.replace(/\/+$/, '')}/`)) {
			return false;
		}
		const expected = new URLSearchParams(queryString);
		let queryMatches = true;
		expected.forEach((value, key) => {
			const actual = route.query[key];
			const actualValue = Array.isArray(actual) ? actual[0] : actual;
			if (String(actualValue ?? '') !== value) queryMatches = false;
		});
		return queryMatches;
	}
	return route.path === menuUrl || route.path.startsWith(`${menuUrl.replace(/\/+$/, '')}/`);
}

function menuTreeIsActive(items: SidebarMenu[] | undefined): boolean {
	if (!items) return false;
	return items.some((item) =>
		matchesMenuUrl(item.url) || menuTreeIsActive(item.children)
	);
}

function subIsActive(items: SidebarMenu[] | undefined) {
	return menuTreeIsActive(items);
}

async function syncExpandedStateWithRoute() {
	await nextTick();
	const root = menuRoot.value;
	if (!root || !props.menu.children) return;
	const submenu = root.querySelector(':scope > .menu-submenu') as HTMLElement | null;
	const active = menuTreeIsActive(props.menu.children);
	if (active) {
		root.classList.add('expand');
		if (submenu) submenu.style.display = 'block';
		wasAutoExpanded = true;
	} else if (wasAutoExpanded) {
		root.classList.remove('expand');
		if (submenu) submenu.style.display = 'none';
		wasAutoExpanded = false;
	}
}

/** 葉子選單是否為當前頁：Vue Router 4 的 isActive 不考慮 query，故改為用 fullPath 比對 */
function leafIsActive(menuUrl: string | undefined, slotIsActive: boolean): boolean {
	if (!menuUrl) return slotIsActive;
	if (menuUrl.includes('?')) return matchesMenuUrl(menuUrl);
	return matchesMenuUrl(menuUrl) || slotIsActive;
}

function toggleSubmenu(e: MouseEvent) {
	e.preventDefault();
	const link = e.currentTarget as HTMLElement | null;
	if (!link) return;

	const submenu = link.nextElementSibling as HTMLElement | null;
	const menuItemElm = link.closest('.menu-item.has-sub') as HTMLElement | null;
	if (!submenu || !menuItemElm) return;

	// Close sibling menus at the same level
	const parent = menuItemElm.parentElement;
	if (parent) {
		const siblings = Array.from(parent.children) as HTMLElement[];
		siblings.forEach((sib) => {
			if (sib === menuItemElm) return;
			if (!sib.classList.contains('menu-item') || !sib.classList.contains('has-sub')) return;
			sib.classList.remove('expand');
			const sibSub = sib.querySelector(':scope > .menu-submenu') as HTMLElement | null;
			if (sibSub) sibSub.style.display = 'none';
		});
	}

	if (menuItemElm.classList.contains('expand')) {
		menuItemElm.classList.remove('expand');
		submenu.style.display = 'none';
	} else {
		menuItemElm.classList.add('expand');
		submenu.style.display = 'block';
	}
}

watch(
	() => [route.fullPath, props.menu.children] as const,
	() => { void syncExpandedStateWithRoute(); },
	{ immediate: true, deep: true }
);
</script>
<template>
	<!-- menu with submenu -->
	<div
		v-if="menu.children"
		ref="menuRoot"
		class="menu-item has-sub"
		v-bind:class="{ 'active': subIsActive(menu.children) }"
	>
		<a class="menu-link" href="#" @click="toggleSubmenu">
			<span class="menu-icon" v-if="menu.icon">
				<i v-bind:class="menu.icon"></i>
				<span class="w-5px h-5px rounded-3 bg-theme position-absolute top-0 end-0 mt-3px me-3px" v-if="menu.highlight"></span>
			</span>
			<span class="menu-text">{{ menu.text }}</span>
			<span class="menu-caret" v-if="menu.children"><b class="caret"></b></span>
		</a>
		<div class="menu-submenu">
			<template
				v-for="(submenu, index) in menu.children"
				:key="submenu?.url ? `url:${submenu.url}` : (submenu?.is_header ? `header:${submenu.text}:${index}` : `item:${submenu?.text || 'unknown'}:${index}`)"
			>
				<sidebar-nav v-bind:menu="submenu"></sidebar-nav>
			</template>
		</div>
	</div>
  
	<!-- menu without submenu：含 query 的連結用 fullPath 比對，避免 A-8～A-11 全部高亮 -->
	<router-link v-else v-bind:to="menu.url" custom v-slot="{ navigate, href, isActive }">
		<div class="menu-item" v-bind:class="{ 'active': leafIsActive(menu.url, isActive) }">
			<a v-bind:href="href" @click="navigate" class="menu-link">
				<span class="menu-icon" v-if="menu.icon">
					<i v-bind:class="menu.icon"></i>
					<span class="menu-icon-label" v-if="menu.label">{{ menu.label }}</span>
				</span>
				<span class="menu-text">{{ menu.text }}</span>
			</a>
		</div>
	</router-link>
</template>
