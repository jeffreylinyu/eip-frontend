<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Toast from '@/components/bootstrap/Toast.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { formA4Api, downloadBlobAsFile, formatFileSize, handleApiError, type FormDownloadRequest } from '@/api/forms'
import { getExtensionList, createExtension, updateExtension, deleteExtension, batchUpdateExtensions, type ExtensionRecord, ExtensionStatus, ExtensionType } from '@/api/extension'

const workspaceStore = useWorkspaceStore()

// 狀態管理
const isLoading = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const customFileName = ref('')
const includeWatermark = ref(false)
const includeSignature = ref(true)

// 參數填寫 Modal 相關狀態
const showParamsModal = ref(false)
const currentParamSection = ref('')
const isSavingParams = ref(false)

// 歷次展延核定情形資料
const extensionHistory = ref<ExtensionRecord[]>([])
const originalExtensionHistory = ref<ExtensionRecord[]>([]) // 儲存原始資料用於比較
const isLoadingExtensionHistory = ref(false)

// 表單參數數據
const formParams = ref({
  // 展延相關
  originalSchedule: '',
  revisedSchedule: '',
  impactAnalysis: '',
  mitigationMeasures: '',
  additionalCost: '',
  approvalStatus: '',
  
  // 其他
  comment: '',
  supportingDocuments: '',
  approvalDate: ''
})

// A-4 表單相關數據
const formInfo = {
  code: 'A-4',
  name: '工期展延申請總表',
  description: '工期展延申請總表是工程專案申請延長工期的正式文件，包含展延原因、影響分析、緩解措施等內容。',
  category: 'A類表單',
  version: 'v2.0',
  lastUpdate: '2024-01-10',
  requiredFields: [
    '工程基本資訊',
    '展延原因說明',
    '影響分析',
    '緩解措施',
    '展延天數',
    '相關附件',
    '審核意見'
  ]
}


// 參數填寫區塊定義
const paramSections = [
  {
    id: 'extension-history',
    title: '歷次展延核定情形',
    icon: 'fa fa-history',
    description: '維護歷次展延申請的核定情形與相關資料',
    isTable: true,
    fields: undefined as any // 表格類型不需要 fields
  }
]

// 最近下載記錄
const recentDownloads = ref([
  {
    id: 1,
    fileName: 'A-4_工期展延申請總表_台北市政府建管處版本_2024-01-10.docx',
    template: '台北市政府建管處版本',
    downloadTime: '2024-01-10 14:30:25',
    fileSize: '1.1 MB'
  },
  {
    id: 2,
    fileName: 'A-4_工期展延申請總表_新北市政府工務局版本_2024-01-08.docx',
    template: '新北市政府工務局版本',
    downloadTime: '2024-01-08 09:15:42',
    fileSize: '1.0 MB'
  }
])

// 計算屬性
const canDownload = computed(() => {
  return !isDownloading.value
})

const generatedFileName = computed(() => {
  if (customFileName.value.trim()) {
    return customFileName.value.trim()
  }
  
  const now = new Date()
  const dateStr = now.toISOString().split('T')[0]
  
  return `A-4_工期展延申請總表_${dateStr}`
})

// 方法
const downloadForm = async () => {
  if (!canDownload.value || isDownloading.value) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  let progressInterval: number | null = null
  
  try {
    // 準備 A-4 專用參數（使用已填寫的參數）
    const a4Params = {
      constructionId: workspaceStore.currentProject?.id || '',
      title: customFileName.value.trim() || generatedFileName.value,
      ...formParams.value
    }
    
    // 開始進度模擬
    progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += Math.random() * 10
      }
    }, 200)
    
    // 調用真實 API 下載文件
    const blob = await formA4Api.downloadReport(a4Params)
    
    // 完成進度
    downloadProgress.value = 100
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    
    // 生成檔案名稱
    const fileName = `${generatedFileName.value}.docx`
    
    // 下載文件
    downloadBlobAsFile(blob, fileName)
    
    // 添加到下載記錄
    const newDownload = {
      id: recentDownloads.value.length + 1,
      fileName: fileName,
      template: 'A-4 工期展延申請總表',
      downloadTime: new Date().toLocaleString('zh-TW'),
      fileSize: formatFileSize(blob.size)
    }
    
    recentDownloads.value.unshift(newDownload)
    
    // 限制記錄數量
    if (recentDownloads.value.length > 10) {
      recentDownloads.value = recentDownloads.value.slice(0, 10)
    }
    
    // 顯示成功訊息
    showToast('下載成功！', `${fileName} 已開始下載`, 'success')
    
  } catch (error) {
    console.error('下載失敗:', error)
    const errorMessage = handleApiError(error)
    showToast('下載失敗', errorMessage, 'error')
  } finally {
    if (progressInterval) {
      clearInterval(progressInterval)
    }
    isDownloading.value = false
    downloadProgress.value = 0
  }
}

const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  // 使用 Toast 組件顯示訊息
  // 這裡可以根據您的 Toast 組件實作來調整
}


const redownloadFile = async (download: any) => {
  try {
    isDownloading.value = true
    
    // 準備 A-4 專用參數（使用已填寫的參數）
    const a4Params = {
      constructionId: workspaceStore.currentProject?.id || '',
      title: download.fileName.replace('.docx', '').replace('.pdf', ''),
      ...formParams.value
    }
    
    const blob = await formA4Api.downloadReport(a4Params)
    downloadBlobAsFile(blob, download.fileName)
    
    showToast('重新下載成功', `${download.fileName} 已開始下載`, 'success')
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('重新下載失敗', errorMessage, 'error')
  } finally {
    isDownloading.value = false
  }
}

// 參數填寫相關方法
const openParamsModal = (sectionId: string) => {
  currentParamSection.value = sectionId
  showParamsModal.value = true
}

const closeParamsModal = () => {
  showParamsModal.value = false
  currentParamSection.value = ''
}

const saveParams = async () => {
  try {
    isSavingParams.value = true
    
    // 對於表格類型的區塊，不需要驗證一般欄位
    const currentSection = paramSections.find(s => s.id === currentParamSection.value)
    if (currentSection && currentSection.isTable) {
      // 表格類型的驗證邏輯已在表格操作中處理
    } else if (currentSection && currentSection.fields) {
      // 一般欄位類型的驗證
      const requiredFields = currentSection.fields.filter(f => f.required)
      const missingFields = requiredFields.filter(f => !formParams.value[f.key as keyof typeof formParams.value])
      
      if (missingFields.length > 0) {
        showToast('驗證失敗', `請填寫必填欄位：${missingFields.map(f => f.label).join('、')}`, 'error')
        return
      }
    }
    
    // 如果是表格類型，批量保存展延記錄
    if (currentSection && currentSection.isTable) {
      await saveAllExtensionRecords()
    } else {
      // 這裡可以添加保存到後端的邏輯
      // await formA4Api.saveParams(formParams.value)
      showToast('保存成功', '參數已成功保存', 'success')
    }
    closeParamsModal()
    
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('保存失敗', errorMessage, 'error')
  } finally {
    isSavingParams.value = false
  }
}

const getCurrentSection = () => {
  return paramSections.find(s => s.id === currentParamSection.value)
}

// 日期格式轉換函數
const formatDateToISO = (dateValue: string | Date): string => {
  if (!dateValue) return new Date().toISOString()
  
  if (typeof dateValue === 'string') {
    // 如果是 YYYY-MM-DD 格式，轉換為 ISO 格式
    if (dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return `${dateValue}T00:00:00`
    }
    // 如果是 datetime-local 格式，轉換為 ISO 格式
    if (dateValue.includes('T')) {
      return new Date(dateValue).toISOString()
    }
  }
  
  return new Date(dateValue).toISOString()
}

// 將 ISO 格式轉換為 datetime-local 格式
const formatISOToDateTimeLocal = (isoString: string): string => {
  if (!isoString) return ''
  
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

// 將 ISO 格式轉換為 date 格式 (YYYY-MM-DD)
const formatISOToDate = (isoString: string): string => {
  if (!isoString) return ''
  
  const date = new Date(isoString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}

// 檢查記錄是否有變更
const hasRecordChanged = (currentRecord: ExtensionRecord, originalRecord: ExtensionRecord): boolean => {
  if (!originalRecord) return true // 如果沒有原始記錄，視為有變更
  
  return (
    currentRecord.verifyNumber !== originalRecord.verifyNumber ||
    currentRecord.extendContent !== originalRecord.extendContent ||
    currentRecord.completionDateAfterExtension !== originalRecord.completionDateAfterExtension ||
    currentRecord.extendDay !== originalRecord.extendDay ||
    currentRecord.status !== originalRecord.status ||
    currentRecord.extensionType !== originalRecord.extensionType ||
    JSON.stringify(currentRecord.specificDates || []) !== JSON.stringify(originalRecord.specificDates || [])
  )
}

// 批量保存所有展延記錄
const saveAllExtensionRecords = async () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  if (!constructionId) {
    showToast('錯誤', '請先選擇工程案', 'error')
    return
  }

  let successCount = 0
  let errorCount = 0
  let createCount = 0
  let updateCount = 0


  for (const record of extensionHistory.value) {
    try {
      // 判斷是新增還是修改
      const isNewRecord = !record.extensionId || record.extensionId.startsWith('ext_')
      
      if (isNewRecord) {
        // 新增記錄
        const createRequest: any = {
          constructionId: constructionId,
          verifyNumber: record.verifyNumber || '',
          extendReason: record.extendReason || '',
          extendContent: record.extendContent,
          status: record.status || ExtensionStatus.DRAFT,
          extensionType: record.extensionType || ExtensionType.ADD_DAYS
        }
        
        // 根據展延模式添加對應的欄位
        if (record.extensionType === ExtensionType.SPECIFIC_DATES) {
          // 模式 A：指定日期免計
          createRequest.specificDates = record.specificDates || []
          // 如果沒有 extendDay，根據 specificDates 數量計算
          if (!record.extendDay && record.specificDates && record.specificDates.length > 0) {
            createRequest.extendDay = record.specificDates.length
          } else {
            createRequest.extendDay = record.extendDay || 0
          }
        } else {
          // 模式 B：直接追加天數
          createRequest.extendDate = formatDateToISO(record.completionDateAfterExtension || record.extendDate || new Date())
          createRequest.extendDay = record.extendDay || 0
        }
        
        const response = await createExtension(createRequest)
        
        // 更新本地記錄的 ID
        if (response.data && response.data.extensionId) {
          record.extensionId = response.data.extensionId
        }
        
        createCount++
        successCount++
      } else {
        // 檢查是否有變更
        const originalRecord = originalExtensionHistory.value.find(orig => orig.extensionId === record.extensionId)
        const hasChanged = hasRecordChanged(record, originalRecord)
        
        if (hasChanged) {
          // 只有有變更的記錄才調用更新 API
          const updateRequest: any = {
            extensionId: record.extensionId,
            verifyNumber: record.verifyNumber || '',
            extendContent: record.extendContent
          }
          
          // 如果狀態有變更，允許更新（管理員/主管）
          if (record.status) {
            updateRequest.status = record.status
          }
          
          // 根據展延模式添加對應的欄位
          if (record.extensionType === ExtensionType.SPECIFIC_DATES) {
            // 模式 A：指定日期免計
            updateRequest.extensionType = ExtensionType.SPECIFIC_DATES
            updateRequest.specificDates = record.specificDates || []
            // 如果沒有 extendDay，根據 specificDates 數量計算
            if (!record.extendDay && record.specificDates && record.specificDates.length > 0) {
              updateRequest.extendDay = record.specificDates.length
            } else {
              updateRequest.extendDay = record.extendDay || 0
            }
          } else {
            // 模式 B：直接追加天數
            updateRequest.extensionType = ExtensionType.ADD_DAYS
            updateRequest.extendDate = formatDateToISO(record.completionDateAfterExtension || record.extendDate || new Date())
            updateRequest.extendDay = record.extendDay || 0
          }
          
          await updateExtension(updateRequest)
          
          updateCount++
          successCount++
        } else {
        }
      }
    } catch (error) {
      console.error('❌ 保存展延記錄失敗:', error)
      errorCount++
    }
  }

  // 顯示詳細的保存結果
  if (errorCount === 0) {
    showToast('保存成功', `成功保存 ${successCount} 筆記錄（新增 ${createCount} 筆，修改 ${updateCount} 筆）`, 'success')
    
    // 更新展延後，重新查詢工程資料以取得更新後的完工日期和累計展延天數
    if (successCount > 0 && workspaceStore.currentProject) {
      try {
        // 重新查詢最新的工程案資料
        await workspaceStore.getProjectsByWorkspace(workspaceStore.currentProject.workspaceId)
        
        // 獲取更新後的工程案資料
        const updatedProject = workspaceStore.workspaceProjects.find(p => p.id === workspaceStore.currentProject?.id)
        if (updatedProject) {
          // 更新當前選中的工程案（不觸發重新載入）
          workspaceStore.setCurrentProject(updatedProject, false)
          
          // 重新載入展延列表以取得更新後的資料
          await loadExtensionHistory()
        }
      } catch (error) {
        console.error('重新載入工程資料失敗:', error)
        // 即使重新載入失敗，也不影響保存成功的提示
      }
    }
  } else {
    showToast('部分保存失敗', `成功 ${successCount} 筆，失敗 ${errorCount} 筆`, 'warning')
  }
}

const getSectionCompletionStatus = (sectionId: string) => {
  const section = paramSections.find(s => s.id === sectionId)
  if (!section) return { completed: 0, total: 0, percentage: 0 }
  
  // 如果是表格類型，計算表格資料的完成度
  if (section.isTable && sectionId === 'extension-history') {
    const totalRecords = extensionHistory.value.length
    const completedRecords = extensionHistory.value.filter(record => {
      // 基本必填欄位
      const hasBasicInfo = record.extendContent && record.extendDay > 0
      
      // 如果通過，需要核准文號；如果未通過，不需要核准文號
      const hasApprovalInfo = record.isApproved ? record.verifyNumber : true
      
      return hasBasicInfo && hasApprovalInfo
    }).length
    return {
      completed: completedRecords,
      total: totalRecords,
      percentage: totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0
    }
  }
  
  // 一般欄位的完成度計算（如果存在 fields 屬性）
  if (section.fields) {
    const requiredFields = section.fields.filter(f => f.required)
    const completedFields = requiredFields.filter(f => formParams.value[f.key as keyof typeof formParams.value])
    
    return {
      completed: completedFields.length,
      total: requiredFields.length,
      percentage: requiredFields.length > 0 ? Math.round((completedFields.length / requiredFields.length) * 100) : 0
    }
  }
  
  // 預設返回
  return { completed: 0, total: 0, percentage: 0 }
}

// 表格操作方法
const addExtensionRecord = () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  const newExtensionId = `ext_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  
  // 創建一個新的空記錄並添加到本地列表
  const newRecord: ExtensionRecord = {
    extensionId: newExtensionId,
    constructionId: constructionId,
    verifyNumber: '',
    extendReason: '',
    extendContent: '',
    extendDate: new Date().toISOString(), // 使用完整的 ISO 格式
    extendDay: 0,
    approvalDocumentNumber: '',
    completionDateAfterExtension: '',
    isApproved: false, // 預設為未通過
    // 新增欄位（審核流程與計算模式）
    status: ExtensionStatus.DRAFT, // 預設為草稿
    extensionType: ExtensionType.ADD_DAYS, // 預設為直接追加天數
    specificDates: [] // 指定日期陣列（模式 A 使用）
  }
  
  // 添加到本地列表，用戶可以直接在表格中編輯
  extensionHistory.value.push(newRecord)
  
  showToast('新增成功', '已新增空白記錄，請填寫相關資訊', 'success')
}

const removeExtensionRecord = async (extensionId: string) => {
  try {
    const response = await deleteExtension(extensionId)
    
    if (response.success) {
      const index = extensionHistory.value.findIndex(r => r.extensionId === extensionId)
      if (index > -1) {
        extensionHistory.value.splice(index, 1)
      }
      showToast('刪除成功', '展延記錄已刪除', 'success')
    } else {
      showToast('刪除失敗', response.message || '無法刪除展延記錄', 'error')
    }
  } catch (error) {
    console.error('刪除展延記錄失敗:', error)
    showToast('刪除失敗', '無法刪除展延記錄', 'error')
  }
}

const updateExtensionRecord = (extensionId: string, field: string, value: any) => {
  // 只更新本地資料，不調用 API
  const record = extensionHistory.value.find(r => r.extensionId === extensionId)
  if (record) {
    (record as any)[field] = value
    
    // 如果變更了展延模式，需要重置相關欄位
    if (field === 'extensionType') {
      if (value === ExtensionType.SPECIFIC_DATES) {
        // 切換到指定日期模式，清空 extendDay，初始化 specificDates
        record.extendDay = 0
        record.specificDates = record.specificDates || []
      } else {
        // 切換到追加天數模式，清空 specificDates
        record.specificDates = []
      }
    }
    
    // 如果變更了 specificDates，自動計算 extendDay
    if (field === 'specificDates' && record.extensionType === ExtensionType.SPECIFIC_DATES) {
      record.extendDay = Array.isArray(value) ? value.length : 0
    }
  }
}

// 獲取狀態標籤樣式
const getStatusBadgeClass = (status?: ExtensionStatus) => {
  switch (status) {
    case ExtensionStatus.APPROVED:
      return 'border-success text-success'
    case ExtensionStatus.PENDING:
      return 'border-warning text-warning'
    case ExtensionStatus.REJECTED:
      return 'border-danger text-danger'
    case ExtensionStatus.DRAFT:
    default:
      return 'border-secondary text-secondary'
  }
}

// 獲取狀態文字
const getStatusText = (status?: ExtensionStatus) => {
  switch (status) {
    case ExtensionStatus.APPROVED:
      return '已核准'
    case ExtensionStatus.PENDING:
      return '待審核'
    case ExtensionStatus.REJECTED:
      return '已退回'
    case ExtensionStatus.DRAFT:
    default:
      return '草稿'
  }
}

// 獲取展延模式標籤樣式
const getExtensionTypeBadgeClass = (extensionType?: ExtensionType) => {
  switch (extensionType) {
    case ExtensionType.SPECIFIC_DATES:
      return 'border-info text-info'
    case ExtensionType.ADD_DAYS:
    default:
      return 'border-primary text-primary'
  }
}

// 獲取展延模式文字
const getExtensionTypeText = (extensionType?: ExtensionType) => {
  switch (extensionType) {
    case ExtensionType.SPECIFIC_DATES:
      return '指定日期免計'
    case ExtensionType.ADD_DAYS:
    default:
      return '直接追加天數'
  }
}

// 添加指定日期
const addSpecificDate = (extensionId: string, dateString: string) => {
  if (!dateString) return
  
  const record = extensionHistory.value.find(r => r.extensionId === extensionId)
  if (record) {
    // 確保 specificDates 陣列存在
    if (!record.specificDates) {
      record.specificDates = []
    }
    
    // 轉換為 ISO 格式並檢查是否已存在
    const isoDate = `${dateString}T00:00:00`
    if (!record.specificDates.includes(isoDate)) {
      record.specificDates.push(isoDate)
      // 自動計算 extendDay
      record.extendDay = record.specificDates.length
    }
  }
}

// 移除指定日期
const removeSpecificDate = (extensionId: string, index: number) => {
  const record = extensionHistory.value.find(r => r.extensionId === extensionId)
  if (record && record.specificDates) {
    record.specificDates.splice(index, 1)
    // 自動計算 extendDay
    record.extendDay = record.specificDates.length
  }
}

// 更新表單資料功能
const updateFormData = async (formData: Record<string, any>) => {
  try {
    isLoading.value = true
    
    const updateData = {
      formData: formData,
      projectId: workspaceStore.currentProject?.id,
      workspaceId: undefined // 如果需要工作空間ID，請根據實際的store結構調整
    }
    
    await formA4Api.updateForm(updateData)
    showToast('更新成功', '表單資料已成功更新', 'success')
    
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('更新失敗', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}

// 載入展延列表
const loadExtensionHistory = async () => {
  try {
    isLoadingExtensionHistory.value = true
    const constructionId = workspaceStore.currentProject?.id || ''
    
    
    if (!constructionId) {
      console.warn('⚠️ 沒有 constructionId，跳過載入展延記錄')
      extensionHistory.value = []
      return
    }
    
    const response = await getExtensionList({ constructionId })
    
    
    if (response.success && response.data) {
      // 處理日期格式轉換
      extensionHistory.value = (response.data || []).map(record => {
        return {
          ...record,
          extendDate: record.extendDate ? formatISOToDateTimeLocal(record.extendDate) : '',
          // 展延後竣工日期只顯示日期，不顯示時間
          completionDateAfterExtension: record.completionDateAfterExtension ? formatISOToDate(record.completionDateAfterExtension) : (record.extendDate ? formatISOToDate(record.extendDate) : ''),
          verifyNumber: record.verifyNumber || '',
          // 確保新欄位有預設值
          status: record.status || ExtensionStatus.DRAFT,
          extensionType: record.extensionType || ExtensionType.ADD_DAYS,
          specificDates: record.specificDates || []
        }
      })
      
      // 儲存原始資料用於變更檢測
      originalExtensionHistory.value = JSON.parse(JSON.stringify(extensionHistory.value))
      
    } else {
      console.warn('展延列表回應格式異常:', response)
      extensionHistory.value = []
      originalExtensionHistory.value = []
    }
  } catch (error) {
    console.error('載入展延列表失敗:', error)
    showToast('載入失敗', '無法載入展延列表資料', 'error')
    extensionHistory.value = []
  } finally {
    isLoadingExtensionHistory.value = false
  }
}

// 監聽工程案變化
watch(() => workspaceStore.currentProject, (newProject) => {
  if (newProject && newProject.id) {
    loadExtensionHistory()
  }
}, { immediate: true })

// 生命週期
onMounted(() => {
  // 初始化邏輯
  if (workspaceStore.currentProject && workspaceStore.currentProject.id) {
    loadExtensionHistory()
  }
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <PageHeader
          :title="`${formInfo.code} - ${formInfo.name}`"
          icon="fa fa-file-alt"
          :breadcrumbs="[
            { text: '表單生成與管理', href: 'javascript:;' },
            { text: 'A類表單', href: 'javascript:;' },
            { text: `${formInfo.code} ${formInfo.name}`, active: true }
          ]"
        />

        <div class="row">
          <!-- 表單資訊 -->
          <div class="col-lg-4 mb-4">
            <Card class="h-100">
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-info-circle me-2"></i>
                  <h5 class="mb-0">表單資訊</h5>
                </div>
              </CardHeader>
              <CardBody class="d-flex flex-column h-100">
                <div class="flex-grow-1 d-flex flex-column justify-content-around">
                  <!-- 第一區塊：標籤 -->
                  <div class="d-flex align-items-center">
                    <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-2">
                      {{ formInfo.code }}
                    </span>
                    <span class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                      {{ formInfo.category }}
                    </span>
                  </div>

                  <!-- 第二區塊：標題和描述 -->
                  <div>
                    <h6 class="mb-2">{{ formInfo.name }}</h6>
                    <p class="text-muted small">{{ formInfo.description }}</p>
                  </div>

                  <!-- 第三區塊：版本資訊 -->
                  <div>
                    <div class="row">
                      <div class="col-6">
                        <div class="border rounded p-2">
                          <div class="text-muted small">版本</div>
                          <div class="fw-bold">{{ formInfo.version }}</div>
                        </div>
                      </div>
                      <div class="col-6">
                        <div class="border rounded p-2">
                          <div class="text-muted small">更新日期</div>
                          <div class="fw-bold small">{{ formInfo.lastUpdate }}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <!-- 參數填寫區塊 -->
          <div class="col-lg-8 mb-4">
            <Card>
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-edit me-2"></i>
                  <h5 class="mb-0">表單參數填寫</h5>
                </div>
              </CardHeader>
              <CardBody>
                <p class="text-muted mb-4">請填寫以下參數以生成完整的工期展延申請總表。點擊各區塊可進行參數設定。</p>
                
                <div class="row">
                  <div 
                    v-for="section in paramSections" 
                    :key="section.id"
                    class="col-lg-6 mb-3"
                  >
                    <Card 
                      class="h-100 cursor-pointer param-section-card"
                      @click="openParamsModal(section.id)"
                    >
                      <CardBody class="p-4">
                        <div class="d-flex align-items-center mb-3">
                          <div class="param-icon me-3">
                            <i :class="section.icon"></i>
                          </div>
                          <div class="flex-grow-1">
                            <h6 class="mb-1">{{ section.title }}</h6>
                            <p class="text-muted small mb-0">{{ section.description }}</p>
                          </div>
                        </div>
                        
                        <!-- 完成度顯示 -->
                        <div class="mb-3">
                          <div class="d-flex justify-content-between align-items-center mb-2">
                            <span class="small text-muted">完成度</span>
                            <span class="small fw-bold">{{ getSectionCompletionStatus(section.id).percentage }}%</span>
                          </div>
                          <div class="progress" style="height: 6px;">
                            <div 
                              class="progress-bar" 
                              :class="{
                                'bg-success': getSectionCompletionStatus(section.id).percentage === 100,
                                'bg-warning': getSectionCompletionStatus(section.id).percentage > 0 && getSectionCompletionStatus(section.id).percentage < 100,
                                'bg-secondary': getSectionCompletionStatus(section.id).percentage === 0
                              }"
                              :style="{ width: getSectionCompletionStatus(section.id).percentage + '%' }"
                            ></div>
                          </div>
                          <div class="small text-muted mt-1">
                            {{ getSectionCompletionStatus(section.id).completed }} / {{ getSectionCompletionStatus(section.id).total }} 必填項目
                          </div>
                        </div>
                        
                        <!-- 已填寫的欄位預覽 -->
                        <div class="filled-fields-preview">
                          <!-- 表格類型的預覽 -->
                          <div v-if="section.isTable && section.id === 'extension-history'" class="text-center">
                            <div class="text-white mb-2">
                              <span class="fw-bold">展延記錄：{{ extensionHistory.length }} 筆</span>
                            </div>
                            <div class="text-white mb-2">
                              <span class="fw-bold">已完成：{{ getSectionCompletionStatus(section.id).completed }} 筆</span>
                            </div>
                            <div class="text-white">
                              <span class="fw-bold">記錄總數：{{ extensionHistory.length }} 筆</span>
                            </div>
                          </div>
                          <!-- 一般欄位的預覽 -->
                          <div v-else-if="section.fields && section.fields.length > 0">
                            <div 
                              v-for="field in section.fields.slice(0, 3)" 
                              :key="field.key"
                              class="d-flex align-items-center mb-1"
                            >
                              <i 
                                class="fa me-2 small"
                                :class="formParams[field.key as keyof typeof formParams] ? 'fa-check-circle text-success' : 'fa-circle text-muted'"
                              ></i>
                              <span class="small" :class="formParams[field.key as keyof typeof formParams] ? 'text-dark' : 'text-muted'">
                                {{ field.label }}
                              </span>
                            </div>
                            <div v-if="section.fields.length > 3" class="small text-muted">
                              ... 還有 {{ section.fields.length - 3 }} 個欄位
                            </div>
                          </div>
                        </div>
                        
                        <div class="text-center mt-3">
                          <button class="btn btn-outline-theme btn-sm">
                            <i class="fa fa-edit me-1"></i>
                            填寫參數
                          </button>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

        <!-- 下載設定 -->
        <div class="row">
          <div class="col-lg-8 mb-4">
            <Card>
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-cog me-2"></i>
                  <h5 class="mb-0">下載設定</h5>
                </div>
              </CardHeader>
              <CardBody>
                <div class="row">
                  <div class="col-lg-6">
                    <div class="mb-3">
                      <label class="form-label">自訂檔案名稱</label>
                      <input 
                        type="text" 
                        class="form-control" 
                        v-model="customFileName"
                        placeholder="留空則使用預設名稱"
                      />
                      <div class="form-text small">
                        預設名稱：{{ generatedFileName }}
                      </div>
                    </div>
                  </div>
                  <div class="col-lg-6">
                    <div class="mb-3">
                      <label class="form-label">附加選項</label>
                      <div class="form-check mb-2">
                        <input 
                          class="form-check-input" 
                          type="checkbox" 
                          v-model="includeWatermark"
                          id="includeWatermark"
                        />
                        <label class="form-check-label small" for="includeWatermark">
                          包含浮水印
                        </label>
                      </div>
                      <div class="form-check">
                        <input 
                          class="form-check-input" 
                          type="checkbox" 
                          v-model="includeSignature"
                          id="includeSignature"
                        />
                        <label class="form-check-label small" for="includeSignature">
                          包含簽名欄位
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <!-- 下載按鈕區域 -->
                <div class="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                  <div class="text-muted">
                    <i class="fa fa-info-circle me-1"></i>
                    <span>準備下載：A-4 工期展延申請總表</span>
                  </div>
                  
                  <button 
                    class="btn btn-theme btn-lg"
                    @click="downloadForm"
                    :disabled="!canDownload"
                  >
                    <i 
                      class="fa me-2" 
                      :class="{ 'fa-spin fa-spinner': isDownloading, 'fa-download': !isDownloading }"
                    ></i>
                    {{ isDownloading ? '處理中...' : '下載表單' }}
                  </button>
                </div>

                <!-- 下載進度 -->
                <div v-if="isDownloading" class="mt-3">
                  <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="small">正在生成文件...</span>
                    <span class="small">{{ Math.round(downloadProgress) }}%</span>
                  </div>
                  <div class="progress">
                    <div 
                      class="progress-bar progress-bar-striped progress-bar-animated" 
                      :style="{ width: downloadProgress + '%' }"
                    ></div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <!-- 最近下載 -->
          <div class="col-lg-4 mb-4">
            <Card>
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-history me-2"></i>
                  <h5 class="mb-0">最近下載</h5>
                </div>
              </CardHeader>
              <CardBody>
                <div v-if="recentDownloads.length === 0" class="text-center py-3">
                  <i class="fa fa-download fa-2x text-muted mb-2"></i>
                  <p class="text-muted small mb-0">尚無下載記錄</p>
                </div>
                
                <div v-else>
                  <div 
                    v-for="download in recentDownloads" 
                    :key="download.id"
                    class="mb-3"
                  >
                    <Card class="download-item">
                      <CardBody class="p-3">
                        <div class="d-flex justify-content-between align-items-start mb-2">
                          <h6 class="mb-1 small">{{ download.template }}</h6>
                          <button 
                            class="btn btn-outline-theme btn-sm"
                            @click="redownloadFile(download)"
                          >
                            <i class="fa fa-download"></i>
                          </button>
                        </div>
                        <p class="text-muted small mb-1">{{ download.fileName }}</p>
                        <div class="d-flex justify-content-between">
                          <small class="text-muted">{{ download.downloadTime }}</small>
                          <small class="text-muted">{{ download.fileSize }}</small>
                        </div>
                      </CardBody>
                    </Card>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>
        </div>

      </div>
    </div>
  </div>

  <!-- 參數填寫 Modal -->
  <Modal
    v-model:show="showParamsModal"
    :title="getCurrentSection()?.title || '參數填寫'"
    :icon="getCurrentSection()?.icon || 'fa fa-edit'"
    size="xl"
    modal-id="params-modal"
    :confirm-text="'保存'"
    :cancel-text="'取消'"
    :confirm-icon="'fa fa-save'"
    :is-loading="isSavingParams"
    @confirm="saveParams"
    @hide="closeParamsModal"
  >
    <template #body>
      <div v-if="getCurrentSection()" class="params-form">
        <p class="text-muted mb-4">{{ getCurrentSection()?.description }}</p>
        
        <!-- 歷次展延核定情形表格 -->
        <div v-if="getCurrentSection()?.isTable && currentParamSection === 'extension-history'">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">歷次展延核定情形</h6>
            <button class="btn btn-outline-theme btn-sm" @click="addExtensionRecord">
              <i class="fa fa-plus me-1"></i>
              新增記錄
            </button>
          </div>
          
          <div class="table-responsive">
            <table class="table table-bordered table-hover">
            <thead class="table-light">
              <tr>
                <th style="width: 80px;">序次</th>
                <th style="width: 100px;">狀態</th>
                <th style="width: 120px;">展延模式</th>
                <th>展延因素概要</th>
                <th style="width: 120px;">核准文號</th>
                <th style="width: 100px;">展延天數</th>
                <th style="width: 120px;">展延後總工期</th>
                <th style="width: 150px;">展延後預計完工日期</th>
                <th style="width: 150px;">展延後竣工日期</th>
              </tr>
            </thead>
              <tbody v-if="!isLoadingExtensionHistory">
                <tr v-for="(record, index) in extensionHistory" :key="record.extensionId">
                  <td class="text-center">
                    <span class="badge border border-primary text-primary">
                      {{ record.sequence || (index + 1) }}
                    </span>
                  </td>
                  <td>
                    <span 
                      class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                      :class="getStatusBadgeClass(record.status)"
                    >
                      {{ getStatusText(record.status) }}
                    </span>
                  </td>
                  <td>
                    <span 
                      class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                      :class="getExtensionTypeBadgeClass(record.extensionType)"
                    >
                      {{ getExtensionTypeText(record.extensionType) }}
                    </span>
                  </td>
                  <td>
                    <textarea 
                      class="form-control form-control-sm" 
                      rows="2"
                      v-model="record.extendContent"
                      @input="updateExtensionRecord(record.extensionId, 'extendContent', ($event.target as HTMLTextAreaElement).value)"
                      placeholder="請輸入展延因素概要"
                    ></textarea>
                    <!-- 展延模式選擇 -->
                    <div class="mt-2">
                      <label class="form-label small mb-1">展延計算模式：</label>
                      <div class="d-flex gap-3">
                        <div class="form-check">
                          <input 
                            class="form-check-input" 
                            type="radio" 
                            :name="`extensionType-${record.extensionId}`"
                            :id="`extensionType-add-${record.extensionId}`"
                            :value="ExtensionType.ADD_DAYS"
                            :checked="record.extensionType === ExtensionType.ADD_DAYS || !record.extensionType"
                            @change="updateExtensionRecord(record.extensionId, 'extensionType', ExtensionType.ADD_DAYS)"
                          />
                          <label class="form-check-label small" :for="`extensionType-add-${record.extensionId}`">
                            直接追加天數
                          </label>
                        </div>
                        <div class="form-check">
                          <input 
                            class="form-check-input" 
                            type="radio" 
                            :name="`extensionType-${record.extensionId}`"
                            :id="`extensionType-specific-${record.extensionId}`"
                            :value="ExtensionType.SPECIFIC_DATES"
                            :checked="record.extensionType === ExtensionType.SPECIFIC_DATES"
                            @change="updateExtensionRecord(record.extensionId, 'extensionType', ExtensionType.SPECIFIC_DATES)"
                          />
                          <label class="form-check-label small" :for="`extensionType-specific-${record.extensionId}`">
                            指定日期免計
                          </label>
                        </div>
                      </div>
                    </div>
                    <!-- 指定日期選擇器（模式 A） -->
                    <div v-if="record.extensionType === ExtensionType.SPECIFIC_DATES" class="mt-2">
                      <label class="form-label small mb-1">選取免計日期：</label>
                      <div class="d-flex flex-column gap-2">
                        <input 
                          type="date" 
                          class="form-control form-control-sm" 
                          @change="addSpecificDate(record.extensionId, ($event.target as HTMLInputElement).value)"
                          placeholder="選擇日期"
                        />
                        <div v-if="record.specificDates && record.specificDates.length > 0" class="d-flex flex-wrap gap-1">
                          <span 
                            v-for="(date, idx) in record.specificDates" 
                            :key="idx"
                            class="badge border border-info text-info px-2 pt-5px pb-5px rounded fs-11px d-inline-flex align-items-center gap-1"
                          >
                            {{ formatISOToDate(date) }}
                            <button 
                              type="button"
                              class="btn-close btn-close-sm"
                              style="font-size: 0.6rem;"
                              @click="removeSpecificDate(record.extensionId, idx)"
                              aria-label="移除"
                            ></button>
                          </span>
                        </div>
                        <small class="text-muted">已選取 {{ record.specificDates?.length || 0 }} 天</small>
                      </div>
                    </div>
                    <!-- 狀態選擇（管理員模式） -->
                    <div class="mt-2">
                      <label class="form-label small mb-1">審核狀態：</label>
                      <select 
                        class="form-select form-select-sm" 
                        :value="record.status || ExtensionStatus.DRAFT"
                        @change="updateExtensionRecord(record.extensionId, 'status', ($event.target as HTMLSelectElement).value as ExtensionStatus)"
                      >
                        <option :value="ExtensionStatus.DRAFT">草稿</option>
                        <option :value="ExtensionStatus.PENDING">待審核</option>
                        <option :value="ExtensionStatus.APPROVED">已核准</option>
                        <option :value="ExtensionStatus.REJECTED">已退回</option>
                      </select>
                    </div>
                  </td>
                  <td>
                    <input 
                      type="text" 
                      class="form-control form-control-sm" 
                      :class="{ 'bg-light': record.status !== ExtensionStatus.APPROVED }"
                      v-model="record.verifyNumber"
                      @input="updateExtensionRecord(record.extensionId, 'verifyNumber', ($event.target as HTMLInputElement).value)"
                      placeholder="核准文號"
                      :disabled="record.status !== ExtensionStatus.APPROVED"
                    />
                  </td>
                  <td>
                    <!-- 根據模式顯示不同的輸入方式 -->
                    <div v-if="record.extensionType === ExtensionType.SPECIFIC_DATES" class="d-flex align-items-center gap-2">
                    <input 
                        type="text" 
                        class="form-control form-control-sm" 
                        :value="record.specificDates?.length || 0"
                        readonly
                        style="width: 60px; cursor: not-allowed;"
                        title="根據選取的日期數量自動計算"
                      />
                      <span class="small text-muted">天</span>
                    </div>
                    <input 
                      v-else
                      type="number" 
                      class="form-control form-control-sm" 
                      v-model="record.extendDay"
                      @input="updateExtensionRecord(record.extensionId, 'extendDay', ($event.target as HTMLInputElement).value)"
                      placeholder="天數"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      class="form-control form-control-sm bg-light" 
                      :value="record.totalDurationAfterExtension || ''"
                      readonly
                      placeholder="系統計算"
                      style="cursor: not-allowed;"
                    />
                  </td>
                  <td>
                    <input 
                      type="text" 
                      class="form-control form-control-sm bg-light" 
                      :value="record.calculatedEndDateAfterExtension ? formatISOToDate(record.calculatedEndDateAfterExtension) : ''"
                      readonly
                      placeholder="系統計算"
                      style="cursor: not-allowed;"
                    />
                  </td>
                  <td>
                    <!-- 模式 A：顯示選取的日期列表 -->
                    <div v-if="record.extensionType === ExtensionType.SPECIFIC_DATES" class="small">
                      <div v-if="record.specificDates && record.specificDates.length > 0" class="d-flex flex-wrap gap-1">
                        <span 
                          v-for="(date, idx) in record.specificDates" 
                          :key="idx"
                          class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-11px"
                        >
                          {{ formatISOToDate(date) }}
                        </span>
                      </div>
                      <span v-else class="text-muted">未選取日期</span>
                    </div>
                    <!-- 模式 B：顯示日期輸入 -->
                    <input 
                      v-else
                      type="date" 
                      class="form-control form-control-sm" 
                      v-model="record.completionDateAfterExtension"
                      @input="updateExtensionRecord(record.extensionId, 'completionDateAfterExtension', ($event.target as HTMLInputElement).value)"
                    />
                  </td>
                </tr>
              </tbody>
              <tbody v-else>
                <tr>
                  <td colspan="5" class="text-center py-4">
                    <div class="d-flex align-items-center justify-content-center">
                      <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">載入中...</span>
                      </div>
                      <span>載入展延記錄中...</span>
                    </div>
                  </td>
                </tr>
              </tbody>
              <tbody v-if="!isLoadingExtensionHistory && extensionHistory.length === 0">
                <tr>
                  <td colspan="7" class="text-center py-4 text-muted">
                    <i class="fa fa-inbox fa-2x mb-2"></i>
                    <div>尚無展延記錄</div>
                    <small>點擊「新增記錄」開始建立展延資料</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
        
        <!-- 一般表單欄位 -->
        <div v-else-if="getCurrentSection()?.fields && getCurrentSection()?.fields.length > 0">
          <div class="row">
            <div 
              v-for="field in getCurrentSection()?.fields" 
              :key="field.key"
              class="col-12 mb-3"
            >
              <label class="form-label">
                {{ field.label }}
                <span v-if="field.required" class="text-danger">*</span>
              </label>
              
              <!-- 文字輸入框 -->
              <input 
                v-if="field.type === 'text'"
                type="text" 
                class="form-control" 
                v-model="formParams[field.key as keyof typeof formParams]"
                :placeholder="`請輸入${field.label}`"
              />
              
              <!-- 日期輸入框 -->
              <input 
                v-else-if="field.type === 'date'"
                type="date" 
                class="form-control" 
                v-model="formParams[field.key as keyof typeof formParams]"
              />
              
              <!-- 日期時間輸入框 -->
              <input 
                v-else-if="field.type === 'datetime-local'"
                type="datetime-local" 
                class="form-control" 
                v-model="formParams[field.key as keyof typeof formParams]"
              />
              
              <!-- 數字輸入框 -->
              <input 
                v-else-if="field.type === 'number'"
                type="number" 
                class="form-control" 
                v-model="formParams[field.key as keyof typeof formParams]"
                :placeholder="`請輸入${field.label}`"
                step="0.01"
              />
              
              <!-- 文字區域 -->
              <textarea 
                v-else-if="field.type === 'textarea'"
                class="form-control" 
                rows="3"
                v-model="formParams[field.key as keyof typeof formParams]"
                :placeholder="`請輸入${field.label}`"
              ></textarea>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<style scoped>
.template-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.template-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.cursor-pointer {
  cursor: pointer;
}

.border-theme {
  border-color: var(--bs-theme) !important;
  border-width: 2px !important;
}

.download-item {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.download-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.page-header {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

@media (max-width: 768px) {
  .page-header {
    font-size: 1.5rem;
  }
}

/* 參數填寫區塊樣式 */
.param-section-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.param-section-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}

.param-icon {
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, var(--bs-theme), rgba(var(--bs-theme-rgb), 0.8));
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 16px;
}

.filled-fields-preview {
  background: rgba(var(--bs-light-rgb), 0.5);
  border-radius: 8px;
  padding: 12px;
  border: 1px solid rgba(var(--bs-border-color-rgb), 0.3);
}

.params-form {
  max-height: 60vh;
  overflow-y: auto;
}
</style>
