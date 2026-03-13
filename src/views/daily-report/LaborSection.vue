<template>
  <div class="labor-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">出工紀錄</h4>
        <p class="text-muted mb-0">管理各工種的出工人數統計</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addLaborRecord"
        >
          <i class="fa fa-plus me-1"></i>新增工種
        </button>
        <button 
          class="btn btn-outline-secondary"
          @click="importFromTemplate"
        >
          <i class="fa fa-download me-1"></i>匯入範本
        </button>
      </div>
    </div>

    <!-- 出工紀錄表格 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-users me-2"></i>出工紀錄表
        </h6>
      </CardHeader>
      <CardBody>
        <div class="table-responsive">
          <table class="table table-bordered table-hover">
            <thead class="table-light">
              <tr>
                <th style="width: 20%">工種名稱</th>
                <th style="width: 10%">結構工</th>
                <th style="width: 10%">口工</th>
                <th style="width: 10%">上午</th>
                <th style="width: 10%">下午</th>
                <th style="width: 10%">夜間</th>
                <th style="width: 10%">本日小計</th>
                <th style="width: 10%">累計</th>
                <th style="width: 10%">備註</th>
                <th style="width: 5%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in laborRecords" :key="record.id || index">
                <td>
                  <select 
                    class="form-select"
                    v-model="record.laborType"
                  >
                    <option value="">請選擇工種</option>
                    <option v-for="type in laborTypes" :key="type" :value="type">
                      {{ type }}
                    </option>
                    <option value="custom">其他（自訂）</option>
                  </select>
                  <input 
                    v-if="record.laborType === 'custom'"
                    type="text"
                    class="form-control mt-1"
                    v-model="record.customType"
                    placeholder="請輸入工種名稱"
                  />
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.structuralWork"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.laborWork"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.morning"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.afternoon"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.night"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <div class="text-center">
                    <span class="badge bg-primary fs-6">{{ todaySubtotal(record) }}</span>
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.cumulative"
                      min="0"
                      placeholder="0"
                    />
                    <span class="input-group-text">人</span>
                  </div>
                </td>
                <td>
                  <input
                    type="text"
                    class="form-control"
                    v-model="record.remarks"
                    placeholder="備註"
                  />
                </td>
                <td>
                  <button 
                    class="btn btn-sm btn-outline-danger"
                    @click="removeLaborRecord(index)"
                    title="刪除"
                  >
                    <i class="fa fa-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="laborRecords.length === 0">
                <td colspan="10" class="text-center text-muted py-4">
                  <i class="fa fa-users fa-2x mb-2"></i>
                  <p class="mb-0">尚未新增任何出工紀錄</p>
                </td>
              </tr>
            </tbody>
            <tfoot class="table-secondary">
              <tr>
                <td><strong>總計</strong></td>
                <td><strong>{{ totalStructuralWork }}</strong></td>
                <td><strong>{{ totalLaborWork }}</strong></td>
                <td><strong>{{ totalMorning }}</strong></td>
                <td><strong>{{ totalAfternoon }}</strong></td>
                <td><strong>{{ totalNight }}</strong></td>
                <td><strong>{{ totalToday }}</strong></td>
                <td><strong>{{ totalCumulative }}</strong></td>
                <td></td>
                <td></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardBody>
    </Card>

    <!-- 統計摘要 -->
    <div class="row mt-4">
      <div class="col-md-3">
        <Card class="bg-primary text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ laborRecords.length }}</h4>
            <p class="mb-0">工種數量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalToday }}</h4>
            <p class="mb-0">本日出工總人數</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalCumulative }}</h4>
            <p class="mb-0">累計出工總人數</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-info text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ averagePerShift }}</h4>
            <p class="mb-0">平均每班人數</p>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 班次分析 -->
    <div class="row mt-4">
      <div class="col-md-6">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-chart-pie me-2"></i>班次分析
            </h6>
          </CardHeader>
          <CardBody>
            <div class="d-flex justify-content-between mb-2">
              <span>上午班</span>
              <span class="badge bg-primary">{{ totalMorning }}人</span>
            </div>
            <div class="progress mb-3" style="height: 8px;">
              <div 
                class="progress-bar bg-primary" 
                :style="{ width: morningPercentage + '%' }"
              ></div>
            </div>
            
            <div class="d-flex justify-content-between mb-2">
              <span>下午班</span>
              <span class="badge bg-success">{{ totalAfternoon }}人</span>
            </div>
            <div class="progress mb-3" style="height: 8px;">
              <div 
                class="progress-bar bg-success" 
                :style="{ width: afternoonPercentage + '%' }"
              ></div>
            </div>
            
            <div class="d-flex justify-content-between mb-2">
              <span>夜間班</span>
              <span class="badge bg-warning">{{ totalNight }}人</span>
            </div>
            <div class="progress mb-3" style="height: 8px;">
              <div 
                class="progress-bar bg-warning" 
                :style="{ width: nightPercentage + '%' }"
              ></div>
            </div>
          </CardBody>
        </Card>
      </div>
      
      <div class="col-md-6">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-exclamation-triangle me-2"></i>異常提醒
            </h6>
          </CardHeader>
          <CardBody>
            <div v-if="laborWarnings.length === 0" class="text-center text-muted">
              <i class="fa fa-check-circle fa-2x mb-2 text-success"></i>
              <p class="mb-0">無異常情況</p>
            </div>
            <ul v-else class="list-unstyled mb-0">
              <li v-for="warning in laborWarnings" :key="warning" class="mb-2">
                <i class="fa fa-exclamation-triangle text-warning me-2"></i>
                {{ warning }}
              </li>
            </ul>
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
        <i class="fa fa-arrow-left me-1"></i>返回材料頁面
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveLaborRecords"
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
import type { LaborRecord } from '@/types/dailyReport'
import { LABOR_TYPES } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const laborRecords = ref<LaborRecord[]>([])
const isLoading = ref(false)

// 計算屬性
const laborTypes = computed(() => LABOR_TYPES)

const totalStructuralWork = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.structuralWork || 0), 0)
)

const totalLaborWork = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.laborWork || 0), 0)
)

const totalMorning = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.morning || 0), 0)
)

const totalAfternoon = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.afternoon || 0), 0)
)

const totalNight = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.night || 0), 0)
)

const totalToday = computed(() => totalMorning.value + totalAfternoon.value + totalNight.value)

const totalCumulative = computed(() => 
  laborRecords.value.reduce((sum, record) => sum + (record.cumulative || 0), 0)
)

const averagePerShift = computed(() => {
  const shifts = [totalMorning.value, totalAfternoon.value, totalNight.value].filter(v => v > 0)
  return shifts.length > 0 ? Math.round(totalToday.value / shifts.length) : 0
})

const morningPercentage = computed(() => {
  return totalToday.value > 0 ? Math.round((totalMorning.value / totalToday.value) * 100) : 0
})

const afternoonPercentage = computed(() => {
  return totalToday.value > 0 ? Math.round((totalAfternoon.value / totalToday.value) * 100) : 0
})

const nightPercentage = computed(() => {
  return totalToday.value > 0 ? Math.round((totalNight.value / totalToday.value) * 100) : 0
})

const laborWarnings = computed(() => {
  const warnings: string[] = []
  
  // 檢查是否有夜間班但人數過多
  if (totalNight.value > 10) {
    warnings.push('夜間班人數過多，請確認是否正確')
  }
  
  // 檢查是否有工種沒有填寫
  laborRecords.value.forEach((record, index) => {
    if (!record.laborType) {
      warnings.push(`第${index + 1}行工種未選擇`)
    }
  })
  
  // 檢查總人數是否合理
  if (totalToday.value > 100) {
    warnings.push('本日出工總人數超過100人，請確認是否正確')
  }
  
  return warnings
})

// 方法
const todaySubtotal = (record: LaborRecord) => {
  return (record.morning || 0) + (record.afternoon || 0) + (record.night || 0)
}

const addLaborRecord = () => {
  laborRecords.value.push({
    laborType: '',
    structuralWork: 0,
    laborWork: 0,
    morning: 0,
    afternoon: 0,
    night: 0,
    cumulative: 0,
    remarks: ''
  })
}

const removeLaborRecord = (index: number) => {
  laborRecords.value.splice(index, 1)
}

const importFromTemplate = () => {
  // 匯入常用工種範本
  const templateRecords: LaborRecord[] = [
    { laborType: '結構工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '口工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '鋼筋工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '模板工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '混凝土工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '水電工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' },
    { laborType: '雜工', structuralWork: 0, laborWork: 0, morning: 0, afternoon: 0, night: 0, cumulative: 0, remarks: '' }
  ]
  
  laborRecords.value = [...laborRecords.value, ...templateRecords]
}

const saveLaborRecords = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存出工紀錄的 API
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/materials')
}

const nextSection = () => {
  router.push('/daily-report/equipment')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的出工紀錄資料
})
</script>

<style scoped>
.labor-section {
  padding: 1rem;
}

.gap-2 {
  gap: 0.5rem;
}

.table th {
  font-weight: 600;
  background-color: #f8f9fa;
}

.table td {
  vertical-align: middle;
}

.table tfoot {
  font-weight: 600;
}

.input-group .form-control {
  border-radius: 0.375rem;
}

.btn-sm {
  padding: 0.25rem 0.5rem;
  font-size: 0.875rem;
}

.progress {
  border-radius: 0.375rem;
}

.fs-6 {
  font-size: 1rem !important;
}
</style>
