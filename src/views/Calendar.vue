<template>
  <div class="calendar-page">
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
</style>

