<script>
import toastService from '@/components/bootstrap/ToastService.js';
import { useProjectStore } from '@/stores/project';

export default {
  name: 'ExportCenter',
  data() {
    return {
      activeTab: 'scenario', // scenario, custom, history
      isExporting: false,
      showPreview: false,
      
      // 情境式匯出
      scenarios: [
        {
          id: 'acceptance-inspection',
          name: '工程驗收報告',
          description: '包含工程完工驗收所需的完整文件',
          icon: 'fa-clipboard-check',
          color: 'success',
          forms: ['工程基本資料', '驗收清單', '品質檢查表', '安全評估', '財務結算'],
          estimatedTime: '2-3分鐘'
        },
        {
          id: 'progress-report',
          name: '施工進度報告',
          description: '定期施工進度追蹤與管控報告',
          icon: 'fa-chart-line',
          color: 'info',
          forms: ['工程基本資料', '進度統計', '里程碑追蹤', '資源使用狀況'],
          estimatedTime: '1-2分鐘'
        },
        {
          id: 'quality-control',
          name: '品質管制報告',
          description: '工程品質管控與檢測相關文件',
          icon: 'fa-medal',
          color: 'warning',
          forms: ['工程基本資料', '品質檢測紀錄', '材料檢驗', '施工品質評估'],
          estimatedTime: '2-4分鐘'
        },
        {
          id: 'safety-report',
          name: '安全檢查報告',
          description: '工地安全檢查與事故預防報告',
          icon: 'fa-hard-hat',
          color: 'danger',
          forms: ['工程基本資料', '安全檢查清單', '事故報告', '安全教育訓練'],
          estimatedTime: '1-3分鐘'
        },
        {
          id: 'financial-summary',
          name: '財務結算報告',
          description: '工程財務支出與結算明細',
          icon: 'fa-calculator',
          color: 'primary',
          forms: ['工程基本資料', '預算執行', '付款明細', '成本分析'],
          estimatedTime: '2-5分鐘'
        },
        {
          id: 'supervision-report',
          name: '監造報告',
          description: '監造單位定期監督與檢查報告',
          icon: 'fa-eye',
          color: 'secondary',
          forms: ['工程基本資料', '監造日誌', '缺失改善', '工程查核'],
          estimatedTime: '3-5分鐘'
        }
      ],
      
      selectedScenario: null,
      
      // 自定義選擇
      availableForms: [
        { id: 'A-1', name: '工程基本資料表', category: '基本資料', required: true },
        { id: 'A-2', name: '營造廠商資訊表', category: '基本資料', required: false },
        { id: 'A-3', name: '監造單位資訊表', category: '基本資料', required: false },
        { id: 'B-1', name: '施工進度管制表', category: '進度管控', required: false },
        { id: 'B-2', name: '里程碑追蹤表', category: '進度管控', required: false },
        { id: 'B-3', name: '資源調配表', category: '進度管控', required: false },
        { id: 'C-1', name: '品質檢測紀錄表', category: '品質管制', required: false },
        { id: 'C-2', name: '材料檢驗報告', category: '品質管制', required: false },
        { id: 'C-3', name: '施工品質評估表', category: '品質管制', required: false },
        { id: 'D-1', name: '安全檢查清單', category: '安全管制', required: false },
        { id: 'D-2', name: '事故報告表', category: '安全管制', required: false },
        { id: 'D-3', name: '安全教育訓練記錄', category: '安全管制', required: false },
        { id: 'E-1', name: '預算執行表', category: '財務管理', required: false },
        { id: 'E-2', name: '付款明細表', category: '財務管理', required: false },
        { id: 'E-3', name: '成本分析報告', category: '財務管理', required: false },
        { id: 'F-1', name: '監造日誌', category: '監造管理', required: false },
        { id: 'F-2', name: '缺失改善追蹤表', category: '監造管理', required: false },
        { id: 'F-3', name: '工程查核表', category: '監造管理', required: false }
      ],
      
      selectedForms: [],
      searchKeyword: '',
      selectedCategory: 'all',
      
      // 匯出設定
      exportSettings: {
        format: 'xlsx', // xlsx, pdf, docx, csv
        includeCharts: true,
        includeImages: true,
        includeComments: false,
        compress: false,
        passwordProtect: false,
        password: '',
        fileName: '',
        templateStyle: 'standard' // standard, professional, minimal
      },
      
      // 匯出歷史
      exportHistory: [
        {
          id: 1,
          fileName: '工程驗收報告_2024-01-15.xlsx',
          type: '情境匯出',
          scenario: '工程驗收報告',
          createTime: '2024-01-15 14:30:25',
          fileSize: '2.5 MB',
          status: 'completed',
          downloadUrl: '#'
        },
        {
          id: 2,
          fileName: '自定義表單_A1-C3_2024-01-14.pdf',
          type: '自定義匯出',
          scenario: '工程基本資料表, 施工品質評估表',
          createTime: '2024-01-14 09:15:42',
          fileSize: '1.8 MB',
          status: 'completed',
          downloadUrl: '#'
        },
        {
          id: 3,
          fileName: '施工進度報告_2024-01-13.docx',
          type: '情境匯出',
          scenario: '施工進度報告',
          createTime: '2024-01-13 16:22:18',
          fileSize: '3.2 MB',
          status: 'completed',
          downloadUrl: '#'
        }
      ],
      
      previewData: null,
      exportProgress: 0
    }
  },
  computed: {
    projectStore() {
      return useProjectStore();
    },
    
    filteredForms() {
      let forms = this.availableForms;
      
      // 依分類篩選
      if (this.selectedCategory !== 'all') {
        forms = forms.filter(form => form.category === this.selectedCategory);
      }
      
      // 依關鍵字搜尋
      if (this.searchKeyword.trim()) {
        const keyword = this.searchKeyword.toLowerCase();
        forms = forms.filter(form => 
          form.name.toLowerCase().includes(keyword) ||
          form.id.toLowerCase().includes(keyword)
        );
      }
      
      return forms;
    },
    
    formCategories() {
      const categories = [...new Set(this.availableForms.map(form => form.category))];
      return categories;
    },
    
    selectedFormsCount() {
      return this.selectedForms.length;
    },
    
    canExport() {
      if (this.activeTab === 'scenario') {
        return this.selectedScenario !== null;
      } else if (this.activeTab === 'custom') {
        return this.selectedForms.length > 0;
      }
      return false;
    }
  },
  methods: {
    // 切換頁籤
    setActiveTab(tab) {
      this.activeTab = tab;
      this.resetSelections();
    },
    
    // 重置選擇
    resetSelections() {
      this.selectedScenario = null;
      this.selectedForms = [];
      this.searchKeyword = '';
      this.selectedCategory = 'all';
    },
    
    // 選擇情境
    selectScenario(scenario) {
      this.selectedScenario = scenario;
    },
    
    // 切換表單選擇
    toggleForm(form) {
      const index = this.selectedForms.findIndex(f => f.id === form.id);
      if (index > -1) {
        this.selectedForms.splice(index, 1);
      } else {
        this.selectedForms.push(form);
      }
    },
    
    // 檢查表單是否被選中
    isFormSelected(form) {
      return this.selectedForms.some(f => f.id === form.id);
    },
    
    // 全選分類
    selectAllInCategory() {
      const categoryForms = this.filteredForms.filter(form => 
        !this.selectedForms.some(selected => selected.id === form.id)
      );
      this.selectedForms.push(...categoryForms);
    },
    
    // 清除分類選擇
    clearCategorySelection() {
      const categoryFormIds = this.filteredForms.map(form => form.id);
      this.selectedForms = this.selectedForms.filter(form => 
        !categoryFormIds.includes(form.id)
      );
    },
    
    // 預覽匯出內容
    async previewExport() {
      this.showPreview = true;
      
      // 模擬載入預覽資料
      try {
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        if (this.activeTab === 'scenario') {
          this.previewData = {
            type: 'scenario',
            title: this.selectedScenario.name,
            forms: this.selectedScenario.forms,
            totalPages: Math.floor(Math.random() * 20) + 10
          };
        } else {
          this.previewData = {
            type: 'custom',
            title: '自定義匯出',
            forms: this.selectedForms.map(f => f.name),
            totalPages: Math.floor(Math.random() * 15) + 5
          };
        }
        
      } catch (error) {
        toastService.error('預覽載入失敗');
        this.showPreview = false;
      }
    },
    
    // 開始匯出
    async startExport() {
      if (!this.canExport) {
        toastService.warning('請先選擇要匯出的內容');
        return;
      }
      
      // 生成檔案名稱
      if (!this.exportSettings.fileName) {
        const now = new Date();
        const dateStr = now.toISOString().split('T')[0];
        if (this.activeTab === 'scenario') {
          this.exportSettings.fileName = `${this.selectedScenario.name}_${dateStr}`;
        } else {
          this.exportSettings.fileName = `自定義表單_${dateStr}`;
        }
      }
      
      this.isExporting = true;
      this.exportProgress = 0;
      
      try {
        // 模擬匯出進度
        const progressInterval = setInterval(() => {
          this.exportProgress += Math.random() * 15;
          if (this.exportProgress >= 100) {
            this.exportProgress = 100;
            clearInterval(progressInterval);
          }
        }, 200);
        
        // 模擬匯出過程
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // 添加到匯出歷史
        const newExport = {
          id: this.exportHistory.length + 1,
          fileName: `${this.exportSettings.fileName}.${this.exportSettings.format}`,
          type: this.activeTab === 'scenario' ? '情境匯出' : '自定義匯出',
          scenario: this.activeTab === 'scenario' ? 
            this.selectedScenario.name : 
            this.selectedForms.slice(0, 2).map(f => f.name).join(', ') + (this.selectedForms.length > 2 ? '...' : ''),
          createTime: new Date().toLocaleString('zh-TW'),
          fileSize: `${(Math.random() * 3 + 1).toFixed(1)} MB`,
          status: 'completed',
          downloadUrl: '#'
        };
        
        this.exportHistory.unshift(newExport);
        
        toastService.success(`匯出完成！檔案：${newExport.fileName}`);
        this.resetSelections();
        
      } catch (error) {
        toastService.error('匯出失敗，請重試');
      } finally {
        this.isExporting = false;
        this.exportProgress = 0;
      }
    },
    
    // 下載歷史檔案
    downloadHistoryFile(item) {
      toastService.info(`開始下載：${item.fileName}`);
      // 這裡可以實現實際的下載邏輯
    },
    
    // 刪除歷史記錄
    deleteHistoryItem(item) {
      const index = this.exportHistory.findIndex(h => h.id === item.id);
      if (index > -1) {
        this.exportHistory.splice(index, 1);
        toastService.success('歷史記錄已刪除');
      }
    },
    
    // 格式化檔案大小
    formatFileSize(size) {
      return size;
    },
    
    // 獲取狀態樣式
    getStatusColor(status) {
      const colors = {
        completed: 'badge border border-success text-success px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
        processing: 'badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center',
        failed: 'badge border border-danger text-danger px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center'
      };
      return colors[status] || 'badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center';
    }
  }
}
</script>

<template>
  <PageHeader
    title="匯出中心"
    icon="fa fa-download"
    :breadcrumbs="[
      { text: '表單生成與管理', href: 'javascript:;' },
      { text: '匯出中心', active: true }
    ]"
  />

  <div class="row gx-4">
    <div class="col-lg-12">
             <!-- 功能頁籤 -->
       <card>
         <card-header>
          <ul class="nav nav-tabs card-header-tabs" role="tablist">
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'scenario' }"
                @click="setActiveTab('scenario')"
                type="button"
              >
                <i class="fa fa-clipboard-list me-2"></i>
                情境匯出
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'custom' }"
                @click="setActiveTab('custom')"
                type="button"
              >
                <i class="fa fa-sliders-h me-2"></i>
                自定義匯出
              </button>
            </li>
            <li class="nav-item" role="presentation">
              <button 
                class="nav-link" 
                :class="{ active: activeTab === 'history' }"
                @click="setActiveTab('history')"
                type="button"
              >
                <i class="fa fa-history me-2"></i>
                匯出歷史
                <span class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center ms-1">{{ exportHistory.length }}</span>
              </button>
            </li>
                     </ul>
         </card-header>
 
         <card-body>
          <!-- 情境匯出 -->
          <div v-if="activeTab === 'scenario'" class="tab-pane-content">
            <div class="row mb-4">
              <div class="col-lg-12">
                <h5 class="mb-3">選擇匯出情境</h5>
                <p class="text-muted mb-4">根據不同的工程管理需求，選擇預設的表單組合進行匯出</p>
              </div>
            </div>

            <div class="row">
              <div 
                v-for="scenario in scenarios" 
                :key="scenario.id"
                class="col-lg-6 mb-4"
              >
                                 <card 
                   class="h-100 cursor-pointer scenario-card"
                   :class="{ 'border-theme': selectedScenario?.id === scenario.id }"
                   @click="selectScenario(scenario)"
                 >
                   <card-body>
                    <div class="d-flex align-items-start mb-3">
                      <div class="flex-shrink-0">
                        <div class="widget-icon rounded" :class="`bg-${scenario.color}`">
                          <i class="fa" :class="scenario.icon" style="color: white;"></i>
                        </div>
                      </div>
                      <div class="flex-grow-1 ms-3">
                        <h6 class="card-title mb-1">{{ scenario.name }}</h6>
                        <p class="card-text text-muted small">{{ scenario.description }}</p>
                      </div>
                      <div class="flex-shrink-0">
                        <i 
                          class="fa fa-check-circle text-success fs-4" 
                          v-if="selectedScenario?.id === scenario.id"
                        ></i>
                      </div>
                    </div>
                    
                    <div class="mb-3">
                      <small class="text-muted">包含表單：</small>
                      <div class="mt-1">
                        <span 
                          v-for="(form, index) in scenario.forms" 
                          :key="index"
                          class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1 mb-1"
                        >
                          {{ form }}
                        </span>
                      </div>
                    </div>
                    
                    <div class="d-flex justify-content-between align-items-center">
                      <small class="text-muted">
                        <i class="fa fa-clock me-1"></i>
                        預估時間：{{ scenario.estimatedTime }}
                      </small>
                    </div>
                  </card-body>
                </card>
              </div>
            </div>
          </div>

          <!-- 自定義匯出 -->
          <div v-if="activeTab === 'custom'" class="tab-pane-content">
            <!-- 搜尋和篩選 -->
            <div class="row mb-4">
              <div class="col-lg-6">
                <label class="form-label">搜尋表單</label>
                <div class="input-group">
                  <span class="input-group-text"><i class="fa fa-search"></i></span>
                  <input 
                    type="text" 
                    class="form-control" 
                    v-model="searchKeyword"
                    placeholder="搜尋表單名稱或編號..."
                  >
                </div>
              </div>
              <div class="col-lg-4">
                <label class="form-label">表單分類</label>
                <select class="form-select" v-model="selectedCategory">
                  <option value="all">全部分類</option>
                  <option 
                    v-for="category in formCategories" 
                    :key="category" 
                    :value="category"
                  >
                    {{ category }}
                  </option>
                </select>
              </div>
              <div class="col-lg-2">
                <label class="form-label">批量操作</label>
                <div class="btn-group w-100">
                  <button 
                    type="button" 
                    class="btn btn-outline-theme btn-sm"
                    @click="selectAllInCategory"
                  >
                    全選
                  </button>
                  <button 
                    type="button" 
                    class="btn btn-outline-secondary btn-sm"
                    @click="clearCategorySelection"
                  >
                    清除
                  </button>
                </div>
              </div>
            </div>

            <!-- 已選擇的表單 -->
            <div v-if="selectedFormsCount > 0" class="alert alert-info" role="alert">
              <div class="d-flex align-items-center justify-content-between">
                <div>
                  <i class="fa fa-info-circle me-2"></i>
                  已選擇 <strong>{{ selectedFormsCount }}</strong> 個表單
                </div>
                <button 
                  type="button" 
                  class="btn btn-sm btn-outline-secondary"
                  @click="selectedForms = []"
                >
                  清除全部
                </button>
              </div>
              <div class="mt-2">
                <span 
                  v-for="form in selectedForms" 
                  :key="form.id"
                  class="badge border border-primary text-primary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1 mb-1"
                >
                  {{ form.id }} - {{ form.name }}
                  <button 
                    type="button" 
                    class="btn-close btn-close-white ms-1"
                    @click="toggleForm(form)"
                    style="font-size: 0.6rem;"
                  ></button>
                </span>
              </div>
            </div>

            <!-- 表單列表 -->
            <div class="row">
              <div 
                v-for="form in filteredForms" 
                :key="form.id"
                class="col-lg-6 col-xl-4 mb-3"
              >
                <card 
                  class="h-100 cursor-pointer form-card"
                  :class="{ 
                    'border-theme': isFormSelected(form),
                    'border-warning': form.required 
                  }"
                  @click="toggleForm(form)"
                >
                  <card-body class="p-3">
                    <div class="d-flex align-items-start">
                      <div class="flex-grow-1">
                        <div class="d-flex align-items-center mb-2">
                          <span class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-2">{{ form.id }}</span>
                          <span 
                            v-if="form.required" 
                            class="badge border border-warning text-warning px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-2"
                          >
                            必選
                          </span>
                          <i 
                            class="fa fa-check-circle text-success" 
                            v-if="isFormSelected(form)"
                          ></i>
                        </div>
                        <h6 class="card-title mb-1">{{ form.name }}</h6>
                        <small class="text-muted">{{ form.category }}</small>
                      </div>
                    </div>
                  </card-body>
                </card>
              </div>
            </div>

            <div v-if="filteredForms.length === 0" class="text-center py-5">
              <i class="fa fa-search fa-3x text-muted mb-3"></i>
              <h5 class="text-muted">找不到符合條件的表單</h5>
              <p class="text-muted">請嘗試調整搜尋條件或分類篩選</p>
            </div>
          </div>

          <!-- 匯出歷史 -->
          <div v-if="activeTab === 'history'" class="tab-pane-content">
            <div class="d-flex justify-content-between align-items-center mb-4">
              <h5 class="mb-0">匯出歷史記錄</h5>
              <div class="text-muted">
                共 {{ exportHistory.length }} 筆記錄
              </div>
            </div>

            <div class="table-responsive">
              <table class="table table-hover">
                <thead class="table-light">
                  <tr>
                    <th>檔案名稱</th>
                    <th>匯出類型</th>
                    <th>包含內容</th>
                    <th>建立時間</th>
                    <th>檔案大小</th>
                    <th>狀態</th>
                    <th>操作</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in exportHistory" :key="item.id">
                    <td>
                      <div class="d-flex align-items-center">
                        <i class="fa fa-file-alt me-2 text-muted"></i>
                        <strong>{{ item.fileName }}</strong>
                      </div>
                    </td>
                    <td>
                      <span class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center">{{ item.type }}</span>
                    </td>
                    <td>
                      <small class="text-muted">{{ item.scenario }}</small>
                    </td>
                    <td>
                      <small>{{ item.createTime }}</small>
                    </td>
                    <td>
                      <small>{{ item.fileSize }}</small>
                    </td>
                    <td>
                      <span 
                        :class="getStatusColor(item.status)"
                      >
                        {{ item.status === 'completed' ? '已完成' : item.status }}
                      </span>
                    </td>
                    <td>
                      <div class="">
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-theme me-1"
                          @click="downloadHistoryFile(item)"
                          :disabled="item.status !== 'completed'"
                        >
                          <i class="fa fa-download"></i>
                        </button>
                        <button 
                          type="button" 
                          class="btn btn-sm btn-outline-danger"
                          @click="deleteHistoryItem(item)"
                        >
                          <i class="fa fa-trash"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div v-if="exportHistory.length === 0" class="text-center py-5">
              <i class="fa fa-history fa-3x text-muted mb-3"></i>
              <h5 class="text-muted">尚無匯出歷史</h5>
              <p class="text-muted">開始使用匯出功能後，歷史記錄將顯示在這裡</p>
            </div>
                     </div>
         </card-body>
       </card>
 
              <!-- 匯出設定和操作區 -->
       <card v-if="activeTab !== 'history'" class="mt-4">
         <card-header>
           <h5 class="mb-0">匯出設定</h5>
         </card-header>
         <card-body>
          <div class="row">
            <!-- 基本設定 -->
            <div class="col-lg-4">
              <h6 class="mb-3">基本設定</h6>
              <div class="mb-3">
                <label class="form-label">匯出格式</label>
                <select class="form-select" v-model="exportSettings.format">
                  <option value="xlsx">Excel 檔案 (.xlsx)</option>
                  <option value="pdf">PDF 文件 (.pdf)</option>
                  <option value="docx">Word 文件 (.docx)</option>
                  <option value="csv">CSV 檔案 (.csv)</option>
                </select>
              </div>
              <div class="mb-3">
                <label class="form-label">檔案名稱</label>
                <input 
                  type="text" 
                  class="form-control" 
                  v-model="exportSettings.fileName"
                  placeholder="系統將自動生成檔名"
                >
              </div>
              <div class="mb-3">
                <label class="form-label">樣板風格</label>
                <select class="form-select" v-model="exportSettings.templateStyle">
                  <option value="standard">標準樣板</option>
                  <option value="professional">專業樣板</option>
                  <option value="minimal">簡約樣板</option>
                </select>
              </div>
            </div>

            <!-- 進階選項 -->
            <div class="col-lg-4">
              <h6 class="mb-3">進階選項</h6>
              <div class="form-check mb-2">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  v-model="exportSettings.includeCharts"
                  id="includeCharts"
                >
                <label class="form-check-label" for="includeCharts">
                  包含圖表
                </label>
              </div>
              <div class="form-check mb-2">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  v-model="exportSettings.includeImages"
                  id="includeImages"
                >
                <label class="form-check-label" for="includeImages">
                  包含圖片
                </label>
              </div>
              <div class="form-check mb-2">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  v-model="exportSettings.includeComments"
                  id="includeComments"
                >
                <label class="form-check-label" for="includeComments">
                  包含註解
                </label>
              </div>
              <div class="form-check mb-2">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  v-model="exportSettings.compress"
                  id="compress"
                >
                <label class="form-check-label" for="compress">
                  檔案壓縮
                </label>
              </div>
            </div>

            <!-- 安全設定 -->
            <div class="col-lg-4">
              <h6 class="mb-3">安全設定</h6>
              <div class="form-check mb-3">
                <input 
                  class="form-check-input" 
                  type="checkbox" 
                  v-model="exportSettings.passwordProtect"
                  id="passwordProtect"
                >
                <label class="form-check-label" for="passwordProtect">
                  密碼保護
                </label>
              </div>
              <div v-if="exportSettings.passwordProtect" class="mb-3">
                <label class="form-label">設定密碼</label>
                <input 
                  type="password" 
                  class="form-control" 
                  v-model="exportSettings.password"
                  placeholder="請輸入檔案密碼"
                >
              </div>
            </div>
          </div>

          <!-- 操作按鈕 -->
          <div class="d-flex justify-content-between align-items-center mt-4 pt-3 border-top">
            <div class="text-muted">
              <span v-if="activeTab === 'scenario' && selectedScenario">
                已選擇：{{ selectedScenario.name }}
              </span>
              <span v-else-if="activeTab === 'custom' && selectedFormsCount > 0">
                已選擇 {{ selectedFormsCount }} 個表單
              </span>
              <span v-else class="text-warning">
                請先選擇要匯出的內容
              </span>
            </div>
            
            <div class="btn-group">
              <button 
                type="button" 
                class="btn btn-outline-theme"
                @click="previewExport"
                :disabled="!canExport || isExporting"
              >
                <i class="fa fa-eye me-1"></i>
                預覽
              </button>
              <button 
                type="button" 
                class="btn btn-theme"
                @click="startExport"
                :disabled="!canExport || isExporting"
              >
                <i class="fa me-1" :class="{ 'fa-spin fa-spinner': isExporting, 'fa-download': !isExporting }"></i>
                {{ isExporting ? '匯出中...' : '開始匯出' }}
              </button>
            </div>
          </div>

          <!-- 匯出進度 -->
          <div v-if="isExporting" class="mt-3">
            <div class="d-flex justify-content-between align-items-center mb-2">
              <span>匯出進度</span>
              <span>{{ Math.round(exportProgress) }}%</span>
            </div>
            <div class="progress">
              <div 
                class="progress-bar progress-bar-striped progress-bar-animated" 
                :style="{ width: exportProgress + '%' }"
              ></div>
            </div>
          </div>
        </card-body>
      </card>
    </div>
  </div>

  <!-- 預覽Modal -->
  <div class="modal fade" :class="{ 'show': showPreview }" :style="{ display: showPreview ? 'block' : 'none' }" tabindex="-1">
    <div class="modal-dialog modal-lg modal-dialog-centered">
      <div class="modal-content">
        <div class="modal-header">
          <h5 class="modal-title">
            <i class="fa fa-eye me-2"></i>
            匯出預覽
          </h5>
          <button type="button" class="btn-close" @click="showPreview = false"></button>
        </div>
        
        <div class="modal-body" v-if="previewData">
          <div class="alert alert-info" role="alert">
            <i class="fa fa-info-circle me-2"></i>
            預覽僅顯示匯出內容概要，實際檔案將包含完整資料
          </div>
          
          <div class="row mb-3">
            <div class="col-6">
              <strong>匯出標題：</strong>{{ previewData.title }}
            </div>
            <div class="col-6">
              <strong>預估頁數：</strong>{{ previewData.totalPages }} 頁
            </div>
          </div>
          
          <div class="mb-3">
            <strong>包含表單：</strong>
            <div class="mt-2">
              <span 
                v-for="(form, index) in previewData.forms" 
                :key="index"
                class="badge border border-secondary text-secondary px-2 pt-5px pb-5px rounded fs-12px d-inline-flex align-items-center me-1 mb-1"
              >
                {{ form }}
              </span>
            </div>
          </div>
          
          <div class="border rounded p-3 bg-light">
            <h6>檔案結構預覽</h6>
            <ul class="list-unstyled mb-0">
              <li v-for="(form, index) in previewData.forms" :key="index" class="mb-1">
                <i class="fa fa-file-alt me-2 text-muted"></i>
                {{ form }}
              </li>
            </ul>
          </div>
        </div>
        
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" @click="showPreview = false">
            關閉
          </button>
          <button type="button" class="btn btn-theme" @click="showPreview = false; startExport()">
            <i class="fa fa-download me-1"></i>
            確認匯出
          </button>
        </div>
      </div>
    </div>
  </div>
  
  <!-- Modal backdrop -->
  <div v-if="showPreview" class="modal-backdrop fade show" @click="showPreview = false"></div>
</template>

<style scoped>
.scenario-card {
  transition: all 0.2s ease;
}

.scenario-card:hover {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.form-card {
  transition: all 0.2s ease;
}

.form-card:hover {
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

.widget-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.tab-pane-content {
  min-height: 400px;
}

.modal {
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
