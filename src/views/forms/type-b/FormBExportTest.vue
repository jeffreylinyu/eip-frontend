<script setup lang="ts">
import { ref } from 'vue'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import Card from '@/components/bootstrap/Card.vue'
import CardBody from '@/components/bootstrap/CardBody.vue'
import CardHeader from '@/components/bootstrap/CardHeader.vue'
import { formBApi, type ExportConstructionReportRequest, downloadBlobAsFile } from '@/api/forms'
import { extractFileNameFromResponse } from '@/utils/blobDownload'
import { useWorkspaceStore } from '@/stores/workspace'

const workspaceStore = useWorkspaceStore()

const isSubmitting = ref(false)
const message = ref<{ type: 'success' | 'danger'; text: string } | null>(null)

const form = ref({
  constructionId: workspaceStore.currentProject?.id || '',
  companyId: workspaceStore.currentProject?.workspaceId || '',
  fileId: '',
  freeVersion: true,
  address: '',
  phone: '',
  itemNumber: 0,
  singleMapText: '{}',
  defaultMapText: '{"chooseProcessCheck":["pccesCode1","pccesCode2"]}',
  inputMapText:
    '{"bonef001":[{"bonef2n":"混凝土澆置","bonef3n":"監造注意事項"}],"bonef011":[{"listName":"送審清單","submitTime":"2025-01-01"}]}'
})

const parseJsonSafely = (text: string, label: string): Record<string, any> | undefined => {
  if (!text || !text.trim()) return undefined
  try {
    return JSON.parse(text)
  } catch (error) {
    throw new Error(`${label} JSON 解析失敗：${(error as Error).message}`)
  }
}

const buildRequest = (): ExportConstructionReportRequest => {
  const singleMap = parseJsonSafely(form.value.singleMapText, 'singleMap')
  const defaultMap = parseJsonSafely(form.value.defaultMapText, 'defaultMap')
  const inputMap = parseJsonSafely(form.value.inputMapText, 'inputMap')

  return {
    itemNumber: Number(form.value.itemNumber) || 0,
    valueMap: {
      reportData: {
        constructionId: form.value.constructionId.trim(),
        companyId: form.value.companyId || undefined,
        fileId: form.value.fileId || undefined,
        freeVersion: form.value.freeVersion,
        address: form.value.address || undefined,
        phone: form.value.phone || undefined,
        itemNumber: Number(form.value.itemNumber) || 0,
        singleMap,
        defaultMap,
        inputMap
      }
    }
  }
}

const handleSubmit = async () => {
  message.value = null
  if (!form.value.constructionId.trim()) {
    message.value = { type: 'danger', text: 'constructionId 為必填' }
    return
  }

  try {
    isSubmitting.value = true
    const request = buildRequest()
    const response = await formBApi.exportSupervisoryPlan(request)
    const fileName = extractFileNameFromResponse(response) || `BOne_${Date.now()}.docx`
    downloadBlobAsFile(response.data, fileName)
    message.value = { type: 'success', text: '匯出成功，檔案已下載。' }
  } catch (error) {
    console.error('匯出失敗', error)
    message.value = { type: 'danger', text: (error as Error).message || '匯出失敗，請稍後再試。' }
  } finally {
    isSubmitting.value = false
  }
}

const fillSampleData = () => {
  form.value.constructionId = workspaceStore.currentProject?.id || 'CT_SAMPLE'
  form.value.companyId = workspaceStore.currentProject?.workspaceId || 'COMPANY_SAMPLE'
  form.value.fileId = 'FILE_SAMPLE'
  form.value.freeVersion = true
  form.value.address = '台北市中正區仁愛路一段1號'
  form.value.phone = '02-12345678'
  form.value.itemNumber = 1
  form.value.singleMapText = '{"supervisoryName":"監造單位名稱","projectManager":"專案經理"}'
  form.value.defaultMapText = '{"chooseProcessCheck":["pccesCode1","pccesCode2"]}'
  form.value.inputMapText =
    '{"bonef001":[{"bonef2n":"工區安全檢點","bonef3n":"安全措施"}],"bonef011":[{"listName":"送審清單","submitTime":"2025-01-01"}]}'
  message.value = { type: 'success', text: '已填入示範資料，可直接測試匯出。' }
}
</script>

<template>
  <div class="container-fluid">
    <div class="row">
      <div class="col-12">
        <PageHeader
          title="B類表單 - 監造計畫書匯出測試"
          icon="fa fa-file-export"
          :breadcrumbs="[
            { text: '表單匯出', href: 'javascript:;' },
            { text: 'B類表單', href: 'javascript:;' },
            { text: '監造計畫書匯出測試', active: true }
          ]"
          :actions="[]"
        />
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <Card>
          <CardHeader>
            <div class="d-flex justify-content-between align-items-center">
              <div>
                <h5 class="mb-0">測試匯出 API</h5>
                <small class="text-muted">
                  端點：POST /generate/export/report/BOne，需攜帶報表 valueMap.reportData
                </small>
              </div>
              <div class="d-flex gap-2">
                <button class="btn btn-outline-secondary btn-sm" type="button" @click="fillSampleData">
                  <i class="fa fa-magic me-1"></i>
                  填入示範資料
                </button>
                <button class="btn btn-theme btn-sm" type="button" :disabled="isSubmitting" @click="handleSubmit">
                  <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                  送出並下載
                </button>
              </div>
            </div>
          </CardHeader>
          <CardBody>
            <div v-if="message" :class="['alert', message.type === 'success' ? 'alert-success' : 'alert-danger']" role="alert">
              {{ message.text }}
            </div>

            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">constructionId <span class="text-danger">*</span></label>
                <input
                  v-model="form.constructionId"
                  type="text"
                  class="form-control"
                  placeholder="必填，例如：CTxxxx"
                  :disabled="isSubmitting"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">companyId</label>
                <input
                  v-model="form.companyId"
                  type="text"
                  class="form-control"
                  placeholder="公司編號"
                  :disabled="isSubmitting"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">fileId</label>
                <input
                  v-model="form.fileId"
                  type="text"
                  class="form-control"
                  placeholder="檔案 ID（可選）"
                  :disabled="isSubmitting"
                />
              </div>

              <div class="col-md-4">
                <label class="form-label">地址 (address)</label>
                <input
                  v-model="form.address"
                  type="text"
                  class="form-control"
                  placeholder="地址"
                  :disabled="isSubmitting"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">電話 (phone)</label>
                <input
                  v-model="form.phone"
                  type="text"
                  class="form-control"
                  placeholder="電話"
                  :disabled="isSubmitting"
                />
              </div>
              <div class="col-md-4">
                <label class="form-label">itemNumber</label>
                <input
                  v-model="form.itemNumber"
                  type="number"
                  class="form-control"
                  placeholder="數字，預設 0"
                  :disabled="isSubmitting"
                />
              </div>

              <div class="col-md-4 d-flex align-items-center mt-3">
                <div class="form-check">
                  <input
                    id="freeVersion"
                    v-model="form.freeVersion"
                    class="form-check-input"
                    type="checkbox"
                    :disabled="isSubmitting"
                  />
                  <label class="form-check-label" for="freeVersion">freeVersion（試用版）</label>
                </div>
              </div>
            </div>

            <hr />

            <div class="row g-3">
              <div class="col-md-4">
                <label class="form-label">singleMap (JSON)</label>
                <textarea
                  v-model="form.singleMapText"
                  class="form-control"
                  rows="6"
                  placeholder='{"key":"value"}'
                  :disabled="isSubmitting"
                ></textarea>
              </div>
              <div class="col-md-4">
                <label class="form-label">defaultMap (JSON)</label>
                <textarea
                  v-model="form.defaultMapText"
                  class="form-control"
                  rows="6"
                  placeholder='{"chooseProcessCheck":["pccesCode1"]}'
                  :disabled="isSubmitting"
                ></textarea>
              </div>
              <div class="col-md-4">
                <label class="form-label">inputMap (JSON)</label>
                <textarea
                  v-model="form.inputMapText"
                  class="form-control"
                  rows="6"
                  placeholder='{"bonef001":[{"bonef2n":"","bonef3n":""}]}'
                  :disabled="isSubmitting"
                ></textarea>
              </div>
            </div>

            <div class="mt-3 text-muted small">
              <div>必填：valueMap.reportData.constructionId</div>
              <div>模式：POST /generate/export/report/BOne，Content-Type: application/json</div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  </div>
</template>

