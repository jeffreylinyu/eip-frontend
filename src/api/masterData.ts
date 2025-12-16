import http from './http'

/**
 * 根基資料維護 API
 * 用於維護「材料品質標準」與「施工抽查程序」
 * 所有寫入操作需具備 ADMIN 或 SUPER_ADMIN 權限
 */

// ========== 材料品質標準 (Material Standard) ==========

export interface PccesMaterialStandard {
  id?: number
  pccesCode: string
  itemName: string
  checkStandard?: string
  checkMethod?: string
  applyFirstLevel?: string
  feqCheckFirstLevel?: string
  checkRatioSecondLevel?: string
  failureHandle?: string
  createdAt?: string
  updatedAt?: string
}

export interface MaterialStandardPage {
  content: PccesMaterialStandard[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface MaterialStandardSearchParams {
  keyword?: string
  page?: number
  size?: number
}

// ========== 施工抽查程序 (Work Process Standard) ==========

export interface PccesWorkProcessStandard {
  id?: number
  pccesCode: string
  stepOrder?: number
  itemName?: string
  dataSource?: string  // 資料來源機關
  progress?: string
  workProcess?: string
  manageProject?: string
  inspectionMethod?: string
  checkStandard?: string
  checkTiming?: string
  checkMethod?: string
  checkFeq?: string
  failureHandle?: string
  manageRecord?: string
  remark?: string
  isActive?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface WorkProcessStandardPage {
  content: PccesWorkProcessStandard[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface WorkProcessStandardSearchParams {
  keyword?: string
  pccesCode?: string
  dataSource?: string
  page?: number
  size?: number
}

// ========== PCCES 總項目目錄 (Pcces Catalog) ==========

export interface PccesItemCatalog {
  id?: number
  pccesCode?: string
  cname?: string  // 中文名稱（小寫）
  unitName?: string  // 單位名稱
  type?: 'MATERIAL' | 'LABOUR' | 'EQUIPMENT' | 'MISC' | 'WORK_ITEM'
  sourceFile?: string
  isActive?: boolean  // 是否啟用
  createdAt?: string
  updatedAt?: string
}

export interface PccesCatalogPage {
  content: PccesItemCatalog[]
  totalElements: number
  totalPages: number
  size: number
  number: number
}

export interface PccesCatalogSearchParams {
  code?: string
  keyword?: string
  type?: 'MATERIAL' | 'LABOUR' | 'EQUIPMENT' | 'MISC' | 'WORK_ITEM'
  sourceFile?: string
  page?: number
  size?: number
}

// ========== API 函數 ==========

export const masterDataApi = {
  // ========== 材料品質標準 ==========
  
  /**
   * 搜尋/列表材料品質標準
   */
  searchMaterials: (params?: MaterialStandardSearchParams): Promise<MaterialStandardPage> => {
    return http.get('/management/standard/material', { params })
  },

  /**
   * 新增材料品質標準
   */
  createMaterial: (data: Omit<PccesMaterialStandard, 'id' | 'createdAt' | 'updatedAt'>): Promise<PccesMaterialStandard> => {
    return http.post('/management/standard/material', data)
  },

  /**
   * 修改材料品質標準
   */
  updateMaterial: (id: number, data: Partial<Omit<PccesMaterialStandard, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PccesMaterialStandard> => {
    return http.put(`/management/standard/material/${id}`, data)
  },

  /**
   * 刪除材料品質標準 (Soft Delete)
   */
  deleteMaterial: (id: number): Promise<void> => {
    return http.delete(`/management/standard/material/${id}`)
  },

  // ========== 施工抽查程序 ==========

  /**
   * 搜尋/列表施工抽查程序
   */
  searchWorkProcesses: (params?: WorkProcessStandardSearchParams): Promise<WorkProcessStandardPage> => {
    return http.get('/management/standard/work-process', { params })
  },

  /**
   * 根據 PCCES 編碼查詢施工抽查標準
   */
  getWorkProcessByPccesCode: (pccesCode: string): Promise<PccesWorkProcessStandard[]> => {
    return http.get(`/management/standard/work-process/by-pcces-code/${pccesCode}`)
  },

  /**
   * 匯入施工抽查標準（批次匯入）
   * @param files JSON 檔案列表
   * @param dataSource 資料來源機關
   * @returns 成功匯入的筆數
   */
  importWorkProcessStandards: (files: File[], dataSource: string): Promise<number> => {
    const formData = new FormData()
    files.forEach(file => {
      formData.append('files', file)
    })
    formData.append('dataSource', dataSource)
    return http.post('/management/standard/import-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      },
      timeout: 300000 // 5 分鐘（300 秒），匯入操作可能需要較長時間
    })
  },

  /**
   * 新增施工抽查程序
   */
  createWorkProcess: (data: Omit<PccesWorkProcessStandard, 'id' | 'createdAt' | 'updatedAt'>): Promise<PccesWorkProcessStandard> => {
    return http.post('/management/standard/work-process', data)
  },

  /**
   * 修改施工抽查程序
   */
  updateWorkProcess: (id: number, data: Partial<Omit<PccesWorkProcessStandard, 'id' | 'createdAt' | 'updatedAt'>>): Promise<PccesWorkProcessStandard> => {
    return http.put(`/management/standard/work-process/${id}`, data)
  },

  /**
   * 刪除施工抽查程序 (Soft Delete)
   */
  deleteWorkProcess: (id: number): Promise<void> => {
    return http.delete(`/management/standard/work-process/${id}`)
  },

  // ========== PCCES 總項目目錄 ==========

  /**
   * 搜尋/列表 PCCES 總項目目錄
   */
  searchPccesCatalog: (params?: PccesCatalogSearchParams): Promise<PccesCatalogPage> => {
    return http.get('/management/standard/pcces-catalog', { params })
  },

  /**
   * 匯入 PCCES 總項目 XML 資料夾
   * @param directoryPath 伺服器上的絕對路徑（資料夾）
   * @returns 成功匯入的筆數（int）
   */
  importPccesCatalog: (directoryPath: string): Promise<number> => {
    return http.post('/management/standard/pcces-catalog/import', null, {
      params: { directoryPath },
      timeout: 300000 // 5 分鐘（300 秒），匯入操作可能需要較長時間
    })
  },
}

