<template>
  <div>
    <!-- 頁面標題 -->
    <div class="d-flex align-items-center mb-3">
      <div>
        <ol class="breadcrumb">
          <li class="breadcrumb-item">
            <a href="javascript:;">基本資料管理</a>
          </li>
          <li class="breadcrumb-item active">工地人員管理</li>
        </ol>
        <h1 class="page-header mb-0">工地人員管理</h1>
      </div>
    </div>

        <!-- 人員配置建議 -->
        <div class="row mt-4">
      <div class="col-lg-12">
        <div class="alert alert-info" role="alert">
          <div class="d-flex align-items-center mb-2">
            <i class="fa fa-info-circle me-2"></i>
            <strong>人員配置建議</strong>
          </div>
          <div class="row">
            <div class="col-md-6">
              <ul class="mb-0">
                <li>
                  <strong>500萬以下：</strong>建議配置 1 名品管人員、1
                  名乙級勞安人員
                </li>
                <li>
                  <strong>500萬～1000萬：</strong>建議配置 1 名品管人員、1
                  名乙級勞安人員
                </li>
                <li>
                  <strong>1000萬～3000萬：</strong>建議配置 1 名品管人員、1
                  名甲級勞安人員
                </li>
              </ul>
            </div>
            <div class="col-md-6">
              <ul class="mb-0">
                <li>
                  <strong>3000萬～1億元：</strong>建議配置 2 名品管人員、1
                  名甲級與 1 名乙級勞安人員
                </li>
                <li>
                  <strong>1億元以上：</strong>建議配置 3 名以上品管人員、至少 2
                  名甲級勞安人員
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Tab切換區域 -->
    <div class="row gx-4">
      <div class="col-lg-12">
        <card>
          <card-header
            class="d-flex justify-content-between align-items-center"
          >
            <ul class="nav nav-tabs card-header-tabs" role="tablist">
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'contractor' }"
                  id="contractor-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#contractor"
                  type="button"
                  role="tab"
                  aria-controls="contractor"
                  aria-selected="true"
                >
                  <i class="fa fa-hard-hat me-2"></i>
                  營造廠商人員
                  <span class="badge bg-theme text-white ms-1">{{
                    contractorPersonnelCount
                  }}</span>
                </button>
              </li>
              <li class="nav-item" role="presentation">
                <button
                  class="nav-link"
                  :class="{ active: activeTab === 'supervision' }"
                  id="supervision-tab"
                  data-bs-toggle="tab"
                  data-bs-target="#supervision"
                  type="button"
                  role="tab"
                  aria-controls="supervision"
                  aria-selected="false"
                >
                  <i class="fa fa-eye me-2"></i>
                  監造單位人員
                  <span class="badge bg-theme text-white ms-1">{{
                    supervisionPersonnelCount
                  }}</span>
                </button>
              </li>
            </ul>
            <div class="ms-auto">
              <button
                type="button"
                class="btn btn-theme btn-sm"
                @click="openAddModal(activeTab)"
              >
                <i class="fa fa-plus me-2"></i>新增人員
              </button>
            </div>
          </card-header>
          <card-body>
            <div class="tab-content">
              <!-- 營造廠商人員Tab -->
              <div
                class="tab-pane fade show active"
                id="contractor"
                role="tabpanel"
                aria-labelledby="contractor-tab"
              >
                <div class="tab-pane-content">
                  <div v-for="role in roles" :key="role.key" class="mb-4">
                    <div class="row mb-3">
                      <div class="col-lg-12">
                        <div class="d-flex align-items-center">
                          <div
                            class="widget-icon rounded me-3"
                            :class="`bg-${role.color}`"
                          >
                            <i
                              class="fa"
                              :class="role.icon"
                              style="color: white"
                            ></i>
                          </div>
                          <div>
                            <h5 class="mb-0">{{ role.name }}</h5>
                            <p class="text-muted mb-0">
                              {{ role.description }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div
                        class="col-lg-2 col-md-4 col-sm-6 mb-2"
                        v-for="person in getPersonnelByRole(
                          'contractor',
                          role.key
                        )"
                        :key="person.id"
                      >
                        <card
                          class="cursor-pointer person-card"
                          @click="openDetailModal(person)"
                        >
                          <card-body>
                            <div class="d-flex align-items-center">
                              <div
                                v-if="person.photo"
                                class="person-photo-small"
                              >
                                <img :src="person.photo" :alt="person.name" />
                              </div>
                              <div v-else class="person-photo-small">
                                <div>
                                  <i
                                    class="bi bi-person-fill fs-32px mb-n3"
                                  ></i>
                                </div>
                              </div>
                              <div class="person-info-compact">
                                <div class="person-name-small">
                                  {{ person.name }}
                                </div>
                                <div class="person-id">
                                  {{ person.nationalId }}
                                </div>
                                <div class="person-status-small">
                                  <span
                                    :class="getStatusClassSmall(person.status)"
                                    >{{ getStatusText(person.status) }}</span
                                  >
                                </div>
                              </div>
                            </div>
                          </card-body>
                        </card>
                      </div>
                    </div>
                    <div
                      v-if="
                        getPersonnelByRole('contractor', role.key).length === 0
                      "
                      class="text-center py-4"
                    >
                      <i class="fa fa-users text-muted fa-2x mb-2"></i>
                      <p class="text-muted">暫無{{ role.name }}</p>
                    </div>
                  </div>
                </div>
              </div>

              <!-- 監造單位人員Tab -->
              <div
                class="tab-pane fade"
                id="supervision"
                role="tabpanel"
                aria-labelledby="supervision-tab"
              >
                <div class="tab-pane-content">
                  <div v-for="role in roles" :key="role.key" class="mb-4">
                    <div class="row mb-3">
                      <div class="col-lg-12">
                        <div class="d-flex align-items-center">
                          <div
                            class="widget-icon rounded me-3"
                            :class="`bg-${role.color}`"
                          >
                            <i
                              class="fa"
                              :class="role.icon"
                              style="color: white"
                            ></i>
                          </div>
                          <div>
                            <h5 class="mb-0">{{ role.name }}</h5>
                            <p class="text-muted mb-0">
                              {{ role.description }}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div class="row">
                      <div
                        class="col-lg-2 col-md-4 col-sm-6 mb-2"
                        v-for="person in getPersonnelByRole(
                          'supervision',
                          role.key
                        )"
                        :key="person.id"
                      >
                        <card
                          class="cursor-pointer person-card"
                          @click="openDetailModal(person)"
                        >
                          <card-body>
                            <div class="d-flex align-items-center">
                                <div
                                v-if="person.photo"
                                class="person-photo-small"
                              >
                                <img :src="person.photo" :alt="person.name" />
                              </div>
                              <div v-else class="person-photo-small">
                                <div>
                                  <i
                                    class="bi bi-person-fill fs-32px mb-n3"
                                  ></i>
                                </div>
                              </div>
                              <div class="person-info-compact">
                                <div class="person-name-small">
                                  {{ person.name }}
                                </div>
                                <div class="person-id">
                                  {{ person.nationalId }}
                                </div>
                                <div class="person-status-small">
                                  <span
                                    :class="getStatusClassSmall(person.status)"
                                    >{{ getStatusText(person.status) }}</span
                                  >
                                </div>
                              </div>
                            </div>
                          </card-body>
                        </card>
                      </div>
                    </div>
                    <div
                      v-if="
                        getPersonnelByRole('supervision', role.key).length === 0
                      "
                      class="text-center py-4"
                    >
                      <i class="fa fa-users text-muted fa-2x mb-2"></i>
                      <p class="text-muted">暫無{{ role.name }}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </card-body>
        </card>
      </div>
    </div>

    <!-- 新增/編輯人員Modal -->
    <div
      class="modal fade"
      id="personnelModal"
      tabindex="-1"
      aria-labelledby="personnelModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="personnelModalLabel">
              {{ isEdit ? "編輯人員" : "新增人員" }}
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <form @submit.prevent="submitForm">
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label"
                      >姓名 <span class="text-danger">*</span></label
                    >
                    <input
                      type="text"
                      class="form-control"
                      v-model="formData.name"
                      required
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label"
                      >身份證字號 <span class="text-danger">*</span></label
                    >
                    <input
                      type="text"
                      class="form-control"
                      v-model="formData.nationalId"
                      required
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label"
                      >職務 <span class="text-danger">*</span></label
                    >
                    <select
                      class="form-select"
                      v-model="formData.role"
                      required
                    >
                      <option value="">請選擇職務</option>
                      <option value="quality">品管人員</option>
                      <option value="safety">勞安人員</option>
                      <option value="engineer">專業技師</option>
                    </select>
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label"
                      >狀態 <span class="text-danger">*</span></label
                    >
                    <select
                      class="form-select"
                      v-model="formData.status"
                      required
                    >
                      <option value="">請選擇狀態</option>
                      <option value="active">在職</option>
                      <option value="resigned">離職</option>
                      <option value="rest">休息</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">證照號碼</label>
                    <input
                      type="text"
                      class="form-control"
                      v-model="formData.licenseNumber"
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">聯絡電話</label>
                    <input
                      type="tel"
                      class="form-control"
                      v-model="formData.phone"
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">Email</label>
                    <input
                      type="email"
                      class="form-control"
                      v-model="formData.email"
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">到職日期</label>
                    <input
                      type="date"
                      class="form-control"
                      v-model="formData.startDate"
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
                  <div class="form-group mb-3">
                    <label class="form-label">照片</label>
                    <input
                      type="file"
                      class="form-control"
                      @change="handlePhotoUpload"
                      accept="image/*"
                    />
                    <div class="form-text">
                      支援JPG、PNG格式，檔案大小不得超過2MB
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
                  <div class="form-group mb-3">
                    <label class="form-label">備註</label>
                    <textarea
                      class="form-control"
                      rows="3"
                      v-model="formData.remarks"
                    ></textarea>
                  </div>
                </div>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              取消
            </button>
            <button type="button" class="btn btn-theme" @click="submitForm">
              <i class="fa me-1" :class="isEdit ? 'fa-save' : 'fa-plus'"></i>
              {{ isEdit ? "更新" : "新增" }}
            </button>
            <button
              type="button"
              class="btn btn-danger"
              v-if="isEdit"
              @click="confirmDelete(formData)"
            >
              <i class="fa fa-trash me-1"></i>
              刪除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 人員詳細資訊Modal -->
    <div
      class="modal fade"
      id="detailModal"
      tabindex="-1"
      aria-labelledby="detailModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="detailModalLabel">人員詳細資訊</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedPerson">
            <div class="row">
              <div class="col-md-4 text-center">
                <img
                  v-if="selectedPerson.photo"
                  :src="selectedPerson.photo"
                  :alt="selectedPerson.name"
                  class="img-fluid rounded-circle mb-3"
                  style="width: 150px; height: 150px; object-fit: cover"
                />
                <div class="img-fluid rounded-circle mb-3" v-else>
                  <i class="bi bi-person-fill mb-n3" style="font-size: 100px"></i>
                </div>
                <h5>{{ selectedPerson.name }}</h5>
                <p class="text-muted">{{ getRoleText(selectedPerson.role) }}</p>
                <span :class="getStatusClass(selectedPerson.status)">{{
                  getStatusText(selectedPerson.status)
                }}</span>
              </div>
              <div class="col-md-8">
                <table class="table table-borderless">
                  <tbody>
                    <tr>
                      <td class="fw-bold">身份證字號：</td>
                      <td>{{ selectedPerson.nationalId }}</td>
                    </tr>
                    <tr v-if="selectedPerson.licenseNumber">
                      <td class="fw-bold">證照號碼：</td>
                      <td>{{ selectedPerson.licenseNumber }}</td>
                    </tr>
                    <tr v-if="selectedPerson.phone">
                      <td class="fw-bold">聯絡電話：</td>
                      <td>{{ selectedPerson.phone }}</td>
                    </tr>
                    <tr v-if="selectedPerson.email">
                      <td class="fw-bold">Email：</td>
                      <td>{{ selectedPerson.email }}</td>
                    </tr>
                    <tr v-if="selectedPerson.startDate">
                      <td class="fw-bold">到職日期：</td>
                      <td>{{ selectedPerson.startDate }}</td>
                    </tr>
                    <tr>
                      <td class="fw-bold">所屬單位：</td>
                      <td>
                        {{
                          selectedPerson.type === "contractor"
                            ? "營造廠商"
                            : "監造單位"
                        }}
                      </td>
                    </tr>
                    <tr v-if="selectedPerson.remarks">
                      <td class="fw-bold">備註：</td>
                      <td>{{ selectedPerson.remarks }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              關閉
            </button>
            <button
              type="button"
              class="btn btn-theme"
              @click="openEditModal(selectedPerson)"
            >
              <i class="fa fa-edit me-1"></i>
              編輯
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 刪除確認Modal -->
    <div
      class="modal fade"
      id="deleteModal"
      tabindex="-1"
      aria-labelledby="deleteModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title text-danger" id="deleteModalLabel">
              確認刪除
            </h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body" v-if="personToDelete">
            <p>確定要刪除人員「{{ personToDelete.name }}」嗎？</p>
            <p class="text-muted">此操作無法復原。</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              取消
            </button>
            <button type="button" class="btn btn-danger" @click="deletePerson">
              確認刪除
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted } from "vue";
import { Modal } from "bootstrap";

// 響應式數據
const activeTab = ref("contractor");

const roles = reactive([
  {
    key: "quality",
    name: "品管人員",
    icon: "fa-medal",
    color: "warning",
    description: "負責工程品質管控與檢測作業",
  },
  {
    key: "safety",
    name: "勞安人員",
    icon: "fa-shield-alt",
    color: "danger",
    description: "負責工地安全檢查與事故預防",
  },
  {
    key: "engineer",
    name: "專業技師",
    icon: "fa-user-tie",
    color: "info",
    description: "負責專業技術指導與監督",
  },
]);

const contractorPersonnel = reactive([
  {
    id: 1,
    name: "張品質",
    nationalId: "A123456789",
    role: "quality",
    status: "active",
    licenseNumber: "QC-2024-001",
    phone: "0912-345-678",
    email: "quality@example.com",
    startDate: "2024-01-15",
    type: "contractor",
    photo: "/assets/img/user/user-6.jpg",
    remarks: "品管經驗豐富，負責現場品質控制",
  },
  {
    id: 2,
    name: "李安全",
    nationalId: "B987654321",
    role: "safety",
    status: "active",
    licenseNumber: "SF-2024-002",
    phone: "0923-456-789",
    email: "safety@example.com",
    startDate: "2024-02-01",
    type: "contractor",
    photo: "/assets/img/user/profile.jpg",
    remarks: "勞工安全衛生管理員",
  },
  {
    id: 4,
    name: "陳技師",
    nationalId: "D111222333",
    role: "engineer",
    status: "active",
    licenseNumber: "ENG-2024-004",
    phone: "0945-678-901",
    email: "engineer.chen@example.com",
    startDate: "2024-01-20",
    type: "contractor",
    photo: "/assets/img/user/user-2.jpg",
    remarks: "土木工程技師，負責結構設計",
  },
  {
    id: 5,
    name: "劉品管",
    nationalId: "E444555666",
    role: "quality",
    status: "rest",
    licenseNumber: "QC-2024-005",
    phone: "0956-789-012",
    email: "quality.liu@example.com",
    startDate: "2024-02-10",
    type: "contractor",
    photo: "/assets/img/user/user-3.jpg",
    remarks: "資深品管人員，暫時休假中",
  },
  {
    id: 8,
    name: "王安全",
    nationalId: "H123123123",
    role: "safety",
    status: "active",
    licenseNumber: "SF-2024-008",
    phone: "0911-111-111",
    email: "safety.wang@example.com",
    startDate: "2024-03-01",
    type: "contractor",
    photo: "/assets/img/user/user-1.jpg",
    remarks: "勞安副主管",
  },
  {
    id: 9,
    name: "林技師",
    nationalId: "I456456456",
    role: "engineer",
    status: "active",
    licenseNumber: "ENG-2024-009",
    phone: "0922-222-222",
    email: "engineer.lin@example.com",
    startDate: "2024-03-05",
    type: "contractor",
    photo: "/assets/img/user/profile.jpg",
    remarks: "機電工程技師",
  },
  {
    id: 10,
    name: "黃品管",
    nationalId: "J789789789",
    role: "quality",
    status: "active",
    licenseNumber: "QC-2024-010",
    phone: "0933-333-333",
    email: "quality.huang@example.com",
    startDate: "2024-03-10",
    type: "contractor",
    photo: "/assets/img/user/user-1.jpg",
    remarks: "混凝土品管專員",
  },
  {
    id: 11,
    name: "吳安全",
    nationalId: "K111444777",
    role: "safety",
    status: "rest",
    licenseNumber: "SF-2024-011",
    phone: "0944-444-444",
    email: "safety.wu@example.com",
    startDate: "2024-02-15",
    type: "contractor",
    photo: null,
    remarks: "工地安全督導員，休假中",
  },
  {
    id: 12,
    name: "鄭技師",
    nationalId: "L555888999",
    role: "engineer",
    status: "resigned",
    licenseNumber: "ENG-2024-012",
    phone: "0955-555-555",
    email: "engineer.zheng@example.com",
    startDate: "2023-12-01",
    type: "contractor",
    photo: null,
    remarks: "前結構技師，已離職",
  },
]);

const supervisionPersonnel = reactive([
  {
    id: 3,
    name: "王技師",
    nationalId: "C456789123",
    role: "engineer",
    status: "active",
    licenseNumber: "ENG-2024-003",
    phone: "0934-567-890",
    email: "engineer@example.com",
    startDate: "2024-01-10",
    type: "supervision",
    photo: null,
    remarks: "結構工程技師，負責工程監督",
  },
  {
    id: 6,
    name: "周安全",
    nationalId: "F777888999",
    role: "safety",
    status: "active",
    licenseNumber: "SF-2024-006",
    phone: "0967-890-123",
    email: "safety.zhou@example.com",
    startDate: "2024-01-25",
    type: "supervision",
    photo: null,
    remarks: "監造單位安全管理員",
  },
  {
    id: 7,
    name: "吳品質",
    nationalId: "G000111222",
    role: "quality",
    status: "resigned",
    licenseNumber: "QC-2024-007",
    phone: "0978-901-234",
    email: "quality.wu@example.com",
    startDate: "2024-01-01",
    type: "supervision",
    photo: null,
    remarks: "前監造品管人員，已離職",
  },
]);

const selectedPerson = ref(null);
const personToDelete = ref(null);
const isEdit = ref(false);
const currentType = ref("contractor");

const formData = reactive({
  name: "",
  nationalId: "",
  role: "",
  status: "",
  licenseNumber: "",
  phone: "",
  email: "",
  startDate: "",
  remarks: "",
  photo: null,
});

const personnelModal = ref(null);
const detailModal = ref(null);
const deleteModal = ref(null);

// 計算屬性
const contractorPersonnelCount = computed(() => contractorPersonnel.length);
const supervisionPersonnelCount = computed(() => supervisionPersonnel.length);

// 方法
const getPersonnelByRole = (type, role) => {
  if (type === "contractor") {
    return contractorPersonnel.filter((person) => person.role === role);
  } else {
    return supervisionPersonnel.filter((person) => person.role === role);
  }
};

const openAddModal = (type) => {
  isEdit.value = false;
  currentType.value = type;
  resetForm();
  personnelModal.value?.show();
};

const openEditModal = (person) => {
  isEdit.value = true;
  currentType.value = person.type;
  Object.assign(formData, person);
  detailModal.value?.hide();
  personnelModal.value?.show();
};

const openDetailModal = (person) => {
  selectedPerson.value = person;
  detailModal.value?.show();
};

const confirmDelete = (person) => {
  personToDelete.value = person;
  deleteModal.value?.show();
};

const deletePerson = () => {
  if (personToDelete.value) {
    if (personToDelete.value.type === "contractor") {
      const index = contractorPersonnel.findIndex(
        (p) => p.id === personToDelete.value.id
      );
      if (index !== -1) {
        contractorPersonnel.splice(index, 1);
      }
    } else {
      const index = supervisionPersonnel.findIndex(
        (p) => p.id === personToDelete.value.id
      );
      if (index !== -1) {
        supervisionPersonnel.splice(index, 1);
      }
    }
    personToDelete.value = null;
    deleteModal.value?.hide();
    showToast("人員已成功刪除", "success");
  }
};

const submitForm = () => {
  if (validateForm()) {
    const personData = {
      ...formData,
      type: currentType.value,
      id: isEdit.value ? formData.id : Date.now(),
    };

    if (isEdit.value) {
      updatePerson(personData);
    } else {
      addPerson(personData);
    }

    personnelModal.value?.hide();
    resetForm();
  }
};

const addPerson = (person) => {
  if (person.type === "contractor") {
    contractorPersonnel.push(person);
  } else {
    supervisionPersonnel.push(person);
  }
  showToast("人員已成功新增", "success");
};

const updatePerson = (updatedPerson) => {
  if (updatedPerson.type === "contractor") {
    const index = contractorPersonnel.findIndex(
      (p) => p.id === updatedPerson.id
    );
    if (index !== -1) {
      Object.assign(contractorPersonnel[index], updatedPerson);
    }
  } else {
    const index = supervisionPersonnel.findIndex(
      (p) => p.id === updatedPerson.id
    );
    if (index !== -1) {
      Object.assign(supervisionPersonnel[index], updatedPerson);
    }
  }
  showToast("人員資料已更新", "success");
};

const validateForm = () => {
  if (
    !formData.name ||
    !formData.nationalId ||
    !formData.role ||
    !formData.status
  ) {
    showToast("請填寫所有必填欄位", "danger");
    return false;
  }
  return true;
};

const resetForm = () => {
  Object.assign(formData, {
    name: "",
    nationalId: "",
    role: "",
    status: "",
    licenseNumber: "",
    phone: "",
    email: "",
    startDate: "",
    remarks: "",
    photo: null,
  });
};

const handlePhotoUpload = (event) => {
  const file = event.target.files[0];
  if (file) {
    if (file.size > 2 * 1024 * 1024) {
      showToast("檔案大小不得超過2MB", "danger");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      formData.photo = e.target.result;
    };
    reader.readAsDataURL(file);
  }
};

const getRoleText = (role) => {
  const roleMap = {
    quality: "品管人員",
    safety: "勞安人員",
    engineer: "專業技師",
  };
  return roleMap[role] || role;
};

const getStatusText = (status) => {
  const statusMap = {
    active: "在職",
    resigned: "離職",
    rest: "休息",
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  const classMap = {
    active: "badge bg-success",
    resigned: "badge bg-danger",
    rest: "badge bg-warning",
  };
  return classMap[status] || "badge bg-secondary";
};

const getStatusClassSmall = (status) => {
  const classMap = {
    active: "badge bg-success",
    resigned: "badge bg-danger",
    rest: "badge bg-warning",
  };
  return classMap[status] || "badge bg-secondarys";
};

const showToast = (message, type) => {
  // 這裡可以整合現有的toast系統
  console.log(`Toast: ${message} (${type})`);
};

// 生命週期鉤子
onMounted(() => {
  personnelModal.value = new Modal(document.getElementById("personnelModal"));
  detailModal.value = new Modal(document.getElementById("detailModal"));
  deleteModal.value = new Modal(document.getElementById("deleteModal"));

  // 監聽tab切換事件
  document.getElementById("contractor-tab")?.addEventListener("click", () => {
    activeTab.value = "contractor";
  });
  document.getElementById("supervision-tab")?.addEventListener("click", () => {
    activeTab.value = "supervision";
  });
});
</script>

<style scoped>
.person-card {
  position: relative;
  transition: all 0.2s ease;
}

.person-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.person-photo {
  margin-right: 15px;
  flex-shrink: 0;
}

.person-photo img {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid #e9ecef;
}

.person-info {
  flex: 1;
}

.person-name {
  font-weight: bold;
  margin-bottom: 5px;
  font-size: 16px;
}

.person-id,
.person-license {
  font-size: 12px;
  margin-bottom: 3px;
}

.person-status {
  margin-top: 8px;
}

/* 小型卡片樣式 */
.person-photo-small {
  margin-right: 15px;
  flex-shrink: 0;
}

.person-photo-small img {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid #e9ecef;
}

.person-info-compact {
  flex: 1;
  min-width: 0;
}

.person-name-small {
  font-weight: bold;
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.person-id-small {
  font-size: 14px;
  margin-bottom: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  line-height: 1.2;
}

.person-status-small {
  margin-top: 2px;
}

.btn-xs {
  width: 20px !important;
  height: 20px !important;
  padding: 0 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px !important;
  border-radius: 3px !important;
}

.widget-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.cursor-pointer {
  cursor: pointer;
}

.border-theme {
  border-color: var(--bs-theme) !important;
  border-width: 2px !important;
}

.tab-pane-content {
  min-height: 400px;
}

.modal-content {
  border-radius: 8px;
}

.form-label {
  font-weight: 500;
}

.text-danger {
  color: #dc3545 !important;
}

.table-borderless td {
  border: none;
  padding: 8px 0;
}

.table-borderless .fw-bold {
  width: 120px;
}

/* 響應式設計 */
@media (max-width: 768px) {
  .person-photo-small img {
    width: 35px;
    height: 35px;
  }

  .person-card {
    height: 70px;
  }

  .person-name-small {
    font-size: 12px;
  }

  .person-id-small {
    font-size: 9px;
  }

  .nav-tabs .nav-link {
    padding: 10px 12px;
    font-size: 14px;
  }

  .widget-icon {
    width: 40px;
    height: 40px;
    font-size: 1.2rem;
  }

  .btn-xs {
    width: 18px !important;
    height: 18px !important;
    font-size: 9px !important;
  }
}

@media (max-width: 576px) {
  .widget-icon {
    width: 35px;
    height: 35px;
    font-size: 1rem;
  }

  .person-card {
    height: 65px;
  }

  .person-photo-small img {
    width: 30px;
    height: 30px;
  }

  .person-name-small {
    font-size: 11px;
  }

  .person-id-small {
    font-size: 8px;
  }

  .btn-xs {
    width: 16px !important;
    height: 16px !important;
    font-size: 8px !important;
  }
}
</style>
