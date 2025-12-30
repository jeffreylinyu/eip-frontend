import http from './http';

export interface PccesMaterialStandard {
  id?: number;
  pccesCode: string;
  itemNo?: string;
  itemName: string;
  dataSource?: string;
  checkStandard?: string;
  checkMethod?: string;
  applyFirstLevel?: string;
  feqCheckFirstLevel?: string;
  checkRatioSecondLevel?: string;
  failureHandle?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface SearchMaterialStandardParams {
  keyword?: string;
  page?: number;
  size?: number;
}

export interface MaterialStandardResponse {
  content: PccesMaterialStandard[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

class MaterialStandardService {
  /**
   * 查詢材料抽查標準列表
   */
  async searchStandards(params: SearchMaterialStandardParams = {}): Promise<MaterialStandardResponse> {
    return await http.get('/management/standard/material', { params });
  }

  /**
   * 建立新的材料抽查標準 (預留)
   */
  async createStandard(data: Partial<PccesMaterialStandard>): Promise<PccesMaterialStandard> {
    return await http.post('/management/standard/material', data);
  }

  /**
   * 更新材料抽查標準 (預留)
   */
  async updateStandard(id: number, data: Partial<PccesMaterialStandard>): Promise<PccesMaterialStandard> {
    return await http.put(`/management/standard/material/${id}`, data);
  }

  /**
   * 刪除材料抽查標準 (軟刪除) (預留)
   */
  async deleteStandard(id: number): Promise<boolean> {
    return await http.delete(`/management/standard/material/${id}`);
  }

  /**
   * 透過檔案上傳匯入材料標準 JSON
   * @param files JSON 檔案列表
   * @param dataSource 資料來源標識
   */
  async importFiles(files: File[], dataSource: string): Promise<number> {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    formData.append('dataSource', dataSource);

    const response = await http.post('/management/standard/import-files', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }

}

export const materialStandardApi = new MaterialStandardService();
