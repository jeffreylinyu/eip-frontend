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
  currentContractAmount?: number;
  leadOrganization?: string;
  constructionLevel?: string;
  constructionConfirmDate?: string;
  constructionProjectId?: string;
  payMethod?: string;
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
  totalExtensionDays?: number; // 累計展延天數（已棄用，始終為 0）
  totalStopDays?: number; // 累計停工天數（SPECIFIC_DATES）
  supervisoryCompanyName?: string | null; // 監造公司名稱（從工作空間設定自動取得）
  contractorCompanyName?: string | null; // 營造公司名稱（從工作空間設定自動取得）
  designCompany?: string | null; // 設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  /** 承攬廠商（舊 JSON 欄位名為 constructor；請用 getLegacyContractorField 讀取） */
  constructor?: string;
  version?: number; // 新增：樂觀鎖版本號
  permission?: 'ADMIN' | 'MEMBER' | 'VIEWER'; // 新增：工程案權限 (覆蓋 user_workspace role)
  /** 工程規模概述（B-1 頁面維護，依版本） */
  constructionScaleOverview?: string | null;
  /** B-2 地理人文環境概述（監造端維護，依版本） */
  b2GeoHumanEnvironmentOverview?: string | null;
  /** B-2 工程地點及客觀環境 */
  b2LocationObjectiveEnvironment?: string | null;
  /** B-2 工程規模概述（與 B-1 欄位不同） */
  b2ConstructionScaleOverview?: string | null;
  /** B-2 工程預算（固定格式文字） */
  b2ConstructionBudgetText?: string | null;
  /** B-2 緊急應變組織圖（JSON） */
  b2EmergencyOrgChartJson?: string | null;
  /** B-2：確認已完成安全衛生設施勾選維護（依版本） */
  b2SafetyFacilityAcknowledged?: boolean;
  /** P-1 工程規模概述（營造端維護，依版本） */
  p1ConstructionScaleOverview?: string | null;
  /** P-2 工程規模概述（整體品質計劃；營造端維護，依版本） */
  p2QualityScaleOverview?: string | null;
  /** P-2 稽核計畫執行表（JSON；營造端維護，依版本） */
  p2AuditPlanJson?: string | null;
  /** P-2 工程相關人員附件（JSON；證書／勞保證明；營造端維護，依版本） */
  p2PersonnelAttachmentsJson?: string | null;
  /** P-3 工程規模概述（職業安全衛生管理計畫；營造端維護，依版本） */
  p3SafetyHealthScaleOverview?: string | null;
  /** P-3 施工平面圖（多張；JSON 陣列；營造端維護，依版本） */
  p3ConstructionLayoutImagesJson?: string | null;
  /** P-3 安全衛生組織架構圖結構化欄位（JSON；營造端維護，依版本） */
  p3SafetyHealthOrgChartJson?: string | null;
  /** P-3 安全衛生組織架構圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3SafetyHealthOrgChartImageObjectName?: string | null;
  /** P-3 職業安全衛生管理人員與證照（JSON object；學歷／相關證照／證書字號／主要經歷） */
  p3SafetyHealthPersonnelCredentialJson?: string | null;
  /** P-3 職業安全衛生管理人員證照圖片（多張；JSON 陣列；營造端維護，依版本） */
  p3SafetyHealthPersonnelCredentialImagesJson?: string | null;
  /** P-3 協力廠商組織關係圖結構化欄位（JSON；營造端維護，依版本） */
  p3SubcontractorOrgChartJson?: string | null;
  /** P-3 協力廠商組織關係圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3SubcontractorOrgChartImageObjectName?: string | null;
  /** P-3 緊急應變、保全聯絡體制圖結構化欄位（JSON；營造端維護，依版本） */
  p3EmergencyResponseContactJson?: string | null;
  /** P-3 緊急應變、保全聯絡體制圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3EmergencyResponseContactImageObjectName?: string | null;
  /** P-3 緊急聯絡方式表（JSON；類別／單位名稱／電話／備註） */
  p3EmergencyContactListJson?: string | null;
  /** P-3 防颱聯絡體制圖結構化欄位（JSON；營造端維護，依版本） */
  p3TyphoonPreventionContactJson?: string | null;
  /** P-3 防颱聯絡體制圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3TyphoonPreventionContactImageObjectName?: string | null;
  /** P-3 工程相關人員附件（JSON；證書／勞保證明；營造端維護，依版本） */
  p3PersonnelAttachmentsJson?: string | null;
  /** P-1 施工執行方向（營造端維護，依版本） */
  p1ConstructionExecutionDirection?: string | null;
  /** P-1 工地研判：地質概況 */
  p1GeologyOverview?: string | null;
  /** P-1 工地研判：工址現況調查 */
  p1SiteCurrentConditionSurvey?: string | null;
  /** P-1 工地研判：地下埋設物調查 */
  p1UndergroundUtilitiesSurvey?: string | null;
  /** P-1 工地研判：氣象及水文 */
  p1MeteorologyHydrology?: string | null;
  /** P-1 工地研判：鄰房調查 */
  p1NeighboringBuildingSurvey?: string | null;
  /** P-1 施工機械設備資源預定進場時間表（JSON 陣列） */
  p1MechanicalResourcesJson?: string | null;
  /** P-1 物料市場調查 */
  p1MaterialMarketSurvey?: string | null;
  /** P-1 進度異常管理門檻百分比（例：10） */
  p1ProgressDelayThresholdPercent?: number | null;
  /** P-1 施工前協調會議（自填） */
  p1PreConstructionCoordinationMeeting?: string | null;
  /** P-1 定期會議（自填） */
  p1RegularMeetingFrequency?: string | null;
  /** P-1 臨時用電設備 */
  p1TempPowerEquipment?: string | null;
  /** P-1 給排水設備 */
  p1TempWaterDrainageEquipment?: string | null;
  /** P-1 電訊設備 */
  p1TempTelecomEquipment?: string | null;
  /** P-1 臨時房舍 */
  p1TempHousing?: string | null;
  /** P-1 材料堆置場及加工區 */
  p1TempMaterialStorageProcessingArea?: string | null;
  /** P-1 修護場 */
  p1TempRepairYard?: string | null;
  /** P-1 拌合場 */
  p1TempMixingPlant?: string | null;
  /** P-1 材料實驗室 */
  p1TempMaterialLab?: string | null;
  /** P-1 施工道 */
  p1TempConstructionRoad?: string | null;
  /** P-1 施工測量（舊欄位，相容保留） */
  p1ConstructionSurvey?: string | null;
  /** P-1 測量儀器 */
  p1SurveyInstruments?: string | null;
  /** P-1 控制測量 */
  p1ControlSurvey?: string | null;
  /** P-1 控制測量精度要求 */
  p1ControlSurveyAccuracyRequirements?: string | null;
  /** P-1 施工測量 */
  p1ConstructionSurveyWork?: string | null;
  /** P-1 工地周圍現有灌排水系統（施工區域排水系統） */
  p1SurroundingDrainageSystem?: string | null;
  /** P-1 施工中擋水及抽水措施（施工區域排水系統） */
  p1ConstructionDewateringMeasures?: string | null;
  /** P-1 職業安全衛生教育訓練人數 */
  p1SafetyHealthTrainingHeadcount?: number | null;
  /** P-1 交通維持及安全管制 */
  p1TrafficMaintenanceSafetyControl?: string | null;
  /** P-1 車輛進出路線 */
  p1VehicleAccessRoutes?: string | null;
  /** P-1 竣工文件提送項目 */
  p1CompletionDocumentSubmissionItems?: string | null;
  /** P-1 人力資源預定進場時間表（JSON） */
  p1ManpowerEntryScheduleJson?: string | null;
  /** P-1：文件檔案分類表 P 類自訂列之預定施工／提送日、備註（JSON） */
  p1CustomPPlanScheduleJson?: string | null;
  /** P-1 施工流程概述 */
  p1ConstructionProcessOverview?: string | null;
  /** P-1 施工流程圖（JSON：nodes/edges） */
  p1ConstructionProcessFlowJson?: string | null;
  /** P-1 圖10.2／10.3 共用緊急聯絡表（JSON） */
  p1EmergencyContactTableJson?: string | null;
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
  companyId?: string; // 公司 ID：新建專案通常需要，更新時可不提供
  contractorCompanyId?: string; // 新增：指定營造廠
  supervisionCompanyId?: string; // 新增：指定監造單位
  designCompany?: string; // 新增：設計公司（工程案層級的基本資料，可手動填寫或選擇監造公司）
  contractId: string; // 契約編號（後端會自動使用此值作為 constructionId）
  constructionName: string;
  constructionLocation: string;
  leadOrganization?: string | null;
  constructionBudget: number;
  currentContractAmount: number;
  /** ISO 日期時間；未填請送 null，勿送空字串（後端 LocalDateTime 無法反序列化 ""） */
  signDate?: string | null;
  constructionStartDate?: string | null;
  // constructionEndDate 已移除，由後端自動計算
  constructionConfirmDate?: string | null;
  constructionProjectId: string;
  payMethod: string;
  segmentedAcceptance: boolean;
  partialAcceptance: boolean;
  completionAcceptance: boolean;
  prePayRatio: number;
  retainedRatio: number;
  constructionType?: string | null;
  signLevel: SignLevel[];
  workDay: number;
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS'; // 工期計算模式（可選，預設為 WORKING_DAYS）
  /** 工程規模概述（B-1 頁面維護，更新時可選） */
  constructionScaleOverview?: string | null;
  /** B-2 地理人文環境概述 */
  b2GeoHumanEnvironmentOverview?: string | null;
  /** B-2 工程地點及客觀環境 */
  b2LocationObjectiveEnvironment?: string | null;
  /** B-2 工程規模概述 */
  b2ConstructionScaleOverview?: string | null;
  /** B-2 工程預算 */
  b2ConstructionBudgetText?: string | null;
  /** B-2 緊急應變組織圖（JSON） */
  b2EmergencyOrgChartJson?: string | null;
  /** B-2：確認已完成安全衛生設施勾選維護（依版本） */
  b2SafetyFacilityAcknowledged?: boolean;
  /** P-1 工程規模概述（營造端維護，依版本） */
  p1ConstructionScaleOverview?: string | null;
  /** P-2 工程規模概述（整體品質計劃；營造端維護，依版本） */
  p2QualityScaleOverview?: string | null;
  /** P-2 稽核計畫執行表（JSON；營造端維護，依版本） */
  p2AuditPlanJson?: string | null;
  /** P-2 工程相關人員附件（JSON；證書／勞保證明；營造端維護，依版本） */
  p2PersonnelAttachmentsJson?: string | null;
  /** P-3 工程規模概述（職業安全衛生管理計畫；營造端維護，依版本） */
  p3SafetyHealthScaleOverview?: string | null;
  /** P-3 施工平面圖（多張；JSON 陣列；營造端維護，依版本） */
  p3ConstructionLayoutImagesJson?: string | null;
  /** P-3 安全衛生組織架構圖結構化欄位（JSON；營造端維護，依版本） */
  p3SafetyHealthOrgChartJson?: string | null;
  /** P-3 安全衛生組織架構圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3SafetyHealthOrgChartImageObjectName?: string | null;
  /** P-3 職業安全衛生管理人員與證照（JSON object；學歷／相關證照／證書字號／主要經歷） */
  p3SafetyHealthPersonnelCredentialJson?: string | null;
  /** P-3 職業安全衛生管理人員證照圖片（多張；JSON 陣列；營造端維護，依版本） */
  p3SafetyHealthPersonnelCredentialImagesJson?: string | null;
  /** P-3 協力廠商組織關係圖結構化欄位（JSON；營造端維護，依版本） */
  p3SubcontractorOrgChartJson?: string | null;
  /** P-3 協力廠商組織關係圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3SubcontractorOrgChartImageObjectName?: string | null;
  /** P-3 緊急應變、保全聯絡體制圖結構化欄位（JSON；營造端維護，依版本） */
  p3EmergencyResponseContactJson?: string | null;
  /** P-3 緊急應變、保全聯絡體制圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3EmergencyResponseContactImageObjectName?: string | null;
  /** P-3 緊急聯絡方式表（JSON；類別／單位名稱／電話／備註） */
  p3EmergencyContactListJson?: string | null;
  /** P-3 防颱聯絡體制圖結構化欄位（JSON；營造端維護，依版本） */
  p3TyphoonPreventionContactJson?: string | null;
  /** P-3 防颱聯絡體制圖 PNG MinIO objectName（前端 SVG 轉 PNG 後上傳；單張覆蓋） */
  p3TyphoonPreventionContactImageObjectName?: string | null;
  /** P-3 工程相關人員附件（JSON；證書／勞保證明；營造端維護，依版本） */
  p3PersonnelAttachmentsJson?: string | null;
  /** P-1 施工執行方向（營造端維護，依版本） */
  p1ConstructionExecutionDirection?: string | null;
  /** P-1 工地研判：地質概況 */
  p1GeologyOverview?: string | null;
  /** P-1 工地研判：工址現況調查 */
  p1SiteCurrentConditionSurvey?: string | null;
  /** P-1 工地研判：地下埋設物調查 */
  p1UndergroundUtilitiesSurvey?: string | null;
  /** P-1 工地研判：氣象及水文 */
  p1MeteorologyHydrology?: string | null;
  /** P-1 工地研判：鄰房調查 */
  p1NeighboringBuildingSurvey?: string | null;
  /** P-1 施工機械設備資源預定進場時間表（JSON 陣列） */
  p1MechanicalResourcesJson?: string | null;
  /** P-1 物料市場調查 */
  p1MaterialMarketSurvey?: string | null;
  /** P-1 進度異常管理門檻百分比（例：10） */
  p1ProgressDelayThresholdPercent?: number | null;
  /** P-1 施工前協調會議（自填） */
  p1PreConstructionCoordinationMeeting?: string | null;
  /** P-1 定期會議（自填） */
  p1RegularMeetingFrequency?: string | null;
  /** P-1 臨時用電設備 */
  p1TempPowerEquipment?: string | null;
  /** P-1 給排水設備 */
  p1TempWaterDrainageEquipment?: string | null;
  /** P-1 電訊設備 */
  p1TempTelecomEquipment?: string | null;
  /** P-1 臨時房舍 */
  p1TempHousing?: string | null;
  /** P-1 材料堆置場及加工區 */
  p1TempMaterialStorageProcessingArea?: string | null;
  /** P-1 修護場 */
  p1TempRepairYard?: string | null;
  /** P-1 拌合場 */
  p1TempMixingPlant?: string | null;
  /** P-1 材料實驗室 */
  p1TempMaterialLab?: string | null;
  /** P-1 施工道 */
  p1TempConstructionRoad?: string | null;
  /** P-1 施工測量（舊欄位，相容保留） */
  p1ConstructionSurvey?: string | null;
  /** P-1 測量儀器 */
  p1SurveyInstruments?: string | null;
  /** P-1 控制測量 */
  p1ControlSurvey?: string | null;
  /** P-1 控制測量精度要求 */
  p1ControlSurveyAccuracyRequirements?: string | null;
  /** P-1 施工測量 */
  p1ConstructionSurveyWork?: string | null;
  /** P-1 工地周圍現有灌排水系統（施工區域排水系統） */
  p1SurroundingDrainageSystem?: string | null;
  /** P-1 施工中擋水及抽水措施（施工區域排水系統） */
  p1ConstructionDewateringMeasures?: string | null;
  /** P-1 職業安全衛生教育訓練人數 */
  p1SafetyHealthTrainingHeadcount?: number | null;
  /** P-1 交通維持及安全管制 */
  p1TrafficMaintenanceSafetyControl?: string | null;
  /** P-1 車輛進出路線 */
  p1VehicleAccessRoutes?: string | null;
  /** P-1 竣工文件提送項目 */
  p1CompletionDocumentSubmissionItems?: string | null;
  /** P-1 人力資源預定進場時間表（JSON） */
  p1ManpowerEntryScheduleJson?: string | null;
  /** P-1：文件檔案分類表 P 類自訂列之預定施工／提送日、備註（JSON） */
  p1CustomPPlanScheduleJson?: string | null;
  /** P-1 施工流程概述 */
  p1ConstructionProcessOverview?: string | null;
  /** P-1 施工流程圖（JSON） */
  p1ConstructionProcessFlowJson?: string | null;
  /** P-1 圖10.2／10.3 共用緊急聯絡表（JSON） */
  p1EmergencyContactTableJson?: string | null;
}

/** 讀取 API 舊欄位「承攬廠商」（JSON key 為 constructor；不可用 obj.constructor，會拿到 JS 內建 Object） */
export function getLegacyContractorField(source: Record<string, unknown> | Construction): string {
  const value = source['constructor' as keyof typeof source]
  return typeof value === 'string' ? value : ''
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

  const normalizedCompanyId =
    typeof companyId === 'string' && companyId.trim().length > 0 ? companyId.trim() : undefined

  return {
    workspaceId: workspaceId,
    companyId: normalizedCompanyId,
    contractId: projectFormData.contract_number || '',
    constructionName: projectFormData.project_name || '',
    constructionLocation: projectFormData.project_location || '',
    leadOrganization: projectFormData.host_agency || '',
    // 契約金額：只使用「目前契約金額」（可隨變更設計變動）
    // 相容處理：若舊表單仍有 project_amount，則僅作為 fallback
    constructionBudget:
      parseFloat(projectFormData.current_contract_amount) ||
      parseFloat(projectFormData.project_amount) ||
      0,
    currentContractAmount:
      parseFloat(projectFormData.current_contract_amount) ||
      parseFloat(projectFormData.project_amount) ||
      0,
    signDate: formatDateToISO(projectFormData.sign_date, '10:00:00'),
    constructionStartDate: formatDateToISO(projectFormData.start_date, '09:00:00'),
    // constructionEndDate 已移除，由後端根據開工日期和工作天數自動計算
    constructionConfirmDate: formatDateToISO(projectFormData.confirm_date || projectFormData.start_date, '10:30:00'),
    constructionProjectId: projectFormData.contract_number || '',
    payMethod: projectFormData.payment_method || '分期付款',
    segmentedAcceptance: projectFormData.inspection_methods?.includes('分段驗收') || false,
    partialAcceptance: projectFormData.inspection_methods?.includes('部分驗收') || false,
    completionAcceptance: projectFormData.inspection_methods?.includes('竣工驗收') ?? false,
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
 * 創建工程案（統一使用新的 API）
 * @param constructionData 項目數據
 * @returns Promise<CreateConstructionResponse>
 */
export const createConstruction = async (constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
  try {
    // 統一使用新的 API：POST /management/admin/construction/create
    const data = await http.post('/management/admin/construction/create', constructionData);
    return data as unknown as CreateConstructionResponse;
  } catch (error) {
    console.error('❌ 創建工程案失敗:', error);
    throw error;
  }
};

/**
 * [Admin] 系統管理員創建工程案（已棄用，請使用 createConstruction）
 * @deprecated 請使用 createConstruction，兩者現在使用相同的 API
 */
export const adminCreateConstruction = async (constructionData: CreateConstructionRequest): Promise<CreateConstructionResponse> => {
  // 直接調用 createConstruction，保持向後兼容
  return createConstruction(constructionData);
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
 * @param viewType (可選) 視角
 * @param designChangeId (可選) 變更設計版本 ID；不傳或 null 為預設版
 * @returns Promise<Construction>
 */
export const getConstructionDetail = async (
  constructionId: string,
  workspaceId?: string,
  viewType?: string,
  designChangeId?: number | null
): Promise<Construction> => {
  try {
    const params: any = { constructionId };
    if (workspaceId) {
      params.workspaceId = workspaceId;
    }
    if (viewType) {
      params.viewType = viewType;
    }
    if (designChangeId != null) {
      params.designChangeId = designChangeId;
    }

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
 * @param designChangeId (可選) 變更設計版本 ID；提供時後端僅更新該版本的 12 個版本欄位
 * @returns Promise<CreateConstructionResponse | Construction>
 */
export const updateConstruction = async (
  constructionId: string,
  constructionData: CreateConstructionRequest,
  designChangeId?: number | null
): Promise<CreateConstructionResponse | Construction> => {
  try {
    const payload: Record<string, unknown> = { constructionId, ...constructionData };
    if (designChangeId != null) {
      payload.designChangeId = designChangeId;
    }
    const data = await http.patch('/management/construction/update', payload);
    return data as unknown as CreateConstructionResponse | Construction;
  } catch (error) {
    console.error('❌ 更新工程案失敗:', error);
    throw error;
  }
};

export const uploadB2EmergencyOrgChartImage = async (
  constructionId: string,
  file: Blob,
  designChangeId?: number | null
): Promise<{ objectName: string; signedUrl?: string | null }> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file, `b2-emergency-orgchart-${constructionId}.png`)

  const data = await http.post('/management/construction/b2/emergency-orgchart-image/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data as unknown as { objectName: string; signedUrl?: string | null }
}

export const uploadP1EmergencyContactFigureImage = async (
  constructionId: string,
  figure: 102 | 103 | 104,
  file: Blob,
  designChangeId?: number | null
): Promise<{ objectName: string; signedUrl?: string | null }> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  form.append('figure', String(figure))
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file, `p1-emergency-fig${figure}-${constructionId}.png`)

  const data = await http.post('/management/construction/p1/emergency-contact-figure-image/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data as unknown as { objectName: string; signedUrl?: string | null }
}

/** P-1 施工流程圖（前端 Mermaid 預覽截圖 PNG；依版本） */
export const uploadP1ConstructionProcessFlowImage = async (
  constructionId: string,
  file: Blob,
  designChangeId?: number | null
): Promise<{ objectName: string; signedUrl?: string | null }> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file, `p1-construction-process-flow-${constructionId}.png`)

  const data = await http.post('/management/construction/p1/construction-process-flow-image/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return data as unknown as { objectName: string; signedUrl?: string | null }
}

export type P2PersonnelAttachmentMainTopic = 'CERTIFICATE' | 'LABOR_INSURANCE'

export interface P2PersonnelAttachmentImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

export const uploadP2PersonnelAttachmentImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  mainTopic: P2PersonnelAttachmentMainTopic,
  subTopicId: string,
  file: File
): Promise<P2PersonnelAttachmentImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('mainTopic', mainTopic)
  form.append('subTopicId', subTopicId)
  form.append('file', file)

  const res = await http.post('/management/construction/p2/personnel-attachments/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P2PersonnelAttachmentImageInfo
}

export const deleteP2PersonnelAttachmentImage = async (
  constructionId: string,
  objectName: string
): Promise<void> => {
  await http.delete('/management/construction/p2/personnel-attachments/image', {
    params: { constructionId, objectName }
  })
}

export const getP2PersonnelAttachmentSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p2/personnel-attachments/signed-url', {
    params: { constructionId, objectName }
  })
  // 後端回傳 { signedUrl }
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

export const downloadP2PersonnelAttachmentBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p2/personnel-attachments/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

export type P3PersonnelAttachmentMainTopic = 'CERTIFICATE' | 'LABOR_INSURANCE'

export interface P3PersonnelAttachmentImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

export const uploadP3PersonnelAttachmentImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  mainTopic: P3PersonnelAttachmentMainTopic,
  subTopicId: string,
  file: File
): Promise<P3PersonnelAttachmentImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('mainTopic', mainTopic)
  form.append('subTopicId', subTopicId)
  form.append('file', file)

  const res = await http.post('/management/construction/p3/personnel-attachments/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3PersonnelAttachmentImageInfo
}

export const deleteP3PersonnelAttachmentImage = async (
  constructionId: string,
  objectName: string
): Promise<void> => {
  await http.delete('/management/construction/p3/personnel-attachments/image', {
    params: { constructionId, objectName }
  })
}

export const getP3PersonnelAttachmentSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/personnel-attachments/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

export const downloadP3PersonnelAttachmentBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/personnel-attachments/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

/**
 * P-3 施工平面圖（職業安全衛生管理計畫）：圖片資訊（與 P-2 personnel attachment image 相同 shape）。
 * 整個列表 JSON 由前端組合後存到 `p3ConstructionLayoutImagesJson`；本介面僅描述「單張」。
 */
export interface P3ConstructionLayoutImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

/** 上傳一張 P-3 施工平面圖；回傳該張的 metadata（含可預覽的 signedUrl） */
export const uploadP3ConstructionLayoutImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3ConstructionLayoutImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post('/management/construction/p3/construction-layout-images/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3ConstructionLayoutImageInfo
}

/** 刪除單張 P-3 施工平面圖（僅刪檔；JSON 由前端另行儲存） */
export const deleteP3ConstructionLayoutImage = async (
  constructionId: string,
  objectName: string
): Promise<void> => {
  await http.delete('/management/construction/p3/construction-layout-images/image', {
    params: { constructionId, objectName }
  })
}

/** 取得 P-3 施工平面圖預覽用 signedUrl（短效；不寫入 DB） */
export const getP3ConstructionLayoutImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/construction-layout-images/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

/** 帶 JWT 的下載端點，signedUrl 無法產生時前端可改走此端點取 blob */
export const downloadP3ConstructionLayoutImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/construction-layout-images/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

/**
 * P-3 安全衛生組織架構圖：圖片資訊（單張覆蓋型）。
 * objectName 直接寫到 `p3SafetyHealthOrgChartImageObjectName` 欄位。
 */
export interface P3SafetyHealthOrgChartImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

/**
 * 上傳 P-3 安全衛生組織架構圖 PNG。
 * - 後端會自動把舊圖刪除（單張覆蓋）
 * - 並把新 objectName 直接寫到 `p3SafetyHealthOrgChartImageObjectName`
 *   （所以呼叫成功後不需要再額外 PUT 整個 construction）
 */
export const uploadP3SafetyHealthOrgChartImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3SafetyHealthOrgChartImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post('/management/construction/p3/safety-health-org-chart/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3SafetyHealthOrgChartImageInfo
}

/** 刪除目前儲存的 P-3 安全衛生組織架構圖（同時清掉 image_object_name 欄位） */
export const deleteP3SafetyHealthOrgChartImage = async (
  constructionId: string,
  designChangeId: number | null | undefined
): Promise<void> => {
  await http.delete('/management/construction/p3/safety-health-org-chart/image', {
    params: {
      constructionId,
      ...(designChangeId != null ? { designChangeId } : {})
    }
  })
}

/** 取得 P-3 安全衛生組織架構圖預覽用 signedUrl（短效；不寫入 DB） */
export const getP3SafetyHealthOrgChartImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/safety-health-org-chart/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

/** 帶 JWT 的下載端點（signedUrl 無法產生時 fallback） */
export const downloadP3SafetyHealthOrgChartImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/safety-health-org-chart/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

/**
 * P-3 協力廠商組織關係圖：圖片資訊（單張覆蓋型）。
 * objectName 直接寫到 `p3SubcontractorOrgChartImageObjectName` 欄位。
 */
export interface P3SubcontractorOrgChartImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

/**
 * 上傳 P-3 協力廠商組織關係圖 PNG。
 * - 後端會自動把舊圖刪除（單張覆蓋）
 * - 並把新 objectName 直接寫到 `p3SubcontractorOrgChartImageObjectName`
 *   （所以呼叫成功後不需要再額外 PUT 整個 construction）
 */
export const uploadP3SubcontractorOrgChartImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3SubcontractorOrgChartImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post('/management/construction/p3/subcontractor-org-chart/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3SubcontractorOrgChartImageInfo
}

/** 刪除目前儲存的 P-3 協力廠商組織關係圖（同時清掉 image_object_name 欄位） */
export const deleteP3SubcontractorOrgChartImage = async (
  constructionId: string,
  designChangeId: number | null | undefined
): Promise<void> => {
  await http.delete('/management/construction/p3/subcontractor-org-chart/image', {
    params: {
      constructionId,
      ...(designChangeId != null ? { designChangeId } : {})
    }
  })
}

/** 取得 P-3 協力廠商組織關係圖預覽用 signedUrl（短效；不寫入 DB） */
export const getP3SubcontractorOrgChartImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/subcontractor-org-chart/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

/** 帶 JWT 的下載端點（signedUrl 無法產生時 fallback） */
export const downloadP3SubcontractorOrgChartImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/subcontractor-org-chart/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

/**
 * P-3 協力廠商組織關係圖：依工程主要施工項目（標單明細）工程案資料建構產生「材料供應商分類」清單。
 *
 * - 不寫入 DB；前端拿到 categories 後覆蓋 `subOrgChartData.materialSuppliers`，
 *   再由共用 debounce 自動儲存到 `p3SubcontractorOrgChartJson`。
 */
export interface P3EmergencyResponseContactImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

export const uploadP3EmergencyResponseContactImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3EmergencyResponseContactImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post('/management/construction/p3/emergency-response-contact/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3EmergencyResponseContactImageInfo
}

export const deleteP3EmergencyResponseContactImage = async (
  constructionId: string,
  designChangeId: number | null | undefined
): Promise<void> => {
  await http.delete('/management/construction/p3/emergency-response-contact/image', {
    params: {
      constructionId,
      ...(designChangeId != null ? { designChangeId } : {})
    }
  })
}

export const getP3EmergencyResponseContactImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/emergency-response-contact/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

export const downloadP3EmergencyResponseContactImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/emergency-response-contact/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

export interface P3TyphoonPreventionContactImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

export const uploadP3TyphoonPreventionContactImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3TyphoonPreventionContactImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post('/management/construction/p3/typhoon-prevention-contact/upload', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res as unknown as P3TyphoonPreventionContactImageInfo
}

export const deleteP3TyphoonPreventionContactImage = async (
  constructionId: string,
  designChangeId: number | null | undefined
): Promise<void> => {
  await http.delete('/management/construction/p3/typhoon-prevention-contact/image', {
    params: {
      constructionId,
      ...(designChangeId != null ? { designChangeId } : {})
    }
  })
}

export const getP3TyphoonPreventionContactImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get('/management/construction/p3/typhoon-prevention-contact/signed-url', {
    params: { constructionId, objectName }
  })
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

export const downloadP3TyphoonPreventionContactImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get('/management/construction/p3/typhoon-prevention-contact/download', {
    params: { constructionId, objectName },
    responseType: 'blob',
  })
  return raw as unknown as Blob
}

export const generateP3SubcontractorCategoriesByAi = async (
  constructionId: string,
  designChangeId: number | null
): Promise<{ categories: string[] }> => {
  const res = await http.get('/management/construction/p3/subcontractor-org-chart/ai-categories', {
    params: {
      constructionId,
      ...(designChangeId != null ? { designChangeId } : {}),
    },
  })
  const r = (res as any)
  if (Array.isArray(r?.categories)) return { categories: r.categories.filter((s: any) => typeof s === 'string') }
  const inner = (r?.data ?? r) as { categories?: any }
  return {
    categories: Array.isArray(inner?.categories)
      ? inner.categories.filter((s: any) => typeof s === 'string')
      : [],
  }
}

/**
 * P-3 職業安全衛生管理人員證照圖片：與 P-3 施工平面圖完全同 shape（單張 metadata）。
 * 整個列表 JSON 由前端組合後存到 `p3SafetyHealthPersonnelCredentialImagesJson` 欄位。
 */
export interface P3SafetyHealthPersonnelCredentialImageInfo {
  objectName: string
  signedUrl?: string | null
  fileName?: string | null
  contentType?: string | null
  fileSize?: number | null
}

/** 上傳一張 P-3 職業安全衛生管理人員證照圖片；回傳該張的 metadata（含可預覽的 signedUrl） */
export const uploadP3SafetyHealthPersonnelCredentialImage = async (
  constructionId: string,
  designChangeId: number | null | undefined,
  file: File
): Promise<P3SafetyHealthPersonnelCredentialImageInfo> => {
  const form = new FormData()
  form.append('constructionId', constructionId)
  if (designChangeId != null) form.append('designChangeId', String(designChangeId))
  form.append('file', file)

  const res = await http.post(
    '/management/construction/p3/safety-health-personnel-credential-images/upload',
    form,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  )
  return res as unknown as P3SafetyHealthPersonnelCredentialImageInfo
}

/** 刪除單張 P-3 職業安全衛生管理人員證照圖片（僅刪檔；JSON 由前端另行儲存） */
export const deleteP3SafetyHealthPersonnelCredentialImage = async (
  constructionId: string,
  objectName: string
): Promise<void> => {
  await http.delete('/management/construction/p3/safety-health-personnel-credential-images/image', {
    params: { constructionId, objectName }
  })
}

/** 取得 P-3 職業安全衛生管理人員證照圖片預覽用 signedUrl（短效；不寫入 DB） */
export const getP3SafetyHealthPersonnelCredentialImageSignedUrl = async (
  constructionId: string,
  objectName: string
): Promise<{ signedUrl: string }> => {
  const res = await http.get(
    '/management/construction/p3/safety-health-personnel-credential-images/signed-url',
    { params: { constructionId, objectName } }
  )
  const raw = (res as any)?.signedUrl
  if (typeof raw === 'string') return { signedUrl: raw }
  return ((res as any)?.data ?? res) as { signedUrl: string }
}

/** 帶 JWT 的下載端點（signedUrl 無法產生時 fallback） */
export const downloadP3SafetyHealthPersonnelCredentialImageBlob = async (
  constructionId: string,
  objectName: string
): Promise<Blob> => {
  const raw = await http.get(
    '/management/construction/p3/safety-health-personnel-credential-images/download',
    { params: { constructionId, objectName }, responseType: 'blob' }
  )
  return raw as unknown as Blob
}

/**
 * 依目前版本標單由工程案資料建構產出工程規模概述（供 B-1 監造計劃書使用），不寫入 DB。
 * 標單無資料時回傳空字串；失敗時後端回傳 503 與 error 訊息。
 */
export const getConstructionScaleOverviewAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId };
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId);
  }
  const data = await http.get('/management/construction/construction-scale-overview/ai-generate', { params });
  return data as unknown as { text: string };
};

export type B2TextAiField =
  | 'GEO_HUMAN_ENVIRONMENT_OVERVIEW'
  | 'LOCATION_OBJECTIVE_ENVIRONMENT'
  | 'CONSTRUCTION_SCALE_OVERVIEW'
  | 'CONSTRUCTION_BUDGET_TEXT'

/** 依目前版本監造標單由工程案資料建構產出 B-2 文字欄位（安全衛生監督查核計畫），不寫入 DB。 */
export const getB2TextsAiGenerate = async (
  constructionId: string,
  field: B2TextAiField,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId, field }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/b2-texts/ai-generate', { params })
  return data as unknown as { text: string }
}

/** B-2 手動複製前一個版本（覆寫目標版本 B-2 內容與圖片關聯） */
export const copyB2FromPreviousVersion = async (
  constructionId: string,
  sourceDesignChangeId: number | null | undefined,
  targetDesignChangeId: number
): Promise<{ copied: boolean }> => {
  const params = new URLSearchParams()
  params.set('constructionId', constructionId)
  params.set('targetDesignChangeId', String(targetDesignChangeId))
  if (sourceDesignChangeId != null) {
    params.set('sourceDesignChangeId', String(sourceDesignChangeId))
  }
  const data = await http.post(`/management/construction/b2/copy-from-previous?${params.toString()}`)
  return data as unknown as { copied: boolean }
}

/** 依目前版本營造標單由工程案資料建構產出 P-1 工程規模概述，不寫入 DB。 */
export const getP1TextAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-texts/ai-generate', { params })
  return data as unknown as { text: string }
}

/** 依標單由工程案資料建構產出 P-1「施工執行方向」，不寫入 DB。 */
export const getP1ConstructionExecutionDirectionAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-construction-execution-direction/ai-generate', { params })
  return data as unknown as { text: string }
}

export type P1SiteJudgementAiField = 'GEOLOGY_OVERVIEW' | 'METEOROLOGY_HYDROLOGY'

/** 依工程地點由工程案資料建構產出 P-1 工地研判欄位，不寫入 DB。 */
export const getP1SiteJudgementAiGenerate = async (
  constructionId: string,
  field: P1SiteJudgementAiField,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId, field }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-site-judgement/ai-generate', { params })
  return data as unknown as { text: string }
}

/** 依標單由工程案資料建構產出 P-1 施工機械設備資源預定進場時間表之資源名稱清單。 */
export const getP1MechanicalResourcesAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ names: string[] }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-mechanical-resources/ai-generate', { params })
  return data as unknown as { names: string[] }
}

/** 依工程名稱、標單與分項工程產出 P-1 施工流程概述。 */
export const getP1ConstructionProcessOverviewAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-construction-process/overview/ai-generate', { params })
  return data as unknown as { text: string }
}

/** 依工程名稱、標單與分項工程產出 P-1 施工流程圖結構 JSON。 */
export const getP1ConstructionProcessFlowAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ flowJson: string }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-construction-process/flow/ai-generate', { params })
  return data as unknown as { flowJson: string }
}

/** 依標單由工程案資料建構產出 P-1 物料市場調查。 */
export const getP1MaterialMarketSurveyAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-material-market-survey/ai-generate', { params })
  return data as unknown as { text: string }
}

/** P-1「施工區域排水系統」工程案資料建構欄位：周圍灌排／施工中擋水抽水 */
export type P1DrainageAreaAiField = 'SURROUNDING_SYSTEM' | 'DEWATERING_MEASURES'

/** 依工程地點、標單與分項由工程案資料建構產出 P-1 施工區域排水子段落。 */
export const getP1DrainageAreaAiGenerate = async (
  constructionId: string,
  field: P1DrainageAreaAiField,
  designChangeId?: number | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = { constructionId, field }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-drainage-area/ai-generate', { params })
  return data as unknown as { text: string }
}

/** 依分項工程帶入人力列並由 工程案資料建構建議群組名稱 */
export const getP1ManpowerFromSubdivisionsAiGenerate = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<{ rows: { resourceName: string; groupName: string; workContent?: string; isSResident?: string; remark?: string }[] }> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p1-manpower-entry-schedule/from-subdivisions-ai', {
    params
  })
  return data as unknown as { rows: { resourceName: string; groupName: string; workContent?: string; isSResident?: string; remark?: string }[] }
}

/** P-1 人力結構圖預覽（PNG）。 */
export const fetchP1ManpowerStructureImagePng = async (
  constructionId: string,
  designChangeId?: number | null
): Promise<Blob> => {
  const params: Record<string, string> = { constructionId }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const buf = await http.get<ArrayBuffer>(
    '/management/construction/p1/manpower-structure-image/preview.png',
    { responseType: 'arraybuffer', params }
  )
  return new Blob([buf as unknown as ArrayBuffer], { type: 'image/png' })
}

/** 依分項工程由工程案資料建構產出 P 類動態頁「施工方法與步驟」結構 JSON。 */
export const getPDynamicConstructionStagePlanAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId?: number | null
): Promise<{ planJson: string }> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p-dynamic/construction-stage-plan/ai-generate', { params })
  return data as unknown as { planJson: string }
}

/** 依目前「施工方法與步驟」由工程案資料建構產出各主要工序之施工要領（可傳 planJson 以含未存檔編輯）。 */
export const postPDynamicConstructionStagePlanEssentialsAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId: number | null | undefined,
  planJson?: string | null
): Promise<{
  updates: { stageId: string; processId: string; constructionEssentials: string }[]
}> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const body = planJson != null && String(planJson).trim() !== '' ? { planJson } : {}
  const data = await http.post('/management/construction/p-dynamic/construction-stage-plan-essentials/ai-generate', body, {
    params
  })
  return data as unknown as {
    updates: { stageId: string; processId: string; constructionEssentials: string }[]
  }
}

/** 依本 P 類計畫書與「施工方法與步驟」由工程案資料建構產出施工抽查標準明細（可傳 planJson 以含未存檔編輯）。 */
export const postPDynamicConstructionInspectionStandardsAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId: number | null | undefined,
  planJson?: string | null
): Promise<{
  lines: Record<string, unknown>[]
}> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const body = planJson != null && String(planJson).trim() !== '' ? { planJson } : {}
  const data = await http.post(
    '/management/construction/p-dynamic/construction-inspection-standards/ai-generate',
    body,
    { params }
  )
  return data as unknown as { lines: Record<string, unknown>[] }
}

/** 依本頁計畫書名稱由工程案資料建構產出 P 類動態頁第四章機具與材料兩表 JSON（材料數量為空，由使用者填寫）。 */
export const getPDynamicChapter4EquipmentMaterialsAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId?: number | null
): Promise<{ chapter4Json: string }> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const data = await http.get('/management/construction/p-dynamic/chapter4-equipment-materials/ai-generate', {
    params
  })
  return data as unknown as { chapter4Json: string }
}

/** 依計畫書與施工方法與步驟由工程案資料建構產出「安全衛生執行要點」長文（可傳 planJson 以含未存檔編輯）。 */
export const postPDynamicSafetyHealthExecutionPointsAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId: number | null | undefined,
  planJson?: string | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const body = planJson != null && String(planJson).trim() !== '' ? { planJson } : {}
  const data = await http.post('/management/construction/p-dynamic/safety-health-execution-points/ai-generate', body, {
    params
  })
  return data as unknown as { text: string }
}

/** 依計畫書與施工方法與步驟由工程案資料建構產出「環境保護注意事項」長文（可傳 planJson 以含未存檔編輯）。 */
export const postPDynamicEnvironmentProtectionNotesAiGenerate = async (
  constructionId: string,
  documentClassificationId: number,
  designChangeId: number | null | undefined,
  planJson?: string | null
): Promise<{ text: string }> => {
  const params: Record<string, string> = {
    constructionId,
    documentClassificationId: String(documentClassificationId)
  }
  if (designChangeId !== undefined && designChangeId !== null) {
    params.designChangeId = String(designChangeId)
  }
  const body = planJson != null && String(planJson).trim() !== '' ? { planJson } : {}
  const data = await http.post('/management/construction/p-dynamic/environment-protection-notes/ai-generate', body, {
    params
  })
  return data as unknown as { text: string }
}

/** 依資料依據日取得 P-1 人力資源預設最大可用量 */
export const getP1ManpowerDefaultMaxAvailable = async (
  constructionId: string,
  dataReferenceDate: string
): Promise<{
  siteManagerCount: number
  qualityEngineerCount: number
  labourSafetyCount: number
  siteEngineerCount: number
}> => {
  const params: Record<string, string> = { constructionId, dataReferenceDate }
  const data = await http.get('/management/construction/p1-manpower-entry-schedule/default-max-available', { params })
  return data as unknown as {
    siteManagerCount: number
    qualityEngineerCount: number
    labourSafetyCount: number
    siteEngineerCount: number
  }
}

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
  endDate: string,
  ownerType?: string
): Promise<CalendarEvent[]> => {
  try {
    const params: any = { start: startDate, end: endDate };
    if (ownerType) params.ownerType = ownerType;
    const data = await http.get(
      `/management/constructions/${constructionId}/calendar/events`,
      { params }
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
  durationType?: 'CALENDAR_DAYS' | 'WORKING_DAYS',
  ownerType?: string
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
    
    if (durationType) {
      params.durationType = durationType;
    }
    if (ownerType) {
      params.ownerType = ownerType;
    }
    
    const data = await http.get(url, { params });
    return data as unknown as CalculateEndDateResponse;
  } catch (error) {
    console.error('試算完工日期失敗:', error);
    throw error;
  }
};

// ========== 行事曆設定 API ==========

/** 行事曆設定 DTO */
export interface CalendarSettings {
  constructionId: string;
  ownerType: string;
  govHolidayEnabled: boolean;
}

/**
 * 查詢行事曆設定（政府假日啟用狀態）
 * GET /constructions/{constructionId}/calendar/settings
 */
export const getCalendarSettings = async (
  constructionId: string,
  ownerType?: string
): Promise<CalendarSettings> => {
  try {
    const params: any = {};
    if (ownerType) params.ownerType = ownerType;
    const data = await http.get(
      `/management/constructions/${constructionId}/calendar/settings`,
      { params }
    );
    return data as unknown as CalendarSettings;
  } catch (error) {
    console.error('查詢行事曆設定失敗:', error);
    throw error;
  }
};

/**
 * 更新行事曆設定（開關政府假日自動套用）
 * PUT /constructions/{constructionId}/calendar/settings
 */
export const updateCalendarSettings = async (
  constructionId: string,
  settings: { govHolidayEnabled: boolean },
  ownerType?: string
): Promise<CalendarSettings> => {
  try {
    const params: any = {};
    if (ownerType) params.ownerType = ownerType;
    const data = await http.put(
      `/management/constructions/${constructionId}/calendar/settings`,
      settings,
      { params }
    );
    return data as unknown as CalendarSettings;
  } catch (error) {
    console.error('更新行事曆設定失敗:', error);
    throw error;
  }
};

// 行事曆公文資訊介面
export interface CalendarDocument {
  id: number;
  issueDate: string; // YYYY-MM-DD
  documentNumber?: string; // 發文字號
  subject?: string; // 主旨
  sender?: string; // 發文者
}

/**
 * 獲取工程案行事曆的公文發文日期資訊
 * GET /constructions/{constructionId}/calendar/documents?start=...&end=...
 */
export const getCalendarDocuments = async (
  constructionId: string,
  startDate: string,
  endDate: string
): Promise<CalendarDocument[]> => {
  try {
    const data = await http.get(
      `/management/constructions/${constructionId}/calendar/documents`,
      {
        params: {
          start: startDate,
          end: endDate
        }
      }
    );
    return data as unknown as CalendarDocument[];
  } catch (error) {
    console.error('獲取行事曆公文資訊失敗:', error);
    throw error;
  }
};

// 行事曆展延免計日期介面
export interface CalendarExtensionDate {
  date: string; // YYYY-MM-DD
  description?: string; // 日期說明
  extensionId: string; // 展延記錄 ID
  extensionOrder: number; // 第幾次展延
  extensionReason?: string; // 展延原因概要
}

// 職安報備相關設定（目前僅勞動檢查機構全銜）
export interface LaborSafetySettings {
  constructionId: string;
  laborInspectionAgencyFullName: string | null;
}

export const getLaborSafetySettings = async (
  constructionId: string
): Promise<LaborSafetySettings> => {
  if (!constructionId) {
    throw new Error('查詢職安設定需要 constructionId');
  }
  const data = await http.get('/management/construction/labor-safety/settings', {
    params: { constructionId },
  });
  return data as unknown as LaborSafetySettings;
};

export const updateLaborSafetySettings = async (
  payload: LaborSafetySettings
): Promise<LaborSafetySettings> => {
  if (!payload?.constructionId) {
    throw new Error('更新職安設定需要 constructionId');
  }
  const data = await http.patch('/management/construction/labor-safety/settings', payload);
  return data as unknown as LaborSafetySettings;
};

/**
 * 獲取工程案行事曆的展延免計日期資訊
 * GET /constructions/{constructionId}/calendar/extension-dates?start=...&end=...
 */
export const getCalendarExtensionDates = async (
  constructionId: string,
  startDate: string,
  endDate: string,
  ownerType?: string
): Promise<CalendarExtensionDate[]> => {
  try {
    const params: any = { start: startDate, end: endDate };
    if (ownerType) params.ownerType = ownerType;
    const data = await http.get(
      `/management/constructions/${constructionId}/calendar/extension-dates`,
      { params }
    );
    return data as unknown as CalendarExtensionDate[];
  } catch (error) {
    console.error('獲取行事曆展延免計日期失敗:', error);
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
  getConstructionDetail,
  getCalendarSettings,
  updateCalendarSettings,
  getCalendarDocuments,
  getCalendarExtensionDates,
  getLaborSafetySettings,
  updateLaborSafetySettings,
};
