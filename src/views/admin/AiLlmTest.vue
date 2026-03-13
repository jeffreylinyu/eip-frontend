<template>
  <div class="ai-chat-page ai-chat-dark">
    <!-- 頂部：設定與模型資訊 -->
    <div class="ai-toolbar">
      <div class="ai-toolbar-inner">
        <span class="ai-toolbar-title"><i class="fa fa-robot me-2"></i>AI 對話</span>
        <span class="ai-toolbar-divider"></span>
        <span class="ai-toolbar-meta" title="模型">
          <i class="fa fa-microchip me-1"></i><span class="ai-toolbar-label">模型</span>{{ config?.gemini?.model || '—' }}
        </span>
        <span class="ai-toolbar-divider"></span>
        <span class="ai-toolbar-meta" :class="{ 'ai-toolbar-meta-ok': config?.gemini?.apiKeySet, 'ai-toolbar-meta-warn': config && !config.gemini?.apiKeySet }">
          <i class="fa fa-key me-1"></i>{{ config ? (config.gemini?.apiKeySet ? 'API Key 已設定' : 'API Key 未設定') : '載入中…' }}
        </span>
        <span class="ai-toolbar-divider"></span>
        <div class="ai-toolbar-system-wrap">
          <label class="ai-toolbar-system-label">System</label>
          <input
            v-model="chatSystemPrompt"
            type="text"
            class="ai-input ai-input-inline"
            placeholder="例：你是一個友善的助理。"
          />
        </div>
      </div>
    </div>

    <div v-if="!hasAdminPermission" class="ai-alert ai-alert-warn">
      <i class="fa fa-exclamation-triangle me-2"></i>您沒有權限訪問此頁面。此功能僅限系統管理員使用。
    </div>

    <template v-else>
      <!-- 對話區 -->
      <div class="ai-chat-layout">
        <div ref="chatListRef" class="ai-chat-messages">
          <template v-if="chatMessages.length === 0">
            <div class="ai-chat-empty">
              <i class="fa fa-comments mb-2"></i>
              <p class="mb-0">輸入訊息後按 Enter 或送出，助理會在此回覆。</p>
            </div>
          </template>
          <template v-else>
            <div
              v-for="(msg, i) in chatMessages"
              :key="i"
              class="ai-chat-row"
              :class="msg.role === 'user' ? 'ai-chat-row-user' : 'ai-chat-row-assistant'"
            >
              <div class="ai-chat-bubble" :class="msg.role === 'user' ? 'ai-chat-bubble-user' : 'ai-chat-bubble-assistant'">
                <span class="ai-chat-bubble-label">{{ msg.role === 'user' ? '使用者' : '助理' }}</span>
                <div class="ai-chat-bubble-content"><span class="whitespace-pre-wrap">{{ msg.content }}</span></div>
              </div>
            </div>
          </template>
        </div>

        <!-- 輸入列 -->
        <div class="ai-chat-input-wrap">
          <input
            v-model="chatInput"
            type="text"
            class="ai-input ai-chat-input"
            placeholder="輸入訊息…"
            :disabled="chatLoading || (config && !config.gemini?.apiKeySet)"
            @keydown.enter.prevent="sendChat()"
          />
          <button
            type="button"
            class="ai-chat-send"
            :disabled="chatLoading || !chatInput.trim() || (config && !config.gemini?.apiKeySet)"
            @click="sendChat"
          >
            <i class="fa fa-spinner fa-spin" v-if="chatLoading"></i>
            <i class="fa fa-paper-plane" v-else></i>
          </button>
        </div>
        <p v-if="chatError" class="ai-chat-error">{{ chatError }}</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { getAiConfig, chat, type AiConfigDto } from '@/api/ai'

const authStore = useAuthStore()

const hasAdminPermission = computed(() => {
  const user = authStore.user
  if (!user) return false
  return user.role === 'SUPER_ADMIN' || user.role === 'ADMIN'
})

const config = ref<AiConfigDto | null>(null)
const chatMessages = ref<{ role: 'user' | 'assistant'; content: string }[]>([])
const chatSystemPrompt = ref('你是一個友善的助理。請簡潔回覆。')
const chatInput = ref('')
const chatError = ref('')
const chatLoading = ref(false)
const chatListRef = ref<HTMLElement | null>(null)

async function loadConfig() {
  if (!hasAdminPermission.value) return
  try {
    config.value = await getAiConfig()
  } catch {
    config.value = null
  }
}

onMounted(loadConfig)

async function sendChat() {
  const text = chatInput.value.trim()
  if (!text) {
    chatError.value = '請輸入訊息。'
    return
  }
  chatError.value = ''
  chatMessages.value.push({ role: 'user', content: text })
  chatInput.value = ''
  chatLoading.value = true
  try {
    const payload = [
      { role: 'system', content: chatSystemPrompt.value.trim() || '你是一個友善的助理。' },
      ...chatMessages.value.map(m => ({ role: m.role, content: m.content }))
    ]
    const res = await chat(payload)
    if (res && res.content) {
      chatMessages.value.push({ role: 'assistant', content: res.content })
      await nextTick()
      chatListRef.value?.scrollTo({ top: chatListRef.value.scrollHeight, behavior: 'smooth' })
    } else {
      chatError.value = (res && typeof res === 'object' && 'message' in res)
        ? (res as { message: string }).message
        : '無法取得回覆'
    }
  } catch (e: any) {
    chatMessages.value.pop()
    chatInput.value = text
    chatError.value = e?.response?.data?.message ?? e?.message ?? 'Chat 呼叫失敗'
  } finally {
    chatLoading.value = false
  }
}
</script>

<style scoped>
.ai-chat-dark {
  --ai-bg: #1a1d21;
  --ai-card: #25282c;
  --ai-border: #3a3d42;
  --ai-text: #e4e6eb;
  --ai-toolbar-bg: #2d3748;
  --ai-toolbar-border: #3a3d42;
  --ai-input-bg: #2d3139;
  --ai-input-border: #3a3d42;
  --ai-hover: rgba(255, 255, 255, 0.06);
  --ai-user-bubble: #2563eb;
  --ai-assistant-bubble: #374151;
}

.ai-chat-page {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  margin: 0 -1rem;
  background: var(--ai-bg);
}

.ai-toolbar {
  flex-shrink: 0;
  background: var(--ai-toolbar-bg);
  border-bottom: 1px solid var(--ai-toolbar-border);
  padding: 0.4rem 1rem;
}

.ai-toolbar-inner {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.ai-toolbar-title {
  font-weight: 600;
  font-size: 0.95rem;
  color: var(--ai-text);
}

.ai-toolbar-divider {
  width: 1px;
  height: 1.25rem;
  background: var(--ai-border);
}

.ai-toolbar-meta {
  font-size: 0.8rem;
  color: var(--ai-text);
  opacity: 0.95;
}

.ai-toolbar-label {
  color: var(--ai-text);
  opacity: 0.8;
  margin-right: 0.25rem;
}

.ai-toolbar-label::after {
  content: '：';
}

.ai-toolbar-meta-ok {
  color: #86efac;
}

.ai-toolbar-meta-warn {
  color: #fcd34d;
}

.ai-toolbar-system-wrap {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  min-width: 0;
  flex: 1;
  max-width: 320px;
}

.ai-toolbar-system-label {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--ai-text);
  margin: 0;
}

.ai-input {
  background: var(--ai-input-bg);
  border: 1px solid var(--ai-input-border);
  color: var(--ai-text);
  padding: 0.35rem 0.6rem;
  font-size: 0.875rem;
  border-radius: 6px;
}

.ai-input::placeholder {
  color: var(--ai-text);
  opacity: 0.5;
}

.ai-input-inline {
  flex: 1;
  min-width: 0;
}

.ai-alert {
  padding: 0.75rem 1rem;
  margin: 1rem;
  border-radius: 6px;
  font-size: 0.9rem;
}

.ai-alert-warn {
  background: rgba(251, 191, 36, 0.15);
  border: 1px solid rgba(251, 191, 36, 0.4);
  color: #fcd34d;
}

.ai-chat-layout {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  padding: 0 1rem 1rem;
}

.ai-chat-messages {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 0;
  min-height: 200px;
}

.ai-chat-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  color: var(--ai-text);
  opacity: 0.7;
  font-size: 0.9rem;
}

.ai-chat-row {
  margin-bottom: 1rem;
  display: flex;
}

.ai-chat-row-user {
  justify-content: flex-end;
}

.ai-chat-row-assistant {
  justify-content: flex-start;
}

.ai-chat-bubble {
  max-width: 85%;
  border-radius: 10px;
  overflow: hidden;
}

.ai-chat-bubble-user {
  background: var(--ai-user-bubble);
  color: #fff;
}

.ai-chat-bubble-assistant {
  background: var(--ai-assistant-bubble);
  border: 1px solid var(--ai-border);
  color: var(--ai-text);
}

.ai-chat-bubble-label {
  display: block;
  font-size: 0.7rem;
  opacity: 0.85;
  padding: 0.25rem 0.6rem 0.1rem;
}

.ai-chat-bubble-content {
  padding: 0.5rem 0.6rem 0.6rem;
  font-size: 0.9rem;
  line-height: 1.45;
}

.ai-chat-input-wrap {
  flex-shrink: 0;
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.5rem 0;
}

.ai-chat-input {
  flex: 1;
  min-width: 0;
}

.ai-chat-send {
  flex-shrink: 0;
  width: 42px;
  height: 42px;
  border-radius: 10px;
  border: none;
  background: var(--ai-user-bubble);
  color: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
}

.ai-chat-send:hover:not(:disabled) {
  filter: brightness(1.1);
}

.ai-chat-send:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.ai-chat-error {
  font-size: 0.8rem;
  color: #fca5a5;
  margin: 0.25rem 0 0;
  padding: 0;
}

.whitespace-pre-wrap {
  white-space: pre-wrap;
  word-break: break-word;
}

@media (max-width: 768px) {
  .ai-toolbar-system-wrap {
    max-width: none;
    margin-left: 0;
    width: 100%;
  }
}
</style>
