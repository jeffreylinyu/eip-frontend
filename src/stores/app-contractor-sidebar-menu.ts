import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useViewPerspective } from '@/composables/useViewPerspective';
import type { SidebarMenuItem as MenuItem } from '@/types/sidebar-menu'

export const useAppContractorSidebarMenuStore = defineStore("appContractorSidebarMenu", () => {
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()

  // 隱藏的教學頁面 URL 列表
  const getHiddenTutorials = (): string[] => {
    const stored = localStorage.getItem('hiddenTutorials')
    return stored ? JSON.parse(stored) : []
  }

  const hiddenTutorials = ref<string[]>(getHiddenTutorials())

  const updateHiddenTutorials = (tutorials: string[]) => {
    hiddenTutorials.value = tutorials
    localStorage.setItem('hiddenTutorials', JSON.stringify(tutorials))
  }

  const hideTutorial = (url: string) => {
    if (!hiddenTutorials.value.includes(url)) {
      const updated = [...hiddenTutorials.value, url]
      updateHiddenTutorials(updated)
    }
  }

  const showTutorial = (url: string) => {
    const updated = hiddenTutorials.value.filter(u => u !== url)
    updateHiddenTutorials(updated)
  }

  const isTutorialHidden = (url: string) => {
    return hiddenTutorials.value.includes(url)
  }

  const hasAdminPermission = (): boolean => {
    const user = authStore.user
    if (!user) return false
    if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
      return true
    }
    return false
  }

  const filterMenuItems = (items: MenuItem[]): MenuItem[] => {
    return items.filter(item => {
      if (item.visible === false) {
        return false
      }
      if (item.isTutorial && item.url && isTutorialHidden(item.url)) {
        return false
      }
      if (item.requiresAdmin && !hasAdminPermission()) {
        return false
      }
      if (item.children) {
        item.children = filterMenuItems(item.children)
        if (item.children.length === 0 && !item.url) {
          return false
        }
      }
      return true
    })
  }

  // 獲取視角前綴（用於生成正確的路由 URL）
  const getViewPrefix = (): string => {
    try {
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
      
      // 如果是 SHARED 或沒有視角，返回空字串（使用原有路由）
      if (prefix === 'shared' || !prefix) {
        // 檢查當前路由是否有視角前綴
        const currentPath = window.location.hash.replace('#', '')
        if (currentPath.startsWith('/supervisory/')) return '/supervisory'
        if (currentPath.startsWith('/contractor/')) return '/contractor'
        return ''
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

  // 營造側邊欄選單（只有基本資料）
  const menuItems = computed(() => {
    // 確保追蹤 viewType 的變化
    const { viewType } = useViewPerspective()
    const currentViewType = viewType.value // 讀取以建立響應式依賴
    
    // 確保追蹤 workspace 的變化
    const currentWorkspaceId = workspaceStore.currentWorkspace?.id
    
    const items: MenuItem[] = [
      // 工程儀表板
      { text: "工程儀表板", is_header: true },
      { url: getViewUrl("/"), icon: "bi bi-speedometer2", text: "首頁 (Dashboard)" },

      // 基本資料維護
      { text: "基本資料維護", is_header: true },
      {
        text: "基本資料",
        icon: "bi bi-database",
        children: [
          { text: "基本資料維護", url: getViewUrl("/basic/basic-data") },
          { text: "工程保險", url: getViewUrl("/basic/insurance") },
          { text: "參與單位", url: getViewUrl("/basic/participation-units") },
          { text: "工地相關人員", url: getViewUrl("/basic/site-personnel") },
          { text: "工程項目標單", url: getViewUrl("/basic/project-item-database") },
          { text: "變更設計", url: getViewUrl("/design-changes") },
        ],
      },

      // 公文中心（以工程案為單位）
      { text: "公文中心", is_header: true },
      { text: "公文列表", url: "/document-center", icon: "bi bi-folder2-open" },

      // 行事曆
      { text: "行事曆", is_header: true },
      { text: "行事曆", url: "/calendar", icon: "bi bi-calendar" },

      // 文件與表單管理
      { text: "文件與表單管理", is_header: true },
      {
        text: "表單生成與管理",
        icon: "bi bi-file-earmark-text",
        children: [
              { text: "文件檔案分類表", url: "/forms/contractor-document-classification" },
              {
                text: "O類表單",
                children: [
                  { text: "O-1 開、竣、停工報告", url: "/forms/o1-commencement" },
                  { text: "O-2 工期展延申請總表", url: "/forms/o1-extension" },
                  { text: "O-3 估驗請款計價表", url: "/forms/o3-estimate" },
                  { text: "O-4 職安報備書", url: "/forms/o4-labour-safety" },
                ],
              },
              {
                text: "P類(計劃書)表單",
                children: [
                  { text: "分項工程維護", url: "/forms/subdivision-work-items" },
                  { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan" },
                ],
              },
        ],
      },

      // 施工日誌管理（營造端暫不顯示）
      { text: "施工日誌管理", is_header: true, visible: false },
      {
        text: "施工日誌管理",
        icon: "bi bi-journal-text",
        visible: false,
        children: [
          { text: "施工日誌", url: "/daily-report" },
          { text: "材料進場", url: "/daily-report/materials" },
          { text: "出工紀錄", url: "/daily-report/labor" },
          { text: "機具出工", url: "/daily-report/equipment" },
          { text: "進場紀錄", url: "/daily-report/incoming" },
          { text: "材料檢驗", url: "/daily-report/inspection" },
          { text: "安全衛生", url: "/daily-report/safety" },
          { text: "施工記錄", url: "/daily-report/construction" },
          { text: "重要記事", url: "/daily-report/notes" },
          { text: "明日進度", url: "/daily-report/tomorrow" },
          { text: "製表人", url: "/daily-report/preparer" },
          { text: "日誌歷史", url: "/daily-report/history" },
        ],
      },
    ]
    
    return filterMenuItems(items)
  })

  // 返回包含 menuItems computed 的對象，以保持響應性
  return {
    get menuItems() {
      return menuItems.value
    },
    hideTutorial,
    showTutorial,
    isTutorialHidden,
    // 為了與現有代碼兼容，添加數組方法
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
