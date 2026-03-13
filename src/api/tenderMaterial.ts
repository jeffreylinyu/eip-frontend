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
}

export interface UpdateMaterialDetailRequest {
  pccesCode: string;
  constructionId: string;
  designChangeId: number | null;
  detail: Partial<MaterialDetail>;
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
