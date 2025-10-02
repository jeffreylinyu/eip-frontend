<template>
  <div class="tomorrow-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">明日預定進度</h4>
        <p class="text-muted mb-0">規劃隔日的施工計畫項目</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addPlan"
        >
          <i class="fa fa-plus me-1"></i>新增計畫
        </button>
      </div>
    </div>

    <!-- 明日計畫列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-calendar me-2"></i>明日預定進度
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(plan, index) in tomorrowPlans" :key="plan.id || index" class="mb-3">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="input-group">
                <span class="input-group-text">{{ index + 1 }}</span>
                <textarea
                  class="form-control"
                  v-model="plan.content"
                  rows="3"
                  placeholder="請輸入明日預定進度內容..."
                ></textarea>
              </div>
            </div>
            <button 
              class="btn btn-outline-danger"
              @click="removePlan(index)"
              title="刪除"
            >
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="tomorrowPlans.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-calendar fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何明日計畫</p>
        </div>
      </CardBody>
    </Card>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回重要記事頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="savePlans"
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
import type { TomorrowPlan } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const tomorrowPlans = ref<TomorrowPlan[]>([])
const isLoading = ref(false)

// 方法
const addPlan = () => {
  tomorrowPlans.value.push({
    content: ''
  })
}

const removePlan = (index: number) => {
  tomorrowPlans.value.splice(index, 1)
}

const savePlans = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存明日計畫的 API
    // console.log('儲存明日計畫:', tomorrowPlans.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/notes')
}

const nextSection = () => {
  router.push('/daily-report/preparer')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的明日計畫資料
  // console.log('載入明日計畫資料')
})
</script>

<style scoped>
.tomorrow-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
