<template>
  <div class="supervisory-setup-overview">
    <!-- Hero / Header -->
    <div class="setup-hero card border-0 shadow-sm mb-3 overflow-hidden">
      <div class="setup-hero-bg"></div>
      <div class="card-body position-relative">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div class="d-flex align-items-start gap-3">
            <div class="setup-hero-icon">
              <i class="fa fa-clipboard-check"></i>
            </div>
            <div>
              <div class="d-flex align-items-center flex-wrap gap-2">
                <h4 class="mb-0 fw-bold">工程開通</h4>
              </div>
              <div class="text-muted mt-1">
                歡迎使用偉域工程管理系統，請先完成必要設定一次，之後此工程案就可以不受限制地使用完整功能。
              </div>
            </div>
          </div>
          <div class="text-end d-none d-md-block">
            <div class="small text-muted">目前工程</div>
            <div class="fw-bold">{{ status?.constructionId || '尚未選擇' }}</div>
          </div>
        </div>

        <div class="mt-3">
          <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
            <div class="small text-muted">
              完成度：<strong>{{ passedCount }}</strong>/5
            </div>
            <div class="d-flex gap-2">
              <button class="btn btn-outline-secondary" type="button" :disabled="store.isLoading" @click="refresh">
                <i class="fa fa-sync me-1"></i>重新檢查
              </button>
              <button
                class="btn btn-primary"
                type="button"
                :disabled="store.isLoading || !!status?.completed || !allPassed"
                @click="complete"
              >
                <i class="fa fa-check me-1"></i>完成開通
              </button>
            </div>
          </div>

          <div class="progress mt-2" style="height: 10px;">
            <div
              class="progress-bar"
              role="progressbar"
              :style="{ width: progressPercent + '%' }"
              :class="progressPercent === 100 ? 'bg-success' : 'bg-primary'"
              :aria-valuenow="progressPercent"
              aria-valuemin="0"
              aria-valuemax="100"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="!constructionId" class="alert alert-warning">
      請先選擇工程案。
    </div>

    <div v-else>
      <div v-if="store.isLoading && !status" class="p-4 text-center text-muted">
        <i class="fa fa-spinner fa-spin me-2"></i>載入中...
      </div>

      <div v-else-if="status">
        <div v-if="status.completed" class="alert alert-success border-0 shadow-sm">
          <div class="d-flex align-items-start gap-2">
            <i class="fa fa-check-circle mt-1"></i>
            <div>
              <div class="fw-bold">此工程已完成開通</div>
              <div class="small">開通完成，你可以正常使用全部功能。</div>
              <div class="mt-2">
                <button class="btn btn-sm btn-success" type="button" @click="goDashboard">
                  <i class="fa fa-gauge me-1"></i>前往儀表板
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Section: 必要設定 -->
        <div class="setup-section card border-0 shadow-sm mb-3">
          <div class="card-header bg-transparent border-0 pb-0">
            <div class="d-flex align-items-center justify-content-between flex-wrap gap-2">
              <div class="d-flex align-items-center gap-2">
                <div class="setup-section-icon">
                  <i class="fa fa-list-check"></i>
                </div>
                <div>
                  <div class="fw-bold">必要設定清單</div>
                  <div class="small text-muted">請依序完成下列項目（未完成者會顯示缺漏清單）。</div>
                </div>
              </div>
              <span class="badge bg-secondary-subtle text-secondary border border-secondary-subtle">
                {{ passedCount }}/5 已完成
              </span>
            </div>
            <hr class="mt-3 mb-0 opacity-25" />
          </div>
          <div class="card-body pt-3">
            <div class="row g-4">
              <div class="col-md-6">
                <CheckCard
                  title="基本資料"
                  icon="fa fa-building"
                  :result="status.checks.basicData"
                  :to="toSupervisory('/basic/basic-data')"
                />
              </div>
              <div class="col-md-6">
                <CheckCard
                  title="工地人員"
                  icon="fa fa-users"
                  :result="status.checks.sitePersonnel"
                  :to="toSupervisory('/basic/site-personnel')"
                />
              </div>
              <div class="col-md-6">
                <CheckCard
                  title="施工項目維護"
                  icon="fa fa-tools"
                  :result="status.checks.majorItems"
                  to="/forms/b-construction-maintenance"
                />
              </div>
              <div class="col-md-6">
                <CheckCard
                  title="工程項目標單"
                  icon="fa fa-database"
                  :result="status.checks.projectItemDatabase"
                  :to="toSupervisory('/basic/project-item-database')"
                />
              </div>
              <div class="col-md-6">
                <CheckCard
                  title="標單材料設定（品質抽驗管控表）"
                  icon="fa fa-list-check"
                  :result="status.checks.tenderMaterialQualityControl"
                  to="/forms/tender-material-settings"
                />
              </div>
            </div>
          </div>
        </div>

        <!-- Section: 提示 -->
        <div v-if="!allPassed" class="card border-0 shadow-sm mt-3">
          <div class="card-body">
            <div class="d-flex align-items-start gap-2">
              <div class="setup-hint-icon">
                <i class="fa fa-exclamation-triangle"></i>
              </div>
              <div>
                <div class="fw-bold">尚未完成所有必要設定</div>
                <div class="text-muted small">
                  先把上面顯示「未完成」的項目補齊，再回來按「完成開通」即可解鎖全部功能。
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, defineComponent, getCurrentInstance } from 'vue'
import { useRouter } from 'vue-router'
import { useOnboardingStore } from '@/stores/onboarding'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'

const router = useRouter()
const proxy = getCurrentInstance()?.proxy as any
const store = useOnboardingStore()
const workspaceStore = useWorkspaceStore()

const constructionId = computed(() => workspaceStore.currentProject?.id || '')
const status = computed(() => store.currentStatus)

const passedCount = computed(() => {
  const s = status.value
  if (!s) return 0
  return [
    s.checks.basicData.passed,
    s.checks.sitePersonnel.passed,
    s.checks.majorItems.passed,
    s.checks.projectItemDatabase.passed,
    s.checks.tenderMaterialQualityControl.passed
  ].filter(Boolean).length
})

const progressPercent = computed(() => Math.round((passedCount.value / 5) * 100))

const allPassed = computed(() => {
  const s = status.value
  if (!s) return false
  return (
    s.checks.basicData.passed &&
    s.checks.sitePersonnel.passed &&
    s.checks.majorItems.passed &&
    s.checks.projectItemDatabase.passed &&
    s.checks.tenderMaterialQualityControl.passed
  )
})

const refresh = async () => {
  if (!constructionId.value) return
  await store.fetchStatus(constructionId.value, true)
}

const goDashboard = () => {
  // 監造視角的儀表板（帶 viewType）
  router.replace('/supervisory/')
}

const complete = async () => {
  if (!constructionId.value) return
  const res = await store.complete(constructionId.value)
  if (res?.completed) {
    proxy?.$toast?.success('恭喜完成維護，工程已開通完成')
    goDashboard()
  }
}

const toSupervisory = (baseUrl: string) => {
  if (baseUrl.startsWith('/supervisory/')) return baseUrl
  if (baseUrl.startsWith('/basic/')) return `/supervisory${baseUrl}`
  return baseUrl
}

onMounted(async () => {
  if (!constructionId.value) return
  await store.fetchStatus(constructionId.value, true)
})

const CheckCard = defineComponent({
  name: 'CheckCard',
  props: {
    title: { type: String, required: true },
    icon: { type: String, required: false },
    result: { type: Object as any, required: true },
    to: { type: String, required: false }
  },
  setup(props) {
    const passed = computed(() => !!props.result?.passed)
    const details = computed<string[]>(() => props.result?.details || [])
    const summary = computed(() => props.result?.summary || '')
    const go = () => {
      if (props.to) router.push(props.to)
    }
    const topDetails = computed(() => details.value.slice(0, 4))
    const moreCount = computed(() => Math.max(0, details.value.length - topDetails.value.length))
    const statusClass = computed(() => (passed.value ? 'is-success' : 'is-danger'))
    return { passed, details, summary, go, topDetails, moreCount }
  },
  template: `
    <div class="check-card card h-100 border-0 shadow-sm">
      <div class="card-body">
        <div class="d-flex align-items-start justify-content-between gap-3">
          <div class="d-flex align-items-start gap-3">
            <div class="check-card-icon" :class="passed ? 'is-success' : 'is-danger'">
              <i :class="icon || (passed ? 'fa fa-check' : 'fa fa-pen')"></i>
            </div>
            <div class="flex-grow-1">
              <div class="fw-bold">{{ title }}</div>
              <div class="small text-muted">{{ summary }}</div>
            </div>
          </div>
          <span class="badge" :class="passed ? 'bg-success-subtle text-success border border-success-subtle' : 'bg-danger-subtle text-danger border border-danger-subtle'">
            <i :class="passed ? 'fa fa-check-circle me-1' : 'fa fa-exclamation-circle me-1'"></i>
            {{ passed ? '已完成' : '未完成' }}
          </span>
        </div>

        <div v-if="details.length" class="mt-3">
          <div class="small text-muted mb-1">缺漏項目</div>
          <ul class="small mb-0 ps-3">
            <li v-for="(d, idx) in topDetails" :key="idx">{{ d }}</li>
          </ul>
          <div v-if="moreCount > 0" class="small text-muted mt-1">…還有 {{ moreCount }} 項</div>
        </div>

        <div class="mt-3 d-flex gap-2">
          <button v-if="to" type="button" class="btn btn-sm btn-outline-primary" @click="go">
            <i class="fa fa-arrow-right me-1"></i>前往設定
          </button>
        </div>
      </div>
    </div>
  `
})
</script>

<style scoped>
.supervisory-setup-overview {
  padding: 1rem;
}

.setup-hero {
  position: relative;
}

.setup-hero-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(1200px 200px at 10% 0%, rgba(var(--bs-primary-rgb), 0.18), transparent 60%),
    radial-gradient(900px 260px at 90% 30%, rgba(var(--bs-info-rgb), 0.14), transparent 55%),
    linear-gradient(180deg, rgba(var(--bs-body-bg-rgb), 1), rgba(var(--bs-body-bg-rgb), 1));
}

.setup-hero-icon {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--bs-primary-rgb), 0.12);
  color: var(--bs-primary);
  border: 1px solid rgba(var(--bs-primary-rgb), 0.18);
  flex: 0 0 auto;
}

.setup-hint-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--bs-warning-rgb), 0.14);
  color: var(--bs-warning);
  border: 1px solid rgba(var(--bs-warning-rgb), 0.22);
  flex: 0 0 auto;
}

.setup-section {
  background: rgba(var(--bs-body-bg-rgb), 1);
}

.setup-section-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(var(--bs-secondary-rgb), 0.12);
  color: var(--bs-secondary);
  border: 1px solid rgba(var(--bs-secondary-rgb), 0.18);
  flex: 0 0 auto;
}

.check-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
  border: 1px solid rgba(var(--bs-body-color-rgb), 0.08) !important;
  border-left: 4px solid rgba(var(--bs-body-color-rgb), 0.12) !important;
}

.check-card:has(.check-card-icon.is-success) {
  border-left-color: rgba(var(--bs-success-rgb), 0.6) !important;
}
.check-card:has(.check-card-icon.is-danger) {
  border-left-color: rgba(var(--bs-danger-rgb), 0.6) !important;
}

.check-card:hover {
  transform: translateY(-1px);
  box-shadow: 0 0.5rem 1.2rem rgba(0, 0, 0, 0.08) !important;
}

.check-card-icon {
  width: 40px;
  height: 40px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  border: 1px solid transparent;
}

.check-card-icon.is-success {
  background: rgba(var(--bs-success-rgb), 0.12);
  color: var(--bs-success);
  border-color: rgba(var(--bs-success-rgb), 0.2);
}

.check-card-icon.is-danger {
  background: rgba(var(--bs-danger-rgb), 0.12);
  color: var(--bs-danger);
  border-color: rgba(var(--bs-danger-rgb), 0.2);
}
</style>

