import { createRouter, createWebHashHistory } from "vue-router";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useCompanyStore } from '@/stores/company';
import { useAppOptionStore } from '@/stores/app-option';
import http from '@/api/http';
import {
  applyAllowedViewTypesFromResolveResponse,
  syncViewPerspectiveFromRouteMeta
} from '@/composables/useViewPerspective';
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
      path: '/basic/insurance',
      component: () => import('../views/basic/ConstructionInsurance.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/export-center',
      redirect: '/',
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
      path: '/forms/o1-extension',
      component: () => import('../views/forms/type-a/FormA4Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/o1-commencement',
      component: () => import('../views/forms/type-a/FormCommencementReport.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a3-commencement',
      component: () => import('../views/forms/type-a/FormCommencementReport.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a5-download',
      component: () => import('../views/forms/type-a/FormA5Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/o3-estimate',
      component: () => import('../views/forms/type-a/FormA5Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a7-download',
      component: () => import('../views/forms/type-a/FormA7Download.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a1-contract',
      component: () => import('../views/forms/DocumentShelf.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a2-budget',
      component: () => import('../views/forms/DocumentShelf.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/a6-insurance',
      component: () => import('../views/forms/DocumentShelf.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/o4-labour-safety',
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
      path: '/forms/b-construction-maintenance/:id/safety-standards',
      redirect: (to) => ({
        path: `/forms/b-construction-maintenance/${String(to.params.id)}/standards`,
        query: { ...to.query, tab: 'safety' },
      }),
    },
    {
      path: '/forms/export-supervision-plan',
      component: () => import('../views/forms/type-b/FormBExportSupervisionPlan.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/b2-safety-supervision-plan',
      component: () => import('../views/forms/type-b/FormB2SafetySupervisionPlan.vue'),
      meta: { requiresAuth: true, requiresSupervisory: true }
    },
    {
      path: '/forms/p4-safety-supervision-plan',
      redirect: '/forms/b2-safety-supervision-plan'
    },
    {
      path: '/forms/subdivision-work-items',
      component: () => import('../views/forms/type-b/FormSubdivisionWorkItems.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/subdivision-work-items/:itemId/standards',
      component: () => import('../views/forms/type-b/FormSubdivisionWorkItemStandardsView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/subdivision-work-items/:itemId/guide',
      component: () => import('../views/forms/type-b/FormSubdivisionWorkItemGuideView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/p1-overall-construction-plan',
      component: () => import('../views/forms/type-b/FormP1OverallConstructionPlan.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/p2-quality-plan',
      component: () => import('../views/forms/type-b/FormP2QualityPlan.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/forms/subdivision-work-items/:itemId/construction-standards',
      redirect: (to) => ({
        path: `/forms/subdivision-work-items/${String(to.params.itemId)}/standards`,
        query: { ...to.query }
      })
    },
    {
      path: '/forms/subdivision-work-items/:itemId/safety-standards',
      redirect: (to) => ({
        path: `/forms/subdivision-work-items/${String(to.params.itemId)}/standards`,
        query: { ...to.query, tab: 'safety' }
      })
    },
    {
      path: '/forms/plan-submission-records',
      component: () => import('../views/forms/type-b/FormBPlanSubmissionRecords.vue'),
      meta: { requiresAuth: true, requiresSupervisory: true }
    },
    {
      path: '/forms/document-classification',
      component: () => import('../views/forms/DocumentClassification.vue'),
      meta: { requiresAuth: true, requiresSupervisory: true }
    },
    {
      path: '/forms/contractor-document-classification',
      component: () => import('../views/forms/ContractorDocumentClassification.vue'),
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
      path: '/admin/safety-health-inspection-standard',
      component: () => import('../views/admin/SafetyHealthInspectionStandard.vue'),
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
      path: '/admin/users',
      component: () => import('../views/admin/UserManagement.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/ai-ocr-test',
      component: () => import('../views/admin/AiOcrTest.vue'),
      meta: { requiresAuth: true, requiresAdmin: true }
    },
    {
      path: '/admin/ai-llm-test',
      component: () => import('../views/admin/AiLlmTest.vue'),
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
      meta: { requiresAuth: true, requiresCompanyAdmin: true }
    },
    // 工程進度排程
    {
      path: '/schedule/versions',
      component: () => import('../views/schedule/ScheduleEditor.vue'),
      meta: { requiresAuth: true }
    },
    // 公文中心（以工程案為單位）- 僅列表；詳情頁路由先隱藏，頁面檔案保留
    {
      path: '/document-center',
      component: () => import('../views/document-center/DocumentCenterList.vue'),
      meta: { requiresAuth: true }
    },
    // 變更設計（依工程案，主表列表與新增/編輯）
    {
      path: '/design-changes',
      component: () => import('../views/design-change/DesignChangeList.vue'),
      meta: { requiresAuth: true }
    },
    // {
    //   path: '/document-center/new',
    //   component: () => import('../views/document-center/DocumentCenterDetail.vue'),
    //   meta: { requiresAuth: true }
    // },
    // {
    //   path: '/document-center/:id',
    //   component: () => import('../views/document-center/DocumentCenterDetail.vue'),
    //   meta: { requiresAuth: true }
    // },
    // 工程日報表路由
    ...dailyReportRoutes,
    
    // ========================================================
    // 視角特定路由（監造）
    // ========================================================
    {
      path: '/supervisory',
      redirect: '/supervisory/',
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/basic-data',
      component: () => import('../views/supervisory/basic/BasicData.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/insurance',
      redirect: '/supervisory/basic/insurance-project',
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/insurance-project',
      component: () => import('../views/basic/ConstructionInsurance.vue'),
      props: { fixedScope: 'PROJECT', hideScopeSwitcher: true, pageTitle: '工程保險（工程案）' },
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/insurance-company',
      component: () => import('../views/basic/ConstructionInsurance.vue'),
      props: { fixedScope: 'SUPERVISION_COMPANY_IN_PROJECT', hideScopeSwitcher: true, pageTitle: '工程保險（監造公司本案）' },
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/participation-units',
      component: () => import('../views/supervisory/basic/ParticipationUnits.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/site-personnel',
      component: () => import('../views/supervisory/basic/SitePersonnel.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/project-item-database',
      component: () => import('../views/basic/ProjectItemDatabase.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/basic/setup-overview',
      component: () => import('../views/supervisory/basic/SetupOverview.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/company/profile',
      component: () => import('../views/supervisory/company/CompanyProfile.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    {
      path: '/supervisory/design-changes',
      component: () => import('../views/design-change/DesignChangeList.vue'),
      meta: { requiresAuth: true, viewType: 'SUPERVISORY' }
    },
    
    // ========================================================
    // 視角特定路由（營造）
    // ========================================================
    {
      path: '/contractor',
      redirect: '/contractor/',
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/basic/basic-data',
      component: () => import('../views/contractor/basic/BasicData.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/basic/insurance',
      component: () => import('../views/basic/ConstructionInsurance.vue'),
      props: { fixedScope: 'PROJECT', hideScopeSwitcher: true, pageTitle: '工程保險' },
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/basic/participation-units',
      component: () => import('../views/contractor/basic/ParticipationUnits.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/basic/site-personnel',
      component: () => import('../views/contractor/basic/SitePersonnel.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/basic/project-item-database',
      component: () => import('../views/basic/ProjectItemDatabase.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    {
      path: '/contractor/design-changes',
      component: () => import('../views/design-change/DesignChangeList.vue'),
      meta: { requiresAuth: true, viewType: 'CONTRACTOR' }
    },
    
    // ========================================================
    // 共用路由（個人設定、通知等）
    // ========================================================
    {
      path: '/shared',
      redirect: '/shared/',
      meta: { requiresAuth: true, viewType: 'SHARED' }
    },
    {
      path: '/shared/',
      component: () => import('../views/Dashboard.vue'),
      meta: { requiresAuth: true, viewType: 'SHARED' }
    },
    
    {
      path: '/:pathMatch(.*)*',
      component: () => import('../views/PageError.vue'),
      meta: { isNotFoundFallback: true }
    }
  ],
});

// 路由守衛
router.beforeEach(async (to, from, next) => {
  const authStore = useAuthStore();
  const workspaceStore = useWorkspaceStore();
  const appOptionStore = useAppOptionStore();
  // onboarding gate（監造端）
  const { useOnboardingStore } = await import('@/stores/onboarding')
  const onboardingStore = useOnboardingStore()
  const { useViewPerspective, ViewType } = await import('@/composables/useViewPerspective')
  const { isSupervisory, viewType } = useViewPerspective()
  
  // 視角路由檢查（在認證檢查之後）
  if (to.meta.viewType && authStore.isAuthenticated) {
    const requiredViewType = to.meta.viewType as string
    const workspaceId = workspaceStore.currentWorkspace?.id
    
    if (workspaceId) {
      try {
        // 檢查是否為系統管理員
        const systemRole = authStore.user?.systemRole || authStore.user?.role
        const isSuperAdmin = systemRole === 'SUPER_ADMIN' || systemRole === 'ADMIN'
        
        const response = await http.get<unknown>(
          `/management/viewType/resolve?workspaceId=${workspaceId}`
        )

        const parsed = applyAllowedViewTypesFromResolveResponse(response)
        const userViewType = parsed.viewType
        const allowed = parsed.allowedViewTypes

        if (userViewType || allowed.length > 0) {
          if (isSuperAdmin) {
            // 管理員可訪問所有視角
          } else if (allowed.length > 0 && allowed.includes(requiredViewType)) {
            // 同時隸屬監造與營造等公司時，依 allowed 放行
          } else if (userViewType && userViewType !== requiredViewType) {
            const currentPath = to.path
            const viewPrefix = userViewType.toLowerCase()

            let redirectPath = currentPath
            if (currentPath.startsWith('/supervisory/') || currentPath.startsWith('/contractor/')) {
              redirectPath = currentPath.replace(/^\/(supervisory|contractor)/, `/${viewPrefix}`)
            } else if (!currentPath.startsWith('/shared/') && !currentPath.startsWith('/admin/')) {
              redirectPath = `/${viewPrefix}${currentPath}`
            }

            if (redirectPath !== currentPath) {
              next(redirectPath)
              return
            }
          }
        }
      } catch (error) {
        console.warn('視角檢查失敗，允許繼續:', error)
        // 如果視角檢查失敗，允許繼續（降級處理）
      }
    }
  }
  
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

  // 2. 訪客專用：僅 /page/*（登入、註冊等）。其餘路徑（含 404、引導頁、個人頁）皆須登入
  if (to.path.startsWith('/page/')) {
    if (authStore.isAuthenticated && to.meta.requiresGuest) {
      next('/')
      return
    }
    next()
    return
  }

  if (!authStore.isAuthenticated) {
    next('/page/login')
    return
  }

  // 監造計畫送審紀錄獨立頁：直接依後端 /viewType/resolve 字串判斷（與 composable 載入時序無關）
  if (authStore.isAuthenticated && (to.meta as { requiresSupervisory?: boolean }).requiresSupervisory) {
    const systemRole = authStore.user?.systemRole || authStore.user?.role
    const isSuperAdmin = systemRole === 'SUPER_ADMIN' || systemRole === 'ADMIN'
    if (!isSuperAdmin) {
      const wid = workspaceStore.currentWorkspace?.id
      if (wid) {
        try {
          const response = await http.get<{
            code?: number
            data?: { viewType?: string; data?: { viewType?: string } }
          }>(`/management/viewType/resolve?workspaceId=${wid}`)
          let userViewType: string | null = null
          if (response && typeof response === 'object') {
            if ('data' in response && response.data && typeof response.data === 'object') {
              if ('viewType' in response.data) {
                userViewType = (response.data as { viewType?: string }).viewType ?? null
              } else if (
                'data' in response.data &&
                (response.data as { data?: { viewType?: string } }).data &&
                typeof (response.data as { data?: { viewType?: string } }).data === 'object'
              ) {
                userViewType =
                  (response.data as { data?: { viewType?: string } }).data?.viewType ?? null
              }
            } else if ('viewType' in response) {
              userViewType = (response as { viewType?: string }).viewType ?? null
            }
          }
          if (userViewType === 'CONTRACTOR') {
            next('/forms/b-construction-maintenance')
            return
          }
        } catch {
          // 解析失敗不強制導離，避免誤擋監造；API 已由後端擋營造
        }
      }
    }
  }

  // 3.1 公司管理權限檢查（公司 OWNER / ADMIN）
  if (to.meta.requiresCompanyAdmin && authStore.isAuthenticated) {
    const companyStore = useCompanyStore();
    if (companyStore.activeCompanies.length === 0) {
      try {
        await companyStore.initCompanies();
      } catch {
        // ignore
      }
    }

    const hasCompanyAdminRole = companyStore.activeCompanies.some(
      (c: any) => c.userRole === 'OWNER' || c.userRole === 'ADMIN'
    );
    if (!hasCompanyAdminRole) {
      next('/company/management');
      return;
    }
  }
  
  // 4. 權限狀態檢查 (僅針對已登入用戶)
  if (authStore.isAuthenticated) {
    // 已在引導頁時不可再 next 到同一路徑，否則守衛重入會無限重導、主控台洗版
    const onAccessStatusGuide = to.path === '/access-status-guide'

     // 場景 A: 無公司
     if (!authStore.user?.companyId) {
        // [FIX] 因為 initAuth 是非同步的，且 localStorage 可能存的是舊資料 (缺 companyId)
        // 所以在判定失敗前，嘗試強制刷新一次使用者資料
        if (authStore.user?.userId) {
            try {
                await authStore.fetchCurrentUser(authStore.user.userId);
            } catch (e) {
                console.warn('Guard: Fetch current user failed', e);
            }
        }

        // 二次檢查：如果刷新後還是沒有，才踢到引導頁
        // SUPER_ADMIN / ADMIN 需能進入系統建立公司或後台，與「無專案」邏輯一致，不因未關聯公司而卡死
        if (!authStore.user?.companyId) {
            const roleForGate = authStore.user?.systemRole || authStore.user?.role
            const isSystemAdmin =
              roleForGate === 'SUPER_ADMIN' || roleForGate === 'ADMIN'
            if (!isSystemAdmin && !onAccessStatusGuide) {
              console.warn('Guard: Redirecting to access-status-guide (No Company ID)')
              next('/access-status-guide')
              return
            }
        }
     }

     // 場景 B: 有公司但無專案
     // 先檢查是否已初始化工作空間 (避免因資料未載入誤判)
     if (!workspaceStore.isInitialized) {
         try {
            await workspaceStore.initWorkspaces();
         } catch(e) {
            console.error('路由守衛: 初始化工作空間失敗', e);
         }
     }
     
     // 再次檢查 (SUPER_ADMIN 例外，通常擁有所有權限或不應被擋)
     // 修改：同時檢查工作空間數量與參與的工程案數量
     // 優先使用新欄位檢查系統角色
     const systemRole = authStore.user?.systemRole || authStore.user?.role
     if (
       !onAccessStatusGuide &&
       workspaceStore.workspaces.length === 0 &&
       workspaceStore.joinedProjectsCount === 0 &&
       systemRole !== 'SUPER_ADMIN'
     ) {
         console.warn('Guard: Redirecting to access-status-guide (No Workspaces or Projects)', {
             role: systemRole,
             workspaces: workspaceStore.workspaces.length,
             projects: workspaceStore.joinedProjectsCount
         })
         next('/access-status-guide');
         return;
     }
  }

  // 5. 監造端工程開通擋路（方案 A：未開通前只能進入必要頁面與總表）
  try {
    if (authStore.isAuthenticated && isSupervisory.value) {
      // 系統管理員（SUPER_ADMIN）跳過此檢查
      const systemRole = authStore.user?.systemRole || authStore.user?.role
      if (systemRole !== 'SUPER_ADMIN') {
        // 需要先有工程案
        const constructionId = workspaceStore.currentProject?.id
        if (constructionId) {
          // 允許通行的路由（含總表 + 5 個必要頁面）
          const allowedPrefixes = [
            '/page/', // 已在 publicRoutes 擋掉，這裡保險
            '/access-status-guide',
            '/user/profile',
            '/my-projects',
            '/company/management',
            '/company/site-personnel',
            '/supervisory/basic/setup-overview',
            '/supervisory/basic/basic-data',
            '/supervisory/basic/site-personnel',
            '/supervisory/basic/project-item-database',
            // 共用路由也允許（避免沒有視角前綴時進不了）
            '/basic/basic-data',
            '/basic/site-personnel',
            '/basic/project-item-database',
            '/forms/b-construction-maintenance',
            '/forms/tender-material-settings',
            '/calendar'
          ]

          const isAllowed = allowedPrefixes.some((p) => to.path === p || to.path.startsWith(p))
          const vt = viewType.value
          const onboardingOwner =
            vt === ViewType.CONTRACTOR
              ? 'CONTRACTOR'
              : vt === ViewType.SUPERVISORY
                ? 'SUPERVISORY'
                : undefined
          const status = await onboardingStore.fetchStatus(constructionId, false, onboardingOwner)
          if (!status.completed && !isAllowed) {
            next('/supervisory/basic/setup-overview')
            return
          }
        }
      }
    }
  } catch (e) {
    // 降級：若檢核失敗，不擋路避免把使用者卡死
  }
  
  // 通過檢查
  next();
});

router.afterEach((to) => {
  syncViewPerspectiveFromRouteMeta(to.meta);
});

export default router;
