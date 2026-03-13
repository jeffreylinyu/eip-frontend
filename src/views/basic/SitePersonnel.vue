<template>
  <div class="site-personnel-project">
    <!-- 頁面標題 -->
    <PageHeader
      title="專案工地人員管理"
      icon="fa fa-users"
      :breadcrumbs="[
        { text: '基本資料管理', href: 'javascript:;' },
        { text: '工地人員管理', active: true }
      ]"
    />

    <!-- 錯誤提示 -->
    <div v-if="!currentProject" class="alert alert-danger">
      請先選擇工程專案
    </div>

    <div v-else>
      <!-- 人員配置建議＋各版本人員配置狀況（同一收合控制）；監造僅顯示各版本人員配置狀況 -->
      <div class="row mb-4">
        <div class="col-12">
          <div class="o4-staffing-hint w-100">
            <button
              type="button"
              class="o4-staffing-toggle d-flex align-items-center gap-2 w-100 text-start border-0 bg-transparent text-muted small fw-semibold py-1 pe-1"
              @click="staffingHintExpanded = !staffingHintExpanded"
            >
              <i class="fa fa-info-circle text-info"></i>
              <span v-if="isContractor">人員配置建議</span>
              <template v-if="isContractor">
                <span class="mx-1 text-muted">｜</span>
              </template>
              <span>各版本人員配置狀況</span>
              <i class="fa ms-auto transition-transform" :class="staffingHintExpanded ? 'fa-chevron-up' : 'fa-chevron-down'"></i>
            </button>

            <div v-show="staffingHintExpanded" class="row mt-2">
              <div v-if="isContractor" class="col-12 col-lg-6 mb-3 mb-lg-0">
                <div class="o4-staffing-grid">
                  <div
                    v-for="level in levelRowsAll"
                    :key="level.key"
                    class="o4-staffing-row"
                    :class="{
                      active: isLevelActive(level.key),
                      'o4-staffing-row--no-version': versionAmounts.length <= 1
                    }"
                  >
                    <div class="o4-staffing-range">{{ level.range }}</div>
                    <div class="o4-staffing-req">{{ level.text }}</div>
                    <div v-if="versionAmounts.length > 1" class="o4-staffing-tags">
                      <span
                        v-for="name in getVersionNamesInLevel(level.key)"
                        :key="name"
                        class="badge rounded-pill bg-warning text-dark o4-staffing-badge"
                      >{{ name }}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="col-12" :class="{ 'col-lg-6': isContractor }">
                <div class="version-config-box">
                  <template v-if="!versionPersonnelConfig.dataComplete">
                    <p class="text-muted small mb-0">資料不完整無法提供</p>
                  </template>
                  <template v-else>
                    <ul class="nav nav-tabs nav-tabs-sm mb-2">
                      <li v-for="(ver, idx) in versionPersonnelConfig.versions" :key="ver.versionId ?? 'original'" class="nav-item">
                        <button
                          type="button"
                          class="nav-link"
                          :class="{ active: selectedVersionConfigIndex === idx }"
                          @click="selectedVersionConfigIndex = idx"
                        >
                          <span>{{ ver.versionName }}</span>
                        </button>
                      </li>
                    </ul>
                    <template v-if="selectedVersionResult">
                      <div class="version-config-content">
                        <div class="mb-2">
                          <template v-if="isContractor">
                            <span class="text-muted small">級距：</span>
                            <span class="fw-semibold">{{ selectedVersionResult.level }}</span>
                            <span class="text-muted small ms-2">版本區間：</span>
                          </template>
                          <template v-else>
                            <span class="text-muted small">版本區間：</span>
                          </template>
                          <span v-if="selectedVersionResult.interval?.start && selectedVersionResult.interval?.end" class="text-muted small">
                            {{ formatRepublicDate(selectedVersionResult.interval.start) }}～{{ formatRepublicDate(selectedVersionResult.interval.end) }}
                          </span>
                          <span v-else class="text-muted small">資料不完整</span>
                        </div>
                        <div class="mb-2">
                          <span class="text-muted small">區間檢核：</span>
                          <span v-if="selectedVersionResult.missingRoles.length === 0" class="badge bg-success">全程符合</span>
                          <span v-else class="badge bg-warning text-dark">有缺漏</span>
                        </div>
                        <div class="mb-2">
                          <div class="version-config-metrics-inline small">
                            <template v-for="role in ALL_CONFIG_ROLE_KEYS" :key="role">
                              <div
                                v-if="selectedVersionResult.required[role] > 0"
                                class="version-config-metric"
                                :class="{
                                  'version-config-metric--missing': selectedVersionResult.missingRoles.some(m => m.role === role),
                                  'version-config-metric--ok': !selectedVersionResult.missingRoles.some(m => m.role === role)
                                }"
                              >
                                <span
                                  class="version-config-role me-1"
                                  :class="{
                                    'text-primary': role === 'OWNER' || role === 'CONSTRUCTION_MANAGER',
                                    'text-warning': role === 'QUALITY',
                                    'text-danger': role === 'LABOUR_SAFETY',
                                    'text-info': role === 'TECHNICIAN'
                                  }"
                                >{{ getConfigRoleLabel(role) }}</span>
                                <span class="text-muted me-1">所需</span>
                                <span class="version-config-number">{{ selectedVersionResult.required[role] }}</span>
                                <span v-if="role === 'LABOUR_SAFETY' && getLabourSafetyRequirementText(selectedVersionResult.levelKey)" class="text-muted small ms-1">（{{ getLabourSafetyRequirementText(selectedVersionResult.levelKey) }}）</span>
                              </div>
                            </template>
                          </div>
                        </div>
                        <div v-if="selectedVersionResult.missingRoles.length > 0" class="mt-2 pt-2 border-top border-secondary border-opacity-25">
                          <div class="text-muted small fw-semibold mb-1">區間內缺漏時段：</div>
                          <div v-for="g in selectedVersionResult.gaps" :key="g.role" class="small mb-1">
                            <span class="fw-semibold">{{ g.roleName }}：</span>
                            <span v-for="(p, i) in g.periods" :key="i">{{ formatRepublicDate(p.start) }}～{{ formatRepublicDate(p.end) }}<span v-if="i < g.periods.length - 1">、</span></span>
                          </div>
                        </div>
                      </div>
                    </template>
                  </template>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 主要內容區域 -->
      <div class="row">
        <div class="col-12">
          <card>
            <card-header>
              <div class="d-flex justify-content-between align-items-center">
                <div>
                  <h5 class="mb-0">
                    <i class="fa fa-users me-2"></i>
                    專案人員配置
                  </h5>
                </div>
                <div class="d-flex align-items-center gap-2 flex-wrap justify-content-end">
                  <div class="d-flex align-items-center gap-2 flex-wrap me-1 site-personnel-stats">
                    <span class="text-muted">總計：</span>
                    <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ assignedPersonnel.length }} 人</span>
                    <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('QUALITY') }} 品管</span>
                    <span class="badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('LABOUR_SAFETY') }} 勞安</span>
                    <span class="badge border border-info text-info px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('TECHNICIAN') }} 技師</span>
                  </div>
                  <button
                    type="button"
                    class="btn btn-theme"
                    @click="openAssignModal"
                  >
                    <i class="fa fa-user-plus me-2"></i>指派人員
                  </button>
                </div>
              </div>
            </card-header>
            <card-body>
              <!-- 列表呈現（參考 /company/site-personnel） -->
              <div class="table-responsive">
                <table class="table table-hover align-middle site-personnel-dark-table">
                  <thead>
                    <tr>
                      <th>姓名</th>
                      <th>職稱</th>
                      <th>證照號碼</th>
                      <th>到職日</th>
                      <th>狀態</th>
                      <th class="text-end">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="assignedPersonnel.length === 0">
                      <td colspan="6" class="text-center text-muted py-4">
                        目前專案尚未指派任何人員，請點右上角「指派人員」。
                      </td>
                    </tr>
                    <tr v-for="person in assignedPersonnelSorted" :key="`${person.memberId}-${personnelListKey}`">
                      <td>
                        <span>{{ person.fullName || '未填寫' }}</span>
                        <div class="text-muted small">{{ person.identityNumber || '未填寫' }}</div>
                      </td>
                      <td>
                        <span
                          class="badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center"
                          :class="`border-${getPositionOption(person.occupation || person.position).color} text-${getPositionOption(person.occupation || person.position).color}`"
                          :title="getRoleText(person.occupation || person.position || '', person.occupationCategory)"
                        >
                          <i :class="`fa ${getPositionOption(person.occupation || person.position).icon} me-1`"></i>
                          {{ getRoleText(person.occupation || person.position || '', person.occupationCategory) }}
                        </span>
                      </td>
                      <td class="px-2">
                        <div class="small">
                          <template v-if="person.licenseNumber || person.licenseExpiryDate || person.hasPhoto">
                            <div v-if="person.licenseNumber" class="mb-1">
                              <i class="fa fa-id-card me-1"></i>
                              <span>{{ person.licenseNumber }}</span>
                            </div>
                            <div v-if="person.licenseExpiryDate" class="text-muted mb-1">
                              <i class="fa fa-calendar me-1"></i>{{ formatRepublicDate(person.licenseExpiryDate) }}
                            </div>
                            <div v-if="person.hasPhoto" class="mb-1">
                              <i class="fa fa-file-alt me-1"></i>
                              <span
                                class="text-decoration-underline text-primary"
                                role="button"
                                @click="viewLicense(person.memberId)"
                                title="預覽證照"
                              >預覽證照</span>
                            </div>
                          </template>
                          <span v-else class="text-muted">未填寫</span>
                        </div>
                      </td>
                      <td class="text-muted small">{{ formatRepublicDate(getCurrentAssignment(person)?.workStartDate) || '—' }}</td>
                      <td>
                        <span :class="getProjectAssignmentStatusBadgeClass(person)">
                          {{ getProjectAssignmentStatus(person).text }}
                        </span>
                      </td>
                      <td class="text-end">
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-success me-2"
                          v-if="!getAssignmentCoveringToday(person) && getAssignmentsForCurrentProject(person).length > 0"
                          @click="openReinstateModal(person)"
                          title="復職（填到職日後重新指派）"
                        >
                          復職
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-warning me-2"
                          v-if="getAssignmentCoveringToday(person)"
                          @click="openResignModal(person)"
                          title="離職（填離職日）"
                        >
                          離職
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger me-2"
                          @click="deletePersonnelAssignment(person)"
                          title="刪除此專案的任職紀錄（誤指派時使用）"
                        >
                          刪除
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-secondary"
                          v-if="getAssignmentsForCurrentProject(person).length > 0"
                          @click="openAssignmentDetail(person)"
                        >
                          任職紀錄
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </card-body>
          </card>
        </div>
      </div>
      
      <!-- 指派人員 Modal -->
      <Modal
        :show="showAssignModal"
        title="指派工地人員"
        icon="fa fa-user-plus"
        size="lg"
        @hide="showAssignModal = false"
        @confirm="handleAssignSubmit"
        :is-loading="isLoading"
        confirm-text="確認指派"
      >
        <template #body>
           <div class="alert alert-info" role="alert">
             <div class="d-flex align-items-center mb-1">
               <i class="fa fa-info-circle me-2"></i>
               <strong>指派名單來源與權限說明</strong>
             </div>
             <ul class="mb-0 small">
               <li>此處「可指派的人員」來自 <strong>公司內部的人員名單</strong>（不是本專案臨時新增）。</li>
               <li>只有 <strong>擁有公司管理員權限</strong> 才能到「公司管理 → 工地人員管理」進行維護。</li>
               <li>本頁只負責 <strong>將既有人員指派到目前專案</strong>；在這裡「移除指派」不會刪除公司人員資料，只是解除與專案的關聯。</li>
             </ul>
             <div class="mt-2">
               <router-link
                 v-if="canManageCompanyPersonnel"
                 class="btn btn-sm btn-outline-info"
                 to="/company/site-personnel"
               >
                 <i class="fa fa-external-link-alt me-1"></i>前往公司工地人員管理
               </router-link>
             </div>
           </div>
           <div class="mb-3">
             <label class="form-label fw-semibold">到職日 <span class="text-danger">*</span></label>
             <RepublicDatePicker
               v-model="assignmentStartDate"
               inputClass="form-control"
               :useRepublicYear="true"
               :hideIcon="true"
             />
           </div>
           <div class="mb-3">
             <input type="text" class="form-control" placeholder="搜索人員..." v-model="assignSearchQuery">
           </div>
           <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
             <table class="table table-hover site-personnel-dark-table">
               <thead>
                 <tr>
                   <th width="40"></th>
                   <th>姓名</th>
                   <th>職位</th>
                   <th>狀態</th>
                   <th>目前專案</th>
                 </tr>
               </thead>
               <tbody>
                  <tr v-if="filteredAvailablePersonnel.length === 0">
                    <td colspan="5" class="text-center text-muted">
                      <span v-if="availablePersonnel.length === 0">沒有可指派的人員</span>
                      <span v-else>搜尋無結果</span>
                    </td>
                  </tr>
                  <tr v-for="person in filteredAvailablePersonnel" :key="person.memberId">
                    <td>
                      <div class="form-check">
                        <input class="form-check-input" type="checkbox" :value="person.memberId" v-model="selectedPersonnelIds">
                      </div>
                    </td>
                    <td>{{ person.fullName }}</td>
                    <td>{{ getRoleText(person.occupation || person.position || '', person.occupationCategory) }}</td>
                    <td>
                       <span :class="getStatusBadgeClass(person.status, true)">
                          {{ getStatusText(person.status) }}
                       </span>
                    </td>
                    <td>
                      <span v-if="person.constructionId && person.constructionId !== currentProject?.constructionId" class="badge bg-secondary">其他專案</span>
                      <span v-else-if="person.constructionId" class="badge bg-success">本專案</span>
                      <span v-else class="badge bg-secondary">閒置中</span>
                    </td>
                  </tr>
               </tbody>
             </table>
           </div>
        </template>
      </Modal>

      <!-- 離職日期 Modal -->
      <Modal
        :show="showResignModal"
        title="設定離職日"
        icon="fa fa-user-times"
        size="sm"
        @hide="showResignModal = false"
        @confirm="handleResignSubmit"
        :is-loading="isLoading"
        confirm-text="確認離職"
      >
        <template #body>
          <div v-if="resignTargetPerson" class="mb-3">
            <div class="fw-semibold">人員：{{ resignTargetPerson.fullName }}</div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">離職日 <span class="text-danger">*</span></label>
            <RepublicDatePicker
              v-model="assignmentEndDate"
              inputClass="form-control"
              :useRepublicYear="true"
              :hideIcon="true"
            />
          </div>
        </template>
      </Modal>

      <!-- 復職 Modal -->
      <Modal
        :show="showReinstateModal"
        title="設定復職到職日"
        icon="fa fa-user-check"
        size="sm"
        @hide="showReinstateModal = false"
        @confirm="handleReinstateSubmit"
        :is-loading="isLoading"
        confirm-text="確認復職"
      >
        <template #body>
          <div v-if="reinstateTargetPerson" class="mb-3">
            <div class="fw-semibold">人員：{{ reinstateTargetPerson.fullName }}</div>
          </div>
          <div class="mb-3">
            <label class="form-label fw-semibold">到職日 <span class="text-danger">*</span></label>
            <RepublicDatePicker
              v-model="reinstateStartDate"
              inputClass="form-control"
              :useRepublicYear="true"
              :hideIcon="true"
            />
          </div>
        </template>
      </Modal>

      <!-- 任職紀錄 Modal（僅顯示本專案的多段任職） -->
      <Modal
        :show="showAssignmentDetailModal"
        :title="assignmentDetailTitle || '任職紀錄'"
        icon="fa fa-hard-hat"
        size="lg"
        modal-id="projectAssignmentDetailModal"
        confirm-text="關閉"
        confirm-icon="fa fa-times"
        @hide="closeAssignmentDetail"
        @confirm="closeAssignmentDetail"
      >
        <template #body>
          <div v-if="assignmentDetailList.length">
            <ul class="list-group">
              <li
                v-for="(item, idx) in assignmentDetailList"
                :key="item.id ?? idx"
                class="list-group-item"
              >
                <div class="d-flex justify-content-between align-items-start flex-wrap gap-2">
                  <div>
                    <div class="fw-bold">
                      <i class="fa fa-hard-hat me-1 text-primary"></i>
                      {{ currentProject?.constructionName || currentProject?.constructionId || '本專案' }}
                    </div>
                    <template v-if="editingAssignmentId === item.id">
                      <div class="mt-2 d-flex flex-wrap align-items-end gap-3">
                        <div>
                          <label class="form-label small mb-1">到職日</label>
                          <RepublicDatePicker
                            v-model="editingStartDate"
                            inputClass="form-control form-control-sm"
                            :useRepublicYear="true"
                            :hideIcon="true"
                          />
                        </div>
                        <div>
                          <label class="form-label small mb-1">離職日（留空表示在職中）</label>
                          <RepublicDatePicker
                            v-model="editingEndDate"
                            inputClass="form-control form-control-sm"
                            :useRepublicYear="true"
                            :hideIcon="true"
                          />
                        </div>
                        <div class="d-flex gap-2">
                          <button type="button" class="btn btn-sm btn-theme" @click="saveAssignmentDates">儲存</button>
                          <button type="button" class="btn btn-sm btn-outline-secondary" @click="cancelEditAssignment">取消</button>
                        </div>
                      </div>
                    </template>
                    <div v-else class="text-muted small">
                      到職：{{ formatRepublicDate(item.workStartDate) || '未填' }}
                      <span class="mx-1">/</span>
                      離職：{{ formatRepublicDate(item.workEndDate) || (item.isActive ? '在職中' : '未填') }}
                    </div>
                  </div>
                  <div v-if="item.id != null && editingAssignmentId !== item.id" class="d-flex gap-1">
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-primary"
                      @click="startEditAssignment(item)"
                    >
                      編輯
                    </button>
                    <button
                      type="button"
                      class="btn btn-sm btn-outline-danger"
                      @click="removeAssignmentFromDetail(item)"
                      title="移除此筆任職紀錄"
                    >
                      移除
                    </button>
                  </div>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="text-muted small">目前沒有任何任職紀錄。</div>
        </template>
      </Modal>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useProjectStore } from '@/stores/project'
import { useWorkspaceStore } from '@/stores/workspace'
import { useAuthStore } from '@/stores/auth'
import { useCompanyStore } from '@/stores/company'
import { sitePersonnelApi, type SitePersonnel } from '@/api/sitePersonnel'
import { useViewPerspective } from '@/composables/useViewPerspective'
import { getOccupationOptions, getOccupationDisplayLabel, LEGACY_OCCUPATION_MAP, normalizeOccupationValue, sortPersonnelByOccupation, type OccupationOption } from '@/api/sitePersonnelOccupations'
import { getDesignChangeList, getContractAmountsByVersion, type DesignChangeItem, type VersionContractAmount } from '@/api/designChange'
import { computeVersionPersonnelConfig, getConfigRoleLabel, getLabourSafetyRequirementText, ALL_CONFIG_ROLE_KEYS, type PersonWithAssignments } from '@/composables/useVersionPersonnelConfig'
import { formatAmount } from '@/utils/format'
import Modal from '@/components/bootstrap/Modal.vue'
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue'

const router = useRouter()
const projectStore = useProjectStore()
const workspaceStore = useWorkspaceStore()
const authStore = useAuthStore()
const companyStore = useCompanyStore()
const { isContractor } = useViewPerspective()

// 狀態
const isLoading = ref(false)
const showAssignModal = ref(false)
const showResignModal = ref(false)
const resignTargetPerson = ref<SitePersonnel | null>(null)
const resignTargetAssignmentId = ref<number | null>(null)
const assignmentEndDate = ref<string>('')
const showReinstateModal = ref(false)
const reinstateTargetPerson = ref<SitePersonnel | null>(null)
const reinstateStartDate = ref<string>('')
const showAssignmentDetailModal = ref(false)
const assignmentDetailTitle = ref('')
const assignmentDetailList = ref<{ id?: number; workStartDate?: string | null; workEndDate?: string | null; isActive?: boolean }[]>([])
const assignmentDetailPersonRef = ref<SitePersonnel | null>(null)
const editingAssignmentId = ref<number | null>(null)
const designChangeList = ref<DesignChangeItem[]>([])
/** 各版本契約金額（原契約＋各變更設計），用於依版本顯示級距 */
const versionAmounts = ref<VersionContractAmount[]>([])
/** 人員配置建議區塊是否展開（預設展開） */
const staffingHintExpanded = ref(true)
/** 右側「各版本人員配置狀況」目前選中的版本索引 */
const selectedVersionConfigIndex = ref(0)
const editingStartDate = ref<string>('')
const editingEndDate = ref<string>('')
const allPersonnel = ref<SitePersonnel[]>([])
/** 列表資料版本：每次 loadData 後遞增，供 :key 使用以強制重新渲染狀態欄 */
const personnelListKey = ref(0)
const selectedPersonnelIds = ref<string[]>([])
const assignSearchQuery = ref('')
const assignmentStartDate = ref<string>('')

// 當前專案
const currentProject = computed(() => projectStore.currentProject)

/** 用於顯示的版本列表：原契約 + 各變更設計（人員配置建議依版本顯示） */
const versionListForDisplay = computed(() => {
  const list: { id: number | null; label: string }[] = [{ id: null, label: '原契約' }]
  designChangeList.value.forEach((d, i) => {
    list.push({ id: d.id, label: d.versionName?.trim() || `變更設計${i + 1}` })
  })
  return list
})

// 是否在當前專案「目前在職」
function hasActiveAssignmentForCurrentProject(p: SitePersonnel): boolean {
  const cid = currentProject.value?.constructionId
  if (!cid) return false
  const list = p.assignments || []
  return list.some(a => a.constructionId === cid && a.isActive)
}

// 是否曾被指派到當前專案（包含已離職）
function hasAnyAssignmentForCurrentProject(p: SitePersonnel): boolean {
  const cid = currentProject.value?.constructionId
  if (!cid) return false
  const list = p.assignments || []
  if (list.length) {
    return list.some(a => a.constructionId === cid)
  }
  // 兼容舊資料（沒有 assignments，用 constructionId 判斷）
  return p.constructionId === cid
}

// 已指派的人員（含已離職：只要有此專案的任職紀錄就顯示）
const assignedPersonnel = computed(() => {
  if (!currentProject.value) return []
  return allPersonnel.value.filter(hasAnyAssignmentForCurrentProject)
})

// 可指派的人員（排除已指派給當前專案者）
const availablePersonnel = computed(() => {
  if (!currentProject.value) return allPersonnel.value
  // 只排除「目前在職」的，已離職者仍可重新指派
  return allPersonnel.value.filter(p => !hasActiveAssignmentForCurrentProject(p))
})

const filteredAvailablePersonnel = computed(() => {
  if (!assignSearchQuery.value) return availablePersonnel.value
  const q = assignSearchQuery.value.toLowerCase()
  return availablePersonnel.value.filter(p => 
    p.fullName.toLowerCase().includes(q) || 
    (p.occupation && p.occupation.toLowerCase().includes(q))
  )
})

function formatRepublicDate(v?: string | null): string {
  if (!v) return ''
  const iso = v.split('T')[0]
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const y = d.getFullYear() - 1911
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}年${mm}月${dd}日`
}

function getPositionOption(position: string | undefined) {
  if (!position) return { label: '未設定', color: 'secondary', icon: 'fa-user' }
  const mapped = LEGACY_OCCUPATION_MAP[position] || position
  const option = occupationOptions.value.find(opt => opt.value === mapped)
  return option || { label: position, color: 'secondary', icon: 'fa-user' }
}

function getCurrentAssignment(p: SitePersonnel) {
  const cid = currentProject.value?.constructionId
  if (!cid) return null
  const list = p.assignments || []
  // 優先找「目前在職」的任職紀錄
  const active = list.find(a => a.constructionId === cid && a.isActive)
  if (active) return active
  // 若沒有在職，退回找最近一筆（讓表格仍能顯示）
  const history = list.filter(a => a.constructionId === cid)
  return history[history.length - 1] || null
}

function getAssignmentsForCurrentProject(p: SitePersonnel) {
  const cid = currentProject.value?.constructionId
  if (!cid) return []
  const list = p.assignments || []
  return list.filter(a => a.constructionId === cid)
}

/** 取日期字串的 YYYY-MM-DD 部分供比較 */
function toDateOnly(s: string | null | undefined): string | null {
  if (!s || typeof s !== 'string') return null
  const part = s.trim().split('T')[0]
  return part || null
}

/** 該員在此專案最後一筆任職的離職日（若有多段取最晚的離職日）；無則 null */
function getLastEndDateForCurrentProject(p: SitePersonnel): string | null {
  const list = getAssignmentsForCurrentProject(p)
  const ends = list.map((a) => toDateOnly(a.workEndDate)).filter(Boolean) as string[]
  if (ends.length === 0) return null
  return ends.sort().reverse()[0] ?? null
}

/** 該員在此專案「目前在職」任職的到職日；無則 null */
function getActiveStartDateForCurrentProject(p: SitePersonnel): string | null {
  const active = getCurrentAssignment(p)
  return active ? toDateOnly(active.workStartDate) : null
}

const TODAY_YYYYMMDD = () => new Date().toISOString().slice(0, 10)

/** 該員在此專案下一段（未來）的到職日：取最早的 workStartDate > today */
function getNextStartDateForCurrentProject(p: SitePersonnel): string | null {
  const today = TODAY_YYYYMMDD()
  const list = getAssignmentsForCurrentProject(p)
  const starts = list
    .map(a => toDateOnly(a.workStartDate))
    .filter((d): d is string => !!d && d > today)
    .sort()
  return starts[0] ?? null
}

/** 依「今天」找出涵蓋今日的任職紀錄（start <= 今天 <= end，end 空視為無限期） */
function getAssignmentCoveringToday(p: SitePersonnel): { workStartDate?: string | null; workEndDate?: string | null } | null {
  const list = getAssignmentsForCurrentProject(p)
  const today = TODAY_YYYYMMDD()
  for (const a of list) {
    const start = toDateOnly(a.workStartDate)
    const end = toDateOnly(a.workEndDate)
    if (!start || start > today) continue
    if (end == null) return a // 無離職日＝在職中
    if (end >= today) return a
  }
  return null
}

/** 找出涵蓋今日的任職紀錄（含 id），供離職覆蓋更新使用 */
function getAssignmentCoveringTodayWithId(p: SitePersonnel): { id?: number; workStartDate?: string | null; workEndDate?: string | null } | null {
  const list = getAssignmentsForCurrentProject(p)
  const today = TODAY_YYYYMMDD()
  for (const a of list) {
    const start = toDateOnly(a.workStartDate)
    const end = toDateOnly(a.workEndDate)
    if (!start || start > today) continue
    if (end == null) return a
    if (end >= today) return a
  }
  return null
}

/** 本專案任職狀態（依今天判斷）：在職 / 已離職 / 即將離職 / 即將復職 */
function getProjectAssignmentStatus(person: SitePersonnel): { text: string; type: 'active' | 'resigned' | 'leaving' | 'rehire' } {
  const covering = getAssignmentCoveringToday(person)
  if (!covering) {
    const nextStart = getNextStartDateForCurrentProject(person)
    if (nextStart) return { text: `即將於 ${formatRepublicDate(nextStart)} 復職`, type: 'rehire' }
    return { text: '已離職', type: 'resigned' }
  }
  const end = toDateOnly(covering.workEndDate)
  const today = TODAY_YYYYMMDD()
  if (!end) return { text: '在職', type: 'active' }
  if (end > today) return { text: `即將於 ${formatRepublicDate(covering.workEndDate)} 離職`, type: 'leaving' }
  if (end === today) return { text: '於今日離職', type: 'leaving' }
  return { text: '已離職', type: 'resigned' }
}

const assignedPersonnelSorted = computed(() => sortPersonnelByOccupation(assignedPersonnel.value))

const openAssignmentDetail = (person: SitePersonnel) => {
  const list = getAssignmentsForCurrentProject(person)
  if (!list.length) {
    assignmentDetailList.value = []
    assignmentDetailPersonRef.value = null
    showAssignmentDetailModal.value = false
    return
  }
  assignmentDetailPersonRef.value = person
  assignmentDetailTitle.value = `${person.fullName} 的任職紀錄`
  assignmentDetailList.value = list.map(a => ({
    id: a.id,
    workStartDate: a.workStartDate ?? null,
    workEndDate: a.workEndDate ?? null,
    isActive: a.isActive ?? false
  }))
  editingAssignmentId.value = null
  showAssignmentDetailModal.value = true
}

const closeAssignmentDetail = () => {
  showAssignmentDetailModal.value = false
  assignmentDetailTitle.value = ''
  assignmentDetailList.value = []
  assignmentDetailPersonRef.value = null
  editingAssignmentId.value = null
}

const startEditAssignment = (item: { id?: number; workStartDate?: string | null; workEndDate?: string | null }) => {
  if (item.id == null) return
  editingAssignmentId.value = item.id
  editingStartDate.value = item.workStartDate ? String(item.workStartDate).split('T')[0] : ''
  editingEndDate.value = item.workEndDate ? String(item.workEndDate).split('T')[0] : ''
}

const cancelEditAssignment = () => {
  editingAssignmentId.value = null
}

const removeAssignmentFromDetail = async (item: { id?: number }) => {
  if (item.id == null) return
  if (!window.confirm('確定要移除此筆任職紀錄嗎？此操作無法復原。')) return
  isLoading.value = true
  try {
    await sitePersonnelApi.deleteAssignment(item.id)
    await loadData()
    if (editingAssignmentId.value === item.id) editingAssignmentId.value = null
    const person = allPersonnel.value.find(p => p.memberId === assignmentDetailPersonRef.value?.memberId)
    if (person) {
      const list = getAssignmentsForCurrentProject(person)
      assignmentDetailList.value = list.map(a => ({
        id: a.id,
        workStartDate: a.workStartDate ?? null,
        workEndDate: a.workEndDate ?? null,
        isActive: a.isActive ?? false
      }))
    } else {
      assignmentDetailList.value = []
    }
  } catch (error: any) {
    console.error('移除任職紀錄失敗', error)
    const msg = error?.response?.data?.message ?? error?.message ?? '移除任職紀錄失敗'
    alert(msg)
  } finally {
    isLoading.value = false
  }
}

const saveAssignmentDates = async () => {
  if (editingAssignmentId.value == null) return
  const start = editingStartDate.value.trim() || null
  const end = editingEndDate.value.trim() || null
  if (start && end && start > end) {
    alert('到職日不可晚於離職日')
    return
  }
  // 同一專案多段任職：下一段到職日不可早於前一段離職日
  const list = assignmentDetailList.value.map((a) => {
    if (a.id === editingAssignmentId.value) {
      return { start: start || null, end: end === '' || end === null ? null : end }
    }
    const s = a.workStartDate ? String(a.workStartDate).split('T')[0] : null
    const e = a.workEndDate ? String(a.workEndDate).split('T')[0] : null
    return { start: s, end: e }
  })
  const sorted = list.filter((p) => p.start).sort((x, y) => (x.start!.localeCompare(y.start!)))
  for (let i = 0; i < sorted.length - 1; i++) {
    const end1 = sorted[i].end
    const start2 = sorted[i + 1].start
    if (end1 == null) {
      alert('同一專案僅能有一筆在職中（離職日未填）的任職紀錄，請先填寫離職日')
      return
    }
    if (start2 != null && end1 > start2) {
      alert('下一組的到職日不可早於前一組的離職日')
      return
    }
  }
  isLoading.value = true
  try {
    await sitePersonnelApi.updateAssignment({
      assignmentId: editingAssignmentId.value,
      assignmentStartDate: start || undefined,
      assignmentEndDate: (end === '' || end === null) ? null : end
    })
    await loadData()
    const person = allPersonnel.value.find(p => p.memberId === assignmentDetailPersonRef.value?.memberId)
    if (person) {
      const list = getAssignmentsForCurrentProject(person)
      assignmentDetailList.value = list.map(a => ({
        id: a.id,
        workStartDate: a.workStartDate ?? null,
        workEndDate: a.workEndDate ?? null,
        isActive: a.isActive ?? false
      }))
    }
    editingAssignmentId.value = null
  } catch (error: any) {
    console.error('更新任職日期失敗', error)
    const msg = error?.response?.data?.message ?? error?.message ?? '更新任職日期失敗'
    alert(msg)
  } finally {
    isLoading.value = false
  }
}
const occupationOptions = computed<OccupationOption[]>(() =>
  getOccupationOptions(isContractor.value ? 'CONTRACTOR' : 'SUPERVISION')
)

// 卡片分類：以目前設定的職稱選項為準（監造/營造不同）
const personnelRoles = computed(() =>
  occupationOptions.value.map((opt) => ({
    key: opt.value,
    name: opt.label,
    icon: opt.icon,
    color: opt.color,
    description: ''
  }))
)

// 卡片分類模式已改為列表呈現，保留 personnelRoles 供其他邏輯使用

// 獲取當前用戶的公司 ID
const getCurrentCompanyId = (): string | null => {
  // 優先使用 authStore 中的 companyId
  if (authStore.user?.companyId) {
    return authStore.user.companyId
  }
  
  // 如果沒有，嘗試從 companyStore 獲取第一個公司
  if (companyStore.activeCompanies.length > 0) {
    return companyStore.activeCompanies[0].companyId
  }
  
  // 最後嘗試使用 workspace 的 companyId（作為備用）
  if (workspaceStore.currentWorkspace?.companyId) {
    return workspaceStore.currentWorkspace.companyId
  }
  
  return null
}

const canManageCompanyPersonnel = computed(() => {
  const companyId = getCurrentCompanyId()
  if (!companyId) return false
  const company = companyStore.getCompanyById(companyId)
  const role = (company as any)?.userRole
  return role === 'OWNER' || role === 'ADMIN'
})

// 方法
const loadData = async () => {
   // 只獲取本公司的人員
   const companyId = getCurrentCompanyId()
   if (!companyId) {
     console.warn('無法獲取公司 ID，無法載入人員')
     return
   }
   
   isLoading.value = true
   try {
     allPersonnel.value = await sitePersonnelApi.getList(companyId)
     personnelListKey.value += 1
   } catch (error) {
     console.error('載入人員失敗', error)
   } finally {
     isLoading.value = false
   }
}

const openAssignModal = async () => {
  selectedPersonnelIds.value = []
  assignSearchQuery.value = ''
  assignmentStartDate.value = new Date().toISOString().slice(0, 10)
  
  // 確保數據已載入
  if (allPersonnel.value.length === 0) {
    await loadData()
  }
  
  
  
  showAssignModal.value = true
}

const handleAssignSubmit = async () => {
  if (!currentProject.value) return
  if (selectedPersonnelIds.value.length === 0) {
    alert('請至少選擇一位人員')
    return
  }
  const startRaw = assignmentStartDate.value?.trim()
  if (!startRaw) {
    alert('請填寫到職日')
    return
  }
  const startDateOnly = toDateOnly(startRaw) || startRaw

  // 到職日不應晚於今天（合理判斷）
  const today = new Date().toISOString().slice(0, 10)
  if (startDateOnly > today) {
    alert('到職日不應晚於今天')
    return
  }

  // 曾在此專案離職者，新到職日應晚於其最後離職日
  for (const memberId of selectedPersonnelIds.value) {
    const person = allPersonnel.value.find((p) => p.memberId === memberId)
    if (!person) continue
    const lastEnd = getLastEndDateForCurrentProject(person)
    if (lastEnd && startDateOnly <= lastEnd) {
      alert(`${person.fullName} 曾在本專案任職至 ${lastEnd}，新到職日應晚於該日`)
      return
    }
  }

  isLoading.value = true
  try {
    await sitePersonnelApi.assignProject({
      memberIdList: selectedPersonnelIds.value,
      constructionId: currentProject.value.constructionId,
      assignmentStartDate: startRaw
    })
    showAssignModal.value = false
    await loadData()
  } catch (error) {
    console.error('指派失敗', error)
    alert('指派失敗')
  } finally {
    isLoading.value = false
  }
}

const openResignModal = (person: SitePersonnel) => {
  resignTargetPerson.value = person
  const covering = getAssignmentCoveringTodayWithId(person)
  resignTargetAssignmentId.value = covering?.id ?? null
  const today = new Date().toISOString().slice(0, 10)
  const existingEnd = toDateOnly(covering?.workEndDate)
  // 若已有未到期離職日，預設帶出該日；否則預設今天
  assignmentEndDate.value = existingEnd && existingEnd >= today ? existingEnd : today
  showResignModal.value = true
}

const handleResignSubmit = async () => {
  if (!resignTargetPerson.value || !currentProject.value) return
  const endRaw = assignmentEndDate.value?.trim()
  if (!endRaw) {
    alert('請填寫離職日')
    return
  }
  const endDateOnly = toDateOnly(endRaw) || endRaw

  // 離職日不可早於該員在此專案的到職日
  const activeStart = getActiveStartDateForCurrentProject(resignTargetPerson.value)
  if (activeStart && endDateOnly < activeStart) {
    alert(`離職日不可早於到職日（到職日：${activeStart}）`)
    return
  }

  isLoading.value = true
  try {
    // 以「涵蓋今日」的任職紀錄為準更新離職日（可覆蓋原本未到期的離職日）
    if (resignTargetAssignmentId.value != null) {
      await sitePersonnelApi.updateAssignment({
        assignmentId: resignTargetAssignmentId.value,
        assignmentEndDate: endRaw
      })
    } else {
      // fallback：若找不到 assignmentId，仍走舊 API
      await sitePersonnelApi.removeProject({
        memberIdList: [resignTargetPerson.value.memberId],
        constructionId: currentProject.value.constructionId,
        assignmentEndDate: endRaw
      })
    }
    showResignModal.value = false
    resignTargetPerson.value = null
    resignTargetAssignmentId.value = null
    await loadData()
  } catch (error) {
    console.error('移除指派失敗', error)
    alert('移除指派失敗')
  } finally {
    isLoading.value = false
  }
}

const openReinstateModal = (person: SitePersonnel) => {
  reinstateTargetPerson.value = person
  reinstateStartDate.value = new Date().toISOString().slice(0, 10)
  showReinstateModal.value = true
}

const handleReinstateSubmit = async () => {
  if (!reinstateTargetPerson.value || !currentProject.value) return
  const startRaw = reinstateStartDate.value?.trim()
  if (!startRaw) {
    alert('請填寫到職日')
    return
  }
  const startDateOnly = toDateOnly(startRaw) || startRaw

  // 復職到職日應晚於該員在此專案最後離職日
  const lastEnd = getLastEndDateForCurrentProject(reinstateTargetPerson.value)
  if (lastEnd && startDateOnly <= lastEnd) {
    alert(`復職到職日應晚於上次離職日（${lastEnd}）`)
    return
  }

  isLoading.value = true
  try {
    await sitePersonnelApi.assignProject({
      memberIdList: [reinstateTargetPerson.value.memberId],
      constructionId: currentProject.value.constructionId,
      assignmentStartDate: startRaw
    })
    showReinstateModal.value = false
    reinstateTargetPerson.value = null
    await loadData()
  } catch (error) {
    console.error('復職失敗', error)
    alert('復職失敗')
  } finally {
    isLoading.value = false
  }
}

const deletePersonnelAssignment = async (person: SitePersonnel) => {
  if (!currentProject.value) return
  const ok = window.confirm(`確定要刪除「${person.fullName}」在本專案的所有任職紀錄嗎？\n此動作不會刪除公司人員，只會移除本專案的指派紀錄。`)
  if (!ok) return

  isLoading.value = true
  try {
    await sitePersonnelApi.removeProject({
      memberIdList: [person.memberId],
      constructionId: currentProject.value.constructionId,
      hardDeleteAssignment: true
    })
    await loadData()
  } catch (error) {
    console.error('刪除任職紀錄失敗', error)
    alert('刪除任職紀錄失敗')
  } finally {
    isLoading.value = false
  }
}

const viewLicense = async (memberId: string) => {
  if (!memberId) return
  isLoading.value = true
  try {
    const blob = await sitePersonnelApi.downloadPhoto(memberId)
    if (blob && blob.size > 0) {
      const url = window.URL.createObjectURL(blob)
      window.open(url, '_blank')
    } else {
      alert('無檔案或下載失敗')
    }
  } catch (error) {
    console.error('下載證照失敗', error)
    alert('下載證照失敗或無此檔案')
  } finally {
    isLoading.value = false
  }
}

// 輔助函數（依職稱 value 分組；兼容舊值）
const getPersonnelCountByRole = (role: string): number => {
  return assignedPersonnel.value.filter((p) => normalizeOccupationValue(p.occupation || p.position) === role).length
}

const getAssignedPersonnelByRole = (role: string) => {
  return assignedPersonnel.value.filter((p) => normalizeOccupationValue(p.occupation || p.position) === role)
}

const getRoleText = (occupation: string, occupationCategory?: string): string => {
  return getOccupationDisplayLabel(normalizeOccupationValue(occupation), occupationCategory, occupationOptions.value)
}

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'Y': '在職',
    'N': '離職',
    'ARCHIVED': '封存'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status: string, small: boolean = false): string => {
  const baseClass = small 
    ? 'badge border px-2 py-1 rounded-pill fs-12px d-inline-flex align-items-center' 
    : 'badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'
  
  const colorMap: { [key: string]: string } = {
    'Y': 'border-success text-success',
    'N': 'border-danger text-danger',
    'ARCHIVED': 'border-secondary text-secondary'
  }
  
  return `${baseClass} ${colorMap[status] || 'border-secondary text-secondary'}`
}

/** 本專案任職狀態的 badge class（在職＝綠，已離職＝灰，即將離職＝黃） */
const getProjectAssignmentStatusBadgeClass = (person: SitePersonnel): string => {
  const baseClass = 'badge border px-2 py-1 rounded-pill fs-12px d-inline-flex align-items-center'
  const status = getProjectAssignmentStatus(person)
  if (status.type === 'active') return `${baseClass} border-success text-success`
  if (status.type === 'leaving') return `${baseClass} border-warning text-warning`
  if (status.type === 'rehire') return `${baseClass} border-info text-info`
  return `${baseClass} border-secondary text-secondary`
}

const getCurrentProjectBudget = (): number => {
  return currentProject.value?.currentContractAmount || currentProject.value?.constructionBudget || 0
}

const getCurrentProjectLevel = (): string => {
  const projectBudget = getCurrentProjectBudget()
  return getLevelByBudget(projectBudget)
}

/** 依契約金額回傳級距說明（供各版本分別計算） */
const getLevelByBudget = (amount: number): string => {
  if (amount < 5000000) return 'A5 (500萬以下)'
  if (amount < 10000000) return 'A4 (500萬～1000萬)'
  if (amount < 30000000) return 'A3 (1000萬～3000萬)'
  if (amount < 100000000) return 'A2 (3000萬～1億元)'
  return 'A1 (1億元以上)'
}

/** 落在該級距的版本名稱（供列上顯示標籤） */
const getVersionNamesInLevel = (level: string): string[] => {
  return versionAmounts.value
    .filter((v) => getLevelByBudget(v.contractAmount).startsWith(level))
    .map((v) => v.versionName)
}

/** 任一版本的契約金額落在該級距時高亮該列 */
const isLevelActive = (level: string): boolean => {
  if (versionAmounts.value.length === 0) return getCurrentProjectLevel().startsWith(level)
  return versionAmounts.value.some((v) => getLevelByBudget(v.contractAmount).startsWith(level))
}

const levelRowsLeft = [
  { key: 'A5', range: '500萬以下', text: '建議配置 1 名品管人員、1 名乙級勞安人員' },
  { key: 'A4', range: '500萬～1000萬', text: '建議配置 1 名品管人員、1 名乙級勞安人員' },
  { key: 'A3', range: '1000萬～3000萬', text: '建議配置 1 名品管人員、1 名甲級勞安人員' }
]

const levelRowsRight = [
  { key: 'A2', range: '3000萬～1億元', text: '建議配置 2 名品管人員、1 名甲級與 1 名乙級勞安人員' },
  { key: 'A1', range: '1億元以上', text: '建議配置 3 名以上品管人員、至少 2 名甲級勞安人員' }
]

/** 合併為單一列表，供與勞安配置標準相同之網格顯示 */
const levelRowsAll = [...levelRowsLeft, ...levelRowsRight]

/** 監造：每個版本固定 負責人、工地負責人、專任工程人員、品管、勞安 各 1 */
const SUPERVISORY_FIXED_REQUIRED = {
  OWNER: 1,
  CONSTRUCTION_MANAGER: 1,
  TECHNICIAN: 1,
  QUALITY: 1,
  LABOUR_SAFETY: 1
} as const

/** 各版本人員配置狀況（共用 composable，供右側框與其他頁面使用） */
const versionPersonnelConfig = computed(() => {
  const cid = currentProject.value?.constructionId
  if (!cid || !versionAmounts.value.length) return { dataComplete: false as const, versions: [] }
  const assigned = assignedPersonnel.value as PersonWithAssignments[]
  return computeVersionPersonnelConfig({
    versionAmounts: versionAmounts.value,
    designChangeList: designChangeList.value,
    assignedPersonnel: assigned,
    constructionId: cid,
    projectStartDate: currentProject.value?.signDate ?? null,
    projectEndDate: currentProject.value?.constructionEndDate ?? null,
    ...(isContractor.value ? {} : { fixedRequired: SUPERVISORY_FIXED_REQUIRED })
  })
})

/** 右側框目前選中版本之結果（索引自動箝在有效範圍） */
const selectedVersionResult = computed(() => {
  const list = versionPersonnelConfig.value.versions
  if (!list.length) return null
  const idx = Math.min(selectedVersionConfigIndex.value, list.length - 1)
  return list[idx] ?? null
})

async function fetchDesignChangeListForDisplay() {
  const cid = currentProject.value?.constructionId?.trim()
  if (!cid) {
    designChangeList.value = []
    versionAmounts.value = []
    return
  }
  try {
    // 建造端用 CONTRACTOR、監造端用 SUPERVISORY，與變更設計/契約金額視角一致
    const sourceType = isContractor.value ? 'CONTRACTOR' : 'SUPERVISORY'
    designChangeList.value = await getDesignChangeList(cid, sourceType)
    const amounts = await getContractAmountsByVersion(cid, sourceType)
    if (amounts.length > 0) {
      versionAmounts.value = amounts
    } else {
      // 後端無多版本或 API 未回傳時，用目前專案金額當單一版本
      const budget = currentProject.value?.currentContractAmount ?? currentProject.value?.constructionBudget ?? 0
      versionAmounts.value = [{ designChangeId: null, versionName: '原契約', contractAmount: budget }]
    }
  } catch {
    designChangeList.value = []
    const budget = currentProject.value?.currentContractAmount ?? currentProject.value?.constructionBudget ?? 0
    versionAmounts.value = [{ designChangeId: null, versionName: '原契約', contractAmount: budget }]
  }
}

onMounted(async () => {
  // 確保工作空間和專案已初始化
  if (!workspaceStore.currentWorkspace) {
    await workspaceStore.initWorkspaces()
  }
  if (!projectStore.currentProject) {
     await projectStore.initProjects()
  }
  
  // 確保公司數據已初始化
  if (companyStore.activeCompanies.length === 0) {
    await companyStore.initCompanies()
  }
  
  await loadData()
  await fetchDesignChangeListForDisplay()
})

watch(
  () => currentProject.value?.constructionId,
  (cid) => {
    if (cid) fetchDesignChangeListForDisplay()
    else designChangeList.value = []
  }
)

watch(
  () => versionPersonnelConfig.value.versions.length,
  (len) => {
    if (selectedVersionConfigIndex.value >= len && len > 0) selectedVersionConfigIndex.value = 0
  }
)
</script>

<style scoped>
.site-personnel-project :deep(.card) {
  background: #0f172a;
  border: 1px solid rgba(148, 163, 184, 0.25);
}

.site-personnel-project :deep(.card-header) {
  background: rgba(15, 23, 42, 0.85);
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  color: #e2e8f0;
}

.site-personnel-project :deep(.card-body) {
  background: #0f172a;
  color: #e2e8f0;
}

.site-personnel-stats .text-muted {
  color: rgba(226, 232, 240, 0.7) !important;
}

.site-personnel-dark-table {
  color: #e2e8f0;
}

.site-personnel-dark-table thead th {
  color: rgba(226, 232, 240, 0.85);
  background: rgba(15, 23, 42, 0.85);
  border-color: rgba(148, 163, 184, 0.25);
}

.site-personnel-dark-table tbody td {
  border-color: rgba(148, 163, 184, 0.18);
  background: transparent;
}

.site-personnel-dark-table.table-hover tbody tr:hover > * {
  background: rgba(30, 41, 59, 0.45);
  color: #e2e8f0;
}

.site-personnel-dark-table :deep(.badge.border) {
  background: rgba(15, 23, 42, 0.2);
}

.person-card {
  transition: all 0.2s ease;
  border: 1px solid rgba(148, 163, 184, 0.25);
  background: #0f172a;
  color: #e2e8f0;
}

/* 列表化後不再需要 site-role-chip */

.person-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
  border-color: rgba(148, 163, 184, 0.45);
}

.person-name {
  font-weight: 600;
  color: #f8fafc;
  font-size: 0.95rem;
}

.person-actions .btn {
  padding: 0.25rem 0.5rem;
}

.empty-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 0.9rem;
  box-shadow: 0 2px 8px rgba(var(--bs-primary-rgb), 0.3);
}

.empty-state-small {
  height: 100%;
  padding: 1rem;
  border: 1px dashed rgba(148, 163, 184, 0.35);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.35);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
}

.empty-state-small:hover {
  border-color: rgba(148, 163, 184, 0.55);
  background: rgba(15, 23, 42, 0.55);
  transform: translateY(-2px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

/* 人員配置建議：與營造業勞安人員配置標準相同之網格 */
.o4-staffing-hint {
  --staffing-bg: #1e293b;
  --staffing-border: #334155;
  --staffing-text: #e2e8f0;
  width: fit-content;
  min-width: 560px;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  background: var(--staffing-bg);
  border: 1px solid var(--staffing-border);
}
.o4-staffing-toggle {
  cursor: pointer;
  color: rgba(226, 232, 240, 0.85);
}
.o4-staffing-toggle:hover {
  color: #e2e8f0;
}
.o4-staffing-grid {
  display: grid;
  gap: 0.25rem;
}
.o4-staffing-row {
  display: grid;
  grid-template-columns: 150px 1fr auto;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.375rem;
}
.o4-staffing-row.o4-staffing-row--no-version {
  grid-template-columns: 150px 1fr;
}
.o4-staffing-row.active {
  background: rgba(255, 193, 7, 0.1);
  outline: 1px solid rgba(255, 193, 7, 0.25);
}
.o4-staffing-range {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--staffing-text, #e2e8f0);
  white-space: nowrap;
}
.o4-staffing-req {
  font-size: 0.78rem;
  color: rgba(226, 232, 240, 0.8);
}
.o4-staffing-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
  justify-content: flex-end;
}
.o4-staffing-badge {
  font-size: 0.65rem;
  padding: 0.25em 0.5em;
}

.version-config-box .nav-tabs {
  border-bottom-color: rgba(148, 163, 184, 0.25);
}
.version-config-box .nav-tabs .nav-link {
  color: rgba(226, 232, 240, 0.8);
  border-color: transparent;
  font-size: 0.8rem;
  padding: 0.35rem 0.6rem;
}
.version-config-box .nav-tabs .nav-link:hover {
  color: #e2e8f0;
  border-color: transparent;
}
.version-config-box .nav-tabs .nav-link.active {
  color: var(--bs-info);
  background: transparent;
  border-color: rgba(148, 163, 184, 0.25);
  border-bottom-color: var(--staffing-bg);
}

.version-config-metrics-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}
.version-config-metric {
  display: inline-flex;
  align-items: center;
  padding: 0.25rem 0.5rem;
  border: 1px solid rgba(148, 163, 184, 0.18);
  border-radius: 0.5rem;
  background: rgba(15, 23, 42, 0.25);
  white-space: nowrap;
}
.version-config-metric--ok {
  border-color: rgba(25, 135, 84, 0.45);
  background: rgba(25, 135, 84, 0.12);
}
.version-config-metric--missing {
  border-color: rgba(220, 53, 69, 0.55);
  background: rgba(220, 53, 69, 0.12);
}
.version-config-role {
  font-weight: 700;
}
.version-config-number {
  font-weight: 700;
  color: #e2e8f0;
}

.clickable-empty {
  cursor: pointer;
  transition: all 0.2s ease;
}

.clickable-empty:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.6) !important;
  background: rgba(var(--bs-theme-rgb), 0.08) !important;
  transform: translateY(-3px) !important;
  box-shadow: 0 6px 20px rgba(var(--bs-theme-rgb), 0.2) !important;
}

.clickable-empty:hover .empty-icon-small {
  background: linear-gradient(135deg, var(--bs-theme) 0%, rgba(var(--bs-theme-rgb), 0.8) 100%) !important;
  box-shadow: 0 4px 12px rgba(var(--bs-theme-rgb), 0.4) !important;
}

.widget-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.fs-10px {
  font-size: 10px !important;
}

.fs-12px {
  font-size: 12px !important;
}

.fs-14px {
  font-size: 14px !important;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .person-card {
    margin-bottom: 1rem;
  }
  
  .widget-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
}
</style>
