<template>
  <div class="pcces-autocomplete" ref="containerRef">
    <!-- 輸入框區塊 -->
    <div class="input-group">
      <!-- Loading Indicator -->
      <span class="input-group-text bg-dark border-secondary" v-if="loading">
        <div class="spinner-border spinner-border-sm text-light" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
      </span>
      <!-- Search Icon -->
      <span class="input-group-text bg-dark border-secondary" v-else>
        <i class="fa fa-search text-muted"></i>
      </span>
      
      <!-- Input -->
      <input
        type="text"
        class="form-control bg-dark text-white border-secondary placeholder-muted"
        :placeholder="placeholder"
        v-model="inputValue"
        @input="onInput"
        @keydown.down.prevent="onArrowDown"
        @keydown.up.prevent="onArrowUp"
        @keydown.enter.prevent="onEnter"
        @focus="onFocus"
        @blur="closeDropdownDelayed"
      />
    </div>

    <!-- 下拉選單 (Teleport to body to avoid overflow issues) -->
    <Teleport to="body">
      <div 
        v-if="showDropdown" 
        class="pcces-dropdown shadow-lg border border-secondary rounded mt-1"
        :style="dropdownStyle"
        @scroll="onScroll"
        ref="dropdownRef"
      >
        <!-- Error Message -->
        <div v-if="hasError" class="p-3 text-center text-danger disabled-item">
          <i class="fa fa-exclamation-circle me-1"></i> 資料載入失敗，請稍後再試
        </div>

        <!-- Result List (Virtual Scroll Logic) -->
        <div v-else-if="results.length > 0" class="virtual-scroll-container" :style="{ height: totalHeight + 'px' }">
          <div 
            v-for="(item, index) in visibleItems" 
            :key="item.id"
            class="pcces-item d-flex align-items-center px-3 py-2 border-bottom border-secondary"
            :class="{ 'active': (visibleStartIndex + index) === selectedIndex }"
            :style="{ top: ((visibleStartIndex + index) * itemHeight) + 'px' }"
            @mousedown.prevent="selectItem(item)"
            @mouseenter="selectedIndex = visibleStartIndex + index"
          >
            <!-- 1. Code Column (Monospace, Cyan/Light) -->
            <div class="item-code font-monospace text-info fw-bold" 
                 v-html="highlight(item.code)"></div>
            
            <!-- 2. Name Column (Flex Grow, Highlighted) -->
            <div class="item-name flex-grow-1 mx-3 text-truncate text-light" 
                 v-html="highlight(item.name)" :title="item.name"></div>
            
            <!-- 3. Source Column (Badge) -->
            <div v-if="item.source" class="item-source badge bg-secondary text-white fw-normal me-2">
               {{ item.source }}
            </div>

            <!-- 4. Unit Column (Small, Grey) -->
            <div class="item-unit text-secondary small">
               {{ item.unit || '-' }}
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else-if="!loading && inputValue.trim()" class="p-3 text-center text-muted disabled-item">
          <i class="fa fa-info-circle me-1"></i> 查無符合資料
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted, nextTick } from 'vue'
import { searchPccesItems, type PccesCatalogItem } from '@/api/pcces'

// Props & Emits
const props = defineProps({
  modelValue: {
    type: [String, Number],
    default: ''
  },
  placeholder: {
    type: String,
    default: '輸入編碼或名稱搜尋工項...'
  }
})

const emit = defineEmits(['update:modelValue', 'select'])

// State
const inputValue = ref('')
const loading = ref(false)
const hasError = ref(false)
const results = ref<PccesCatalogItem[]>([])
const showDropdown = ref(false)
const selectedIndex = ref(-1)
let debounceTimer: any = null

// Virtual Scroll Configuration
const itemHeight = 45 // px per row
const containerHeight = 300 // max dropdown height
const scrollTop = ref(0)
const dropdownRef = ref<HTMLElement | null>(null)
const containerRef = ref<HTMLElement | null>(null)

// Dropdown Positioning Style
const dropdownStyle = ref({
    top: '0px',
    left: '0px',
    width: 'auto',
    position: 'absolute' as const,
    zIndex: 9999
})

// Virtual Scroll Computing
const totalHeight = computed(() => results.value.length * itemHeight)

const visibleStartIndex = computed(() => {
  return Math.floor(scrollTop.value / itemHeight)
})

const visibleEndIndex = computed(() => {
  // Render buffer items + visible items
  return Math.min(
    results.value.length, 
    Math.floor((scrollTop.value + containerHeight) / itemHeight) + 2
  )
})

const visibleItems = computed(() => {
  return results.value.slice(visibleStartIndex.value, visibleEndIndex.value)
})

// Methods
const updatePosition = () => {
    if (!containerRef.value) return
    const rect = containerRef.value.getBoundingClientRect()
    dropdownStyle.value = {
        top: `${rect.bottom + window.scrollY}px`,
        left: `${rect.left + window.scrollX}px`,
        width: `${rect.width}px`,
        position: 'absolute',
        zIndex: 9999
    }
}

watch(showDropdown, async (val) => {
    if (val) {
        await nextTick()
        updatePosition()
        window.addEventListener('resize', updatePosition)
        window.addEventListener('scroll', updatePosition, true)
    } else {
        window.removeEventListener('resize', updatePosition)
        window.removeEventListener('scroll', updatePosition, true)
    }
})

onUnmounted(() => {
    window.removeEventListener('resize', updatePosition)
    window.removeEventListener('scroll', updatePosition, true)
})

const onInput = () => {
  loading.value = true
  hasError.value = false
  showDropdown.value = true 
  
  if (debounceTimer) clearTimeout(debounceTimer)
  
  // Debounce 300ms
  debounceTimer = setTimeout(async () => {
    const query = inputValue.value.trim()
    if (!query) {
      results.value = []
      loading.value = false
      return
    }
    
    try {
      // API Call with limit 20
      const data = await searchPccesItems(query, 20)
      results.value = data
      selectedIndex.value = -1 // Reset selection
      scrollTop.value = 0
       // Re-calculate position in case content pushed layout
       nextTick(updatePosition)
    } catch (e) {
      console.error('PCCES Search Error:', e)
      hasError.value = true
      results.value = []
    } finally {
      loading.value = false
    }
  }, 300)
}

const onFocus = () => {
    if (inputValue.value.trim()) {
        showDropdown.value = true
        nextTick(updatePosition)
    }
}

// Close dropdown with delay to allow click events
const closeDropdownDelayed = () => {
  setTimeout(() => {
    showDropdown.value = false
  }, 200)
}

// Highlight Logic using Regex
const highlight = (text: string) => {
  if (!inputValue.value || !text) return text || ''
  const query = inputValue.value.trim()
  if (!query) return text
  
  // Escape regex characters
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${safeQuery})`, 'gi')
  // Using neon yellow/green for highlight in dark mode
  return text.replace(regex, '<span class="text-warning fw-bold">$1</span>')
}

// Selection Handling
const selectItem = (item: PccesCatalogItem) => {
  // Update Input Display: "Code Name"
  inputValue.value = `${item.code} ${item.name}`
  
  // Update Model Value: ID
  emit('update:modelValue', item.id)
  emit('select', item)
  
  showDropdown.value = false
}

// Keyboard Navigation
const onArrowDown = () => {
  if (results.value.length === 0) return
  if (selectedIndex.value < results.value.length - 1) {
    selectedIndex.value++
    scrollToSelected()
  }
}

const onArrowUp = () => {
  if (results.value.length === 0) return
  if (selectedIndex.value > 0) {
    selectedIndex.value--
    scrollToSelected()
  }
}

const onEnter = () => {
  if (showDropdown.value && selectedIndex.value >= 0 && results.value[selectedIndex.value]) {
    selectItem(results.value[selectedIndex.value])
  }
}

// Scroll to keep selected item in view
const scrollToSelected = () => {
  if (!dropdownRef.value) return
  const top = selectedIndex.value * itemHeight
  const bottom = top + itemHeight
  const currentScrollTop = dropdownRef.value.scrollTop
  const clientH = dropdownRef.value.clientHeight
  
  if (top < currentScrollTop) {
    dropdownRef.value.scrollTop = top
  } else if (bottom > currentScrollTop + clientH) {
    dropdownRef.value.scrollTop = bottom - clientH
  }
}

// Sync Scroll Top for Virtual Scroll
const onScroll = (e: Event) => {
  scrollTop.value = (e.target as HTMLElement).scrollTop
}

</script>

<style scoped>
.pcces-autocomplete {
  width: 100%;
}

.pcces-dropdown {
  /* Position is now handled by inline styles via JS */
  max-height: 300px; /* Matched with containerHeight */
  overflow-y: auto;
  scrollbar-width: thin;
  scrollbar-color: #6c757d #343a40;
  
  /* Force opaque background to fix transparency issue */
  background-color: #212529 !important; 
  border: 1px solid #495057;
  
  /* Shadow for floating effect */
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.5) !important;
}

/* Custom Scrollbar for Webkit */
.pcces-dropdown::-webkit-scrollbar {
    width: 8px;
}
.pcces-dropdown::-webkit-scrollbar-track {
    background: #343a40;
}
.pcces-dropdown::-webkit-scrollbar-thumb {
    background-color: #6c757d;
    border-radius: 4px;
}

.virtual-scroll-container {
  position: relative;
  width: 100%;
  /* Ensure container doesn't block events */
  pointer-events: auto;
}

.pcces-item {
  position: absolute;
  /* Use top logic instead of transform used in template */
  left: 0;
  width: 100%;
  height: 45px; /* Matched with itemHeight */
  
  /* Ensure border is included in height calculation to prevent drift */
  box-sizing: border-box; 
  overflow: hidden; /* Prevent content spill */
  
  cursor: pointer;
  background-color: #212529; /* Dark bg */
  color: #fff;
  transition: background-color 0.1s;
  
  /* Ensure higher z-index than background if needed, though mostly standard flow */
  z-index: 1;
}

.pcces-item:hover, .pcces-item.active {
  background-color: #343a40 !important; /* Force hover color */
  z-index: 2; /* Bring hovered item to top just in case */
}

/* Column Styles */
.item-code {
  min-width: 80px; /* Fixed min width */
  margin-right: 0.5rem;
}

.item-unit {
  min-width: 40px;
  text-align: right;
}

.disabled-item {
    cursor: default;
    background-color: #212529;
}

/* Placeholder styling */
.placeholder-muted::placeholder {
    color: #6c757d;
    opacity: 1;
}
</style>
