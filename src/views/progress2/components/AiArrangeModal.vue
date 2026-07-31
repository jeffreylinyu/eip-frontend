<template>
  <Modal
    :show="show"
    title="智慧編排施工進度"
    icon="fa fa-wand-magic-sparkles"
    size="xl"
    hide-footer
    :backdrop="generating ? 'static' : true"
    @update:show="onToggleShow"
  >
    <template #body>
      <!-- 步驟一：條件設定 -->
      <template v-if="step === 'form'">
        <div class="alert alert-info d-flex align-items-start gap-2">
          <i class="fa fa-lightbulb mt-1"></i>
          <div>
            AI 會依「{{ sourceLabel }}」項目名稱與台灣公共工程常見施工順序，編排各項目的起訖日期與建議權重。
            編排結果僅供參考，套用後仍可於甘特圖中手動調整。
          </div>
        </div>

        <div class="row g-3">
          <div class="col-md-4">
            <label class="form-label">預計開工日期 <span class="text-danger">*</span></label>
            <RepublicDatePicker v-model="form.startDate" input-class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label">預計完工日期</label>
            <RepublicDatePicker v-model="form.endDate" input-class="form-control" />
          </div>
          <div class="col-md-4">
            <label class="form-label">或 總工期（日曆天）</label>
            <input
              v-model.number="form.totalDays"
              type="number"
              min="1"
              class="form-control"
              placeholder="例：180"
            />
          </div>
          <div class="col-12">
            <label class="form-label">補充指示（選填）</label>
            <textarea
              v-model="form.notes"
              rows="3"
              class="form-control"
              placeholder="例：假設施工、基礎工程需在前 2 個月完成；裝修與機電可平行作業；避開農曆春節前後一週…"
            ></textarea>
          </div>
        </div>

        <div class="border rounded p-2 mt-3">
          <div class="small text-muted mb-1">將送交 AI 編排的項目（共 {{ arrangeTargets.length }} 項）：</div>
          <div class="d-flex flex-wrap gap-1">
            <span v-for="t in arrangeTargets" :key="t.id" class="badge text-bg-secondary fw-normal">{{ t.name }}</span>
          </div>
        </div>

        <div v-if="errorMessage" class="alert alert-danger mt-3 mb-0">{{ errorMessage }}</div>

        <div class="d-flex justify-content-end gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="onToggleShow(false)">取消</button>
          <button
            type="button"
            class="btn btn-theme"
            :disabled="!canGenerate"
            @click="generate"
          >
            <i class="fa fa-wand-magic-sparkles me-2"></i>開始 AI 編排
          </button>
        </div>
      </template>

      <!-- 步驟二：產生中 -->
      <template v-else-if="step === 'generating'">
        <div class="text-center py-5">
          <div class="spinner-border text-primary mb-3" style="width: 3rem; height: 3rem"></div>
          <h5 class="mb-2">AI 編排中...</h5>
          <p class="text-muted mb-0">正在分析 {{ arrangeTargets.length }} 個施工項目的施工順序與工期，約需 10 ~ 60 秒</p>
        </div>
      </template>

      <!-- 步驟三：預覽結果 -->
      <template v-else>
        <div class="alert alert-success d-flex align-items-center gap-2">
          <i class="fa fa-circle-check"></i>
          <span>AI 已完成編排，共 {{ matchedCount }} / {{ arrangeTargets.length }} 個項目取得建議。請確認後套用。</span>
        </div>

        <div class="table-responsive ai-preview-table">
          <table class="table table-sm table-hover align-middle mb-0">
            <thead>
              <tr>
                <th style="width: 36px"></th>
                <th>項目名稱</th>
                <th style="width: 130px">開始日期</th>
                <th style="width: 130px">結束日期</th>
                <th style="width: 80px">工期</th>
                <th style="width: 90px">建議權重%</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in previewRows" :key="row.taskId" :class="{ 'table-warning': !row.matched }">
                <td class="text-center">
                  <i v-if="row.matched" class="fa fa-check text-success"></i>
                  <i v-else class="fa fa-triangle-exclamation text-warning" title="AI 未回傳此項目的編排"></i>
                </td>
                <td>{{ row.name }}</td>
                <td>{{ row.startDate || '-' }}</td>
                <td>{{ row.endDate || '-' }}</td>
                <td>{{ row.days ? row.days + ' 天' : '-' }}</td>
                <td>{{ row.costRatio != null ? row.costRatio : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="aiRemark" class="border rounded p-2 mt-3 small text-muted">
          <i class="fa fa-robot me-1"></i>AI 說明：{{ aiRemark }}
        </div>

        <div class="d-flex justify-content-end gap-2 mt-3">
          <button type="button" class="btn btn-outline-secondary" @click="step = 'form'">
            <i class="fa fa-rotate-left me-1"></i>調整條件重新編排
          </button>
          <button type="button" class="btn btn-theme" :disabled="!matchedCount" @click="applyResult">
            <i class="fa fa-check me-2"></i>套用編排結果
          </button>
        </div>
      </template>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'
import { assistantAsk } from '@/api/ai'
import type { Progress2Task } from '@/stores/progress2'
import { useWorkspaceStore } from '@/stores/workspace'
import { addDays, inclusiveDays, parseYmd, toYmd } from '@/utils/progress2/date'

interface Props {
  show: boolean
  constructionId: string
  tasks: Progress2Task[]
  /** 項目來源名稱（監造：施工項目；營造：分項工程），僅影響文案 */
  sourceLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  sourceLabel: '施工項目'
})

const workspaceStore = useWorkspaceStore()
const sourceLabel = computed(() => props.sourceLabel || '施工項目')

const emit = defineEmits<{
  'update:show': [value: boolean]
  /** 套用結果：以 taskId 對應的排程 patch */
  apply: [patches: { taskId: string; startDate: string; endDate: string; costRatio?: number }[]]
}>()

type Step = 'form' | 'generating' | 'preview'
const step = ref<Step>('form')
const generating = computed(() => step.value === 'generating')
const errorMessage = ref('')
const aiRemark = ref('')

const form = reactive({
  startDate: toYmd(new Date()),
  endDate: '',
  totalDays: null as number | null,
  notes: ''
})

/** 送交 AI 的項目（全部目前清單） */
const arrangeTargets = computed(() => props.tasks.map((t) => ({ id: t.id, name: t.name })))

const canGenerate = computed(
  () => arrangeTargets.value.length > 0 && !!parseYmd(form.startDate)
)

const toDateOnly = (value?: string | null): string => value?.match(/^\d{4}-\d{2}-\d{2}/)?.[0] ?? ''

const toPositiveDays = (value: unknown): number | null => {
  const days = Number(value)
  return Number.isFinite(days) && days > 0 ? Math.round(days) : null
}

/** 每次開啟時以目前工程的基本資料作為 AI 編排預設條件。 */
const applyBasicDataDefaults = () => {
  const project = workspaceStore.currentProject
  if (!project || project.id !== props.constructionId) return

  form.startDate = toDateOnly(project.startDate) || toYmd(new Date())
  form.endDate = toDateOnly(project.endDate)
  form.totalDays = toPositiveDays(project.workDay) ?? toPositiveDays(project.constructionPeriod)
}

watch(
  () => props.show,
  (show) => {
    if (show) {
      step.value = 'form'
      errorMessage.value = ''
      applyBasicDataDefaults()
    }
  }
)

const onToggleShow = (value: boolean) => {
  if (generating.value) return
  emit('update:show', value)
}

// ---------- AI 呼叫與解析 ----------
interface AiArrangedItem {
  name: string
  startDate: string
  endDate: string
  costRatio?: number
}

interface PreviewRow {
  taskId: string
  name: string
  matched: boolean
  startDate?: string
  endDate?: string
  days?: number
  costRatio?: number | null
}

const previewRows = ref<PreviewRow[]>([])
const matchedCount = computed(() => previewRows.value.filter((r) => r.matched).length)

const buildSystemPrompt = () => `你是台灣公共工程的資深工程排程專家。
使用者會提供一份「${sourceLabel.value}」清單與工期條件，請依台灣營建工程常見的施工順序（如：假設工程→基礎/土方→結構體→機電/管線→裝修→雜項/收尾）為每個項目編排合理的起訖日期，項目之間可以合理重疊（平行施工）。

回覆規則（務必遵守）：
1. 只回傳一個 JSON 物件，不要加任何說明文字、前後綴或 markdown 圍欄。
2. JSON 格式：{"tasks":[{"name":"項目名稱","startDate":"YYYY-MM-DD","endDate":"YYYY-MM-DD","costRatio":數字}],"remark":"一句話的編排說明"}
3. tasks 必須包含使用者提供的「每一個」項目，name 必須與提供的項目名稱完全一致，不可增刪或改名。
4. 所有日期必須落在使用者指定的工期範圍內；每項工期至少 1 天。
5. costRatio 為建議權重（%），所有項目加總應為 100（允許小數一位）。`

const buildUserMessage = () => {
  const lines: string[] = []
  lines.push(`【${sourceLabel.value}清單】`)
  arrangeTargets.value.forEach((t, i) => lines.push(`${i + 1}. ${t.name}`))
  lines.push('')
  lines.push('【工期條件】')
  lines.push(`開工日期：${form.startDate}`)
  const start = parseYmd(form.startDate)
  const end = parseYmd(form.endDate)
  if (end && start && end >= start) {
    lines.push(`完工日期：${form.endDate}（總工期 ${inclusiveDays(start, end)} 日曆天）`)
  } else if (form.totalDays && form.totalDays > 0 && start) {
    const calcEnd = addDays(start, Math.round(form.totalDays) - 1)
    lines.push(`總工期：${Math.round(form.totalDays)} 日曆天（完工日期約 ${toYmd(calcEnd)}）`)
  } else {
    lines.push('總工期：未指定，請依項目性質估算合理總工期（並於 remark 說明估算依據）')
  }
  if (form.notes.trim()) {
    lines.push('')
    lines.push('【補充指示】')
    lines.push(form.notes.trim())
  }
  lines.push('')
  lines.push('請依上述條件編排施工進度，並依規則回傳 JSON。')
  return lines.join('\n')
}

/** 從 AI 回覆中萃取 JSON（容忍 markdown 圍欄與前後說明文字） */
const extractJson = (content: string): { tasks?: AiArrangedItem[]; remark?: string } | null => {
  let text = content.trim()
  const fenceMatch = /```(?:json)?\s*([\s\S]*?)```/i.exec(text)
  if (fenceMatch) text = fenceMatch[1].trim()
  const first = text.indexOf('{')
  const last = text.lastIndexOf('}')
  if (first < 0 || last <= first) return null
  try {
    return JSON.parse(text.slice(first, last + 1))
  } catch {
    return null
  }
}

const normalizeName = (name: string) => name.replace(/\s+/g, '').trim()

const generate = async () => {
  if (!canGenerate.value) return
  step.value = 'generating'
  errorMessage.value = ''
  aiRemark.value = ''
  try {
    const response = await assistantAsk({
      message: buildUserMessage(),
      systemPrompt: buildSystemPrompt(),
      constructionId: props.constructionId || undefined,
      userQuestion: '智慧編排施工進度'
    })
    if (!response?.content) {
      throw new Error('沒有回覆內容，請稍後再試')
    }
    const parsed = extractJson(response.content)
    if (!parsed || !Array.isArray(parsed.tasks)) {
      throw new Error('回覆格式無法解析，請重試或調整補充指示')
    }
    aiRemark.value = typeof parsed.remark === 'string' ? parsed.remark : ''

    // 依名稱比對回原項目
    const byName = new Map<string, AiArrangedItem>()
    parsed.tasks.forEach((item) => {
      if (item && typeof item.name === 'string') byName.set(normalizeName(item.name), item)
    })

    previewRows.value = arrangeTargets.value.map((target) => {
      const hit = byName.get(normalizeName(target.name))
      const start = hit ? parseYmd(hit.startDate) : null
      const end = hit ? parseYmd(hit.endDate) : null
      if (!hit || !start || !end || end < start) {
        return { taskId: target.id, name: target.name, matched: false }
      }
      const ratio = Number(hit.costRatio)
      return {
        taskId: target.id,
        name: target.name,
        matched: true,
        startDate: toYmd(start),
        endDate: toYmd(end),
        days: inclusiveDays(start, end),
        costRatio: Number.isFinite(ratio) && ratio >= 0 ? Math.round(ratio * 10) / 10 : null
      }
    })

    if (!previewRows.value.some((r) => r.matched)) {
      throw new Error('AI 回覆中沒有可對應的項目編排，請重試')
    }
    step.value = 'preview'
  } catch (error) {
    console.error('AI 編排失敗:', error)
    errorMessage.value = error instanceof Error ? error.message : 'AI 編排失敗，請稍後再試'
    step.value = 'form'
  }
}

const applyResult = () => {
  const patches = previewRows.value
    .filter((r) => r.matched && r.startDate && r.endDate)
    .map((r) => ({
      taskId: r.taskId,
      startDate: r.startDate as string,
      endDate: r.endDate as string,
      ...(r.costRatio != null ? { costRatio: r.costRatio } : {})
    }))
  emit('apply', patches)
  emit('update:show', false)
}
</script>

<style scoped>
.ai-preview-table {
  max-height: 420px;
  overflow: auto;
}
</style>
