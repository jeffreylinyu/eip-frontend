import http from './http';
import { downloadBlobAsFile } from './forms';
import { downloadBlob, extractFileNameFromResponse } from '@/utils/blobDownload';
import type {
  DailyReport,
  ExecutionSummaryItem,
  MaterialUsageSummaryItem,
  LaborEquipmentSummaryItem
} from '@/types/dailyReport';

export type DailyReportExportVersion = 'construction' | 'supervision';
export type DailyReportExportType = 'CONSTRUCTOR' | 'SUPERVISOR';

/**
 * API 請求格式（儲存時只傳送今日數據）
 */
export interface DailyReportSaveRequest {
  reportDate: string; // ISO 8601 格式 (YYYY-MM-DD)
  weatherMorning: string;
  weatherAfternoon: string;
  status: 'DRAFT' | 'SUBMITTED';
  // 新增欄位
  hasProfessionalTechnician: boolean; // 是否需設置技術士
  preWorkEducation: boolean; // 實施勤前教育
  newWorkerInsuranceStatus: '0' | '1' | '2'; // 新進勞工保險 (0:無, 1:有, 2:無新進勞工)
  ppeCheck: boolean; // 檢查個人防護具
  safetyOtherMatters: string; // 其他職安衛事項
  samplingTestRecords: string; // 施工取樣試驗紀錄
  subcontractorNotifications: string; // 通知協力廠商事項
  importantMatters: string; // 重要事項記錄
  constructionItems: {
    itemName: string; // 必填
    unit: string;
    contractQty: string; // 使用 string 避免精度問題
    todayQty: string; // 只傳今日數量
    note: string;
    constructionPccesCodeId?: number; // 可選（向後兼容）
    logicalId?: string; // 優先使用此欄位
  }[];
  materials: {
    materialName: string; // 必填
    unit: string;
    contractQty: string;
    todayQty: string; // 只傳今日數量
    note: string;
    constructionPccesCodeId?: number; // 可選（向後兼容）
    logicalId?: string; // 優先使用此欄位
  }[];
  resources: Array<{
    jobTitle?: string;
    todayPeople?: string; // 只傳今日人數（當有 jobTitle 時）
    machineName?: string;
    todayMachine?: string; // 只傳今日機械數量（當有 machineName 時）
  }>;
}

/**
 * API 回應格式（包含後端計算的累計值）
 */
export interface DailyReportDetailResponse {
  id: number;
  constructionId: string;
  reportDate: string;
  weatherMorning: string;
  weatherAfternoon: string;
  status: 'DRAFT' | 'SUBMITTED';
  // 新增欄位
  hasProfessionalTechnician: boolean; // 是否需設置技術士
  preWorkEducation: boolean; // 實施勤前教育
  newWorkerInsuranceStatus: '0' | '1' | '2'; // 新進勞工保險 (0:無, 1:有, 2:無新進勞工)
  ppeCheck: boolean; // 檢查個人防護具
  safetyOtherMatters: string; // 其他職安衛事項
  samplingTestRecords: string; // 施工取樣試驗紀錄
  subcontractorNotifications: string; // 通知協力廠商事項
  importantMatters: string; // 重要事項記錄
  constructionItems: {
    id: number | null; // ⭐ 可以是 null（未填寫項目）
    constructionPccesCodeId: number | null; // PCCES 工項 ID
    logicalId: string | null; // ⭐ 邏輯 ID，用於跨版本追蹤（必須有值）
    pccesCode: string | null; // ⭐ PCCES 編號
    itemNo?: string | null; // 標單項次
    itemName: string | null; // 施工項目名稱（來自 PCCES）
    type?: string | null; // 工項類型（PccesItemType）
    unit: string | null; // 單位（來自 PCCES）
    contractQty: string | null; // ⭐ 契約數量（來自 PCCES，唯讀）
    todayQty: string | null; // 本日完成數量（未填寫為 0 或 null）
    totalQty: string | null; // ✅ 後端計算的累計值（未填寫為 0 或 null）
    note: string | null; // 備註（未填寫為 null）
    depth?: number | null;
    parentLogicalId?: string | null;
    fillable?: boolean | null;
    executionRowKind?: string | null;
  }[];
  materials: {
    id: number | null; // ⭐ 可以是 null（未填寫項目）
    constructionPccesCodeId: number | null; // PCCES 工項 ID
    logicalId: string | null; // ⭐ 邏輯 ID，用於跨版本追蹤（必須有值）
    pccesCode: string | null; // ⭐ PCCES 編號
    materialName: string | null; // 材料名稱（來自 PCCES）
    unit: string | null; // 單位（來自 PCCES）
    contractQty: string | null; // ⭐ 契約數量（來自 PCCES，唯讀）
    todayQty: string | null; // 本日使用數量（未填寫為 0 或 null）
    totalQty: string | null; // ✅ 後端計算的累計值（未填寫為 0 或 null）
    note: string | null; // 備註（未填寫為 null）
  }[];
  resources: Array<{
    id: number;
    jobTitle?: string;
    todayPeople?: string;
    totalPeople?: string; // ✅ 後端計算的累計值（當有 jobTitle 時）
    machineName?: string;
    todayMachine?: string;
    totalMachine?: string; // ✅ 後端計算的累計值（當有 machineName 時）
  }>;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * 查詢施工日誌
 * @param constructionId 工程ID
 * @param reportDate 日期 (YYYY-MM-DD)
 */
export const getDailyReport = async (
  constructionId: string,
  reportDate: string,
  ownerType?: string
): Promise<DailyReportDetailResponse> => {
  try {
    const params = ownerType ? { ownerType } : undefined
    const response = await http.get(
      `/management/constructions/${constructionId}/daily-reports/${reportDate}`,
      params ? { params } : undefined
    )
    return response as unknown as DailyReportDetailResponse
  } catch (error) {
    console.error('查詢施工日誌失敗:', error);
    throw error;
  }
};

/**
 * 新增或更新施工日誌
 * @param constructionId 工程ID
 * @param reportDate 日期 (YYYY-MM-DD)
 * @param data 日誌資料（只包含今日數據）
 */
export const saveDailyReport = async (
  constructionId: string,
  reportDate: string,
  data: DailyReportSaveRequest,
  ownerType?: string
): Promise<DailyReportDetailResponse> => {
  try {
    const params = ownerType ? { ownerType } : undefined
    const response = await http.put(
      `/management/constructions/${constructionId}/daily-reports/${reportDate}`,
      data,
      params ? { params } : undefined
    )
    return response as unknown as DailyReportDetailResponse
  } catch (error) {
    console.error('儲存施工日誌失敗:', error);
    throw error;
  }
};

/**
 * 將前端 DailyReport 格式轉換為 API 請求格式（只包含今日數據）
 */
export const convertToSaveRequest = (
  report: DailyReport
): DailyReportSaveRequest => {
  // 轉換 hasRequiredTechnician: 'YES' | 'NO' | '' -> boolean
  const hasProfessionalTechnician = report.siteCheck.hasRequiredTechnician === 'YES';
  
  // 轉換 preConstructionEducation: 'YES' | 'NO' | '' -> boolean
  const preWorkEducation = report.safetyChecklist.preConstructionEducation === 'YES';
  
  // 轉換 newWorkerInsurance: 'YES' | 'NO' | 'NO_NEW_WORKER' | '' -> '0' | '1' | '2'
  let newWorkerInsuranceStatus: '0' | '1' | '2' = '0';
  if (report.safetyChecklist.newWorkerInsurance === 'YES') {
    newWorkerInsuranceStatus = '1';
  } else if (report.safetyChecklist.newWorkerInsurance === 'NO_NEW_WORKER') {
    newWorkerInsuranceStatus = '2';
  } else {
    newWorkerInsuranceStatus = '0';
  }
  
  // 轉換 personalProtectionEquipment: 'YES' | 'NO' | '' -> boolean
  const ppeCheck = report.safetyChecklist.personalProtectionEquipment === 'YES';
  
  return {
    reportDate: report.reportDate,
    weatherMorning: report.weather.morning,
    weatherAfternoon: report.weather.afternoon,
    status: (report.status === 'DRAFT' || report.status === 'SUBMITTED') ? report.status : 'DRAFT',
    // 新增欄位
    hasProfessionalTechnician,
    preWorkEducation,
    newWorkerInsuranceStatus,
    ppeCheck,
    safetyOtherMatters: report.safetyChecklist.otherNotes ?? '',
    samplingTestRecords: report.qualityInspectionRecord ?? '',
    subcontractorNotifications: report.subcontractorNotice ?? '',
    importantMatters: report.importantRecord ?? '',
    // ⭐ 只保存有填寫資料的項目（todayQty > 0 或有備註）
    constructionItems: report.executionSummary
      .filter(item => {
        if (item.fillable === false || item.executionRowKind === 'SECTION_HEADER') {
          return false
        }
        const hasNote = item.remark && item.remark.trim() !== ''
        const hasTodayQty = item.todayQuantity && item.todayQuantity > 0
        return hasTodayQty || hasNote
      })
      .map(item => ({
        itemName: item.item || '', // 必填
        unit: item.unit || '',
        contractQty: item.contractQuantity?.toString() ?? '0', // 必填
        todayQty: item.todayQuantity?.toString() ?? '0',
        note: item.remark || '',
        constructionPccesCodeId: item.constructionPccesCodeId || undefined,
        logicalId: item.logicalId || undefined
      })),
    // ⭐ 只保存有填寫資料的項目（todayQty > 0 或有備註）
    materials: report.materialUsageSummary
      .filter(item => {
        // 只保存有填寫資料的項目（todayQty > 0 或有備註）
        const hasTodayQty = item.todayUsage && item.todayUsage > 0
        const hasNote = item.remark && item.remark.trim() !== ''
        return hasTodayQty || hasNote
      })
      .map(item => ({
        materialName: item.materialName || '', // 必填
        unit: item.unit || '',
        contractQty: item.contractQuantity?.toString() ?? '0', // 必填
        todayQty: item.todayUsage?.toString() ?? '0',
        note: item.remark || '',
        constructionPccesCodeId: item.constructionPccesCodeId || undefined,
        logicalId: item.logicalId || undefined
      })),
    resources: report.laborEquipmentSummary
      .filter(item => item.laborType.trim() !== '' || item.equipmentName.trim() !== '') // 只傳送有工種或機具名稱的項目
      .flatMap(item => {
        const resources: Array<{ jobTitle?: string; todayPeople?: string; machineName?: string; todayMachine?: string }> = [];
        
        // 如果有工種，建立一個 resource
        if (item.laborType.trim() !== '') {
          resources.push({
            jobTitle: item.laborType,
            todayPeople: item.todayLaborCount?.toString() ?? '0'
          });
        }
        
        // 如果有機具，建立另一個 resource
        if (item.equipmentName.trim() !== '') {
          resources.push({
            machineName: item.equipmentName,
            todayMachine: item.todayEquipmentUsage?.toString() ?? '0'
          });
        }
        
        return resources;
      })
  };
};

/**
 * 將 API 回應格式轉換為前端 DailyReport 格式（包含累計值）
 */
export const convertFromDetailResponse = (
  response: DailyReportDetailResponse,
  existingReport: DailyReport
): DailyReport => {
  // 轉換 newWorkerInsuranceStatus: '0' | '1' | '2' -> 'YES' | 'NO' | 'NO_NEW_WORKER' | ''
  let newWorkerInsurance: 'YES' | 'NO' | 'NO_NEW_WORKER' | '' = '';
  if (response.newWorkerInsuranceStatus === '1') {
    newWorkerInsurance = 'YES';
  } else if (response.newWorkerInsuranceStatus === '2') {
    newWorkerInsurance = 'NO_NEW_WORKER';
  } else if (response.newWorkerInsuranceStatus === '0') {
    newWorkerInsurance = 'NO';
  }
  
  // 更新基本資訊
  const updatedReport: DailyReport = {
    ...existingReport,
    id: response.id?.toString(),
    reportDate: response.reportDate,
    status: response.status,
    weather: {
      morning: response.weatherMorning,
      afternoon: response.weatherAfternoon
    },
    // 更新新增欄位
    siteCheck: {
      hasRequiredTechnician: response.hasProfessionalTechnician ? 'YES' : 'NO'
    },
    safetyChecklist: {
      preConstructionEducation: response.preWorkEducation ? 'YES' : 'NO',
      newWorkerInsurance,
      personalProtectionEquipment: response.ppeCheck ? 'YES' : 'NO',
      otherNotes: response.safetyOtherMatters ?? ''
    },
    qualityInspectionRecord: response.samplingTestRecords ?? '',
    subcontractorNotice: response.subcontractorNotifications ?? '',
    importantRecord: response.importantMatters ?? '',
    executionSummary: response.constructionItems.map((item, index) => {
      // ⭐ 處理未填寫項目（id === null）
      const isFilled = item.id !== null
      
      // 嘗試從現有報告中找到對應項目（優先根據 logicalId 匹配）
      const existingItem = item.logicalId
        ? existingReport.executionSummary.find(e => e.logicalId === item.logicalId)
        : existingReport.executionSummary.find(e => e.item === item.itemName);
      
      // 生成唯一的 id（優先使用現有的，其次使用後端的，最後使用 logicalId 或索引）
      let uniqueId: string
      if (existingItem?.id) {
        uniqueId = existingItem.id
      } else if (isFilled && item.id !== null && item.id !== undefined) {
        uniqueId = item.id.toString()
      } else if (item.logicalId) {
        uniqueId = `logical-${item.logicalId}`
      } else {
        uniqueId = `temp-${index}-${item.itemName || 'unknown'}`
      }
      
      // 處理契約數量（可能是 string 或 number）
      const contractQtyValue = (item as any).contractQuantity ?? item.contractQty
      const contractQuantity = contractQtyValue !== null && contractQtyValue !== undefined
        ? (typeof contractQtyValue === 'string' ? parseFloat(contractQtyValue) : contractQtyValue)
        : null

      const parseNumericField = (value: unknown): number | null => {
        if (value === null || value === undefined) return null
        const parsed = typeof value === 'string' ? parseFloat(value) : Number(value)
        return Number.isFinite(parsed) ? parsed : null
      }
      const contractAmount = parseNumericField((item as { contractAmount?: unknown }).contractAmount)
      const contractAmountPercent = parseNumericField(
        (item as { contractAmountPercent?: unknown }).contractAmountPercent
      )
      const unitPrice = parseNumericField((item as { unitPrice?: unknown }).unitPrice)
      const todayAmount = parseNumericField((item as { todayAmount?: unknown }).todayAmount)
      const todayAmountPercent = parseNumericField(
        (item as { todayAmountPercent?: unknown }).todayAmountPercent
      )
      const cumulativeAmount = parseNumericField(
        (item as { cumulativeAmount?: unknown }).cumulativeAmount
      )
      const cumulativeAmountPercent = parseNumericField(
        (item as { cumulativeAmountPercent?: unknown }).cumulativeAmountPercent
      )

      // 處理今日數量（可能是 string 或 number，0 也是有效值）
      const todayQtyValue = item.todayQty
      const todayQuantity = todayQtyValue !== null && todayQtyValue !== undefined
        ? (typeof todayQtyValue === 'string' ? parseFloat(todayQtyValue) : todayQtyValue)
        : null
      
      // 處理累計數量（可能是 string 或 number，0 也是有效值）
      const totalQtyValue = item.totalQty
      const cumulativeQuantity = totalQtyValue !== null && totalQtyValue !== undefined
        ? (typeof totalQtyValue === 'string' ? parseFloat(totalQtyValue) : totalQtyValue)
        : null
      
      const rowKind = item.executionRowKind as ExecutionSummaryItem['executionRowKind'] | undefined
      const isFillable =
        rowKind === 'SECTION_HEADER'
          ? false
          : (item.fillable ?? (rowKind === 'DETAIL_ITEM' || !rowKind))

      return {
        id: uniqueId,
        itemNo: item.itemNo ?? existingItem?.itemNo ?? undefined,
        code: existingItem?.code ?? (item.pccesCode || ''),
        item: item.itemName || '',
        type: item.type ?? existingItem?.type ?? undefined,
        unit: isFillable ? (item.unit || '') : '',
        contractQuantity: isFillable ? contractQuantity : null,
        contractAmount: item.type === 'MAIN_ITEM' ? contractAmount : null,
        contractAmountPercent: item.type === 'MAIN_ITEM' ? contractAmountPercent : null,
        unitPrice: isFillable ? unitPrice : null,
        todayAmount: item.type === 'MAIN_ITEM' ? todayAmount : null,
        todayAmountPercent: item.type === 'MAIN_ITEM' ? todayAmountPercent : null,
        cumulativeAmount: item.type === 'MAIN_ITEM' ? cumulativeAmount : null,
        cumulativeAmountPercent: item.type === 'MAIN_ITEM' ? cumulativeAmountPercent : null,
        todayQuantity: isFillable ? todayQuantity : null,
        cumulativeQuantity: isFillable ? cumulativeQuantity : null,
        historicalCumulative: isFillable
          ? (cumulativeQuantity ?? 0) - (todayQuantity ?? 0)
          : undefined,
        remark: item.note?.trim() ? item.note : '',
        logicalId: item.logicalId || undefined, // ⭐ 儲存 logicalId 用於跨版本追蹤
        constructionPccesCodeId: item.constructionPccesCodeId || undefined, // 向後兼容
        depth: item.depth ?? undefined,
        parentLogicalId: item.parentLogicalId ?? undefined,
        fillable: isFillable,
        executionRowKind: rowKind
      };
    }),
    materialUsageSummary: response.materials.map((item, index) => {
      // ⭐ 處理未填寫項目（id === null）
      const isFilled = item.id !== null
      
      // 嘗試從現有報告中找到對應項目（優先根據 logicalId 匹配）
      const existingItem = item.logicalId
        ? existingReport.materialUsageSummary.find(m => m.logicalId === item.logicalId)
        : existingReport.materialUsageSummary.find(m => m.materialName === item.materialName);
      
      // 生成唯一的 id（優先使用現有的，其次使用後端的，最後使用 logicalId 或索引）
      let uniqueId: string
      if (existingItem?.id) {
        uniqueId = existingItem.id
      } else if (isFilled && item.id !== null && item.id !== undefined) {
        uniqueId = item.id.toString()
      } else if (item.logicalId) {
        uniqueId = `logical-${item.logicalId}`
      } else {
        uniqueId = `temp-${index}-${item.materialName || 'unknown'}`
      }
      
      // 處理契約數量（可能是 string 或 number）
      const contractQtyValue = (item as any).contractQuantity ?? item.contractQty
      const contractQuantity = contractQtyValue !== null && contractQtyValue !== undefined
        ? (typeof contractQtyValue === 'string' ? parseFloat(contractQtyValue) : contractQtyValue)
        : null
      
      // 處理今日數量（可能是 string 或 number，0 也是有效值）
      const todayQtyValue = item.todayQty
      const todayUsage = todayQtyValue !== null && todayQtyValue !== undefined
        ? (typeof todayQtyValue === 'string' ? parseFloat(todayQtyValue) : todayQtyValue)
        : null
      
      // 處理累計數量（可能是 string 或 number，0 也是有效值）
      const totalQtyValue = item.totalQty
      const cumulativeUsage = totalQtyValue !== null && totalQtyValue !== undefined
        ? (typeof totalQtyValue === 'string' ? parseFloat(totalQtyValue) : totalQtyValue)
        : null
      
      return {
        id: uniqueId,
        materialName: item.materialName || '',
        unit: item.unit || '',
        contractQuantity,
        todayUsage,
        cumulativeUsage, // ✅ 使用後端計算的累計值
        remark: isFilled && item.note ? item.note : '',
        logicalId: item.logicalId || undefined, // ⭐ 儲存 logicalId 用於跨版本追蹤
        constructionPccesCodeId: item.constructionPccesCodeId || undefined // 向後兼容
      };
    }),
    laborEquipmentSummary: (() => {
      // 將 API 返回的 resources 合併為前端的 laborEquipmentSummary 格式
      // API 的 resources 可能是分開的（只有 jobTitle 或只有 machineName）
      // 我們需要將它們合併回一行
      const laborMap = new Map<string, { laborType: string; todayLaborCount: number | null; cumulativeLaborCount: number | null }>();
      const equipmentMap = new Map<string, { equipmentName: string; todayEquipmentUsage: number | null; cumulativeEquipmentUsage: number | null }>();
      
      // 先處理所有 resources，分別收集工種和機具
      response.resources.forEach(item => {
        if (item.jobTitle) {
          laborMap.set(item.id.toString(), {
            laborType: item.jobTitle,
            todayLaborCount: item.todayPeople ? parseFloat(item.todayPeople) : null,
            cumulativeLaborCount: item.totalPeople ? parseFloat(item.totalPeople) : null
          });
        }
        if (item.machineName) {
          equipmentMap.set(item.id.toString(), {
            equipmentName: item.machineName,
            todayEquipmentUsage: item.todayMachine ? parseFloat(item.todayMachine) : null,
            cumulativeEquipmentUsage: item.totalMachine ? parseFloat(item.totalMachine) : null
          });
        }
      });
      
      // 合併工種和機具到同一行（如果可能）
      // 為了簡化，我們先建立所有工種的行，然後建立所有機具的行
      const result: Array<{
        id: string;
        laborType: string;
        todayLaborCount: number | null;
        cumulativeLaborCount: number | null;
        equipmentName: string;
        todayEquipmentUsage: number | null;
        cumulativeEquipmentUsage: number | null;
      }> = [];
      
      // 先加入所有工種
      laborMap.forEach((labor, id) => {
        const existingItem = existingReport.laborEquipmentSummary.find(
          l => l.laborType === labor.laborType
        );
        result.push({
          id: existingItem?.id ?? id,
          laborType: labor.laborType,
          todayLaborCount: labor.todayLaborCount,
          cumulativeLaborCount: labor.cumulativeLaborCount,
          equipmentName: '',
          todayEquipmentUsage: null,
          cumulativeEquipmentUsage: null
        });
      });
      
      // 再加入所有機具
      equipmentMap.forEach((equipment, id) => {
        const existingItem = existingReport.laborEquipmentSummary.find(
          l => l.equipmentName === equipment.equipmentName
        );
        result.push({
          id: existingItem?.id ?? id,
          laborType: '',
          todayLaborCount: null,
          cumulativeLaborCount: null,
          equipmentName: equipment.equipmentName,
          todayEquipmentUsage: equipment.todayEquipmentUsage,
          cumulativeEquipmentUsage: equipment.cumulativeEquipmentUsage
        });
      });
      
      // 如果沒有資料，至少保留一個空行
      if (result.length === 0) {
        result.push({
          id: '1',
          laborType: '',
          todayLaborCount: null,
          cumulativeLaborCount: null,
          equipmentName: '',
          todayEquipmentUsage: null,
          cumulativeEquipmentUsage: null
        });
      }
      
      return result;
    })()
  };

  return updatedReport;
};

/**
 * 匯出施工日誌為 Word 文檔
 * @param constructionId 工程ID
 * @param reportDate 日期 (YYYY-MM-DD)
 * @param version 版本：'construction' (營造) 或 'supervision' (監造)
 */
export const exportDailyReportToWord = async (
  constructionId: string,
  reportDate: string,
  version: DailyReportExportVersion = 'construction',
  options?: { signal?: AbortSignal; ownerType?: string }
): Promise<void> => {
  try {
    // 將版本參數轉換為 API 所需的類型
    const type: DailyReportExportType = version === 'construction' ? 'CONSTRUCTOR' : 'SUPERVISOR';
    const params: Record<string, string> = { type }
    if (options?.ownerType) params.ownerType = options.ownerType

    // 使用共用的 blob 下載工具（GET 請求，type 作為查詢參數）
    const response = await downloadBlob({
      url: `/management/constructions/${constructionId}/daily-reports/${reportDate}/export`,
      method: 'GET',
      params,
      timeout: 60000,
      signal: options?.signal
    });

    // 嘗試從響應標頭中提取檔案名稱
    let fileName = extractFileNameFromResponse(response);
    
    // 如果無法提取，使用預設名稱
    if (!fileName || fileName === `form_${new Date().toISOString().split('T')[0]}.docx`) {
      const versionText = version === 'construction' ? '營造' : '監造';
      const dateStr = reportDate.replace(/-/g, '');
      fileName = `工程日報表_${versionText}版_${dateStr}.docx`;
    }

    // 下載檔案
    downloadBlobAsFile(response.data, fileName);
  } catch (error) {
    console.error('匯出施工日誌失敗:', error);
    throw error;
  }
};

export default {
  getDailyReport,
  saveDailyReport,
  exportDailyReportToWord,
  convertToSaveRequest,
  convertFromDetailResponse
};
