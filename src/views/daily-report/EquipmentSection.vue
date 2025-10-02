<template>
  <div class="equipment-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">機具出工紀錄</h4>
        <p class="text-muted mb-0">管理每日機具使用情況</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addEquipmentRecord"
        >
          <i class="fa fa-plus me-1"></i>新增機具
        </button>
        <button 
          class="btn btn-outline-secondary"
          @click="importFromTemplate"
        >
          <i class="fa fa-download me-1"></i>匯入範本
        </button>
      </div>
    </div>

    <!-- 機具出工紀錄表格 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-cogs me-2"></i>機具出工紀錄表
        </h6>
      </CardHeader>
      <CardBody>
        <div class="table-responsive">
          <table class="table table-bordered table-hover">
            <thead class="table-light">
              <tr>
                <th style="width: 25%">機具名稱</th>
                <th style="width: 10%">單位</th>
                <th style="width: 15%">本日出工</th>
                <th style="width: 15%">累計</th>
                <th style="width: 20%">備註</th>
                <th style="width: 5%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(record, index) in equipmentRecords" :key="record.id || index">
                <td>
                  <select 
                    class="form-select"
                    v-model="record.equipmentName"
                  >
                    <option value="">請選擇機具</option>
                    <option v-for="type in equipmentTypes" :key="type.name" :value="type.name">
                      {{ type.name }}
                    </option>
                    <option value="custom">其他（自訂）</option>
                  </select>
                  <input 
                    v-if="record.equipmentName === 'custom'"
                    type="text"
                    class="form-control mt-1"
                    v-model="record.customName"
                    placeholder="請輸入機具名稱"
                  />
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control"
                      v-model="record.unit"
                      placeholder="單位"
                    />
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.todayUsage"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="record.cumulative"
                      min="0"
                      step="0.01"
                      placeholder="0"
                    />
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
                    @click="removeEquipmentRecord(index)"
                    title="刪除"
                  >
                    <i class="fa fa-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="equipmentRecords.length === 0">
                <td colspan="6" class="text-center text-muted py-4">
                  <i class="fa fa-cogs fa-2x mb-2"></i>
                  <p class="mb-0">尚未新增任何機具紀錄</p>
                </td>
              </tr>
            </tbody>
            <tfoot class="table-secondary">
              <tr>
                <td><strong>總計</strong></td>
                <td></td>
                <td><strong>{{ totalTodayUsage }}</strong></td>
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
            <h4 class="mb-1">{{ equipmentRecords.length }}</h4>
            <p class="mb-0">機具種類</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalTodayUsage }}</h4>
            <p class="mb-0">本日出工總量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalCumulative }}</h4>
            <p class="mb-0">累計出工總量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-info text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ averageUsage }}</h4>
            <p class="mb-0">平均使用量</p>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 機具使用分析 -->
    <div class="row mt-4">
      <div class="col-md-6">
        <Card>
          <CardHeader>
            <h6 class="mb-0">
              <i class="fa fa-chart-bar me-2"></i>機具使用排行
            </h6>
          </CardHeader>
          <CardBody>
            <div v-if="topEquipment.length === 0" class="text-center text-muted">
              <i class="fa fa-chart-bar fa-2x mb-2"></i>
              <p class="mb-0">尚無使用資料</p>
            </div>
            <div v-else>
              <div v-for="(item, index) in topEquipment" :key="index" class="mb-3">
                <div class="d-flex justify-content-between mb-1">
                  <span>{{ item.name }}</span>
                  <span class="badge bg-primary">{{ item.usage }}{{ item.unit }}</span>
                </div>
                <div class="progress" style="height: 6px;">
                  <div 
                    class="progress-bar bg-primary" 
                    :style="{ width: item.percentage + '%' }"
                  ></div>
                </div>
              </div>
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
            <div v-if="equipmentWarnings.length === 0" class="text-center text-muted">
              <i class="fa fa-check-circle fa-2x mb-2 text-success"></i>
              <p class="mb-0">無異常情況</p>
            </div>
            <ul v-else class="list-unstyled mb-0">
              <li v-for="warning in equipmentWarnings" :key="warning" class="mb-2">
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
        <i class="fa fa-arrow-left me-1"></i>返回出工紀錄
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveEquipmentRecords"
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
import type { EquipmentRecord } from '@/types/dailyReport'
import { EQUIPMENT_TYPES } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const equipmentRecords = ref<EquipmentRecord[]>([])
const isLoading = ref(false)

// 計算屬性
const equipmentTypes = computed(() => EQUIPMENT_TYPES)

const totalTodayUsage = computed(() => 
  equipmentRecords.value.reduce((sum, record) => sum + (record.todayUsage || 0), 0)
)

const totalCumulative = computed(() => 
  equipmentRecords.value.reduce((sum, record) => sum + (record.cumulative || 0), 0)
)

const averageUsage = computed(() => {
  if (equipmentRecords.value.length === 0) return 0
  return Math.round(totalTodayUsage.value / equipmentRecords.value.length)
})

const topEquipment = computed(() => {
  return equipmentRecords.value
    .filter(record => record.todayUsage > 0)
    .sort((a, b) => (b.todayUsage || 0) - (a.todayUsage || 0))
    .slice(0, 5)
    .map(record => ({
      name: record.equipmentName,
      usage: record.todayUsage,
      unit: record.unit,
      percentage: totalTodayUsage.value > 0 ? Math.round((record.todayUsage || 0) / totalTodayUsage.value * 100) : 0
    }))
})

const equipmentWarnings = computed(() => {
  const warnings: string[] = []
  
  // 檢查是否有機具使用量異常
  equipmentRecords.value.forEach((record, index) => {
    if (record.todayUsage > 100) {
      warnings.push(`${record.equipmentName || `機具${index + 1}`}：本日使用量(${record.todayUsage})異常偏高`)
    }
  })
  
  // 檢查是否有機具沒有填寫
  equipmentRecords.value.forEach((record, index) => {
    if (!record.equipmentName) {
      warnings.push(`第${index + 1}行機具未選擇`)
    }
  })
  
  return warnings
})

// 方法
const addEquipmentRecord = () => {
  equipmentRecords.value.push({
    equipmentName: '',
    unit: '',
    todayUsage: 0,
    cumulative: 0,
    remarks: ''
  })
}

const removeEquipmentRecord = (index: number) => {
  equipmentRecords.value.splice(index, 1)
}

const importFromTemplate = () => {
  // 匯入常用機具範本
  const templateRecords: EquipmentRecord[] = [
    { equipmentName: 'PC-200', unit: '台', todayUsage: 0, cumulative: 0, remarks: '' },
    { equipmentName: 'PC-100', unit: '台', todayUsage: 0, cumulative: 0, remarks: '' },
    { equipmentName: 'PC-60', unit: '台', todayUsage: 0, cumulative: 0, remarks: '' },
    { equipmentName: '挖土機', unit: '台', todayUsage: 0, cumulative: 0, remarks: '' },
    { equipmentName: '吊車', unit: '台', todayUsage: 0, cumulative: 0, remarks: '' }
  ]
  
  equipmentRecords.value = [...equipmentRecords.value, ...templateRecords]
}

const saveEquipmentRecords = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存機具紀錄的 API
    // console.log('儲存機具紀錄:', equipmentRecords.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/labor')
}

const nextSection = () => {
  router.push('/daily-report/incoming')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的機具紀錄資料
  // console.log('載入機具紀錄資料')
})
</script>

<style scoped>
.equipment-section {
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
</style>
