<script>
import { useAppOptionStore } from '@/stores/app-option';
import { RouterLink } from 'vue-router';

const appOption = useAppOptionStore();

export default {
	mounted() {
		appOption.appSidebarHide = true;
		appOption.appHeaderHide = true;
		appOption.appContentClass = 'p-0';
	},
	beforeUnmount() {
		appOption.appSidebarHide = false;
		appOption.appHeaderHide = false;
		appOption.appContentClass = '';
	}
}
</script>
<template>
	<!-- BEGIN error -->
	<div class="error-page">
		<!-- BEGIN error-page-content -->
		<div class="error-page-content">
			<card class="mb-5 mx-auto" style="max-width: 320px;">
				<card-body>
					<card>
						<div class="error-code">404</div>
					</card>
				</card-body>
			</card>
			<h1>哎呀！</h1>
			<h3>找不到您要的頁面</h3>
			<hr />
			<p class="mb-1">
				以下是一些有用的連結：
			</p>
			<p class="mb-5">
				<RouterLink to="/" class="text-decoration-none text-inverse text-opacity-50">首頁</RouterLink>
				<span class="link-divider"></span>
				<RouterLink to="/page/search-results" class="text-decoration-none text-inverse text-opacity-50">搜尋</RouterLink>
				<span class="link-divider"></span>
				<RouterLink to="/email/inbox" class="text-decoration-none text-inverse text-opacity-50">郵件</RouterLink>
				<span class="link-divider"></span>
				<RouterLink to="/calendar" class="text-decoration-none text-inverse text-opacity-50">行事曆</RouterLink>
				<span class="link-divider"></span>
				<RouterLink to="/settings" class="text-decoration-none text-inverse text-opacity-50">設定</RouterLink>
				<span class="link-divider"></span>
				<RouterLink to="/helper" class="text-decoration-none text-inverse text-opacity-50">說明</RouterLink>
			</p>
			<a href="javascript:window.history.back();" class="btn btn-outline-theme px-3 rounded-pill"><i class="fa fa-arrow-left me-1 ms-n1"></i> 返回</a>
		</div>
		<!-- END error-page-content -->
	</div>
	<!-- END error -->
</template>