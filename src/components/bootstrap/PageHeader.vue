<script setup lang="ts">


// Props
const props = defineProps<{
  title: string
  icon?: string
  breadcrumbs?: Array<{
    text: string
    href?: string
    active?: boolean
  }>
  actions?: Array<{
    text: string
    icon?: string
    variant?: string
    href?: string
    click?: () => void
    disabled?: boolean
    loading?: boolean
  }>
}>()
</script>

<template>
  <div class="d-flex align-items-center justify-content-between mb-4">
    <div>
      <!-- 頁面標題 -->
      <h1 class="page-header-title">
        <i v-if="icon" :class="`${icon} me-3`"></i>
        {{ title }}
      </h1>
      
      <!-- 麵包屑導航 -->
      <ol v-if="breadcrumbs && breadcrumbs.length > 0" class="breadcrumb">
        <li 
          v-for="(crumb, index) in breadcrumbs" 
          :key="index"
          class="breadcrumb-item"
          :class="{ active: crumb.active }"
        >
          <a v-if="crumb.href && !crumb.active" :href="crumb.href">{{ crumb.text }}</a>
          <span v-else>{{ crumb.text }}</span>
        </li>
      </ol>
    </div>
    
    <!-- 右側：自訂內容 slot + 操作按鈕 -->
    <div class="d-flex align-items-center gap-3 flex-wrap">
      <slot name="extra"></slot>
      <div v-if="actions && actions.length > 0" class="d-flex gap-2">
        <button 
          v-for="(action, index) in actions" 
          :key="index"
          :class="`btn ${action.variant || 'btn-outline-secondary'}`"
          :disabled="action.disabled || action.loading"
          @click="action.click"
        >
          <span v-if="action.loading" class="spinner-border spinner-border-sm me-2"></span>
          <i v-else-if="action.icon" :class="`${action.icon} me-2`"></i>
          {{ action.text }}
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.page-header-title {
  font-size: 1.75rem;
  font-weight: 600;
  color: var(--bs-theme);
  margin-bottom: 0.5rem;
}
</style>
