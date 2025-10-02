<template>
  <div class="materials-section">
    <!-- 頁面標題 -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h4 class="mb-1">材料進場與使用數量</h4>
        <p class="text-muted mb-0">管理每日材料進場和使用情況</p>
      </div>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-outline-primary"
          @click="addMaterial"
        >
          <i class="fa fa-plus me-1"></i>新增材料
        </button>
        <button 
          class="btn btn-outline-secondary"
          @click="importFromTemplate"
        >
          <i class="fa fa-download me-1"></i>匯入範本
        </button>
      </div>
    </div>

    <!-- 材料列表 -->
    <Card>
      <CardHeader>
        <h6 class="mb-0">
          <i class="fa fa-truck me-2"></i>材料進場與使用紀錄
        </h6>
      </CardHeader>
      <CardBody>
        <div class="table-responsive">
          <table class="table table-bordered table-hover">
            <thead class="table-light">
              <tr>
                <th style="width: 20%">工程名稱</th>
                <th style="width: 8%">單位</th>
                <th style="width: 10%">設計數量</th>
                <th style="width: 10%">累計數量</th>
                <th style="width: 8%">上午</th>
                <th style="width: 8%">下午</th>
                <th style="width: 8%">結構工</th>
                <th style="width: 8%">口工</th>
                <th style="width: 10%">累計工期</th>
                <th style="width: 10%">備註</th>
                <th style="width: 4%">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(material, index) in materials" :key="material.id || index">
                <td>
                  <select 
                    class="form-select"
                    v-model="material.materialName"
                    @change="onMaterialChange(index)"
                  >
                    <option value="">請選擇材料</option>
                    <option v-for="type in materialTypes" :key="type.name" :value="type.name">
                      {{ type.name }}
                    </option>
                    <option value="custom">其他（自訂）</option>
                  </select>
                  <input 
                    v-if="material.materialName === 'custom'"
                    type="text"
                    class="form-control mt-1"
                    v-model="material.customName"
                    placeholder="請輸入材料名稱"
                  />
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="text"
                      class="form-control"
                      v-model="material.unit"
                      placeholder="單位"
                    />
                  </div>
                </td>
                <td>
                  <div class="input-group">
                    <input
                      type="number"
                      class="form-control"
                      v-model="material.designQuantity"
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
                      v-model="material.accumulatedQuantity"
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
                      v-model="material.todayWork.morning"
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
                      v-model="material.todayWork.afternoon"
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
                      v-model="material.structuralWork"
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
                      v-model="material.laborWork"
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
                      v-model="material.accumulatedPeriod"
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
                    v-model="material.remarks"
                    placeholder="備註"
                  />
                </td>
                <td>
                  <button 
                    class="btn btn-sm btn-outline-danger"
                    @click="removeMaterial(index)"
                    title="刪除"
                  >
                    <i class="fa fa-trash"></i>
                  </button>
                </td>
              </tr>
              <tr v-if="materials.length === 0">
                <td colspan="11" class="text-center text-muted py-4">
                  <i class="fa fa-inbox fa-2x mb-2"></i>
                  <p class="mb-0">尚未新增任何材料</p>
                </td>
              </tr>
            </tbody>
            <tfoot class="table-secondary">
              <tr>
                <td><strong>總計</strong></td>
                <td></td>
                <td><strong>{{ totalDesignQuantity }}</strong></td>
                <td><strong>{{ totalAccumulatedQuantity }}</strong></td>
                <td><strong>{{ totalMorningWork }}</strong></td>
                <td><strong>{{ totalAfternoonWork }}</strong></td>
                <td><strong>{{ totalStructuralWork }}</strong></td>
                <td><strong>{{ totalLaborWork }}</strong></td>
                <td><strong>{{ totalAccumulatedPeriod }}</strong></td>
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
            <h4 class="mb-1">{{ totalMaterials }}</h4>
            <p class="mb-0">材料種類</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-success text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalTodayWork }}</h4>
            <p class="mb-0">本日工總量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-warning text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalAccumulatedQuantity }}</h4>
            <p class="mb-0">累計數量</p>
          </CardBody>
        </Card>
      </div>
      <div class="col-md-3">
        <Card class="bg-info text-white">
          <CardBody class="text-center">
            <h4 class="mb-1">{{ totalAccumulatedPeriod }}</h4>
            <p class="mb-0">累計工期</p>
          </CardBody>
        </Card>
      </div>
    </div>

    <!-- 使用量異常提醒 -->
    <div v-if="usageWarnings.length > 0" class="alert alert-warning mt-4">
      <h6><i class="fa fa-exclamation-triangle me-2"></i>使用量異常提醒</h6>
      <ul class="mb-0">
        <li v-for="warning in usageWarnings" :key="warning">{{ warning }}</li>
      </ul>
    </div>

    <!-- 操作按鈕 -->
    <div class="d-flex justify-content-between mt-4">
      <button 
        class="btn btn-outline-secondary"
        @click="goBack"
      >
        <i class="fa fa-arrow-left me-1"></i>返回總覽
      </button>
      <div class="d-flex gap-2">
        <button 
          class="btn btn-primary"
          @click="saveMaterials"
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
import type { MaterialRecord } from '@/types/dailyReport'
import { MATERIAL_TYPES } from '@/types/dailyReport'
import Card from '@/components/bootstrap/Card.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'

const router = useRouter()

// 響應式資料
const materials = ref<MaterialRecord[]>([])
const isLoading = ref(false)

// 計算屬性
const materialTypes = computed(() => MATERIAL_TYPES)

const totalMaterials = computed(() => materials.value.length)

const totalDesignQuantity = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.designQuantity || 0), 0)
)

const totalAccumulatedQuantity = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.accumulatedQuantity || 0), 0)
)

const totalMorningWork = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.todayWork?.morning || 0), 0)
)

const totalAfternoonWork = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.todayWork?.afternoon || 0), 0)
)

const totalTodayWork = computed(() => totalMorningWork.value + totalAfternoonWork.value)

const totalStructuralWork = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.structuralWork || 0), 0)
)

const totalLaborWork = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.laborWork || 0), 0)
)

const totalAccumulatedPeriod = computed(() => 
  materials.value.reduce((sum, material) => sum + (material.accumulatedPeriod || 0), 0)
)

const usageWarnings = computed(() => {
  const warnings: string[] = []
  materials.value.forEach((material, index) => {
    if (material.accumulatedQuantity > material.designQuantity) {
      warnings.push(`${material.materialName || `材料${index + 1}`}：累計數量(${material.accumulatedQuantity})超過設計數量(${material.designQuantity})`)
    }
  })
  return warnings
})

// 方法
const addMaterial = () => {
  materials.value.push({
    materialName: '',
    unit: '',
    designQuantity: 0,
    accumulatedQuantity: 0,
    todayWork: {
      morning: 0,
      afternoon: 0
    },
    structuralWork: 0,
    laborWork: 0,
    accumulatedPeriod: 0,
    remarks: ''
  })
}

const removeMaterial = (index: number) => {
  materials.value.splice(index, 1)
}

const onMaterialChange = (index: number) => {
  const material = materials.value[index]
  if (material.materialName && material.materialName !== 'custom') {
    const materialType = materialTypes.value.find(type => type.name === material.materialName)
    if (materialType) {
      material.unit = materialType.unit
    }
  }
}

const importFromTemplate = () => {
  // 匯入常用材料範本
  const templateMaterials: MaterialRecord[] = [
    { 
      materialName: '210kg/cm²混凝土', 
      unit: 'M3', 
      designQuantity: 477.5,
      accumulatedQuantity: 477.5,
      todayWork: { morning: 0, afternoon: 0 },
      structuralWork: 0,
      laborWork: 0,
      accumulatedPeriod: 0,
      remarks: ''
    },
    { 
      materialName: '鋼筋', 
      unit: '噸', 
      designQuantity: 0,
      accumulatedQuantity: 0,
      todayWork: { morning: 0, afternoon: 0 },
      structuralWork: 0,
      laborWork: 0,
      accumulatedPeriod: 0,
      remarks: ''
    },
    { 
      materialName: '水泥', 
      unit: '包', 
      designQuantity: 13255.0,
      accumulatedQuantity: 13085.0,
      todayWork: { morning: 0, afternoon: 0 },
      structuralWork: 0,
      laborWork: 0,
      accumulatedPeriod: 0,
      remarks: ''
    },
    { 
      materialName: 'MD120', 
      unit: 'M2', 
      designQuantity: 17975.0,
      accumulatedQuantity: 17120.0,
      todayWork: { morning: 0, afternoon: 0 },
      structuralWork: 0,
      laborWork: 0,
      accumulatedPeriod: 0,
      remarks: ''
    }
  ]
  
  materials.value = [...materials.value, ...templateMaterials]
}

const saveMaterials = async () => {
  isLoading.value = true
  try {
    // TODO: 實作儲存材料資料的 API
    // console.log('儲存材料資料:', materials.value)
  } catch (error) {
    console.error('儲存失敗:', error)
  } finally {
    isLoading.value = false
  }
}

const goBack = () => {
  router.push('/daily-report/overview')
}

const nextSection = () => {
  router.push('/daily-report/labor')
}

// 生命週期
onMounted(() => {
  // TODO: 載入現有的材料資料
  // console.log('載入材料資料')
})
</script>

<style scoped>
.materials-section {
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
</style>
