<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import Toast from '@/components/bootstrap/Toast.vue'
import { formA7Api, downloadBlobAsFile, formatFileSize, handleApiError, type FormDownloadRequest } from '@/api/forms'

const workspaceStore = useWorkspaceStore()

// 狀態管理
const isLoading = ref(false)
const isDownloading = ref(false)
const downloadProgress = ref(0)
const customFileName = ref('')
const includeWatermark = ref(false)
const includeSignature = ref(true)


// A-7 表單相關數據
const formInfo = {
  code: 'A-7',
  name: '職安報備書',
  description: '職業安全衛生管理單位(人員)設置(變更)報備書是確保工程安全衛生符合法規要求的重要文件，包含安全衛生計畫、危害評估、防護措施等內容。',
  category: 'A類表單',
  version: 'v2.1',
  lastUpdate: '2024-01-20',
  requiredFields: [
    '安全衛生政策',
    '危害辨識與評估',
    '安全衛生組織',
    '安全衛生教育訓練',
    '個人防護設備',
    '緊急應變計畫',
    '安全衛生檢查',
    '事故調查與改善'
  ]
}



// 最近下載記錄
const recentDownloads = ref([
  {
    id: 1,
    fileName: 'A-7_職安報備書_台北市政府建管處版本_2024-01-20.docx',
    template: '台北市政府建管處版本',
    downloadTime: '2024-01-20 16:45:12',
    fileSize: '1.2 MB'
  },
  {
    id: 2,
    fileName: 'A-7_職安報備書_新北市政府工務局版本_2024-01-18.docx',
    template: '新北市政府工務局版本',
    downloadTime: '2024-01-18 11:20:35',
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
  
  return `A-7_職安報備書_${dateStr}`
})

// 方法
const downloadForm = async () => {
  if (!canDownload.value || isDownloading.value) return
  
  isDownloading.value = true
  downloadProgress.value = 0
  
  let progressInterval: number | null = null
  
  try {
    // 準備 A-7 專用參數
    const a7Params = {
      title: generatedFileName.value,
      constructionId: workspaceStore.currentProject?.id || '',
      companyId: workspaceStore.currentWorkspace?.companyId || ''
    }
    
    // 開始進度模擬
    progressInterval = setInterval(() => {
      if (downloadProgress.value < 90) {
        downloadProgress.value += Math.random() * 10
      }
    }, 200)
    
    // 調用真實 API 下載文件
    const blob = await formA7Api.downloadReport(a7Params)
    
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
      template: 'A-7 職安報備書',
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
    
    // 準備 A-7 專用參數
    const a7Params = {
      title: download.fileName.replace('.docx', '').replace('.pdf', ''),
      constructionId: workspaceStore.currentProject?.id || '',
      companyId: workspaceStore.currentWorkspace?.companyId || ''
    }
    
    const blob = await formA7Api.downloadReport(a7Params)
    downloadBlobAsFile(blob, download.fileName)
    
    showToast('重新下載成功', `${download.fileName} 已開始下載`, 'success')
  } catch (error) {
    const errorMessage = handleApiError(error)
    showToast('重新下載失敗', errorMessage, 'error')
  } finally {
    isDownloading.value = false
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
    
    await formA7Api.updateForm(updateData)
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
  // 初始化邏輯
})
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        
        <!-- 頁面標題 -->
        <PageHeader
          :title="`${formInfo.code} - ${formInfo.name}`"
          icon="fa fa-shield-alt"
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

          <!-- 下載設定 -->
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
                    <span>準備下載：A-7 職安報備書</span>
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

</template>

<style scoped>
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
</style>
