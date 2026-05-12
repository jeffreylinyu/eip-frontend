<script setup lang="ts">
type Props = {
  /** 會套用到外層 .table-responsive */
  wrapperClass?: string
  /** 會套用到 <table>，會與預設 class 合併 */
  tableClass?: string
  /** 內容超出時，表頭固定在上方（預設開啟） */
  stickyHeader?: boolean
  /** Loading 狀態：預設顯示一列「載入中...」（可用 slot 覆蓋） */
  loading?: boolean
  /** 空資料狀態：預設顯示一列「暫無資料」（可用 slot 覆蓋） */
  empty?: boolean
  /** empty/loading 列的 colspan */
  colspan?: number
}

const props = withDefaults(defineProps<Props>(), {
  wrapperClass: '',
  tableClass: '',
  stickyHeader: true,
  loading: false,
  empty: false,
  colspan: 1
})
</script>

<template>
  <div class="table-responsive cm-table-wrap" :class="[props.wrapperClass, { 'cm-table-wrap--sticky': props.stickyHeader }]">
    <table class="table a4-table mb-0 align-middle" :class="props.tableClass">
      <thead>
        <slot name="head" />
      </thead>

      <tbody>
        <template v-if="props.loading">
          <slot name="loading">
            <tr>
              <td :colspan="props.colspan" class="text-center py-5 text-muted">載入中...</td>
            </tr>
          </slot>
        </template>

        <template v-else-if="props.empty">
          <slot name="empty">
            <tr>
              <td :colspan="props.colspan" class="text-center py-5 text-muted">暫無資料</td>
            </tr>
          </slot>
        </template>

        <slot v-else name="body" />
      </tbody>
    </table>
  </div>
</template>

<style scoped>
/*
  樣式參考 views/forms/type-b/FormSubdivisionWorkItems.vue 的 a4-table 實作
  透過 --a4-* 變數決定配色（通常由父層 .a4-dark 提供）
*/
.a4-table {
  /* 對齊專案常用的 Bootstrap table 邊框風格 */
  border: 1px solid var(--bs-table-border-color, var(--a4-border, var(--bs-border-color)));
  border-collapse: collapse;
  width: 100%;
  color: var(--a4-text, var(--bs-body-color));
  background: var(--a4-card, var(--bs-body-bg));
}

.cm-table-wrap {
  /* 四角微圓 + 淡藍底（與專案常用卡片感一致） */
  border-radius: 10px;
  overflow: hidden;
  background:
    radial-gradient(900px 220px at 18% 0%, rgba(var(--bs-primary-rgb), 0.10), transparent 55%),
    var(--a4-card, var(--bs-body-bg));
}

/* 對齊 /forms/b-construction-maintenance 的表頭底色（暗黑模式預設值） */
:global([data-bs-theme='dark']) :deep(.cm-table-wrap) {
  --a4-thead: #2d3748;
}

.cm-table-wrap--sticky {
  overflow-y: auto;
  max-height: 100%;
}

.cm-table-wrap--sticky .a4-table thead th {
  position: sticky;
  top: 0;
  z-index: 2;
}

.a4-table thead th {
  background: var(--a4-thead, var(--bs-tertiary-bg));
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 0.5rem;
  border: 1px solid var(--bs-table-border-color, var(--a4-border, var(--bs-border-color)));
  color: var(--a4-muted, var(--bs-secondary-color));
}

.a4-table tbody td {
  border: 1px solid var(--bs-table-border-color, var(--a4-border, var(--bs-border-color)));
  padding: 0.6rem 0.5rem;
  vertical-align: middle;
  background: var(--a4-card, var(--bs-body-bg));
  color: var(--a4-text, var(--bs-body-color));
}

.a4-table tbody tr:hover td {
  background: var(--a4-hover, rgba(255, 255, 255, 0.06));
}

.a4-table :deep(.text-muted) {
  color: var(--a4-muted, var(--bs-secondary-color)) !important;
}

.a4-table :deep(.btn-sm) {
  font-size: 0.8rem;
}
</style>

