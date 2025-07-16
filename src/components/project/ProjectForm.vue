<script>
export default {
  name: "ProjectForm",
  props: {
    modelValue: {
      type: Object,
      default: () => ({}),
    },
    isSubmitting: {
      type: Boolean,
      default: false,
    },
    showSubmitButton: {
      type: Boolean,
      default: true,
    },
    submitButtonText: {
      type: String,
      default: "保存",
    },
    showResetButton: {
      type: Boolean,
      default: true,
    },
  },
  emits: ["update:modelValue", "submit", "reset"],
  data() {
    return {
      formData: {
        // 工程基本資料
        project_name: "",
        contract_number: "",
        project_location: "",
        host_agency: "",
        supervision_unit: "",
        contractor_name: "",
        construction_period: "",
        project_amount: "",
        project_grade: "",
        // 工程專業人員
        project_manager_name: "",
        quality_control_name: "",
        quality_control_license: "",
        safety_officer_name: "",
        safety_officer_license: "",
        engineer_name: "",
        engineer_license: "",
        // 營造廠商資訊
        contractor_company_name: "",
        contractor_company_id: "",
        contractor_company_manager_name: "",
        contractor_company_manager_phone: "",
        // 監造單位資訊
        supervision_company_name: "",
        supervision_company_id: "",
        supervision_company_manager_name: "",
        supervision_company_manager_phone: "",
      },
    };
  },
  watch: {
    modelValue: {
      handler(newVal) {
        this.formData = { ...this.formData, ...newVal };
      },
      deep: true,
      immediate: true,
    },
    formData: {
      handler(newVal) {
        this.$emit("update:modelValue", newVal);
      },
      deep: true,
    },
  },
  methods: {
    handleSubmit() {
      this.$emit("submit", this.formData);
    },

    handleReset() {
      this.$emit("reset");
    },
  },
};
</script>

<template>
  <div class="project-form">
    <!-- 工程基本資料 -->
    <card>
      <card-header
        class="d-flex align-items-center bg-inverse bg-opacity-10 fw-400"
      >
        工程基本資料
      </card-header>
      <card-body>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >工程名稱 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.project_name"
              name="project_name"
              placeholder="請輸入工程名稱"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label"
              >契約編號 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.contract_number"
              name="contract_number"
              placeholder="請輸入契約編號"
            />
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label"
            >工程地點 <span class="text-danger">*</span></label
          >
          <input
            type="text"
            class="form-control"
            v-model="formData.project_location"
            name="project_location"
            placeholder="請輸入工程地點"
          />
        </div>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >主辦機關 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.host_agency"
              name="host_agency"
              placeholder="請輸入主辦機關"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label"
              >監造單位 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.supervision_unit"
              name="supervision_unit"
              placeholder="請輸入監造單位"
            />
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label"
            >承包商名稱 <span class="text-danger">*</span></label
          >
          <input
            type="text"
            class="form-control"
            v-model="formData.contractor_name"
            name="contractor_name"
            placeholder="請輸入承包商名稱"
          />
        </div>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >工期 <span class="text-danger">*</span></label
            >
            <input
              type="number"
              class="form-control"
              v-model="formData.construction_period"
              name="construction_period"
              placeholder="請輸入工期（天數）"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label"
              >工程金額 <span class="text-danger">*</span></label
            >
            <div class="input-group">
              <span class="input-group-text">NT$</span>
              <input
                type="number"
                class="form-control"
                v-model="formData.project_amount"
                name="project_amount"
                placeholder="請輸入工程金額"
              />
            </div>
          </div>
        </div>
        <div class="mb-3">
          <label class="form-label"
            >工程等級分類 <span class="text-danger">*</span></label
          >
          <select
            class="form-select"
            v-model="formData.project_grade"
            name="project_grade"
          >
            <option value="">-- 請選擇工程等級分類 --</option>
            <option value="甲等">甲等</option>
            <option value="乙等">乙等</option>
            <option value="丙等">丙等</option>
            <option value="丁等">丁等</option>
            <option value="1">1級</option>
            <option value="2">2級</option>
            <option value="3">3級</option>
            <option value="4">4級</option>
            <option value="5">5級</option>
            <option value="6">6級</option>
            <option value="7">7級</option>
            <option value="8">8級</option>
            <option value="9">9級</option>
            <option value="10">10級</option>
          </select>
        </div>
      </card-body>
    </card>

    <!-- 營造廠商資訊 -->
    <card class="mt-4">
      <card-header
        class="d-flex align-items-center bg-inverse bg-opacity-10 fw-400"
      >
        營造廠商資訊
      </card-header>
      <card-body>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >公司名稱 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.contractor_company_name"
              name="contractor_company_name"
              placeholder="請輸入營造廠商公司名稱"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label"
              >公司統一編號 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.contractor_company_id"
              name="contractor_company_id"
              placeholder="請輸入公司統一編號"
            />
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >公司負責人姓名 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.contractor_company_manager_name"
              name="contractor_company_manager_name"
              placeholder="請輸入公司負責人姓名"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label">公司負責人聯絡電話</label>
            <input
              type="tel"
              class="form-control"
              v-model="formData.contractor_company_manager_phone"
              name="contractor_company_manager_phone"
              placeholder="請輸入聯絡電話"
            />
          </div>
        </div>
      </card-body>
    </card>

    <!-- 監造單位資訊 -->
    <card class="mt-4">
      <card-header
        class="d-flex align-items-center bg-inverse bg-opacity-10 fw-400"
      >
        監造單位資訊
      </card-header>
      <card-body>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >公司名稱 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.supervision_company_name"
              name="supervision_company_name"
              placeholder="請輸入監造單位公司名稱"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label"
              >公司統一編號 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.supervision_company_id"
              name="supervision_company_id"
              placeholder="請輸入公司統一編號"
            />
          </div>
        </div>
        <div class="row mb-3">
          <div class="col-lg-6">
            <label class="form-label"
              >公司負責人姓名 <span class="text-danger">*</span></label
            >
            <input
              type="text"
              class="form-control"
              v-model="formData.supervision_company_manager_name"
              name="supervision_company_manager_name"
              placeholder="請輸入公司負責人姓名"
            />
          </div>
          <div class="col-lg-6">
            <label class="form-label">公司負責人聯絡電話</label>
            <input
              type="tel"
              class="form-control"
              v-model="formData.supervision_company_manager_phone"
              name="supervision_company_manager_phone"
              placeholder="請輸入聯絡電話"
            />
          </div>
        </div>
      </card-body>
    </card>

    <!-- 操作按鈕 -->
    <div
      v-if="showSubmitButton || showResetButton"
      class="d-flex justify-content-end mt-4"
    >
      <button
        v-if="showResetButton"
        type="button"
        class="btn btn-outline-secondary me-2"
        @click="handleReset"
        :disabled="isSubmitting"
      >
        <i class="fa fa-undo me-1"></i>
        重置
      </button>
      <button
        v-if="showSubmitButton"
        type="button"
        class="btn btn-theme"
        @click="handleSubmit"
        :disabled="isSubmitting"
      >
        <i
          class="fa me-1"
          :class="{
            'fa-spin fa-spinner': isSubmitting,
            'fa-save': !isSubmitting,
          }"
        ></i>
        {{ isSubmitting ? "處理中..." : submitButtonText }}
      </button>
    </div>
  </div>
</template>
