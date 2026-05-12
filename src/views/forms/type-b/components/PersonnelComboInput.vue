<script setup lang="ts">
/**
 * 「下拉選單 + 自由輸入」combobox。
 *
 * 用於 P-3 安全衛生組織架構圖中「品管人員」「勞安／安衛管理組組長」這類欄位：
 * - 下拉列出當前專案的工地人員姓名（從父層傳入 `options`）
 * - 也可以直接在 input 中自行輸入未列名的姓名
 *
 * 行為：
 * - 點 input 右側下拉箭頭按鈕：開／關下拉選單
 * - 點選下拉項目：填入 input，關閉選單
 * - input 中打字：以「包含關鍵字」方式即時過濾下拉選單，但不限制最終值（仍可保留自訂值）
 * - 點 wrapper 以外任意位置：關閉選單
 *
 * 視覺上以 Bootstrap input-group 類風格呈現，搭配 fontawesome chevron 圖示。
 */
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

interface Props {
  modelValue: string
  options: string[]
  placeholder?: string
  /** 沒有任何下拉項目時，於選單內顯示的提示文字 */
  emptyHint?: string
  /** input 的 aria-label，可選 */
  ariaLabel?: string
  /** 是否禁用 */
  disabled?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  emptyHint: '（尚無可選人員，請自行輸入）',
  ariaLabel: '',
  disabled: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const wrapperRef = ref<HTMLDivElement | null>(null)
const isOpen = ref(false)

/** input 變更時直接 emit；不會自動關閉下拉，讓使用者邊打邊看篩選結果 */
function onInput(event: Event) {
  const target = event.target as HTMLInputElement
  emit('update:modelValue', target.value)
}

function toggleOpen() {
  if (props.disabled) return
  isOpen.value = !isOpen.value
}

function selectOption(value: string) {
  emit('update:modelValue', value)
  isOpen.value = false
}

/** 依目前 input 文字做「包含」過濾；空白時顯示全部 */
const filteredOptions = computed(() => {
  const kw = (props.modelValue || '').trim()
  if (!kw) return props.options
  const lower = kw.toLowerCase()
  return props.options.filter((name) => name.toLowerCase().includes(lower))
})

function onDocumentMouseDown(event: MouseEvent) {
  if (!isOpen.value) return
  const target = event.target as Node | null
  if (target && wrapperRef.value && wrapperRef.value.contains(target)) return
  isOpen.value = false
}

onMounted(() => {
  document.addEventListener('mousedown', onDocumentMouseDown)
})
onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocumentMouseDown)
})
</script>

<template>
  <div ref="wrapperRef" class="personnel-combo position-relative">
    <div class="input-group input-group-sm">
      <input
        :value="props.modelValue"
        type="text"
        class="form-control form-control-sm"
        :placeholder="props.placeholder"
        :aria-label="props.ariaLabel"
        :disabled="props.disabled"
        autocomplete="off"
        @input="onInput"
        @focus="isOpen = true"
      />
      <button
        type="button"
        class="btn btn-outline-secondary personnel-combo__toggle"
        :disabled="props.disabled"
        :aria-expanded="isOpen ? 'true' : 'false'"
        :aria-label="props.ariaLabel ? `${props.ariaLabel} 下拉選單` : '下拉選單'"
        tabindex="-1"
        @click="toggleOpen"
      >
        <i class="fa" :class="isOpen ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
      </button>
    </div>

    <ul v-if="isOpen" class="personnel-combo__menu list-unstyled m-0 shadow">
      <template v-if="filteredOptions.length">
        <li
          v-for="name in filteredOptions"
          :key="name"
          class="personnel-combo__item"
          @mousedown.prevent="selectOption(name)"
        >
          <i class="fa fa-user me-2 text-muted small"></i>{{ name }}
        </li>
      </template>
      <li v-else class="personnel-combo__item personnel-combo__item--empty text-muted">
        <i class="fa fa-circle-info me-2"></i>{{ props.emptyHint }}
      </li>
    </ul>
  </div>
</template>

<style scoped>
/*
 * 暗黑主題樣式 — 與 P-3 頁面 .text-panel__textarea 同色系。
 * - input：暗透明底 + 半透明白邊 + 高對比白字
 * - 下拉按鈕：暗灰底 + 淡白色 chevron
 * - menu：深底（與 AI overlay 相同色階）+ 淡白邊框 + hover 微微提亮
 */
.personnel-combo {
  width: 100%;
}

.personnel-combo :deep(.input-group) {
  background: transparent;
}

.personnel-combo :deep(input.form-control) {
  background: rgba(0, 0, 0, 0.18);
  border-color: rgba(255, 255, 255, 0.14);
  color: rgba(255, 255, 255, 0.92);
}

.personnel-combo :deep(input.form-control::placeholder) {
  color: rgba(255, 255, 255, 0.45);
}

.personnel-combo :deep(input.form-control:focus) {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(var(--bs-primary-rgb), 0.55);
  box-shadow: 0 0 0 0.2rem rgba(var(--bs-primary-rgb), 0.15);
  color: rgba(255, 255, 255, 0.94);
}

.personnel-combo :deep(input.form-control:disabled) {
  background: rgba(0, 0, 0, 0.30);
  color: rgba(255, 255, 255, 0.45);
}

.personnel-combo__toggle {
  min-width: 2.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.18);
  color: rgba(255, 255, 255, 0.85);
}

.personnel-combo__toggle:hover:not(:disabled),
.personnel-combo__toggle:focus:not(:disabled) {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(255, 255, 255, 0.30);
  color: #ffffff;
  box-shadow: none;
}

.personnel-combo__toggle:disabled {
  opacity: 0.55;
}

.personnel-combo__menu {
  position: absolute;
  z-index: 1080;
  top: calc(100% + 2px);
  left: 0;
  right: 0;
  background: rgba(15, 23, 42, 0.96);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 0.5rem;
  max-height: 240px;
  overflow-y: auto;
  padding: 0.25rem 0;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(2px);
}

.personnel-combo__item {
  padding: 0.45rem 0.85rem;
  cursor: pointer;
  color: rgba(255, 255, 255, 0.9);
  user-select: none;
  display: flex;
  align-items: center;
  transition: background-color 120ms ease;
}

.personnel-combo__item .fa-user {
  color: rgba(255, 255, 255, 0.45);
}

.personnel-combo__item:hover,
.personnel-combo__item:focus {
  background-color: rgba(var(--bs-primary-rgb), 0.18);
  color: #ffffff;
}

.personnel-combo__item:hover .fa-user {
  color: rgba(255, 255, 255, 0.85);
}

.personnel-combo__item--empty {
  cursor: default;
  color: rgba(255, 255, 255, 0.55);
}

.personnel-combo__item--empty:hover {
  background-color: transparent;
  color: rgba(255, 255, 255, 0.55);
}

/* menu scroll bar（暗色細緻款；webkit 系預覽器可見） */
.personnel-combo__menu::-webkit-scrollbar {
  width: 8px;
}
.personnel-combo__menu::-webkit-scrollbar-track {
  background: transparent;
}
.personnel-combo__menu::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
}
.personnel-combo__menu::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.30);
}
</style>
