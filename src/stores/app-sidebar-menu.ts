import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useViewPerspective } from '@/composables/useViewPerspective';
import { useOnboardingStore } from '@/stores/onboarding'
import type { SidebarMenuItem as MenuItem } from '@/types/sidebar-menu'
import { documentClassificationApi, type DocumentClassification } from '@/api/documentClassification'
import { getDesignChangeList } from '@/api/designChange'

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

  // 過濾選單項目（visible、教學隱藏、權限、空子層）
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

  // 工程排程子選單
  const scheduleChildren = computed(() => {
    const children: MenuItem[] = [
      { text: "版本與工項管理", url: "/schedule/versions" },
    ]
    
    return filterMenuItems(children)
  })

  /**
   * 監造端「文件檔案分類表（B / C / D / H / I / L 類）」動態 sidebar 項目來源。
   *
   * - 依文件分類表的每筆項目（按 category 分組）動態列出 sidebar children。
   * - 點擊進入 `/supervisory/forms/doc-class/:category/:itemId`，由前端共用元件 `SupervisoryDocClassShelf.vue`
   *   依 `:itemId` 反查名稱顯示。
   * - 僅在「監造視角 + 已選工程案」時載入；切換工程案 / 視角會自動 refetch。
   * - 設計變更版本：與營造端 P 類做法一致 — sidebar 不跟隨「使用者目前頁面所選版本」,
   *   而是自動取「**最新一版**」變更設計（無變更設計則 fallback 為原契約 null）；
   *   分類表頁面新增／更新／刪除任一類別項目後會 dispatch
   *   `supervisory-sidebar-doc-class-refresh` 事件，sidebar 收到後立即 reload 全部類別。
   * - 排序：依 `itemNumber` 自然排序（與分類表頁一致）。
   * - B 類例外：sidebar 仍 hardcode B-1（監造計劃書）與 B-2（安全衛生監督）兩個獨立頁,
   *   名稱動態帶入分類表 itemNumber=01 / 02 的 documentName；動態項目 skip 01/02 避免重複。
   */
  type SupervisoryDocClassCategory = 'B' | 'C' | 'D' | 'H' | 'I' | 'L'
  const SUPERVISORY_DOC_CLASS_CATEGORIES: readonly SupervisoryDocClassCategory[] = ['B', 'C', 'D', 'H', 'I', 'L']

  const supervisoryDocClassRows = ref<DocumentClassification[]>([])
  let supervisoryDocClassLoadAbortFlag = 0

  /**
   * 將分類表 `itemNumber`（例如 "01"、"02"、"03"…）解析為純數字字串。
   * - "01" / "1" → "1"；"15" → "15"；"03a" → "3"
   * - 非數字 / 空字串 → 原樣回傳（fallback）
   */
  const parseDocClassItemSeq = (itemNumber: string | null | undefined): string => {
    const raw = String(itemNumber ?? '').trim()
    if (!raw) return ''
    const m = raw.match(/^0*(\d+)/)
    if (!m) return raw
    return m[1]
  }

  /** sidebar 顯示文字：`{Letter}-{n} {documentName}` */
  const formatDocClassSidebarText = (
    cat: SupervisoryDocClassCategory,
    itemNumber: string | null | undefined,
    documentName: string | null | undefined,
  ): string => {
    const seq = parseDocClassItemSeq(itemNumber)
    const name = String(documentName ?? '').trim()
    return seq ? `${cat}-${seq} ${name}`.trim() : `${cat} ${name}`.trim()
  }

  /** 取得指定分類的全部項目（已依 itemNumber 排序） */
  const getDocClassRowsByCategory = (cat: SupervisoryDocClassCategory): DocumentClassification[] => {
    return supervisoryDocClassRows.value
      .filter(i => i.category === cat)
      .sort((a, b) => (a.itemNumber || '').localeCompare(b.itemNumber || ''))
  }

  /**
   * 為某分類產出 sidebar children；若清單為空則放一個 disabled placeholder
   * 確保「分組仍可見」（避免 filterMenuItems 因 children 為空而把整個分組 hide）。
   */
  const buildDocClassChildrenOrPlaceholder = (
    cat: SupervisoryDocClassCategory,
    skipItemNumbers: string[] = [],
  ): MenuItem[] => {
    const list = getDocClassRowsByCategory(cat).filter(i => !skipItemNumbers.includes(i.itemNumber || ''))
    if (list.length === 0) {
      // placeholder 可點擊：導至「文件檔案分類表」由使用者去新增該分類的項目。
      // 注意：URL 需「每類不同」（加 `?focus={letter}`），否則一旦進入該頁，
      // `SidebarNav.subIsActive` 會把所有 placeholder children 都判定 active，
      // 導致 B/C/D/H/I/L 6 個分組同時展開。query 僅用於區隔 fullPath，
      // 分類表頁面對 `focus` 無需特別處理。
      return [{
        text: '尚無項目，前往「文件檔案分類表」維護',
        url: `/forms/document-classification?focus=${cat}`,
      }]
    }
    return list.map(i => ({
      text: formatDocClassSidebarText(cat, i.itemNumber, i.documentName),
      url: `/supervisory/forms/doc-class/${cat}/${i.id}`,
    }))
  }

  /** B 類 hardcoded 兩個固定頁：名稱依分類表帶入；找不到對應 itemNumber 則 fallback 預設名 */
  const buildBHardcodedItem = (
    itemNumber: '01' | '02',
    fallbackText: string,
    url: string,
  ): MenuItem => {
    const row = supervisoryDocClassRows.value.find(
      i => i.category === 'B' && (i.itemNumber || '') === itemNumber,
    )
    if (row) {
      return { text: formatDocClassSidebarText('B', row.itemNumber, row.documentName), url }
    }
    return { text: fallbackText, url }
  }

  const loadSupervisoryDocClassRows = async () => {
    const { isSupervisory } = useViewPerspective()
    const workspaceStore = useWorkspaceStore()
    const cid = workspaceStore.currentProject?.id

    // 監造視角 + 已選工程案 才載入；其他情況清空避免殘留
    if (!isSupervisory.value || !cid) {
      supervisoryDocClassRows.value = []
      return
    }

    const myToken = ++supervisoryDocClassLoadAbortFlag
    try {
      // 取「最新一版」變更設計（與營造端 P 類做法一致；失敗時 fallback 為 null = 原契約）
      let designChangeId: number | null = null
      try {
        const versions = await getDesignChangeList(cid, undefined, { skipAuthRedirectOn401: true }, false)
        const latest = versions.reduce<{ id: number; sortOrder: number } | null>((acc, cur) => {
          if (!acc || cur.sortOrder > acc.sortOrder) return { id: cur.id, sortOrder: cur.sortOrder }
          return acc
        }, null)
        designChangeId = latest?.id ?? null
      } catch {
        designChangeId = null
      }
      if (myToken !== supervisoryDocClassLoadAbortFlag) return

      const items: DocumentClassification[] = await documentClassificationApi.getAll(
        cid,
        designChangeId,
        { skipAuthRedirectOn401: true },
      )
      if (myToken !== supervisoryDocClassLoadAbortFlag) return

      // 只保留我們想顯示的 6 大類別
      supervisoryDocClassRows.value = items.filter(i =>
        (SUPERVISORY_DOC_CLASS_CATEGORIES as readonly string[]).includes(i.category),
      )
    } catch {
      // 任一載入失敗（含 401／權限問題）：靜默清空，避免破壞 sidebar 渲染
      if (myToken === supervisoryDocClassLoadAbortFlag) {
        supervisoryDocClassRows.value = []
      }
    }
  }

  // 監聽工程案 / 視角切換 → 自動 reload
  watch(
    () => {
      const { isSupervisory } = useViewPerspective()
      const workspaceStore = useWorkspaceStore()
      return [isSupervisory.value, workspaceStore.currentProject?.id ?? '']
    },
    () => { void loadSupervisoryDocClassRows() },
    { immediate: true }
  )

  // 任何頁面編輯分類表後可呼叫 `requestSupervisoryDocClassSidebarRefresh()`
  // （見 `@/utils/supervisoryBPlanSidebar`）來觸發此事件，sidebar 立即 reload。
  if (typeof window !== 'undefined') {
    window.addEventListener('supervisory-sidebar-doc-class-refresh', () => {
      void loadSupervisoryDocClassRows()
    })
    // 向後相容：舊事件名稱仍能觸發 reload
    window.addEventListener('supervisory-sidebar-b-plan-refresh', () => {
      void loadSupervisoryDocClassRows()
    })
  }

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
        // 監造端：工程案保險（固定 scope），文字不加括號，使用目錄位置區分
        { text: "工程保險", url: isSupervisory.value ? "/supervisory/basic/insurance-project" : getViewUrl("/basic/insurance") },
        { text: "參與單位", url: getViewUrl("/basic/participation-units") },
        { text: "工程項目標單", url: getViewUrl("/basic/project-item-database") },
        { text: "變更設計", url: getViewUrl("/design-changes") },
      ],
    },
    {
      text: "監造核心資料",
      icon: "bi bi-building",
      children: [
        { text: "公司基本資料", url: "/supervisory/company/profile" },
        // 監造端：監造公司（本工程案）保險（固定 scope），文字不加括號，使用目錄位置區分
        { text: "工程保險", url: "/supervisory/basic/insurance-company", visible: isSupervisory.value },
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
        { text: "文件檔案分類表", url: "/forms/document-classification" },
        { text: "施工項目維護", url: "/forms/b-construction-maintenance" },
        { text: "標單材料設定", url: "/forms/tender-material-settings", visible: isSupervisory.value },
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
            // 兩個固定頁仍 hardcode（URL 與頁面內容寫死），但 sidebar 顯示名稱動態帶入分類表 itemNumber=01/02
            buildBHardcodedItem('01', 'B-1 監造計劃書', '/forms/export-supervision-plan'),
            buildBHardcodedItem('02', 'B-2 安全衛生監督', '/forms/b2-safety-supervision-plan'),
            // 動態：依「監造端文件檔案分類表 B 類」項目自動列出（skip 01/02 避免與上面重複）
            ...buildDocClassChildrenOrPlaceholder('B', ['01', '02']),
          ],
        },
        // C / D / H / I / L 類：純動態，依「監造端文件檔案分類表」對應分類列出。
        // 僅監造視角顯示（資料源限定監造端 schema）。
        {
          text: "C類表單",
          visible: isSupervisory.value,
          children: buildDocClassChildrenOrPlaceholder('C'),
        },
        {
          text: "D類表單",
          visible: isSupervisory.value,
          children: buildDocClassChildrenOrPlaceholder('D'),
        },
        {
          text: "H類表單",
          visible: isSupervisory.value,
          children: buildDocClassChildrenOrPlaceholder('H'),
        },
        {
          text: "I類表單",
          visible: isSupervisory.value,
          children: buildDocClassChildrenOrPlaceholder('I'),
        },
        {
          text: "L類表單",
          visible: isSupervisory.value,
          children: buildDocClassChildrenOrPlaceholder('L'),
        },
        {
          text: "P類(計劃書)表單",
          // 監造端不應看到 P 類（避免與營造端入口混淆）
          visible: !isSupervisory.value,
          children: [
            // 營造端：入口放在 P 類表單下（使用營造端資料 / schema）
            { text: "標單材料設定", url: "/forms/tender-material-settings", visible: !isSupervisory.value },
            { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan", visible: !isSupervisory.value },
            { text: "P-2 整體品質計劃", url: "/forms/p2-quality-plan", visible: !isSupervisory.value },
            { text: "P-3 職業安全衛生管理計畫", url: "/forms/p3-occupational-safety-health-plan", visible: !isSupervisory.value },
          ],
        },
      ],
    },

  ]
    
    // 過濾選單項目（移除被隱藏的教學頁面和無權限的項目）
    return filterMenuItems(items)
  })

  // 直接回傳 computed／ref，勿用 `get menuItems(){ return menuItems.value }`：
  // Pinia setup store 對 plain getter 會在建立時取一次快照，導致 storeToRefs／讀取拿到靜態值，
  // 監造端 B/C/D/H/I/L 類動態項目載入後 sidebar 不會即時重繪（與營造 store 對稱，見其註解）。
  return {
    menuItems,
    /** 供 Sidebar 訂閱，B 類等動態書架載入後強制側邊欄重繪（與營造 contractorDocClassRows 對稱） */
    supervisoryDocClassRows,
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
