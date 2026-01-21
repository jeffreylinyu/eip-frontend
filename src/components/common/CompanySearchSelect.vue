<script setup lang="ts">
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { companyApi, type Company } from '@/api/company'

const props = defineProps<{
  modelValue: string // Company ID
  label: string
  placeholder?: string
  type?: 'CONTRACTOR' | 'SUPERVISION' | 'THIRD_PARTY'
  required?: boolean
  disabled?: boolean
  useAdminApi?: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'select', company: Company | null): void
  (e: 'create'): void
}>()

const searchQuery = ref('')
const companies = ref<Company[]>([])
const isLoading = ref(false)
const showDropdown = ref(false)
const selectedCompany = ref<Company | null>(null)
let debounceTimer: number | null = null

// 初始化：如果已有 modelValue，嘗試獲取公司詳情
const initCompany = async () => {
  if (props.modelValue) {
    try {
      const company = await companyApi.getDetail(props.modelValue)
      if (company) {
        selectedCompany.value = company
        searchQuery.value = company.companyName
      }
    } catch (e) {
      console.error('Failed to fetch company detail', e)
    }
  }
}

// 搜尋功能
const handleSearch = () => {
  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  // 修改：即使沒有輸入關鍵字，也允許搜尋（列出該類型的所有公司），以便用戶點擊即選
  // if (!searchQuery.value.trim()) { ... }

  isLoading.value = true
  debounceTimer = window.setTimeout(async () => {
    try {
      let results: Company[] = []

      if (props.useAdminApi) {
        // 使用 Admin API (取得全部並於前端過濾)
        const allCompanies = await companyApi.adminGetAll()
        
        results = allCompanies.filter(c => {
          // 類型過濾
          if (props.type && c.companyType !== props.type) return false
          
          // 關鍵字過濾 (名稱或統編)
          if (searchQuery.value) {
            const q = searchQuery.value.toLowerCase()
            return (
              (c.companyName && c.companyName.toLowerCase().includes(q)) || 
              (c.companyCode && c.companyCode.includes(q))
            )
          }
          return true
        })
      } else {
        // 使用一般 API (後端過濾)
        results = await companyApi.getList({
          search: searchQuery.value,
          companyType: props.type
        })
      }

      companies.value = results
      showDropdown.value = true
    } catch (error) {
      console.error('Search failed', error)
      companies.value = []
    } finally {
      isLoading.value = false
    }
  }, 300) // 300ms Debounce
}

// 選擇公司
const selectCompany = (company: Company) => {
  console.log('Selected Company:', company)
  selectedCompany.value = company
  searchQuery.value = company.companyName
  showDropdown.value = false
  emit('update:modelValue', company.companyId)
  emit('select', company)
}

// 清除選擇
const clearSelection = () => {
  selectedCompany.value = null
  searchQuery.value = ''
  showDropdown.value = false
  emit('update:modelValue', '')
  emit('select', null)
}

// 處理外部點擊關閉下拉選單
const clickOutsideHandler = (e: MouseEvent) => {
  const target = e.target as HTMLElement
  if (!target.closest('.company-search-select')) {
    showDropdown.value = false
  }
}

watch(() => props.modelValue, (newVal) => {
  if (!newVal) {
    clearSelection()
  } else if (!selectedCompany.value || selectedCompany.value.companyId !== newVal) {
    initCompany()
  }
})

onMounted(() => {
  initCompany()
  document.addEventListener('click', clickOutsideHandler)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', clickOutsideHandler)
})
</script>

<template>
  <div class="company-search-select position-relative">
    <label v-if="label" class="form-label">
      {{ label }} <span v-if="required" class="text-danger">*</span>
    </label>
    
    <div class="input-group">
      <input
        type="text"
        class="form-control"
        :placeholder="placeholder || '請輸入公司名稱或統編搜尋'"
        v-model="searchQuery"
        @input="handleSearch"
        @focus="handleSearch"
        @click="handleSearch"
        :disabled="disabled"
        :readonly="!!selectedCompany"
      />
      <button 
        v-if="selectedCompany && !disabled" 
        class="btn btn-outline-secondary" 
        type="button"
        @click="clearSelection"
      >
        <i class="fa fa-times"></i>
      </button>
      <span v-if="isLoading" class="input-group-text">
        <i class="fa fa-spinner fa-spin text-muted"></i>
      </span>
    </div>

    <div 
      v-if="showDropdown" 
      class="dropdown-menu dropdown-menu-dark show w-100 shadow-sm"
      style="max-height: 300px; overflow-y: auto;"
    >
      <template v-if="companies.length > 0">
        <a 
          v-for="company in companies" 
          :key="company.companyId"
          class="dropdown-item d-flex justify-content-between align-items-center py-2"
          href="javascript:;"
          @click="selectCompany(company)"
        >
          <div>
            <div class="fw-bold text-light">{{ company.companyName }}</div>
            <div class="small text-muted">統編：{{ company.companyCode }}</div>
          </div>
          <span 
            class="badge rounded-pill" 
            :class="{
              'bg-primary': company.companyType === 'CONTRACTOR',
              'bg-info': company.companyType === 'SUPERVISION',
              'bg-success': company.companyType === 'THIRD_PARTY'
            }"
          >
            {{ 
              company.companyType === 'CONTRACTOR' ? '營造' : 
              company.companyType === 'SUPERVISION' ? '監造' : '其他' 
            }}
          </span>
        </a>
        <div class="dropdown-divider border-secondary"></div>
      </template>

      <div v-if="companies.length === 0 && searchQuery && !isLoading" class="p-3 text-center text-muted">
        <i class="fa fa-info-circle me-1"></i> 查無相關公司
      </div>

      <a class="dropdown-item text-center text-theme py-2 fw-bold" href="javascript:;" @click="emit('create')">
        <i class="fa fa-plus-circle me-1"></i> 新增公司
      </a>
    </div>
  </div>
</template>

<style scoped>
.company-search-select .dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  z-index: 1050;
  margin-top: 0.125rem;
}
</style>
