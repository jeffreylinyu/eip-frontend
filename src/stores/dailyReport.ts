import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  DailyReport,
  MaterialRecord,
  LaborRecord,
  EquipmentRecord
} from '@/types/dailyReport'

export const useDailyReportStore = defineStore('dailyReport', () => {
  // 狀態
  const currentReport = ref<DailyReport | null>(null)
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const reportHistory = ref<DailyReport[]>([])

  // 計算屬性
  const hasUnsavedChanges = computed(() => {
    // TODO: 實作檢查是否有未儲存的變更
    return false
  })

  const canSubmit = computed(() => {
    if (!currentReport.value) return false
    return currentReport.value.status === 'DRAFT' && 
           currentReport.value.basicInfo.projectName.trim() !== ''
  })

  const totalMaterials = computed(() => currentReport.value?.materials.length || 0)
  const totalLabor = computed(() => {
    if (!currentReport.value) return 0
    return currentReport.value.laborRecords.reduce((sum, record) => 
      sum + (record.morning || 0) + (record.afternoon || 0) + (record.night || 0), 0
    )
  })
  const totalEquipment = computed(() => {
    if (!currentReport.value) return 0
    return currentReport.value.equipmentRecords.reduce((sum, record) => 
      sum + (record.todayUsage || 0), 0
    )
  })

  // 方法
  const createNewReport = (projectId: string, date: string) => {
    currentReport.value = {
      projectId,
      reportDate: date,
      status: 'DRAFT',
      basicInfo: {
        projectName: '',
        contractorName: '',
        contractPeriod: 0,
        cumulativePeriod: 0,
        remainingPeriod: 0,
        extensionDays: 0,
        startDate: '',
        endDate: '',
        plannedProgress: 0,
        actualProgress: 0
      },
      weather: {
        morning: '',
        afternoon: ''
      },
      executionSummary: [
        {
          id: 'A',
          code: '',
          item: '',
          unit: '',
          contractQuantity: null,
          todayQuantity: null,
          cumulativeQuantity: null,
          remark: ''
        },
        {
          id: 'B',
          code: '',
          item: '',
          unit: '',
          contractQuantity: null,
          todayQuantity: null,
          cumulativeQuantity: null,
          remark: ''
        }
      ],
      materialUsageSummary: [
        {
          id: '1',
          materialName: '',
          unit: '',
          contractQuantity: null,
          todayUsage: null,
          cumulativeUsage: null,
          remark: ''
        }
      ],
      laborEquipmentSummary: [
        {
          id: '1',
          laborType: '',
          todayLaborCount: null,
          cumulativeLaborCount: null,
          equipmentName: '',
          todayEquipmentUsage: null,
          cumulativeEquipmentUsage: null
        }
      ],
      materials: [],
      laborRecords: [],
      equipmentRecords: [],
      incomingRecords: [],
      materialInspections: [],
      safetyRecords: [],
      constructionRecords: [],
      siteCheck: {
        hasRequiredTechnician: ''
      },
      safetyChecklist: {
        preConstructionEducation: '',
        newWorkerInsurance: '',
        personalProtectionEquipment: '',
        otherNotes: ''
      },
      qualityInspectionRecord: '',
      subcontractorNotice: '',
      importantRecord: '',
      technicianSignatureProject: '',
      technicianSignatureRequiredCount: null,
      technicianSignatureRecords: [],
      safetyInspectionRecords: [],
      importantNotes: [],
      tomorrowPlans: [],
      preparer: {
        reportingDepartment: '',
        supervisingDepartment: '',
        reviewer: '',
        associateManager: '',
        manager: '',
        siteManager: '',
        generalManager: ''
      }
    }
  }

  const loadReport = async (reportId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作載入日報表的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 這裡應該要從 API 載入資料
      // currentReport.value = await dailyReportApi.getReport(reportId)
      
    } catch (err) {
      error.value = '載入日報表失敗'
      console.error('載入日報表失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const saveDraft = async () => {
    if (!currentReport.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作儲存草稿的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 這裡應該要呼叫 API 儲存資料
      // await dailyReportApi.saveDraft(currentReport.value)
      
    } catch (err) {
      error.value = '儲存草稿失敗'
      console.error('儲存草稿失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const submitReport = async () => {
    if (!currentReport.value || !canSubmit.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作送出審核的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 更新狀態
      currentReport.value.status = 'SUBMITTED'
      
      // 這裡應該要呼叫 API 送出審核
      // await dailyReportApi.submitReport(currentReport.value.id!)
      
    } catch (err) {
      error.value = '送出審核失敗'
      console.error('送出審核失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const copyFromYesterday = async () => {
    if (!currentReport.value) return
    
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作從昨天複製資料的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 這裡應該要從 API 載入昨天的資料並複製
      // const yesterdayReport = await dailyReportApi.getYesterdayReport(currentReport.value.projectId)
      // if (yesterdayReport) {
      //   currentReport.value.materials = [...yesterdayReport.materials]
      //   currentReport.value.laborRecords = [...yesterdayReport.laborRecords]
      //   currentReport.value.equipmentRecords = [...yesterdayReport.equipmentRecords]
      //   // ... 其他欄位
      // }
      
    } catch (err) {
      error.value = '複製昨天資料失敗'
      console.error('複製昨天資料失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const loadReportHistory = async (projectId: string, startDate?: string, endDate?: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作載入日報表歷史的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 這裡應該要從 API 載入歷史資料
      // reportHistory.value = await dailyReportApi.getReportHistory(projectId, startDate, endDate)
      
    } catch (err) {
      error.value = '載入歷史記錄失敗'
      console.error('載入歷史記錄失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const exportToExcel = async (reportId: string) => {
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作匯出 Excel 的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 這裡應該要呼叫 API 匯出 Excel
      // const blob = await dailyReportApi.exportToExcel(reportId)
      // downloadBlob(blob, `工程日報表_${reportId}.xlsx`)
      
    } catch (err) {
      error.value = '匯出 Excel 失敗'
      console.error('匯出 Excel 失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const importFromExcel = async (file: File) => {
    isLoading.value = true
    error.value = null
    
    try {
      // TODO: 實作匯入 Excel 的 API
      
      // 模擬 API 回應
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // 這裡應該要呼叫 API 匯入 Excel
      // const reportData = await dailyReportApi.importFromExcel(file)
      // currentReport.value = reportData
      
    } catch (err) {
      error.value = '匯入 Excel 失敗'
      console.error('匯入 Excel 失敗:', err)
    } finally {
      isLoading.value = false
    }
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    currentReport.value = null
    isLoading.value = false
    error.value = null
    reportHistory.value = []
  }

  return {
    // 狀態
    currentReport,
    isLoading,
    error,
    reportHistory,
    
    // 計算屬性
    hasUnsavedChanges,
    canSubmit,
    totalMaterials,
    totalLabor,
    totalEquipment,
    
    // 方法
    createNewReport,
    loadReport,
    saveDraft,
    submitReport,
    copyFromYesterday,
    loadReportHistory,
    exportToExcel,
    importFromExcel,
    clearError,
    reset
  }
})
