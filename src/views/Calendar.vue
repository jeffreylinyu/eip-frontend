<template>
  <div class="calendar-page cal-dark">
    <PageHeader
      title="行事曆"
      icon="fa fa-calendar"
      :breadcrumbs="[
        { text: '行事曆', active: true }
      ]"
    />

    <div class="calendar-content mt-4">
      <CalendarWidget />
    </div>
  </div>
</template>

<script setup lang="ts">
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import CalendarWidget from '@/components/dashboard/CalendarWidget.vue'
</script>

<style scoped>
.calendar-page {
  padding: 1rem;
}

/* 暗色主題頁面背景 */
.cal-dark {
  color: #e4e6eb;
}

.cal-dark :deep(.page-header h1),
.cal-dark :deep(.page-header .breadcrumb-item),
.cal-dark :deep(.page-header .breadcrumb-item.active) {
  color: #e4e6eb;
}
</style>

