<template>
  <Teleport to="body">
    <!-- Backdrop -->
    <div 
      v-if="show" 
      class="drawer-backdrop fade show"
      @click="handleBackdropClick"
    ></div>
    
    <!-- Drawer -->
    <div 
      v-if="show"
      :class="['drawer', 'drawer-end', drawerSizeClass, 'show']"
      :style="{ display: 'block' }"
    >
      <div class="drawer-content">
        <!-- Header -->
        <div v-if="!hideHeader" class="drawer-header">
          <h5 class="drawer-title">
            <slot name="header">
              <i v-if="icon" :class="icon + ' me-2'"></i>
              {{ title }}
            </slot>
          </h5>
          <button 
            v-if="!hideCloseButton"
            type="button" 
            class="btn-close" 
            @click="handleClose"
          ></button>
        </div>
        
        <!-- Body -->
        <div class="drawer-body">
          <slot name="body">
            <slot></slot>
          </slot>
        </div>
        
        <!-- Footer -->
        <div v-if="!hideFooter" class="drawer-footer">
          <slot name="footer">
            <button 
              v-if="!hideCancelButton"
              type="button" 
              class="btn btn-outline-secondary" 
              @click="handleClose"
            >
              {{ cancelText }}
            </button>
            <button 
              v-if="!hideConfirmButton"
              type="button" 
              :class="confirmButtonClass"
              @click="handleConfirm"
              :disabled="isLoading"
            >
              <span v-if="isLoading" class="spinner-border spinner-border-sm me-2"></span>
              <i v-else-if="confirmIcon" :class="confirmIcon + ' me-2'"></i>
              {{ isLoading ? loadingText : confirmText }}
            </button>
          </slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'

interface Props {
  show: boolean
  title?: string
  icon?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  hideHeader?: boolean
  hideFooter?: boolean
  hideCloseButton?: boolean
  hideCancelButton?: boolean
  hideConfirmButton?: boolean
  cancelText?: string
  confirmText?: string
  confirmIcon?: string
  confirmButtonClass?: string
  loadingText?: string
  isLoading?: boolean
  backdrop?: boolean | 'static'
  keyboard?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  icon: '',
  size: 'md',
  hideHeader: false,
  hideFooter: false,
  hideCloseButton: false,
  hideCancelButton: false,
  hideConfirmButton: true,
  cancelText: '關閉',
  confirmText: '確認',
  confirmIcon: '',
  confirmButtonClass: 'btn btn-theme',
  loadingText: '處理中...',
  isLoading: false,
  backdrop: true,
  keyboard: true
})

const emit = defineEmits<{
  'update:show': [value: boolean]
  hide: []
  confirm: []
  shown: []
  hidden: []
}>()

// 計算屬性
const drawerSizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'drawer-sm'
    case 'md': return 'drawer-md'
    case 'lg': return 'drawer-lg'
    case 'xl': return 'drawer-xl'
    default: return 'drawer-md'
  }
})

// 方法
const handleClose = () => {
  emit('update:show', false)
  emit('hide')
}

const handleConfirm = () => {
  emit('confirm')
}

const handleBackdropClick = () => {
  if (props.backdrop === true) {
    handleClose()
  }
}

// 監聽show變化，處理body樣式
watch(() => props.show, (newShow) => {
  nextTick(() => {
    if (newShow) {
      document.body.classList.add('drawer-open')
      emit('shown')
    } else {
      document.body.classList.remove('drawer-open')
      emit('hidden')
    }
  })
})

// 鍵盤事件處理
const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === 'Escape' && props.keyboard && props.show) {
    handleClose()
  }
}

// 監聽ESC鍵
watch(() => props.show, (newShow) => {
  if (newShow) {
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.removeEventListener('keydown', handleKeydown)
  }
})
</script>

<style scoped>
.drawer-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 1040;
  width: 100vw;
  height: 100vh;
  background-color: rgba(0, 0, 0, 0.5);
  opacity: 1;
}

.drawer {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 1050;
  width: 100%;
  height: 100vh;
  background-color: transparent;
  transform: translateX(100%);
  transition: transform 0.3s ease-in-out;
}

.drawer.show {
  transform: translateX(0);
}

.drawer-content {
  position: relative;
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  background-color: var(--bs-body-bg);
  border-left: 1px solid var(--bs-border-color);
  box-shadow: -2px 0 10px rgba(0, 0, 0, 0.1);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--bs-border-color);
  background-color: var(--bs-body-bg);
}

.drawer-title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--bs-body-color);
}

.drawer-body {
  flex: 1;
  padding: 1.5rem;
  overflow-y: auto;
}

.drawer-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid var(--bs-border-color);
  background-color: var(--bs-body-bg);
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
}

/* 尺寸變化 */
.drawer-sm {
  width: 300px;
  max-width: 300px;
}

.drawer-md {
  width: 400px;
  max-width: 400px;
}

.drawer-lg {
  width: 500px;
  max-width: 500px;
}

.drawer-xl {
  width: 600px;
  max-width: 600px;
}

/* 響應式 */
@media (max-width: 768px) {
  .drawer-sm,
  .drawer-md,
  .drawer-lg,
  .drawer-xl {
    width: 100%;
    max-width: 100%;
  }
}

/* Body 樣式 */
:global(body.drawer-open) {
  overflow: hidden;
}

/* 滾動條樣式 */
.drawer-body::-webkit-scrollbar {
  width: 6px;
}

.drawer-body::-webkit-scrollbar-track {
  background: var(--bs-gray-100);
}

.drawer-body::-webkit-scrollbar-thumb {
  background: var(--bs-gray-400);
  border-radius: 3px;
}

.drawer-body::-webkit-scrollbar-thumb:hover {
  background: var(--bs-gray-500);
}
</style> 