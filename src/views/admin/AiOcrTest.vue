<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { ocrTest, getAiConfig, type AiConfigDto } from '@/api/ai'

const authStore = useAuthStore()

const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
})

const config = ref<AiConfigDto | null>(null)
const file = ref<File | null>(null)
const rawText = ref('')
const errorMessage = ref('')
const isLoading = ref(false)
const outputRef = ref<HTMLDivElement | null>(null)
const nativePdfParsing = ref(true)

function onFileChange(e: Event) {
  const target = e.target as HTMLInputElement
  file.value = target.files?.[0] ?? null
}

function scrollOutputToTop() {
  nextTick(() => {
    if (!outputRef.value) return
    outputRef.value.scrollTop = 0
  })
}

async function loadConfig() {
  if (!hasAdminPermission.value) return
  try {
    config.value = await getAiConfig()
  } catch {
    config.value = null
  }
}

async function submit() {
  if (!file.value) {
    errorMessage.value = '請選擇檔案（PDF/圖片）。'
    return
  }
  if (config.value && !config.value.documentAi.configured) {
    errorMessage.value = 'Document AI 未設定完整，請在後端 application-secret.yml 填寫 project-id、location、processor-name。'
    return
  }
  errorMessage.value = ''
  rawText.value = ''
  isLoading.value = true
  try {
    const res = await ocrTest(file.value, { nativePdfParsing: nativePdfParsing.value })
    if (res?.rawText) {
      rawText.value = res.rawText
      scrollOutputToTop()
    } else errorMessage.value = '無法取得原始文字'
  } catch (e: any) {
    errorMessage.value = e?.response?.data?.message ?? e?.message ?? 'OCR 呼叫失敗'
  } finally {
    isLoading.value = false
  }
}

onMounted(loadConfig)
</script>

<template>
  <div class="ai-ocr-page ai-chat-dark">
    <!-- 頂部：設定資訊（參考 /admin/ai-llm-test 的 toolbar 風格） -->
    <div class="ai-toolbar">
      <div class="ai-toolbar-inner">
        <span class="ai-toolbar-title"><i class="fa fa-file-alt me-2"></i>OCR 測試</span>
        <span class="ai-toolbar-divider"></span>
        <span class="ai-toolbar-meta" title="project-id">
          <span class="ai-toolbar-label">project</span>{{ config?.documentAi?.projectId || '—' }}
        </span>
        <span class="ai-toolbar-meta" title="location">
          <span class="ai-toolbar-label">location</span>{{ config?.documentAi?.location || '—' }}
        </span>
        <span class="ai-toolbar-meta" title="processor-name">
          <span class="ai-toolbar-label">processor</span>{{ config?.documentAi?.processorName || '—' }}
        </span>
        <span class="ai-toolbar-divider"></span>
        <span
          class="ai-toolbar-meta"
          :class="{
            'ai-toolbar-meta-ok': config?.documentAi?.configured,
            'ai-toolbar-meta-warn': config && !config.documentAi.configured
          }"
          title="Document AI 設定狀態"
        >
          <i class="fa fa-cog me-1"></i>{{ config ? (config.documentAi.configured ? '設定完整' : '設定未完成') : '載入中…' }}
        </span>
      </div>
    </div>

    <div v-if="!hasAdminPermission" class="ai-alert ai-alert-warn">
      <i class="fa fa-exclamation-triangle me-2"></i>您沒有權限訪問此頁面。此功能僅限系統管理員使用。
    </div>

    <template v-else>
      <div class="ai-ocr-layout">
        <!-- 左：上傳面板 -->
        <div class="ai-panel">
          <div class="ai-panel-header">
            <div class="ai-panel-title">上傳檔案</div>
            <div class="ai-panel-subtitle">支援 PDF / 圖片。後端會使用目前設定的 Document AI Processor 進行辨識。</div>
          </div>
          <div class="ai-panel-body">
            <label class="ai-label">檔案（PDF/圖片）</label>
            <input type="file" class="ai-input" accept=".pdf,image/*" @change="onFileChange" />

            <div class="ai-toggle-row">
              <label class="ai-switch">
                <input v-model="nativePdfParsing" type="checkbox" />
                <span class="ai-switch-ui"></span>
              </label>
              <div class="ai-toggle-text">
                <div class="ai-toggle-title">原生 PDF 剖析</div>
                <div class="ai-toggle-sub">能以特殊方式處理有文字資訊的 PDF，進而提升這類 PDF 輸出內容的文字擷取品質。</div>
              </div>
            </div>

            <div class="ai-actions">
              <button type="button" class="ai-btn" :disabled="isLoading || (config && !config.documentAi.configured)" @click="submit">
                <i class="fa fa-spinner fa-spin me-1" v-if="isLoading"></i>
                {{ isLoading ? '處理中…' : '送出 OCR' }}
              </button>
              <button type="button" class="ai-btn ai-btn-ghost" :disabled="isLoading" @click="() => { rawText=''; errorMessage=''; }">
                清除
              </button>
            </div>

            <div v-if="config && !config.documentAi.configured" class="ai-hint ai-hint-warn">
              <i class="fa fa-info-circle me-2"></i>Document AI 設定未完成，請在後端 `application-secret.yml` 填寫 project-id、location、processor-name（Processor ID）。
            </div>

            <div v-if="errorMessage" class="ai-hint ai-hint-error">
              <i class="fa fa-times-circle me-2"></i>{{ errorMessage }}
            </div>

            <div v-if="config?.documentAi?.fullProcessorName" class="ai-hint">
              <div class="ai-hint-title">Processor resource</div>
              <code class="ai-code">{{ config.documentAi.fullProcessorName }}</code>
            </div>
          </div>
        </div>

        <!-- 右：輸出 -->
        <div class="ai-panel">
          <div class="ai-panel-header">
            <div class="ai-panel-title">擷取原始文字</div>
            <div class="ai-panel-subtitle">辨識結果會顯示在下方。</div>
          </div>
          <div class="ai-panel-body ai-output-body">
            <div v-if="!rawText && !isLoading" class="ai-empty">
              尚無結果。請先選擇檔案並送出 OCR。
            </div>
            <div v-else-if="isLoading" class="ai-empty">
              正在辨識中…
            </div>
            <div v-else ref="outputRef" class="ai-output">
              <pre class="ai-pre">{{ rawText }}</pre>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<style scoped>
/* 暗黑主題（對齊 /admin/ai-llm-test 的色系與語彙） */
.ai-chat-dark {
  --ai-bg: #0b1220;
  --ai-surface: rgba(255, 255, 255, 0.06);
  --ai-surface-2: rgba(255, 255, 255, 0.08);
  --ai-border: rgba(255, 255, 255, 0.12);
  --ai-text: rgba(255, 255, 255, 0.92);
  --ai-text-dim: rgba(255, 255, 255, 0.72);
  --ai-text-muted: rgba(255, 255, 255, 0.56);
  --ai-accent: #4f8cff;
  --ai-warn: #ffcc66;
  --ai-err: #ff6b6b;
}

.ai-ocr-page {
  min-height: 100vh;
  background: radial-gradient(1200px 600px at 20% -10%, rgba(79, 140, 255, 0.22), transparent 55%),
    radial-gradient(900px 500px at 90% 0%, rgba(170, 95, 255, 0.18), transparent 55%),
    var(--ai-bg);
  color: var(--ai-text);
}

.ai-toolbar {
  position: sticky;
  top: 0;
  z-index: 5;
  background: rgba(11, 18, 32, 0.85);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--ai-border);
}

.ai-toolbar-inner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  flex-wrap: wrap;
}

.ai-toolbar-title {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.ai-toolbar-divider {
  width: 1px;
  height: 18px;
  background: var(--ai-border);
  opacity: 0.9;
}

.ai-toolbar-meta {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  color: var(--ai-text-dim);
  font-size: 13px;
}

.ai-toolbar-label {
  color: var(--ai-text-muted);
  font-size: 12px;
}

.ai-toolbar-meta-ok {
  color: rgba(120, 255, 190, 0.9);
}

.ai-toolbar-meta-warn {
  color: var(--ai-warn);
}

.ai-alert {
  margin: 16px;
  padding: 12px 14px;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  background: var(--ai-surface);
  color: var(--ai-text-dim);
}

.ai-alert-warn {
  border-color: rgba(255, 204, 102, 0.35);
}

.ai-ocr-layout {
  display: grid;
  grid-template-columns: 420px 1fr;
  gap: 16px;
  padding: 16px;
}

@media (max-width: 980px) {
  .ai-ocr-layout {
    grid-template-columns: 1fr;
  }
}

.ai-panel {
  border: 1px solid var(--ai-border);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  overflow: hidden;
}

.ai-panel-header {
  padding: 12px 14px;
  border-bottom: 1px solid var(--ai-border);
  background: rgba(255, 255, 255, 0.03);
}

.ai-panel-title {
  font-weight: 700;
  letter-spacing: 0.2px;
}

.ai-panel-subtitle {
  margin-top: 4px;
  font-size: 12px;
  color: var(--ai-text-muted);
}

.ai-panel-body {
  padding: 14px;
}

.ai-label {
  display: block;
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--ai-text-muted);
}

.ai-input {
  width: 100%;
  border-radius: 10px;
  border: 1px solid var(--ai-border);
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.2);
  color: var(--ai-text);
  outline: none;
}

.ai-input:focus {
  border-color: rgba(79, 140, 255, 0.55);
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.18);
}

.ai-actions {
  display: flex;
  gap: 10px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.ai-toggle-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  margin-top: 12px;
  padding: 12px;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  background: var(--ai-surface);
}

.ai-toggle-text {
  flex: 1;
  min-width: 0;
}

.ai-toggle-title {
  font-weight: 700;
  letter-spacing: 0.2px;
  color: var(--ai-text);
}

.ai-toggle-sub {
  margin-top: 4px;
  font-size: 12px;
  line-height: 1.45;
  color: var(--ai-text-muted);
}

/* Switch */
.ai-switch {
  position: relative;
  display: inline-flex;
  width: 44px;
  height: 24px;
  flex: 0 0 auto;
}

.ai-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.ai-switch-ui {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.14);
  border: 1px solid var(--ai-border);
  transition: all 160ms ease;
}

.ai-switch-ui::after {
  content: '';
  position: absolute;
  top: 50%;
  left: 3px;
  width: 18px;
  height: 18px;
  transform: translateY(-50%);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.82);
  transition: all 160ms ease;
}

.ai-switch input:checked + .ai-switch-ui {
  background: rgba(79, 140, 255, 0.28);
  border-color: rgba(79, 140, 255, 0.55);
}

.ai-switch input:checked + .ai-switch-ui::after {
  left: 22px;
  background: rgba(255, 255, 255, 0.92);
}

.ai-switch input:focus-visible + .ai-switch-ui {
  box-shadow: 0 0 0 3px rgba(79, 140, 255, 0.22);
}

.ai-btn {
  appearance: none;
  border: 1px solid rgba(79, 140, 255, 0.45);
  background: rgba(79, 140, 255, 0.18);
  color: var(--ai-text);
  border-radius: 10px;
  padding: 10px 12px;
  font-weight: 600;
  cursor: pointer;
}

.ai-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ai-btn-ghost {
  border-color: var(--ai-border);
  background: transparent;
  color: var(--ai-text-dim);
}

.ai-hint {
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  background: var(--ai-surface);
  color: var(--ai-text-dim);
  font-size: 13px;
}

.ai-hint-title {
  font-size: 12px;
  color: var(--ai-text-muted);
  margin-bottom: 6px;
}

.ai-hint-warn {
  border-color: rgba(255, 204, 102, 0.35);
}

.ai-hint-error {
  border-color: rgba(255, 107, 107, 0.35);
  color: rgba(255, 220, 220, 0.95);
}

.ai-code {
  display: inline-block;
  word-break: break-all;
  white-space: pre-wrap;
  color: rgba(255, 255, 255, 0.88);
}

.ai-output-body {
  padding: 0;
}

.ai-empty {
  padding: 18px 14px;
  color: var(--ai-text-muted);
}

.ai-output {
  max-height: calc(100vh - 190px);
  overflow: auto;
  padding: 14px;
  background: rgba(0, 0, 0, 0.22);
  border-top: 1px solid var(--ai-border);
}

.ai-pre {
  margin: 0;
  background: transparent;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 13px;
  line-height: 1.55;
  color: rgba(255, 255, 255, 0.9);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
}

/* 讓滾動條在暗色背景更清楚（不影響不支援的瀏覽器） */
.ai-output::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}
.ai-output::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  border: 2px solid rgba(0, 0, 0, 0.12);
}
.ai-output::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.26);
}
.ai-output::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.12);
}
</style>
