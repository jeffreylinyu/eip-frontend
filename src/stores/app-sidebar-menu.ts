import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useViewPerspective } from '@/composables/useViewPerspective';
import { useOnboardingStore } from '@/stores/onboarding'

interface MenuItem {
  text?: string;
  is_header?: boolean;
  is_divider?: boolean;
  url?: string;
  icon?: string;
  highlight?: boolean;
  children?: MenuItem[];
  label?: string;
  isTutorial?: boolean; // 標記為教學頁面
  requiresAdmin?: boolean; // 標記為需要管理員權限
}

export const useAppSidebarMenuStore = defineStore("appSidebarMenu", () => {
  // 隱藏的教學頁面 URL 列表（從 localStorage 讀取）
  const getHiddenTutorials = (): string[] => {
    const stored = localStorage.getItem('hiddenTutorials')
    return stored ? JSON.parse(stored) : []
  }

  const hiddenTutorials = ref<string[]>(getHiddenTutorials())

  // 更新隱藏的教學頁面列表
  const updateHiddenTutorials = (tutorials: string[]) => {
    hiddenTutorials.value = tutorials
    localStorage.setItem('hiddenTutorials', JSON.stringify(tutorials))
  }

  // 隱藏特定教學頁面
  const hideTutorial = (url: string) => {
    if (!hiddenTutorials.value.includes(url)) {
      const updated = [...hiddenTutorials.value, url]
      updateHiddenTutorials(updated)
    }
  }

  // 顯示特定教學頁面
  const showTutorial = (url: string) => {
    const updated = hiddenTutorials.value.filter(u => u !== url)
    updateHiddenTutorials(updated)
  }

  // 檢查特定 URL 是否被隱藏
  const isTutorialHidden = (url: string) => {
    return hiddenTutorials.value.includes(url)
  }

  // 檢查用戶是否有管理員權限
  const hasAdminPermission = (): boolean => {
    const authStore = useAuthStore()
    const user = authStore.user
    if (!user) return false
    
    // 檢查 role 是否為 ADMIN 或 SUPER_ADMIN
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true
    }
    
    // 檢查是否有 chief_engineer 權限（如果權限存儲在 permissions 陣列中）
    // 注意：這裡需要根據實際的權限結構調整
    // 如果 User 介面有 permissions 欄位，可以這樣檢查：
    // return user.permissions?.includes('chief_engineer') || false
    
    return false
  }

  // 過濾選單項目（移除被隱藏的教學頁面和無權限的項目）
  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      // 如果是教學頁面且被隱藏，則過濾掉
      if (item.isTutorial && item.url && isTutorialHidden(item.url)) {
        return false
      }
      
      // 如果需要管理員權限但用戶沒有權限，則過濾掉
      if (item.requiresAdmin && !hasAdminPermission()) {
        return false
      }
      
      // 如果有子選單，遞迴過濾
      if (item.children) {
        item.children = filterMenuItems(item.children)
        // 如果過濾後子選單為空，也過濾掉父項目（可選）
        // if (item.children.length === 0) {
        //   return false
        // }
      }
      return true
    })
  }

  // 工程排程子選單
  const scheduleChildren = computed(() => {
    const children: MenuItem[] = [
      { text: "版本與工項管理", url: "/schedule/versions" },
    ]
    
    return filterMenuItems(children)
  })

  // 獲取視角前綴（用於生成正確的路由 URL）
  const getViewPrefix = (): string => {
    try {
      const workspaceStore = useWorkspaceStore()
      const workspaceId = workspaceStore.currentWorkspace?.id
      
      if (!workspaceId) {
        // 如果沒有工作空間，檢查當前路由
        const currentPath = window.location.hash.replace('#', '')
        if (currentPath.startsWith('/supervisory/')) return '/supervisory'
        if (currentPath.startsWith('/contractor/')) return '/contractor'
        return ''
      }
      
      const { viewType } = useViewPerspective()
      const prefix = viewType.value.toLowerCase()
      
      // 如果是 SHARED 或沒有視角，預設返回監造視角前綴
      if (prefix === 'shared' || !prefix) {
        // 檢查當前路由是否有視角前綴
        const currentPath = window.location.hash.replace('#', '')
        if (currentPath.startsWith('/supervisory/')) return '/supervisory'
        if (currentPath.startsWith('/contractor/')) return '/contractor'
        // 預設返回監造視角前綴
        return '/supervisory'
      }
      
      return `/${prefix}`
    } catch (error) {
      console.warn('獲取視角前綴失敗:', error)
      // 降級處理：檢查當前路由
      const currentPath = window.location.hash.replace('#', '')
      if (currentPath.startsWith('/supervisory/')) return '/supervisory'
      if (currentPath.startsWith('/contractor/')) return '/contractor'
      return ''
    }
  }
  
  // 生成帶視角前綴的 URL
  const getViewUrl = (baseUrl: string): string => {
    // 管理員路由和共用路由不需要視角前綴
    if (baseUrl.startsWith('/admin') || baseUrl.startsWith('/shared') || baseUrl.startsWith('/my-projects')) {
      return baseUrl
    }
    
    // 如果 URL 已經有視角前綴，直接返回
    if (baseUrl.startsWith('/supervisory/') || baseUrl.startsWith('/contractor/')) {
      return baseUrl
    }
    
    const prefix = getViewPrefix()
    if (!prefix) return baseUrl
    
    // 為基本資料相關路由添加視角前綴
    if (baseUrl.startsWith('/basic/') || baseUrl === '/') {
      return `${prefix}${baseUrl}`
    }
    // 變更設計：監造/營造分開
    if (baseUrl === '/design-changes') {
      return `${prefix}/design-changes`
    }
    
    return baseUrl
  }

  // 選單項目（使用 computed 以響應 hiddenTutorials 和權限變化）
  const menuItems = computed(() => {
    const { isSupervisory } = useViewPerspective()
    const onboardingStore = useOnboardingStore()
    const authStore = useAuthStore()
    const systemRole = authStore.user?.systemRole || authStore.user?.role

    // 監造端未開通：顯示「開通專用」側邊欄（含提示/教學）
    // 系統管理員（SUPER_ADMIN）跳過
    if (systemRole !== 'SUPER_ADMIN' && isSupervisory.value && onboardingStore.shouldUseOnboardingFlow && !onboardingStore.isCompleted) {
      const items: MenuItem[] = [
        { text: "工程開通", is_header: true },
        { url: "/supervisory/basic/setup-overview", icon: "bi bi-clipboard-check", text: "基本資料總表" },
        {
          text: "必要設定",
          icon: "bi bi-list-check",
          children: [
            { text: "核心資料", url: "/supervisory/basic/basic-data" },
            { text: "人員配置", url: "/supervisory/basic/site-personnel" },
            { text: "工程項目標單", url: "/supervisory/basic/project-item-database" },
            { text: "施工項目維護", url: "/forms/b-construction-maintenance" },
            { text: "標單材料設定", url: "/forms/tender-material-settings" }
          ]
        },
        { text: "提示", is_header: true },
        {
          text: "為什麼我只能看到這些？",
          icon: "bi bi-info-circle",
          children: [
            {
              text: "完成一次工程開通後，才會解鎖全部功能",
              url: "/supervisory/basic/setup-overview",
              isTutorial: true
            }
          ]
        }
      ]
      return filterMenuItems(items)
    }
    
    const items: MenuItem[] = [
    // 工程儀表板
    { text: "工程儀表板", is_header: true },
    { url: getViewUrl("/"), icon: "bi bi-speedometer2", text: "首頁 (Dashboard)" },

    //基本資料維護
    { text: "基本資料維護", is_header: true },
    {
      text: "核心資料",
      icon: "bi bi-database",
      children: [
        { text: "基本資料維護", url: getViewUrl("/basic/basic-data") },
        { text: "參與單位", url: getViewUrl("/basic/participation-units") },
        // 施工項目維護（原本放在 B 類表單）
        { text: "施工項目維護", url: "/forms/b-construction-maintenance" },
        { text: "工程項目標單", url: getViewUrl("/basic/project-item-database") },
        // 標單材料設定（原本放在 B 類表單）
        { text: "標單材料設定", url: "/forms/tender-material-settings" },
        { text: "變更設計", url: getViewUrl("/design-changes") },
      ],
    },
    {
      text: "監造核心資料",
      icon: "bi bi-building",
      children: [
        { text: "公司基本資料", url: "/supervisory/company/profile" },
        { text: "人員配置", url: "/supervisory/basic/site-personnel" },
      ],
    },


    // 公文中心（以工程案為單位）
    { text: "公文中心", is_header: true },
    { text: "公文列表", url: "/document-center", icon: "bi bi-folder2-open" },

    // 行事曆
    { text: "行事曆", is_header: true },
    { text: "行事曆", url: "/calendar", icon: "bi bi-calendar" },

    // 工程排程
    { text: "工程排程", is_header: true },
    {
      text: "工程排程管理",
      icon: "bi bi-kanban",
      children: scheduleChildren.value,
    },

    // 文件與表單管理
    { text: "文件與表單管理", is_header: true },
    {
      text: "表單生成與管理",
      icon: "bi bi-file-earmark-text",
      children: [
        { text: "表單匯出中心", url: "/forms/export-center" },
        {
          text: "A類表單",
          children: [
            { text: "A-1 工程契約", url: "/forms/a1-contract" },
            { text: "A-2 施工預算書", url: "/forms/a2-budget" },
            { text: "A-3 開、竣、停工報告", url: "/forms/a3-commencement" },
            { text: "A-4 工期展延申請總表", url: "/forms/a4-download" },
            { text: "A-5 估驗請款計價單", url: "/forms/a5-download" },
            // { text: "A-5 參數化表單", url: "/forms/a5-with-params" },
            { text: "A-6 營造工程保險", url: "/forms/a6-insurance" },
            { text: "A-7 職安報備書", url: "/forms/a7-download" },
            { text: "A-8 [收文] 業主來文", url: "/document-center?category=RECEIVE_OWNER" },
            { text: "A-9 [收文] 廠商來文", url: "/document-center?category=RECEIVE_CONTRACTOR" },
            { text: "A-10 [收文] 其他來文", url: "/document-center?category=RECEIVE_OTHER" },
            { text: "A-11 [發文]", url: "/document-center?category=SEND" },
          ],
        },
        {
          text: "B類表單",
          children: [
            { text: "文件檔案分類表", url: "/forms/document-classification" },
            { text: "B-1 監造計劃書", url: "/forms/export-supervision-plan" },
          ],
        },
      ],
    },

  ]
    
    // 過濾選單項目（移除被隱藏的教學頁面和無權限的項目）
    return filterMenuItems(items)
  })

  // 返回包含 menuItems computed 的對象（保持響應性 + 與 Sidebar 的 v-for 兼容）
  return {
    get menuItems() {
      return menuItems.value
    },
    /** 取得帶視角前綴的 URL，用於頁內連結以與側邊欄高亮一致 */
    getViewUrl,
    hideTutorial,
    showTutorial,
    isTutorialHidden,
    // 與現有 v-for 兼容（Sidebar 會直接 iterate store）
    get length() {
      return menuItems.value.length
    },
    [Symbol.iterator]: function* () {
      for (const item of menuItems.value) {
        yield item
      }
    }
  } as any
});
