<script>
import { useProjectStore } from '@/stores/project';
import { createConstruction } from '@/api/construction';
import toastService from '@/components/bootstrap/ToastService.js';
import ProjectForm from '@/components/project/ProjectForm.vue';

export default {
  name: 'ProjectSelector',
  components: {
    ProjectForm
  },
  props: {
    show: {
      type: Boolean,
      default: false
    }
  },
  emits: ['update:show', 'project-selected'],
  data() {
    return {
      searchKeyword: '',
      isLoading: false,
      showAddForm: false,
      newProject: {
        // 工程基本資料
        project_name: '',
        contract_number: '',
        project_location: '',
        host_agency: '',
        supervision_unit: '',
        contractor_name: '',
        construction_period: '',
        project_amount: '',
        project_grade: ''
      },
      isSubmitting: false
    }
  },
  computed: {
    projectStore() {
      return useProjectStore();
    },
    
    filteredProjects() {
      if (!this.searchKeyword.trim()) {
        return this.projectStore.projects;
      }
      
      const keyword = this.searchKeyword.toLowerCase();
      return this.projectStore.projects.filter(project => 
        project.constructionName.toLowerCase().includes(keyword) ||
        project.constructionId.toLowerCase().includes(keyword) ||
        project.constructionLocation.toLowerCase().includes(keyword) ||
        project.userId.toLowerCase().includes(keyword)
      );
    },
    
    currentProjectId() {
      return this.projectStore.currentProject?.constructionId;
    }
  },
  watch: {
    show(newVal) {
      if (newVal) {
        this.searchKeyword = '';
        this.showAddForm = false;
        this.resetForm();
        // 每次打開時重新載入項目列表
        this.refreshProjects();
      }
    }
  },
  mounted() {
    // 初始化項目數據
    this.projectStore.initProjects();
  },
  methods: {
    // 關閉Modal
    closeModal() {
      this.$emit('update:show', false);
    },
    
    // 選擇項目
    selectProject(project) {
      this.projectStore.setCurrentProject(project);
      this.$emit('project-selected', project);
      toastService.success(`已切換到項目：${project.constructionName}`);
      this.closeModal();
    },
    
    // 顯示新增表單
    showAddProjectForm() {
      this.showAddForm = true;
      this.resetForm();
    },
    
    // 隱藏新增表單
    hideAddProjectForm() {
      this.showAddForm = false;
      this.resetForm();
    },
    
    // 重置表單
    resetForm() {
      this.newProject = {
        // 工程基本資料
        project_name: '',
        contract_number: '',
        project_location: '',
        host_agency: '',
        supervision_unit: '',
        contractor_name: '',
        construction_period: '',
        project_amount: '',
        project_grade: ''
      };
    },
    
    // 新增工程案
    async addProject() {
      if (!this.validateForm()) {
        return;
      }
      
      this.isSubmitting = true;
      
      try {
        // 將表單數據轉換為API需要的格式
        const apiData = this.convertFormDataToApi(this.newProject);
        await createConstruction(apiData);
        toastService.success('項目新增成功！');
        this.hideAddProjectForm();
        
        // 重新載入項目列表
        await this.refreshProjects();
        
      } catch (error) {
        console.error('新增工程案失敗:', error);
        toastService.error('新增工程案失敗，請重試！');
      } finally {
        this.isSubmitting = false;
      }
    },
    
    // 將表單數據轉換為API格式
    convertFormDataToApi(formData) {
      return {
        username: formData.contractor_name, // 使用承包商名稱作為用戶名
        constructionName: formData.project_name,
        constructionLocation: formData.project_location,
        contractId: formData.contract_number,
        supervisoryName: formData.supervision_unit,
        constructionBudget: formData.project_amount,
        leadOrganization: formData.host_agency,
        constructor: formData.contractor_name,
        constructionLevel: formData.project_grade,
        projectStaff: formData.contractor_name, // 使用承包商名稱作為項目人員
        constructionStartDate: new Date().toISOString(), // 預設為當前時間
        constructionEndDate: new Date(Date.now() + parseInt(formData.construction_period || 0) * 24 * 60 * 60 * 1000).toISOString(), // 根據工期計算結束日期
        supervisionManufacturer: formData.supervision_unit
      };
    },
    
    // 驗證表單
    validateForm() {
      const requiredFields = [
        { field: 'project_name', label: '工程名稱' },
        { field: 'contract_number', label: '契約編號' },
        { field: 'project_location', label: '工程地點' },
        { field: 'host_agency', label: '主辦機關' },
        { field: 'supervision_unit', label: '監造單位' },
        { field: 'contractor_name', label: '承包商名稱' },
        { field: 'construction_period', label: '工期' },
        { field: 'project_amount', label: '工程金額' },
        { field: 'project_grade', label: '工程等級' }
      ];
      
      for (const { field, label } of requiredFields) {
        if (!this.newProject[field] || this.newProject[field].toString().trim() === '') {
          toastService.warning(`請填寫${label}`);
          return false;
        }
      }
      
      // 驗證工程金額
      if (isNaN(this.newProject.project_amount) || parseFloat(this.newProject.project_amount) <= 0) {
        toastService.warning('請填寫有效的工程金額');
        return false;
      }
      
      // 驗證工期
      if (isNaN(this.newProject.construction_period) || parseInt(this.newProject.construction_period) <= 0) {
        toastService.warning('請填寫有效的工期天數');
        return false;
      }
      
      return true;
    },
    
    // 重新載入項目列表
    async refreshProjects() {
      this.isLoading = true;
      try {
        await this.projectStore.refreshProjects();
        if (this.projectStore.error) {
          toastService.error(this.projectStore.error);
        }
      } catch (error) {
        toastService.error('載入項目列表失敗');
      } finally {
        this.isLoading = false;
      }
    },
    
    // 格式化金額顯示
    formatAmount(amount) {
      return new Intl.NumberFormat('zh-TW', {
        style: 'currency',
        currency: 'TWD',
        minimumFractionDigits: 0
      }).format(amount);
    },
    
    // 格式化日期顯示
    formatDate(dateString) {
      if (!dateString) return '--';
      return new Date(dateString).toLocaleDateString('zh-TW');
    },
    
    // 計算工期天數
    calculateDuration(startDate, endDate) {
      if (!startDate || !endDate) return '--';
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays}天`;
    }
  }
}
</script>

<template>
  <!-- Modal -->
  <div class="modal fade" :class="{ 'show': show }" :style="{ display: show ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fa fa-project-diagram me-2"></i>
            {{ showAddForm ? '新增工程案' : '選擇工程案' }}
          </h5>
          <button type="button" class="btn-close" @click="closeModal"></button>
        </div>
        
        <div class="modal-body">
          <!-- 項目列表檢視 -->
          <div v-if="!showAddForm">
            <!-- 搜尋框和重新載入 -->
            <div class="row mb-3">
              <div class="col-md-10">
                <div class="input-group">
                  <span class="input-group-text"><i class="fa fa-search"></i></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    v-model="searchKeyword"
                    placeholder="搜尋項目名稱、項目ID、地點等..."
                    :disabled="isLoading"
                  >
                </div>
              </div>
              <div class="col-md-2">
                <button 
                  type="button" 
                  class="btn btn-outline-theme w-100" 
                  @click="refreshProjects"
                  :disabled="isLoading"
                >
                  <i class="fa me-1" :class="{ 'fa-spin fa-spinner': isLoading, 'fa-refresh': !isLoading }"></i>
                  {{ isLoading ? '載入中' : '重新載入' }}
                </button>
              </div>
            </div>
            
            <!-- 載入指示器 -->
            <div v-if="projectStore.loading" class="text-center py-4">
              <i class="fa fa-spinner fa-spin fa-2x mb-2"></i>
              <p class="text-muted">正在載入項目列表...</p>
            </div>
            
            <!-- 錯誤提示 -->
            <div v-else-if="projectStore.error" class="alert alert-warning" role="alert">
              <i class="fa fa-exclamation-triangle me-2"></i>
              {{ projectStore.error }}
              <button type="button" class="btn btn-sm btn-outline-warning ms-2" @click="refreshProjects">
                重試
              </button>
            </div>
            
            <!-- 項目列表 -->
            <div v-else class="project-list p-2" style="max-height: 400px; overflow-y: auto;">
              <div v-if="filteredProjects.length === 0" class="text-center py-4 text-muted">
                <i class="fa fa-search fa-2x mb-2"></i>
                <p>{{ searchKeyword ? '找不到符合條件的項目' : '尚無項目工程' }}</p>
              </div>
              
              <div 
                v-for="project in filteredProjects" 
                :key="project.constructionId"
                class="card mb-2 cursor-pointer project-item"
                :class="{ 'border-theme': project.constructionId === currentProjectId }"
                @click="selectProject(project)"
              >
                <card class="p-3">
                  <div class="d-flex justify-content-between align-items-start">
                    <div class="flex-grow-1">
                      <h6 class="card-title mb-1 d-flex align-items-center">
                        <i class="fa fa-check-circle text-success me-2" v-if="project.constructionId === currentProjectId"></i>
                        {{ project.constructionName }}
                      </h6>
                      <div class="row text-muted small">
                        <div class="col-6">
                          <div><strong>項目ID:</strong> {{ project.constructionId }}</div>
                          <div><strong>工程地點:</strong> {{ project.constructionLocation }}</div>
                          <div><strong>負責人:</strong> {{ project.userId }}</div>
                        </div>
                        <div class="col-6">
                          <div><strong>工程預算:</strong> {{ formatAmount(project.constructionBudget) }}</div>
                          <div><strong>開始日期:</strong> {{ formatDate(project.constructionStartDate) }}</div>
                          <div><strong>結束日期:</strong> {{ formatDate(project.constructionEndDate) }}</div>
                        </div>
                      </div>
                      <div class="mt-2 small text-muted">
                        <strong>工期:</strong> {{ calculateDuration(project.constructionStartDate, project.constructionEndDate) }}
                      </div>
                    </div>
                    <div class="ms-2">
                      <span class="badge bg-theme" v-if="project.constructionId === currentProjectId">目前項目</span>
                    </div>
                  </div>
                </card>
              </div>
            </div>
          </div>
          
          <!-- 新增工程案表單 -->
          <div v-else>
            <ProjectForm 
              v-model="newProject"
              :mode="'create'"
              :is-submitting="isSubmitting"
              :show-submit-button="false"
              :show-reset-button="false"
              submit-button-text="新增工程案"
              @submit="addProject"
              @reset="resetForm"
            />
          </div>
        </div>
        
        <div class="modal-footer">
          <div v-if="!showAddForm" class="d-flex w-100 justify-content-between">
            <button type="button" class="btn btn-theme" @click="showAddProjectForm">
              <i class="fa fa-plus me-1"></i>
              新增工程案
            </button>
            <div class="d-flex align-items-center">
              <div class="text-muted small me-3">
                共 {{ projectStore.projectCount }} 個工程案
              </div>
              <button type="button" class="btn btn-secondary" @click="closeModal">
                取消
              </button>
            </div>
          </div>
          <div v-else class="d-flex w-100 justify-content-end">
            <button type="button" class="btn btn-secondary me-2" @click="hideAddProjectForm" :disabled="isSubmitting">
              返回列表
            </button>
            <button type="button" class="btn btn-theme" @click="addProject" :disabled="isSubmitting">
              <i class="fa me-1" :class="{ 'fa-spin fa-spinner': isSubmitting, 'fa-save': !isSubmitting }"></i>
              {{ isSubmitting ? '新增中...' : '新增工程案' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Modal backdrop -->
  <div v-if="show" class="modal-backdrop fade show" @click="closeModal"></div>
</template>

<style scoped>
.modal {
  background-color: rgba(0, 0, 0, 0.5);
}

.project-item {
  transition: all 0.2s ease;
}

.project-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-1px);
}

.cursor-pointer {
  cursor: pointer;
}

.border-theme {
  border-color: var(--bs-theme) !important;
  border-width: 2px !important;
}

.alert {
  margin-bottom: 1rem;
}
</style> 