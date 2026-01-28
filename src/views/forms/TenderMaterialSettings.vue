<script lang="ts">
import { defineComponent, onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// import { useProjectStore } from '@/stores/project'; // 假設有 project store 可以取得當前專案資訊
import { tenderMaterialApi, type MaterialItem, type UpdateMaterialDetailRequest, type MaterialDetail } from '@/api/tenderMaterial';
import toastService from '@/components/bootstrap/ToastService.js';
import { debounce, throttle } from 'lodash';
// 引入 Store 與 API
import { useWorkspaceStore } from '@/stores/workspace';
import { getContractVersions, type ContractVersion } from '@/api/pcces';
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue';

export default defineComponent({
  name: 'TenderMaterialSettings',
  components: {
    RepublicDatePicker
  },
  setup() {
    const route = useRoute();
    const router = useRouter();
    const workspaceStore = useWorkspaceStore();
    
    // Throttled success toast to prevent spam (max once every 3 seconds)
    const showSuccessToast = throttle(() => {
      toastService.success('儲存成功');
    }, 3000, { trailing: false });

    // 狀態變數
    
    // 狀態變數
    const materials = ref<MaterialItem[]>([]);
    const isLoading = ref(false);
    const savingStatus = ref<{[key: number]: string}>({}); 
    const keyword = ref('');
    
    // 搜尋過濾
    const filteredMaterials = computed(() => {
      if (!keyword.value) return materials.value;
      const k = keyword.value.toLowerCase().trim();
      return materials.value.filter(item => 
        item.pccesCode?.toLowerCase().includes(k) || 
        item.name?.toLowerCase().includes(k) ||
        item.itemNo?.toLowerCase().includes(k)
      );
    });

    // 分組介面
    interface MaterialGroup {
      pccesCode: string;
      name: string;
      unit: string;
      items: MaterialItem[];
      detail: MaterialDetail; // Bind to the first item's detail
    }

    // 分組邏輯
    const groupedMaterials = computed(() => {
      const groups: MaterialGroup[] = [];
      const map = new Map<string, MaterialGroup>();

      filteredMaterials.value.forEach(item => {
        const code = item.pccesCode || 'unknown'; 
        
        if (!map.has(code)) {
          const group: MaterialGroup = {
            pccesCode: item.pccesCode || '',
            name: item.name,
            unit: item.unit || '',
            items: [],
            detail: item.detail 
          };
          map.set(code, group);
          groups.push(group);
        }
        
        map.get(code)!.items.push(item);
      });

      return groups;
    });

    // 從 WorkspaceStore 取得當前專案 ID
    const constructionId = computed(() => workspaceStore.currentProject?.id || '');
    
    // 版本狀態
    const versions = ref<ContractVersion[]>([]);
    const currentVersionId = ref<string | number>('');

    // 載入版本列表並自動選擇最新版本
    const loadVersionsAndMaterials = async () => {
      if (!constructionId.value) {
        toastService.warning('請先選擇工程項目');
        return;
      }

      isLoading.value = true;
      try {
        const _versions = await getContractVersions(constructionId.value);
        versions.value = _versions;

        // Auto selection
        if (_versions.length > 0) {
          // Assuming the first one is the latest or default
          currentVersionId.value = _versions[0].id;
        } else {
          toastService.warning('查無此案件的合約版本資料');
          isLoading.value = false;
          return;
        }
        
        // Fetch materials
        if (currentVersionId.value) {
          materials.value = await tenderMaterialApi.getMaterialList(constructionId.value, currentVersionId.value);
        }

      } catch (error) {
        console.error('Error fetching data:', error);
        toastService.error('載入資料失敗');
      } finally {
        isLoading.value = false;
      }
    };

    // 載入材料列表
    const fetchMaterials = async () => {
      if (!constructionId.value || !currentVersionId.value) return;
      
      isLoading.value = true;
      try {
        const response = await tenderMaterialApi.getMaterialList(constructionId.value, currentVersionId.value);
        materials.value = response;
      } catch (error) {
        console.error('Error fetching materials:', error);
        toastService.error('載入材料列表失敗');
        materials.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    // 監聽專案變更，重新載入
    watch(() => constructionId.value, (newVal) => {
      if (newVal) {
        materials.value = [];
        loadVersionsAndMaterials();
      } else {
        materials.value = [];
        versions.value = [];
        currentVersionId.value = '';
      }
    });

    // 儲存邏輯 (Debounced)
    const saveItem = async (item: MaterialItem) => {
      const id = item.id;
      savingStatus.value[id] = 'saving';
      
      try {
        if (savingStatus.value[id] === 'saving') { 
          // 保存當前編輯的值，避免被後端返回的資料覆蓋
          const currentDetail = { ...item.detail };
          
          // Update API requires pccesCode and contractVersionId
          const result = await tenderMaterialApi.updateMaterialDetail({
            pccesCode: item.pccesCode || '',
            contractVersionId: currentVersionId.value,
            detail: { ...currentDetail }
          });
          
          // 只更新必要的後端欄位（id, updatedAt），保留用戶正在編輯的欄位值
          if (result.id !== null && result.id !== undefined) {
            item.detail.id = result.id;
          }
          if (result.updatedAt !== undefined) {
            item.detail.updatedAt = result.updatedAt;
          }
          
          // Also update other items with same pccesCode if necessary (frontend sync)
          // 同樣只更新必要的欄位，保留用戶正在編輯的值
          if (item.pccesCode) {
             materials.value.forEach(m => {
                if (m.pccesCode === item.pccesCode && m.id !== item.id) {
                    // 同步更新相同 pccesCode 的其他項目，但只更新必要的欄位
                    if (result.id !== null && result.id !== undefined) {
                      m.detail.id = result.id;
                    }
                    if (result.updatedAt !== undefined) {
                      m.detail.updatedAt = result.updatedAt;
                    }
                    // 同步其他欄位（因為同一個 pccesCode 應該共享設定）
                    m.detail.isSamplingTest = currentDetail.isSamplingTest;
                    m.detail.isFactoryInspection = currentDetail.isFactoryInspection;
                    m.detail.hasSubcontractorData = currentDetail.hasSubcontractorData;
                    m.detail.hasCatalog = currentDetail.hasCatalog;
                    m.detail.hasTestReport = currentDetail.hasTestReport;
                    m.detail.hasSample = currentDetail.hasSample;
                    m.detail.hasOther = currentDetail.hasOther;
                    m.detail.plannedSubmissionDate = currentDetail.plannedSubmissionDate;
                    m.detail.plannedArrivalDate = currentDetail.plannedArrivalDate;
                }
             });
          }

          delete savingStatus.value[id];
          
          // Use throttled success toast
          showSuccessToast();
        }
      } catch (error) {
        console.error('Error saving item:', error);
        delete savingStatus.value[id];
        toastService.error('儲存失敗');
      }
    };

    // 針對文字欄位使用 Debounce
    const debouncedSaveMap = new Map();
    const handleTextChange = (item: MaterialItem) => {
      const id = item.id;
      if (!debouncedSaveMap.has(id)) {
        debouncedSaveMap.set(id, debounce((itm: MaterialItem) => saveItem(itm), 800));
      }
      savingStatus.value[id] = 'saving...'; // User typing visual feedback
      debouncedSaveMap.get(id)(item);
    };
    
    // Checkbox 直接觸發儲存
    const handleCheckboxChange = (item: MaterialItem) => {
       saveItem(item);
    };

    onMounted(() => {
      if (constructionId.value) {
        loadVersionsAndMaterials();
      }
    });

    return {
      materials,
      filteredMaterials,
      keyword,
      isLoading,
      savingStatus,
      handleTextChange,
      handleCheckboxChange,
      saveItem,
      fetchMaterials: loadVersionsAndMaterials, // Expose as fetchMaterials for the refresh button
      groupedMaterials,
      goToQualityControl: (pccesCode: string) => {
        if (pccesCode) {
           // Encode just in case, though pccesCode is usually safe
           router.push({
             path: `/forms/tender-material-settings/${pccesCode}/quality-control`,
             query: { versionId: currentVersionId.value }
           });
        } else {
           toastService.warning('此項目無 PCCES 編碼，無法進入管控表設定');
        }
      }
    };
  }
});
</script>

<template>
  <PageHeader
    title="標單材料設定"
    :breadcrumbs="[
      { text: '表單生成與管理', href: 'javascript:;' },
      { text: '標單材料設定', active: true }
    ]"
  />

  <div class="row">
    <div class="col-xl-12">
      <div class="card border-0 shadow-sm bg-body">
        <div class="card-body">
          <!-- 資料來源提示 -->
          <div class="alert alert-info mb-4">
            <h5 class="alert-heading">
              <i class="fa fa-info-circle me-2"></i>資料來源說明
            </h5>
            <p class="mb-2">
              此頁面的材料資料來源自 <strong>工程項目標單</strong>（PCCES 工項資料）。
              系統會自動從工程項目標單中取出<strong>材料類別</strong>的項目顯示於此。
            </p>
            <p class="mb-0">
              如需新增或修改材料項目，請前往
              <router-link to="/basic/project-item-database" class="alert-link">
                <i class="fa fa-arrow-right me-1"></i>工程項目標單
              </router-link>
              頁面進行設定。
            </p>
          </div>

          <!-- Toolbar -->
          <div class="d-flex justify-content-between align-items-center mb-3">
             <div class="flex-grow-1 me-3">
               <div class="input-group">
                 <span class="input-group-text bg-transparent border-end-0 pe-2"><i class="fa fa-search text-muted"></i></span>
                 <input 
                   type="text" 
                   class="form-control shadow-none bg-transparent" 
                   placeholder="搜尋項次、工項編碼或材料名稱..." 
                   v-model="keyword"
                 >
               </div>
             </div>
             <button class="btn btn-outline-secondary text-nowrap" @click="fetchMaterials">
               <i class="fa fa-sync me-1"></i>重新整理
             </button>
          </div>
        
          <div v-if="isLoading" class="p-5 text-center">
            <i class="fas fa-spinner fa-spin fa-2x text-muted"></i>
            <p class="mt-2 text-muted">載入中...</p>
          </div>
          
          <div v-else class="card h-100 border-0 rounded-0">
            <!-- ... options ... -->
            <div class="card-body p-0">
              <div class="table-responsive h-100">
                <table class="table table-hover align-middle mb-0" style="min-width: 1000px;">
                  <thead class="sticky-top bg-body border-bottom">
                    <tr>
                      <th class="text-center" style="width: 80px;">項次</th>
                      <th style="width: 120px;">工項編碼</th>
                      <th style="min-width: 200px;">材料名稱/數量</th>
                      <th style="width: 200px;">預定進場日期</th>
                      <th class="text-center" style="width: 100px;">取樣試驗</th>
                      <th style="width: 150px;">預定送審日期</th>
                      <th class="text-center" style="width: 100px;">驗廠</th>
                      <th style="min-width: 300px;">送審資料</th>
                      <th class="text-center" style="width: 160px;">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="groupedMaterials.length === 0">
                      <td colspan="9" class="text-center py-4 text-muted">
                        {{ materials.length === 0 ? '目前尚無資料' : '查無符合條件的資料' }}
                      </td>
                    </tr>
                    <tr v-for="group in groupedMaterials" :key="group.pccesCode">
                      <!-- 項次 (多筆) -->
                      <td class="text-center">
                        <div v-for="item in group.items" :key="item.id" class="small text-muted mb-1 last-mb-0">
                          {{ item.itemNo }}
                        </div>
                      </td>
                      <!-- 編碼 -->
                      <td class="font-monospace fw-bold">{{ group.pccesCode }}</td>
                      <!-- 材料名稱 & 數量 (多筆) -->
                      <td>
                        <div class="fw-bolder fs-6 mb-2">{{ group.name }}</div>
                        <div v-for="item in group.items" :key="item.id" class="fw-bold opacity-75 small mb-1 last-mb-0">
                           {{ item.quantity }} {{ item.unit }}
                        </div>
                      </td>
                      
                      <!-- 預定進場日期 -->
                      <td>
                        <div class="border rounded bg-body d-flex align-items-center w-100" style="min-height: 38px;">
                            <RepublicDatePicker
                              v-model="group.detail.plannedArrivalDate"
                              placeholder="請選擇"
                              @update:model-value="saveItem(group.items[0])"
                              input-class="form-control-sm border-0 shadow-none w-100 h-100"
                              class="w-100 border-0"
                              :hide-icon="true"
                            />
                        </div>
                      </td>

                      <!-- Checkboxes bind to group.detail (effectively the first item's detail) -->
                      <!-- Because all items in group share pccesCode, updating one updates all via our save logic/backend -->
                      
                      <!-- 是否取樣試驗 -->
                      <td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                          <input 
                            class="form-check-input" 
                            type="checkbox" 
                            v-model="group.detail.isSamplingTest"
                            @change="handleCheckboxChange(group.items[0])"
                          >
                        </div>
                      </td>
                      
                      <!-- 預定送審日期 -->
                      <td>
                        <input 
                          type="text" 
                          class="form-control form-control-sm"
                          placeholder="如: 施工前15日"
                          v-model="group.detail.plannedSubmissionDate"
                          @input="handleTextChange(group.items[0])"
                        >
                      </td>


                      
                      <!-- 是否驗廠 -->
                      <td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                          <input 
                            class="form-check-input" 
                            type="checkbox" 
                            v-model="group.detail.isFactoryInspection"
                            @change="handleCheckboxChange(group.items[0])"
                          >
                        </div>
                      </td>
                      
                      <!-- 送審資料 -->
                      <td>
                        <div class="d-flex flex-wrap gap-2">
                           <div class="form-check form-check-inline me-0">
                            <input class="form-check-input" type="checkbox" :id="'sub-'+group.pccesCode" v-model="group.detail.hasSubcontractorData" @change="handleCheckboxChange(group.items[0])">
                            <label class="form-check-label small" :for="'sub-'+group.pccesCode">協力廠商</label>
                          </div>
                          <div class="form-check form-check-inline me-0">
                            <input class="form-check-input" type="checkbox" :id="'cat-'+group.pccesCode" v-model="group.detail.hasCatalog" @change="handleCheckboxChange(group.items[0])">
                            <label class="form-check-label small" :for="'cat-'+group.pccesCode">型錄</label>
                          </div>
                           <div class="form-check form-check-inline me-0">
                            <input class="form-check-input" type="checkbox" :id="'rep-'+group.pccesCode" v-model="group.detail.hasTestReport" @change="handleCheckboxChange(group.items[0])">
                            <label class="form-check-label small" :for="'rep-'+group.pccesCode">試驗報告</label>
                          </div>
                           <div class="form-check form-check-inline me-0">
                            <input class="form-check-input" type="checkbox" :id="'sam-'+group.pccesCode" v-model="group.detail.hasSample" @change="handleCheckboxChange(group.items[0])">
                            <label class="form-check-label small" :for="'sam-'+group.pccesCode">樣品</label>
                          </div>
                           <div class="form-check form-check-inline me-1">
                            <input class="form-check-input" type="checkbox" :id="'oth-'+group.pccesCode" v-model="group.detail.hasOther" @change="handleCheckboxChange(group.items[0])">
                            <label class="form-check-label small" :for="'oth-'+group.pccesCode">其他</label>
                          </div>
                        </div>
                      </td>
                      
                      <!-- 操作 -->
                      <td class="text-center">
                         <button 
                           class="btn btn-sm btn-outline-primary text-nowrap"
                           @click="goToQualityControl(group.pccesCode)"
                         >
                           <i class="fa fa-list-check me-1"></i>品質抽驗管控表
                         </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.form-check-input {
  cursor: pointer;
}
.table > :not(caption) > * > * {
  padding: 0.8rem 0.5rem;
}
</style>
