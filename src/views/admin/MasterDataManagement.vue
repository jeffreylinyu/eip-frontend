<template>
  <div>
    <!-- 頁面標題 -->
    <PageHeader
      title="根基資料維護"
      icon="fa fa-database"
      :breadcrumbs="[
        { text: '系統管理', href: 'javascript:;' },
        { text: '根基資料維護', active: true }
      ]"
    />

    <!-- 權限檢查提示 -->
    <div v-if="!hasAdminPermission" class="alert alert-warning" role="alert">
      <i class="fa fa-exclamation-triangle me-2"></i>
      您沒有權限訪問此頁面。此功能僅限系統管理員使用。
    </div>

    <!-- 主要內容 -->
    <div v-else>
      <!-- 標籤頁 -->
      <ul class="nav nav-tabs mb-4" role="tablist">
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'material' }"
            @click="activeTab = 'material'"
            type="button"
          >
            <i class="fa fa-cube me-2"></i>
            材料品質標準
          </button>
        </li>
        <li class="nav-item" role="presentation">
          <button
            class="nav-link"
            :class="{ active: activeTab === 'work-process' }"
            @click="activeTab = 'work-process'"
            type="button"
          >
            <i class="fa fa-tasks me-2"></i>
            施工抽查程序
          </button>
        </li>
      </ul>

      <!-- 材料品質標準標籤頁 -->
      <div v-show="activeTab === 'material'">
        <Card>
          <CardHeader class="d-flex justify-content-between align-items-center">
            <span class="fw-bold">材料品質標準列表</span>
            <button
              type="button"
              class="btn btn-theme btn-sm"
              @click="openMaterialModal()"
            >
              <i class="fa fa-plus me-1"></i>
              新增材料標準
            </button>
          </CardHeader>
          <CardBody>
            <!-- 搜尋區域 -->
            <div class="row mb-3">
              <div class="col-md-6">
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="materialSearchKeyword"
                    placeholder="搜尋 PCCES 編號或項目名稱..."
                    @keyup.enter="loadMaterials"
                  />
                </div>
              </div>
              <div class="col-md-6 text-end">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="loadMaterials"
                >
                  <i class="fa fa-search me-1"></i>
                  搜尋
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary ms-2"
                  @click="resetMaterialSearch"
                >
                  <i class="fa fa-times me-1"></i>
                  清除
                </button>
              </div>
            </div>

            <!-- 資料表格 -->
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="table-theme">
                  <tr>
                    <th width="10%">PCCES 編號</th>
                    <th width="20%">項目名稱</th>
                    <th width="15%">檢查標準</th>
                    <th width="15%">檢查方法</th>
                    <th width="20%">適用第一級</th>
                    <th width="10%">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="isLoadingMaterials">
                    <td colspan="6" class="text-center py-4">
                      <div class="spinner-border spinner-border-sm text-theme" role="status">
                        <span class="visually-hidden">載入中...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="materials.length === 0">
                    <td colspan="6" class="text-center text-muted py-4">
                      尚無資料
                    </td>
                  </tr>
                  <tr v-else v-for="item in materials" :key="item.id">
                    <td>{{ item.pccesCode }}</td>
                    <td>{{ item.itemName }}</td>
                    <td>{{ item.checkStandard || '-' }}</td>
                    <td>{{ item.checkMethod || '-' }}</td>
                    <td>{{ item.applyFirstLevel || '-' }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-warning me-1"
                        @click="openMaterialModal(item)"
                      >
                        <i class="fa fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        @click="confirmDeleteMaterial(item)"
                      >
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 分頁 -->
            <div
              v-if="materialTotalPages > 1"
              class="d-flex justify-content-between align-items-center mt-3"
            >
              <div class="text-muted">
                顯示第 {{ (materialCurrentPage - 1) * materialPageSize + 1 }} -
                {{ Math.min(materialCurrentPage * materialPageSize, materialTotalElements) }} 項，共
                {{ materialTotalElements }} 項
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li
                    class="page-item"
                    :class="{ disabled: materialCurrentPage === 1 }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="materialCurrentPage > 1 && goToMaterialPage(materialCurrentPage - 1)"
                    >
                      上一頁
                    </a>
                  </li>
                  <li
                    v-for="page in materialTotalPages"
                    :key="page"
                    class="page-item"
                    :class="{ active: page === materialCurrentPage }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="goToMaterialPage(page)"
                    >
                      {{ page }}
                    </a>
                  </li>
                  <li
                    class="page-item"
                    :class="{ disabled: materialCurrentPage === materialTotalPages }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="materialCurrentPage < materialTotalPages && goToMaterialPage(materialCurrentPage + 1)"
                    >
                      下一頁
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </CardBody>
        </Card>
      </div>

      <!-- 施工抽查程序標籤頁 -->
      <div v-show="activeTab === 'work-process'">
        <Card>
          <CardHeader class="d-flex justify-content-between align-items-center">
            <span class="fw-bold">施工抽查程序列表</span>
            <button
              type="button"
              class="btn btn-theme btn-sm"
              @click="openWorkProcessModal()"
            >
              <i class="fa fa-plus me-1"></i>
              新增抽查程序
            </button>
          </CardHeader>
          <CardBody>
            <!-- 搜尋區域 -->
            <div class="row mb-3">
              <div class="col-md-6">
                <div class="input-group">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="workProcessSearchKeyword"
                    placeholder="搜尋 PCCES 編號或項目名稱..."
                    @keyup.enter="loadWorkProcesses"
                  />
                </div>
              </div>
              <div class="col-md-6 text-end">
                <button
                  type="button"
                  class="btn btn-outline-secondary"
                  @click="loadWorkProcesses"
                >
                  <i class="fa fa-search me-1"></i>
                  搜尋
                </button>
                <button
                  type="button"
                  class="btn btn-outline-secondary ms-2"
                  @click="resetWorkProcessSearch"
                >
                  <i class="fa fa-times me-1"></i>
                  清除
                </button>
              </div>
            </div>

            <!-- 資料表格 -->
            <div class="table-responsive">
              <table class="table table-striped table-hover">
                <thead class="table-theme">
                  <tr>
                    <th width="10%">PCCES 編號</th>
                    <th width="5%">順序</th>
                    <th width="20%">項目名稱</th>
                    <th width="15%">進度</th>
                    <th width="15%">施工流程</th>
                    <th width="15%">檢查標準</th>
                    <th width="10%">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="isLoadingWorkProcesses">
                    <td colspan="7" class="text-center py-4">
                      <div class="spinner-border spinner-border-sm text-theme" role="status">
                        <span class="visually-hidden">載入中...</span>
                      </div>
                    </td>
                  </tr>
                  <tr v-else-if="workProcesses.length === 0">
                    <td colspan="7" class="text-center text-muted py-4">
                      尚無資料
                    </td>
                  </tr>
                  <tr v-else v-for="item in workProcesses" :key="item.id">
                    <td>{{ item.pccesCode }}</td>
                    <td>{{ item.stepOrder }}</td>
                    <td>{{ item.itemName }}</td>
                    <td>{{ item.progress || '-' }}</td>
                    <td>{{ item.workProcess || '-' }}</td>
                    <td>{{ item.checkStandard || '-' }}</td>
                    <td>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-warning me-1"
                        @click="openWorkProcessModal(item)"
                      >
                        <i class="fa fa-edit"></i>
                      </button>
                      <button
                        type="button"
                        class="btn btn-sm btn-outline-danger"
                        @click="confirmDeleteWorkProcess(item)"
                      >
                        <i class="fa fa-trash"></i>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 分頁 -->
            <div
              v-if="workProcessTotalPages > 1"
              class="d-flex justify-content-between align-items-center mt-3"
            >
              <div class="text-muted">
                顯示第 {{ (workProcessCurrentPage - 1) * workProcessPageSize + 1 }} -
                {{ Math.min(workProcessCurrentPage * workProcessPageSize, workProcessTotalElements) }} 項，共
                {{ workProcessTotalElements }} 項
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li
                    class="page-item"
                    :class="{ disabled: workProcessCurrentPage === 1 }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="workProcessCurrentPage > 1 && goToWorkProcessPage(workProcessCurrentPage - 1)"
                    >
                      上一頁
                    </a>
                  </li>
                  <li
                    v-for="page in workProcessTotalPages"
                    :key="page"
                    class="page-item"
                    :class="{ active: page === workProcessCurrentPage }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="goToWorkProcessPage(page)"
                    >
                      {{ page }}
                    </a>
                  </li>
                  <li
                    class="page-item"
                    :class="{ disabled: workProcessCurrentPage === workProcessTotalPages }"
                  >
                    <a
                      class="page-link"
                      href="javascript:;"
                      @click="workProcessCurrentPage < workProcessTotalPages && goToWorkProcessPage(workProcessCurrentPage + 1)"
                    >
                      下一頁
                    </a>
                  </li>
                </ul>
              </nav>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 材料標準編輯 Modal -->
    <Modal
      v-model:show="showMaterialModal"
      :title="materialFormMode === 'add' ? '新增材料標準' : '編輯材料標準'"
      size="lg"
    >
      <template #body>
        <form @submit.prevent="submitMaterialForm">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">
                PCCES 編號 <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.pccesCode"
                required
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">
                項目名稱 <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.itemName"
                required
              />
            </div>
            <div class="col-md-12 mb-3">
              <label class="form-label">檢查標準</label>
              <textarea
                class="form-control"
                v-model="materialForm.checkStandard"
                rows="3"
              />
            </div>
            <div class="col-md-12 mb-3">
              <label class="form-label">檢查方法</label>
              <textarea
                class="form-control"
                v-model="materialForm.checkMethod"
                rows="3"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">適用第一級</label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.applyFirstLevel"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">第一級檢查頻率</label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.feqCheckFirstLevel"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">第二級檢查比例</label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.checkRatioSecondLevel"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">不合格處理</label>
              <input
                type="text"
                class="form-control"
                v-model="materialForm.failureHandle"
              />
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          @click="closeMaterialModal"
        >
          取消
        </button>
        <button
          type="button"
          class="btn btn-theme"
          @click="submitMaterialForm"
          :disabled="isSubmittingMaterial"
        >
          <span
            v-if="isSubmittingMaterial"
            class="spinner-border spinner-border-sm me-2"
            role="status"
          ></span>
          {{ materialFormMode === 'add' ? '新增' : '儲存' }}
        </button>
      </template>
    </Modal>

    <!-- 施工抽查程序編輯 Modal -->
    <Modal
      v-model:show="showWorkProcessModal"
      :title="workProcessFormMode === 'add' ? '新增抽查程序' : '編輯抽查程序'"
      size="lg"
    >
      <template #body>
        <form @submit.prevent="submitWorkProcessForm">
          <div class="row">
            <div class="col-md-6 mb-3">
              <label class="form-label">
                PCCES 編號 <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.pccesCode"
                required
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">
                順序 <span class="text-danger">*</span>
              </label>
              <input
                type="number"
                class="form-control"
                v-model.number="workProcessForm.stepOrder"
                required
                min="1"
              />
            </div>
            <div class="col-md-12 mb-3">
              <label class="form-label">
                項目名稱 <span class="text-danger">*</span>
              </label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.itemName"
                required
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">進度</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.progress"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">施工流程</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.workProcess"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">管理項目</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.manageProject"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">檢查方法</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.inspectionMethod"
              />
            </div>
            <div class="col-md-12 mb-3">
              <label class="form-label">檢查標準</label>
              <textarea
                class="form-control"
                v-model="workProcessForm.checkStandard"
                rows="3"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">檢查時機</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.checkTiming"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">檢查頻率</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.checkFeq"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">不合格處理</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.failureHandle"
              />
            </div>
            <div class="col-md-6 mb-3">
              <label class="form-label">管理記錄</label>
              <input
                type="text"
                class="form-control"
                v-model="workProcessForm.manageRecord"
              />
            </div>
            <div class="col-md-12 mb-3">
              <label class="form-label">備註</label>
              <textarea
                class="form-control"
                v-model="workProcessForm.remark"
                rows="3"
              />
            </div>
          </div>
        </form>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          @click="closeWorkProcessModal"
        >
          取消
        </button>
        <button
          type="button"
          class="btn btn-theme"
          @click="submitWorkProcessForm"
          :disabled="isSubmittingWorkProcess"
        >
          <span
            v-if="isSubmittingWorkProcess"
            class="spinner-border spinner-border-sm me-2"
            role="status"
          ></span>
          {{ workProcessFormMode === 'add' ? '新增' : '儲存' }}
        </button>
      </template>
    </Modal>

    <!-- 刪除確認 Modal -->
    <Modal
      v-model:show="showDeleteModal"
      title="確認刪除"
      size="sm"
    >
      <template #body>
        <p>確定要刪除此筆資料嗎？此操作無法復原。</p>
      </template>
      <template #footer>
        <button
          type="button"
          class="btn btn-secondary"
          @click="closeDeleteModal"
        >
          取消
        </button>
        <button
          type="button"
          class="btn btn-danger"
          @click="confirmDeleteAction"
          :disabled="isDeleting"
        >
          <span
            v-if="isDeleting"
            class="spinner-border spinner-border-sm me-2"
            role="status"
          ></span>
          確定刪除
        </button>
      </template>
    </Modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, getCurrentInstance, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { masterDataApi, type PccesMaterialStandard, type PccesWorkProcessStandard } from '@/api/masterData'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import Modal from '@/components/bootstrap/Modal.vue'

const { proxy } = getCurrentInstance() as any
const route = useRoute()
const authStore = useAuthStore()

// 權限檢查
const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  
  // 檢查 role 是否為 ADMIN 或 SUPER_ADMIN
  if (user.role === 'ADMIN' || user.role === 'SUPER_ADMIN') {
    return true
  }
  
  // 檢查是否有 chief_engineer 權限（如果權限存儲在 permissions 陣列中）
  // 注意：這裡需要根據實際的權限結構調整
  // 如果 User 介面有 permissions 欄位，可以這樣檢查：
  // return user.permissions?.includes('chief_engineer') || false
  
  return false
})

// 標籤頁 - 從 URL query 參數讀取，預設為 'material'
const activeTab = ref<'material' | 'work-process'>(
  (route.query.tab as 'material' | 'work-process') || 'material'
)

// 監聽路由變化，更新標籤頁
watch(() => route.query.tab, (newTab) => {
  if (newTab === 'work-process' || newTab === 'material') {
    activeTab.value = newTab
  }
})

// ========== 材料品質標準 ==========
const materials = ref<PccesMaterialStandard[]>([])
const isLoadingMaterials = ref(false)
const materialSearchKeyword = ref('')
const materialCurrentPage = ref(1)
const materialPageSize = ref(10)
const materialTotalElements = ref(0)
const materialTotalPages = computed(() => Math.ceil(materialTotalElements.value / materialPageSize.value))

const showMaterialModal = ref(false)
const materialFormMode = ref<'add' | 'edit'>('add')
const isSubmittingMaterial = ref(false)
const materialForm = ref<Partial<PccesMaterialStandard>>({
  pccesCode: '',
  itemName: '',
  checkStandard: '',
  checkMethod: '',
  applyFirstLevel: '',
  feqCheckFirstLevel: '',
  checkRatioSecondLevel: '',
  failureHandle: '',
})

// ========== 施工抽查程序 ==========
const workProcesses = ref<PccesWorkProcessStandard[]>([])
const isLoadingWorkProcesses = ref(false)
const workProcessSearchKeyword = ref('')
const workProcessCurrentPage = ref(1)
const workProcessPageSize = ref(10)
const workProcessTotalElements = ref(0)
const workProcessTotalPages = computed(() => Math.ceil(workProcessTotalElements.value / workProcessPageSize.value))

const showWorkProcessModal = ref(false)
const workProcessFormMode = ref<'add' | 'edit'>('add')
const isSubmittingWorkProcess = ref(false)
const workProcessForm = ref<Partial<PccesWorkProcessStandard>>({
  pccesCode: '',
  stepOrder: 1,
  itemName: '',
  progress: '',
  workProcess: '',
  manageProject: '',
  inspectionMethod: '',
  checkStandard: '',
  checkTiming: '',
  checkMethod: '',
  checkFeq: '',
  failureHandle: '',
  manageRecord: '',
  remark: '',
})

// ========== 刪除相關 ==========
const showDeleteModal = ref(false)
const isDeleting = ref(false)
const deleteType = ref<'material' | 'work-process'>('material')
const deleteItemId = ref<number | null>(null)

// ========== 材料品質標準方法 ==========
const loadMaterials = async () => {
  if (!hasAdminPermission.value) return
  
  isLoadingMaterials.value = true
  try {
    const params: any = {
      page: materialCurrentPage.value - 1, // 後端使用 0-based
      size: materialPageSize.value,
    }
    if (materialSearchKeyword.value.trim()) {
      params.keyword = materialSearchKeyword.value.trim()
    }
    
    const response = await masterDataApi.searchMaterials(params)
    materials.value = response.content || []
    materialTotalElements.value = response.totalElements || 0
  } catch (error: any) {
    console.error('載入材料標準失敗:', error)
    proxy.$toast?.error(error.response?.data?.message || '載入資料失敗')
  } finally {
    isLoadingMaterials.value = false
  }
}

const resetMaterialSearch = () => {
  materialSearchKeyword.value = ''
  materialCurrentPage.value = 1
  loadMaterials()
}

const goToMaterialPage = (page: number) => {
  materialCurrentPage.value = page
  loadMaterials()
}

const openMaterialModal = (item?: PccesMaterialStandard) => {
  if (item) {
    materialFormMode.value = 'edit'
    materialForm.value = { ...item }
  } else {
    materialFormMode.value = 'add'
    materialForm.value = {
      pccesCode: '',
      itemName: '',
      checkStandard: '',
      checkMethod: '',
      applyFirstLevel: '',
      feqCheckFirstLevel: '',
      checkRatioSecondLevel: '',
      failureHandle: '',
    }
  }
  showMaterialModal.value = true
}

const closeMaterialModal = () => {
  showMaterialModal.value = false
}

const submitMaterialForm = async () => {
  if (!hasAdminPermission.value) {
    proxy.$toast?.error('您沒有權限執行此操作')
    return
  }
  
  isSubmittingMaterial.value = true
  try {
    if (materialFormMode.value === 'add') {
      await masterDataApi.createMaterial(materialForm.value as any)
      proxy.$toast?.success('新增成功')
    } else {
      const id = materialForm.value.id
      if (!id) {
        proxy.$toast?.error('缺少資料 ID')
        return
      }
      await masterDataApi.updateMaterial(id, materialForm.value)
      proxy.$toast?.success('更新成功')
    }
    closeMaterialModal()
    loadMaterials()
  } catch (error: any) {
    console.error('儲存材料標準失敗:', error)
    proxy.$toast?.error(error.response?.data?.message || '儲存失敗')
  } finally {
    isSubmittingMaterial.value = false
  }
}

const confirmDeleteMaterial = (item: PccesMaterialStandard) => {
  if (!item.id) return
  deleteType.value = 'material'
  deleteItemId.value = item.id
  showDeleteModal.value = true
}

// ========== 施工抽查程序方法 ==========
const loadWorkProcesses = async () => {
  if (!hasAdminPermission.value) return
  
  isLoadingWorkProcesses.value = true
  try {
    const params: any = {
      page: workProcessCurrentPage.value - 1, // 後端使用 0-based
      size: workProcessPageSize.value,
    }
    if (workProcessSearchKeyword.value.trim()) {
      params.keyword = workProcessSearchKeyword.value.trim()
    }
    
    const response = await masterDataApi.searchWorkProcesses(params)
    workProcesses.value = response.content || []
    workProcessTotalElements.value = response.totalElements || 0
  } catch (error: any) {
    console.error('載入施工抽查程序失敗:', error)
    proxy.$toast?.error(error.response?.data?.message || '載入資料失敗')
  } finally {
    isLoadingWorkProcesses.value = false
  }
}

const resetWorkProcessSearch = () => {
  workProcessSearchKeyword.value = ''
  workProcessCurrentPage.value = 1
  loadWorkProcesses()
}

const goToWorkProcessPage = (page: number) => {
  workProcessCurrentPage.value = page
  loadWorkProcesses()
}

const openWorkProcessModal = (item?: PccesWorkProcessStandard) => {
  if (item) {
    workProcessFormMode.value = 'edit'
    workProcessForm.value = { ...item }
  } else {
    workProcessFormMode.value = 'add'
    workProcessForm.value = {
      pccesCode: '',
      stepOrder: 1,
      itemName: '',
      progress: '',
      workProcess: '',
      manageProject: '',
      inspectionMethod: '',
      checkStandard: '',
      checkTiming: '',
      checkMethod: '',
      checkFeq: '',
      failureHandle: '',
      manageRecord: '',
      remark: '',
    }
  }
  showWorkProcessModal.value = true
}

const closeWorkProcessModal = () => {
  showWorkProcessModal.value = false
}

const submitWorkProcessForm = async () => {
  if (!hasAdminPermission.value) {
    proxy.$toast?.error('您沒有權限執行此操作')
    return
  }
  
  isSubmittingWorkProcess.value = true
  try {
    if (workProcessFormMode.value === 'add') {
      await masterDataApi.createWorkProcess(workProcessForm.value as any)
      proxy.$toast?.success('新增成功')
    } else {
      const id = workProcessForm.value.id
      if (!id) {
        proxy.$toast?.error('缺少資料 ID')
        return
      }
      await masterDataApi.updateWorkProcess(id, workProcessForm.value)
      proxy.$toast?.success('更新成功')
    }
    closeWorkProcessModal()
    loadWorkProcesses()
  } catch (error: any) {
    console.error('儲存施工抽查程序失敗:', error)
    proxy.$toast?.error(error.response?.data?.message || '儲存失敗')
  } finally {
    isSubmittingWorkProcess.value = false
  }
}

const confirmDeleteWorkProcess = (item: PccesWorkProcessStandard) => {
  if (!item.id) return
  deleteType.value = 'work-process'
  deleteItemId.value = item.id
  showDeleteModal.value = true
}

// ========== 刪除方法 ==========
const closeDeleteModal = () => {
  showDeleteModal.value = false
  deleteItemId.value = null
}

const confirmDeleteAction = async () => {
  if (!hasAdminPermission.value) {
    proxy.$toast?.error('您沒有權限執行此操作')
    return
  }
  
  if (!deleteItemId.value) return
  
  isDeleting.value = true
  try {
    if (deleteType.value === 'material') {
      await masterDataApi.deleteMaterial(deleteItemId.value)
      proxy.$toast?.success('刪除成功')
      loadMaterials()
    } else {
      await masterDataApi.deleteWorkProcess(deleteItemId.value)
      proxy.$toast?.success('刪除成功')
      loadWorkProcesses()
    }
    closeDeleteModal()
  } catch (error: any) {
    console.error('刪除失敗:', error)
    proxy.$toast?.error(error.response?.data?.message || '刪除失敗')
  } finally {
    isDeleting.value = false
  }
}

// 生命週期
onMounted(() => {
  if (hasAdminPermission.value) {
    loadMaterials()
  }
})
</script>

<style scoped>
.nav-tabs .nav-link {
  color: var(--bs-body-color);
  border: none;
  border-bottom: 2px solid transparent;
}

.nav-tabs .nav-link:hover {
  border-bottom-color: var(--bs-theme);
  color: var(--bs-theme);
}

.nav-tabs .nav-link.active {
  color: var(--bs-theme);
  border-bottom-color: var(--bs-theme);
  background-color: transparent;
}
</style>

