import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useAppOptionStore } from '@/stores/app-option';
import { dailyReportRoutes } from './dailyReport';

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { 
      path: '/', 
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/access-status-guide',
      component: () => import('../views/AccessStatusGuide.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/home', 
      component: () => import('../views/Home.vue'),
      meta: { requiresAuth: true }
    },
    { 
      path: '/page/login', 
      component: () => import('../views/PageLogin.vue'),
      meta: { requiresGuest: true }
    },
    { 
      path: '/page/register', 
      component: () => import('../views/PageRegister.vue'),
      meta: { requiresGuest: true }
    },
    {
      path: '/basic/basic-data',
      component: () => import('../views/basic/BasicData.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/export-center',
      component: () => import('../views/forms/ExportCenter.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/tender-material-settings',
      component: () => import('../views/forms/TenderMaterialSettings.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a4-download',
      component: () => import('../views/forms/type-a/FormA4Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a5-download',
      component: () => import('../views/forms/type-a/FormA5Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a7-download',
      component: () => import('../views/forms/type-a/FormA7Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a5-with-params',
      component: () => import('../views/forms/type-a/FormA5WithParams.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/b-construction-maintenance',
      component: () => import('../views/forms/type-b/FormBConstructionMaintenance.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/b-construction-maintenance/:id/standards',
      component: () => import('../views/forms/type-b/FormBInspectionStandards.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/b-inspection',
      component: () => import('../views/forms/type-b/FormBInspection.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/b-export-test',
      component: () => import('../views/forms/type-b/FormBExportTest.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/document-classification',
      component: () => import('../views/forms/DocumentClassification.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/basic/site-personnel',
      component: () => import('../views/basic/SitePersonnel.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/basic/participation-units',
      component: () => import('../views/basic/ParticipationUnits.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/basic/project-item-database',
      component: () => import('../views/basic/ProjectItemDatabase.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/calendar',
      component: () => import('../views/Calendar.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/projects',
      component: () => import('../views/admin/ProjectList.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/projects/:constructionId/companies',
      component: () => import('../views/admin/ProjectCompanyManagement.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/create-project',
      component: () => import('../views/admin/CreateProject.vue'),
      meta: { requiresAuth: true, requiresAdmin: true } // 仍保留管理員權限檢查
    },
    {
      path: '/admin/pcces-catalog',
      component: () => import('../views/admin/PccesCatalogImport.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/inspection-standard',
      component: () => import('../views/admin/InspectionStandard.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/material-inspection-standard',
      component: () => import('../views/admin/MaterialInspectionStandard.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/forms/tender-material-settings/:pccesCode/quality-control',
      component: () => import('../views/forms/type-b/FormBMaterialQualityControl.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/admin/company-hub',
      component: () => import('../views/admin/CompanyManagementHub.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/my-projects',
      component: () => import('../views/workspace/MyProjects.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/company/management',
      component: () => import('../views/company/CompanyManagement.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/company/site-personnel',
      component: () => import('../views/company/SitePersonnelManagement.vue'),
      meta: { requiresAuth: true }
    },
    // 工程進度排程
    {
      path: '/schedule/versions',
      component: () => import('../views/schedule/ScheduleEditor.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/schedule/tutorial',
      component: () => import('../views/schedule/ScheduleTutorial.vue'),
      meta: { requiresAuth: true }
    },
    // 工程日報表路由
    ...dailyReportRoutes,
    { 
      path: '/:pathMatch(.*)*', 
      component: () => import('../views/PageError.vue') 
    }
  ],
});

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const workspaceStore = useWorkspaceStore();
  const appOptionStore = useAppOptionStore();
  
  // 1. 處理側邊欄顯示狀態
  if (to.path === '/access-status-guide') {
    appOptionStore.appSidebarHide = true;
    appOptionStore.appHeaderHide = true; // 根據需求，引導頁面可能也不需要 Header，讓介面更乾淨
  } else {
    // 恢復預設顯示 (若這不是預設行為，請根據 App 邏輯調整)
    // 這裡保守起見先不強制設為 false，避免覆蓋 RWD 行為，除非明確知道這是全域設定
    // 但根據需求，離開引導頁應恢復。
    appOptionStore.appSidebarHide = false;
    appOptionStore.appHeaderHide = false;
  }

  // 2. 白名單檢查 (登入、註冊、引導頁、個人設定、錯誤頁)
  const publicRoutes = ['/page/login', '/page/register', '/access-status-guide', '/user/profile'];
  // 簡單檢查字串匹配 (可優化為正則或 meta 判斷)
  if (publicRoutes.includes(to.path) || to.path.startsWith('/page/')) {
    next();
    return;
  }
  
  // 3. 認證檢查
  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/page/login');
    return;
  }
  
  // 4. 權限狀態檢查 (僅針對已登入用戶)
  if (authStore.isAuthenticated) {
     console.log('Guard Check:', { 
       path: to.path, 
       userId: authStore.user?.userId,
       companyId: authStore.user?.companyId,
       hasWorkspaces: workspaceStore.workspaces.length > 0,
       isInitialized: workspaceStore.isInitialized
     })

     // 場景 A: 無公司
     if (!authStore.user?.companyId) {
        // [FIX] 因為 initAuth 是非同步的，且 localStorage 可能存的是舊資料 (缺 companyId)
        // 所以在判定失敗前，嘗試強制刷新一次使用者資料
        console.log('Guard: No companyId in store, trying to fetch fresh user data...')
        if (authStore.user?.userId) {
            try {
                console.log('Guard: Awaiting fetchCurrentUser...')
                await authStore.fetchCurrentUser(authStore.user.userId);
                console.log('Guard: fetchCurrentUser done. New companyId:', authStore.user?.companyId)
            } catch (e) {
                console.warn('Guard: Fetch current user failed', e);
            }
        }

        // 二次檢查：如果刷新後還是沒有，才踢到引導頁
        if (!authStore.user?.companyId) {
            console.warn('Guard: Redirecting to access-status-guide (No Company ID)')
            next('/access-status-guide');
            return;
        }
     }

     // 場景 B: 有公司但無專案
     // 先檢查是否已初始化工作空間 (避免因資料未載入誤判)
     if (!workspaceStore.isInitialized) {
         try {
            console.log('Guard: Initializing workspaces...')
            await workspaceStore.initWorkspaces();
            console.log('Guard: Workspaces initialized. Count:', workspaceStore.workspaces.length)
         } catch(e) {
            console.error('路由守衛: 初始化工作空間失敗', e);
         }
     }
     
     // 再次檢查 (SUPER_ADMIN 例外，通常擁有所有權限或不應被擋)
     // 修改：同時檢查工作空間數量與參與的工程案數量
     // 優先使用新欄位檢查系統角色
     const systemRole = authStore.user?.systemRole || authStore.user?.role
     if (workspaceStore.workspaces.length === 0 && workspaceStore.joinedProjectsCount === 0 && systemRole !== 'SUPER_ADMIN') {
         console.warn('Guard: Redirecting to access-status-guide (No Workspaces or Projects)', {
             role: systemRole,
             workspaces: workspaceStore.workspaces.length,
             projects: workspaceStore.joinedProjectsCount
         })
         next('/access-status-guide');
         return;
     }
  }
  
  // 通過檢查
  next();
});

export default router;
