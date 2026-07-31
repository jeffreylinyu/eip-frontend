<script setup lang="ts">
import { useViewPerspective } from '@/composables/useViewPerspective'
import DailyReportOverview from '@/views/daily-report/DailyReportOverview.vue'
import SupervisoryDailyReport from '@/views/daily-report/SupervisoryDailyReport.vue'

const { isSupervisory } = useViewPerspective()
</script>

<template>
  <SupervisoryDailyReport v-if="isSupervisory" />
  <DailyReportOverview v-else />
</template>
