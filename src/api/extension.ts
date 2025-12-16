import http from './http';

// 展延狀態枚舉
export enum ExtensionStatus {
  DRAFT = 'DRAFT',       // 草稿
  PENDING = 'PENDING',   // 待審核
  APPROVED = 'APPROVED', // 已核准
  REJECTED = 'REJECTED'  // 退回
}

// 展延模式枚舉
export enum ExtensionType {
  SPECIFIC_DATES = 'SPECIFIC_DATES', // 模式 A：指定日期免計
  ADD_DAYS = 'ADD_DAYS'              // 模式 B：直接追加天數
}

// 展延記錄數據接口
export interface ExtensionRecord {
  extensionId: string;
  constructionId: string;
  verifyNumber?: string;
  extendReason?: string;
  extendContent: string;
  extendDate?: string;
  extendDay: number;
  approvalDocumentNumber?: string;
  completionDateAfterExtension?: string;
  isApproved?: boolean; // 是否通過
  // 新增欄位（第二階段）
  totalDurationAfterExtension?: number; // 展延後總工期
  calculatedEndDateAfterExtension?: string; // 展延後預計完工日期
  sequence?: number; // 序次
  approvedAt?: string; // 核准時間
  createdAt?: string; // 建立時間
  // 新增欄位（審核流程與計算模式）
  status?: ExtensionStatus;       // 審核狀態，建立時預設為 DRAFT
  extensionType?: ExtensionType;  // 展延模式，預設為 ADD_DAYS
  specificDates?: string[];       // 日期字串陣列 (YYYY-MM-DD)，當模式為 SPECIFIC_DATES 時必填
}

// 展延列表查詢參數
export interface ExtensionListParams {
  constructionId: string;
  page?: number;
  pageSize?: number;
}

// 展延列表回應
export interface ExtensionListResponse {
  success: boolean;
  data: ExtensionRecord[];
  total?: number;
  page?: number;
  pageSize?: number;
  message?: string;
}

// 創建展延記錄請求
export interface CreateExtensionRequest {
  constructionId: string;
  verifyNumber?: string;
  extendReason?: string;
  extendContent: string;
  extendDate?: string;
  extendDay?: number; // 用於 ADD_DAYS 模式
  approvalDocumentNumber?: string;
  completionDateAfterExtension?: string;
  // 新增欄位
  status?: ExtensionStatus;       // 建立時預設為 DRAFT
  extensionType?: ExtensionType; // 預設為 ADD_DAYS
  specificDates?: string[];      // 日期字串陣列 (YYYY-MM-DD)，當模式為 SPECIFIC_DATES 時必填
}

// 更新展延記錄請求
export interface UpdateExtensionRequest {
  extensionId: string;
  verifyNumber?: string;
  extendContent?: string;
  extendDate?: string;
  extendDay?: number;
  // 新增欄位
  status?: ExtensionStatus;       // 允許變更審核狀態（管理員/主管）
  extensionType?: ExtensionType;  // 允許變更展延模式
  specificDates?: string[];       // 日期字串陣列 (YYYY-MM-DD)
}

// 展延操作回應
export interface ExtensionResponse {
  success: boolean;
  data?: ExtensionRecord;
  message?: string;
}

/**
 * 獲取展延列表
 * @param params 查詢參數
 * @returns Promise<ExtensionListResponse>
 */
export const getExtensionList = async (params: ExtensionListParams): Promise<ExtensionListResponse> => {
  try {
    
    const response = await http.get('/management/extension/list', {
      params: {
        constructionId: params.constructionId
      }
    });
    
    
    // 處理不同的回應格式
    let data: ExtensionRecord[] = []
    
    if (response.data && Array.isArray(response.data)) {
      // 直接陣列格式：[...]
      data = response.data
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      // 包裝格式：{ data: [...] }
      data = response.data.data
    } else if (Array.isArray(response)) {
      // 回應本身就是陣列
      data = response
    }
    
    const result: ExtensionListResponse = {
      success: true,
      data: data,
      total: data.length,
      page: params.page || 1,
      pageSize: params.pageSize || 100
    }
    
    return result;
  } catch (error) {
    console.error('❌ 獲取展延列表失敗:', error);
    throw error;
  }
};

/**
 * 創建展延記錄
 * @param extensionData 展延記錄數據
 * @returns Promise<ExtensionResponse>
 */
export const createExtension = async (extensionData: CreateExtensionRequest): Promise<ExtensionResponse> => {
  try {
    
    const response = await http.post('/management/extension/create', extensionData);
    
    return response as unknown as ExtensionResponse;
  } catch (error) {
    console.error('❌ 創建展延記錄失敗:', error);
    throw error;
  }
};

/**
 * 更新展延記錄
 * @param extensionData 展延記錄數據
 * @returns Promise<ExtensionResponse>
 */
export const updateExtension = async (extensionData: UpdateExtensionRequest): Promise<ExtensionResponse> => {
  try {
    
    const response = await http.patch('/management/extension/update', extensionData);
    
    return response as unknown as ExtensionResponse;
  } catch (error) {
    console.error('❌ 更新展延記錄失敗:', error);
    throw error;
  }
};

/**
 * 刪除展延記錄
 * @param extensionId 展延記錄 ID
 * @returns Promise<ExtensionResponse>
 */
export const deleteExtension = async (extensionId: string): Promise<ExtensionResponse> => {
  try {
    
    const response = await http.delete(`/management/extension/delete/${extensionId}`);
    
    return response as unknown as ExtensionResponse;
  } catch (error) {
    console.error('❌ 刪除展延記錄失敗:', error);
    throw error;
  }
};

/**
 * 批量更新展延記錄
 * @param extensions 展延記錄數組
 * @returns Promise<ExtensionResponse>
 */
export const batchUpdateExtensions = async (extensions: ExtensionRecord[]): Promise<ExtensionResponse> => {
  try {
    
    const response = await http.put('/management/extension/batch-update', {
      extensions: extensions
    });
    
    return response as unknown as ExtensionResponse;
  } catch (error) {
    console.error('❌ 批量更新展延記錄失敗:', error);
    throw error;
  }
};

// 展延歷程記錄接口
export interface ExtensionHistoryRecord {
  sequence: number; // 序次
  extensionId: string; // 展延記錄 ID
  extendReason: string; // 展延原因
  approvedDays: number; // 核准天數
  totalDurationAfterExtension: number; // 展延後總工期
  calculatedEndDate: string; // 展延後預計完工日期
  verifyNumber?: string; // 驗證編號
  approvedAt: string; // 核准時間
  createdAt: string; // 建立時間
}

// 展延歷程查詢回應
export interface ExtensionHistoryResponse {
  code: number;
  message: string;
  data: ExtensionHistoryRecord[];
}

/**
 * 獲取展延歷程
 * @param constructionId 工程編號
 * @returns Promise<ExtensionHistoryResponse>
 */
export const getExtensionHistory = async (constructionId: string): Promise<ExtensionHistoryResponse> => {
  try {
    const response = await http.get('/management/extension/history', {
      params: {
        constructionId
      }
    });
    
    // 處理不同的回應格式
    let data: ExtensionHistoryRecord[] = []
    
    if (response.data && Array.isArray(response.data)) {
      data = response.data
    } else if (response.data && response.data.data && Array.isArray(response.data.data)) {
      data = response.data.data
    } else if (response && Array.isArray(response)) {
      data = response
    }
    
    return {
      code: 200,
      message: 'get extension history success',
      data: data
    } as ExtensionHistoryResponse;
  } catch (error) {
    console.error('❌ 獲取展延歷程失敗:', error);
    throw error;
  }
};

export default {
  getExtensionList,
  createExtension,
  updateExtension,
  deleteExtension,
  batchUpdateExtensions,
  getExtensionHistory
};
