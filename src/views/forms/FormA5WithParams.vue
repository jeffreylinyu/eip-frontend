<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useProjectStore } from '@/stores/project'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import FormParameterManager from '@/components/forms/FormParameterManager.vue'
import { A5_FORM_CONFIG, getFormDefaults } from '@/config/formFields'
import { formA5Api, downloadBlobAsFile, formatFileSize, handleApiError } from '@/api/forms'
import { generateA5Params, A5_FORM_EXAMPLE } from '@/utils/a5FormExample'

const projectStore = useProjectStore()

// 狀態管理
const isLoading = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const showParameterForm = ref(false)
const formData = ref<Record<string, any>>({})
const formErrors = ref<Record<string, string>>({})

// 表單參數管理器的引用
const parameterManager = ref<InstanceType<typeof FormParameterManager> | null>(null)

// 下載歷史記錄
const downloadHistory = ref<Array<{
  id: number
  fileName: string
  downloadTime: string
  fileSize: string
  hasParameters: boolean
}>>([])

// 計算屬性
const canDownload = computed(() => {
  return !isDownloading.value
})

const canDownloadWithParams = computed(() => {
  return !isDownloading.value && parameterManager.value?.isValid()
})

const formInfoSummary = computed(() => {
  const config = A5_FORM_CONFIG
  const totalFields = config.sections.reduce((total, section) => total + section.fields.length, 0)
  const requiredFields = config.sections.reduce((total, section) => 
    total + section.fields.filter(field => field.required).length, 0)
  
  return {
    totalSections: config.sections.length,
    totalFields,
    requiredFields,
    version: config.version
  }
})

// 方法
const downloadEmptyForm = async () => {
  if (!canDownload.value) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  let progressInterval: number | null = null
  
  try {
    // 進度模擬
    progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += Math.random() * 15
      }
    }, 200)
    
    // 下載空白表單
    const blob = await formA5Api.downloadReport()
    
    downloadProgress.value = 100
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    
    // 生成檔案名稱
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const fileName = `A-5_施工計畫書_空白表單_${dateStr}.docx`
    
    // 下載文件
    downloadBlobAsFile(blob, fileName)
    
    // 添加到下載歷史
    addToDownloadHistory(fileName, blob.size, false)
    
    showToast('下載成功', `${fileName} 已開始下載`, 'success')
    
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

const downloadWithParameters = async () => {
  if (!canDownloadWithParams.value || !parameterManager.value) return
  
  // 驗證表單
  const isValid = parameterManager.value.validate()
  if (!isValid) {
    showToast('驗證失敗', '請先填寫所有必填欄位', 'warning')
    return
  }
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  let progressInterval: number | null = null
  
  try {
    // 進度模擬
    progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += Math.random() * 10
      }
    }, 250)
    
    // 獲取表單資料
    const currentFormData = parameterManager.value.getFormData()
    
    // 準備 A-5 專用參數
    const a5Params = generateA5Params(currentFormData, projectStore.currentProject?.constructionId)
    
    // 下載含參數的表單
    const blob = await formA5Api.downloadReport(a5Params)
    
    downloadProgress.value = 100
    if (progressInterval) {
      clearInterval(progressInterval)
      progressInterval = null
    }
    
    // 生成檔案名稱
    const now = new Date()
    const dateStr = now.toISOString().split('T')[0]
    const projectName = currentFormData.projectName || a5Params.title || '未命名工程'
    const fileName = `A-5_施工計畫書_${projectName}_${dateStr}.docx`
    
    // 下載文件
    downloadBlobAsFile(blob, fileName)
    
    // 添加到下載歷史
    addToDownloadHistory(fileName, blob.size, true)
    
    showToast('下載成功', `${fileName} 已開始下載`, 'success')
    
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

const saveFormData = async () => {
  if (!parameterManager.value) return
  
  // 驗證表單
  const isValid = parameterManager.value.validate()
  if (!isValid) {
    showToast('驗證失敗', '請先填寫所有必填欄位', 'warning')
    return
  }
  
  isLoading.value = true
  
  try {
    const currentFormData = parameterManager.value.getFormData()
    
    const updateData = {
      formData: currentFormData,
      projectId: projectStore.currentProject?.constructionId,
      workspaceId: undefined
    }
    
    await formA5Api.updateForm(updateData)
    showToast('儲存成功', '表單資料已成功儲存', 'success')
    
    // 標記表單為未修改狀態
    if (parameterManager.value) {
      parameterManager.value.isDirty = () => false
    }
    
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('儲存失敗', errorMessage, 'error')
  } finally {
    isLoading.value = false
  }
}

const loadExampleData = () => {
  if (!parameterManager.value) return
  
  // 載入範例資料
  const exampleData = {
    ...formData.value,
    ...A5_FORM_EXAMPLE
  }
  
  // 更新表單資料
  Object.keys(exampleData).forEach(key => {
    if (exampleData[key] !== undefined) {
      parameterManager.value?.setFieldValue(key, exampleData[key])
    }
  })
  
  showToast('範例資料已載入', '已載入測試用的範例資料', 'success')
}

const addToDownloadHistory = (fileName: string, fileSize: number, hasParameters: boolean) => {
  const newRecord = {
    id: downloadHistory.value.length + 1,
    fileName,
    downloadTime: new Date().toLocaleString('zh-TW'),
    fileSize: formatFileSize(fileSize),
    hasParameters
  }
  
  downloadHistory.value.unshift(newRecord)
  
  // 限制記錄數量
  if (downloadHistory.value.length > 10) {
    downloadHistory.value = downloadHistory.value.slice(0, 10)
  }
}

const toggleParameterForm = () => {
  showParameterForm.value = !showParameterForm.value
}

const showToast = (title: string, message: string, type: 'success' | 'error' | 'warning' = 'success') => {
  // console.log(`${type}: ${title} - ${message}`)
  // 這裡可以整合實際的 Toast 組件
}

const onFormDataUpdate = (newData: Record<string, any>) => {
  formData.value = newData
}

const onFormValidate = (errors: Record<string, string>) => {
  formErrors.value = errors
}

// 生命週期
onMounted(() => {
  // 初始化表單預設值
  formData.value = {
    ...getFormDefaults('A-5'),
    // 設定預設值
    constructionId: projectStore.currentProject?.constructionId || '',
    title: 'A-5 施工計畫書',
    supervisoryName: '',
    supervisoryFactory: '',
    contractDate: '',
    startDate: '',
    endDate: '',
    workedDay: '',
    disbursementAdvancePayment: '',
    estimateAmount: '',
    adjustPriceIndex: '',
    deductAmount: '',
    retention: '',
    deductionAdvancePayment: '',
    comment: '',
    deductedColumnReason: '',
    explainActualAmount: ''
  }
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <PageHeader
          title="A-5 施工計畫書"
          icon="fa fa-file-alt"
          :breadcrumbs="[
            { text: '表單生成與管理', href: 'javascript:;' },
            { text: 'A類表單', href: 'javascript:;' },
            { text: 'A-5 施工計畫書（含參數）', active: true }
          ]"
        />

        <div class="row">
          <!-- 左側：表單資訊與快速操作 -->
          <div class="col-lg-4 mb-4">
            
            <!-- 表單資訊 -->
            <Card class="mb-4">
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-info-circle me-2"></i>
                  <h5 class="mb-0">表單資訊</h5>
                </div>
              </CardHeader>
              <CardBody>
                <div class="row text-center mb-3">
                  <div class="col-6">
                    <div class="border rounded p-2">
                      <div class="text-muted small">版本</div>
                      <div class="fw-bold">{{ formInfoSummary.version }}</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="border rounded p-2">
                      <div class="text-muted small">區段數</div>
                      <div class="fw-bold">{{ formInfoSummary.totalSections }}</div>
                    </div>
                  </div>
                </div>
                
                <div class="row text-center">
                  <div class="col-6">
                    <div class="border rounded p-2">
                      <div class="text-muted small">總欄位</div>
                      <div class="fw-bold">{{ formInfoSummary.totalFields }}</div>
                    </div>
                  </div>
                  <div class="col-6">
                    <div class="border rounded p-2">
                      <div class="text-muted small">必填欄位</div>
                      <div class="fw-bold text-danger">{{ formInfoSummary.requiredFields }}</div>
                    </div>
                  </div>
                </div>
              </CardBody>
            </Card>

            <!-- 快速操作 -->
            <Card class="mb-4">
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-download me-2"></i>
                  <h5 class="mb-0">快速下載</h5>
                </div>
              </CardHeader>
              <CardBody>
                <div class="d-grid gap-2">
                  <button 
                    class="btn btn-outline-theme"
                    @click="downloadEmptyForm"
                    :disabled="!canDownload"
                  >
                    <i class="fa fa-file me-2"></i>
                    下載空白表單
                    <small class="d-block">台北市政府建管處版本</small>
                  </button>
                  
                  <button 
                    class="btn btn-theme"
                    @click="toggleParameterForm"
                  >
                    <i class="fa fa-edit me-2"></i>
                    {{ showParameterForm ? '隱藏' : '顯示' }}參數設定
                  </button>
                </div>
                
                <div class="mt-3 text-center">
                  <small class="text-muted">
                    空白表單無需填寫參數，適合手動填寫
                  </small>
                  <div class="mt-2">
                    <small class="text-primary">
                      <i class="fa fa-info-circle me-1"></i>
                      目前提供台北市政府建管處核定版本
                    </small>
                  </div>
                </div>
              </CardBody>
            </Card>

            <!-- 下載歷史 -->
            <Card>
              <CardHeader>
                <div class="d-flex align-items-center">
                  <i class="fa fa-history me-2"></i>
                  <h5 class="mb-0">下載歷史</h5>
                </div>
              </CardHeader>
              <CardBody>
                <div v-if="downloadHistory.length === 0" class="text-center py-3">
                  <i class="fa fa-download fa-2x text-muted mb-2"></i>
                  <p class="text-muted small mb-0">尚無下載記錄</p>
                </div>
                
                <div v-else>
                  <div 
                    v-for="record in downloadHistory" 
                    :key="record.id"
                    class="border rounded p-2 mb-2"
                  >
                    <div class="d-flex justify-content-between align-items-start mb-1">
                      <div class="flex-grow-1">
                        <div class="small fw-bold">{{ record.fileName }}</div>
                        <div class="d-flex align-items-center mt-1">
                          <span 
                            class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1"
                            :class="{
                              'border-success text-success': record.hasParameters,
                              'border-secondary text-secondary': !record.hasParameters
                            }"
                          >
                            {{ record.hasParameters ? '含參數' : '空白表單' }}
                          </span>
                          <small class="text-muted">{{ record.fileSize }}</small>
                        </div>
                      </div>
                    </div>
                    <div class="text-muted small">{{ record.downloadTime }}</div>
                  </div>
                </div>
              </CardBody>
            </Card>
          </div>

          <!-- 右側：參數設定表單 -->
          <div class="col-lg-8">
            <div v-show="showParameterForm">
              <!-- 表單參數管理器 -->
              <FormParameterManager
                ref="parameterManager"
                :form-config="A5_FORM_CONFIG"
                :initial-data="formData"
                @update:modelValue="onFormDataUpdate"
                @validate="onFormValidate"
              />

              <!-- 操作按鈕 -->
              <Card class="mt-4">
                <CardBody>
                  <div class="d-flex justify-content-between align-items-center">
                    <div class="text-muted">
                      <i class="fa fa-info-circle me-1"></i>
                      <span v-if="Object.keys(formErrors).length === 0">
                        表單驗證通過，可以下載
                      </span>
                      <span v-else class="text-danger">
                        發現 {{ Object.keys(formErrors).length }} 個驗證錯誤
                      </span>
                    </div>
                    
                    <div class="btn-group">
                      <button 
                        class="btn btn-outline-info"
                        @click="loadExampleData"
                        :disabled="isLoading"
                      >
                        <i class="fa fa-file-text me-1"></i>
                        載入範例
                      </button>
                      
                      <button 
                        class="btn btn-outline-secondary"
                        @click="saveFormData"
                        :disabled="isLoading || Object.keys(formErrors).length > 0"
                      >
                        <i class="fa fa-save me-1"></i>
                        {{ isLoading ? '儲存中...' : '儲存資料' }}
                      </button>
                      
                      <button 
                        class="btn btn-theme"
                        @click="downloadWithParameters"
                        :disabled="!canDownloadWithParams"
                      >
                        <i 
                          class="fa me-1" 
                          :class="{ 'fa-spin fa-spinner': isDownloading, 'fa-download': !isDownloading }"
                        ></i>
                        {{ isDownloading ? '處理中...' : '下載表單' }}
                      </button>
                    </div>
                  </div>

                  <!-- 下載進度 -->
                  <div v-if="isDownloading" class="mt-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                      <span class="small">正在生成表單...</span>
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

            <!-- 參數表單隱藏時的提示 -->
            <Card v-show="!showParameterForm">
              <CardBody class="text-center py-5">
                <i class="fa fa-edit fa-3x text-muted mb-3"></i>
                <h5 class="text-muted mb-2">參數化表單</h5>
                <p class="text-muted mb-3">
                  填寫表單參數後，系統將自動生成包含您資料的施工計畫書
                </p>
                <button 
                  class="btn btn-theme"
                  @click="toggleParameterForm"
                >
                  <i class="fa fa-edit me-2"></i>
                  開始填寫參數
                </button>
              </CardBody>
            </Card>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.cursor-pointer {
  cursor: pointer;
}

@media (max-width: 768px) {
  .page-header {
    font-size: 1.5rem;
  }
}
</style>
