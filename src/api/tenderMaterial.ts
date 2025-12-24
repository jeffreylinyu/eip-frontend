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
  updatedAt?: string | null;
}

export interface MaterialItem {
  id: number;              // 工項 ID (原 constructionPccesCodeId)
  itemNo: string | null;   // A欄 (項次)
  name: string;            // C欄 (項目名稱/材料名稱)
  quantity: number;        // E欄 (數量)
  unit: string | null;     // F欄 (單位)
  pccesCode: string | null;// D欄 (編碼)
  contractVersionId?: string | number; // Optional: 方便前端使用
  detail: MaterialDetail;  // 詳細設定 (原 materialDetail)
}

// Request Body Wrapper
export interface UpdateMaterialDetailRequest {
  pccesCode: string;
  contractVersionId: string | number;
  detail: Partial<MaterialDetail>;
}

export const tenderMaterialApi = {
  // 取得材料列表
  async getMaterialList(constructionId: string | number, versionId: string | number): Promise<MaterialItem[]> {
    const response = await http.get('/management/construction/material-detail/list', {
      params: { constructionId, versionId }
    });
    return response as unknown as MaterialItem[];
  },

  // 更新詳細設定 (Upsert)
  // 改為傳入 pccesCode, contractVersionId, detail
  async updateMaterialDetail(request: UpdateMaterialDetailRequest): Promise<MaterialDetail> {
    const response = await http.put('/management/construction/material-detail', request);
    return response as unknown as MaterialDetail;
  }
};
