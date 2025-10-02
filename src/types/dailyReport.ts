// 工程日報表資料模型
export interface DailyReport {
  id?: string
  projectId: string
  reportDate: string
  status: 'DRAFT' | 'SUBMITTED' | 'REVIEWED' | 'APPROVED' | 'REJECTED'
  
  // 基本資訊
  basicInfo: {
    projectName: string
    contractPeriod: number
    cumulativePeriod: number
    todayPeriod: number
    todayLaborCount: number
    todayEquipmentCount: number
    todayMaterialInbound: number
  }
  
  // 天氣資訊
  weather: {
    morning: string
    afternoon: string
  }
  
  // 材料進場與使用（更新為更詳細的格式）
  materials: MaterialRecord[]
  
  // 出工紀錄（更新為結構工、口工分類）
  laborRecords: LaborRecord[]
  
  // 機具出工紀錄
  equipmentRecords: EquipmentRecord[]
  
  // 進場材料/機具/雜項紀錄
  incomingRecords: IncomingRecord[]
  
  // 現場材料檢驗
  materialInspections: InspectionRecord[]
  
  // 勞工安全衛生紀錄
  safetyRecords: SafetyRecord[]
  
  // 每日施工記錄（包含數量）
  constructionRecords: ConstructionRecord[]
  
  // 重要記事
  importantNotes: ImportantNote[]
  
  // 明日預定進度
  tomorrowPlans: TomorrowPlan[]
  
  // 製表人資訊（更新為實際的審核流程）
  preparer: {
    reportingDepartment: string    // 填報課
    supervisingDepartment: string  // 監辦課
    reviewer: string               // 核閱
    associateManager: string       // 協理
    manager: string                // 經理
    siteManager: string            // 工地主任
    generalManager: string         // 總經理
  }
  
  // 系統資訊
  createdAt?: string
  updatedAt?: string
  createdBy?: string
  updatedBy?: string
}

// 材料記錄（更新為更詳細的格式）
export interface MaterialRecord {
  id?: string
  materialName: string
  customName?: string             // 自訂材料名稱
  unit: string
  designQuantity: number          // 設計數量
  accumulatedQuantity: number     // 累計數量
  todayWork: {                    // 本日工
    morning: number
    afternoon: number
  }
  structuralWork: number          // 結構工
  laborWork: number               // 口工
  accumulatedPeriod: number       // 累計工期
  remarks: string
}

// 出工紀錄（更新為結構工、口工分類）
export interface LaborRecord {
  id?: string
  laborType: string
  customType?: string             // 自訂工種名稱
  structuralWork: number          // 結構工
  laborWork: number               // 口工
  morning: number
  afternoon: number
  night: number
  cumulative: number
  remarks: string
}

// 機具出工紀錄
export interface EquipmentRecord {
  id?: string
  equipmentName: string
  customName?: string             // 自訂機具名稱
  unit: string
  todayUsage: number
  cumulative: number
  remarks: string
}

// 進場材料/機具/雜項紀錄
export interface IncomingRecord {
  id?: string
  itemName: string
  itemType: 'MATERIAL' | 'EQUIPMENT' | 'MISCELLANEOUS'
  quantity: number
  unit: string
  remarks: string
}

// 現場材料檢驗
export interface InspectionRecord {
  id?: string
  content: string
}

// 勞工安全衛生
export interface SafetyRecord {
  id?: string
  category: 'GENERAL' | 'SPECIFIC' | 'INCIDENT'
  content: string
}

// 每日施工記錄（包含數量）
export interface ConstructionRecord {
  id?: string
  content: string
  quantity?: number
  unit?: string
  progress?: number
}

// 重要記事
export interface ImportantNote {
  id?: string
  content: string
}

// 明日預定進度
export interface TomorrowPlan {
  id?: string
  content: string
}

// 常用材料類型（更新為實際使用的材料）
export const MATERIAL_TYPES = [
  { name: '100kg/cm²混凝土', unit: 'M3' },
  { name: '140kg/cm²混凝土', unit: 'M3' },
  { name: '210kg/cm²混凝土', unit: 'M3' },
  { name: '245kg/cm²混凝土', unit: 'M3' },
  { name: '300kg/cm²混凝土', unit: 'M3' },
  { name: '420kg/cm²混凝土', unit: 'M3' },
  { name: '碎石', unit: 'M3' },
  { name: '室內', unit: 'M2' },
  { name: '外牆', unit: 'M2' },
  { name: 'MD120', unit: 'M2' },
  { name: 'MF130', unit: 'M2' },
  { name: 'MD110', unit: 'M2' },
  { name: 'MD100', unit: 'M2' },
  { name: '鋼筋', unit: '噸' },
  { name: '水泥', unit: '包' },
  { name: '砂', unit: 'M3' },
  { name: '紅磚', unit: '塊' },
  { name: '二分石', unit: 'M3' },
  { name: 'FP900A', unit: '片' },
  { name: '木工', unit: 'M2' },
  { name: '打擊', unit: '支' },
  { name: 'MD150', unit: 'M2' }
]

// 常用工種（更新為實際使用的工種）
export const LABOR_TYPES = [
  '結構工',
  '口工',
  '鋼筋工',
  '模板工',
  '混凝土工',
  '防水工',
  '油漆工',
  '泥作工',
  '拆除工',
  '清潔工',
  '水電工',
  '雜工',
  '監工',
  '安全衛生',
  '公司工',
  '工地主任'
]

// 常用機具（更新為實際使用的機具）
export const EQUIPMENT_TYPES = [
  { name: 'PC-20', unit: '台' },
  { name: 'PC-60', unit: '台' },
  { name: 'PC-100', unit: '台' },
  { name: 'PC-120', unit: '台' },
  { name: 'PC-200', unit: '台' },
  { name: 'PC-300', unit: '台' },
  { name: 'PC-400', unit: '台' },
  { name: 'MAGAGO', unit: '台' },
  { name: '挖土機', unit: '台' },
  { name: '吊車', unit: '台' },
  { name: '車', unit: '輛' }
]

// 天氣選項
export const WEATHER_OPTIONS = [
  '晴天',
  '多雲',
  '陰天',
  '雨天',
  '大雨',
  '颱風',
  '霧天',
  '雪天'
]

// 安全衛生類別
export const SAFETY_CATEGORIES = [
  { value: 'GENERAL', label: '一般安全衛生作業紀錄' },
  { value: 'SPECIFIC', label: '特定安全衛生作業紀錄' },
  { value: 'INCIDENT', label: '安全衛生事件紀錄' }
]
