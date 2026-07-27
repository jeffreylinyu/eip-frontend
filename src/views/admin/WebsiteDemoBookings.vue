<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import CommonTable from '@/components/common/CommonTable.vue'
import Modal from '@/components/bootstrap/Modal.vue'
import {
  listWebsiteDemoBookings,
  type WebsiteDemoBookingListItem,
} from '@/api/websiteDemoBooking'

const router = useRouter()
const authStore = useAuthStore()

const hasSuperAdminPermission = computed(() => {
  const systemRole = authStore.user?.systemRole || authStore.user?.role
  return systemRole === 'SUPER_ADMIN'
})

const rows = ref<WebsiteDemoBookingListItem[]>([])
const isLoading = ref(false)
const searchQuery = ref('')
const currentPage = ref(0)
const pageSize = ref(20)
const totalElements = ref(0)
const totalPages = ref(0)

const selectedRow = ref<WebsiteDemoBookingListItem | null>(null)
const showDetailModal = ref(false)

const normalizedQuery = computed(() => searchQuery.value.trim().toLowerCase())
const filteredRows = computed(() => {
  const q = normalizedQuery.value
  if (!q) return rows.value
  return rows.value.filter((r) => {
    const haystack = [
      r.contactName,
      r.organization,
      r.email,
      r.phone,
      r.preferredContactTime,
      r.message,
      r.clientIp,
      String(r.id),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return haystack.includes(q)
  })
})

const formatDateTime = (value: string | undefined) => {
  if (!value) return '-'
  try {
    const d = new Date(value)
    if (Number.isNaN(d.getTime())) return value
    return d.toLocaleString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return value
  }
}

const truncate = (text: string | null | undefined, max = 48) => {
  if (!text) return '—'
  const t = text.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max)}…`
}

const loadData = async () => {
  if (!hasSuperAdminPermission.value) return
  isLoading.value = true
  try {
    const result = await listWebsiteDemoBookings(currentPage.value, pageSize.value)
    rows.value = result.content || []
    totalElements.value = result.totalElements ?? 0
    totalPages.value = result.totalPages ?? 0
    currentPage.value = result.page ?? currentPage.value
    pageSize.value = result.size ?? pageSize.value
  } catch (error) {
    console.error('載入官網預約紀錄失敗:', error)
    alert('載入官網預約紀錄失敗，請確認您為系統管理員後再試')
  } finally {
    isLoading.value = false
  }
}

const goToPage = (page: number) => {
  if (page < 0 || (totalPages.value > 0 && page >= totalPages.value)) return
  currentPage.value = page
  loadData()
}

const openDetail = (row: WebsiteDemoBookingListItem) => {
  selectedRow.value = row
  showDetailModal.value = true
}

const mailto = (email: string) => {
  window.location.href = `mailto:${encodeURIComponent(email)}`
}

watch(pageSize, () => {
  currentPage.value = 0
  loadData()
})

onMounted(() => {
  if (hasSuperAdminPermission.value) {
    loadData()
  } else {
    router.push('/')
  }
})
</script>

<template>
  <div class="website-demo-bookings-page p-4">
    <PageHeader
      title="官網預約示範紀錄"
      icon="bi bi-calendar-check"
      :breadcrumbs="[
        { text: '系統管理', href: 'javascript:;' },
        { text: '官網預約紀錄', active: true },
      ]"
    />

    <p class="text-muted small mb-3">
      來自官網「預約示範」表單的提交紀錄；若已設定
      <code>WEBSITE_DEMO_NOTIFY_EMAIL</code>，新單會同時寄送內部通知信。
    </p>

    <div class="d-flex flex-wrap gap-2 align-items-center justify-content-between mb-2">
      <div class="input-group input-group-sm" style="max-width: 420px">
        <span class="input-group-text"><i class="fa fa-search"></i></span>
        <input
          v-model="searchQuery"
          type="text"
          class="form-control"
          placeholder="搜尋姓名 / 單位 / Email / 時段…"
        />
        <button
          class="btn btn-outline-secondary"
          type="button"
          @click="searchQuery = ''"
          :disabled="!searchQuery"
        >
          清除
        </button>
      </div>

      <div class="d-flex align-items-center gap-2">
        <label class="small text-muted mb-0">每頁</label>
        <select v-model.number="pageSize" class="form-select form-select-sm" style="width: auto">
          <option :value="10">10</option>
          <option :value="20">20</option>
          <option :value="50">50</option>
        </select>
        <button class="btn btn-outline-secondary btn-sm" type="button" :disabled="isLoading" @click="loadData">
          <i class="fa fa-refresh me-1" :class="{ 'fa-spin': isLoading }"></i>重新整理
        </button>
      </div>
    </div>

    <CommonTable
      wrapperClass="border rounded"
      :loading="isLoading"
      :empty="!isLoading && filteredRows.length === 0"
      :colspan="9"
    >
      <template #head>
        <tr>
          <th class="text-center" style="width: 4rem">#</th>
          <th class="text-center" style="width: 10rem">提交時間</th>
          <th>姓名</th>
          <th>單位／公司</th>
          <th>電子郵件</th>
          <th>電話</th>
          <th>方便聯繫時段</th>
          <th>需求說明</th>
          <th class="text-center pe-3" style="width: 5rem">詳情</th>
        </tr>
      </template>

      <template #body>
        <tr v-for="row in filteredRows" :key="row.id">
          <td class="text-center text-muted">{{ row.id }}</td>
          <td class="text-center small">{{ formatDateTime(row.createdAt) }}</td>
          <td>{{ row.contactName }}</td>
          <td>{{ row.organization }}</td>
          <td>
            <a href="#" class="text-decoration-none" @click.prevent="mailto(row.email)">{{ row.email }}</a>
          </td>
          <td>{{ row.phone || '—' }}</td>
          <td>{{ row.preferredContactTime || '—' }}</td>
          <td class="small text-muted">{{ truncate(row.message) }}</td>
          <td class="text-center pe-3">
            <button type="button" class="btn btn-sm btn-outline-primary" title="查看完整內容" @click="openDetail(row)">
              <i class="fa fa-eye"></i>
            </button>
          </td>
        </tr>
      </template>
    </CommonTable>

    <div
      v-if="!normalizedQuery && totalPages > 0"
      class="d-flex flex-wrap align-items-center justify-content-between gap-2 mt-3"
    >
      <span class="small text-muted">
        共 {{ totalElements }} 筆，第 {{ currentPage + 1 }} / {{ totalPages }} 頁
      </span>
      <div class="btn-group btn-group-sm">
        <button type="button" class="btn btn-outline-secondary" :disabled="currentPage <= 0 || isLoading" @click="goToPage(0)">
          第一頁
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="currentPage <= 0 || isLoading"
          @click="goToPage(currentPage - 1)"
        >
          上一頁
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="currentPage >= totalPages - 1 || isLoading"
          @click="goToPage(currentPage + 1)"
        >
          下一頁
        </button>
        <button
          type="button"
          class="btn btn-outline-secondary"
          :disabled="currentPage >= totalPages - 1 || isLoading"
          @click="goToPage(totalPages - 1)"
        >
          最後一頁
        </button>
      </div>
    </div>
    <p v-else-if="normalizedQuery" class="small text-muted mt-2 mb-0">
      目前為本頁資料的即時篩選；切換分頁後篩選僅作用於該頁。
    </p>

    <Modal v-model:show="showDetailModal" title="預約詳情" size="lg">
      <template v-if="selectedRow">
        <dl class="row mb-0 small">
          <dt class="col-sm-3">編號</dt>
          <dd class="col-sm-9">{{ selectedRow.id }}</dd>
          <dt class="col-sm-3">提交時間</dt>
          <dd class="col-sm-9">{{ formatDateTime(selectedRow.createdAt) }}</dd>
          <dt class="col-sm-3">姓名</dt>
          <dd class="col-sm-9">{{ selectedRow.contactName }}</dd>
          <dt class="col-sm-3">單位／公司</dt>
          <dd class="col-sm-9">{{ selectedRow.organization }}</dd>
          <dt class="col-sm-3">電子郵件</dt>
          <dd class="col-sm-9">
            <a href="#" @click.prevent="mailto(selectedRow.email)">{{ selectedRow.email }}</a>
          </dd>
          <dt class="col-sm-3">聯絡電話</dt>
          <dd class="col-sm-9">{{ selectedRow.phone || '—' }}</dd>
          <dt class="col-sm-3">方便聯繫時段</dt>
          <dd class="col-sm-9">{{ selectedRow.preferredContactTime || '—' }}</dd>
          <dt class="col-sm-3">需求說明</dt>
          <dd class="col-sm-9">
            <pre class="mb-0 text-wrap" style="white-space: pre-wrap; font-family: inherit">{{
              selectedRow.message?.trim() || '（未填）'
            }}</pre>
          </dd>
          <dt class="col-sm-3">來源 IP</dt>
          <dd class="col-sm-9 text-muted">{{ selectedRow.clientIp || '—' }}</dd>
        </dl>
      </template>
      <template #footer>
        <button type="button" class="btn btn-secondary" @click="showDetailModal = false">關閉</button>
      </template>
    </Modal>
  </div>
</template>
