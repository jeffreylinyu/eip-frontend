<template>
  <div class="form-b-export-supervision-plan-page">
    <PageHeader
      title="匯出-監造計劃書（B-1）"
      icon="fa fa-file-export"
      :breadcrumbs="[ 
        { text: '表單匯出', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: '匯出-監造計劃書（B-1）', active: true }
      ]"
    />

    <Card>
      <CardBody>
        <!-- 匯出說明 -->
        <div class="alert alert-info mb-4">
          <h5 class="alert-heading">
            <i class="fa fa-info-circle me-2"></i>匯出說明
          </h5>
          <p class="mb-0">
            此功能將匯出監造計劃書（B-1），匯出內容會自動從以下設定頁面讀取資料。
            請確保以下頁面的資料已完整設定，以確保匯出內容的正確性。
          </p>
        </div>

        <!-- 依賴設定頁面列表 -->
        <div class="mb-4">
          <h5 class="mb-3">
            <i class="fa fa-list-check me-2"></i>依賴的設定頁面
          </h5>
          <div class="row g-3">
            <!-- 基本資料 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-primary text-white">
                        <i class="fa fa-building"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">基本資料</h6>
                      <p class="small text-muted mb-2">
                        工程名稱、工程地點、主辦機關、工程規模概述、監造公司、營造公司、設計公司、原合約工期等
                      </p>
                      <router-link 
                        to="/basic/basic-data" 
                        class="btn btn-sm btn-outline-primary"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 施工大項維護 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-success text-white">
                        <i class="fa fa-tools"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">施工項目維護</h6>
                      <p class="small text-muted mb-2">
                        施工大項列表及其抽查標準明細
                      </p>
                      <p class="small text-info mb-2">
                        <i class="fa fa-info-circle me-1"></i><strong>資料應用：</strong>會用於第六章的施工抽查程序（詳圖 A-1）、施工抽查標準（詳表 B-1）、施工抽查紀錄（詳表 C-1）
                      </p>
                      <router-link 
                        to="/forms/b-construction-maintenance" 
                        class="btn btn-sm btn-outline-success"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 工地人員 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-warning text-white">
                        <i class="fa fa-users"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">工地人員</h6>
                      <p class="small text-muted mb-2">
                        品管人員、勞安人員、行政人員、現場人員數量統計
                      </p>
                      <p class="small text-info mb-2">
                        <i class="fa fa-info-circle me-1"></i><strong>資料應用：</strong>會用於組織架構圖中
                      </p>
                      <router-link 
                        to="/basic/site-personnel" 
                        class="btn btn-sm btn-outline-warning"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 工程項目標單 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-info text-white">
                        <i class="fa fa-database"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">工程項目標單</h6>
                      <p class="small text-muted mb-2">
                        PCCES 工項資料
                      </p>
                      <p class="small text-info mb-2">
                        <i class="fa fa-info-circle me-1"></i><strong>資料應用：</strong>會直接顯示於表 1-2 主要施工項目及數量表，其他許多關聯資料也是依據這個資料為主
                      </p>
                      <router-link 
                        to="/basic/project-item-database" 
                        class="btn btn-sm btn-outline-info"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 標單材料設定 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-danger text-white">
                        <i class="fa fa-box"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">標單材料設定</h6>
                      <p class="small text-muted mb-2">
                        材料詳細設定及材料抽查標準
                      </p>
                      <p class="small text-info mb-2">
                        <i class="fa fa-info-circle me-1"></i><strong>資料應用：</strong>用於第五章（5-2、5-3、5-7 材料相關表格）
                      </p>
                      <router-link 
                        to="/forms/tender-material-settings" 
                        class="btn btn-sm btn-outline-danger"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>

            <!-- 文件檔案分類表 -->
            <div class="col-md-6">
              <Card class="h-100">
                <CardBody>
                  <div class="d-flex align-items-start">
                    <div class="flex-shrink-0">
                      <div class="icon-circle bg-secondary text-white">
                        <i class="fa fa-folder"></i>
                      </div>
                    </div>
                    <div class="flex-grow-1 ms-3">
                      <h6 class="mb-2 fw-bold">文件檔案分類表</h6>
                      <p class="small text-muted mb-2">
                        文件分類項目
                      </p>
                      <p class="small text-info mb-2">
                        <i class="fa fa-info-circle me-1"></i><strong>資料應用：</strong>用於第七章 文件紀錄管理系統
                      </p>
                      <router-link 
                        to="/forms/document-classification" 
                        class="btn btn-sm btn-outline-secondary"
                      >
                        <i class="fa fa-arrow-right me-1"></i>前往設定
                      </router-link>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>
        </div>

        <!-- 匯出操作區 -->
        <Card class="border-primary">
          <CardHeader class="bg-primary text-white">
            <h5 class="mb-0">
              <i class="fa fa-download me-2"></i>匯出監造計劃書（B-1）
            </h5>
          </CardHeader>
          <CardBody>
            <div v-if="message" :class="['alert', message.type === 'success' ? 'alert-success' : 'alert-danger']" role="alert">
              <i :class="[message.type === 'success' ? 'fa fa-check-circle' : 'fa fa-exclamation-circle', 'me-2']"></i>
              {{ message.text }}
            </div>

            <div class="mb-3">
              <p class="text-muted mb-2">
                <i class="fa fa-info-circle me-1"></i>
                匯出將使用當前工程案（<strong>{{ currentProjectName }}</strong>）的資料
              </p>
              <p class="text-muted small mb-0">
                匯出檔案格式：Microsoft Word (.docx)
              </p>
            </div>

            <div class="d-flex gap-2">
              <button 
                class="btn btn-primary btn-lg" 
                type="button" 
                :disabled="isSubmitting || !hasCurrentProject" 
                @click="handleExport"
              >
                <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                <i v-else class="fa fa-download me-2"></i>
                {{ isSubmitting ? '匯出中...' : '開始匯出' }}
              </button>
            </div>

            <div v-if="!hasCurrentProject" class="alert alert-warning mt-3 mb-0">
              <i class="fa fa-exclamation-triangle me-2"></i>
              請先選擇工程案後再進行匯出
            </div>
          </CardBody>
        </Card>
      </CardBody>
    </Card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import { formBApi, downloadBlobAsFile } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'

const router = useRouter()
const workspaceStore = useWorkspaceStore()

const isSubmitting = ref(false)
const message = ref<{ type: 'success' | 'danger'; text: string } | null>(null)

const currentProjectName = computed(() => workspaceStore.currentProject?.name || '未選擇工程案')
const hasCurrentProject = computed(() => !!workspaceStore.currentProject?.id)

const handleExport = async () => {
  const constructionId = workspaceStore.currentProject?.id
  
  if (!constructionId) {
    message.value = { type: 'danger', text: '請先選擇工程案' }
    return
  }

  message.value = null

  try {
    isSubmitting.value = true
    
    // 構建匯出請求（只需要 constructionId）
    const request = {
      itemNumber: 0,
      valueMap: {
        reportData: {
          constructionId: constructionId.trim()
        }
      }
    }
    
    const response = await formBApi.exportSupervisoryPlan(request)
    const fileName = extractFileNameFromResponse(response) || `監造計劃書_${Date.now()}.docx`
    downloadBlobAsFile(response.data, fileName)
    message.value = { type: 'success', text: '匯出成功，檔案已下載。' }
  } catch (error) {
    console.error('匯出失敗', error)
    message.value = { 
      type: 'danger', 
      text: (error as Error).message || '匯出失敗，請稍後再試。' 
    }
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped>
.form-b-export-supervision-plan-page {
  padding: 1rem;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}
</style>
