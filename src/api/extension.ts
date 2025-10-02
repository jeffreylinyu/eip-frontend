import http from './http';

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
  verifyNumber: string;
  extendReason?: string;
  extendContent: string;
  extendDate: string;
  extendDay: number;
  approvalDocumentNumber?: string;
  completionDateAfterExtension?: string;
}

// 更新展延記錄請求
export interface UpdateExtensionRequest {
  extensionId: string;
  verifyNumber?: string;
  extendContent?: string;
  extendDate?: string;
  extendDay?: number;
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

export default {
  getExtensionList,
  createExtension,
  updateExtension,
  deleteExtension,
  batchUpdateExtensions
};
