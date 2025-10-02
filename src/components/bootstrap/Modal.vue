<template>
  <Teleport to="body">
    <div 
      v-if="show"
      :id="modalId"
      class="modal fade show"
      tabindex="-1"
      :aria-labelledby="modalId + 'Label'"
      aria-hidden="false"
      style="display: block;"
    >
      <div class="modal-dialog" :class="modalSizeClass">
        <div class="modal-content">
          <!-- Header -->
          <div v-if="!hideHeader" class="modal-header">
            <h5 :id="modalId + 'Label'" class="modal-title">
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
              :disabled="isLoading"
            ></button>
          </div>
          
          <!-- Body -->
          <div class="modal-body">
            <slot name="body">
              <slot></slot>
            </slot>
          </div>
          
          <!-- Footer -->
          <div v-if="!hideFooter" class="modal-footer">
            <slot name="footer">
              <button 
                v-if="!hideCancelButton"
                type="button" 
                class="btn btn-outline-secondary" 
                @click="handleClose"
                :disabled="isLoading"
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
    </div>
    
    <!-- Backdrop -->
    <div 
      v-if="show" 
      class="modal-backdrop fade show"
      @click="handleBackdropClick"
    ></div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick } from 'vue'

interface Props {
  show: boolean
  title?: string
  icon?: string
  size?: 'sm' | 'lg' | 'xl' | 'xxl' | 'fullscreen'
  modalId?: string
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
  size: 'lg',
  modalId: 'modal',
  hideHeader: false,
  hideFooter: false,
  hideCloseButton: false,
  hideCancelButton: false,
  hideConfirmButton: false,
  cancelText: '取消',
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
  submit: []
  shown: []
  hidden: []
}>()

// 計算屬性
const modalSizeClass = computed(() => {
  switch (props.size) {
    case 'sm': return 'modal-sm'
    case 'lg': return 'modal-lg'
    case 'xl': return 'modal-xl'
    case 'xxl': return 'modal-xxl'
    case 'fullscreen': return 'modal-fullscreen'
    default: return ''
  }
})

// 方法
const handleClose = () => {
  emit('update:show', false)
  emit('hide')
}

const handleConfirm = () => {
  emit('confirm')
  emit('submit')
}

const handleBackdropClick = () => {
  // console.log('Modal backdrop clicked')
  if (props.backdrop === true) {
    handleClose()
  }
}

// 監聽show變化，處理body樣式
watch(() => props.show, (newShow) => {
  // console.log('Modal show changed:', newShow, 'modalId:', props.modalId)
  nextTick(() => {
    if (newShow) {
      document.body.classList.add('modal-open')
      // 計算scrollbar寬度並設置padding
      const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth
      if (scrollbarWidth > 0) {
        document.body.style.paddingRight = `${scrollbarWidth}px`
      }
      emit('shown')
    } else {
      document.body.classList.remove('modal-open')
      document.body.style.paddingRight = ''
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
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

/* 確保modal在最上層 */
.modal.show {
  display: block !important;
}
</style> 