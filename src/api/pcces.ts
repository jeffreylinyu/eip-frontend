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
 * 匯入 PCCES XML 檔案請求參數（依變更設計版本）
 */
export interface ImportPccesRequest {
  pccesFile: File;
  constructionId: string;
  /** 匯入目標：null = 原契約，數字 = 該變更設計版本 */
  designChangeId?: number | null;
  /** 是否先刪除該版本既有工項再匯入 */
  overwrite?: boolean;
}

/**
 * 匯入 PCCES XML 檔案回應
 */
export interface ImportPccesResponse {
  contractNo?: string;
  constructionId: string;
  designChangeId: number | null;
  totalCodes: number;
  /** CostBreakdownList 匯入列數（與標單明細分開） */
  totalCostBreakdown?: number;
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
 * 工項類型
 */
export enum PccesItemType {
  MAIN_ITEM = 'MAIN_ITEM',      // 大項（階層分類）
  LABOUR = 'LABOUR',            // 人工
  EQUIPMENT = 'EQUIPMENT',      // 機具
  MATERIAL = 'MATERIAL',         // 材料
  MISC = 'MISC',                // 雜項
  WORK_ITEM = 'WORK_ITEM',       // 工項
  TEST_ITEM = 'TEST_ITEM'        // 試驗項
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
  /** 是否為安全衛生設施（使用者勾選，非匯入檔；預設 false） */
  isSafetyHealthFacility?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** PCCES 單價分析（CostBreakdownList）一列 */
export interface ConstructionPccesCostBreakdown {
  id: number;
  logicalId: string;
  parentId: number | null;
  orderNumber: number | null;
  refItemNo: string | null;
  itemCode: string | null;
  itemKind: string | null;
  name: string;
  unitType: string | null;
  quantity: number;
  price: string;
  amount: string;
  remark: string | null;
  percent: string | null;
  labourRatio: string | null;
  equipmentRatio: string | null;
  materialRatio: string | null;
  miscellaneaRatio: string | null;
  type: PccesItemType | null;
  /** 是否為材料（僅葉節點可編輯；匯入時編碼 M 開頭之葉節點預設 true） */
  isMaterial?: boolean;
  createdAt: string;
  updatedAt: string;
}

/** PCCES 資源統計（ResourceList）一列 */
export interface ConstructionPccesResource {
  id: number;
  orderNumber: number | null;
  itemCode: string | null;
  itemKind: string | null;
  name: string;
  unitType: string | null;
  quantity: number;
  price: string;
  amount: string;
  remark: string | null;
  percent: string | null;
  labourRatio: string | null;
  equipmentRatio: string | null;
  materialRatio: string | null;
  miscellaneaRatio: string | null;
}

export interface PccesMaterialTestItemLink {
  id: number;
  constructionId: string;
  designChangeId: number | null;
  itemCode: string;
  /** 指向 construction_pcces_code.id（type='TEST_ITEM'） */
  pccesCodeId: number;
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
  workProcess: string;    // 施工階段（work_process）
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
  /** 同工程同版本清單順序（0 起） */
  sortOrder?: number;
  name: string;
  /** 變更設計版本：null = 原契約 */
  designChangeId?: number | null;
  description?: string;
  isActive: boolean;
  copiedFromPccesCode?: string;
  createdAt?: string;
  updatedAt?: string;
  createdBy?: string;
  updatedBy?: string;
  standards?: any[];
  /** 安全衛生抽查標準明細（與施工抽查分開） */
  safetyStandards?: ConstructionMajorItemStandardResponse[];
}

export interface ConstructionMajorItemRequest {
    name: string;
    /** 變更設計版本：null = 原契約 */
    designChangeId?: number | null;
    description?: string;
    isActive?: boolean;
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
 * Excel 標單匯入請求（AI 解析）
 */
export interface ImportPccesExcelRequest {
  excelFile: File;
  constructionId: string;
  designChangeId?: number | null;
  overwrite?: boolean;
}

/**
 * Excel 標單匯入回應
 */
export interface ImportPccesExcelResponse {
  constructionId: string;
  designChangeId: number | null;
  totalCodes: number;
  totalCostBreakdown: number;
  totalTestItems: number;
  totalResources: number;
}

/**
 * 匯入 Excel 標單（AI 解析，無 PCCES XML 時的替代方案）
 */
export async function importPccesExcelFile(
  request: ImportPccesExcelRequest
): Promise<ImportPccesExcelResponse> {
  const formData = new FormData();
  formData.append('excelFile', request.excelFile);
  formData.append('constructionId', request.constructionId);
  if (request.designChangeId !== undefined && request.designChangeId !== null) {
    formData.append('designChangeId', String(request.designChangeId));
  }
  if (request.overwrite !== undefined) {
    formData.append('overwrite', request.overwrite ? 'true' : 'false');
  }
  const response = await http.post(
    '/management/generate/import/excel',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 300000 }
  );
  return response as unknown as ImportPccesExcelResponse;
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
  if (request.designChangeId !== undefined && request.designChangeId !== null) {
    formData.append('designChangeId', String(request.designChangeId));
  }
  if (request.overwrite !== undefined) {
    formData.append('overwrite', request.overwrite ? 'true' : 'false');
  }
  const response = await http.post(
    '/management/generate/import/report',
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
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
 * 取得指定變更設計版本的工項列表（designChangeId 不傳或 null = 原契約）
 */
export async function getConstructionPccesCodes(
  constructionId: string,
  designChangeId?: number | null
): Promise<ConstructionPccesCode[]> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const response = await http.get(
    `/management/generate/pccesCodes?${params}`
  );
  return (response as unknown as ConstructionPccesCode[]) || [];
}

/**
 * 取得單價分析列（CostBreakdownList），與標單明細分開儲存
 */
export async function getConstructionPccesCostBreakdown(
  constructionId: string,
  designChangeId?: number | null
): Promise<ConstructionPccesCostBreakdown[]> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const response = await http.get(
    `/management/generate/pccesCostBreakdown?${params}`
  );
  return (response as unknown as ConstructionPccesCostBreakdown[]) || [];
}

export async function getConstructionPccesResources(
  constructionId: string,
  designChangeId?: number | null
): Promise<ConstructionPccesResource[]> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const response = await http.get(`/management/generate/pccesResources?${params}`);
  return (response as unknown as ConstructionPccesResource[]) || [];
}

export async function listPccesMaterialTestItemLinks(
  constructionId: string,
  designChangeId?: number | null
): Promise<PccesMaterialTestItemLink[]> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const res = await http.get(`/management/generate/pcces/material-test-item-links?${params}`);
  return (res as unknown as PccesMaterialTestItemLink[]) || [];
}

export async function replacePccesMaterialTestItemLinksForMaterial(
  constructionId: string,
  itemCode: string,
  pccesCodeIds: number[],
  designChangeId?: number | null
): Promise<{ inserted: number }> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const res = await http.put(
    `/management/generate/pcces/material-test-item-links/material/${encodeURIComponent(itemCode)}?${params}`,
    { testItemIds: pccesCodeIds }
  );
  return (res as any) || { inserted: 0 };
}

export async function deletePccesMaterialTestItemLink(
  constructionId: string,
  linkId: number,
  designChangeId?: number | null
): Promise<{ deleted: number }> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const res = await http.delete(`/management/generate/pcces/material-test-item-links/${linkId}?${params}`);
  return (res as any) || { deleted: 0 };
}

// 單價分析 is_material 已廢止：材料維護統一在「材料與試驗」頁籤（/pcces/material-usage）

export interface ConstructionPccesMaterialUsage {
  id: number
  constructionId: string
  designChangeId: number | null
  itemCode: string
  used: boolean
  createdAt: string
  updatedAt: string
}

export async function getPccesMaterialUsage(
  constructionId: string,
  designChangeId?: number | null
): Promise<ConstructionPccesMaterialUsage[]> {
  const params = new URLSearchParams({ constructionId })
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId))
  }
  const res = await http.get(`/management/generate/pcces/material-usage?${params}`)
  return (res as unknown as ConstructionPccesMaterialUsage[]) || []
}

export async function setPccesMaterialUsage(
  constructionId: string,
  itemCode: string,
  used: boolean,
  designChangeId?: number | null
): Promise<void> {
  const params = new URLSearchParams({ constructionId, used: String(used) })
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId))
  }
  await http.patch(`/management/generate/pcces/material-usage/${encodeURIComponent(itemCode)}?${params}`)
}

export async function batchSetPccesMaterialUsage(
  constructionId: string,
  itemCodes: string[],
  used: boolean,
  designChangeId?: number | null
): Promise<{ updated: number }> {
  const body: any = {
    constructionId,
    designChangeId: designChangeId ?? null,
    itemCodes,
    used
  }
  const res = await http.patch('/management/generate/pcces/material-usage/batch', body)
  const data = res as any
  return { updated: data?.updated ?? data?.data?.updated ?? 0 }
}

/**
 * 複製工項：從來源版本複製到目標版本（覆蓋目標版本既有工項）
 * 用於「複製前一個版本」：sourceDesignChangeId = 前版（null = 原契約），targetDesignChangeId = 目前選中版本（null = 原契約）
 */
export async function copyPccesFromTo(
  constructionId: string,
  sourceDesignChangeId: number | null | undefined,
  targetDesignChangeId: number | null | undefined
): Promise<{ count: number }> {
  const params = new URLSearchParams({ constructionId });
  if (sourceDesignChangeId !== undefined && sourceDesignChangeId !== null) {
    params.append('sourceDesignChangeId', String(sourceDesignChangeId));
  }
  if (targetDesignChangeId !== undefined && targetDesignChangeId !== null) {
    params.append('targetDesignChangeId', String(targetDesignChangeId));
  }
  const res = await http.post(`/management/generate/pccesCodes/copy?${params}`);
  // 攔截器在 code=200 時會回傳 response.data.data，故 res 可能為 { count: number }
  const data = res as { data?: { count?: number }; count?: number };
  const count = data.count ?? data.data?.count ?? 0;
  return { count };
}

/**
 * 更新單筆工項「是否為安全衛生設施」（使用者勾選，非 PCCES 匯入欄位）
 */
export async function updatePccesCodeSafetyHealthFacility(
  constructionId: string,
  id: number,
  isSafetyHealthFacility: boolean,
  designChangeId?: number | null
): Promise<void> {
  const params = new URLSearchParams({
    constructionId,
    isSafetyHealthFacility: String(isSafetyHealthFacility)
  });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  await http.patch(`/management/generate/pccesCodes/${id}/safety-health-facility?${params}`);
}

export interface PccesSafetyHealthBatchRequest {
  constructionId: string;
  designChangeId?: number | null;
  ids: number[];
  isSafetyHealthFacility: boolean;
}

/**
 * 批次更新多筆工項「是否為安全衛生設施」（同一值，供樹狀父層一次勾選）
 */
export async function batchUpdatePccesCodeSafetyHealthFacility(
  body: PccesSafetyHealthBatchRequest
): Promise<{ updated: number }> {
  const res = await http.patch('/management/generate/pccesCodes/safety-health-facility/batch', body);
  const data = res as { updated?: number };
  return { updated: data.updated ?? 0 };
}

/**
 * 更新單價分析列（名稱、料碼、單位、數量、單價、類型）
 */
export interface UpdatePccesCostBreakdownRequest {
  name: string;
  itemCode: string | null;
  unitType: string;
  quantity: number;
  price: string | number;
  amount: string | number;
  /** PccesItemType 的 name 字串；null 表示不分類 */
  type: string | null;
}

export async function updatePccesCostBreakdownRow(
  constructionId: string,
  id: number,
  body: UpdatePccesCostBreakdownRequest
): Promise<void> {
  await http.patch(
    `/management/generate/pccesCostBreakdown/${id}?constructionId=${encodeURIComponent(constructionId)}`,
    body
  );
}

/**
 * 按需建立試驗項的 pcces_codes 記錄（Lazy Creation）。
 * 傳入 breakdownIds，後端確保每筆都有 pcces_codes 記錄並回傳 breakdownId→pccesCodeId 的對應表。
 */
export async function ensureTestItemsFromBreakdown(
  constructionId: string,
  designChangeId: number | null,
  breakdownIds: number[]
): Promise<Record<number, number>> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId != null) params.append('designChangeId', String(designChangeId));
  const response = await http.post(
    `/management/generate/ensureTestItemsFromBreakdown?${params}`,
    { breakdownIds }
  );
  return (response as unknown as Record<number, number>) || {};
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
 * 逐行更新工項欄位（code、name、unit、quantity、price、amount、type）
 */
export interface UpdatePccesCodeRowRequest {
  pccesCode: string | null;
  name: string;
  unitType: string;
  quantity: number;
  price: string | number;
  amount: string | number;
  /** PccesItemType 的 name 字串；null 表示不分類 */
  type: string | null;
}

export async function updatePccesCodeRow(
  constructionId: string,
  id: number,
  body: UpdatePccesCodeRowRequest
): Promise<void> {
  await http.patch(
    `/management/generate/pccesCodes/${id}?constructionId=${encodeURIComponent(constructionId)}`,
    body
  );
}

/**
 * 刪除單筆工項及其所有子孫節點
 */
export async function deletePccesCodeRow(
  constructionId: string,
  id: number
): Promise<void> {
  await http.delete(
    `/management/generate/pccesCodes/${id}?constructionId=${encodeURIComponent(constructionId)}`
  );
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
export async function getConstructionMajorItems(
  constructionId: string,
  params: { designChangeId?: number | null; keyword?: string; isActive?: boolean; page?: number; size?: number }
): Promise<PageableResponse<ConstructionMajorItem>> {
    const queryParams = new URLSearchParams();
    queryParams.append('constructionId', constructionId);
    if (params.designChangeId !== undefined && params.designChangeId !== null) {
      queryParams.append('designChangeId', String(params.designChangeId));
    }
    if (params.keyword) queryParams.append('keyword', params.keyword);
    if (params.isActive !== undefined) queryParams.append('isActive', params.isActive.toString());
    if (params.page !== undefined) queryParams.append('page', params.page.toString());
    if (params.size !== undefined) queryParams.append('size', params.size.toString());

    const response = await http.get(`/management/construction-major-items?${queryParams.toString()}`);
    return response as unknown as PageableResponse<ConstructionMajorItem>;
}

/** 調整施工大項（施工項目）在同工程、同版本内的顯示順序 */
export async function reorderConstructionMajorItems(payload: {
  constructionId: string;
  designChangeId?: number | null;
  orderedIds: string[];
}): Promise<void> {
  await http.put('/management/construction-major-items/reorder', {
    constructionId: payload.constructionId,
    designChangeId: payload.designChangeId ?? null,
    orderedIds: payload.orderedIds,
  });
}

/**
 * 取得單一施工大項
 */
export async function getConstructionMajorItemById(constructionId: string, id: string): Promise<ConstructionMajorItem> {
    const response = await http.get(`/management/construction-major-items/${id}?constructionId=${encodeURIComponent(constructionId)}`);
    return response as unknown as ConstructionMajorItem;
}

/**
 * 建立施工大項
 */
export async function createConstructionMajorItem(constructionId: string, data: ConstructionMajorItemRequest): Promise<ConstructionMajorItem> {
    const response = await http.post(`/management/construction-major-items?constructionId=${encodeURIComponent(constructionId)}`, data);
    return response as unknown as ConstructionMajorItem;
}

/**
 * 將原契約版本的施工大項（含抽查標準）複製到指定變更設計版本
 * @deprecated 請改用 copyConstructionMajorItemsFromPrevious
 */
export async function copyConstructionMajorItemsFromOriginal(
  constructionId: string,
  designChangeId: number
): Promise<{ copiedCount: number }> {
  const response = await http.post<{ copiedCount: number }>(
    `/management/construction-major-items/copy-from-original?constructionId=${encodeURIComponent(constructionId)}&designChangeId=${designChangeId}`
  );
  return response as unknown as { copiedCount: number };
}

/** AI 建議的施工大項項目（依標單產出，供使用者勾選後併入） */
export interface MajorItemSuggestionItem {
  name: string;
  description: string;
}

/**
 * 依監造標單由 AI 產出施工大項建議，不寫入 DB。標單無資料時回傳空陣列。
 * 失敗時後端回傳 503 與 error 訊息。
 */
export async function getConstructionMajorItemAiSuggest(
  constructionId: string,
  designChangeId?: number | null
): Promise<{ suggestions: MajorItemSuggestionItem[] }> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId !== undefined && designChangeId !== null) {
    params.append('designChangeId', String(designChangeId));
  }
  const response = await http.get(`/management/construction-major-items/ai-suggest?${params}`);
  return response as unknown as { suggestions: MajorItemSuggestionItem[] };
}

/**
 * 從前一個版本複製施工大項（含抽查標準）到目標版本。sourceDesignChangeId 不傳或 null = 原契約
 * @param options.overwrite true：先清空目標版本再複製；false（預設）：合併併入
 */
export async function copyConstructionMajorItemsFromPrevious(
  constructionId: string,
  sourceDesignChangeId: number | null | undefined,
  targetDesignChangeId: number,
  options?: { overwrite?: boolean }
): Promise<{ copiedCount: number }> {
  const params = new URLSearchParams({
    constructionId,
    targetDesignChangeId: String(targetDesignChangeId)
  });
  if (sourceDesignChangeId !== undefined && sourceDesignChangeId !== null) {
    params.append('sourceDesignChangeId', String(sourceDesignChangeId));
  }
  if (options?.overwrite === true) {
    params.append('overwrite', 'true');
  }
  const response = await http.post<{ copiedCount: number }>(
    `/management/construction-major-items/copy-from-previous?${params}`
  );
  return response as unknown as { copiedCount: number };
}

/**
 * 更新施工大項
 */
export async function updateConstructionMajorItem(constructionId: string, id: string, data: Partial<ConstructionMajorItemRequest>): Promise<ConstructionMajorItem> {
    const response = await http.put(`/management/construction-major-items/${id}?constructionId=${encodeURIComponent(constructionId)}`, data);
    return response as unknown as ConstructionMajorItem;
}

export interface ConstructionMajorItemStandardResponse {
    id: number;
    stepOrder: number;
    itemName?: string;
    /** 施工階段（施工前階段、施工中階段、施工後階段等），work_process */
    workProcess?: string;
    /** 施工流程（施工項目），對應詳表「施工流程明細」欄；每群組下至多四項對齊 B-1 詳表列 */
    workProcessDetail?: string;
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
export async function deleteConstructionMajorItem(constructionId: string, id: string): Promise<void> {
    await http.delete(`/management/construction-major-items/${id}?constructionId=${encodeURIComponent(constructionId)}`);
}

/**
 * 1) 查詢某施工大項的施工抽查標準明細
 */
export async function getConstructionMajorItemStandards(constructionId: string, id: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.get(`/management/construction-major-items/${id}/standards?constructionId=${encodeURIComponent(constructionId)}`);
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

/** 與 B-1 匯出 supervision_Plan_A-Page-Image.docx 內 {{aFlowImage}} 相同之施工流程圖 PNG */
export async function fetchConstructionMajorItemB1FlowChartPng(
    constructionId: string,
    majorItemId: string
): Promise<Blob> {
    const buf = await http.get<ArrayBuffer>(
        `/management/construction-major-items/${majorItemId}/b1-flow-chart.png?constructionId=${encodeURIComponent(constructionId)}`,
        { responseType: 'arraybuffer' }
    )
    return new Blob([buf as unknown as ArrayBuffer], { type: 'image/png' })
}

/**
 * 2) 覆蓋式複製（從 PCCES 工項複製標準到施工大項）
 */
export async function copyStandardFromPcces(constructionId: string, id: string, sourcePccesCode: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.post(`/management/construction-major-items/${id}/standards/copy?constructionId=${encodeURIComponent(constructionId)}`, { sourcePccesCode });
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

/**
 * 2-3) AI 同步生成並覆寫「施工 + 安全衛生」抽查標準（共用同一組施工階段/流程）
 */
export async function aiGenerateOverwriteConstructionMajorItemAllStandards(
    constructionId: string,
    majorItemId: string
): Promise<{
    constructionStandards: ConstructionMajorItemStandardResponse[]
    safetyStandards: ConstructionMajorItemStandardResponse[]
}> {
    const response = await http.post(
        `/management/construction-major-items/${majorItemId}/standards/ai-generate-overwrite-all?constructionId=${encodeURIComponent(constructionId)}`,
        undefined,
        {
            timeout: 300000, // 5 分鐘：AI 同步生成可能需 1~3 分鐘以上
        }
    )
    const data = response as unknown as {
        constructionStandards?: ConstructionMajorItemStandardResponse[]
        safetyStandards?: ConstructionMajorItemStandardResponse[]
    }
    return {
        constructionStandards: data?.constructionStandards ?? [],
        safetyStandards: data?.safetyStandards ?? [],
    }
}

/** 手動新增一筆施工抽查標準明細（body 可省略） */
export async function createConstructionMajorItemStandard(
    constructionId: string,
    majorItemId: string,
    data?: Partial<ConstructionMajorItemStandardResponse>
): Promise<ConstructionMajorItemStandardResponse> {
    const response = await http.post<unknown>(
        `/management/construction-major-items/${majorItemId}/standards?constructionId=${encodeURIComponent(constructionId)}`,
        data ?? {}
    );
    return response as unknown as ConstructionMajorItemStandardResponse;
}

/** 手動新增一筆安全衛生抽查標準明細（body 可省略） */
export async function createConstructionMajorItemSafetyStandard(
    constructionId: string,
    majorItemId: string,
    data?: Partial<ConstructionMajorItemStandardResponse>
): Promise<ConstructionMajorItemStandardResponse> {
    const response = await http.post<unknown>(
        `/management/construction-major-items/${majorItemId}/safety-standards?constructionId=${encodeURIComponent(constructionId)}`,
        data ?? {}
    );
    return response as unknown as ConstructionMajorItemStandardResponse;
}

/**
 * 3) 編輯單筆施工抽查標準明細
 */
export async function updateConstructionMajorItemStandard(constructionId: string, id: string, standardId: number, data: Partial<ConstructionMajorItemStandardResponse>): Promise<ConstructionMajorItemStandardResponse> {
    const response = await http.patch(`/management/construction-major-items/${id}/standards/${standardId}?constructionId=${encodeURIComponent(constructionId)}`, data);
    return response as unknown as ConstructionMajorItemStandardResponse;
}

/** 安全衛生抽查標準明細（監造施工大項） */
export async function getConstructionMajorItemSafetyStandards(constructionId: string, id: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.get(`/management/construction-major-items/${id}/safety-standards?constructionId=${encodeURIComponent(constructionId)}`);
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

export async function copySafetyStandardFromPcces(constructionId: string, id: string, sourcePccesCode: string): Promise<ConstructionMajorItemStandardResponse[]> {
    const response = await http.post(`/management/construction-major-items/${id}/safety-standards/copy?constructionId=${encodeURIComponent(constructionId)}`, { sourcePccesCode });
    return response as unknown as ConstructionMajorItemStandardResponse[];
}

export async function updateConstructionMajorItemSafetyStandard(constructionId: string, id: string, standardId: number, data: Partial<ConstructionMajorItemStandardResponse>): Promise<ConstructionMajorItemStandardResponse> {
    const response = await http.patch(`/management/construction-major-items/${id}/safety-standards/${standardId}?constructionId=${encodeURIComponent(constructionId)}`, data);
    return response as unknown as ConstructionMajorItemStandardResponse;
}

/** 刪除單筆施工抽查標準明細（一列檢查點） */
export async function deleteConstructionMajorItemStandard(
    constructionId: string,
    majorItemId: string,
    standardId: number
): Promise<void> {
    await http.delete(
        `/management/construction-major-items/${majorItemId}/standards/${standardId}?constructionId=${encodeURIComponent(constructionId)}`
    );
}

/** 刪除該施工階段區塊內全部明細 */
export async function deleteConstructionMajorItemStandardsByPhase(
    constructionId: string,
    majorItemId: string,
    phaseKey: string
): Promise<void> {
    await http.delete(
        `/management/construction-major-items/${majorItemId}/standards/by-phase?constructionId=${encodeURIComponent(constructionId)}&phaseKey=${encodeURIComponent(phaseKey)}`
    );
}

/** 刪除該施工階段、該管理項目下全部明細 */
export async function deleteConstructionMajorItemStandardsByManageProject(
    constructionId: string,
    majorItemId: string,
    phaseKey: string,
    manageProject: string,
    /** 可選：限縮 work_process_detail（未分類請傳空字串） */
    workProcessDetail?: string | null
): Promise<void> {
    let qs = `constructionId=${encodeURIComponent(constructionId)}&phaseKey=${encodeURIComponent(phaseKey)}&manageProject=${encodeURIComponent(manageProject)}`;
    if (workProcessDetail !== undefined && workProcessDetail !== null) {
        qs += `&workProcessDetail=${encodeURIComponent(workProcessDetail)}`;
    }
    await http.delete(
        `/management/construction-major-items/${majorItemId}/standards/by-manage-project?${qs}`
    );
}

export async function deleteConstructionMajorItemSafetyStandard(
    constructionId: string,
    majorItemId: string,
    standardId: number
): Promise<void> {
    await http.delete(
        `/management/construction-major-items/${majorItemId}/safety-standards/${standardId}?constructionId=${encodeURIComponent(constructionId)}`
    );
}

export async function deleteConstructionMajorItemSafetyStandardsByPhase(
    constructionId: string,
    majorItemId: string,
    phaseKey: string
): Promise<void> {
    await http.delete(
        `/management/construction-major-items/${majorItemId}/safety-standards/by-phase?constructionId=${encodeURIComponent(constructionId)}&phaseKey=${encodeURIComponent(phaseKey)}`
    );
}

export async function deleteConstructionMajorItemSafetyStandardsByManageProject(
    constructionId: string,
    majorItemId: string,
    phaseKey: string,
    manageProject: string,
    workProcessDetail?: string | null
): Promise<void> {
    let qs = `constructionId=${encodeURIComponent(constructionId)}&phaseKey=${encodeURIComponent(phaseKey)}&manageProject=${encodeURIComponent(manageProject)}`;
    if (workProcessDetail !== undefined && workProcessDetail !== null) {
        qs += `&workProcessDetail=${encodeURIComponent(workProcessDetail)}`;
    }
    await http.delete(
        `/management/construction-major-items/${majorItemId}/safety-standards/by-manage-project?${qs}`
    );
}

// ── 新增 / 排序：標單明細 ────────────────────────────────────────────────────

export interface CreatePccesCodeRequest {
  pccesCode?: string | null;
  name: string;
  unitType: string;
  quantity?: number;
  price?: number;
  amount?: number;
  type?: string | null;
  parentId?: number | null;
  insertAfterId?: number | null;
}

export async function createPccesCodeRow(
  constructionId: string,
  designChangeId: number | null,
  body: CreatePccesCodeRequest
): Promise<ConstructionPccesCode> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId != null) params.append('designChangeId', String(designChangeId));
  const response = await http.post(`/management/generate/pccesCodes?${params}`, body);
  return (response as any).data as ConstructionPccesCode;
}

export async function movePccesCodeRow(
  constructionId: string,
  id: number,
  direction: 'up' | 'down'
): Promise<void> {
  await http.patch(
    `/management/generate/pccesCodes/${id}/move?constructionId=${encodeURIComponent(constructionId)}&direction=${direction}`
  );
}

// ── 新增 / 排序：單價分析 ────────────────────────────────────────────────────

export interface CreatePccesCostBreakdownRequest {
  name: string;
  itemCode?: string | null;
  unitType: string;
  quantity?: number;
  price?: number;
  amount?: number;
  type?: string | null;
  refItemNo?: string | null;
  parentId?: number | null;
  insertAfterId?: number | null;
}

export async function createPccesCostBreakdownRow(
  constructionId: string,
  designChangeId: number | null,
  body: CreatePccesCostBreakdownRequest
): Promise<ConstructionPccesCostBreakdown> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId != null) params.append('designChangeId', String(designChangeId));
  const response = await http.post(`/management/generate/pccesCostBreakdown?${params}`, body);
  return (response as any).data as ConstructionPccesCostBreakdown;
}

export async function movePccesCostBreakdownRow(
  constructionId: string,
  id: number,
  direction: 'up' | 'down'
): Promise<void> {
  await http.patch(
    `/management/generate/pccesCostBreakdown/${id}/move?constructionId=${encodeURIComponent(constructionId)}&direction=${direction}`
  );
}

export async function deletePccesCostBreakdownRow(
  constructionId: string,
  id: number
): Promise<void> {
  await http.delete(
    `/management/generate/pccesCostBreakdown/${id}?constructionId=${encodeURIComponent(constructionId)}`
  );
}

// ── 新增 / 排序 / 編輯 / 刪除：資源統計 ────────────────────────────────────

export interface CreatePccesResourceRequest {
  itemCode?: string | null;
  name: string;
  unitType: string;
  quantity?: number;
  price?: number;
  amount?: number;
  insertAfterId?: number | null;
}

export interface UpdatePccesResourceRequest {
  itemCode?: string | null;
  name: string;
  unitType: string;
  quantity: number;
  price: number;
  amount: number;
}

export async function createPccesResourceRow(
  constructionId: string,
  designChangeId: number | null,
  body: CreatePccesResourceRequest
): Promise<ConstructionPccesResource> {
  const params = new URLSearchParams({ constructionId });
  if (designChangeId != null) params.append('designChangeId', String(designChangeId));
  const response = await http.post(`/management/generate/pccesResources?${params}`, body);
  return (response as any).data as ConstructionPccesResource;
}

export async function updatePccesResourceRow(
  constructionId: string,
  id: number,
  body: UpdatePccesResourceRequest
): Promise<void> {
  await http.patch(
    `/management/generate/pccesResources/${id}?constructionId=${encodeURIComponent(constructionId)}`,
    body
  );
}

export async function deletePccesResourceRow(
  constructionId: string,
  id: number
): Promise<void> {
  await http.delete(
    `/management/generate/pccesResources/${id}?constructionId=${encodeURIComponent(constructionId)}`
  );
}

export async function movePccesResourceRow(
  constructionId: string,
  id: number,
  direction: 'up' | 'down'
): Promise<void> {
  await http.patch(
    `/management/generate/pccesResources/${id}/move?constructionId=${encodeURIComponent(constructionId)}&direction=${direction}`
  );
}
