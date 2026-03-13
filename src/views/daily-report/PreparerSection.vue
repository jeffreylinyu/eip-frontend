<template>
  <div class="preparer-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">製表人資訊</h4>
        <p class="text-muted mb-0">填寫製表人和相關審核人員資訊</p>
      </div>
    </div>

    <!-- 製表人資訊表單 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-user me-2"></i>製表人資訊
        </h6>
      </CardHeader>
      <CardBody>
        <div class="row">
          <div class="col-md-6 mb-3">
            <label class="form-label">填報課</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.reportingDepartment"
              placeholder="請輸入填報課"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">監辦課</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.supervisingDepartment"
              placeholder="請輸入監辦課"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">核閱</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.reviewer"
              placeholder="請輸入核閱人姓名"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">協理</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.associateManager"
              placeholder="請輸入協理姓名"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">經理</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.manager"
              placeholder="請輸入經理姓名"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">工地主任</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.siteManager"
              placeholder="請輸入工地主任姓名"
            />
          </div>
          <div class="col-md-6 mb-3">
            <label class="form-label">總經理</label>
            <input
              type="text"
              class="form-control"
              v-model="preparer.generalManager"
              placeholder="請輸入總經理姓名"
            />
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回明日進度頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="savePreparer"
          :disabled="isLoading"
        >
          <i class="fa fa-save me-1"></i>儲存
        </button>
        <button 
          class="btn btn-success"
          @click="completeReport"
          :disabled="isLoading"
        >
          <i class="fa fa-check me-1"></i>完成日誌
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const preparer = ref({
  reportingDepartment: '',
  supervisingDepartment: '',
  reviewer: '',
  associateManager: '',
  manager: '',
  siteManager: '',
  generalManager: ''
})
const isLoading = ref(false)

// 方法
const savePreparer = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存製表人資訊的 API
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const completeReport = async () => {
  isLoading.value = true
  try {
    // TODO: 實作完成日報表的 API
    router.push('/daily-report/overview')
  } catch (error) {
    console.error('完成失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/tomorrow')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的製表人資訊資料
})
</script>

<style scoped>
.preparer-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
