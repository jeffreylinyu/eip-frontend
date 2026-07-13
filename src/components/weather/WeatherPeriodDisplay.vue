<script setup lang="ts">
import WeatherIcon from '@/components/weather/WeatherIcon.vue'

withDefaults(
  defineProps<{
    periodLabel: string
    weather?: string | null
    iconSize?: number
    showLabel?: boolean
  }>(),
  {
    weather: null,
    iconSize: 12,
    showLabel: false,
  }
)
</script>

<template>
  <span class="weather-period-display" :title="weather || undefined">
    <span class="weather-period-display__tag">{{ periodLabel }}</span>
    <WeatherIcon :weather="weather" :size="iconSize" :title="weather || ''" />
    <span v-if="showLabel && weather" class="weather-period-display__text">{{ weather }}</span>
  </span>
</template>

<style scoped>
.weather-period-display {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  min-width: 0;
}

.weather-period-display__tag {
  font-size: 0.58rem;
  color: var(--bs-secondary-color, #94a3b8);
  flex-shrink: 0;
}

.weather-period-display__text {
  font-size: 0.58rem;
  color: inherit;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
