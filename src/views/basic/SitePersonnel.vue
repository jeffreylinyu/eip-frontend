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


        <!-- 人員配置建議 -->
    <div class="row mb-4">
      <div class="col-12">
        <div class="alert alert-info" role="alert">
          <div class="d-flex align-items-center mb-2">
            <i class="fa fa-info-circle me-2"></i>
            <strong>人員配置建議</strong>
            <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
              目前專案金額：{{ formatAmount(getCurrentProjectBudget()) }}
            </span>
          </div>
          <div class="row">
            <div class="col-md-6">
              <ul class="mb-0">
                <li :class="{ 'current-level': isCurrentLevel('A5') }">
                  <strong>500萬以下：</strong>建議配置 1 名品管人員、1 名乙級勞安人員
                  <span v-if="isCurrentLevel('A5')" class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                    <i class="fa fa-check me-1"></i>目前專案
                  </span>
                </li>
                <li :class="{ 'current-level': isCurrentLevel('A4') }">
                  <strong>500萬～1000萬：</strong>建議配置 1 名品管人員、1 名乙級勞安人員
                  <span v-if="isCurrentLevel('A4')" class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                    <i class="fa fa-check me-1"></i>目前專案
                  </span>
                </li>
                <li :class="{ 'current-level': isCurrentLevel('A3') }">
                  <strong>1000萬～3000萬：</strong>建議配置 1 名品管人員、1 名甲級勞安人員
                  <span v-if="isCurrentLevel('A3')" class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                    <i class="fa fa-check me-1"></i>目前專案
                  </span>
                </li>
              </ul>
            </div>
            <div class="col-md-6">
              <ul class="mb-0">
                <li :class="{ 'current-level': isCurrentLevel('A2') }">
                  <strong>3000萬～1億元：</strong>建議配置 2 名品管人員、1 名甲級與 1 名乙級勞安人員
                  <span v-if="isCurrentLevel('A2')" class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                    <i class="fa fa-check me-1"></i>目前專案
                  </span>
                </li>
                <li :class="{ 'current-level': isCurrentLevel('A1') }">
                  <strong>1億元以上：</strong>建議配置 3 名以上品管人員、至少 2 名甲級勞安人員
                  <span v-if="isCurrentLevel('A1')" class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                    <i class="fa fa-check me-1"></i>目前專案
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 缺少人員提醒 -->
    <div v-if="getMissingPersonnel().length > 0" class="row mb-4">
      <div class="col-12">
        <div class="alert alert-warning" role="alert">
          <div class="d-flex align-items-center mb-2">
            <i class="fa fa-exclamation-triangle me-2"></i>
            <strong>缺少必要人員</strong>
          </div>
          <p class="mb-2">根據{{ getCurrentProjectLevel() }}的配置建議，目前缺少以下人員：</p>
          <ul class="mb-0">
            <li v-for="missing in getMissingPersonnel()" :key="missing.role">
              <strong>{{ missing.roleName }}：</strong>
              需要 {{ missing.required }} 名，目前 {{ missing.current }} 名
              <span class="badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-2">
                缺少 {{ missing.missing }} 名
              </span>
              </li>
            </ul>
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
              <button
                type="button"
                class="btn btn-theme"
                @click="goToCompanyPersonnelManagement"
              >
                <i class="fa fa-users me-2"></i>管理人員
              </button>
            </div>
          </card-header>
          <card-body>
            <!-- 人員統計 -->
                    <div class="row mb-3">
              <div class="col-12">
                <div class="d-flex align-items-center justify-content-between">
                  <div class="d-flex align-items-center gap-4">
                    <span class="text-muted">總計：</span>
                    <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ assignedPersonnelCount }} 人</span>
                    <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('QUALITY_CONTROL') }} 品管</span>
                    <span class="badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('SAFETY_OFFICER') }} 勞安</span>
                    <span class="badge border border-info text-info px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByRole('PROFESSIONAL_ENGINEER') }} 技師</span>
                    <span class="text-muted ms-3">狀態：</span>
                    <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByStatus('ACTIVE') }} 在職</span>
                    <span class="badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ getPersonnelCountByStatus('ON_LEAVE') }} 休假</span>
                          </div>
                  <small class="text-muted">顯示 {{ assignedPersonnelCount }} / {{ availablePersonnelCount }} 人</small>
                          </div>
                        </div>
                      </div>

            <!-- 空狀態 -->
            <div v-if="assignedPersonnelCount === 0" class="text-center py-5">
              <i class="fa fa-users text-muted fa-3x mb-3"></i>
              <h5 class="text-muted">尚未指派任何人員</h5>
              <p class="text-muted">請點擊「指派人員」按鈕從公司人員中選擇</p>
              <button 
                type="button" 
                class="btn btn-outline-theme"
                @click="goToCompanyPersonnelManagement"
              >
                <i class="fa fa-users me-2"></i>管理人員
              </button>
              </div>

            <!-- 已指派人員列表 -->
            <div v-else>
              <div v-for="role in personnelRoles" :key="role.key" class="mb-4">
                    <div class="row mb-3">
                  <div class="col-12">
                        <div class="d-flex align-items-center">
                      <div class="widget-icon rounded me-3" :class="`bg-${role.color}`">
                        <i class="fa" :class="role.icon" style="color: white"></i>
                          </div>
                          <div>
                        <h6 class="mb-0">{{ role.name }}</h6>
                        <p class="text-muted mb-0 small">{{ role.description }}</p>
                          </div>
                      <div class="ms-auto">
                        <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">
                          {{ getAssignedPersonnelByRole(role.key).length }} 人
                        </span>
                        </div>
                      </div>
                    </div>
                </div>

                    <div class="row">
                      <div
                    v-for="person in getAssignedPersonnelByRole(role.key)" 
                    :key="person.personnelId"
                    class="col-lg-3 col-md-4 col-sm-6 mb-3"
                  >
                    <card class="person-card h-100">
                      <card-body class="p-3">
                        <div class="person-info">
                          <!-- 第一行：姓名和狀態 -->
                          <div class="d-flex align-items-center justify-content-between mb-1">
                            <h6 class="person-name mb-0">{{ person.name }}</h6>
                            <span :class="getStatusBadgeClass(person.status)">
                              {{ getStatusText(person.status) }}
                            </span>
                              </div>
                          
                          <!-- 第二行：證照號碼 -->
                          <div class="mb-1">
                            <span v-if="person.licenseNumber" class="text-muted small">
                              <i class="fa fa-certificate me-1"></i>{{ person.licenseNumber }}
                            </span>
    </div>

                          <!-- 第三行：身分證號碼 -->
                          <div class="mb-1">
                            <span class="text-muted small">
                              <i class="fa fa-id-card me-1"></i>{{ person.idNumber }}
                            </span>
    </div>

                          <!-- 第四行：電話和操作按鈕 -->
                          <div class="d-flex align-items-center justify-content-between">
                            <span v-if="person.phone" class="text-muted small">
                              <i class="fa fa-phone me-1"></i>{{ person.phone }}
                            </span>
                            <div class="person-actions d-flex gap-1">
            <button
                                v-if="person.certificatePdf"
              type="button"
                                class="btn btn-sm btn-outline-primary"
                                @click="viewCertificate(person)"
                                title="查看證照"
                              >
                                <i class="fa fa-file-pdf"></i>
            </button>
            <button
              type="button"
                                class="btn btn-sm btn-outline-danger"
                                @click="removePersonnel(person)"
                                title="移除指派"
            >
                                <i class="fa fa-times"></i>
            </button>
          </div>
        </div>
                        </div>
                      </card-body>
                    </card>
      </div>
    </div>

                <!-- 職務空狀態 -->
                <div 
                  v-if="getAssignedPersonnelByRole(role.key).length === 0" 
                  class="col-lg-3 col-md-4 col-sm-6 mb-3"
                >
                  <div class="empty-state-small clickable-empty" @click="goToCompanyPersonnelManagement">
                    <div class="empty-icon-small mb-2">
                      <i class="fa fa-users"></i>
          </div>
                    <h6 class="text-muted mb-1 fs-14px">暫無{{ role.name }}</h6>
                    <p class="text-muted small mb-0 fs-10px text-center">點擊指派{{ role.name }}來管理此職務</p>
          </div>
          </div>
        </div>
        </div>
          </card-body>
        </card>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { formatAmount } from '@/utils/format'

const router = useRouter()

// 職務定義
const personnelRoles = [
  {
    key: 'QUALITY_CONTROL',
    name: '品管人員',
    icon: 'fa-medal',
    color: 'warning',
    description: '負責工程品質管控與檢測作業'
  },
  {
    key: 'SAFETY_OFFICER', 
    name: '勞安人員',
    icon: 'fa-shield-alt',
    color: 'danger',
    description: '負責工地安全檢查與事故預防'
  },
  {
    key: 'PROFESSIONAL_ENGINEER',
    name: '專業技師',
    icon: 'fa-user-tie', 
    color: 'info',
    description: '負責專業技術指導與監督'
  }
]

// 模擬數據 - 公司所有人員
const companyPersonnel = ref([
  {
    personnelId: '1',
    name: '張品質',
    email: 'quality@example.com',
    phone: '0912-345-678',
    idNumber: 'A123456789',
    position: 'QUALITY_CONTROL',
    licenseNumber: 'QC-2024-001',
    status: 'ACTIVE',
    photo: './assets/img/user/user-6.jpg',
    certificatePdf: 'https://example.com/certificates/qc-2024-001.pdf'
  },
  {
    personnelId: '2',
    name: '李安全',
    email: 'safety@example.com',
    phone: '0923-456-789',
    idNumber: 'B987654321',
    position: 'SAFETY_OFFICER',
    licenseNumber: 'SF-2024-002',
    status: 'ACTIVE',
    photo: './assets/img/user/profile.jpg',
    certificatePdf: 'https://example.com/certificates/sf-2024-002.pdf'
  },
  {
    personnelId: '3',
    name: '王技師',
    email: 'engineer@example.com',
    phone: '0934-567-890',
    idNumber: 'C456789123',
    position: 'PROFESSIONAL_ENGINEER',
    licenseNumber: 'ENG-2024-003',
    status: 'ACTIVE'
  },
  {
    personnelId: '4',
    name: '陳品管',
    email: 'qc.chen@example.com',
    phone: '0945-678-901',
    idNumber: 'D111222333',
    position: 'QUALITY_CONTROL',
    licenseNumber: 'QC-2024-004',
    status: 'ON_LEAVE'
  },
  {
    personnelId: '5',
    name: '劉安全',
    email: 'safety.liu@example.com',
    phone: '0956-789-012',
    idNumber: 'E444555666',
    position: 'SAFETY_OFFICER',
    licenseNumber: 'SF-2024-005',
    status: 'ACTIVE'
  }
])

// 已指派到專案的人員
const assignedPersonnel = ref([
  companyPersonnel.value[0], // 張品質
  companyPersonnel.value[1]  // 李安全
])

// 計算屬性
const assignedPersonnelCount = computed(() => assignedPersonnel.value.length)
const availablePersonnelCount = computed(() => companyPersonnel.value.filter(p => p.status === 'ACTIVE').length)

// 方法
const getPersonnelCountByRole = (role: string): number => {
  return assignedPersonnel.value.filter(p => p.position === role).length
}

const getPersonnelCountByStatus = (status: string): number => {
  return assignedPersonnel.value.filter(p => p.status === status).length
}

const getAssignedPersonnelByRole = (role: string) => {
  return assignedPersonnel.value.filter(p => p.position === role)
}

const getRoleText = (position: string): string => {
  const roleMap: { [key: string]: string } = {
    'QUALITY_CONTROL': '品管人員',
    'SAFETY_OFFICER': '勞安人員',
    'PROFESSIONAL_ENGINEER': '專業技師'
  }
  return roleMap[position] || position
}

const getStatusText = (status: string): string => {
  const statusMap: { [key: string]: string } = {
    'ACTIVE': '在職',
    'ON_LEAVE': '休假',
    'TERMINATED': '離職'
  }
  return statusMap[status] || status
}

const getStatusBadgeClass = (status: string, small: boolean = false): string => {
  const baseClass = small 
    ? 'badge border px-1 py-0 fs-10px' 
    : 'badge border px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'
  
  const colorMap: { [key: string]: string } = {
    'ACTIVE': 'border-success text-success',
    'ON_LEAVE': 'border-warning text-warning',
    'TERMINATED': 'border-danger text-danger'
  }
  
  return `${baseClass} ${colorMap[status] || 'border-secondary text-secondary'}`
}


const goToCompanyPersonnelManagement = () => {
  // 跳轉到獨立的工地人員管理頁面
  // 使用當前工作空間的公司信息，不通過URL傳遞敏感數據
  router.push('/company/site-personnel')
}

const removePersonnel = (person: any) => {
  const index = assignedPersonnel.value.findIndex(p => p.personnelId === person.personnelId)
  if (index > -1) {
    assignedPersonnel.value.splice(index, 1)
  }
}

const viewCertificate = (person: any) => {
  if (person.certificatePdf) {
    // 在新視窗中打開 PDF
    window.open(person.certificatePdf, '_blank')
  }
}

const getCurrentProjectBudget = (): number => {
  // 模擬當前專案的預算，實際應該從 workspaceStore 或 projectStore 獲取
  return 30000000 // 3000萬，模擬數據
}

const getCurrentProjectLevel = (): string => {
  const projectBudget = getCurrentProjectBudget()
  
  if (projectBudget < 5000000) {
    return 'A5 (500萬以下)'
  } else if (projectBudget < 10000000) {
    return 'A4 (500萬～1000萬)'
  } else if (projectBudget < 30000000) {
    return 'A3 (1000萬～3000萬)'
  } else if (projectBudget < 100000000) {
    return 'A2 (3000萬～1億元)'
  } else {
    return 'A1 (1億元以上)'
  }
}

const isCurrentLevel = (level: string): boolean => {
  const currentLevel = getCurrentProjectLevel()
  return currentLevel.startsWith(level)
}

const getMissingPersonnel = () => {
  const projectBudget = getCurrentProjectBudget()
  const missing = []
  
  // 根據預算判斷所需人員配置
  let requiredPersonnel: { [key: string]: number } = {}
  
  if (projectBudget < 5000000) {
    // A5: 500萬以下
    requiredPersonnel = {
      'QUALITY_CONTROL': 1,
      'SAFETY_OFFICER': 1,
      'PROFESSIONAL_ENGINEER': 0
    }
  } else if (projectBudget < 10000000) {
    // A4: 500萬～1000萬
    requiredPersonnel = {
      'QUALITY_CONTROL': 1,
      'SAFETY_OFFICER': 1,
      'PROFESSIONAL_ENGINEER': 0
    }
  } else if (projectBudget < 30000000) {
    // A3: 1000萬～3000萬
    requiredPersonnel = {
      'QUALITY_CONTROL': 1,
      'SAFETY_OFFICER': 1,
      'PROFESSIONAL_ENGINEER': 1
    }
  } else if (projectBudget < 100000000) {
    // A2: 3000萬～1億元
    requiredPersonnel = {
      'QUALITY_CONTROL': 2,
      'SAFETY_OFFICER': 2,
      'PROFESSIONAL_ENGINEER': 1
    }
  } else {
    // A1: 1億元以上
    requiredPersonnel = {
      'QUALITY_CONTROL': 3,
      'SAFETY_OFFICER': 2,
      'PROFESSIONAL_ENGINEER': 2
    }
  }
  
  // 檢查每個職務的人員配置
  personnelRoles.forEach(role => {
    const required = requiredPersonnel[role.key] || 0
    const current = getAssignedPersonnelByRole(role.key).length
    const missingCount = Math.max(0, required - current)
    
    if (missingCount > 0) {
      missing.push({
        role: role.key,
        roleName: role.name,
        required,
        current,
        missing: missingCount
      })
    }
  })
  
  return missing
}
</script>

<style scoped>
.person-card {
  transition: all 0.2s ease;
  border: 2px solid transparent;
}

.person-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
}


.person-name {
  font-weight: 600;
  color: var(--bs-theme);
  font-size: 0.95rem;
}

.person-actions .btn {
  padding: 0.25rem 0.5rem;
}

/* 空狀態樣式 */
.empty-state {
  text-align: center;
  padding: 3rem 2rem;
  border: 2px dashed rgba(var(--bs-theme-rgb), 0.2);
  border-radius: 12px;
  background: rgba(var(--bs-theme-rgb), 0.02);
  transition: all 0.2s ease;
}

.empty-state:hover {
  background: rgba(var(--bs-theme-rgb), 0.05);
  border-color: rgba(var(--bs-theme-rgb), 0.3);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.empty-icon {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  background: linear-gradient(135deg, var(--bs-primary) 0%, rgba(var(--bs-primary-rgb), 0.8) 100%);
  color: white;
  font-size: 1.5rem;
  box-shadow: 0 4px 16px rgba(var(--bs-primary-rgb), 0.3);
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
  border: 2px dashed rgba(var(--bs-theme-rgb), 0.3);
  border-radius: 8px;
  background: rgba(var(--bs-theme-rgb), 0.02);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  transition: all 0.2s ease;
}

.empty-state-small:hover {
  border-color: rgba(var(--bs-theme-rgb), 0.5);
  background: rgba(var(--bs-theme-rgb), 0.05);
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(var(--bs-theme-rgb), 0.15);
}

.current-level {
  background-color: rgba(var(--bs-success-rgb), 0.1) !important;
  border-left: 4px solid var(--bs-success) !important;
  padding-left: 0.5rem !important;
  margin-left: -0.5rem !important;
  border-radius: 0 4px 4px 0;
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
  
  .d-flex.gap-4 {
    flex-direction: column;
    gap: 1rem !important;
  }
  

  .widget-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }
}
</style>
