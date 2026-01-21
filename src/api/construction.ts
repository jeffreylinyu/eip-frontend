import http from './http';
import { useAuthStore } from '@/stores/auth';

// 工程案數據接口
export interface Construction {
  userId?: string;
  authUserId?: string[];
  workspaceId?: string; // 新增：關聯的工作空間 ID
  constructionId: string;
  constructionName: string;
  constructionLocation: string;
  signDate?: string;
  constructionStartDate: string;
  constructionEndDate: string;
  constructionBudget: number;
  // 新增缺少的欄位
  contractId?: string;
  constructionScaleOverview?: string | null; // 新增：工程規模概述
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
  prePayRatio?: number;
  retainedRatio?: number;
  constructionType?: string;
  signLevel?: SignLevel[];
  workDay?: number;
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS'; // 工期計算模式
  totalExtensionDays?: number; // 累計展延天數（新增）
  supervisoryCompany?: string; // 舊的監造公司欄位（手動輸入）
  supervisoryCompanyName?: string | null; // 監造公司名稱（從工作空間設定自動取得）
  contractorCompanyName?: string | null; // 營造公司名稱（從工作空間設定自動取得）
  designCompany?: string | null; // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  constructor?: string; // 承攬廠商（舊欄位）
  fixedFields?: Record<string, boolean>; // 新增：鎖定欄位清單 (key: fieldName, value: isLocked)
  version?: number; // 新增：樂觀鎖版本號
  permission?: 'ADMIN' | 'MEMBER' | 'VIEWER'; // 新增：工程案權限 (覆蓋 user_workspace role)
  // role?: string; // 注意：API 回傳的 role 現在代表職稱 (Job Title)
}

// 簽核層級接口
export interface SignLevel {
  level: number;
  title: string;
}

// 創建工程案的數據接口
export interface CreateConstructionRequest {
  workspaceId: string;
  companyId: string; // 新增：公司 ID（必填，通常為營造廠ID 或 當前創建者所屬公司ID）
  contractorCompanyId?: string; // 新增：指定營造廠
  supervisionCompanyId?: string; // 新增：指定監造單位
  designCompany?: string; // 新增：設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  contractId: string;
  constructionName: string;
  constructionLocation: string;
  constructionScaleOverview?: string | null; // 新增：工程規模概述
  leadOrganization: string;
  constructionBudget: number;
  currentContractAmount: number;
  signDate: string;
  constructionStartDate: string;
  // constructionEndDate 已移除，由後端自動計算
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
  prePayRatio: number;
  retainedRatio: number;
  constructionType: string;
  signLevel: SignLevel[];
  workDay: number;
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS'; // 工期計算模式（可選，預設為 WORKING_DAYS）
}

// API 回應接口
export interface CreateConstructionResponse {
  constructionId: string;
  message: string;
  // 後端可能直接回傳完整的工程案資料（與 Construction 介面相同）
  // 如果後端回傳的是完整的 Construction 物件，可以直接使用
}

// 工程案表單數據到API請求的轉換函數
export const transformProjectFormToConstructionRequest = (
  projectFormData: any, 
  workspaceId: string,
  companyId?: string // 新增：可選的公司 ID 參數
): CreateConstructionRequest => {
  // 格式化日期為ISO格式
  const formatDateToISO = (dateString: string, defaultTime: string = '09:00:00'): string => {
    if (!dateString) return '';
    // 如果已經是ISO格式，直接返回
    if (dateString.includes('T')) return dateString;
    // 否則添加時間部分
    return `${dateString}T${defaultTime}`;
  };

  if (!companyId) {
    throw new Error('companyId 為必填欄位，請確保已選擇工作空間且工作空間包含公司資訊');
  }

  return {
    workspaceId: workspaceId,
    companyId: companyId, // 新增：公司 ID
    contractId: projectFormData.contract_number || '',
    constructionName: projectFormData.project_name || '',
    constructionLocation: projectFormData.project_location || '',
    constructionScaleOverview: projectFormData.project_scale_overview || null, // 新增
    leadOrganization: projectFormData.host_agency || '',
    constructionBudget: parseFloat(projectFormData.project_amount) || 0,
    currentContractAmount: parseFloat(projectFormData.current_contract_amount) || parseFloat(projectFormData.project_amount) || 0,
    signDate: formatDateToISO(projectFormData.sign_date, '10:00:00'),
    constructionStartDate: formatDateToISO(projectFormData.start_date, '09:00:00'),
    // constructionEndDate 已移除，由後端根據開工日期和工作天數自動計算
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
    prePayRatio: parseFloat(projectFormData.advance_payment_ratio) || 30.0,
    retainedRatio: parseFloat(projectFormData.retention_ratio) || 5.0,
    constructionType: projectFormData.project_category || '',
    // 確保 signLevel 是正確的陣列格式（jsonb 類型）
    signLevel: (() => {
      const signLevel = projectFormData.signLevel;
      if (!signLevel) return [];
      
      // 如果是字串，嘗試解析為 JSON
      if (typeof signLevel === 'string') {
        try {
          const parsed = JSON.parse(signLevel);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      }
      
      // 如果是陣列，確保每個元素都有正確的結構
      if (Array.isArray(signLevel)) {
        return signLevel.map((item: any) => ({
          level: typeof item.level === 'number' ? item.level : parseInt(item.level) || 0,
          title: typeof item.title === 'string' ? item.title : String(item.title || '')
        })).filter((item: any) => item.level > 0 && item.title); // 過濾無效項目
      }
      
      return [];
    })(),
    workDay: parseInt(projectFormData.construction_period) || 0, // 工期天數
    durationType: projectFormData.duration_type || 'WORKING_DAYS', // 工期計算模式（預設為工作天）
    designCompany: projectFormData.design_company || null // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  };
}

/**
 * 獲取所有工程案
 * @returns Promise<Construction[]>
 */
/**
 * 獲取所有工程案 (SUPER_ADMIN 專用，或用於取得全部列表)
 * @returns Promise<Construction[]>
 */
/**
 * 獲取所有工程案
 * @returns Promise<Construction[]>
 */
export const getAllConstructions = async (): Promise<Construction[]> => {
  try {
    const data = await http.get('/management/construction/getAll');
    return data as unknown as Construction[];
  } catch (error) {
    console.error('獲取所有工程案失敗:', error);
    throw error;
  }
};

/**
 * [Admin] 獲取系統所有工程案
 * @returns Promise<Construction[]>
 */
export const adminGetAllConstructions = async (): Promise<Construction[]> => {
  try {
    const data = await http.get('/management/admin/construction/all');
    return data as unknown as Construction[];
  } catch (error) {
    console.error('Admin獲取所有工程案失敗:', error);
    throw error;
  }
};

/**
 * 根據公司獲取工程案列表
 * @param companyId 公司 ID
 * @returns Promise<Construction[]>
 */
export const getConstructionsByCompany = async (companyId: string): Promise<Construction[]> => {
  try {
    const url = `/management/construction/list?companyId=${encodeURIComponent(companyId)}`;
    const data = await http.get(url);
    return data as unknown as Construction[];
  } catch (error) {
    console.error('獲取公司工程案失敗:', error);
    throw error;
  }
};

/**
 * 創建工程案
 * @param constructionData 項目數據
 * @returns Promise<CreateConstructionResponse>
 */
export const createConstruction = async (constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
  try {
    const data = await http.post('/management/construction/create', constructionData);
    return data as unknown as CreateConstructionResponse;
  } catch (error) {
    console.error('❌ 創建工程案失敗:', error);
    throw error;
  }
};

/**
 * [Admin] 系統管理員創建工程案
 */
export const adminCreateConstruction = async (constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
   try {
    const data = await http.post('/management/admin/construction/create', constructionData);
    return data as unknown as CreateConstructionResponse;
  } catch (error) {
    console.error('❌ Admin創建工程案失敗:', error);
    throw error;
  }
}



/**
 * 根據工作空間 ID 獲取工程案
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
    console.error('❌ 獲取工作空間工程案失敗:', error);
    throw error;
  }
};

/**
 * 取得單一工程案詳情
 * @param constructionId 工程編號
 * @param workspaceId (可選) 工作空間編號
 * @returns Promise<Construction>
 */
export const getConstructionDetail = async (constructionId: string, workspaceId?: string): Promise<Construction> => {
  try {
    const params: any = { constructionId };
    if (workspaceId) {
      params.workspaceId = workspaceId;
    }
    
    // 注意：根據 API 文件，回傳格式是 { code, message, data: Construction }
    // 如果 http.get 已經處理了 response.data，那這裡回傳的可能直接是 payload
    // 假設 http client 已經處理過外層結構，直接回傳 data
    const data = await http.get('/management/construction/get', { params });
    return data as unknown as Construction;
  } catch (error) {
    console.error('❌ 獲取工程案詳情失敗:', error);
    throw error;
  }
};

/**
 * 更新工程案
 * @param constructionId 工程案 ID
 * @param constructionData 更新的項目數據
 * @returns Promise<CreateConstructionResponse | Construction> 
 *   後端可能回傳 CreateConstructionResponse 或完整的 Construction 物件
 */
export const updateConstruction = async (
  constructionId: string, 
  constructionData: CreateConstructionRequest
): Promise<CreateConstructionResponse | Construction> => {
  try {
    const data = await http.patch('/management/construction/update', {
      constructionId,
      ...constructionData
    });
    // 後端可能直接回傳完整的 Construction 物件，或 CreateConstructionResponse
    return data as unknown as CreateConstructionResponse | Construction;
  } catch (error) {
    console.error('❌ 更新工程案失敗:', error);
    throw error;
  }
};

/**
 * 刪除工程案
 * @param constructionId 工程案 ID
 * @returns Promise<void>
 */
export const deleteConstruction = async (constructionId: string): Promise<void> => {
  try {
    await http.delete(`/management/construction/delete`, {
      params: { constructionId }
    });
  } catch (error) {
    console.error('❌ 刪除工程案失敗:', error);
    throw error;
  }
};

/**
 * [Admin] 系統管理員刪除工程案
 */
export const adminDeleteConstruction = async (constructionId: string): Promise<void> => {
  try {
    // 根據 API 文件，Admin 刪除使用 query param
    await http.delete(`/management/admin/construction/delete`, {
      params: { constructionId }
    });
  } catch (error) {
    console.error('❌ Admin刪除工程案失敗:', error);
    throw error;
  }
};

// 行事曆事件介面
export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  isHoliday: boolean; // true=假日, false=工作日
  title: string; // 節日名稱
  isCustom: boolean; // true=用戶自定義, false=演算法計算
}

/**
 * 獲取工程案的行事曆事件
 * @param constructionId 工程編號
 * @param startDate 開始日期，格式 YYYY-MM-DD
 * @param endDate 結束日期，格式 YYYY-MM-DD
 * @returns Promise<CalendarEvent[]>
 */
export const getCalendarEvents = async (
  constructionId: string,
  startDate: string,
  endDate: string
): Promise<CalendarEvent[]> => {
  try {
    const data = await http.get(
      `/management/constructions/${constructionId}/calendar/events`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );
    return data as unknown as CalendarEvent[];
  } catch (error) {
    console.error('獲取行事曆事件失敗:', error);
    throw error;
  }
};

// 創建/更新行事曆事件請求介面
export interface CreateOrUpdateCalendarEventRequest {
  date: string; // YYYY-MM-DD（必填）
  isHoliday: boolean; // true = 放假，false = 上班/補班日（必填）
  note?: string; // 備註說明（選填）
}

/**
 * 創建或更新工程案的行事曆事件
 * @param constructionId 工程編號
 * @param eventData 事件數據
 * @returns Promise<CalendarEvent>
 */
export const createOrUpdateCalendarEvent = async (
  constructionId: string,
  eventData: CreateOrUpdateCalendarEventRequest
): Promise<CalendarEvent> => {
  try {
    const data = await http.post(
      `/management/constructions/${constructionId}/calendar/events`,
      eventData
    );
    return data as unknown as CalendarEvent;
  } catch (error) {
    console.error('創建/更新行事曆事件失敗:', error);
    throw error;
  }
};

// 試算完工日期回應介面
export interface CalculateEndDateResponse {
  startDate: string;
  completionDate: string;
  durationDays: number;
}

/**
 * 試算完工日期
 * @param constructionId 工程編號（必填）
 * @param startDate 開工日期，格式 YYYY-MM-DD
 * @param durationDays 工作天數
 * @param durationType 工期計算模式（可選）
 *   - 如果提供：使用提供的值
 *   - 如果未提供：後端會使用工程的 durationType
 *   - 如果工程的 durationType 也沒有：後端使用預設值 WORKING_DAYS
 * @returns Promise<CalculateEndDateResponse> 包含開工日期、完工日期和工作天數
 * 
 * @example
 * // 方式 1：明確指定 durationType
 * calculateEndDate(id, '2025-09-01', 10, 'CALENDAR_DAYS')
 * 
 * // 方式 2：使用工程的預設 durationType（不傳遞 durationType）
 * calculateEndDate(id, '2025-09-01', 10)
 */
export const calculateEndDate = async (
  constructionId: string,
  startDate: string,
  durationDays: number,
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS'
): Promise<CalculateEndDateResponse> => {
  try {
    if (!constructionId) {
      throw new Error('工程編號為必填參數');
    }
    
    const url = `/management/constructions/${constructionId}/project/calculate-end-date`;
    const params: any = {
      startDate,
      durationDays
    };
    
    // 如果有提供 durationType，則加入參數
    // 如果未提供，後端會自動使用工程的 durationType 或預設值 WORKING_DAYS
    if (durationType) {
      params.durationType = durationType;
    }
    
    const data = await http.get(url, { params });
    return data as unknown as CalculateEndDateResponse;
  } catch (error) {
    console.error('試算完工日期失敗:', error);
    throw error;
  }
};

export default {
  getAllConstructions,
  createConstruction,
  updateConstruction,
  deleteConstruction,
  transformProjectFormToConstructionRequest,
  getConstructionsByWorkspace,
  getCalendarEvents,
  createOrUpdateCalendarEvent,
  calculateEndDate,
  getConstructionDetail
};
