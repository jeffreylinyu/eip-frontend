<template>
  <div class="safety-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">勞工安全衛生</h4>
        <p class="text-muted mb-0">記錄當日安全宣導和衛生活動</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addSafetyRecord"
        >
          <i class="fa fa-plus me-1"></i>新增安全記錄
        </button>
      </div>
    </div>

    <!-- 安全衛生記錄列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-shield-alt me-2"></i>勞工安全衛生紀錄
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(record, index) in safetyRecords" :key="record.id || index" class="mb-3">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="input-group">
                <span class="input-group-text">{{ index + 1 }}</span>
                <textarea
                  class="form-control"
                  v-model="record.content"
                  rows="3"
                  placeholder="請輸入安全衛生活動內容..."
                ></textarea>
              </div>
            </div>
            <button 
              class="btn btn-outline-danger"
              @click="removeSafetyRecord(index)"
              title="刪除"
            >
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="safetyRecords.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-shield-alt fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何安全衛生記錄</p>
        </div>
      </CardBody>
    </Card>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回檢驗頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveSafetyRecords"
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import type { SafetyRecord } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const safetyRecords = ref<SafetyRecord[]>([])
const isLoading = ref(false)

// 方法
const addSafetyRecord = () => {
  safetyRecords.value.push({
    category: 'GENERAL',
    content: ''
  })
}

const removeSafetyRecord = (index: number) => {
  safetyRecords.value.splice(index, 1)
}

const saveSafetyRecords = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存安全記錄的 API
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/inspection')
}

const nextSection = () => {
  router.push('/daily-report/construction')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的安全記錄資料
})
</script>

<style scoped>
.safety-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
