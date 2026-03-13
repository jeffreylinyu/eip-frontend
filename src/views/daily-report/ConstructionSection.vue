<template>
  <div class="construction-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">每日施工記錄</h4>
        <p class="text-muted mb-0">記錄實際施工項目和進度</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addConstructionRecord"
        >
          <i class="fa fa-plus me-1"></i>新增施工項目
        </button>
      </div>
    </div>

    <!-- 施工記錄列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-hammer me-2"></i>每日施工記錄
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(record, index) in constructionRecords" :key="record.id || index" class="mb-3">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="input-group">
                <span class="input-group-text">{{ index + 1 }}</span>
                <textarea
                  class="form-control"
                  v-model="record.content"
                  rows="3"
                  placeholder="請輸入施工項目內容..."
                ></textarea>
                <input
                  type="number"
                  class="form-control"
                  style="max-width: 100px;"
                  v-model="record.progress"
                  min="0"
                  max="100"
                  placeholder="進度%"
                />
                <span class="input-group-text">%</span>
              </div>
            </div>
            <button 
              class="btn btn-outline-danger"
              @click="removeConstructionRecord(index)"
              title="刪除"
            >
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="constructionRecords.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-hammer fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何施工記錄</p>
        </div>
      </CardBody>
    </Card>

    <!-- 進度統計 -->
    <div class="row mt-4">
      <div class="col-md-4">
        <Card class="bg-primary text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ constructionRecords.length }}</h4>
            <p class="mb-0">施工項目數</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-4">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ averageProgress }}%</h4>
            <p class="mb-0">平均進度</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-4">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ completedTasks }}</h4>
            <p class="mb-0">已完成項目</p>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回安全衛生頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveConstructionRecords"
          :disabled="isLoading"
        >
          <i class="fa fa-save me-1"></i>儲存
        </button>
        <button 
          class="btn btn-success"
          @click="nextSection"
          :disabled="isLoading"
        >
          下一步 <i class="fa fa-arrow-right ms-1"></i>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { ConstructionRecord } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const constructionRecords = ref<ConstructionRecord[]>([])
const isLoading = ref(false)

// 計算屬性
const averageProgress = computed(() => {
  if (constructionRecords.value.length === 0) return 0
  const total = constructionRecords.value.reduce((sum, record) => sum + (record.progress || 0), 0)
  return Math.round(total / constructionRecords.value.length)
})

const completedTasks = computed(() => {
  return constructionRecords.value.filter(record => (record.progress || 0) >= 100).length
})

// 方法
const addConstructionRecord = () => {
  constructionRecords.value.push({
    content: '',
    progress: 0
  })
}

const removeConstructionRecord = (index: number) => {
  constructionRecords.value.splice(index, 1)
}

const saveConstructionRecords = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存施工記錄的 API
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/safety')
}

const nextSection = () => {
  router.push('/daily-report/notes')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的施工記錄資料
})
</script>

<style scoped>
.construction-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
