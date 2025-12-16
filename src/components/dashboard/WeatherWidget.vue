<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { weatherApi, type WeatherInfo } from '@/api/weather'

type WeatherCategory = 'sunny' | 'partly-cloudy' | 'cloudy' | 'rainy' | 'storm' | 'unknown'

const props = withDefaults(
  defineProps<{
    locationName?: string
  }>(),
  {
    locationName: '臺北市',
  }
)

const isLoading = ref(false)
const errorMessage = ref('')
const weatherInfo = ref<WeatherInfo | null>(null)
const lastUpdated = ref<string>('')
const widgetRef = ref<HTMLElement | null>(null)
const isDropdownOpen = ref(false)

const locationOptions = [
  '臺北市',
  '新北市',
  '桃園市',
  '臺中市',
  '臺南市',
  '高雄市',
  '基隆市',
  '新竹市',
  '新竹縣',
  '苗栗縣',
  '彰化縣',
  '南投縣',
  '雲林縣',
  '嘉義市',
  '嘉義縣',
  '屏東縣',
  '宜蘭縣',
  '花蓮縣',
  '臺東縣',
  '澎湖縣',
  '金門縣',
  '連江縣'
]

const selectedLocation = ref(props.locationName)

const category = computed<WeatherCategory>(() => {
  const rainfall = weatherInfo.value?.rainfallProbability
  if (typeof rainfall === 'number') {
    if (rainfall >= 80) return 'storm'
    if (rainfall >= 60) return 'rainy'
    if (rainfall >= 40) return 'cloudy'
    if (rainfall >= 20) return 'partly-cloudy'
    return 'sunny'
  }

  const description = weatherInfo.value?.description ?? ''
  const code = Number(weatherInfo.value?.code ?? NaN)

  if (!description && Number.isNaN(code)) {
    return 'unknown'
  }

  if (/(雷|雷雨|暴雨|豪雨)/.test(description) || [15, 16, 17, 18, 19, 20, 21].includes(code)) {
    return 'storm'
  }

  if (/(雨|雨天|陣雨|陰有雨|陰時雨|陰短暫雨)/.test(description) || [8, 9, 10, 11, 12, 13, 14].includes(code)) {
    return 'rainy'
  }

  if (/(多雲時晴|多雲|陰)/.test(description) || [3, 4, 5, 6, 7].includes(code)) {
    return 'cloudy'
  }

  if (/(晴|晴朗|好天)/.test(description) || [1, 2].includes(code)) {
    return 'sunny'
  }

  return 'partly-cloudy'
})

const weatherClass = computed(() => `weather-widget--${category.value}`)

const iconName = computed(() => {
  switch (category.value) {
    case 'sunny':
      return 'fa-sun'
    case 'partly-cloudy':
      return 'fa-cloud-sun'
    case 'cloudy':
      return 'fa-cloud'
    case 'rainy':
      return 'fa-cloud-rain'
    case 'storm':
      return 'fa-bolt'
    default:
      return 'fa-cloud'
  }
})

const temperatureRange = computed(() => {
  const min = weatherInfo.value?.minTemp
  const max = weatherInfo.value?.maxTemp
  if (typeof min === 'number' && typeof max === 'number') {
    return `${min.toFixed(0)}°C ~ ${max.toFixed(0)}°C`
  }
  if (typeof max === 'number') {
    return `${max.toFixed(0)}°C`
  }
  return '—'
})

const rainfallText = computed(() => {
  const rainfall = weatherInfo.value?.rainfallProbability
  if (typeof rainfall === 'number') {
    return `${rainfall}%`
  }
  return '—'
})

const comfortText = computed(() => weatherInfo.value?.comfort || '—')

const timeRange = computed(() => {
  if (!weatherInfo.value?.startTime || !weatherInfo.value?.endTime) return '—'
  const start = weatherInfo.value.startTime.replace('T', ' ')
  const end = weatherInfo.value.endTime.replace('T', ' ')
  return `${start} ~ ${end}`
})

const fetchWeather = async () => {
  isLoading.value = true
  errorMessage.value = ''

  try {
    const result = await weatherApi.fetchWeatherInfo(selectedLocation.value)
    weatherInfo.value = result

    lastUpdated.value = new Date().toLocaleString('zh-TW', {
      hour12: false,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch (error: any) {
    console.error('載入中央氣象局資料失敗', error)
    errorMessage.value =
      error?.message ??
      '無法載入氣象資料，請確認網路或 VPN 連線，或暫時改用公司代理/後端服務存取氣象資料。'
  } finally {
    isLoading.value = false
  }
}

const handleClickOutside = (event: MouseEvent) => {
  if (!widgetRef.value) return
  if (!widgetRef.value.contains(event.target as Node)) {
    isDropdownOpen.value = false
  }
}

onMounted(() => {
  fetchWeather()
  document.addEventListener('click', handleClickOutside)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => props.locationName,
  newLocation => {
    if (newLocation && newLocation !== selectedLocation.value) {
      selectedLocation.value = newLocation
      fetchWeather()
    }
  }
)

const toggleDropdown = (event: MouseEvent) => {
  event.stopPropagation()
  isDropdownOpen.value = !isDropdownOpen.value
}

const selectLocation = (location: string) => {
  if (location === selectedLocation.value) {
    isDropdownOpen.value = false
    return
  }
  selectedLocation.value = location
  isDropdownOpen.value = false
  fetchWeather()
}
</script>

<template>
  <div class="weather-widget" :class="weatherClass" ref="widgetRef">
    <div class="weather-widget__main">
      <span class="weather-widget__badge">
        <i :class="['fa', iconName]"></i>
      </span>
      <div class="weather-widget__location">
        <button
          class="weather-widget__location-btn"
          type="button"
          @click="toggleDropdown"
          :aria-expanded="isDropdownOpen"
        >
          {{ weatherInfo?.locationName || selectedLocation }}
          <i class="fa fa-chevron-down ms-1"></i>
        </button>
        <ul
          v-if="isDropdownOpen"
          class="weather-widget__dropdown"
          role="menu"
        >
          <li
            v-for="location in locationOptions"
            :key="location"
            :class="['weather-widget__dropdown-item', { active: location === selectedLocation }]"
            role="menuitem"
          >
            <button type="button" @click="selectLocation(location)">
              {{ location }}
            </button>
          </li>
        </ul>
      </div>
      <span class="weather-widget__description">
        <span v-if="isLoading">載入中&hellip;</span>
        <span v-else-if="errorMessage">{{ errorMessage }}</span>
        <span v-else>{{ weatherInfo?.description || '—' }}</span>
      </span>
      <span class="weather-widget__temperature">
        {{ temperatureRange }}
      </span>
      <span class="weather-widget__rainfall" v-if="!errorMessage">
        降雨 {{ rainfallText }}
      </span>
    </div>
    <button
      class="weather-widget__refresh"
      type="button"
      @click="fetchWeather"
      :disabled="isLoading"
      aria-label="重新整理天氣"
    >
      <i class="fa fa-redo"></i>
    </button>
  </div>
</template>

<style scoped>
.weather-widget {
  display: inline-flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.9rem;
  border-radius: 999px;
  color: #2f3542;
  background-color: #ffffff;
  box-shadow:
    0 6px 18px rgba(47, 53, 66, 0.16),
    0 2px 8px rgba(47, 53, 66, 0.12);
  border: 1px solid rgba(47, 53, 66, 0.08);
}

[data-bs-theme='dark'] .weather-widget {
  background-color: #2f3542;
  color: #f1f2f6;
  box-shadow:
    0 8px 20px rgba(0, 0, 0, 0.4),
    0 2px 10px rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.weather-widget__main {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.95rem;
}

.weather-widget__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: rgba(255, 255, 255, 0.25);
  color: inherit;
  font-size: 1rem;
}

[data-bs-theme='dark'] .weather-widget__badge {
  background-color: rgba(255, 255, 255, 0.15);
}

.weather-widget__location {
  position: relative;
}

.weather-widget__location-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  font-size: 0.95rem;
  border: none;
  background: transparent;
  color: inherit;
  padding: 0;
}

.weather-widget__location-btn:hover,
.weather-widget__location-btn:focus {
  text-decoration: none;
  color: inherit;
  outline: none;
}

.weather-widget__dropdown {
  position: absolute;
  top: calc(100% + 0.5rem);
  left: 0;
  z-index: 1050;
  min-width: 160px;
  background: #ffffff;
  border-radius: 0.75rem;
  padding: 0.4rem;
  max-height: 260px;
  overflow-y: auto;
  list-style: none;
  margin: 0;
  box-shadow:
    0 18px 28px rgba(47, 53, 66, 0.2),
    0 4px 12px rgba(47, 53, 66, 0.18);
  border: 1px solid rgba(47, 53, 66, 0.08);
}

[data-bs-theme='dark'] .weather-widget__dropdown {
  background: #2f3542;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow:
    0 22px 32px rgba(0, 0, 0, 0.45),
    0 6px 14px rgba(0, 0, 0, 0.3);
}

.weather-widget__dropdown-item {
  display: block;
  border-radius: 0.6rem;
  overflow: hidden;
}

.weather-widget__dropdown-item button {
  width: 100%;
  text-align: left;
  padding: 0.4rem 0.6rem;
  border: none;
  background: transparent;
  font-size: 0.9rem;
  color: inherit;
}

.weather-widget__dropdown-item button:hover,
.weather-widget__dropdown-item button:focus {
  background: rgba(47, 53, 66, 0.08);
  outline: none;
}

[data-bs-theme='dark'] .weather-widget__dropdown-item button:hover,
[data-bs-theme='dark'] .weather-widget__dropdown-item button:focus {
  background: rgba(255, 255, 255, 0.1);
}

.weather-widget__dropdown-item.active button {
  background: rgba(47, 53, 66, 0.12);
  font-weight: 600;
}

[data-bs-theme='dark'] .weather-widget__dropdown-item.active button {
  background: rgba(255, 255, 255, 0.16);
}

.weather-widget__description {
  display: inline-flex;
  align-items: center;
  max-width: 160px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.weather-widget__temperature {
  font-weight: 600;
  letter-spacing: 0.03em;
}

.weather-widget__rainfall {
  font-size: 0.85rem;
  opacity: 0.75;
}

.weather-widget__refresh {
  border: none;
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  transition: background 0.2s ease;
}

.weather-widget__refresh:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.3);
}

[data-bs-theme='dark'] .weather-widget__refresh:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.18);
}

.weather-widget__refresh:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.weather-widget--sunny {
  background: linear-gradient(135deg, #7cc5f0 0%, #4fa6de 100%);
  color: #f5f6fa;
}

.weather-widget--partly-cloudy {
  background: linear-gradient(135deg, #5fb9ef 0%, #3a8dd0 100%);
  color: #f5f6fa;
}

.weather-widget--cloudy {
  background: linear-gradient(135deg, #8390b5 0%, #5f6f83 100%);
  color: #f5f6fa;
}

.weather-widget--rainy {
  background: linear-gradient(135deg, #4b7ba5 0%, #2c9cd1 100%);
  color: #f5f6fa;
}

.weather-widget--storm {
  background: linear-gradient(135deg, #465569 0%, #5f7ca3 100%);
  color: #f5f6fa;
}

.weather-widget--unknown {
  background: linear-gradient(135deg, #b4bcc3 0%, #8b98a4 100%);
  color: #2f3542;
}
</style>

