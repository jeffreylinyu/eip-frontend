<script>
import tagsInput from '@/components/plugins/TagsInput.vue';
import quillEditor from '@/components/plugins/QuillEditor.vue';
import ProjectForm from '@/components/project/ProjectForm.vue';

export default {
  data () {
    return {
      // 表單數據
      formData: {
        // 工程基本資料
        project_name: '',
        contract_number: '',
        project_location: '',
        host_agency: '',
        supervision_unit: '',
        contractor_name: '',
        construction_period: '',
        project_amount: '',
        project_grade: '',
        // 工程專業人員
        project_manager_name: '',
        quality_control_name: '',
        quality_control_license: '',
        safety_officer_name: '',
        safety_officer_license: '',
        engineer_name: '',
        engineer_license: '',
        // 營造廠商資訊
        contractor_company_name: '',
        contractor_company_id: '',
        contractor_company_manager_name: '',
        contractor_company_manager_phone: '',
        // 監造單位資訊
        supervision_company_name: '',
        supervision_company_id: '',
        supervision_company_manager_name: '',
        supervision_company_manager_phone: ''
      },
      // 原始數據副本，用於比較是否有變更
      originalFormData: {},
      // 保存狀態
      isSaving: false,
      hasUnsavedChanges: false,
      // 標籤相關
      tag: '',
      tags: [{
      	text: '土木工程'
      }, {
      	text: '建築工程'
      }],
      tagGrade: '',
      tagsGrade: [{
      	text: '甲等'
      }, {
      	text: '乙等'
      }],
      tagOrg: '',
      tagsOrg: [{
      	text: '交通部'
      }],
      tagContractor: '',
      tagsContractor: [],
      tagsAutocomplete: [{ text: '道路工程'}, { text: '橋梁工程'}, { text: '隧道工程'}]
    }
  },
  components: {
    tagsInput: tagsInput,
    quillEditor: quillEditor,
    ProjectForm: ProjectForm
  },
  watch: {
    // 監聽表單數據變化
    formData: {
      handler(newVal, oldVal) {
        this.checkForChanges();
      },
      deep: true
    }
  },
  mounted() {
    // 保存原始數據
    this.originalFormData = JSON.parse(JSON.stringify(this.formData));
    
    // 添加瀏覽器離開頁面提示
    window.addEventListener('beforeunload', this.beforeUnloadHandler);
  },
  beforeUnmount() {
    // 清除事件監聽器
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);
  },
  beforeRouteLeave(to, from, next) {
    // Vue Router 路由離開守卫
    if (this.hasUnsavedChanges) {
      const answer = window.confirm('您有未保存的變更，確定要離開嗎？');
      if (answer) {
        next();
      } else {
        next(false);
      }
    } else {
      next();
    }
  },
  methods: {
    // 檢查是否有未保存的變更
    checkForChanges() {
      this.hasUnsavedChanges = JSON.stringify(this.formData) !== JSON.stringify(this.originalFormData);
    },
    
    // 瀏覽器離開頁面處理
    beforeUnloadHandler(event) {
      if (this.hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '您有未保存的變更，確定要離開嗎？';
        return '您有未保存的變更，確定要離開嗎？';
      }
    },
    
    // 保存表單
    async saveForm() {
      this.isSaving = true;
      
      try {
        // 調用API保存數據
        await this.submitFormData();
        
        // 保存成功後更新原始數據
        this.originalFormData = JSON.parse(JSON.stringify(this.formData));
        this.hasUnsavedChanges = false;
        
        // 顯示成功提示
        this.$toast.success('工程資料保存成功！');
        
      } catch (error) {
        console.error('保存失敗:', error);
        this.$toast.error('保存失敗，請重試！');
      } finally {
        this.isSaving = false;
      }
    },
    
    // 提交表單數據（模擬 API 調用）
    async submitFormData() {
      // 模擬 API 延遲
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 這裡可以添加實際的 API 調用邏輯
      console.log('提交表單數據:', this.formData);
      
      // 模擬可能的錯誤
      // throw new Error('保存失敗');
    },
    
    // 重置表單
    resetForm() {
      if (this.hasUnsavedChanges) {
        const answer = window.confirm('確定要重置表單嗎？所有未保存的變更將會丟失。');
        if (!answer) {
          return;
        }
      }
      
      this.formData = JSON.parse(JSON.stringify(this.originalFormData));
      this.hasUnsavedChanges = false;
      this.$toast.info('表單已重置');
    }
  }
}
</script>

<template>
	<div class="d-flex align-items-center mb-3">
		<div>
			<ol class="breadcrumb">
				<li class="breadcrumb-item"><a href="javascript:;">表單生成與管理</a></li>
				<li class="breadcrumb-item active">基本資料維護</li>
			</ol>
			<h1 class="page-header mb-0">基本資料維護</h1>
		</div>
	</div>
	
	<div class="row gx-4">
		<div class="col-lg-12">
			<!-- 使用共用表單組件 -->
			<ProjectForm 
				v-model="formData"
				:is-submitting="isSaving"
				submit-button-text="保存"
				@submit="saveForm"
				@reset="resetForm"
			/>
			
			<!-- 未保存變更提示 -->
			<div v-if="hasUnsavedChanges" class="alert alert-warning mt-3" role="alert">
				<i class="fa fa-exclamation-triangle me-2"></i>
				您有未保存的變更
			</div>
		</div>
	</div>
</template>