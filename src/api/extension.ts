import http from './http';

// 展延狀態枚舉
export enum ExtensionStatus {
  DRAFT = 'DRAFT',       // 草稿
  PENDING = 'PENDING',   // 待審核
  APPROVED = 'APPROVED', // 已核准
  REJECTED = 'REJECTED'  // 退回
}

// 展延模式枚舉（僅保留 SPECIFIC_DATES）
export enum ExtensionType {
  SPECIFIC_DATES = 'SPECIFIC_DATES' // 指定日期免計
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
  calculatedEndDateAfterExtension?: string; // 展延後預計完工日期
  sequence?: number; // 序次
  approvedAt?: string; // 核准時間
  createdAt?: string; // 建立時間
  // 新增欄位（審核流程與計算模式）
  status?: ExtensionStatus;       // 審核狀態，建立時預設為 DRAFT
  extensionType?: ExtensionType;  // 展延模式，固定為 SPECIFIC_DATES
  specificDates?: string[];       // 日期字串陣列 (YYYY-MM-DD)
  // 使用資料版本（後端動態計算）
  designChangeId?: number | null;
  versionLabel?: string;
  versionRange?: string;
  // 前端動態欄位（公文關聯用）
  linkedDocumentNumber?: string;  // 關聯公文的發文字號（前端載入時填入）
  linkedDocumentId?: number | null;      // 關聯公文 ID
  linkedReferenceId?: number | null;     // DocumentReference ID
}

// 展延列表查詢參數
export interface ExtensionListParams {
  constructionId: string;
  ownerType?: string; // SUPERVISORY | CONTRACTOR
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
  extendDay?: number;
  approvalDocumentNumber?: string;
  completionDateAfterExtension?: string;
  status?: ExtensionStatus;       // 建立時預設為 DRAFT
  extensionType?: ExtensionType;  // 固定為 SPECIFIC_DATES
  specificDates?: string[];       // 日期字串陣列 (YYYY-MM-DD)
  ownerType?: string;             // SUPERVISORY | CONTRACTOR（由後端自動判斷，前端可選填）
}

// 更新展延記錄請求
export interface UpdateExtensionRequest {
  extensionId: string;
  verifyNumber?: string;
  extendContent?: string;
  extendDate?: string;
  extendDay?: number;
  status?: ExtensionStatus;       // 允許變更審核狀態（管理員/主管）
  extensionType?: ExtensionType;  // 固定為 SPECIFIC_DATES
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
    
    const queryParams: Record<string, string> = {
      constructionId: params.constructionId
    }
    if (params.ownerType) {
      queryParams.ownerType = params.ownerType
    }
    const response = await http.get('/management/extension/list', {
      params: queryParams
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
    const params: any = {};
    if (extensionData.ownerType) {
      params.ownerType = extensionData.ownerType;
    }
    const response = await http.post('/management/extension/create', extensionData, { params });
    
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
export const getExtensionHistory = async (constructionId: string, ownerType?: string): Promise<ExtensionHistoryResponse> => {
  try {
    const queryParams: Record<string, string> = { constructionId }
    if (ownerType) queryParams.ownerType = ownerType
    const response = await http.get('/management/extension/history', {
      params: queryParams
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

// ── 公文關聯 ──

export interface ExtensionLinkedDocument {
  referenceId: number
  documentId: number
  sourceType: string
  displayTitle: string
  targetRole: string
  targetName: string
}

/**
 * 將公文關聯到展延紀錄
 * POST /extension/{extensionId}/documents
 */
export const linkExtensionDocument = async (
  extensionId: string,
  documentId: number,
  sequence: number
): Promise<any> => {
  const response = await http.post(`/management/extension/${extensionId}/documents`, {
    documentId,
    sequence
  })
  return response
}

/**
 * 取消公文與展延紀錄的關聯
 * DELETE /extension/{extensionId}/documents/{referenceId}
 */
export const unlinkExtensionDocument = async (
  extensionId: string,
  referenceId: number
): Promise<any> => {
  const response = await http.delete(`/management/extension/${extensionId}/documents/${referenceId}`)
  return response
}

/**
 * 取得展延紀錄的所有公文關聯
 * GET /extension/{extensionId}/documents
 */
export const getExtensionLinkedDocuments = async (
  extensionId: string
): Promise<ExtensionLinkedDocument[]> => {
  const response = await http.get(`/management/extension/${extensionId}/documents`)
  // http 攔截器已解包 { code, data } → 直接回傳 data（陣列）
  if (Array.isArray(response)) return response as ExtensionLinkedDocument[]
  // 相容未解包的情況
  const data = (response as any)?.data?.data || (response as any)?.data || response || []
  return Array.isArray(data) ? data : []
}

/**
 * 更新展延紀錄的排序順序
 * PUT /extension/reorder
 */
export const reorderExtensions = async (
  constructionId: string,
  orderedExtensionIds: string[]
): Promise<any> => {
  const response = await http.put('/management/extension/reorder', {
    constructionId,
    orderedExtensionIds
  })
  return response
}

// ===========================
// PDF 附件
// ===========================

export interface ExtensionAttachment {
  id: number;
  extensionId: string;
  fileName: string;
  fileSize: number;
  contentType: string;
  createdAt?: string;
}

export const uploadExtensionAttachment = async (
  extensionId: string,
  file: File
): Promise<ExtensionAttachment> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await http.post(
    `/management/extension/${extensionId}/attachments`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
  return response as unknown as ExtensionAttachment;
};

export const getExtensionAttachments = async (
  extensionId: string
): Promise<ExtensionAttachment[]> => {
  const response = await http.get(`/management/extension/${extensionId}/attachments`);
  return (response ?? []) as unknown as ExtensionAttachment[];
};

export const deleteExtensionAttachment = async (
  extensionId: string,
  attachmentId: number
): Promise<void> => {
  await http.delete(`/management/extension/${extensionId}/attachments/${attachmentId}`);
};

export const previewExtensionAttachment = async (
  extensionId: string,
  attachmentId: number
): Promise<{ url: string; fileName: string }> => {
  const response = await http.get(
    `/management/extension/${extensionId}/attachments/${attachmentId}/preview`
  );
  return response as unknown as { url: string; fileName: string };
};

export const downloadAllExtensionAttachments = async (
  extensionId: string
): Promise<void> => {
  const response = await http.get(
    `/management/extension/${extensionId}/attachments/download-all`,
    { responseType: 'blob' }
  ) as unknown as Blob;
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/zip' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `展延附件_${extensionId}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const downloadExtensionAttachment = async (
  extensionId: string,
  attachmentId: number,
  fileName: string
): Promise<void> => {
  const response = await http.get(
    `/management/extension/${extensionId}/attachments/${attachmentId}/download`,
    { responseType: 'blob' }
  ) as unknown as Blob;
  const blob = response instanceof Blob ? response : new Blob([response], { type: 'application/pdf' });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export default {
  getExtensionList,
  createExtension,
  updateExtension,
  deleteExtension,
  batchUpdateExtensions,
  getExtensionHistory,
  linkExtensionDocument,
  unlinkExtensionDocument,
  getExtensionLinkedDocuments,
  reorderExtensions,
  uploadExtensionAttachment,
  getExtensionAttachments,
  deleteExtensionAttachment,
  previewExtensionAttachment,
  downloadAllExtensionAttachments,
  downloadExtensionAttachment
};
