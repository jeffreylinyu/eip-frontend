<template>
  <div class="contractor-participation-units">
    <div class="view-badge mb-3">
      <span class="badge bg-success">
        <i class="bi bi-eye me-1"></i>
        營造視角
      </span>
    </div>
    <ParticipationUnitsView />
  </div>
</template>

<script setup lang="ts">
import ParticipationUnitsView from '@/views/basic/ParticipationUnits.vue'
</script>

<style scoped>
.view-badge {
  display: flex;
  justify-content: flex-end;
}
</style>
