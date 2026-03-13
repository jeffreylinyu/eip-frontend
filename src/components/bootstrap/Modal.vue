<template>
  <Teleport to="body">
    <div 
      v-if="show"
      :id="modalId"
      :class="['modal', 'fade', 'show', props.modalClass, { 'modal-elevated': props.elevateZIndex }]"
      tabindex="-1"
      :aria-labelledby="modalId + 'Label'"
      aria-hidden="false"
      style="display: block;"
    >
      <div 
        class="modal-dialog" 
        :class="modalSizeClass"
        ref="modalDialog"
      >
        <div class="modal-content" ref="modalContent">
          <!-- Header -->
          <div 
            v-if="!hideHeader" 
            class="modal-header modal-header-draggable"
            @mousedown="startDrag"
          >
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
          
          <!-- 調整大小控制點 -->
          <div v-if="resizable" class="resize-handle resize-handle-e" @mousedown="startResize($event, 'e')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-s" @mousedown="startResize($event, 's')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-w" @mousedown="startResize($event, 'w')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-n" @mousedown="startResize($event, 'n')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-se" @mousedown="startResize($event, 'se')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-sw" @mousedown="startResize($event, 'sw')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-ne" @mousedown="startResize($event, 'ne')"></div>
          <div v-if="resizable" class="resize-handle resize-handle-nw" @mousedown="startResize($event, 'nw')"></div>
        </div>
      </div>
    </div>
    
    <!-- Backdrop -->
    <div 
      v-if="show && backdrop !== false" 
      :class="['modal-backdrop', 'fade', 'show', { 'modal-backdrop-elevated': props.elevateZIndex }]"
      @click="handleBackdropClick"
    ></div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, nextTick, ref, onMounted, onUnmounted } from 'vue'

interface Props {
  show: boolean
  title?: string
  icon?: string
  size?: 'sm' | 'lg' | 'xl' | 'xxl' | 'fullscreen'
  modalId?: string
  /** 額外 class 掛在 modal 根節點（因 Teleport 無法自動繼承父層 class） */
  modalClass?: string
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
  draggable?: boolean  // 新增：是否可拖曳
  resizable?: boolean  // 新增：是否可調整大小
  /** 提高 z-index，用於疊在其它 Modal 之上（例如從另一 Modal 內開啟的選擇器） */
  elevateZIndex?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  icon: '',
  size: 'lg',
  modalId: 'modal',
  modalClass: '',
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
  keyboard: true,
  draggable: true,  // 預設為可拖曳
  resizable: true,  // 預設為可調整大小
  elevateZIndex: false
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
  if (props.backdrop === true) {
    handleClose()
  }
}

// 監聽show變化，處理body樣式
watch(() => props.show, (newShow) => {
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

// ===== 拖曳功能 =====
const modalDialog = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const modalStartX = ref(0)
const modalStartY = ref(0)

const startDrag = (e: MouseEvent) => {
  if (!props.draggable || !modalDialog.value) return
  
  // 只有點擊 header 區域才開始拖曳（不包括按鈕）
  const target = e.target as HTMLElement
  if (target.classList.contains('btn-close') || target.closest('.btn-close')) {
    return
  }
  
  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  
  // 獲取當前位置和尺寸
  const rect = modalDialog.value.getBoundingClientRect()
  modalStartX.value = rect.left
  modalStartY.value = rect.top
  
  // 添加拖曳樣式，保持原有寬度和高度
  if (modalDialog.value.style.position !== 'fixed') {
    modalDialog.value.style.position = 'fixed'
    modalDialog.value.style.margin = '0'
    modalDialog.value.style.left = `${modalStartX.value}px`
    modalDialog.value.style.top = `${modalStartY.value}px`
    // 保持原有寬度（如果已經有設定寬度則保持，否則使用當前寬度）
    if (!modalDialog.value.style.width) {
      modalDialog.value.style.width = `${rect.width}px`
    }
    if (!modalDialog.value.style.height) {
      modalDialog.value.style.height = `auto`
    }
    modalDialog.value.style.maxWidth = 'none'
  }
  
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  
  e.preventDefault()
}

const onDrag = (e: MouseEvent) => {
  if (!isDragging.value || !modalDialog.value) return
  
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  
  const newX = modalStartX.value + deltaX
  const newY = modalStartY.value + deltaY
  
  // 限制在視窗範圍內
  const maxX = window.innerWidth - modalDialog.value.offsetWidth
  const maxY = window.innerHeight - modalDialog.value.offsetHeight
  
  modalDialog.value.style.left = `${Math.max(0, Math.min(newX, maxX))}px`
  modalDialog.value.style.top = `${Math.max(0, Math.min(newY, maxY))}px`
}

const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 當 modal 顯示時重置位置
watch(() => props.show, (newShow) => {
  if (newShow && modalDialog.value) {
    nextTick(() => {
      if (modalDialog.value) {
        // 重置為居中
        modalDialog.value.style.position = ''
        modalDialog.value.style.margin = ''
        modalDialog.value.style.left = ''
        modalDialog.value.style.top = ''
        modalDialog.value.style.width = ''
        modalDialog.value.style.height = ''
        modalDialog.value.style.maxWidth = ''
      }
    })
  }
})

// 清理事件監聽器
onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
})

// ===== 調整大小功能 =====
const modalContent = ref<HTMLElement | null>(null)
const isResizing = ref(false)
const resizeDirection = ref<string>('')
const resizeStartX = ref(0)
const resizeStartY = ref(0)
const resizeStartWidth = ref(0)
const resizeStartHeight = ref(0)
const resizeStartLeft = ref(0)
const resizeStartTop = ref(0)

const startResize = (e: MouseEvent, direction: string) => {
  if (!props.resizable || !modalDialog.value || !modalContent.value) return
  
  isResizing.value = true
  resizeDirection.value = direction
  resizeStartX.value = e.clientX
  resizeStartY.value = e.clientY
  
  // 確保 modal 已經是 fixed 定位，並保持原有尺寸
  const rect = modalDialog.value.getBoundingClientRect()
  if (modalDialog.value.style.position !== 'fixed') {
    modalDialog.value.style.position = 'fixed'
    modalDialog.value.style.margin = '0'
    modalDialog.value.style.left = `${rect.left}px`
    modalDialog.value.style.top = `${rect.top}px`
    // 保持原有寬度和高度
    if (!modalDialog.value.style.width) {
      modalDialog.value.style.width = `${rect.width}px`
    }
    if (!modalDialog.value.style.height) {
      modalDialog.value.style.height = `${rect.height}px`
    }
    modalDialog.value.style.maxWidth = 'none'
  }
  
  resizeStartWidth.value = modalDialog.value.offsetWidth
  resizeStartHeight.value = modalDialog.value.offsetHeight
  resizeStartLeft.value = rect.left
  resizeStartTop.value = rect.top
  
  document.addEventListener('mousemove', onResize)
  document.addEventListener('mouseup', stopResize)
  
  e.preventDefault()
  e.stopPropagation()
}

const onResize = (e: MouseEvent) => {
  if (!isResizing.value || !modalDialog.value) return
  
  const deltaX = e.clientX - resizeStartX.value
  const deltaY = e.clientY - resizeStartY.value
  
  let newWidth = resizeStartWidth.value
  let newHeight = resizeStartHeight.value
  let newLeft = resizeStartLeft.value
  let newTop = resizeStartTop.value
  
  const minWidth = 300
  const minHeight = 200
  
  // 根據方向調整大小
  if (resizeDirection.value.includes('e')) {
    newWidth = Math.max(minWidth, resizeStartWidth.value + deltaX)
  }
  if (resizeDirection.value.includes('w')) {
    const widthChange = resizeStartWidth.value - deltaX
    if (widthChange >= minWidth) {
      newWidth = widthChange
      newLeft = resizeStartLeft.value + deltaX
    }
  }
  if (resizeDirection.value.includes('s')) {
    newHeight = Math.max(minHeight, resizeStartHeight.value + deltaY)
  }
  if (resizeDirection.value.includes('n')) {
    const heightChange = resizeStartHeight.value - deltaY
    if (heightChange >= minHeight) {
      newHeight = heightChange
      newTop = resizeStartTop.value + deltaY
    }
  }
  
  // 限制在視窗範圍內
  const maxWidth = window.innerWidth - newLeft
  const maxHeight = window.innerHeight - newTop
  
  newWidth = Math.min(newWidth, maxWidth)
  newHeight = Math.min(newHeight, maxHeight)
  
  modalDialog.value.style.width = `${newWidth}px`
  modalDialog.value.style.maxWidth = 'none'
  modalDialog.value.style.height = `${newHeight}px`
  modalDialog.value.style.left = `${newLeft}px`
  modalDialog.value.style.top = `${newTop}px`
}

const stopResize = () => {
  isResizing.value = false
  resizeDirection.value = ''
  document.removeEventListener('mousemove', onResize)
  document.removeEventListener('mouseup', stopResize)
}
</script>

<style scoped>
.modal {
  z-index: 1055;
}

.modal-backdrop {
  z-index: 1050;
}

.modal-elevated {
  z-index: 1065 !important;
}

.modal-backdrop-elevated {
  z-index: 1060 !important;
}

/* 確保modal在最上層 */
.modal.show {
  display: block !important;
}

/* 可拖曳的 header 樣式 */
.modal-header-draggable {
  cursor: move;
  user-select: none;
}

.modal-header-draggable:active {
  cursor: grabbing;
}

/* 拖曳時的樣式 */
.modal-dialog {
  transition: none;
}

/* 調整大小控制點 */
.resize-handle {
  position: absolute;
  background: transparent;
  z-index: 10;
}

/* 邊緣控制點 */
.resize-handle-e,
.resize-handle-w {
  width: 12px; /* 增加寬度讓更容易觸發 */
  top: 0;
  bottom: 0;
  cursor: ew-resize;
}

.resize-handle-e {
  right: -6px; /* 向右偏移，避免擋住滾動條 */
}

.resize-handle-w {
  left: -6px; /* 向左偏移，保持對稱 */
}

.resize-handle-n,
.resize-handle-s {
  height: 12px; /* 增加高度讓更容易觸發 */
  left: 0;
  right: 0;
  cursor: ns-resize;
}

.resize-handle-n {
  top: -6px; /* 向上偏移 */
}

.resize-handle-s {
  bottom: -6px; /* 向下偏移，避免擋住滾動條 */
}

/* 角落控制點 */
.resize-handle-se,
.resize-handle-sw,
.resize-handle-ne,
.resize-handle-nw {
  width: 20px; /* 增加尺寸讓更容易觸發 */
  height: 20px;
}

.resize-handle-se {
  right: -10px; /* 向右下偏移，避免擋住滾動條 */
  bottom: -10px;
  cursor: nwse-resize;
}

.resize-handle-sw {
  left: -10px; /* 向左下偏移 */
  bottom: -10px;
  cursor: nesw-resize;
}

.resize-handle-ne {
  right: -10px; /* 向右上偏移 */
  top: -10px;
  cursor: nesw-resize;
}

.resize-handle-nw {
  left: -10px; /* 向左上偏移 */
  top: -10px;
  cursor: nwse-resize;
}

/* 調整大小時的視覺提示 */
.resize-handle:hover {
  background: rgba(var(--bs-primary-rgb), 0.1);
}

/* modal-content 相對定位以支援絕對定位的控制點 */
.modal-content {
  position: relative;
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 40px); /* 限制最大高度 */
  min-height: 200px; /* 最小高度 */
  height: 100%; /* 保持可調整高度 */
}

/* modal-body 需要能夠伸縮 */
.modal-body {
  flex: 1;
  overflow: auto; /* 恢復滾動功能 */
  min-height: 0;
  position: relative; /* 為日期選擇器提供定位上下文 */
}

/* 確保 modal-dialog 高度可調 */
.modal-dialog {
  display: flex;
  align-items: flex-start;
  max-height: calc(100vh - 40px); /* 最大高度為螢幕高度減去上下邊距 */
  margin: 20px auto; /* 保持上下 20px 邊距 */
}

/* 當 modal-dialog 使用 fixed 定位時（拖曳/調整大小），允許高度調整 */
.modal-dialog[style*="position: fixed"] {
  height: auto;
}
</style> 