<template>
  <div class="form-table-operation-menu">
    <button
      :data-operation-record-id="recordId"
      type="button"
      class="btn btn-sm btn-outline-secondary dropdown-toggle"
      aria-expanded="false"
      @click.stop="openMenu($event)"
    >
      <i class="fa fa-ellipsis-v me-1"></i>操作
    </button>

    <Teleport to="body">
      <div
        v-if="anchor"
        :class="[themeClass, 'form-table-operation-menu-backdrop']"
        @click="closeMenu"
      >
        <div
          ref="menuEl"
          class="dropdown-menu dropdown-menu-end form-table-operation-dropdown show"
          :style="menuStyle"
          @click.stop
        >
          <slot :record="record" :close="closeMenu" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onBeforeUnmount, nextTick } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 當前列資料，會傳入 slot */
    record: unknown
    /** 用於定位的 id（如 record.id），按鈕與捲動時查詢用 */
    recordId: string
    /** 主題 class，與表單頁 a4-dark / a5-dark 一致，用於下拉樣式 */
    themeClass?: string
    /** 表格外層 ref，捲動時一併更新選單位置 */
    tableWrapperRef?: HTMLElement | null
  }>(),
  { themeClass: 'a5-dark' }
)

const menuEl = ref<HTMLElement | null>(null)
const anchor = ref<{ left: number; top: number } | null>(null)
let docClickListener: (() => void) | null = null
let scrollListener: (() => void) | null = null

const VIEWPORT_PAD = 20

const menuStyle = computed(() => {
  if (!anchor.value) return {}
  return {
    position: 'fixed' as const,
    left: `${Math.round(anchor.value.left)}px`,
    top: `${Math.round(anchor.value.top)}px`,
    zIndex: 1060
  }
})

/** 依視窗邊界調整選單位置，避免超出畫面 */
function clampToViewport(
  left: number,
  top: number,
  menuWidth: number,
  menuHeight: number,
  buttonRect: DOMRect
): { left: number; top: number } {
  const vw = window.innerWidth
  const vh = window.innerHeight
  let x = left
  let y = top
  // 右邊超出 → 改為以按鈕右緣對齊選單右緣，或貼齊視窗
  if (x + menuWidth > vw - VIEWPORT_PAD) {
    x = Math.max(VIEWPORT_PAD, vw - menuWidth - VIEWPORT_PAD)
  }
  if (x < VIEWPORT_PAD) x = VIEWPORT_PAD
  // 下方超出 → 改為在按鈕上方展開
  if (y + menuHeight > vh - VIEWPORT_PAD) {
    y = buttonRect.top - menuHeight - 4
  }
  if (y < VIEWPORT_PAD) y = VIEWPORT_PAD
  return { left: x, top: y }
}

function updatePosition() {
  if (!anchor.value || !props.recordId) return
  const btn = document.querySelector<HTMLElement>(
    `[data-operation-record-id="${CSS.escape(props.recordId)}"]`
  )
  if (!btn) return
  const rect = btn.getBoundingClientRect()
  const menu = menuEl.value
  const w = menu ? menu.offsetWidth : 176
  const h = menu ? menu.offsetHeight : 240
  const { left, top } = clampToViewport(rect.left, rect.bottom + 4, w, h, rect)
  anchor.value = { left, top }
}

function openMenu(event: MouseEvent) {
  const target = event.currentTarget as HTMLElement
  const rect = target.getBoundingClientRect()
  anchor.value = { left: rect.left, top: rect.bottom + 4 }
  docClickListener = () => closeMenu()
  nextTick(() => {
    const menu = menuEl.value
    const w = menu ? menu.offsetWidth : 176
    const h = menu ? menu.offsetHeight : 240
    const { left, top } = clampToViewport(rect.left, rect.bottom + 4, w, h, rect)
    anchor.value = { left, top }
    setTimeout(() => {
      document.addEventListener('click', docClickListener!)
      scrollListener = () => updatePosition()
      window.addEventListener('scroll', scrollListener, true)
      props.tableWrapperRef?.addEventListener('scroll', scrollListener)
    }, 0)
  })
}

function closeMenu() {
  if (docClickListener) {
    document.removeEventListener('click', docClickListener)
    docClickListener = null
  }
  if (scrollListener) {
    window.removeEventListener('scroll', scrollListener, true)
    props.tableWrapperRef?.removeEventListener('scroll', scrollListener)
    scrollListener = null
  }
  anchor.value = null
}

onBeforeUnmount(() => {
  closeMenu()
})

defineExpose({ closeMenu })
</script>

<style scoped>
.form-table-operation-menu {
  display: inline-block;
}

/* 背層：透明，僅用於點擊關閉 */
.form-table-operation-menu-backdrop {
  position: fixed;
  inset: 0;
  z-index: 1059;
  background: transparent;
}

/* 下拉選單：使用 --a5-* 變數（a4-dark 頁面需在 .a4-dark 內設定 --a5-card 等別名） */
.form-table-operation-dropdown {
  position: fixed !important;
  right: auto !important;
  min-width: 11rem;
  background: var(--a5-card, #25282c) !important;
  border: 1px solid var(--a5-border, #4a4d54) !important;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.form-table-operation-dropdown :deep(.dropdown-item) {
  color: var(--a5-text, #e4e6eb);
}

.form-table-operation-dropdown :deep(.dropdown-item:hover) {
  background: var(--a5-hover, rgba(255, 255, 255, 0.06));
  color: var(--a5-text, #e4e6eb);
}

.form-table-operation-dropdown :deep(.dropdown-item.disabled) {
  opacity: 0.7;
  pointer-events: none;
}

.form-table-operation-dropdown :deep(.dropdown-item.text-danger) {
  color: var(--bs-danger, #f87171) !important;
}

.form-table-operation-dropdown :deep(.dropdown-divider) {
  border-color: var(--a5-border, #4a4d54);
}
</style>
