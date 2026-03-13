<script setup lang="ts">
import SidebarNav from '@/components/app/SidebarNav.vue';
import { useRouter, useRoute } from 'vue-router'

defineProps<{
  menu: {
  	icon?: string,
  	text?: string,
  	url?: string,
  	highlight?: boolean,
  	children?: any,
  	label?: string
  };
}>();

const route = useRoute();

function subIsActive(urls: { url?: string }[]) {
	// 有 query 的連結要用 fullPath 比對，否則用 path（與下方 leaf 邏輯一致）
	const currentFull = route.fullPath;
	const currentPath = route.path;
	let match = false;
	for (let x = 0; x < urls.length; x++) {
		const u = urls[x].url ?? '';
		if (u.includes('?')) {
			if (currentFull === u) match = true;
		} else {
			if (currentPath === u) match = true;
		}
	}
	return match;
}

/** 葉子選單是否為當前頁：Vue Router 4 的 isActive 不考慮 query，故改為用 fullPath 比對 */
function leafIsActive(menuUrl: string | undefined, slotIsActive: boolean): boolean {
	if (!menuUrl) return slotIsActive;
	if (menuUrl.includes('?')) return route.fullPath === menuUrl;
	return slotIsActive;
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
</script>
<template>
	<!-- menu with submenu -->
	<div v-if="menu.children" class="menu-item has-sub" v-bind:class="{ 'active': subIsActive(menu.children) }">
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