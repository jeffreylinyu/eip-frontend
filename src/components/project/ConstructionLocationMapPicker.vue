<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { GoogleMap, Marker } from 'vue3-google-map'
import Modal from '@/components/bootstrap/Modal.vue'
import { findNearestCwaStation, type CwaWeatherStation } from '@/api/cwaWeather'
import { geocodeTaiwanAddress } from '@/utils/googleGeocode'

const TAIWAN_CENTER = { lat: 23.6978, lng: 120.9605 }

const props = withDefaults(
  defineProps<{
    modelValue?: {
      latitude: number | null
      longitude: number | null
      cwaStationId?: string | null
      cwaStationName?: string | null
      cwaStationDistanceKm?: number | null
    } | null
    /** 工程地點文字；開啟地圖時優先依此地址定位 */
    address?: string
    disabled?: boolean
    readonly?: boolean
  }>(),
  {
    modelValue: null,
    address: '',
    disabled: false,
    readonly: false,
  }
)

const emit = defineEmits<{
  'update:modelValue': [
    value: {
      latitude: number
      longitude: number
      cwaStationId: string
      cwaStationName: string
      cwaStationDistanceKm: number
    },
  ]
}>()

const showModal = ref(false)
const mapRef = ref<InstanceType<typeof GoogleMap> | null>(null)
const draftPosition = ref<{ lat: number; lng: number } | null>(null)
const nearestStation = ref<CwaWeatherStation | null>(null)
const isResolvingStation = ref(false)
const isGeocoding = ref(false)
const resolveError = ref('')
const geocodeMessage = ref('')
const mapLoadError = ref('')

const googleMapsApiKey = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined)?.trim() || ''

const hasCoordinates = computed(
  () =>
    props.modelValue?.latitude != null &&
    props.modelValue?.longitude != null &&
    !Number.isNaN(props.modelValue.latitude) &&
    !Number.isNaN(props.modelValue.longitude)
)

const mapCenter = computed(() => {
  if (draftPosition.value) return draftPosition.value
  if (hasCoordinates.value) {
    return {
      lat: props.modelValue!.latitude as number,
      lng: props.modelValue!.longitude as number,
    }
  }
  return TAIWAN_CENTER
})

const mapZoom = computed(() => (draftPosition.value ? 15 : 8))

const markerPosition = computed(() => draftPosition.value ?? (hasCoordinates.value ? mapCenter.value : null))

const coordinateSummary = computed(() => {
  if (!hasCoordinates.value) return ''
  const lat = props.modelValue!.latitude!.toFixed(6)
  const lng = props.modelValue!.longitude!.toFixed(6)
  return `${lat}, ${lng}`
})

const savedStation = computed(() => {
  if (!props.modelValue?.cwaStationName && !props.modelValue?.cwaStationId) return null
  return {
    stationId: props.modelValue.cwaStationId ?? '',
    stationName: props.modelValue.cwaStationName ?? '',
    distanceKm: props.modelValue.cwaStationDistanceKm ?? null,
  }
})

const isWeatherStationConfigured = computed(
  () => hasCoordinates.value && savedStation.value != null && savedStation.value.stationName !== ''
)

const resolveInitialPosition = async (): Promise<{ lat: number; lng: number } | null> => {
  if (hasCoordinates.value) {
    geocodeMessage.value = '已使用先前選定的座標，可拖曳標記微調。'
    return {
      lat: props.modelValue!.latitude as number,
      lng: props.modelValue!.longitude as number,
    }
  }

  const address = props.address?.trim()

  if (address && googleMapsApiKey) {
    isGeocoding.value = true
    geocodeMessage.value = ''
    try {
      const result = await geocodeTaiwanAddress(address, googleMapsApiKey)
      if (result) {
        geocodeMessage.value = `已依地址「${address}」定位，可拖曳標記微調。`
        return { lat: result.latitude, lng: result.longitude }
      }
      geocodeMessage.value = `找不到地址「${address}」，請直接在地圖上點選位置。`
    } catch {
      geocodeMessage.value = `地址定位失敗，請直接在地圖上點選位置。`
    } finally {
      isGeocoding.value = false
    }
  }

  return null
}

const openPicker = async () => {
  if (props.disabled || props.readonly) return
  if (!googleMapsApiKey) {
    mapLoadError.value = '尚未設定 Google Maps API Key（VITE_GOOGLE_MAPS_API_KEY）'
  } else {
    mapLoadError.value = ''
  }

  nearestStation.value = null
  resolveError.value = ''
  geocodeMessage.value = ''
  draftPosition.value = null
  showModal.value = true

  const initialPosition = await resolveInitialPosition()
  if (initialPosition) {
    draftPosition.value = initialPosition
    await resolveNearestStation(initialPosition.lat, initialPosition.lng)
  }
}

const closePicker = () => {
  showModal.value = false
}

const resolveNearestStation = async (lat: number, lng: number) => {
  isResolvingStation.value = true
  resolveError.value = ''
  try {
    nearestStation.value = await findNearestCwaStation(lat, lng)
  } catch (error: any) {
    nearestStation.value = null
    resolveError.value =
      error?.response?.data?.message || error?.message || '無法推算最近氣象站'
  } finally {
    isResolvingStation.value = false
  }
}

const handleMapClick = (event: { latLng: { lat: () => number; lng: () => number } | null }) => {
  if (!event.latLng) return
  const lat = event.latLng.lat()
  const lng = event.latLng.lng()
  draftPosition.value = { lat, lng }
  geocodeMessage.value = ''
  resolveNearestStation(lat, lng)
}

const handleMarkerDragEnd = (event: { latLng: { lat: () => number; lng: () => number } | null }) => {
  if (!event.latLng) return
  const lat = event.latLng.lat()
  const lng = event.latLng.lng()
  draftPosition.value = { lat, lng }
  geocodeMessage.value = ''
  resolveNearestStation(lat, lng)
}

const confirmSelection = () => {
  if (!draftPosition.value || !nearestStation.value) return
  emit('update:modelValue', {
    latitude: draftPosition.value.lat,
    longitude: draftPosition.value.lng,
    cwaStationId: nearestStation.value.stationId,
    cwaStationName: nearestStation.value.stationName,
    cwaStationDistanceKm: nearestStation.value.distanceKm,
  })
  showModal.value = false
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value?.latitude || !value?.longitude) {
      nearestStation.value = null
    }
  }
)
</script>

<template>
  <div class="weather-station-locator">
    <div class="weather-station-locator__header">
      <div class="weather-station-locator__title">
        <span class="weather-station-locator__icon" aria-hidden="true">
          <i class="fa fa-cloud-sun"></i>
        </span>
        <div>
          <div class="fw-semibold">工地氣象站對應</div>
          <div class="weather-station-locator__desc">
            請在地圖上標記工地位置，系統將依座標自動選取最近的中央氣象署自動氣象站，供日報帶入天氣資料。
          </div>
        </div>
      </div>
      <button
        type="button"
        class="btn btn-sm btn-primary weather-station-locator__action"
        :disabled="disabled || readonly || isGeocoding"
        @click="openPicker"
      >
        <i class="fa fa-map-marker-alt me-1"></i>
        {{ isWeatherStationConfigured ? '調整位置' : '選擇工地位置' }}
      </button>
    </div>

    <div
      v-if="isWeatherStationConfigured"
      class="weather-station-locator__result"
      role="status"
      aria-live="polite"
    >
      <div class="weather-station-locator__result-label">
        <i class="fa fa-check-circle me-1"></i>
        已對應測站
      </div>
      <div class="weather-station-locator__station">
        <span class="weather-station-locator__station-name">{{ savedStation!.stationName }}</span>
        <span v-if="savedStation!.stationId" class="weather-station-locator__station-id">
          {{ savedStation!.stationId }}
        </span>
        <span
          v-if="typeof savedStation!.distanceKm === 'number'"
          class="weather-station-locator__station-distance"
        >
          距工地約 {{ savedStation!.distanceKm.toFixed(1) }} 公里
        </span>
      </div>
      <div v-if="coordinateSummary" class="weather-station-locator__coords">
        <i class="fa fa-map-pin me-1"></i>
        工地座標 {{ coordinateSummary }}
      </div>
    </div>

    <div v-else class="weather-station-locator__empty" role="status">
      <i class="fa fa-info-circle me-1"></i>
      <span v-if="hasCoordinates && !savedStation?.stationName">
        已標記座標，正在等待氣象站資料…
      </span>
      <span v-else>尚未設定。請先輸入工程地點後選擇位置，或直接在地圖上標記。</span>
    </div>

    <Modal
      v-model:show="showModal"
      title="設定工地位置與氣象站"
      size="lg"
      @hidden="closePicker"
    >
      <template #body>
        <div class="weather-station-modal-intro">
          <div class="weather-station-modal-intro__step">
            <span class="weather-station-modal-intro__badge">1</span>
            <span>在地圖標記工地位置</span>
          </div>
          <i class="fa fa-arrow-right weather-station-modal-intro__arrow" aria-hidden="true"></i>
          <div class="weather-station-modal-intro__step">
            <span class="weather-station-modal-intro__badge">2</span>
            <span>系統自動推算最近測站</span>
          </div>
          <i class="fa fa-arrow-right weather-station-modal-intro__arrow" aria-hidden="true"></i>
          <div class="weather-station-modal-intro__step">
            <span class="weather-station-modal-intro__badge">3</span>
            <span>日報可帶入該站天氣</span>
          </div>
        </div>
        <p class="text-muted small mb-3">
          若已選過位置會以該座標開啟；否則依「工程地點」地址定位。可點擊地圖或拖曳標記微調。
        </p>
        <div v-if="!googleMapsApiKey" class="alert alert-warning mb-0">
          尚未設定 <code>VITE_GOOGLE_MAPS_API_KEY</code>，無法載入地圖。
        </div>
        <div v-else class="map-picker-panel">
          <div v-if="isGeocoding" class="small text-muted mb-2">
            <i class="fa fa-spinner fa-spin me-1"></i>
            正在依地址定位…
          </div>
          <div v-else-if="geocodeMessage" class="small mb-2" :class="draftPosition ? 'text-success' : 'text-warning'">
            {{ geocodeMessage }}
          </div>
          <GoogleMap
            ref="mapRef"
            :api-key="googleMapsApiKey"
            class="map-picker-canvas"
            :center="mapCenter"
            :zoom="mapZoom"
            gesture-handling="greedy"
            @click="handleMapClick"
          >
            <Marker
              v-if="markerPosition"
              :options="{
                position: markerPosition,
                draggable: true,
              }"
              @dragend="handleMarkerDragEnd"
            />
          </GoogleMap>
          <div class="map-picker-meta mt-3">
            <div v-if="draftPosition" class="map-picker-meta__coords">
              <span class="map-picker-meta__label">工地座標</span>
              <span>{{ draftPosition.lat.toFixed(6) }}, {{ draftPosition.lng.toFixed(6) }}</span>
            </div>
            <div v-else-if="!isGeocoding" class="small text-muted">
              請先輸入工程地點，或直接在地圖上點選位置。
            </div>

            <div
              class="map-picker-meta__station"
              :class="{
                'map-picker-meta__station--loading': isResolvingStation,
                'map-picker-meta__station--error': resolveError,
                'map-picker-meta__station--ready': nearestStation && !isResolvingStation,
              }"
            >
              <div class="map-picker-meta__station-head">
                <i class="fa fa-cloud me-1"></i>
                對應氣象站
              </div>
              <div v-if="isResolvingStation" class="small text-muted">
                <i class="fa fa-spinner fa-spin me-1"></i>
                正在依座標推算最近測站…
              </div>
              <div v-else-if="resolveError" class="small text-danger">{{ resolveError }}</div>
              <div v-else-if="nearestStation" class="map-picker-meta__station-body">
                <div class="map-picker-meta__station-name">{{ nearestStation.stationName }}</div>
                <div class="map-picker-meta__station-detail">
                  <span v-if="nearestStation.stationId">代碼 {{ nearestStation.stationId }}</span>
                  <span>距離約 {{ nearestStation.distanceKm.toFixed(1) }} 公里</span>
                  <span v-if="nearestStation.countyName">{{ nearestStation.countyName }}</span>
                </div>
              </div>
              <div v-else class="small text-muted">標記位置後將顯示對應測站</div>
            </div>
          </div>
        </div>
      </template>
      <template #footer>
        <button type="button" class="btn btn-outline-secondary" @click="closePicker">取消</button>
        <button
          type="button"
          class="btn btn-primary"
          :disabled="!draftPosition || !nearestStation || isResolvingStation || isGeocoding"
          @click="confirmSelection"
        >
          <i class="fa fa-check me-1"></i>
          確認並套用測站
        </button>
      </template>
    </Modal>
  </div>
</template>

<style scoped>
.weather-station-locator {
  margin-top: 0.75rem;
  padding: 0.875rem 1rem;
  border: 1px solid rgba(13, 110, 253, 0.2);
  border-radius: 0.5rem;
  background: rgba(13, 110, 253, 0.04);
}

.weather-station-locator__header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
}

.weather-station-locator__title {
  display: flex;
  gap: 0.75rem;
  flex: 1;
  min-width: 12rem;
}

.weather-station-locator__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.375rem;
  background: rgba(13, 110, 253, 0.12);
  color: var(--bs-primary);
  flex-shrink: 0;
}

.weather-station-locator__desc {
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
  margin-top: 0.125rem;
  line-height: 1.45;
}

.weather-station-locator__action {
  flex-shrink: 0;
  align-self: center;
}

.weather-station-locator__result {
  margin-top: 0.75rem;
  padding: 0.75rem 0.875rem;
  border-radius: 0.375rem;
  background: var(--bs-body-bg);
  border: 1px solid rgba(25, 135, 84, 0.25);
}

.weather-station-locator__result-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-success);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 0.375rem;
}

.weather-station-locator__station {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.375rem 0.75rem;
}

.weather-station-locator__station-name {
  font-size: 1.05rem;
  font-weight: 600;
}

.weather-station-locator__station-id {
  font-size: 0.8125rem;
  font-family: var(--bs-font-monospace);
  color: var(--bs-secondary-color);
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.4rem;
  border-radius: 0.25rem;
}

.weather-station-locator__station-distance {
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}

.weather-station-locator__coords {
  margin-top: 0.375rem;
  font-size: 0.75rem;
  color: var(--bs-secondary-color);
}

.weather-station-locator__empty {
  margin-top: 0.75rem;
  padding: 0.625rem 0.75rem;
  border-radius: 0.375rem;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
  background: rgba(0, 0, 0, 0.03);
  border: 1px dashed rgba(0, 0, 0, 0.12);
}

.weather-station-modal-intro {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 0.5rem;
  background: rgba(13, 110, 253, 0.06);
  border: 1px solid rgba(13, 110, 253, 0.15);
}

.weather-station-modal-intro__step {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.8125rem;
  font-weight: 500;
}

.weather-station-modal-intro__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 50%;
  background: var(--bs-primary);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 600;
  flex-shrink: 0;
}

.weather-station-modal-intro__arrow {
  font-size: 0.7rem;
  color: var(--bs-secondary-color);
  opacity: 0.7;
}

.map-picker-canvas {
  width: 100%;
  height: 360px;
  border-radius: 0.5rem;
  overflow: hidden;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.map-picker-meta__coords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.5rem;
  font-size: 0.8125rem;
  margin-bottom: 0.75rem;
}

.map-picker-meta__label {
  font-weight: 600;
  color: var(--bs-secondary-color);
}

.map-picker-meta__station {
  padding: 0.75rem 0.875rem;
  border-radius: 0.375rem;
  border: 1px solid rgba(0, 0, 0, 0.1);
  background: rgba(0, 0, 0, 0.02);
}

.map-picker-meta__station--ready {
  border-color: rgba(25, 135, 84, 0.3);
  background: rgba(25, 135, 84, 0.06);
}

.map-picker-meta__station--error {
  border-color: rgba(220, 53, 69, 0.3);
  background: rgba(220, 53, 69, 0.04);
}

.map-picker-meta__station-head {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--bs-secondary-color);
  text-transform: uppercase;
  letter-spacing: 0.02em;
  margin-bottom: 0.375rem;
}

.map-picker-meta__station-name {
  font-size: 1.05rem;
  font-weight: 600;
}

.map-picker-meta__station-detail {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem 0.75rem;
  margin-top: 0.25rem;
  font-size: 0.8125rem;
  color: var(--bs-secondary-color);
}

[data-bs-theme='dark'] .weather-station-locator {
  border-color: rgba(110, 168, 254, 0.25);
  background: rgba(110, 168, 254, 0.06);
}

[data-bs-theme='dark'] .weather-station-locator__icon {
  background: rgba(110, 168, 254, 0.15);
}

[data-bs-theme='dark'] .weather-station-locator__station-id {
  background: rgba(255, 255, 255, 0.08);
}

[data-bs-theme='dark'] .weather-station-locator__empty {
  background: rgba(255, 255, 255, 0.03);
  border-color: rgba(255, 255, 255, 0.12);
}

[data-bs-theme='dark'] .weather-station-modal-intro {
  background: rgba(110, 168, 254, 0.08);
  border-color: rgba(110, 168, 254, 0.2);
}

[data-bs-theme='dark'] .map-picker-canvas {
  border-color: rgba(255, 255, 255, 0.12);
}

[data-bs-theme='dark'] .map-picker-meta__station {
  border-color: rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.03);
}

[data-bs-theme='dark'] .map-picker-meta__station--ready {
  border-color: rgba(117, 183, 152, 0.35);
  background: rgba(117, 183, 152, 0.08);
}
</style>
