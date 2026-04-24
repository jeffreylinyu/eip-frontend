<template>
  <Modal
    :show="show"
    title="材料與檢驗"
    icon="fa fa-flask"
    size="xl"
    :hideConfirmButton="true"
    cancelText="關閉"
    @update:show="$emit('update:show', $event)"
  >
    <template #body>
      <MaterialInspectionPanel
        :construction-id="constructionId"
        :design-change-id="designChangeId"
        :materials="materials"
        :test-items="testItems"
        :active="show"
      />
    </template>
  </Modal>
</template>

<script setup lang="ts">
import Modal from '@/components/bootstrap/Modal.vue'
import MaterialInspectionPanel from '@/components/project/MaterialInspectionPanel.vue'

type ModalMaterial = {
  id: number
  refItemNo?: string | null
  itemCode?: string | null
  name: string
}

type ModalTestItem = {
  id: number
  itemNo?: string | null
  pccesCode?: string | null
  name: string
}

const props = defineProps<{
  show: boolean
  constructionId: string
  designChangeId: number | null
  materials: ModalMaterial[]
  testItems: ModalTestItem[]
}>()

defineEmits<{ 'update:show': [value: boolean] }>()
</script>

<style scoped>
/* 內容已移至 MaterialInspectionPanel */
</style>

