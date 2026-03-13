<template>
  <div class="form-b-export-supervision-plan-page">
    <PageHeader
      title="B-1 監造計劃書"
      icon="fa fa-file-export"
      :breadcrumbs="[
        { text: '表單匯出', href: 'javascript:;' },
        { text: 'B類表單', href: 'javascript:;' },
        { text: 'B-1 監造計劃書', active: true }
      ]"
    />

    <!-- 監造計畫送審紀錄（提取區塊，不使用卡片/頁面 Header） -->
    <FormBPlanSubmissionRecords embedded />
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import FormBPlanSubmissionRecords from '@/views/forms/type-b/FormBPlanSubmissionRecords.vue'
</script>

<style scoped>
.form-b-export-supervision-plan-page {
  padding: 1rem;
}

.icon-circle {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

/* 暗黑模式卡片背景 */
:deep(.card) {
  background-color: var(--bs-component-bg);
  border-color: rgba(255, 255, 255, 0.08);
}
:deep(.card .card-body) {
  background-color: var(--bs-component-bg);
}
:deep(.card .card-header) {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

/* 內層卡片（填寫狀況區） */
:deep(.card .card.border-0.shadow-sm) {
  background-color: rgba(255, 255, 255, 0.03);
  box-shadow: none !important;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
}

/* 依賴設定頁面的子卡片 */
:deep(.row .card.h-100) {
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

/* alert 區塊暗黑適配 */
:deep(.alert-info) {
  background-color: rgba(13, 202, 240, 0.1);
  border-color: rgba(13, 202, 240, 0.2);
  color: #6edff6;
}
:deep(.alert-warning) {
  background-color: rgba(255, 193, 7, 0.1);
  border-color: rgba(255, 193, 7, 0.2);
  color: #ffda6a;
}
:deep(.alert-secondary) {
  background-color: rgba(108, 117, 125, 0.1);
  border-color: rgba(108, 117, 125, 0.2);
  color: #a7acb1;
}
:deep(.alert-success) {
  background-color: rgba(25, 135, 84, 0.1);
  border-color: rgba(25, 135, 84, 0.2);
  color: #75b798;
}
:deep(.alert-danger) {
  background-color: rgba(220, 53, 69, 0.1);
  border-color: rgba(220, 53, 69, 0.2);
  color: #ea868f;
}

/* 匯出操作卡片 */
:deep(.card.border-primary) {
  border-color: rgba(13, 110, 253, 0.4) !important;
}
:deep(.card.border-primary .card-header.bg-primary) {
  background-color: rgba(13, 110, 253, 0.7) !important;
}

/* progress bar 暗黑背景 */
:deep(.progress) {
  background-color: rgba(255, 255, 255, 0.08);
}

/* text-muted 在暗黑模式更亮一點 */
:deep(.text-muted) {
  color: rgba(255, 255, 255, 0.55) !important;
}
</style>

<style scoped>
/* 參考 daily-report 的收合卡片樣式 */
.report-card {
  position: relative;
  background: linear-gradient(135deg, rgba(15, 23, 42, 0.92), rgba(30, 41, 59, 0.85));
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--bs-border-radius, 0.375rem);
}

.report-card--full {
  width: 100%;
}

/* 內容區與 daily-report 一致：沿用卡片背景，不套用其他頁的 .card-body 背景 */
.report-card :deep(.card-body) {
  background: transparent;
}

.report-card__header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--bs-border-color-translucent);
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.08) 0%,
    rgba(var(--bs-primary-rgb), 0.03) 60%,
    transparent 100%
  );
}

.cursor-pointer {
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.cursor-pointer:hover {
  background: linear-gradient(
    135deg,
    rgba(var(--bs-primary-rgb), 0.12) 0%,
    rgba(var(--bs-primary-rgb), 0.06) 60%,
    transparent 100%
  );
}

.report-card__icon {
  font-size: 1.125rem;
}

.report-card__title {
  font-weight: 600;
  font-size: 1rem;
}

.report-card__body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
</style>
