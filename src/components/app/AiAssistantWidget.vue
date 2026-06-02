<script setup lang="ts">
import { ref, computed, nextTick, watch, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAiAssistantStore } from '@/stores/ai-assistant'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { assistantAsk, type AiNavigationHintDto } from '@/api/ai'
import { resolveNavigationLinks, type ResolvedNavigationLink } from '@/utils/aiNavigationRegistry'
import DOMPurify from 'dompurify'
import { marked } from 'marked'

const DEFAULT_SYSTEM_PROMPT =
  '你是一位台灣公共工程系統助理，請使用繁體中文回答，語氣專業簡潔。若無法從系統取得資料，請誠實說明。'

const authStore = useAuthStore()
const workspaceStore = useWorkspaceStore()
const { viewType, getViewTypeLabel } = useViewPerspective()
const route = useRoute()
const router = useRouter()

type ChatMessage =
  | { role: 'user'; content: string }
  | { role: 'assistant'; content: string; navigationHints?: AiNavigationHintDto[] }

const currentProjectLabel = computed(() => {
  const name = workspaceStore.currentProject?.name?.trim()
  return name || '—'
})

const currentViewLabel = computed(() => getViewTypeLabel(viewType.value))

const aiAssistantStore = useAiAssistantStore()
const open = computed({
  get: () => aiAssistantStore.open,
  set: (v: boolean) => {
    aiAssistantStore.open = v
  },
})
const chatMessages = ref<ChatMessage[]>([])
const chatInput = ref('')
const chatError = ref('')
const chatLoading = ref(false)
const chatListRef = ref<HTMLElement | null>(null)

type PanelSizePreset = 'small' | 'medium' | 'large'

const PANEL_SIZE_STORAGE_KEY = 'cm-ai-assistant-panel-size'

const panelSizePreset = ref<PanelSizePreset>('medium')

const panelSizeOptions: { id: PanelSizePreset; label: string; title: string }[] = [
  { id: 'small', label: '小', title: '小尺寸' },
  { id: 'medium', label: '中', title: '中尺寸（預設）' },
  { id: 'large', label: '大', title: '大尺寸' },
]

function loadPanelSizePreset() {
  try {
    const raw = localStorage.getItem(PANEL_SIZE_STORAGE_KEY)
    if (raw === 'small' || raw === 'medium' || raw === 'large') {
      panelSizePreset.value = raw
    }
  } catch {
    /* ignore */
  }
}

function setPanelSizePreset(preset: PanelSizePreset) {
  panelSizePreset.value = preset
  try {
    localStorage.setItem(PANEL_SIZE_STORAGE_KEY, preset)
  } catch {
    /* ignore */
  }
}

marked.setOptions({
  breaks: true,
  gfm: true,
})

function renderMarkdownUnsafe(md: string): string {
  // marked.parse may return string | Promise<string> depending on config; keep sync.
  return marked.parse(md || '') as string
}

function renderMessageHtml(text: string): string {
  const raw = renderMarkdownUnsafe(text)
  return DOMPurify.sanitize(raw, {
    USE_PROFILES: { html: true },
  })
}

const hiddenRoutePrefixes = ['/page/login', '/access-status-guide']

const visible = computed(() => {
  if (!authStore.isAuthenticated) return false
  const path = route.path
  return !hiddenRoutePrefixes.some((p) => path === p || path.startsWith(`${p}/`))
})

function resolveMessageNavLinks(hints?: AiNavigationHintDto[]): ResolvedNavigationLink[] {
  return resolveNavigationLinks(hints, viewType.value)
}

function navigateToPage(link: ResolvedNavigationLink) {
  router.push({ path: link.path, query: link.query })
}

function buildApiMessage(userText: string, prior: ChatMessage[]): string {
  if (prior.length === 0) return userText
  const recent = prior.slice(-8)
  const lines = recent.map((m) => `${m.role === 'user' ? '使用者' : '助理'}：${m.content}`)
  return `【對話紀錄】\n${lines.join('\n')}\n\n【目前問題】\n${userText}`
}

async function scrollToBottom() {
  await nextTick()
  chatListRef.value?.scrollTo({ top: chatListRef.value.scrollHeight, behavior: 'smooth' })
}

// 面板開關由 Header 控制（Pinia store）。

function clearChat() {
  chatMessages.value = []
  chatError.value = ''
  chatInput.value = ''
}

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text || chatLoading.value) return

  chatError.value = ''
  const prior = [...chatMessages.value]
  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true
  await scrollToBottom()

  try {
    const res = await assistantAsk({
      message: buildApiMessage(text, prior),
      userQuestion: text,
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      constructionId: workspaceStore.currentProject?.id || undefined,
    })
    if (res?.content) {
      chatMessages.value.push({
        role: 'assistant',
        content: res.content,
        navigationHints: res.navigationHints,
      })
      await scrollToBottom()
    } else {
      chatMessages.value.pop()
      chatInput.value = text
      chatError.value = '無法取得回覆，請稍後再試'
    }
  } catch (e: unknown) {
    chatMessages.value.pop()
    chatInput.value = text
    const err = e as { message?: string; response?: { data?: { message?: string } } }
    chatError.value = err?.response?.data?.message ?? err?.message ?? 'AI 助理呼叫失敗'
  } finally {
    chatLoading.value = false
  }
}

watch(open, (v) => {
  if (v) scrollToBottom()
})

onMounted(() => {
  loadPanelSizePreset()
})
</script>

<template>
  <Teleport v-if="visible" to="body">
    <div class="ai-assistant-root">
      <Transition name="ai-assistant-panel">
        <div
          v-if="open"
          class="ai-assistant-panel"
          :class="`ai-assistant-panel--${panelSizePreset}`"
          role="dialog"
          aria-label="智慧 AI 助理"
        >
          <header class="ai-assistant-header">
            <span class="ai-assistant-title">
              <i class="fa fa-robot me-2" aria-hidden="true"></i>智慧 AI 助理
            </span>
            <div class="ai-assistant-header-actions">
              <div class="ai-assistant-size-toggle" role="group" aria-label="面板大小">
                <button
                  v-for="opt in panelSizeOptions"
                  :key="opt.id"
                  type="button"
                  class="ai-assistant-size-btn"
                  :class="{ 'is-active': panelSizePreset === opt.id }"
                  :title="opt.title"
                  :aria-pressed="panelSizePreset === opt.id"
                  @click="setPanelSizePreset(opt.id)"
                >
                  {{ opt.label }}
                </button>
              </div>
              <button
                type="button"
                class="ai-assistant-icon-btn"
                title="清除對話"
                :disabled="chatLoading || chatMessages.length === 0"
                @click="clearChat"
              >
                <i class="fa fa-eraser" aria-hidden="true"></i>
              </button>
              <button type="button" class="ai-assistant-icon-btn" title="關閉" @click="open = false">
                <i class="fa fa-times" aria-hidden="true"></i>
              </button>
            </div>
          </header>

          <div ref="chatListRef" class="ai-assistant-messages">
            <div v-if="chatMessages.length === 0 && !chatLoading" class="ai-assistant-empty">
              <i class="fa fa-robot ai-assistant-empty-icon" aria-hidden="true"></i>
              <p class="ai-assistant-empty-lead">公共工程系統助理</p>
              <p class="ai-assistant-empty-project" :title="currentProjectLabel">{{ currentProjectLabel }}</p>
              <p class="ai-assistant-empty-meta">視角：{{ currentViewLabel }}</p>
            </div>
            <template v-if="chatMessages.length > 0">
              <div
                v-for="(msg, i) in chatMessages"
                :key="i"
                class="ai-assistant-row"
                :class="msg.role === 'user' ? 'ai-assistant-row-user' : 'ai-assistant-row-assistant'"
              >
                <div
                  class="ai-assistant-bubble"
                  :class="msg.role === 'user' ? 'ai-assistant-bubble-user' : 'ai-assistant-bubble-assistant'"
                >
                  <span class="ai-assistant-bubble-label">{{ msg.role === 'user' ? '您' : '助理' }}</span>
                  <div class="ai-assistant-bubble-content ai-md" v-html="renderMessageHtml(msg.content)"></div>
                  <div
                    v-if="msg.role === 'assistant' && resolveMessageNavLinks(msg.navigationHints).length"
                    class="ai-assistant-nav"
                  >
                    <button
                      v-for="(link, navIdx) in resolveMessageNavLinks(msg.navigationHints)"
                      :key="navIdx"
                      type="button"
                      class="ai-assistant-nav-btn"
                      :title="`前往${link.label}`"
                      @click="navigateToPage(link)"
                    >
                      <i class="fa fa-arrow-right" aria-hidden="true"></i>
                      {{ link.label }}
                    </button>
                  </div>
                </div>
              </div>
            </template>
            <div v-if="chatLoading" class="ai-assistant-row ai-assistant-row-assistant">
              <div class="ai-assistant-bubble ai-assistant-bubble-assistant ai-assistant-bubble-loading">
                <i class="fa fa-spinner fa-spin me-2" aria-hidden="true"></i>思考中…
              </div>
            </div>
          </div>

          <footer class="ai-assistant-footer">
            <input
              v-model="chatInput"
              type="text"
              class="ai-assistant-input"
              placeholder="輸入問題…"
              :disabled="chatLoading"
              @keydown.enter.prevent="sendChat()"
            />
            <button
              type="button"
              class="ai-assistant-send"
              :disabled="chatLoading || !chatInput.trim()"
              title="送出"
              @click="sendChat"
            >
              <i class="fa fa-paper-plane" aria-hidden="true"></i>
            </button>
          </footer>
          <p v-if="chatError" class="ai-assistant-error">{{ chatError }}</p>
        </div>
      </Transition>

    </div>
  </Teleport>
</template>

<style scoped>
.ai-assistant-root {
  --ai-bg: #1a1d21;
  --ai-border: #3a3d42;
  --ai-text: #e4e6eb;
  --ai-input-bg: #2d3139;
  --ai-user-bubble: #2563eb;
  --ai-assistant-bubble: #374151;
  --ai-fab-grad-1: #2563eb;
  --ai-fab-grad-2: #7c3aed;
  --ai-fab-ring: rgba(124, 58, 237, 0.35);
  position: fixed;
  right: 0;
  bottom: 0;
  z-index: 1080;
  font-size: 0.9rem;
}

.ai-assistant-panel {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  max-width: calc(100vw - 2.5rem);
  max-height: calc(100vh - 3rem);
  display: flex;
  flex-direction: column;
  background: var(--ai-bg);
  color: var(--ai-text);
  border: 1px solid var(--ai-border);
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.45);
  overflow: hidden;
  transition: width 0.2s ease, height 0.2s ease;
}

.ai-assistant-panel--small {
  width: min(320px, calc(100vw - 2.5rem));
  height: min(420px, calc(100vh - 3rem));
}

.ai-assistant-panel--medium {
  width: min(380px, calc(100vw - 2.5rem));
  height: min(520px, calc(100vh - 3rem));
}

.ai-assistant-panel--large {
  width: min(520px, calc(100vw - 2.5rem));
  height: min(720px, calc(100vh - 3rem));
}

.ai-assistant-panel-enter-active,
.ai-assistant-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.ai-assistant-panel-enter-from,
.ai-assistant-panel-leave-to {
  opacity: 0;
  transform: translateY(12px) scale(0.98);
}

.ai-assistant-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.75rem;
  background: #2d3748;
  border-bottom: 1px solid var(--ai-border);
}

.ai-assistant-title {
  font-weight: 600;
  font-size: 0.95rem;
}

.ai-assistant-header-actions {
  display: flex;
  align-items: center;
  gap: 0.35rem;
}

.ai-assistant-size-toggle {
  display: inline-flex;
  padding: 2px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-assistant-size-btn {
  min-width: 1.75rem;
  height: 26px;
  padding: 0 0.4rem;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: rgba(255, 255, 255, 0.65);
  font-size: 0.75rem;
  font-weight: 600;
  line-height: 1;
  cursor: pointer;
}

.ai-assistant-size-btn:hover {
  color: rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08);
}

.ai-assistant-size-btn.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.18);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.ai-assistant-icon-btn {
  width: 32px;
  height: 32px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ai-text);
  cursor: pointer;
  opacity: 0.85;
}

.ai-assistant-icon-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  opacity: 1;
}

.ai-assistant-icon-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.ai-assistant-messages {
  flex: 1;
  overflow-y: auto;
  padding: 0.75rem;
  min-height: 0;
}

.ai-assistant-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  text-align: center;
  opacity: 0.75;
  font-size: 0.875rem;
  padding: 1rem 0.75rem;
}

.ai-assistant-empty-icon {
  font-size: 2rem;
  margin-bottom: 0.75rem;
  opacity: 0.85;
}

.ai-assistant-empty-lead {
  margin: 0 0 0.5rem;
  font-size: 0.8125rem;
  letter-spacing: 0.02em;
  color: rgba(255, 255, 255, 0.55);
}

.ai-assistant-empty-project {
  margin: 0 0 0.35rem;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(255, 255, 255, 0.9);
  max-width: 100%;
  word-break: break-word;
}

.ai-assistant-empty-meta {
  margin: 0;
  font-size: 0.8125rem;
  color: rgba(255, 255, 255, 0.55);
}

.ai-assistant-row {
  margin-bottom: 0.75rem;
  display: flex;
}

.ai-assistant-row-user {
  justify-content: flex-end;
}

.ai-assistant-row-assistant {
  justify-content: flex-start;
}

.ai-assistant-bubble {
  max-width: 88%;
  border-radius: 10px;
  overflow: hidden;
}

.ai-assistant-bubble-user {
  background: var(--ai-user-bubble);
  color: #fff;
}

.ai-assistant-bubble-assistant {
  background: var(--ai-assistant-bubble);
  border: 1px solid var(--ai-border);
  color: var(--ai-text);
}

.ai-assistant-nav {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  padding: 0.35rem 0.65rem 0.55rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.ai-assistant-nav-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.55rem;
  border: 1px solid rgba(96, 165, 250, 0.45);
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.2);
  color: #bfdbfe;
  font-size: 0.75rem;
  line-height: 1.2;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.ai-assistant-nav-btn:hover {
  background: rgba(37, 99, 235, 0.38);
  border-color: rgba(147, 197, 253, 0.7);
  color: #fff;
}

.ai-assistant-bubble-loading {
  padding: 0.5rem 0.75rem;
  font-size: 0.85rem;
  opacity: 0.9;
}

.ai-assistant-bubble-label {
  display: block;
  font-size: 0.68rem;
  opacity: 0.85;
  padding: 0.2rem 0.55rem 0;
}

.ai-assistant-bubble-content {
  padding: 0.35rem 0.55rem 0.55rem;
  line-height: 1.45;
  word-break: break-word;
}

/* Markdown styles inside bubbles */
.ai-md :deep(p) {
  margin: 0.25rem 0;
}

.ai-md :deep(p:first-child) {
  margin-top: 0;
}

.ai-md :deep(p:last-child) {
  margin-bottom: 0;
}

.ai-md :deep(strong) {
  font-weight: 700;
}

.ai-md :deep(ul),
.ai-md :deep(ol) {
  margin: 0.35rem 0 0.35rem 1.15rem;
  padding: 0;
}

.ai-md :deep(li) {
  margin: 0.15rem 0;
}

.ai-md :deep(code) {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace;
  font-size: 0.85em;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  padding: 0.1rem 0.35rem;
  border-radius: 6px;
}

.ai-md :deep(pre) {
  margin: 0.4rem 0;
  padding: 0.6rem 0.7rem;
  border-radius: 10px;
  overflow: auto;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.ai-md :deep(pre code) {
  background: transparent;
  border: none;
  padding: 0;
  font-size: 0.85em;
}

.ai-md :deep(a) {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
  opacity: 0.95;
}

.ai-assistant-footer {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0.75rem;
  border-top: 1px solid var(--ai-border);
}

.ai-assistant-input {
  flex: 1;
  min-width: 0;
  background: var(--ai-input-bg);
  border: 1px solid var(--ai-border);
  color: var(--ai-text);
  padding: 0.45rem 0.6rem;
  border-radius: 8px;
  font-size: 0.875rem;
}

.ai-assistant-input::placeholder {
  color: var(--ai-text);
  opacity: 0.45;
}

.ai-assistant-input:disabled {
  opacity: 0.6;
}

.ai-assistant-send {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 8px;
  border: none;
  background: var(--ai-user-bubble);
  color: #fff;
  cursor: pointer;
}

.ai-assistant-send:hover:not(:disabled) {
  filter: brightness(1.08);
}

.ai-assistant-send:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.ai-assistant-error {
  flex-shrink: 0;
  margin: 0;
  padding: 0 0.75rem 0.5rem;
  font-size: 0.78rem;
  color: #fca5a5;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
}

@media (max-width: 480px) {
  .ai-assistant-root {
    right: 0.75rem;
    bottom: 0.75rem;
  }

  .ai-assistant-panel {
    width: calc(100vw - 1.5rem);
    height: min(70vh, 520px);
  }
}
</style>
