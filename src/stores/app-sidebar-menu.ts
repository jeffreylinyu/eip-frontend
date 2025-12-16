import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { useAuthStore } from '@/stores/auth';

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
      { text: "使用教學", url: "/schedule/tutorial", isTutorial: true },
      { text: "版本與工項管理", url: "/schedule/versions" },
    ]
    
    return filterMenuItems(children)
  })

  // 選單項目（使用 computed 以響應 hiddenTutorials 和權限變化）
  const menuItems = computed(() => {
    const items: MenuItem[] = [
    // 工程儀表板
    { text: "工程儀表板", is_header: true },
    { url: "/", icon: "bi bi-speedometer2", text: "首頁 (Dashboard)" },

    //基本資料維護
    { text: "基本資料維護", is_header: true },
    {
      text: "基本資料",
      icon: "bi bi-database",
      children: [
        { text: "基本資料維護", url: "/basic/basic-data" },
        { text: "工地相關人員", url: "/basic/site-personnel" },
        { text: "工程項目標單", url: "/basic/project-item-database" },
      ],
    },

    // 用戶管理
    { text: "用戶管理", is_header: true },
    { text: "用戶管理與權限", url: "/user-management", icon: "bi bi-people" },

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

    // 施工日誌管理
    { text: "施工日誌管理", is_header: true },
    {
      text: "施工日誌管理",
      icon: "bi bi-journal-text",
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
            { text: "A-4 工期展延申請總表", url: "/forms/a4-download" },
            { text: "A-5 估驗請款計價單", url: "/forms/a5-download" },
            // { text: "A-5 參數化表單", url: "/forms/a5-with-params" },
            { text: "A-7 職安報備書", url: "/forms/a7-download" },
          ],
        },
        {
          text: "B類表單",
          children: [
            { text: "施工項目維護", url: "/forms/b-construction-maintenance" },
            { text: "施工抽查標準表", url: "/forms/b-inspection" },
            { text: "監造計畫書匯出測試", url: "/forms/b-export-test" },
          ],
        },
        { text: "C類表單", url: "/forms/type-c" },
        { text: "D類表單", url: "/forms/type-d" },
        { text: "H類表單", url: "/forms/type-h" },
        { text: "I類表單", url: "/forms/type-i" },
        { text: "L類表單", url: "/forms/type-l" },
      ],
    },

    // 查詢與檢索
    { text: "查詢與檢索", is_header: true },
    { url: "/search", icon: "bi bi-search", text: "文件快速查詢" },

    // AI與自動化
    { text: "AI與自動化", is_header: true },
    { url: "/ai/ocr", icon: "bi bi-file-text", text: "文件OCR識別" },
    { url: "/ai/reply-gen", icon: "bi bi-chat-dots", text: "自動回文生成" },
    {
      url: "/ai/defect-detection",
      icon: "bi bi-exclamation-triangle",
      text: "工地缺失辨識",
    },

    // 系統稽核與提醒
    { text: "系統稽核與提醒", is_header: true },
    { url: "/audit/reminders", icon: "bi bi-bell", text: "文件提醒與稽核" },

    // 雲端資料整合
    { text: "雲端資料整合", is_header: true },
    {
      url: "/integration/cloud-database",
      icon: "bi bi-cloud-upload",
      text: "雲端資料庫整合",
    },
    {
      url: "/integration/web-scraper",
      icon: "bi bi-globe2",
      text: "網站資料爬蟲",
    },
  ]
    
    // 過濾選單項目（移除被隱藏的教學頁面和無權限的項目）
    return filterMenuItems(items)
  })

  // 返回數組本身（保持與原有結構兼容）+ 額外方法
  return Object.assign(menuItems.value, {
    hideTutorial,
    showTutorial,
    isTutorialHidden,
  })
});
