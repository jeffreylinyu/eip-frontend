import http from './http';

// 工程項目數據接口
export interface Construction {
  userId: string;
  authUserId: string[];
  constructionId: string;
  constructionName: string;
  constructionLocation: string;
  constructionStartDate: string;
  constructionEndDate: string;
  constructionBudget: number;
}

// 創建項目的數據接口
export interface CreateConstructionData {
  username: string;
  constructionName: string;
  constructionLocation: string;
  contractId: string;
  supervisoryName: string;
  constructionBudget: string;
  leadOrganization: string;
  constructor: string;
  constructionLevel: string;
  projectStaff: string;
  constructionStartDate: string;
  constructionEndDate: string;
  supervisionManufacturer: string;
}

/**
 * 獲取所有工程項目
 * @returns Promise<Construction[]>
 */
export const getAllConstructions = async (): Promise<Construction[]> => {
  try {
    const data = await http.get('/management/construction/getAll');
    return data as unknown as Construction[];
  } catch (error) {
    console.error('獲取工程項目失敗:', error);
    throw error;
  }
};

/**
 * 創建工程項目
 * @param constructionData 項目數據
 * @returns Promise<any>
 */
export const createConstruction = async (constructionData: CreateConstructionData): Promise<any> => {
  try {
    const data = await http.post('/management/construction/create', constructionData);
    return data;
  } catch (error) {
    console.error('創建工程項目失敗:', error);
    throw error;
  }
};

export default {
  getAllConstructions,
  createConstruction
};
