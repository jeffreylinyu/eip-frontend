<template>
  <div class="notes-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">重要記事</h4>
        <p class="text-muted mb-0">記錄特殊事件或異常情況</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addNote"
        >
          <i class="fa fa-plus me-1"></i>新增記事
        </button>
      </div>
    </div>

    <!-- 重要記事列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-sticky-note me-2"></i>重要記事
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(note, index) in importantNotes" :key="note.id || index" class="mb-3">
          <div class="d-flex align-items-start gap-2">
            <div class="flex-grow-1">
              <div class="input-group">
                <span class="input-group-text">{{ index + 1 }}</span>
                <textarea
                  class="form-control"
                  v-model="note.content"
                  rows="3"
                  placeholder="請輸入重要記事內容..."
                ></textarea>
              </div>
            </div>
            <button 
              class="btn btn-outline-danger"
              @click="removeNote(index)"
              title="刪除"
            >
              <i class="fa fa-trash"></i>
            </button>
          </div>
        </div>
        
        <div v-if="importantNotes.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-sticky-note fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何重要記事</p>
        </div>
      </CardBody>
    </Card>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回施工記錄頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveNotes"
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
import type { ImportantNote } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const importantNotes = ref<ImportantNote[]>([])
const isLoading = ref(false)

// 方法
const addNote = () => {
  importantNotes.value.push({
    content: ''
  })
}

const removeNote = (index: number) => {
  importantNotes.value.splice(index, 1)
}

const saveNotes = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存重要記事的 API
    // console.log('儲存重要記事:', importantNotes.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/construction')
}

const nextSection = () => {
  router.push('/daily-report/tomorrow')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的重要記事資料
  // console.log('載入重要記事資料')
})
</script>

<style scoped>
.notes-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>
