import http from './http';

/**
 * BaseResponse 格式
 */
export interface BaseResponse<T> {
  code: number;
  message: string;
  data: T | null;
}

/**
 * PCCES 總表項目
 */
export interface PccesCatalogItem {
  id: number;      // 項目 ID
  code: string;    // PCCES 編碼 (如: CM01)
  name: string;    // 中文名稱 (如: 混凝土)
  unit: string | null; // 單位 (如: M3)，可能為 null
  source?: string; // 資料來源
}

/**
 * 匯入 PCCES XML 檔案請求參數
 */
export interface ImportPccesRequest {
  pccesFile: File;
  constructionId: string;
  versionName?: string;
  targetVersionId?: string;
  isVariationOrder?: boolean;
  baseVersionId?: string;
  effectiveStartDate?: string; // 生效開始日期 (YYYY-MM-DD，可選)
  effectiveEndDate?: string | null; // 生效結束日期 (YYYY-MM-DD，可選，null 表示持續有效)
}

/**
 * 匯入 PCCES XML 檔案回應
 */
export interface ImportPccesResponse {
  contractNo: string;
  versionId: string;
  versionName: string;
  versionNumber: number;
  totalCodes: number;
  isVariationOrder: boolean;
  isFirstImport: boolean; // 是否為初次匯入
}

/**
 * 取得檢查清單請求參數
 */
export interface GetCheckListRequest {
  constructionId: string;
  size: number;
}

/**
 * 檢查清單項目
 */
export interface CheckListItem {
  companyId: string | null;
  constructionId: string | null;
  pccesCode: string | null;
  itemNumber: number | null;
  '抽查標準': string | null;
  '抽查方法': string | null;
  '一級辦理時機': string | null;
  '一級試驗頻率': string | null;
  '二級抽驗比例(%)': string | null;
  '不合格處理(量化))': string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

/**
 * 自訂 PCCES Code 材料項目
 */
export interface PccesMaterial {
  itemNumber: number;
  pccesCode: string | null;
  checkStandard: string;
  checkMethod: string;
  applyFirstLevel: string;
  feqCheckFirstLevel: string;
  checkRatioSecondLevel: string;
  failureHandle: string;
}

/**
 * 建立或更新自訂 PCCES Code 請求
 */
export interface CreateOrUpdatePccesCodeRequest {
  constructionId: string;
  pccesContents: any[] | null;
  pccesMaterial: PccesMaterial[] | null;
}

/**
 * 合約版本
 */
export interface ContractVersion {
  id: string;
  constructionId: string;
  versionName: string;
  versionNumber: number;
  isLatest: boolean;
  createDate: string;
  effectiveStartDate: string; // 生效開始日期 (YYYY-MM-DD)
  effectiveEndDate: string | null; // 生效結束日期 (YYYY-MM-DD, null 表示持續有效)
  createdAt: string;
  updatedAt: string;
}

/**
 * 工項類型
 */
export enum PccesItemType {
  MAIN_ITEM = 'MAIN_ITEM',      // 大項（階層分類）
  LABOUR = 'LABOUR',            // 人工
  EQUIPMENT = 'EQUIPMENT',      // 機具
  MATERIAL = 'MATERIAL',         // 材料
  MISC = 'MISC',                // 雜項
  WORK_ITEM = 'WORK_ITEM'        // 工項
}

/**
 * 工項明細
 */
export interface ConstructionPccesCode {
  id: number;
  logicalId: string;
  pccesCode: string | null;
  name: string;
  quantity: number;
  price: string;
  amount: string;
  unitType: string;
  itemNo: string | null;
  orderNumber: number | null;
  remark: string | null;
  parentId: number | null;      // 父項目 ID（用於建立階層關係）
  type: PccesItemType | null;   // 項目類型
  createdAt: string;
  updatedAt: string;
}

/**
 * 施工抽查標準表
 */
export interface ConstructionStandard {
  id: number;
  pccesCode: string;
  itemName: string;
  dataSource: string;
  workProcess: string;    // 施工階段
  manageProject: string;  // 管理項目
  checkStandard: string;  // 抽查標準
  checkTiming: string;    // 抽查時機
  checkMethod: string;    // 抽查方法
  checkFeq: string;       // 抽查頻率
  failureHandle: string;  // 不合格處理
  manageRecord: string;   // 管理紀錄
  remark: string;         // 備註
  isActive: boolean;
}

// --- Construction Major Item Interfaces ---

export interface ConstructionMajorItem {
  id: string;
  name: string;
  description?: string;
  isActive: boolean;
  version?: number;
  effectiveStartDate?: string;
  effectiveEndDate?: string;
  copiedFromPccesCode?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  standards?: any[];
}

export interface ConstructionMajorItemRequest {
    name: string;
    description?: string;
    isActive?: boolean;
    version?: number;
    effectiveStartDate?: string;
    effectiveEndDate?: string;
    sourcePccesCode?: string;
}

export interface PageableResponse<T> {
    content: T[];
    totalElements: number;
    totalPages: number;
    size: number;
    number: number;
    first: boolean;
    last: boolean;
    empty: boolean;
}

/**
 * 匯入 PCCES XML 檔案
 */
export async function importPccesFile(
  request: ImportPccesRequest
): Promise<ImportPccesResponse> {
  const formData = new FormData();
  formData.append('pccesFile', request.pccesFile);
  formData.append('constructionId', request.constructionId);
  
  if (request.versionName) {
    formData.append('versionName', request.versionName);
  }
  if (request.targetVersionId) {
    formData.append('targetVersionId', request.targetVersionId);
  }
  if (request.isVariationOrder !== undefined) {
    formData.append('isVariationOrder', request.isVariationOrder.toString());
  }
  if (request.baseVersionId) {
    formData.append('baseVersionId', request.baseVersionId);
  }
  if (request.effectiveStartDate) {
    formData.append('effectiveStartDate', request.effectiveStartDate);
  }
  if (request.effectiveEndDate !== undefined) {
    formData.append('effectiveEndDate', request.effectiveEndDate || '');
  }

  const response = await http.post(
    '/management/generate/import/report',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }
  );

  // http.ts 的攔截器已經處理了 BaseResponse 格式，直接返回 data
  return response as unknown as ImportPccesResponse;
}

/**
 * 取得檢查清單
 */
export async function getCheckList(
  constructionId: string,
  size: number = 100
): Promise<CheckListItem[]> {
  const params = new URLSearchParams({
    constructionId,
    size: size.toString(),
  });

  const response = await http.get(
    `/management/generate/checkList?${params}`
  );

  return (response as unknown as CheckListItem[]) || [];
}

/**
 * 建立或更新自訂 PCCES Code
 */
export async function createOrUpdatePccesCode(
  request: CreateOrUpdatePccesCodeRequest
): Promise<void> {
  await http.post(
    '/management/customPccesCode/createOrUpdate',
    request
  );
}

/**
 * 取得工程的所有版本列表
 */
export async function getContractVersions(
  constructionId: string
): Promise<ContractVersion[]> {
  const response = await http.get(
    `/management/generate/versions?constructionId=${constructionId}`
  );
  return (response as unknown as ContractVersion[]) || [];
}

/**
 * 取得指定版本的工項列表
 */
export async function getConstructionPccesCodes(
  constructionId: string,
  versionId?: string
): Promise<ConstructionPccesCode[]> {
  const params = new URLSearchParams({
    constructionId,
  });
  if (versionId) {
    params.append('versionId', versionId);
  }

  const response = await http.get(
    `/management/generate/pccesCodes?${params}`
  );
  return (response as unknown as ConstructionPccesCode[]) || [];
}

/**
 * 取得施工項目列表（有 pccesCode 的項目）
 */
export async function getConstructionItems(
  constructionId: string,
  date: string
): Promise<ConstructionPccesCode[]> {
  const params = new URLSearchParams({
    constructionId,
    date,
  });

  const response = await http.get(
    `/management/generate/constructionItems?${params}`
  );
  return (response as unknown as ConstructionPccesCode[]) || [];
}

/**
 * 取得材料項目列表（pccesCode 第一碼是 'M' 的項目）
 */
export async function getMaterialItems(
  constructionId: string,
  date: string
): Promise<ConstructionPccesCode[]> {
  const params = new URLSearchParams({
    constructionId,
    date,
  });

  const response = await http.get(
    `/management/generate/materialItems?${params}`
  );
  return (response as unknown as ConstructionPccesCode[]) || [];
}

/**
 * 搜尋 PCCES 總表項目
 */
export async function searchPccesItems(query: string, limit: number = 20): Promise<PccesCatalogItem[]> {
  const params = new URLSearchParams({ 
    query,
    limit: limit.toString()
  });
  
  const response = await http.get(`/management/api/pcces-catalogs/search?${params}`);
  return (response as unknown as PccesCatalogItem[]) || [];
}

/**
 * 根據 PCCES Code 查詢工項標準
 */
export async function getStandardByPccesCode(pccesCode: string): Promise<ConstructionStandard[]> {
  const response = await http.get(`/management/standard/work-process/by-pcces-code/${encodeURIComponent(pccesCode)}`);
  return response as unknown as ConstructionStandard[]; 
}

// --- Construction Major Item API Functions ---

/**
 * 查詢施工大項列表
 */
export async function getConstructionMajorItems(params: { keyword?: string; isActive?: boolean; page?: number; size?: number }): Promise<PageableResponse<ConstructionMajorItem>> {
    const queryParams = new URLSearchParams();
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    // 使用 /management 前綴
    const response = await http.get(`/management/construction-major-items?${queryParams.toString()}`);
    return response as unknown as PageableResponse<ConstructionMajorItem>;
}

/**
 * 取得單一施工大項
 */
export async function getConstructionMajorItemById(id: string): Promise<ConstructionMajorItem> {
    const response = await http.get(`/management/construction-major-items/${id}`);
    return response as unknown as ConstructionMajorItem;
}

/**
 * 建立施工大項
 */
export async function createConstructionMajorItem(data: ConstructionMajorItemRequest): Promise<ConstructionMajorItem> {
    const response = await http.post('/management/construction-major-items', data);
    return response as unknown as ConstructionMajorItem;
}

/**
 * 更新施工大項
 */
export async function updateConstructionMajorItem(id: string, data: Partial<ConstructionMajorItemRequest>): Promise<ConstructionMajorItem> {
    const response = await http.put(`/management/construction-major-items/${id}`, data);
    return response as unknown as ConstructionMajorItem;
}

export interface ConstructionMajorItemStandardResponse {
    id: number;
    stepOrder: number;
    itemName?: string;
    workProcess?: string;
    manageProject?: string;
    checkStandard?: string;
    checkTiming?: string;
    checkMethod?: string;
    checkFeq?: string;
    failureHandle?: string;
    manageRecord?: string;
    remark?: string;
    isActive?: boolean;
    checkPoint?: string;
}

// ... existing code ...

/**
 * 刪除施工大項
 */
export async function deleteConstructionMajorItem(id: string): Promise<void> {
    await http.delete(`/management/construction-major-items/${id}`);
}

/**
 * 1) 查詢某施工大項的施工抽查標準明細
 */
export async function getConstructionMajorItemStandards(id: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.get(`/management/construction-major-items/${id}/standards`);
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

/**
 * 2) 覆蓋式複製（從 PCCES 工項複製標準到施工大項）
 */
export async function copyStandardFromPcces(id: string, sourcePccesCode: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.post(`/management/construction-major-items/${id}/standards/copy`, { sourcePccesCode });
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

/**
 * 3) 編輯單筆施工抽查標準明細
 */
export async function updateConstructionMajorItemStandard(id: string, standardId: number, data: Partial<ConstructionMajorItemStandardResponse>): Promise<ConstructionMajorItemStandardResponse> {
    const response = await http.patch(`/management/construction-major-items/${id}/standards/${standardId}`, data);
    return response as unknown as ConstructionMajorItemStandardResponse;
}
