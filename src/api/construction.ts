import http from './http';

// 工程項目數據接口
export interface Construction {
  userId?: string;
  authUserId?: string[];
  constructionId: string;
  constructionName: string;
  constructionLocation: string;
  signDate?: string;
  constructionStartDate: string;
  constructionEndDate: string;
  constructionBudget: number;
  // 新增缺少的欄位
  contractId?: string;
  currentContractAmount?: number;
  leadOrganization?: string;
  constructionLevel?: string;
  constructionConfirmDate?: string;
  constructionProjectId?: string;
  payMethod?: string;
  insuranceId?: string;
  insuranceCompanyName?: string;
  insuranceStartDate?: string;
  insuranceEndDate?: string;
  insuranceType?: string;
  segmentedAcceptance?: boolean;
  partialAcceptance?: boolean;
  completionAcceptance?: boolean;
  budgetFrom?: string;
  prePayRatio?: string;
  retainedRatio?: string;
  constructionType?: string;
  signLevel?: SignLevel[];
  workDay?: number;
}

// 簽核層級接口
export interface SignLevel {
  level: number;
  title: string;
}

// 創建工程項目的數據接口
export interface CreateConstructionRequest {
  workspaceId: string;
  contractId: string;
  constructionName: string;
  constructionLocation: string;
  leadOrganization: string;
  constructionBudget: number;
  currentContractAmount: number;
  signDate: string;
  constructionStartDate: string;
  constructionEndDate: string;
  constructionConfirmDate: string;
  constructionProjectId: string;
  payMethod: string;
  insuranceId: string;
  insuranceCompanyName: string;
  insuranceStartDate: string;
  insuranceEndDate: string;
  insuranceType: string;
  segmentedAcceptance: boolean;
  partialAcceptance: boolean;
  completionAcceptance: boolean;
  prePayRatio: string;
  retainedRatio: string;
  constructionType: string;
  signLevel: SignLevel[];
  workDay: number;
}

// API 回應接口
export interface CreateConstructionResponse {
  constructionId: string;
  message: string;
}

// 工程項目表單數據到API請求的轉換函數
export const transformProjectFormToConstructionRequest = (
  projectFormData: any, 
  workspaceId: string
): CreateConstructionRequest => {
  // 格式化日期為ISO格式
  const formatDateToISO = (dateString: string, defaultTime: string = '09:00:00'): string => {
    if (!dateString) return '';
    // 如果已經是ISO格式，直接返回
    if (dateString.includes('T')) return dateString;
    // 否則添加時間部分
    return `${dateString}T${defaultTime}`;
  };

  return {
    workspaceId: workspaceId,
    contractId: projectFormData.contract_number || '',
    constructionName: projectFormData.project_name || '',
    constructionLocation: projectFormData.project_location || '',
    leadOrganization: projectFormData.host_agency || '',
    constructionBudget: parseFloat(projectFormData.project_amount) || 0,
    currentContractAmount: parseFloat(projectFormData.current_contract_amount) || parseFloat(projectFormData.project_amount) || 0,
    signDate: formatDateToISO(projectFormData.sign_date, '10:00:00'),
    constructionStartDate: formatDateToISO(projectFormData.start_date, '09:00:00'),
    constructionEndDate: formatDateToISO(projectFormData.completion_date, '17:00:00'),
    constructionConfirmDate: formatDateToISO(projectFormData.confirm_date || projectFormData.start_date, '10:30:00'),
    constructionProjectId: projectFormData.contract_number || '',
    payMethod: projectFormData.payment_method || '分期付款',
    insuranceId: projectFormData.insurance_policy_number || '',
    insuranceCompanyName: projectFormData.insurance_company || '',
    insuranceStartDate: formatDateToISO(projectFormData.insurance_start_date, '00:00:00'),
    insuranceEndDate: formatDateToISO(projectFormData.insurance_end_date, '00:00:00'),
    insuranceType: projectFormData.insurance_type || '',
    segmentedAcceptance: projectFormData.inspection_methods?.includes('分段驗收') || false,
    partialAcceptance: projectFormData.inspection_methods?.includes('部分驗收') || false,
    completionAcceptance: projectFormData.inspection_methods?.includes('竣工驗收') || true,
    prePayRatio: projectFormData.advance_payment_ratio || '15',
    retainedRatio: projectFormData.retention_ratio || '5',
    constructionType: projectFormData.project_category || '',
    signLevel: projectFormData.signLevel || [], // 包含簽核層級資料
    workDay: parseInt(projectFormData.construction_period) || 0 // 工期天數
  };
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
 * @returns Promise<CreateConstructionResponse>
 */
export const createConstruction = async (constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
  try {
    const data = await http.post('/management/construction/create', constructionData);
    return data as unknown as CreateConstructionResponse;
  } catch (error) {
    console.error('❌ 創建工程項目失敗:', error);
    throw error;
  }
};

/**
 * 根據工作空間 ID 獲取工程項目
 * @param workspaceId 工作空間 ID
 * @returns Promise<Construction[]>
 */
export const getConstructionsByWorkspace = async (workspaceId: string): Promise<Construction[]> => {
  try {
    const data = await http.get('/management/construction/getAll', {
      params: { workspaceId }
    });
    return data as unknown as Construction[];
  } catch (error) {
    console.error('❌ 獲取工作空間工程項目失敗:', error);
    throw error;
  }
};

/**
 * 更新工程項目
 * @param constructionId 工程項目 ID
 * @param constructionData 更新的項目數據
 * @returns Promise<CreateConstructionResponse>
 */
export const updateConstruction = async (constructionId: string, constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
  try {
    const data = await http.patch('/management/construction/update', {
      constructionId,
      ...constructionData
    });
    return data as unknown as CreateConstructionResponse;
  } catch (error) {
    console.error('❌ 更新工程項目失敗:', error);
    throw error;
  }
};

export default {
  getAllConstructions,
  createConstruction,
  updateConstruction,
  transformProjectFormToConstructionRequest,
  getConstructionsByWorkspace
};
