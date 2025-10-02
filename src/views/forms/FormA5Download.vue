<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Toast from '@/components/bootstrap/Toast.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import { formA5Api, downloadBlobAsFile, formatFileSize, handleApiError, type FormDownloadRequest } from '@/api/forms'
import { estimateApi, type EstimateRecord } from '@/api/estimate'

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

// 表單參數數據
const formParams = ref({
  // 基本資訊
  supervisoryName: '',
  supervisoryFactory: '',
  contractDate: '',
  startDate: '',
  finishDate: '',
  workedDay: '',
  
  // 金額相關
  disbursementAdvancePayment: '',
  estimateAmount: '',
  adjustPriceIndex: '',
  deductAmount: '',
  retention: '',
  deductionAdvancePayment: '',
  
  // 其他
  comment: '',
  deductedColumnReason: '',
  explainActualAmount: ''
})

// A-5 表單相關數據
const formInfo = {
  code: 'A-5',
  name: '估驗請款計價單',
  description: '估驗請款計價單是工程進度款項申請的重要文件，包含工程進度、計價項目、請款金額等內容。',
  category: 'A類表單',
  version: 'v2.1',
  lastUpdate: '2024-01-15',
  requiredFields: [
    '工程基本資訊',
    '計價項目明細',
    '工程進度說明',
    '請款金額計算',
    '估驗資料',
    '付款條件',
    '附件清單'
  ]
}


// 估驗詳細表資料
const estimateDetails = ref<EstimateRecord[]>([
  {
    id: 'current',
    constructionId: '',
    period: '本次',
    estimateAmount: 0,
    adjustPriceIndex: 0,
    deductAmount: 0,
    retention: 0,
    deductionAdvancePayment: 0,
    deductedReason: '',
    amountPayable: 0,
    accumulatedAdvancePayment: 0,
    cumulativeDisbursementAdvancePayment: 0,
    lastUpdateAmountContract: 0,
    notDeductedAdvancePayment: 0,
    originContractPayment: 0,
    payment: 0,
    percentageOfFinish: 0,
    percentageOfTotalFinish: 0,
    previewsAdjustPriceIndex: 0,
    previewsDeductAmount: 0,
    previewsDeductionAdvancePayment: 0,
    previewsEstimateAmount: 0,
    previewsRetention: 0,
    previewsTotalPayment: 0,
    totalAdjustPriceIndex: 0,
    totalDeductAmount: 0,
    totalDeductionAdvancePayment: 0,
    totalEstimateAmount: 0,
    totalPayment: 0,
    totalRetention: 0,
    workedDay: 0
  }
])

// 原始估驗詳細表資料（用於變更檢測）
const originalEstimateDetails = ref<EstimateRecord[]>([])

// 載入狀態
const isLoadingEstimateDetails = ref(false)

// 參數填寫區塊定義
const paramSections = [
  {
    id: 'estimate-detail',
    title: '估驗詳細表',
    icon: 'fa fa-table',
    description: '維護估驗請款計價單的詳細資料',
    isTable: true,
    fields: undefined as any // 表格類型不需要 fields
  }
]

// 最近下載記錄
const recentDownloads = ref([
  {
    id: 1,
    fileName: 'A-5_估驗請款計價單_台北市政府建管處版本_2024-01-15.docx',
    template: '台北市政府建管處版本',
    downloadTime: '2024-01-15 14:30:25',
    fileSize: '1.2 MB'
  },
  {
    id: 2,
    fileName: 'A-5_估驗請款計價單_新北市政府工務局版本_2024-01-10.docx',
    template: '新北市政府工務局版本',
    downloadTime: '2024-01-10 09:15:42',
    fileSize: '1.1 MB'
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
  
  return `A-5_估驗請款計價單_${dateStr}`
})

// 方法
const downloadForm = async () => {
  if (!canDownload.value || isDownloading.value) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  let progressInterval: number | null = null
  
  try {
    // 準備 A-5 專用參數（使用已填寫的參數）
    const a5Params = {
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
    const blob = await formA5Api.downloadReport(a5Params)
    
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
      template: 'A-5 估驗請款計價單',
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
    
    // 準備 A-5 專用參數（使用已填寫的參數）
    const a5Params = {
      constructionId: workspaceStore.currentProject?.id || '',
      title: download.fileName.replace('.docx', '').replace('.pdf', ''),
      ...formParams.value
    }
    
    const blob = await formA5Api.downloadReport(a5Params)
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
    
    // 驗證必填欄位
    const currentSection = paramSections.find(s => s.id === currentParamSection.value)
    if (currentSection) {
      // 如果是表格類型，檢查表格資料
      if (currentSection.isTable) {
        // 表格類型不需要額外驗證，資料已經在表格中維護
      } else if (currentSection.fields && currentSection.fields.length > 0) {
        // 一般欄位類型
        const requiredFields = currentSection.fields.filter(f => f.required)
        const missingFields = requiredFields.filter(f => !formParams.value[f.key as keyof typeof formParams.value])
        
        if (missingFields.length > 0) {
          showToast('驗證失敗', `請填寫必填欄位：${missingFields.map(f => f.label).join('、')}`, 'error')
          return
        }
      }
    }
    
    // 這裡可以添加保存到後端的邏輯
    // await formA5Api.saveParams(formParams.value)
    
    showToast('保存成功', '參數已成功保存', 'success')
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

// 檢查估驗記錄是否有變更
const hasEstimateRecordChanged = (currentRecord: EstimateRecord, originalRecord: EstimateRecord): boolean => {
  if (!originalRecord) return true // 如果沒有原始記錄，視為有變更
  
  return (
    currentRecord.estimateAmount !== originalRecord.estimateAmount ||
    currentRecord.adjustPriceIndex !== originalRecord.adjustPriceIndex ||
    currentRecord.deductAmount !== originalRecord.deductAmount ||
    currentRecord.retention !== originalRecord.retention ||
    currentRecord.deductionAdvancePayment !== originalRecord.deductionAdvancePayment ||
    currentRecord.deductedReason !== originalRecord.deductedReason
  )
}

// 表格操作方法
const updateEstimateDetail = (id: string, field: string, value: any) => {
  const record = estimateDetails.value.find(r => r.id === id)
  if (record) {
    (record as any)[field] = value
    // 自動計算應付金額
    if (field !== 'amountPayable') {
      record.amountPayable = record.estimateAmount + record.adjustPriceIndex - record.deductAmount - record.retention - record.deductionAdvancePayment
    }
  }
}

// 載入估驗記錄列表
const loadEstimateDetails = async () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  if (!constructionId) {
    return
  }

  try {
    isLoadingEstimateDetails.value = true
    
    const response = await estimateApi.getEstimateList({ constructionId })
    
    // 處理 API 回傳的資料
    if (response.data) {
      // 如果回傳的是陣列
      if (Array.isArray(response.data)) {
        if (response.data.length > 0) {
          estimateDetails.value = response.data.map(record => ({
            ...record,
            period: record.period || '本次',
            amountPayable: record.estimateAmount + record.adjustPriceIndex - record.deductAmount - record.retention - record.deductionAdvancePayment
          }))
        } else {
          // 設定 constructionId
          estimateDetails.value[0].constructionId = constructionId
        }
      } else {
        // 如果回傳的是單一物件（根據您提供的格式）
        const record = response.data as any
        estimateDetails.value = [{
          ...record,
          id: record.id || 'current',
          constructionId: constructionId,
          period: '本次',
          amountPayable: (record.estimateAmount || 0) + (record.adjustPriceIndex || 0) - (record.deductAmount || 0) - (record.retention || 0) - (record.deductionAdvancePayment || 0)
        }]
      }
    } else {
      // 設定 constructionId
      estimateDetails.value[0].constructionId = constructionId
    }
    
    // 儲存原始資料用於變更檢測
    originalEstimateDetails.value = JSON.parse(JSON.stringify(estimateDetails.value))
    
  } catch (error) {
    console.error('❌ 載入估驗記錄列表失敗:', error)
    showToast('載入失敗', '無法載入估驗記錄列表', 'error')
  } finally {
    isLoadingEstimateDetails.value = false
  }
}

// 新增估驗記錄
const addEstimateRecord = async () => {
  const constructionId = workspaceStore.currentProject?.id || ''
  if (!constructionId) {
    showToast('錯誤', '請先選擇工程項目', 'error')
    return
  }

  try {
    const newRecord: EstimateRecord = {
      constructionId: constructionId,
      period: '本次',
      estimateAmount: 0,
      adjustPriceIndex: 0,
      deductAmount: 0,
      retention: 0,
      deductionAdvancePayment: 0,
      deductedReason: '',
      amountPayable: 0,
      accumulatedAdvancePayment: 0,
      cumulativeDisbursementAdvancePayment: 0,
      lastUpdateAmountContract: 0,
      notDeductedAdvancePayment: 0,
      originContractPayment: 0,
      payment: 0,
      percentageOfFinish: 0,
      percentageOfTotalFinish: 0,
      previewsAdjustPriceIndex: 0,
      previewsDeductAmount: 0,
      previewsDeductionAdvancePayment: 0,
      previewsEstimateAmount: 0,
      previewsRetention: 0,
      previewsTotalPayment: 0,
      totalAdjustPriceIndex: 0,
      totalDeductAmount: 0,
      totalDeductionAdvancePayment: 0,
      totalEstimateAmount: 0,
      totalPayment: 0,
      totalRetention: 0,
      workedDay: 0
    }

    // 創建一個新的空記錄並添加到本地列表
    const newId = `est_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    newRecord.id = newId
    estimateDetails.value.push(newRecord)
    
    showToast('新增成功', '已新增空白記錄，請填寫相關資訊', 'success')
  } catch (error) {
    console.error('❌ 新增估驗記錄失敗:', error)
    showToast('新增失敗', '無法新增估驗記錄', 'error')
  }
}

// 保存估驗記錄
const saveEstimateRecord = async (record: EstimateRecord) => {
  if (!record.id || record.id.startsWith('est_')) {
    // 新增記錄
    try {
      const createRequest = {
        constructionId: record.constructionId,
        estimateAmount: record.estimateAmount,
        adjustPriceIndex: record.adjustPriceIndex,
        deductAmount: record.deductAmount,
        retention: record.retention,
        deductionAdvancePayment: record.deductionAdvancePayment,
        deductedReason: record.deductedReason || ''
      }
      
      const response = await estimateApi.createEstimate(createRequest)
      
      // 更新本地記錄的 ID
      if (response.data && response.data.id) {
        record.id = response.data.id
      }
      
      showToast('保存成功', '估驗記錄已成功保存', 'success')
    } catch (error) {
      console.error('❌ 保存估驗記錄失敗:', error)
      showToast('保存失敗', '無法保存估驗記錄', 'error')
    }
  } else {
    // 檢查是否有變更
    const originalRecord = originalEstimateDetails.value.find(orig => orig.id === record.id)
    const hasChanged = hasEstimateRecordChanged(record, originalRecord)
    
    if (hasChanged) {
      // 只有有變更的記錄才調用更新 API
      try {
        const updateRequest = {
          estimateId: record.id,
          estimateAmount: record.estimateAmount,
          originContractPayment: 0, // 預設值，可根據需要調整
          comment: '', // 預設值，可根據需要調整
          adjustPriceIndex: record.adjustPriceIndex,
          disbursementAdvancePayment: record.deductionAdvancePayment,
          retention: record.retention,
          deductedReason: record.deductedReason || ''
        }
        
        await estimateApi.updateEstimate(updateRequest)
        
        showToast('更新成功', '估驗記錄已成功更新', 'success')
      } catch (error) {
        console.error('❌ 更新估驗記錄失敗:', error)
        showToast('更新失敗', '無法更新估驗記錄', 'error')
      }
    } else {
      showToast('無變更', '估驗記錄無變更，無需更新', 'success')
    }
  }
}

const getSectionCompletionStatus = (sectionId: string) => {
  const section = paramSections.find(s => s.id === sectionId)
  if (!section) return { completed: 0, total: 0, percentage: 0 }
  
  // 如果是表格類型，檢查表格資料
  if (section.isTable) {
    const totalRecords = estimateDetails.value.length
    const completedRecords = estimateDetails.value.filter(record => 
      record.estimateAmount > 0 || record.amountPayable > 0
    ).length
    
    return {
      completed: completedRecords,
      total: totalRecords,
      percentage: totalRecords > 0 ? Math.round((completedRecords / totalRecords) * 100) : 0
    }
  }
  
  // 一般欄位類型
  if (section.fields && section.fields.length > 0) {
    const requiredFields = section.fields.filter(f => f.required)
    const completedFields = requiredFields.filter(f => formParams.value[f.key as keyof typeof formParams.value])
    
    return {
      completed: completedFields.length,
      total: requiredFields.length,
      percentage: Math.round((completedFields.length / requiredFields.length) * 100)
    }
  }
  
  return { completed: 0, total: 0, percentage: 0 }
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
    
    await formA5Api.updateForm(updateData)
    showToast('更新成功', '表單資料已成功更新', 'success')
    
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('更新失敗', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}

// 生命週期
onMounted(() => {
  // 載入估驗記錄列表
  loadEstimateDetails()
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
                <p class="text-muted mb-4">請填寫以下參數以生成完整的估驗請款計價單。點擊各區塊可進行參數設定。</p>
                
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
                          <div v-if="section.isTable" class="text-center">
                            <div class="text-white mb-2">
                              <span class="fw-bold">估驗記錄：{{ estimateDetails.length }} 筆</span>
                            </div>
                            <div class="text-white mb-2">
                              <span class="fw-bold">已完成：{{ estimateDetails.filter(r => r.estimateAmount > 0 || r.amountPayable > 0).length }} 筆</span>
                            </div>
                            <div class="text-white">
                              <span class="fw-bold">記錄總數：{{ estimateDetails.length }} 筆</span>
                            </div>
                          </div>
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
                    <span>準備下載：A-5 估驗請款計價單</span>
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
    :show="showParamsModal"
    :title="getCurrentSection()?.title || '參數填寫'"
    :icon="getCurrentSection()?.icon || 'fa fa-edit'"
    size="xl"
    modal-id="params-modal"
    :confirm-text="'保存'"
    :cancel-text="'取消'"
    :confirm-icon="'fa fa-save'"
    :is-loading="isSavingParams"
    @update:show="showParamsModal = $event"
    @confirm="saveParams"
    @hide="closeParamsModal"
  >
    <template #body>
      <div v-if="getCurrentSection()" class="params-form">
        <p class="text-muted mb-4">{{ getCurrentSection()?.description }}</p>
        
        <!-- 表格類型 -->
        <div v-if="getCurrentSection()?.isTable" class="table-responsive">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <h6 class="mb-0">估驗詳細表</h6>
            <button 
              class="btn btn-outline-primary btn-sm"
              @click="addEstimateRecord"
              :disabled="isLoadingEstimateDetails"
            >
              <i class="fa fa-plus me-1"></i>
              新增記錄
            </button>
          </div>
          <table class="table table-bordered">
            <thead class="table-light">
              <tr>
                <th style="width: 100px;">期別</th>
                <th style="width: 150px;">估驗計價款</th>
                <th style="width: 150px;">物價指數調整款</th>
                <th style="width: 120px;">扣款</th>
                <th style="width: 120px;">保留款</th>
                <th style="width: 150px;">扣回預付款</th>
                <th style="width: 150px;">應付金額</th>
                <th style="width: 80px;">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="record in estimateDetails" :key="record.id">
                <td class="fw-bold">{{ record.period }}</td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.estimateAmount"
                    @input="updateEstimateDetail(record.id!, 'estimateAmount', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    placeholder="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.adjustPriceIndex"
                    @input="updateEstimateDetail(record.id!, 'adjustPriceIndex', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    placeholder="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.deductAmount"
                    @input="updateEstimateDetail(record.id!, 'deductAmount', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    placeholder="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.retention"
                    @input="updateEstimateDetail(record.id!, 'retention', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    placeholder="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.deductionAdvancePayment"
                    @input="updateEstimateDetail(record.id!, 'deductionAdvancePayment', parseFloat(($event.target as HTMLInputElement).value) || 0)"
                    placeholder="0"
                    step="0.01"
                  />
                </td>
                <td>
                  <input 
                    type="number" 
                    class="form-control form-control-sm" 
                    v-model="record.amountPayable"
                    placeholder="自動計算"
                    step="0.01"
                    readonly
                  />
                </td>
                <td>
                  <button 
                    class="btn btn-outline-primary btn-sm"
                    @click="saveEstimateRecord(record)"
                    :disabled="isLoadingEstimateDetails"
                  >
                    <i class="fa fa-save"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
          
          <div v-if="estimateDetails.length === 0" class="text-center py-4">
            <i class="fa fa-table fa-2x text-muted mb-2"></i>
            <p class="text-muted">尚無估驗記錄</p>
          </div>
        </div>
        
        <!-- 一般欄位類型 -->
        <div v-else-if="getCurrentSection()?.fields && getCurrentSection()?.fields.length > 0" class="row">
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
