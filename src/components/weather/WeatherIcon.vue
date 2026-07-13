<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    weather?: string | null
    size?: number
    title?: string
  }>(),
  {
    weather: null,
    size: 16,
    title: '',
  }
)

const weatherKey = computed(() => props.weather?.trim() || '')
const ariaLabel = computed(() => props.title || weatherKey.value || '未設定天氣')
</script>

<template>
  <span
    class="weather-icon"
    :style="{ width: `${size}px`, height: `${size}px` }"
    role="img"
    :aria-label="ariaLabel"
    :title="ariaLabel"
  >
    <!-- 晴天 -->
    <svg v-if="weatherKey === '晴天'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="4.5" fill="#FBBF24" />
      <g stroke="#F59E0B" stroke-width="1.6" stroke-linecap="round">
        <line x1="12" y1="2.5" x2="12" y2="5.5" />
        <line x1="12" y1="18.5" x2="12" y2="21.5" />
        <line x1="2.5" y1="12" x2="5.5" y2="12" />
        <line x1="18.5" y1="12" x2="21.5" y2="12" />
        <line x1="5.3" y1="5.3" x2="7.4" y2="7.4" />
        <line x1="16.6" y1="16.6" x2="18.7" y2="18.7" />
        <line x1="18.7" y1="5.3" x2="16.6" y2="7.4" />
        <line x1="7.4" y1="16.6" x2="5.3" y2="18.7" />
      </g>
    </svg>

    <!-- 多雲 -->
    <svg v-else-if="weatherKey === '多雲'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="8.5" cy="9" r="3.2" fill="#FBBF24" />
      <g stroke="#F59E0B" stroke-width="1.3" stroke-linecap="round">
        <line x1="8.5" y1="4.5" x2="8.5" y2="6.2" />
        <line x1="4.5" y1="9" x2="6.2" y2="9" />
        <line x1="11.8" y1="9" x2="13.5" y2="9" />
      </g>
      <path
        d="M7 17h11a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.8 3.8 0 0 0 7 17Z"
        fill="#94A3B8"
      />
    </svg>

    <!-- 陰天 -->
    <svg v-else-if="weatherKey === '陰天'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 17h11a3.5 3.5 0 0 0 .4-7 5.2 5.2 0 0 0-9.7-1.1A4 4 0 0 0 6.5 17Z"
        fill="#94A3B8"
      />
      <path
        d="M4 18.5h16"
        stroke="#64748B"
        stroke-width="1.4"
        stroke-linecap="round"
        opacity="0.55"
      />
    </svg>

    <!-- 雨天 -->
    <svg v-else-if="weatherKey === '雨天'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 15h10a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1A3.5 3.5 0 0 0 7 15Z"
        fill="#94A3B8"
      />
      <g stroke="#38BDF8" stroke-width="1.5" stroke-linecap="round">
        <line x1="8.5" y1="17" x2="7.5" y2="20.5" />
        <line x1="12" y1="17" x2="11" y2="20.5" />
        <line x1="15.5" y1="17" x2="14.5" y2="20.5" />
      </g>
    </svg>

    <!-- 大雨 -->
    <svg v-else-if="weatherKey === '大雨'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M6.5 14.5h11a3.5 3.5 0 0 0 .4-7 5 5 0 0 0-9.6-1.2A3.8 3.8 0 0 0 6.5 14.5Z"
        fill="#64748B"
      />
      <g stroke="#0EA5E9" stroke-width="1.7" stroke-linecap="round">
        <line x1="7.5" y1="16.5" x2="6" y2="21" />
        <line x1="11" y1="16.5" x2="9.5" y2="21" />
        <line x1="14.5" y1="16.5" x2="13" y2="21" />
        <line x1="18" y1="16.5" x2="16.5" y2="21" />
      </g>
    </svg>

    <!-- 颱風 -->
    <svg v-else-if="weatherKey === '颱風'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M12 4.5c3.6 0 6.5 2.9 6.5 6.5 0 2.2-1.1 4.2-2.9 5.4"
        stroke="#6366F1"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <path
        d="M12 19.5c-3.6 0-6.5-2.9-6.5-6.5 0-2.2 1.1-4.2 2.9-5.4"
        stroke="#818CF8"
        stroke-width="1.8"
        stroke-linecap="round"
      />
      <circle cx="12" cy="12" r="2.2" fill="#4F46E5" />
      <path d="M12 9.5V6.5M12 17.5V14.5" stroke="#C7D2FE" stroke-width="1.4" stroke-linecap="round" />
    </svg>

    <!-- 霧天 -->
    <svg v-else-if="weatherKey === '霧天'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M5.5 11h13a3 3 0 0 0 .3-6 4.5 4.5 0 0 0-8.6-1A3.2 3.2 0 0 0 5.5 11Z"
        fill="#CBD5E1"
      />
      <g stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" opacity="0.9">
        <line x1="4" y1="15" x2="20" y2="15" />
        <line x1="5" y1="18" x2="19" y2="18" />
        <line x1="6" y1="21" x2="18" y2="21" />
      </g>
    </svg>

    <!-- 雪天 -->
    <svg v-else-if="weatherKey === '雪天'" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M7 14.5h10a3.2 3.2 0 0 0 .3-6.4 4.6 4.6 0 0 0-8.8-1A3.5 3.5 0 0 0 7 14.5Z"
        fill="#CBD5E1"
      />
      <g fill="#E0F2FE" stroke="#7DD3FC" stroke-width="0.8">
        <circle cx="8.5" cy="17.5" r="1.1" />
        <circle cx="12" cy="19" r="1.1" />
        <circle cx="15.5" cy="17.5" r="1.1" />
      </g>
    </svg>

    <!-- 未設定 / 未知 -->
    <svg v-else viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="8" stroke="#CBD5E1" stroke-width="1.5" stroke-dasharray="3 2" />
      <line x1="9" y1="12" x2="15" y2="12" stroke="#CBD5E1" stroke-width="1.5" stroke-linecap="round" />
    </svg>
  </span>
</template>

<style scoped>
.weather-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  vertical-align: middle;
}

.weather-icon svg {
  width: 100%;
  height: 100%;
  display: block;
}
</style>
