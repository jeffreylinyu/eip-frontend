import http from './http';

// 詳細設定資料結構
export interface MaterialDetail {
  id: number | null;
  isSamplingTest: boolean;
  isFactoryInspection: boolean;
  hasSubcontractorData: boolean;
  hasCatalog: boolean;
  hasTestReport: boolean;
  hasSample: boolean;
  hasOther: boolean;
  plannedSubmissionDate: string | null;
  plannedArrivalDate: string | null;
  updatedAt?: string | null;
}

export interface MaterialItem {
  id: number;
  itemNo: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  pccesCode: string | null;
  constructionId: string;
  designChangeId: number | null;  // null = 原契約
  detail: MaterialDetail;
  /** 同 pccesCode 之品質抽驗管控表明細筆數（後端列表 API 提供；0 表示尚未建立） */
  qualityControlStandardCount?: number;
}

export interface UpdateMaterialDetailRequest {
  pccesCode: string;
  constructionId: string;
  designChangeId: number | null;
  detail: Partial<MaterialDetail>;
}

export interface UpdateMaterialItemNoRequest {
  pccesCode: string;
  constructionId: string;
  designChangeId: number | null;
  itemNo: string | null;
}

export const tenderMaterialApi = {
  async getMaterialList(constructionId: string | number, designChangeId?: number | null): Promise<MaterialItem[]> {
    const params: Record<string, string | number> = { constructionId: String(constructionId) };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.get('/management/construction/material-detail/list', { params });
    return response as unknown as MaterialItem[];
  },

  async updateMaterialDetail(request: UpdateMaterialDetailRequest): Promise<MaterialDetail> {
    const response = await http.put('/management/construction/material-detail', request);
    return response as unknown as MaterialDetail;
  },

  async updateMaterialItemNo(request: UpdateMaterialItemNoRequest): Promise<{ updated: boolean }> {
    const response = await http.put('/management/construction/material-detail/item-no', request);
    return response as unknown as { updated: boolean };
  },

  /** 從前一個版本複製材料詳細設定與抽查標準到目標版本 */
  async copyMaterialDetailFromPrevious(
    constructionId: string,
    sourceDesignChangeId: number | null | undefined,
    targetDesignChangeId: number
  ): Promise<{ count: number }> {
    const params: Record<string, string> = { constructionId, targetDesignChangeId: String(targetDesignChangeId) };
    if (sourceDesignChangeId !== undefined && sourceDesignChangeId !== null) {
      params.sourceDesignChangeId = String(sourceDesignChangeId);
    }
    const res = await http.post('/management/construction/material-detail/copy-from-previous', null, { params });
    const data = (res as { data?: { count?: number }; count?: number })?.data ?? res as { count?: number };
    return { count: data.count ?? 0 };
  },

  async getMaterialStandards(pccesCode: string, constructionId: string, designChangeId?: number | null): Promise<ConstructionMaterialStandardResponse[]> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.get('/management/construction/material-detail/standards', { params });
    return response as unknown as ConstructionMaterialStandardResponse[];
  },

  async copyMaterialStandards(pccesCode: string, constructionId: string, designChangeId: number | null, sourcePccesCode: string): Promise<ConstructionMaterialStandardResponse[]> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.post('/management/construction/material-detail/standards/copy', { sourcePccesCode }, { params });
    return response as unknown as ConstructionMaterialStandardResponse[];
  },

  /** 依工程與單價分析材料脈絡 工程案資料建構產出並覆寫品質抽驗管控表（全刪全建）；不讀 PCCES 材料主檔 */
  async aiGenerateOverwriteMaterialStandards(
    pccesCode: string,
    constructionId: string,
    designChangeId: number | null
  ): Promise<ConstructionMaterialStandardResponse[]> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.post(
      '/management/construction/material-detail/standards/ai-generate-overwrite',
      null,
      { params, timeout: 300000 }
    ) as { standards?: ConstructionMaterialStandardResponse[] };
    return response?.standards ?? [];
  },

  /** 新增一筆材料抽查標準明細（itemNo 後端自動續號；body 可省略） */
  async createMaterialStandard(
    pccesCode: string,
    constructionId: string,
    designChangeId: number | null
  ): Promise<ConstructionMaterialStandardResponse> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.post('/management/construction/material-detail/standards', null, { params });
    return response as unknown as ConstructionMaterialStandardResponse;
  },

  /** 刪除單筆材料抽查標準明細 */
  async deleteMaterialStandard(
    standardId: number,
    pccesCode: string,
    constructionId: string,
    designChangeId: number | null
  ): Promise<{ deleted: boolean }> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.delete(`/management/construction/material-detail/standards/${standardId}`, { params });
    return response as unknown as { deleted: boolean };
  },

  async updateMaterialStandard(
    standardId: number,
    pccesCode: string,
    constructionId: string,
    designChangeId: number | null,
    request: ConstructionMaterialStandardUpdateRequest
  ): Promise<ConstructionMaterialStandardResponse> {
    const params: Record<string, string | number> = { pccesCode, constructionId };
    if (designChangeId !== undefined && designChangeId !== null) params.designChangeId = designChangeId;
    const response = await http.put(`/management/construction/material-detail/standards/${standardId}`, request, { params });
    return response as unknown as ConstructionMaterialStandardResponse;
  }
};

// --- Interfaces for Material Standard ---

export interface ConstructionMaterialStandardResponse {
    id: number | null;
    itemNo?: number;
    itemName?: string;
    checkStandard?: string;
    checkMethod?: string;
    applyFirstLevel?: string;
    feqCheckFirstLevel?: string;
    checkRatioSecondLevel?: string;
    failureHandle?: string;
    isActive: boolean;
}

export interface ConstructionMaterialStandardCopyRequest {
    sourcePccesCode: string;
}

export interface ConstructionMaterialStandardUpdateRequest {
    itemNo?: number;
    itemName?: string;
    checkStandard?: string;
    checkMethod?: string;
    applyFirstLevel?: string;
    feqCheckFirstLevel?: string;
    checkRatioSecondLevel?: string;
    failureHandle?: string;
    isActive?: boolean;
}
