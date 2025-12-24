import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from '@/stores/auth';
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
      path: '/basic/site-personnel',
      component: () => import('../views/basic/SitePersonnel.vue'),
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
      path: '/user-management',
      component: () => import('../views/user-management/UserManagement.vue'),
      meta: { requiresAuth: true }
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
      path: '/workspace/management',
      component: () => import('../views/workspace/WorkspaceManagement.vue'),
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
// router.beforeEach((to, from, next) => {
//   const authStore = useAuthStore();
  
//   // 需要認證的路由
//   if (to.meta.requiresAuth && !authStore.isAuthenticated) {
//     next('/page/login');
//     return;
//   }
  
//   // 訪客專用路由（如登入頁）
//   if (to.meta.requiresGuest && authStore.isAuthenticated) {
//     next('/');
//     return;
//   }
  
//   next();
// });

export default router;
