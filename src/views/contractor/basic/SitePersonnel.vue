<template>
  <div class="contractor-site-personnel">
    <div class="view-badge mb-3">
      <span class="badge bg-success">
        <i class="bi bi-eye me-1"></i>
        營造視角
      </span>
    </div>
    <SitePersonnelView />
  </div>
</template>

<script setup lang="ts">
import SitePersonnelView from '@/views/basic/SitePersonnel.vue'
</script>

<style scoped>
.view-badge {
  display: flex;
  justify-content: flex-end;
}
</style>
