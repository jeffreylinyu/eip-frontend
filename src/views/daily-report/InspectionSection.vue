<template>
  <div class="inspection-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">現場材料檢驗</h4>
        <p class="text-muted mb-0">記錄材料進場後的檢驗情況</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addInspection"
        >
          <i class="fa fa-plus me-1"></i>新增檢驗記錄
        </button>
      </div>
    </div>

    <!-- 檢驗記錄列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-search me-2"></i>現場材料檢驗紀錄
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(inspection, index) in inspections" :key="inspection.id || index" class="mb-3">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="input-group">
                <span class="input-group-text">{{ index + 1 }}</span>
                <textarea
                  class="form-control"
                  v-model="inspection.content"
                  rows="3"
                  placeholder="請輸入檢驗內容..."
                ></textarea>
              </div>
            </div>
            <button 
              class="btn btn-outline-danger"
              @click="removeInspection(index)"
              title="刪除"
            >
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="inspections.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-search fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何檢驗記錄</p>
        </div>
      </CardBody>
    </Card>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回機具頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveInspections"
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
import type { InspectionRecord } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const inspections = ref<InspectionRecord[]>([])
const isLoading = ref(false)

// 方法
const addInspection = () => {
  inspections.value.push({
    content: ''
  })
}

const removeInspection = (index: number) => {
  inspections.value.splice(index, 1)
}

const saveInspections = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存檢驗記錄的 API
    // console.log('儲存檢驗記錄:', inspections.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/equipment')
}

const nextSection = () => {
  router.push('/daily-report/safety')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的檢驗記錄資料
  // console.log('載入檢驗記錄資料')
})
</script>

<style scoped>
.inspection-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
