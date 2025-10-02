<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'

// Props
interface Props {
  modelValue?: string
  formType: 'A-5' | 'A-7'
  showDescription?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 'taipei',
  showDescription: true
})

// Emits
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'change': [authority: string, authorityInfo: any]
}>()

// 各地建築管理單位資訊
const authorities = {
  'A-5': [
    {
      id: 'taipei',
      name: '台北市政府建管處',
      fullName: '台北市建築管理工程處',
      description: '台北市建築管理工程處核定的施工計畫書格式',
      lastUpdate: '2024-01-15',
      features: ['符合北市建管法規', '在地化要求', '完整範例'],
      contact: '02-27208889',
      website: 'https://dba.gov.taipei'
    },
    {
      id: 'newtaipei',
      name: '新北市政府工務局',
      fullName: '新北市政府工務局',
      description: '新北市政府工務局核定的施工計畫書格式',
      lastUpdate: '2024-01-10',
      features: ['符合新北市法規', '營建專用流程', '材料檢驗重點'],
      contact: '02-29603456',
      website: 'https://www.publicwork.ntpc.gov.tw'
    },
    {
      id: 'taoyuan',
      name: '桃園市政府建管處',
      fullName: '桃園市政府建築管理處',
      description: '桃園市政府建築管理處核定的施工計畫書格式',
      lastUpdate: '2024-01-20',
      features: ['符合桃園市法規', '在地化要求', '完整作業指導'],
      contact: '03-3322101',
      website: 'https://building.tycg.gov.tw'
    },
    {
      id: 'taichung',
      name: '台中市政府都發局',
      fullName: '台中市政府都市發展局',
      description: '台中市政府都市發展局核定的施工計畫書格式',
      lastUpdate: '2024-01-12',
      features: ['符合台中市法規', '多種檢驗範例', '品質記錄表單'],
      contact: '04-22289111',
      website: 'https://www.ud.taichung.gov.tw'
    },
    {
      id: 'tainan',
      name: '台南市政府工務局',
      fullName: '台南市政府工務局',
      description: '台南市政府工務局核定的施工計畫書格式',
      lastUpdate: '2024-01-18',
      features: ['符合台南市法規', '在地化流程', '案例分析'],
      contact: '06-2991111',
      website: 'https://publicworks.tainan.gov.tw'
    },
    {
      id: 'kaohsiung',
      name: '高雄市政府工務局',
      fullName: '高雄市政府工務局',
      description: '高雄市政府工務局核定的施工計畫書格式',
      lastUpdate: '2024-01-22',
      features: ['符合高雄市法規', '在地化要求', '完整文件範本'],
      contact: '07-3368333',
      website: 'https://pwb.kcg.gov.tw'
    }
  ],
  'A-7': [
    {
      id: 'taipei',
      name: '台北市政府建管處',
      fullName: '台北市建築管理工程處',
      description: '台北市建築管理工程處核定的品質管制計畫格式',
      lastUpdate: '2024-01-15',
      features: ['台北市建管處標準流程', '在地化檢驗表單', '符合北市法規要求'],
      contact: '02-27208889',
      website: 'https://dba.gov.taipei'
    },
    {
      id: 'newtaipei',
      name: '新北市政府工務局',
      fullName: '新北市政府工務局',
      description: '新北市政府工務局核定的品質管制計畫格式',
      lastUpdate: '2024-01-10',
      features: ['新北市工務局標準', '營建專用流程', '材料檢驗重點'],
      contact: '02-29603456',
      website: 'https://www.publicwork.ntpc.gov.tw'
    },
    {
      id: 'taoyuan',
      name: '桃園市政府建管處',
      fullName: '桃園市政府建築管理處',
      description: '桃園市政府建築管理處核定的品質管制計畫格式',
      lastUpdate: '2024-01-20',
      features: ['桃園市建管處標準', '在地化要求', '完整作業指導'],
      contact: '03-3322101',
      website: 'https://building.tycg.gov.tw'
    },
    {
      id: 'taichung',
      name: '台中市政府都發局',
      fullName: '台中市政府都市發展局',
      description: '台中市政府都市發展局核定的品質管制計畫格式',
      lastUpdate: '2024-01-12',
      features: ['台中市都發局標準', '多種檢驗範例', '品質記錄表單'],
      contact: '04-22289111',
      website: 'https://www.ud.taichung.gov.tw'
    },
    {
      id: 'tainan',
      name: '台南市政府工務局',
      fullName: '台南市政府工務局',
      description: '台南市政府工務局核定的品質管制計畫格式',
      lastUpdate: '2024-01-18',
      features: ['台南市工務局標準', '在地化流程', '案例分析'],
      contact: '06-2991111',
      website: 'https://publicworks.tainan.gov.tw'
    },
    {
      id: 'kaohsiung',
      name: '高雄市政府工務局',
      fullName: '高雄市政府工務局',
      description: '高雄市政府工務局核定的品質管制計畫格式',
      lastUpdate: '2024-01-22',
      features: ['高雄市工務局標準', '在地化要求', '完整文件範本'],
      contact: '07-3368333',
      website: 'https://pwb.kcg.gov.tw'
    }
  ]
}

// 狀態管理
const selectedAuthority = ref(props.modelValue)
const showAllAuthorities = ref(false)

// 計算屬性
const currentAuthorities = computed(() => {
  return authorities[props.formType] || []
})

const selectedAuthorityInfo = computed(() => {
  return currentAuthorities.value.find(auth => auth.id === selectedAuthority.value)
})

const displayedAuthorities = computed(() => {
  if (showAllAuthorities.value) {
    return currentAuthorities.value
  }
  // 預設顯示前3個，其他需要展開
  return currentAuthorities.value.slice(0, 3)
})

const hasMoreAuthorities = computed(() => {
  return currentAuthorities.value.length > 3
})

// 方法
const selectAuthority = (authorityId: string) => {
  selectedAuthority.value = authorityId
  emit('update:modelValue', authorityId)
  
  const authorityInfo = currentAuthorities.value.find(auth => auth.id === authorityId)
  if (authorityInfo) {
    emit('change', authorityId, authorityInfo)
  }
}

const toggleAuthorities = () => {
  showAllAuthorities.value = !showAllAuthorities.value
}

// 監聽器
watch(() => props.modelValue, (newValue) => {
  selectedAuthority.value = newValue
})
</script>

<template>
  <div class="authority-selector">
    <!-- 當前選擇的管理單位 -->
    <Card v-if="selectedAuthorityInfo && showDescription" class="mb-3">
      <CardHeader>
        <div class="d-flex align-items-center">
          <i class="fa fa-building me-2"></i>
          <h6 class="mb-0">當前選擇的管理單位</h6>
        </div>
      </CardHeader>
      <CardBody>
        <div class="d-flex align-items-start">
          <div class="flex-grow-1">
            <h6 class="mb-2">{{ selectedAuthorityInfo.fullName }}</h6>
            <p class="text-muted small mb-2">{{ selectedAuthorityInfo.description }}</p>
            
            <div class="row mb-2">
              <div class="col-6">
                <small class="text-muted">
                  <i class="fa fa-calendar me-1"></i>
                  更新日期：{{ selectedAuthorityInfo.lastUpdate }}
                </small>
              </div>
              <div class="col-6">
                <small class="text-muted">
                  <i class="fa fa-phone me-1"></i>
                  聯絡電話：{{ selectedAuthorityInfo.contact }}
                </small>
              </div>
            </div>
            
            <div class="mb-2">
              <small class="text-muted">特色功能：</small>
              <div class="mt-1">
                <span 
                  v-for="feature in selectedAuthorityInfo.features" 
                  :key="feature"
                  class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1 mb-1"
                >
                  {{ feature }}
                </span>
              </div>
            </div>
            
            <a 
              :href="selectedAuthorityInfo.website" 
              target="_blank"
              class="btn btn-outline-theme btn-sm"
            >
              <i class="fa fa-external-link me-1"></i>
              前往官方網站
            </a>
          </div>
        </div>
      </CardBody>
    </Card>

    <!-- 管理單位選擇 -->
    <Card>
      <CardHeader>
        <div class="d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center">
            <i class="fa fa-map-marker me-2"></i>
            <h6 class="mb-0">選擇管理單位</h6>
          </div>
          <small class="text-muted">
            {{ currentAuthorities.length }} 個管理單位
          </small>
        </div>
      </CardHeader>
      <CardBody>
        <div class="row">
          <div 
            v-for="authority in displayedAuthorities" 
            :key="authority.id"
            class="col-lg-6 mb-3"
          >
            <div 
              class="border rounded p-3 cursor-pointer authority-option"
              :class="{ 'border-theme': selectedAuthority === authority.id }"
              @click="selectAuthority(authority.id)"
            >
              <div class="d-flex align-items-start">
                <div class="flex-grow-1">
                  <div class="d-flex align-items-center mb-2">
                    <h6 class="mb-0 me-2">{{ authority.name }}</h6>
                    <i 
                      v-if="selectedAuthority === authority.id"
                      class="fa fa-check-circle text-success"
                    ></i>
                  </div>
                  <p class="text-muted small mb-2">{{ authority.description }}</p>
                  
                  <div class="mb-2">
                    <small class="text-muted">更新：{{ authority.lastUpdate }}</small>
                  </div>
                  
                  <div class="mb-2">
                    <span 
                      v-for="feature in authority.features.slice(0, 2)" 
                      :key="feature"
                      class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1 mb-1"
                    >
                      {{ feature }}
                    </span>
                    <span 
                      v-if="authority.features.length > 2"
                      class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                    >
                      +{{ authority.features.length - 2 }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 展開/收合按鈕 -->
        <div v-if="hasMoreAuthorities" class="text-center mt-3">
          <button 
            class="btn btn-outline-secondary btn-sm"
            @click="toggleAuthorities"
          >
            <i 
              class="fa me-1" 
              :class="{ 'fa-chevron-down': !showAllAuthorities, 'fa-chevron-up': showAllAuthorities }"
            ></i>
            {{ showAllAuthorities ? '收合' : '展開' }}其他管理單位
          </button>
        </div>
      </CardBody>
    </Card>
  </div>
</template>

<style scoped>
.authority-option {
  transition: all 0.2s ease;
}

.authority-option:hover {
  background-color: var(--bs-light);
  transform: translateY(-1px);
}

.authority-option.border-theme {
  border-color: var(--bs-theme) !important;
  border-width: 2px !important;
}

.cursor-pointer {
  cursor: pointer;
}
</style>
