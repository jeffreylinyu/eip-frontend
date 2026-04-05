<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { companyApi } from '@/api/company';
import { slideToggle } from '@/composables/slideToggle.js';
import { useAppOptionStore } from '@/stores/app-option';
import { useAuthStore } from '@/stores/auth';
import { RouterLink, useRouter } from 'vue-router';
import { useWorkspaceStore } from '@/stores/workspace';
import { useViewPerspective, ViewType } from '@/composables/useViewPerspective';
import ViewTypeSwitcher from '@/components/app/ViewTypeSwitcher.vue';
import CoreDataStatusModal from '@/components/project/CoreDataStatusModal.vue';

const appOption = useAppOptionStore();
const authStore = useAuthStore();
const router = useRouter();
const notificationData = [];
const workspaceStore = useWorkspaceStore();
const { viewType } = useViewPerspective();

// 登出功能
const handleLogout = async () => {
	await authStore.logout();
	router.push('/page/login');
};

function toggleAppSidebarCollapsed() {
	if (!appOption.appSidebarHide) {
		if (appOption.appSidebarCollapsed) {
			appOption.appSidebarToggled = !appOption.appSidebarToggled;
		} else if (appOption.appSidebarToggled) {
			appOption.appSidebarToggled = !appOption.appSidebarToggled;
		}
		appOption.appSidebarCollapsed = !appOption.appSidebarCollapsed;
	}
}
function toggleAppSidebarMobileToggled() {
	if (!(appOption.appTopNav && appOption.appSidebarHide)) {
		appOption.appSidebarMobileToggled = !appOption.appSidebarMobileToggled;
	} else {
		slideToggle(document.querySelector('.app-top-nav'));
		window.scrollTo(0, 0);
	}
}
function toggleAppHeaderSearch(event) {
	event.preventDefault();
	
	appOption.appHeaderSearchToggled = !appOption.appHeaderSearchToggled;
}
function checkForm(event) {
	event.preventDefault();
	this.$router.push({ path: '/extra/search' })
}


// 工作空間與項目相關的 computed 變數
const currentWorkspaceName = computed(() => workspaceStore.getCurrentWorkspaceName);
const currentProjectName = computed(() => workspaceStore.getCurrentProjectName);
const hasCurrentWorkspace = computed(() => workspaceStore.hasCurrentWorkspace);
const hasCurrentProject = computed(() => workspaceStore.hasCurrentProject);

// 檢查是否為系統管理員（優先使用新欄位）
const hasAdminPermission = computed(() => {
	const user = authStore.user;
	if (!user) return false;
	const systemRole = user.systemRole || user.role; // 優先使用新欄位
	return systemRole === 'ADMIN' || systemRole === 'SUPER_ADMIN';
});

// 檢查是否為系統維護模式（路由以 /admin 開頭）
const isAdminMode = computed(() => {
	return router.currentRoute.value.path.startsWith('/admin');
});

// 完整的品牌文字（用於 title 屬性）
/** 左上品牌：雙視角時依監造／營造顯示參與單位公司名，否則用帳號所屬公司 */
const brandCompanyName = computed(() => {
  const units = workspaceStore.participatingUnits;
  const vt = viewType.value;
  if (vt === ViewType.CONTRACTOR && units.contractorCompany?.companyName) {
    return units.contractorCompany.companyName;
  }
  if (vt === ViewType.SUPERVISORY && units.supervisoryCompany?.companyName) {
    return units.supervisoryCompany.companyName;
  }
  return userCompanyName.value || '';
});

const getFullBrandText = computed(() => {
  const company = brandCompanyName.value || '工程智慧平台';
  if (hasCurrentProject.value) {
    return `${company} - ${currentProjectName.value}`;
  }
  return company;
});

const userCompanyName = ref('');
const isCompanyAdmin = ref(false);

const fetchUserCompanyName = async () => {
    if (authStore.user?.companyId) {
        try {
            const [detail, perm] = await Promise.all([
                companyApi.getDetail(authStore.user.companyId),
                companyApi.checkPermission(authStore.user.companyId)
            ]);
            userCompanyName.value = detail.companyName;
            
             // Allow OWNER or ADMIN to access company management
            const role = (perm.userRole || '').toUpperCase();
            isCompanyAdmin.value = perm.hasPermission && (role === 'OWNER' || role === 'ADMIN');
        } catch (error) {
            console.error('Failed to fetch company name:', error);
            userCompanyName.value = '';
            isCompanyAdmin.value = false;
        }
    }
}

watch(() => authStore.user?.companyId, () => {
    fetchUserCompanyName();
}, { immediate: true });

watch(
  () => workspaceStore.currentWorkspace?.id,
  async (id) => {
    if (!id) return;
    try {
      await workspaceStore.fetchParticipatingUnits(id);
    } catch {
      /* 與工程案無關時略過 */
    }
  },
  { immediate: true }
);


const onProjectSelected = (project) => {
};

// 初始化工作空間數據
workspaceStore.initWorkspaces();
</script>
<template>
	<div id="header" class="app-header">
		<!-- BEGIN desktop-toggler -->
		<div class="desktop-toggler">
			<button type="button" class="menu-toggler" v-on:click="toggleAppSidebarCollapsed">
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</button>
		</div>
		<!-- BEGIN desktop-toggler -->
		
		<!-- BEGIN mobile-toggler -->
		<div class="mobile-toggler">
			<button type="button" class="menu-toggler" v-on:click="toggleAppSidebarMobileToggled">
				<span class="bar"></span>
				<span class="bar"></span>
				<span class="bar"></span>
			</button>
		</div>
		<!-- END mobile-toggler -->
		
		<!-- BEGIN brand -->
		<div class="brand">
			<!-- 系統維護模式顯示 -->
			<template v-if="isAdminMode">
				<div class="d-flex align-items-center w-100">
					<span class="brand-img me-2">
						<span class="brand-img-text text-warning">
							<i class="fa fa-shield-alt"></i>
						</span>
					</span>
					<div class="brand-text-container flex-grow-1">
						<span class="brand-text text-warning fw-semibold">系統維護模式</span>
					</div>
					<RouterLink to="/" class="btn btn-sm btn-outline-secondary ms-2">
						<i class="fa fa-arrow-left me-1"></i>
						退出系統維護模式
					</RouterLink>
				</div>
			</template>
			<!-- 一般模式顯示 -->
			<RouterLink v-else to="/" class="brand-logo">
				<span class="brand-img">
					<span class="brand-img-text text-theme">H</span>
				</span>
				<div class="brand-text-container">
					<span class="brand-text" :title="getFullBrandText">
						<span class="brand-text-part">{{ brandCompanyName || '工程智慧平台' }}</span>
						<span v-if="hasCurrentProject" class="brand-text-suffix"> - {{ currentProjectName }}</span>
					</span>
				</div>
			</RouterLink>
		</div>
		<!-- END brand -->
		
		<!-- BEGIN menu -->
		<div class="menu">
			<!-- 視角切換器 -->
			<div class="menu-item">
				<ViewTypeSwitcher />
			</div>

      <!-- 核心資料填寫狀況（B-1 監造計劃書） -->
      <div class="menu-item" v-if="hasCurrentProject">
        <button
          type="button"
          class="header-chrome-text-btn"
          @click="appOption.showCoreDataStatusModal = true"
        >
          <i class="fa fa-clipboard-check" aria-hidden="true"></i>
          <span class="d-none d-md-inline">核心資料填寫狀況</span>
        </button>
      </div>
			
			<div class="menu-item">
				<a href="#" v-on:click="toggleAppHeaderSearch" data-toggle-class="app-header-menu-search-toggled" data-toggle-target=".app" class="menu-link header-chrome-icon-btn" aria-label="搜尋選單">
					<div class="menu-icon"><i class="bi bi-search nav-icon"></i></div>
				</a>
			</div>
			
			<!-- 設定下拉選單 -->
			<div class="menu-item dropdown dropdown-mobile-full">
				<a href="#" data-bs-toggle="dropdown" data-bs-display="static" class="menu-link header-chrome-icon-btn" title="設定與管理" aria-label="設定與管理">
					<div class="menu-icon"><i class="fa fa-cogs nav-icon"></i></div>
				</a>
				<div class="dropdown-menu fade dropdown-menu-end w-280px p-0 mt-1">
					<!-- 一般設定區塊（系統管理員不顯示） -->
					<RouterLink v-if="!hasAdminPermission" to="/my-projects" class="dropdown-item d-flex align-items-center py-2 px-3 text-decoration-none">
						<i class="fa fa-sitemap text-primary me-3 fs-16px"></i>
						<div>
							<div class="fw-semibold">我的工程案</div>
							<small class="text-muted">設定與切換工作空間和工程案</small>
						</div>
					</RouterLink>
					
					<!-- 公司管理（系統管理員不顯示，僅公司管理員可見） -->
					<RouterLink v-if="!hasAdminPermission && isCompanyAdmin" to="/company/management" class="dropdown-item d-flex align-items-center py-2 px-3 text-decoration-none">
						<i class="fa fa-building text-success me-3 fs-16px"></i>
						<div>
							<div class="fw-semibold">公司管理</div>
							<small class="text-muted">管理公司信息和人員</small>
						</div>
					</RouterLink>
					
					<!-- 系統維護（僅系統管理員可見） -->
					<template v-if="hasAdminPermission">
						<RouterLink to="/admin/pcces-catalog" class="dropdown-item d-flex align-items-center py-2 px-3 text-decoration-none">
							<i class="fa fa-cog text-warning me-3 fs-16px"></i>
							<div>
								<div class="fw-semibold">系統維護</div>
								<small class="text-muted">進入系統層級管理</small>
							</div>
						</RouterLink>
					</template>
				</div>
			</div>
			<div class="menu-item dropdown dropdown-mobile-full">
				<a href="#" data-bs-toggle="dropdown" data-bs-display="static" class="menu-link header-chrome-icon-btn" aria-label="通知">
					<div class="menu-icon"><i class="bi bi-bell nav-icon"></i></div>
					<div class="menu-badge bg-theme" v-if="notificationData && notificationData.length > 0"></div>
				</a>
				<div class="dropdown-menu dropdown-menu-end mt-1 w-300px fs-11px pt-1">
					<h6 class="dropdown-header fs-10px mb-1">NOTIFICATIONS</h6>
					<div class="dropdown-divider mt-1"></div>
					<template v-if="notificationData && notificationData.length > 0">
						<a href="#" class="d-flex align-items-center py-10px dropdown-item text-wrap fw-semibold" v-for="(notification, index) in notificationData" v-bind:key="index">
							<div class="fs-20px">
								<i v-if="notification.icon" v-bind:class="notification.icon"></i>
							</div>
							<div class="flex-1 flex-wrap ps-3">
								<div class="mb-1 text-inverse">{{ notification.title }}</div>
								<div class="small text-inverse text-opacity-50">{{ notification.time }}</div>
							</div>
							<div class="ps-2 fs-16px">
								<i class="bi bi-chevron-right"></i>
							</div>
						</a>
					</template>
					<template v-else>
						<div class="px-3 pb-3 pt-2">
							No record found
						</div>
					</template>
					<hr class="m-0">
					<div class="py-10px mb-n2 text-center">
						<a href="#" class="text-decoration-none fw-bold">SEE ALL</a>
					</div>
				</div>
			</div>
			<div class="menu-item dropdown dropdown-mobile-full">
				<a href="#" data-bs-toggle="dropdown" data-bs-display="static" class="menu-link">
					<div class="menu-img online">
						<div class="d-flex align-items-center justify-content-center w-100 h-100 bg-inverse bg-opacity-25 text-inverse text-opacity-50 rounded-circle overflow-hidden">
							<i class="bi bi-person-fill fs-32px mb-n3"></i>
						</div>
					</div>
					<div
						class="menu-text d-sm-block d-none menu-user-text"
						:title="authStore.user?.email || '遊客'"
					>
						{{ authStore.user?.email || '遊客' }}
					</div>
				</a>
				<div class="dropdown-menu dropdown-menu-end me-lg-3 fs-11px mt-1">
					<RouterLink to="/profile" class="dropdown-item d-flex align-items-center">個人資料 <i class="bi bi-person-circle ms-auto text-theme fs-16px my-n1"></i></RouterLink>
					<RouterLink to="/email/inbox" class="dropdown-item d-flex align-items-center">收件匣 <i class="bi bi-envelope ms-auto text-theme fs-16px my-n1"></i></RouterLink>
					<RouterLink to="/calendar" class="dropdown-item d-flex align-items-center">行事曆 <i class="bi bi-calendar ms-auto text-theme fs-16px my-n1"></i></RouterLink>
					<RouterLink to="/settings" class="dropdown-item d-flex align-items-center">設定 <i class="bi bi-gear ms-auto text-theme fs-16px my-n1"></i></RouterLink>
					<div class="dropdown-divider"></div>
					<a href="#" @click.prevent="handleLogout" class="dropdown-item d-flex align-items-center">登出 <i class="bi bi-toggle-off ms-auto text-theme fs-16px my-n1"></i></a>
				</div>
			</div>
		</div>
		<!-- END menu -->
		
		<!-- BEGIN menu-search -->
		<form class="menu-search" name="header_search_form" v-on:submit="checkForm">
			<div class="menu-search-container">
				<div class="menu-search-icon"><i class="bi bi-search"></i></div>
				<div class="menu-search-input">
					<input type="text" class="form-control form-control-lg" placeholder="Search menu...">
				</div>
				<div class="menu-search-icon">
					<a href="#" v-on:click="toggleAppHeaderSearch"><i class="bi bi-x-lg"></i></a>
				</div>
			</div>
		</form>
		<!-- END menu-search -->

    <!-- 全域 B-1 核心資料填寫狀況 Modal -->
    <CoreDataStatusModal
      :show="appOption.showCoreDataStatusModal"
      @update:show="appOption.showCoreDataStatusModal = $event"
    />
	</div>
	
</template>

<style scoped>
/* 讓 header 使用者名稱不破版（單行省略） */
.menu-user-text {
	max-width: 170px; /* 與原本 w-170px 一致 */
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
}

/* 重要：在 flex 容器內允許縮小，ellipsis 才會生效 */
.menu-link {
	min-width: 0;
}
</style>
