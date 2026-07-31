import { defineStore } from "pinia";
import { computed, ref, watch } from "vue";
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { useViewPerspective } from '@/composables/useViewPerspective';
import { useOnboardingStore } from '@/stores/onboarding';
import {
  contractorDocumentClassificationApi,
  type ContractorDocumentClassification,
} from '@/api/contractorDocumentClassification';
import { getDesignChangeList } from '@/api/designChange';
import { storage, StorageKeys } from '@/utils/storage';
import type { SidebarMenuItem as MenuItem } from '@/types/sidebar-menu'
import { CONTRACTOR_G_FIXED_FORMS } from '@/config/fixedDocumentForms'

export const useAppContractorSidebarMenuStore = defineStore("appContractorSidebarMenu", () => {
  const debugInstanceId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()

  // 隱藏的教學頁面 URL 列表
  const getHiddenTutorials = (): string[] => {
    const stored = localStorage.getItem('hiddenTutorials')
    return stored ? JSON.parse(stored) : []
  }

  const hiddenTutorials = ref<string[]>(getHiddenTutorials())
  const dynamicPMenuItems = ref<MenuItem[]>([
    { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan" },
    { text: "P-2 整體品質計劃", url: "/forms/p2-quality-plan" },
    { text: "P-3 職業安全衛生管理計畫", url: "/forms/p3-occupational-safety-health-plan" }
  ])

  /**
   * 營造端「文件檔案分類表（B / E / G / R / T / Q 類）」動態 sidebar 項目來源。
   *
   * - 與監造端 `app-sidebar-menu.ts` 內 `supervisoryDocClassRows` 完全對稱的設計：
   *   依分類表項目動態列出 sidebar children，點擊進入共用書架頁
   *   `/contractor/forms/doc-class/:category/:itemId`，由 `ContractorDocClassShelf.vue` 反查名稱顯示。
   * - 與既有「P 類動態項目」相互獨立：P 類由 `dynamicPMenuItems` / `runRefreshDynamicPMenuItems`
   *   依 `contractor-sidebar-p-menu-refresh` 事件更新；此處 6 類則由
   *   `contractor-sidebar-doc-class-refresh` 事件更新。
   *   分類表頁面所有 handler 同時 dispatch 兩個事件以確保 sidebar 完整同步。
   * - 設計變更版本：與 P 類做法一致，自動取「最新一版」變更設計（失敗 fallback 為 null = 原契約）。
   * - 排序：依 `itemNumber` 自然排序。
   * - 視角守：僅在「營造視角 + 已選工程案」時載入。
   */
  type ContractorDocClassCategory = 'B' | 'E' | 'G' | 'R' | 'S' | 'T' | 'Q'
  const CONTRACTOR_DOC_CLASS_CATEGORIES: readonly ContractorDocClassCategory[] = ['B', 'E', 'G', 'R', 'S', 'T', 'Q']

  const contractorDocClassRows = ref<ContractorDocumentClassification[]>([])
  let contractorDocClassLoadAbortFlag = 0

  /** 將分類表 `itemNumber`（"01"、"02"…）解析為純數字字串 */
  const parseDocClassItemSeq = (itemNumber: string | null | undefined): string => {
    const raw = String(itemNumber ?? '').trim()
    if (!raw) return ''
    const m = raw.match(/^0*(\d+)/)
    if (!m) return raw
    return m[1]
  }

  /** sidebar 顯示文字：`{Letter}-{n} {documentName}` */
  const formatDocClassSidebarText = (
    cat: ContractorDocClassCategory,
    itemNumber: string | null | undefined,
    documentName: string | null | undefined,
  ): string => {
    const seq = parseDocClassItemSeq(itemNumber)
    const name = String(documentName ?? '').trim()
    return seq ? `${cat}-${seq} ${name}`.trim() : `${cat} ${name}`.trim()
  }

  /** 取得指定分類的全部項目（已依 itemNumber 排序） */
  const getDocClassRowsByCategory = (cat: ContractorDocClassCategory): ContractorDocumentClassification[] => {
    return contractorDocClassRows.value
      .filter(i => i.category === cat)
      .sort((a, b) => (a.itemNumber || '').localeCompare(b.itemNumber || ''))
  }

  /**
   * 為某分類產出 sidebar children；若清單為空則放一個可點擊的 placeholder
   * 連到「文件檔案分類表」頁，方便使用者去維護該分類項目。
   */
  const buildDocClassChildrenOrPlaceholder = (cat: ContractorDocClassCategory): MenuItem[] => {
    const list = getDocClassRowsByCategory(cat)
    if (list.length === 0) {
      // placeholder URL 需「每類不同」以避免進入分類表頁面後 SidebarNav.subIsActive
      // 因為所有 placeholder URL 相同，把全部 6 個分組同時判定 active 而通通展開。
      // `?focus={letter}` 只是用來區隔 fullPath；分類表頁面對該 query 不需特別處理。
      return [{
        text: '尚無項目，前往「文件檔案分類表」維護',
        url: `/forms/contractor-document-classification?focus=${cat}`,
      }]
    }
    return list.map(i => ({
      text: formatDocClassSidebarText(cat, i.itemNumber, i.documentName),
      url: `/contractor/forms/doc-class/${cat}/${i.id}`,
    }))
  }

  const buildSChildren = (): MenuItem[] => {
    const sRows = getDocClassRowsByCategory('S')
    const eRows = getDocClassRowsByCategory('E')
    return sRows.map((item) => {
        const source = eRows.find(
          (row) =>
            row.subdivisionWorkItemId != null &&
            row.subdivisionWorkItemId === item.subdivisionWorkItemId,
        )
        return {
          text: formatDocClassSidebarText('S', item.itemNumber, item.documentName),
          url: source
            ? `/contractor/forms/doc-class/S/safety-inspections?classificationId=${source.id}`
            : `/contractor/forms/doc-class/S/safety-inspections?classificationItemId=${item.id}`,
        }
      })
  }

  const loadContractorDocClassRows = async () => {
    const { isSupervisory } = useViewPerspective()
    const cid = workspaceStore.currentProject?.id

    // 營造視角 + 已選工程案 才載入；其他情況清空避免殘留
    if (isSupervisory.value || !cid) {
      contractorDocClassRows.value = []
      return
    }

    const myToken = ++contractorDocClassLoadAbortFlag
    try {
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
      if (myToken !== contractorDocClassLoadAbortFlag) return

      const items: ContractorDocumentClassification[] = await contractorDocumentClassificationApi.getAll(
        cid,
        designChangeId,
        { skipAuthRedirectOn401: true } as any,
      )
      if (myToken !== contractorDocClassLoadAbortFlag) return

      contractorDocClassRows.value = items.filter(i =>
        (CONTRACTOR_DOC_CLASS_CATEGORIES as readonly string[]).includes(i.category),
      )
    } catch {
      if (myToken === contractorDocClassLoadAbortFlag) {
        contractorDocClassRows.value = []
      }
    }
  }
  const dynamicPMenuDebugText = ref<string>(`P-MENU-DEBUG v2 初始化中（instance=${debugInstanceId}）`)
  /** 每次「開始實際載入」遞增；完成時若 !== 本次快照則有更新者，不覆寫 UI */
  let refreshGeneration = 0
  let refreshDebounceTimer: ReturnType<typeof setTimeout> | null = null
  /** watch 依賴若持續抖動，純 debounce 可能永遠不觸發；maxWait 保證最晚此時間內仍會執行一次 */
  let refreshMaxWaitTimer: ReturnType<typeof setTimeout> | null = null
  const REFRESH_DEBOUNCE_MS = 80
  const REFRESH_MAX_WAIT_MS = 400
  const BOOTSTRAP_RETRY_MAX = 12
  const BOOTSTRAP_RETRY_MS = 500
  let bootstrapRetryTimer: ReturnType<typeof setTimeout> | null = null
  let bootstrapRetryCount = 0

  /** 上次成功載入 P 類側邊欄的鍵；相同時略過 getAll（仍會打變更設計列表以確認版本未變） */
  let lastSuccessfulPMenuLoadKey: string | null = null

  const buildPMenuLoadKey = (constructionId: string, designChangeId: number | null) =>
    `${constructionId}\t${designChangeId === null ? 'base' : String(designChangeId)}`

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
    // 工地平面圖點位：監造/營造分開
    if (baseUrl === '/floor-plans') {
      return `${prefix}/floor-plans`
    }

    return baseUrl
  }

  const emitSidebarRefreshEvent = () => {
    window.dispatchEvent(new Event('contractor-sidebar-p-menu-refreshed'))
  }

  const setDynamicPMenuDebugText = (text: string) => {
    dynamicPMenuDebugText.value = text
    console.info(`[P-MENU-DEBUG]\n${text}`)
  }

  // 同步可見：只要 store 被建立，就一定會先看到這段
  setDynamicPMenuDebugText(
    [
      `狀態: store 已建立（v2）`,
      `時間: ${new Date().toISOString()}`,
      `instance: ${debugInstanceId}`
    ].join('\n')
  )

  const resolveConstructionId = (): {
    id: string
    source: string
    candidates: Record<string, string>
  } => {
    const fromCurrentProject = workspaceStore.currentProject?.id || ''
    const fromUserCurrent = authStore.user?.currentConstructionId || ''
    const fromWorkspaceProjectsFirst = workspaceStore.workspaceProjects?.[0]?.id || ''
    const saved = storage.get<{ projectId?: string }>(StorageKeys.SELECTED_PROJECT)
    const fromSelectedProjectStorage = saved?.projectId || ''

    const candidates: Record<string, string> = {
      currentProject: fromCurrentProject,
      authUserCurrentConstructionId: fromUserCurrent,
      workspaceProjectsFirst: fromWorkspaceProjectsFirst,
      selectedProjectStorage: fromSelectedProjectStorage
    }
    const sourceOrder: Array<keyof typeof candidates> = [
      'currentProject',
      'authUserCurrentConstructionId',
      'workspaceProjectsFirst',
      'selectedProjectStorage'
    ]
    for (const key of sourceOrder) {
      const id = candidates[key]
      if (id) return { id, source: key, candidates }
    }
    return { id: '', source: 'none', candidates }
  }

  const isStale = (generationSnapshot: number) => generationSnapshot !== refreshGeneration

  const cancelBootstrapRetry = () => {
    if (bootstrapRetryTimer != null) {
      clearTimeout(bootstrapRetryTimer)
      bootstrapRetryTimer = null
    }
  }

  const buildFixedGChildren = (): MenuItem[] =>
    CONTRACTOR_G_FIXED_FORMS.map((form) => {
      const row = contractorDocClassRows.value.find((item) =>
        item.fixedFormCode === form.code ||
        (item.category === 'G' && item.itemNumber === form.itemNumber)
      )
      return {
        text: formatDocClassSidebarText('G', form.itemNumber, row?.documentName || form.fallbackName),
        url: form.path,
      }
    })

  const clearBootstrapRetry = () => {
    cancelBootstrapRetry()
    bootstrapRetryCount = 0
  }

  const scheduleBootstrapRetry = () => {
    // Login state changes trigger the store watchers; polling without a token
    // only produces an endless stream of unauthorized requests.
    if (!storage.get<string>(StorageKeys.AUTH_TOKEN)) return
    if (bootstrapRetryTimer != null) return
    if (bootstrapRetryCount >= BOOTSTRAP_RETRY_MAX) return
    bootstrapRetryTimer = setTimeout(() => {
      bootstrapRetryTimer = null
      bootstrapRetryCount += 1
      setDynamicPMenuDebugText(
        [
          '狀態: 啟動期重試 refreshDynamicPMenuItems',
          `時間: ${new Date().toISOString()}`,
          `instance: ${debugInstanceId}`,
          `retry: ${bootstrapRetryCount}/${BOOTSTRAP_RETRY_MAX}`
        ].join('\n')
      )
      refreshDynamicPMenuItems()
    }, BOOTSTRAP_RETRY_MS)
  }

  const runRefreshDynamicPMenuItems = async () => {
    const requestId = ++refreshGeneration
    if (!storage.get<string>(StorageKeys.AUTH_TOKEN)) {
      clearBootstrapRetry()
      return
    }
    // 僅在營造視角下執行；監造端直接略過，避免打 contractor API 拿到 401
    const { isContractor } = useViewPerspective()
    if (!isContractor.value) {
      setDynamicPMenuDebugText([
        '狀態: 非營造視角，略過 P 類動態載入',
        `時間: ${new Date().toISOString()}`,
        `requestId: ${requestId}`
      ].join('\n'))
      return
    }
    setDynamicPMenuDebugText(
      [
        '狀態: refreshDynamicPMenuItems 已觸發',
        `時間: ${new Date().toISOString()}`,
        `instance: ${debugInstanceId}`,
        `requestId: ${requestId}`
      ].join('\n')
    )
    try {
      const resolved = resolveConstructionId()
      const constructionId = resolved.id
      setDynamicPMenuDebugText([
        '狀態: 已解析工程案來源',
        `時間: ${new Date().toISOString()}`,
        `constructionId: ${constructionId || '(空)'}`,
        `來源: ${resolved.source}`,
        `currentProject: ${resolved.candidates.currentProject || '(空)'}`,
        `authUserCurrentConstructionId: ${resolved.candidates.authUserCurrentConstructionId || '(空)'}`,
        `workspaceProjectsFirst: ${resolved.candidates.workspaceProjectsFirst || '(空)'}`,
        `selectedProjectStorage: ${resolved.candidates.selectedProjectStorage || '(空)'}`
      ].join('\n'))
      if (isStale(requestId)) return
      if (!constructionId) {
        lastSuccessfulPMenuLoadKey = null
        dynamicPMenuItems.value = [
          { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan" },
          { text: "P-2 整體品質計劃", url: "/forms/p2-quality-plan" },
          { text: "P-3 職業安全衛生管理計畫", url: "/forms/p3-occupational-safety-health-plan" }
        ]
        setDynamicPMenuDebugText([
          '狀態: 無工程案，使用預設 P-1/P-2',
          `時間: ${new Date().toISOString()}`,
          `requestId: ${requestId}`,
          `來源: ${resolved.source}`,
          `currentProject: ${resolved.candidates.currentProject || '(空)'}`,
          `authUserCurrentConstructionId: ${resolved.candidates.authUserCurrentConstructionId || '(空)'}`,
          `workspaceProjectsFirst: ${resolved.candidates.workspaceProjectsFirst || '(空)'}`,
          `selectedProjectStorage: ${resolved.candidates.selectedProjectStorage || '(空)'}`
        ].join('\n'))
        emitSidebarRefreshEvent()
        scheduleBootstrapRetry()
        return
      }
      // Keep the attempt count until a request succeeds. Resetting it before
      // every request made the retry limit ineffective.
      cancelBootstrapRetry()

      const withTimeout = async <T>(promise: Promise<T>, ms: number, label: string): Promise<T> => {
        let timer: ReturnType<typeof setTimeout> | null = null
        try {
          const timeoutPromise = new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`${label} timeout after ${ms}ms`)), ms)
          })
          return await Promise.race([promise, timeoutPromise])
        } finally {
          if (timer) clearTimeout(timer)
        }
      }

      let selectedDesignChangeId: number | null = null
      let designChangeFetchNote = 'ok'
      let designChangeCount = 0
      try {
        setDynamicPMenuDebugText([
          '狀態: 請求 design change 列表中...',
          `時間: ${new Date().toISOString()}`,
          `requestId: ${requestId}`,
          `constructionId: ${constructionId}`,
          'sourceType: (none)'
        ].join('\n'))
        const versions = await withTimeout(
          getDesignChangeList(constructionId, undefined, { skipAuthRedirectOn401: true }, false),
          5000,
          'getDesignChangeList(no-sourceType)'
        )
        designChangeCount = versions.length
        const latestVersion = versions.reduce<{ id: number; sortOrder: number } | null>((acc, cur) => {
          if (!acc || cur.sortOrder > acc.sortOrder) {
            return { id: cur.id, sortOrder: cur.sortOrder }
          }
          return acc
        }, null)
        selectedDesignChangeId = latestVersion?.id ?? null
      } catch (error1: any) {
        const firstErr = error1 instanceof Error ? `${error1.name}: ${error1.message}` : String(error1)
        try {
          setDynamicPMenuDebugText([
            '狀態: design change 首次失敗，重試...',
            `時間: ${new Date().toISOString()}`,
            `requestId: ${requestId}`,
            `constructionId: ${constructionId}`,
            `firstError: ${firstErr}`
          ].join('\n'))
          const versionsFallback = await withTimeout(
            getDesignChangeList(constructionId, undefined, { skipAuthRedirectOn401: true }, false),
            5000,
            'getDesignChangeList(no-sourceType)'
          )
          designChangeCount = versionsFallback.length
          const latestFallback = versionsFallback.reduce<{ id: number; sortOrder: number } | null>((acc, cur) => {
            if (!acc || cur.sortOrder > acc.sortOrder) {
              return { id: cur.id, sortOrder: cur.sortOrder }
            }
            return acc
          }, null)
          selectedDesignChangeId = latestFallback?.id ?? null
          designChangeFetchNote = `fallback-ok:${firstErr}`
        } catch (error2: any) {
          const secondErr = error2 instanceof Error ? `${error2.name}: ${error2.message}` : String(error2)
          selectedDesignChangeId = null
          designChangeFetchNote = `fallback-null:first=${firstErr};second=${secondErr}`
        }
      }
      if (isStale(requestId)) return

      const loadKey = buildPMenuLoadKey(constructionId, selectedDesignChangeId)
      if (lastSuccessfulPMenuLoadKey === loadKey) {
        setDynamicPMenuDebugText(
          [
            '狀態: 略過 document classification（快取命中：工程案+變更版本與上次成功載入相同）',
            `時間: ${new Date().toISOString()}`,
            `requestId: ${requestId}`,
            `loadKey: ${loadKey}`,
            `現有 menu 筆數: ${dynamicPMenuItems.value.length}`,
            '提示: 編輯分類表後頁面會 dispatch contractor-sidebar-p-menu-refresh；若仍舊請手動重新整理'
          ].join('\n')
        )
        clearBootstrapRetry()
        return
      }

      setDynamicPMenuDebugText([
        '狀態: 請求 contractor document classification 中...',
        `時間: ${new Date().toISOString()}`,
        `requestId: ${requestId}`,
        `constructionId: ${constructionId}`,
        `selectedDesignChangeId: ${selectedDesignChangeId ?? 'null(原契約)'}`,
        `designChangeFetch: ${designChangeFetchNote}`
      ].join('\n'))
      const allRows = await withTimeout(
        contractorDocumentClassificationApi.getAll(
          constructionId,
          selectedDesignChangeId,
          { skipAuthRedirectOn401: true } as any
        ),
        8000,
        'contractorDocumentClassificationApi.getAll'
      )
      if (isStale(requestId)) return
      const pRows = allRows
        // 相容舊資料/舊 API：未回傳 applyToSidebar 時，P 類預設視為套用
        .filter((row) => row.category === 'P' && row.applyToSidebar !== false)
        .sort((a, b) => a.itemNumber.localeCompare(b.itemNumber))

      const nextItems: MenuItem[] = []
      let hasP1 = false
      let hasP2 = false
      let hasP3 = false
      /** 動態頁項目由 P-4 起編號（P-1、P-2、P-3 為固定頁） */
      let dynamicDisplaySeq = 4
      for (const row of pRows) {
        if (!hasP1 && row.documentName === '整體施工計畫') {
          hasP1 = true
          nextItems.push({ text: 'P-1 整體施工計畫', url: '/forms/p1-overall-construction-plan' })
          continue
        } else if (hasP1 && row.documentName === '整體施工計畫') {
          console.warn('P 類側邊欄：偵測到重複「整體施工計畫」，已忽略後續項目', row.id)
          continue
        }
        if (!hasP2 && row.documentName === '整體品質計畫') {
          hasP2 = true
          nextItems.push({ text: 'P-2 整體品質計劃', url: '/forms/p2-quality-plan' })
          continue
        } else if (hasP2 && row.documentName === '整體品質計畫') {
          console.warn('P 類側邊欄：偵測到重複「整體品質計畫」，已忽略後續項目', row.id)
          continue
        }
        if (!hasP3 && row.documentName === '職業安全衛生管理計畫') {
          hasP3 = true
          nextItems.push({ text: 'P-3 職業安全衛生管理計畫', url: '/forms/p3-occupational-safety-health-plan' })
          continue
        } else if (hasP3 && row.documentName === '職業安全衛生管理計畫') {
          console.warn('P 類側邊欄：偵測到重複「職業安全衛生管理計畫」，已忽略後續項目', row.id)
          continue
        }
        const q = selectedDesignChangeId == null
          ? `docId=${row.id}`
          : `docId=${row.id}&designChangeId=${selectedDesignChangeId}`
        const seq = dynamicDisplaySeq++
        nextItems.push({
          text: `P-${seq} ${row.documentName}`,
          url: `/forms/p-plan-dynamic?${q}`
        })
      }
      if (isStale(requestId)) return
      dynamicPMenuItems.value = nextItems.length > 0
        ? nextItems
        : [
            { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan" },
            { text: "P-2 整體品質計劃", url: "/forms/p2-quality-plan" },
            { text: "P-3 職業安全衛生管理計畫", url: "/forms/p3-occupational-safety-health-plan" }
          ]
      lastSuccessfulPMenuLoadKey = loadKey
      setDynamicPMenuDebugText([
        '狀態: 動態載入成功',
        `時間: ${new Date().toISOString()}`,
        `requestId: ${requestId}`,
        `constructionId: ${constructionId}`,
        `constructionIdSource: ${resolved.source}`,
        `selectedDesignChangeId: ${selectedDesignChangeId ?? 'null(原契約)'}`,
        `designChangeCount: ${designChangeCount}`,
        `allRows: ${allRows.length}`,
        `pRows(after filter): ${pRows.length}`,
        `menuItems: ${dynamicPMenuItems.value.map((i) => i.text).join(' | ') || '(空)'}`
      ].join('\n'))
      emitSidebarRefreshEvent()
      clearBootstrapRetry()
    } catch (error: any) {
      if (isStale(requestId)) return
      lastSuccessfulPMenuLoadKey = null
      const responseStatus = Number(error?.response?.status)
      const isAuthorizationFailure = responseStatus === 401 || responseStatus === 403
      console.warn('載入動態 P 類側邊欄失敗，改用預設選單', error)
      dynamicPMenuItems.value = [
        { text: "P-1 整體施工計畫", url: "/forms/p1-overall-construction-plan" },
        { text: "P-2 整體品質計劃", url: "/forms/p2-quality-plan" },
        { text: "P-3 職業安全衛生管理計畫", url: "/forms/p3-occupational-safety-health-plan" }
      ]
      const err = error instanceof Error ? `${error.name}: ${error.message}` : String(error)
      const stack = error?.stack ? String(error.stack).split('\n').slice(0, 6).join('\n') : '(無 stack)'
      setDynamicPMenuDebugText([
        '狀態: 動態載入失敗，已 fallback',
        `時間: ${new Date().toISOString()}`,
        `requestId: ${requestId}`,
        `error: ${err}`,
        `stack: ${stack}`,
        `fallbackMenuItems: ${dynamicPMenuItems.value.map((i) => i.text).join(' | ')}`
      ].join('\n'))
      emitSidebarRefreshEvent()
      if (isAuthorizationFailure) {
        clearBootstrapRetry()
      } else {
        scheduleBootstrapRetry()
      }
    }
  }

  /** 合併短時間內多次觸發（watch / mount / 事件）；generation 確保只套用最新結果 */
  const refreshDynamicPMenuItems = () => {
    if (refreshMaxWaitTimer == null) {
      refreshMaxWaitTimer = setTimeout(() => {
        refreshMaxWaitTimer = null
        if (refreshDebounceTimer != null) {
          clearTimeout(refreshDebounceTimer)
          refreshDebounceTimer = null
        }
        void runRefreshDynamicPMenuItems()
      }, REFRESH_MAX_WAIT_MS)
    }
    if (refreshDebounceTimer != null) {
      clearTimeout(refreshDebounceTimer)
    }
    refreshDebounceTimer = setTimeout(() => {
      refreshDebounceTimer = null
      if (refreshMaxWaitTimer != null) {
        clearTimeout(refreshMaxWaitTimer)
        refreshMaxWaitTimer = null
      }
      void runRefreshDynamicPMenuItems()
    }, REFRESH_DEBOUNCE_MS)
  }

  watch(
    () => [
      workspaceStore.currentProject?.id || '',
      authStore.user?.currentConstructionId || '',
      authStore.user?.userId || '',
      workspaceStore.currentWorkspace?.id || '',
      workspaceStore.workspaceProjects?.[0]?.id || '',
      String(workspaceStore.workspaceProjects?.length || 0)
    ],
    () => {
      refreshDynamicPMenuItems()
    },
    { immediate: false }
  )

  // 首次載入：同步啟動 async（進入第一個 await 前就會更新除錯 ref，模板才能訂閱到）
  void runRefreshDynamicPMenuItems()

  window.addEventListener('contractor-sidebar-p-menu-refresh', () => {
    lastSuccessfulPMenuLoadKey = null
    void runRefreshDynamicPMenuItems()
  })

  // 6 類動態書架：監聽工程案 / 視角切換 → 自動 reload
  watch(
    () => {
      const { isSupervisory } = useViewPerspective()
      return [isSupervisory.value, workspaceStore.currentProject?.id ?? '']
    },
    () => { void loadContractorDocClassRows() },
    { immediate: true }
  )

  // 任何頁面編輯分類表後可呼叫 `requestContractorDocClassSidebarRefresh()`
  // （見 `@/utils/contractorDocClassSidebar`）來觸發此事件，sidebar 立即 reload。
  if (typeof window !== 'undefined') {
    window.addEventListener('contractor-sidebar-doc-class-refresh', () => {
      void loadContractorDocClassRows()
    })
  }

  // 營造側邊欄選單（只有基本資料）
  const menuItems = computed(() => {
    // 確保追蹤 viewType 的變化
    const { viewType, isSupervisory } = useViewPerspective()
    void viewType.value // 讀取以建立響應式依賴
    
    // 確保追蹤 workspace 的變化
    void workspaceStore.currentWorkspace?.id

    const onboardingStore = useOnboardingStore()
    const systemRole = authStore.user?.systemRole || authStore.user?.role
    if (
      systemRole !== 'SUPER_ADMIN' &&
      onboardingStore.shouldUseOnboardingFlow &&
      !onboardingStore.isCompleted
    ) {
      return filterMenuItems([
        { text: "提示", is_header: true },
        {
          text: "為什麼我只能看到這些？",
          icon: "bi bi-info-circle",
          children: [
            {
              text: "完成一次工程開通後，才會解鎖全部功能",
              url: "/contractor/basic/setup-overview",
              isTutorial: true
            }
          ]
        }
      ])
    }
    
    const items: MenuItem[] = [
      // 工程儀表板
      { text: "工程儀表板", is_header: true },
      { url: getViewUrl("/"), icon: "bi bi-speedometer2", text: "首頁 (Dashboard)" },
      { url: "/project-overview", icon: "bi bi-grid-1x2", text: "專案總覽" },

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

      // 工地管理
      { text: "工地管理", is_header: true },
      { text: "工地平面圖點位", url: getViewUrl("/floor-plans"), icon: "bi bi-geo-alt" },

      // 公文中心（以工程案為單位）
      { text: "公文中心", is_header: true },
      { text: "公文列表", url: "/document-center", icon: "bi bi-folder2-open" },

      // 檔案總管（系統文件彙整 + 專案文件自由區）
      { text: "檔案總管", is_header: true },
      { text: "檔案總管", url: "/file-explorer", icon: "bi bi-hdd-stack" },

      // 行事曆
      { text: "行事曆", is_header: true },
      { text: "行事曆", url: "/calendar", icon: "bi bi-calendar" },

      // 工程排程（與監造端各自維護資料；施工進度項目來源為營造「分項工程」）
      { text: "工程排程", is_header: true },
      {
        text: "工程排程管理",
        icon: "bi bi-kanban",
        children: [
          { text: "施工進度", url: "/schedule/progress" },
        ],
      },

      // 施工日誌管理
      { text: "施工日誌管理", is_header: true },
      {
        text: "施工日誌管理",
        icon: "bi bi-journal-text",
        children: [
          { text: "施工日誌", url: "/daily-report" },
          { text: "材料進場", url: "/daily-report/materials" },
        ],
      },

      // 文件與表單管理
      { text: "文件與表單管理", is_header: true },
      {
        text: "表單生成與管理",
        icon: "bi bi-file-earmark-text",
        children: [
              { text: "文件檔案分類表", url: "/forms/contractor-document-classification" },
              { text: "分項工程維護", url: "/forms/subdivision-work-items" },
              { text: "標單材料設定", url: "/forms/tender-material-settings" },
              { text: "表單匯出中心", url: "/forms/export-center" },
              {
                text: "O類表單",
                children: [
                  { text: "O-1 開、竣、停工報告", url: "/forms/o1-commencement" },
                  { text: "O-2 工期展延申請總表", url: "/forms/o1-extension" },
                  { text: "O-3 估驗請款計價表", url: "/forms/o3-estimate" },
                  { text: "O-4 職安報備書", url: "/forms/o4-labour-safety" },
                  { text: "O-6 營造工程保險", url: "/forms/o6-insurance" },
                ],
              },
              {
                text: "P類(計劃書)表單",
                children: dynamicPMenuItems.value,
              },
              // B / E / G / R / T / Q 類：純動態，依「營造端文件檔案分類表」對應分類列出。
              // 僅營造視角顯示（資料源限定營造端 schema）。
              {
                text: "B類表單",
                visible: !isSupervisory.value,
                children: buildDocClassChildrenOrPlaceholder('B'),
              },
              {
                text: "E類表單",
                visible: !isSupervisory.value,
                children: buildDocClassChildrenOrPlaceholder('E'),
              },
              {
                text: "S類表單",
                visible: !isSupervisory.value,
                children: buildSChildren(),
              },
              {
                text: "G類表單",
                visible: !isSupervisory.value,
                children: buildFixedGChildren(),
              },
              {
                text: "R類表單",
                visible: !isSupervisory.value,
                children: buildDocClassChildrenOrPlaceholder('R'),
              },
              {
                text: "T類表單",
                visible: !isSupervisory.value,
                children: buildDocClassChildrenOrPlaceholder('T'),
              },
              {
                text: "Q類表單",
                visible: !isSupervisory.value,
                children: buildDocClassChildrenOrPlaceholder('Q'),
              },
        ],
      },
    ]
    
    return filterMenuItems(items)
  })

  // 直接回傳 computed／ref，勿用 `get menuItems(){ return menuItems.value }`，否則外層 Sidebar 的 computed 訂閱不到 dynamicPMenuItems 更新，畫面會卡在預設 P-1/P-2
  return {
    menuItems,
    /** 供 storeToRefs 訂閱，強制側邊欄在 P 類載入後重繪 */
    dynamicPMenuItems,
    /** 供 storeToRefs 訂閱，強制側邊欄在 6 類動態書架載入後重繪 */
    contractorDocClassRows,
    hideTutorial,
    showTutorial,
    isTutorialHidden,
    refreshDynamicPMenuItems,
    dynamicPMenuDebugText,
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
