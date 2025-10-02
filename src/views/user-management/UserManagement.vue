<template>
  <div>
    <!-- 頁面標題 -->
    <PageHeader
      title="用戶管理與權限"
      icon="fa fa-users"
      :breadcrumbs="[
        { text: '用戶管理', href: 'javascript:;' },
        { text: '用戶管理與權限', active: true }
      ]"
    />

    <!-- 操作按鈕區域 -->
    <div class="row mb-4">
      <div class="col-lg-12">
        <card>
          <card-body>
            <div class="d-flex justify-content-between align-items-center">
              <div class="d-flex align-items-center">
                <button
                  type="button"
                  class="btn btn-theme me-2"
                  @click="openAddModal"
                >
                  <i class="fa fa-plus me-1"></i>
                  新增用戶
                </button>
                <div class="input-group" style="width: 300px;">
                  <span class="input-group-text">
                    <i class="fa fa-search"></i>
                  </span>
                  <input
                    type="text"
                    class="form-control"
                    v-model="searchKeyword"
                    placeholder="搜尋用戶姓名、帳號或Email..."
                  />
                </div>
              </div>
              <div class="d-flex align-items-center">
                <label class="form-label me-2 mb-0">權限篩選：</label>
                <select class="form-select" v-model="selectedPermissionFilter" style="width: 200px;">
                  <option value="">全部權限</option>
                  <option value="general">通用權限</option>
                  <option value="chief_engineer">主辦工程師權限</option>
                  <option value="contractor">營造廠商權限</option>
                  <option value="supervisor">監造單位權限</option>
                </select>
              </div>
            </div>
          </card-body>
        </card>
      </div>
    </div>

    <!-- 用戶列表 -->
    <div class="row">
      <div class="col-lg-12">
        <card>
          <card-header class="fw-bold d-flex justify-content-between align-items-center">
            <span>用戶列表</span>
            <span class="badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">總計 {{ filteredUsers.length }} 位用戶</span>
          </card-header>
          <card-body class="p-0">
            <div class="table-responsive">
              <table class="table table-striped table-hover mb-0">
                <thead class="table-theme">
                  <tr>
                    <th width="5%">#</th>
                    <th width="15%">姓名</th>
                    <th width="15%">帳號</th>
                    <th width="20%">Email</th>
                    <th width="10%">狀態</th>
                    <th width="25%">權限</th>
                    <th width="10%">操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="(user, index) in paginatedUsers" :key="user.id">
                    <td>{{ (currentPage - 1) * pageSize + index + 1 }}</td>
                    <td>
                      <div class="d-flex align-items-center">
                        <img
                          :src="user.avatar"
                          :alt="user.name"
                          class="rounded-circle me-2"
                          width="32"
                          height="32"
                        />
                        <span class="fw-bold">{{ user.name }}</span>
                      </div>
                    </td>
                    <td>{{ user.username }}</td>
                    <td>{{ user.email }}</td>
                    <td>
                      <span
                        :class="getStatusClass(user.status)"
                      >
                        {{ getStatusText(user.status) }}
                      </span>
                    </td>
                    <td>
                      <div class="d-flex flex-wrap gap-1">
                        <span
                          v-for="permission in user.permissions"
                          :key="permission"
                          :class="getPermissionClass(permission)"
                        >
                          {{ getPermissionText(permission) }}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-primary me-1"
                          @click="openDetailModal(user)"
                        >
                          <i class="fa fa-eye"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-warning me-1"
                          @click="openEditModal(user)"
                        >
                          <i class="fa fa-edit"></i>
                        </button>
                        <button
                          type="button"
                          class="btn btn-sm btn-outline-danger"
                          @click="confirmDelete(user)"
                        >
                          <i class="fa fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- 分頁 -->
            <div class="d-flex justify-content-between align-items-center p-3" v-if="totalPages > 1">
              <div class="text-muted">
                顯示第 {{ (currentPage - 1) * pageSize + 1 }} - {{ Math.min(currentPage * pageSize, filteredUsers.length) }} 項，共 {{ filteredUsers.length }} 項
              </div>
              <nav>
                <ul class="pagination pagination-sm mb-0">
                  <li class="page-item" :class="{ disabled: currentPage === 1 }">
                    <button class="page-link" @click="goToPage(currentPage - 1)">上一頁</button>
                  </li>
                  <li
                    v-for="page in visiblePages"
                    :key="page"
                    class="page-item"
                    :class="{ active: page === currentPage }"
                  >
                    <button class="page-link" @click="goToPage(page)">{{ page }}</button>
                  </li>
                  <li class="page-item" :class="{ disabled: currentPage === totalPages }">
                    <button class="page-link" @click="goToPage(currentPage + 1)">下一頁</button>
                  </li>
                </ul>
              </nav>
            </div>
          </card-body>
        </card>
      </div>
    </div>

    <!-- 新增/編輯用戶Modal -->
    <div
      class="modal fade"
      id="userModal"
      tabindex="-1"
      aria-labelledby="userModalLabel"
      aria-hidden="true"
    >
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-header">
            <h5 class="modal-title" id="userModalLabel">
              {{ isEdit ? "編輯用戶" : "新增用戶" }}
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
                    <label class="form-label">
                      姓名 <span class="text-danger">*</span>
                    </label>
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
                    <label class="form-label">
                      帳號 <span class="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      class="form-control"
                      v-model="formData.username"
                      :disabled="isEdit"
                      required
                    />
                    <div class="form-text" v-if="isEdit">
                      帳號建立後無法修改
                    </div>
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">
                      Email <span class="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      class="form-control"
                      v-model="formData.email"
                      required
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">
                      狀態 <span class="text-danger">*</span>
                    </label>
                    <select
                      class="form-select"
                      v-model="formData.status"
                      required
                    >
                      <option value="">請選擇狀態</option>
                      <option value="active">啟用</option>
                      <option value="inactive">停用</option>
                      <option value="pending">待啟用</option>
                    </select>
                  </div>
                </div>
              </div>
              <div class="row" v-if="!isEdit">
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">
                      密碼 <span class="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      class="form-control"
                      v-model="formData.password"
                      :required="!isEdit"
                    />
                  </div>
                </div>
                <div class="col-md-6">
                  <div class="form-group mb-3">
                    <label class="form-label">
                      確認密碼 <span class="text-danger">*</span>
                    </label>
                    <input
                      type="password"
                      class="form-control"
                      v-model="formData.confirmPassword"
                      :required="!isEdit"
                    />
                  </div>
                </div>
              </div>
              <div class="row">
                <div class="col-12">
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
              
              <!-- 權限設定 -->
              <div class="row">
                <div class="col-12">
                  <label class="form-label">
                    權限設定 <span class="text-danger">*</span>
                  </label>
                  <div class="border rounded p-3 mb-3">
                    <div class="row">
                      <div 
                        v-for="permission in availablePermissions" 
                        :key="permission.key"
                        class="col-md-6 mb-3"
                      >
                        <card class="h-100 permission-card" :class="{ 'border-theme': isPermissionSelected(permission.key) }">
                          <card-body class="p-3">
                            <div class="form-check">
                              <input
                                class="form-check-input"
                                type="checkbox"
                                :id="permission.key"
                                :value="permission.key"
                                v-model="formData.permissions"
                              />
                              <label class="form-check-label" :for="permission.key">
                                <div class="d-flex align-items-center">
                                  <i 
                                    class="fa me-2" 
                                    :class="permission.icon"
                                    :style="{ color: permission.color }"
                                  ></i>
                                  <div>
                                    <div class="fw-bold">{{ permission.name }}</div>
                                    <small class="text-muted">{{ permission.description }}</small>
                                  </div>
                                </div>
                              </label>
                            </div>
                          </card-body>
                        </card>
                      </div>
                    </div>
                    <div class="form-text">
                      <i class="fa fa-info-circle me-1"></i>
                      用戶可以擁有多種權限，主辦工程師權限為最高權限
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

    <!-- 用戶詳細資訊Modal -->
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
            <h5 class="modal-title" id="detailModalLabel">用戶詳細資訊</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body" v-if="selectedUser">
            <div class="row">
              <div class="col-md-4 text-center">
                <img
                  :src="selectedUser.avatar || '/assets/img/user/profile.jpg'"
                  :alt="selectedUser.name"
                  class="img-fluid rounded-circle mb-3"
                  style="width: 120px; height: 120px; object-fit: cover;"
                />
                <h5>{{ selectedUser.name }}</h5>
                <span
                  :class="getStatusClass(selectedUser.status)"
                >
                  {{ getStatusText(selectedUser.status) }}
                </span>
              </div>
              <div class="col-md-8">
                <table class="table table-borderless">
                  <tbody>
                    <tr>
                      <td class="fw-bold">帳號：</td>
                      <td>{{ selectedUser.username }}</td>
                    </tr>
                    <tr>
                      <td class="fw-bold">Email：</td>
                      <td>{{ selectedUser.email }}</td>
                    </tr>
                    <tr v-if="selectedUser.phone">
                      <td class="fw-bold">聯絡電話：</td>
                      <td>{{ selectedUser.phone }}</td>
                    </tr>
                    <tr>
                      <td class="fw-bold">建立時間：</td>
                      <td>{{ selectedUser.createdAt }}</td>
                    </tr>
                    <tr>
                      <td class="fw-bold">最後登入：</td>
                      <td>{{ selectedUser.lastLogin || '尚未登入' }}</td>
                    </tr>
                    <tr>
                      <td class="fw-bold">權限：</td>
                      <td>
                        <div class="d-flex flex-wrap gap-1">
                          <span
                            v-for="permission in selectedUser.permissions"
                            :key="permission"
                            :class="getPermissionClass(permission)"
                          >
                            {{ getPermissionText(permission) }}
                          </span>
                        </div>
                      </td>
                    </tr>
                    <tr v-if="selectedUser.remarks">
                      <td class="fw-bold">備註：</td>
                      <td>{{ selectedUser.remarks }}</td>
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
              @click="openEditModal(selectedUser)"
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
          <div class="modal-body" v-if="userToDelete">
            <p>確定要刪除用戶「{{ userToDelete.name }}」嗎？</p>
            <p class="text-muted">此操作無法復原，將會刪除該用戶的所有相關資料。</p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              取消
            </button>
            <button type="button" class="btn btn-danger" @click="deleteUser">
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
const searchKeyword = ref("");
const selectedPermissionFilter = ref("");
const currentPage = ref(1);
const pageSize = ref(10);

// 權限定義
const availablePermissions = reactive([
  {
    key: "general",
    name: "通用權限",
    icon: "fa-user",
    color: "#6c757d",
    description: "系統基本功能權限，包含查看和基本操作",
  },
  {
    key: "chief_engineer",
    name: "主辦工程師權限",
    icon: "fa-crown",
    color: "#dc3545",
    description: "最高權限，可管理所有功能和用戶",
  },
  {
    key: "contractor",
    name: "營造廠商權限",
    icon: "fa-hard-hat",
    color: "#fd7e14",
    description: "營造廠商相關功能權限，包含施工管理",
  },
  {
    key: "supervisor",
    name: "監造單位權限",
    icon: "fa-eye",
    color: "#0d6efd",
    description: "監造單位相關功能權限，包含監督檢查",
  },
]);

// 用戶數據
const users = reactive([]);

const selectedUser = ref(null);
const userToDelete = ref(null);
const isEdit = ref(false);

const formData = reactive({
  name: "",
  username: "",
  email: "",
  phone: "",
  status: "",
  password: "",
  confirmPassword: "",
  permissions: [],
  remarks: "",
});

const userModal = ref(null);
const detailModal = ref(null);
const deleteModal = ref(null);

// 計算屬性
const filteredUsers = computed(() => {
  let result = users;

  // 關鍵字搜尋
  if (searchKeyword.value.trim()) {
    const keyword = searchKeyword.value.toLowerCase();
    result = result.filter(
      (user) =>
        user.name.toLowerCase().includes(keyword) ||
        user.username.toLowerCase().includes(keyword) ||
        user.email.toLowerCase().includes(keyword)
    );
  }

  // 權限篩選
  if (selectedPermissionFilter.value) {
    result = result.filter((user) =>
      user.permissions.includes(selectedPermissionFilter.value)
    );
  }

  return result;
});

const totalPages = computed(() => {
  return Math.ceil(filteredUsers.value.length / pageSize.value);
});

const paginatedUsers = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  const end = start + pageSize.value;
  return filteredUsers.value.slice(start, end);
});

const visiblePages = computed(() => {
  const pages = [];
  const total = totalPages.value;
  const current = currentPage.value;
  
  if (total <= 7) {
    for (let i = 1; i <= total; i++) {
      pages.push(i);
    }
  } else {
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, '...', total);
    } else if (current >= total - 3) {
      pages.push(1, '...', total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, '...', current - 1, current, current + 1, '...', total);
    }
  }
  
  return pages;
});

// 方法
const openAddModal = () => {
  isEdit.value = false;
  resetForm();
  userModal.value?.show();
};

const openEditModal = (user) => {
  isEdit.value = true;
  Object.assign(formData, {
    ...user,
    password: "",
    confirmPassword: "",
    permissions: [...user.permissions],
  });
  detailModal.value?.hide();
  userModal.value?.show();
};

const openDetailModal = (user) => {
  selectedUser.value = user;
  detailModal.value?.show();
};

const confirmDelete = (user) => {
  userToDelete.value = user;
  deleteModal.value?.show();
};

const deleteUser = () => {
  if (userToDelete.value) {
    const index = users.findIndex((u) => u.id === userToDelete.value.id);
    if (index !== -1) {
      users.splice(index, 1);
    }
    userToDelete.value = null;
    deleteModal.value?.hide();
    showToast("用戶已成功刪除", "success");
  }
};

const submitForm = () => {
  if (validateForm()) {
    const userData = {
      ...formData,
      id: isEdit.value ? formData.id : Date.now(),
      createdAt: isEdit.value ? formData.createdAt : new Date().toLocaleString('zh-TW'),
      lastLogin: isEdit.value ? formData.lastLogin : null,
    };

    if (isEdit.value) {
      updateUser(userData);
    } else {
      addUser(userData);
    }

    userModal.value?.hide();
    resetForm();
  }
};

const addUser = (user) => {
  users.push(user);
  showToast("用戶已成功新增", "success");
};

const updateUser = (updatedUser) => {
  const index = users.findIndex((u) => u.id === updatedUser.id);
  if (index !== -1) {
    Object.assign(users[index], updatedUser);
  }
  showToast("用戶資料已更新", "success");
};

const validateForm = () => {
  if (!formData.name || !formData.username || !formData.email || !formData.status) {
    showToast("請填寫所有必填欄位", "danger");
    return false;
  }

  if (formData.permissions.length === 0) {
    showToast("請至少選擇一個權限", "danger");
    return false;
  }

  if (!isEdit.value) {
    if (!formData.password || !formData.confirmPassword) {
      showToast("請填寫密碼欄位", "danger");
      return false;
    }

    if (formData.password !== formData.confirmPassword) {
      showToast("密碼與確認密碼不相符", "danger");
      return false;
    }

    // 檢查帳號是否已存在
    if (users.some((u) => u.username === formData.username)) {
      showToast("帳號已存在，請選擇其他帳號", "danger");
      return false;
    }
  }

  // Email格式驗證
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(formData.email)) {
    showToast("請輸入有效的Email格式", "danger");
    return false;
  }

  return true;
};

const resetForm = () => {
  Object.assign(formData, {
    name: "",
    username: "",
    email: "",
    phone: "",
    status: "",
    password: "",
    confirmPassword: "",
    permissions: [],
    remarks: "",
  });
};

const isPermissionSelected = (permissionKey) => {
  return formData.permissions.includes(permissionKey);
};

const getStatusText = (status) => {
  const statusMap = {
    active: "啟用",
    inactive: "停用",
    pending: "待啟用",
  };
  return statusMap[status] || status;
};

const getStatusClass = (status) => {
  const classMap = {
    active: "badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
    inactive: "badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
    pending: "badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
  };
  return classMap[status] || "badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center";
};

const getPermissionText = (permission) => {
  const permissionMap = {
    general: "通用",
    chief_engineer: "主辦工程師",
    contractor: "營造廠商",
    supervisor: "監造單位",
  };
  return permissionMap[permission] || permission;
};

const getPermissionClass = (permission) => {
  const classMap = {
    general: "badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
    chief_engineer: "badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
    contractor: "badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
    supervisor: "badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center",
  };
  return classMap[permission] || "badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center";
};

const goToPage = (page) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};

const showToast = (message, type) => {
  // 這裡可以整合現有的toast系統
  // console.log(`Toast: ${message} (${type})`);
};

// 生命週期鉤子
onMounted(() => {
  userModal.value = new Modal(document.getElementById("userModal"));
  detailModal.value = new Modal(document.getElementById("detailModal"));
  deleteModal.value = new Modal(document.getElementById("deleteModal"));
});
</script>

<style scoped>

</style> 