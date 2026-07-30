<template>
  <div class="page-wrapper d-flex flex-column">
    <PageHeader
      title="施工進度"
      icon="fa fa-chart-gantt"
      :breadcrumbs="[
        { text: '工程排程管理', href: 'javascript:;' },
        { text: '施工進度', active: true },
      ]"
    />

    <div v-if="!constructionId" class="alert alert-warning mb-0">
      <i class="fa fa-exclamation-triangle me-2"></i>
      請先於上方選擇工程案，再進行施工進度編排。
    </div>

    <ProgressScheduleEditor
      v-else
      :model-value="tasks"
      :construction-id="constructionId"
      :title="projectName"
      :source-type="sourceType"
      :source-label="sourceLabel"
      :loading="progress2Store.loading"
      @update:model-value="progress2Store.setTasks"
    >
      <template v-if="isContractor" #toolbar-actions>
        <button
          type="button"
          class="win-btn win-btn--sm schedule-submit-btn"
          :disabled="!tasks.length || savingSnapshot"
          @click="handleSaveToSubmission"
        >
          <i class="fa" :class="savingSnapshot ? 'fa-spinner fa-spin' : 'fa-file-circle-plus'"></i>
          儲存到送審文件
        </button>
      </template>
    </ProgressScheduleEditor>
  </div>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, onMounted, ref, watch } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import ProgressScheduleEditor from './components/ProgressScheduleEditor.vue'
import { useWorkspaceStore } from '@/stores/workspace'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { useProgress2Store } from '@/stores/progress2'
import { saveProgress2Plan } from '@/api/progress2'
import { createG2ScheduleSnapshot } from '@/api/g2ScheduleForm'

const workspaceStore = useWorkspaceStore()
const progress2Store = useProgress2Store()
const { viewType, isContractor } = useViewPerspective()
const proxy = getCurrentInstance()?.proxy as any
const savingSnapshot = ref(false)

const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')
const projectName = computed(() => (workspaceStore.currentProject as any)?.name || '')
const tasks = computed(() => progress2Store.tasks)
const sourceType = computed<'supervisory' | 'contractor'>(() =>
  isContractor.value ? 'contractor' : 'supervisory',
)
const sourceLabel = computed(() => (isContractor.value ? '分項工程' : '施工項目'))

watch(
  [constructionId, viewType],
  ([cid, vt]) => progress2Store.setContext(cid, String(vt || 'SUPERVISORY')),
  { immediate: true },
)

onMounted(async () => {
  if (!workspaceStore.currentWorkspace) await workspaceStore.initWorkspaces()
  progress2Store.setContext(constructionId.value, String(viewType.value || 'SUPERVISORY'))
})

const handleSaveToSubmission = async () => {
  if (!constructionId.value || !tasks.value.length || savingSnapshot.value) return
  savingSnapshot.value = true
  try {
    // 強制同步目前畫面，避免 store 的 debounce 尚未完成時建立到舊快照。
    await saveProgress2Plan(constructionId.value, 'CONTRACTOR', tasks.value)
    await createG2ScheduleSnapshot(constructionId.value)
    proxy?.$toast?.success?.('目前施工進度已儲存至 G-2 施工網狀圖')
  } catch (error) {
    console.error('[G2] 建立送審快照失敗', error)
    proxy?.$toast?.error?.('儲存到送審文件失敗')
  } finally {
    savingSnapshot.value = false
  }
}
</script>

<style scoped>
.page-wrapper {
  min-height: calc(100vh - 120px);
  padding: 1rem;
  background:
    radial-gradient(1200px 600px at 12% 0%, rgba(var(--bs-primary-rgb), 0.06), transparent 60%),
    radial-gradient(900px 500px at 88% 10%, rgba(255, 255, 255, 0.03), transparent 55%),
    rgba(15, 23, 42, 0.1);
}
.schedule-submit-btn {
  min-height: 31px;
}
</style>
