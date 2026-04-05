<template>
  <div class="contractor-basic-data">
    <div class="view-badge mb-3">
      <span class="badge bg-success">
        <i class="bi bi-eye me-1"></i>
        營造視角
      </span>
    </div>
    <BasicDataView />
  </div>
</template>

<script setup lang="ts">
import BasicDataView from '@/views/basic/BasicData.vue'
</script>

<style scoped>
.view-badge {
  display: flex;
  justify-content: flex-end;
}
</style>
