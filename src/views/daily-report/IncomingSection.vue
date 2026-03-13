<template>
  <div class="incoming-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">進場材料/機具/雜項紀錄</h4>
        <p class="text-muted mb-0">記錄當日進場的材料、機具和雜項</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addIncomingRecord"
        >
          <i class="fa fa-plus me-1"></i>新增紀錄
        </button>
      </div>
    </div>

    <!-- 進場紀錄列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-truck me-2"></i>進場材料/機具/雜項紀錄
        </h6>
      </CardHeader>
      <CardBody>
        <div v-for="(record, index) in incomingRecords" :key="record.id || index" class="mb-3">
          <div class="row">
            <div class="col-md-3 mb-2">
              <label class="form-label">項目名稱</label>
              <input
                type="text"
                class="form-control"
                v-model="record.itemName"
                placeholder="請輸入項目名稱"
              />
            </div>
            <div class="col-md-2 mb-2">
              <label class="form-label">類型</label>
              <select class="form-select" v-model="record.itemType">
                <option value="MATERIAL">材料</option>
                <option value="EQUIPMENT">機具</option>
                <option value="MISCELLANEOUS">雜項</option>
              </select>
            </div>
            <div class="col-md-2 mb-2">
              <label class="form-label">數量</label>
              <input
                type="number"
                class="form-control"
                v-model="record.quantity"
                min="0"
                step="0.01"
                placeholder="0"
              />
            </div>
            <div class="col-md-2 mb-2">
              <label class="form-label">單位</label>
              <input
                type="text"
                class="form-control"
                v-model="record.unit"
                placeholder="單位"
              />
            </div>
            <div class="col-md-2 mb-2">
              <label class="form-label">備註</label>
              <input
                type="text"
                class="form-control"
                v-model="record.remarks"
                placeholder="備註"
              />
            </div>
            <div class="col-md-1 mb-2 d-flex align-items-end">
              <button 
                class="btn btn-outline-danger"
                @click="removeIncomingRecord(index)"
                title="刪除"
              >
                <i class="fa fa-trash"></i>
              </button>
            </div>
          </div>
        </div>
        
        <div v-if="incomingRecords.length === 0" class="text-center text-muted py-4">
          <i class="fa fa-truck fa-2x mb-2"></i>
          <p class="mb-0">尚未新增任何進場紀錄</p>
        </div>
      </CardBody>
    </Card>

    <!-- 統計摘要 -->
    <div class="row mt-4">
      <div class="col-md-3">
        <Card class="bg-primary text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalRecords }}</h4>
            <p class="mb-0">總紀錄數</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ materialCount }}</h4>
            <p class="mb-0">材料項目</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ equipmentCount }}</h4>
            <p class="mb-0">機具項目</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-info text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ miscellaneousCount }}</h4>
            <p class="mb-0">雜項項目</p>
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
        <i class="fa fa-arrow-left me-1"></i>返回機具頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveIncomingRecords"
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
import type { IncomingRecord } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const incomingRecords = ref<IncomingRecord[]>([])
const isLoading = ref(false)

// 計算屬性
const totalRecords = computed(() => incomingRecords.value.length)

const materialCount = computed(() => 
  incomingRecords.value.filter(record => record.itemType === 'MATERIAL').length
)

const equipmentCount = computed(() => 
  incomingRecords.value.filter(record => record.itemType === 'EQUIPMENT').length
)

const miscellaneousCount = computed(() => 
  incomingRecords.value.filter(record => record.itemType === 'MISCELLANEOUS').length
)

// 方法
const addIncomingRecord = () => {
  incomingRecords.value.push({
    itemName: '',
    itemType: 'MATERIAL',
    quantity: 0,
    unit: '',
    remarks: ''
  })
}

const removeIncomingRecord = (index: number) => {
  incomingRecords.value.splice(index, 1)
}

const saveIncomingRecords = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存進場紀錄的 API
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
  router.push('/daily-report/inspection')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的進場紀錄資料
})
</script>

<style scoped>
.incoming-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}
</style>

