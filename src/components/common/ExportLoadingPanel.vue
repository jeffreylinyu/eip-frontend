<template>
  <Teleport to="body">
    <div
      v-if="store.hasTasks"
      ref="panelRef"
      class="export-loading-panel"
      :class="{ 'export-loading-panel--dragging': isDragging }"
    >
      <div class="export-loading-panel__header" @mousedown="startDrag">
        <span class="export-loading-panel__title">
          <i class="fa fa-file-export me-2"></i>
          匯出中
          <span v-if="store.taskList.length > 1" class="export-loading-panel__count"
            >({{ store.taskList.length }})</span
          >
        </span>
      </div>
      <div class="export-loading-panel__body">
        <div
          v-for="task in store.taskList"
          :key="task.id"
          class="export-loading-item"
        >
          <div class="export-loading-item__row">
            <span class="export-loading-item__label">{{ task.label }}</span>
            <button
              v-if="task.abort"
              type="button"
              class="export-loading-item__cancel"
              title="取消匯出"
              @click="store.cancelTask(task.id)"
            >
              <i class="fa fa-times"></i>
            </button>
          </div>
          <div class="export-loading-item__track">
            <div class="export-loading-item__light"></div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from 'vue'
import { useExportLoadingStore } from '@/stores/export-loading'

const store = useExportLoadingStore()
const panelRef = ref<HTMLElement | null>(null)
const isDragging = ref(false)
const dragStartX = ref(0)
const dragStartY = ref(0)
const panelStartX = ref(0)
const panelStartY = ref(0)

function startDrag(e: MouseEvent) {
  if (!panelRef.value) return
  const target = e.target as HTMLElement
  if (target.closest('.btn-close')) return

  isDragging.value = true
  dragStartX.value = e.clientX
  dragStartY.value = e.clientY
  const rect = panelRef.value.getBoundingClientRect()
  panelStartX.value = rect.left
  panelStartY.value = rect.top

  const el = panelRef.value
  el.style.right = 'auto'
  el.style.bottom = 'auto'
  el.style.width = `${rect.width}px`
  el.style.height = `${rect.height}px`
  el.style.left = `${rect.left}px`
  el.style.top = `${rect.top}px`

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
  e.preventDefault()
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value || !panelRef.value) return
  const deltaX = e.clientX - dragStartX.value
  const deltaY = e.clientY - dragStartY.value
  const newX = panelStartX.value + deltaX
  const newY = panelStartY.value + deltaY
  const maxX = window.innerWidth - panelRef.value.offsetWidth
  const maxY = window.innerHeight - panelRef.value.offsetHeight
  panelRef.value.style.left = `${Math.max(0, Math.min(newX, maxX))}px`
  panelRef.value.style.top = `${Math.max(0, Math.min(newY, maxY))}px`
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

onUnmounted(() => {
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})
</script>

<style lang="scss" scoped>
.export-loading-panel {
  position: fixed;
  z-index: 1060;
  min-width: 280px;
  max-width: 320px;
  background: var(--bs-body-bg, #1e1e2e);
  border: 1px solid var(--bs-border-color, rgba(255, 255, 255, 0.08));
  border-radius: 12px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
  overflow: hidden;
  right: 24px;
  bottom: 24px;
  user-select: none;

  &--dragging {
    cursor: grabbing;
    .export-loading-panel__header {
      cursor: grabbing;
    }
  }

  &__header {
    padding: 10px 14px;
    cursor: grab;
    border-bottom: 1px solid var(--bs-border-color-translucent, rgba(0, 0, 0, 0.1));
    background: var(--bs-tertiary-bg, rgba(255, 255, 255, 0.04));
  }

  &__title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--bs-body-color);
  }

  &__count {
    font-weight: 400;
    opacity: 0.85;
    font-size: 0.85rem;
  }

  &__body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }
}

.export-loading-item {
  &__row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-bottom: 6px;
  }

  &__label {
    font-size: 0.8rem;
    color: var(--bs-secondary-color);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    flex: 1;
    min-width: 0;
  }

  &__cancel {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    padding: 0;
    border: none;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--bs-secondary-color);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    transition: background 0.15s, color 0.15s;
    &:hover {
      background: rgba(220, 53, 69, 0.25);
      color: var(--bs-danger);
    }
  }

  &__track {
    height: 4px;
    border-radius: 2px;
    background: var(--bs-tertiary-bg, rgba(255, 255, 255, 0.06));
    overflow: hidden;
    position: relative;
  }

  &__light {
    position: absolute;
    left: 0;
    top: 0;
    height: 100%;
    width: 42%;
    border-radius: 2px;
    background: linear-gradient(
      90deg,
      transparent 0%,
      var(--bs-primary, #4dabf7) 20%,
      rgba(255, 255, 255, 0.95) 50%,
      var(--bs-primary, #4dabf7) 80%,
      transparent 100%
    );
    box-shadow: 0 0 12px var(--bs-primary, #4dabf7);
    animation: export-light-run 1.4s ease-in-out infinite;
  }
}

@keyframes export-light-run {
  0% {
    transform: translateX(-100%);
    opacity: 0.6;
  }
  15% {
    opacity: 1;
  }
  85% {
    opacity: 1;
  }
  100% {
    transform: translateX(340%);
    opacity: 0.6;
  }
}
</style>
