<script lang="ts">
import { defineComponent, onActivated, onMounted, ref, watch, computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
// import { useProjectStore } from '@/stores/project'; // 假設有 project store 可以取得當前專案資訊
import { tenderMaterialApi, type MaterialItem, type UpdateMaterialDetailRequest, type MaterialDetail } from '@/api/tenderMaterial';
import toastService from '@/components/bootstrap/ToastService.js';
import { debounce, throttle } from 'lodash';
import { useWorkspaceStore } from '@/stores/workspace';
import RepublicDatePicker from '@/components/bootstrap/RepublicDatePicker.vue';
import DesignChangeVersionSwitcher from '@/components/common/DesignChangeVersionSwitcher.vue';
import CommonTable from '@/components/common/CommonTable.vue'

export default defineComponent({
  name: 'TenderMaterialSettings',
  components: {
    RepublicDatePicker,
    DesignChangeVersionSwitcher,
    CommonTable
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

    const constructionId = computed(() => workspaceStore.currentProject?.id || '');
    const selectedDesignChangeId = ref<number | null>(null);
    const loadMaterials = async () => {
      if (!constructionId.value) {
        toastService.warning('請先選擇工程項目');
        return;
      }
      isLoading.value = true;
      try {
        materials.value = await tenderMaterialApi.getMaterialList(constructionId.value, selectedDesignChangeId.value);
      } catch (error) {
        console.error('Error fetching materials:', error);
        toastService.error('載入材料列表失敗');
        materials.value = [];
      } finally {
        isLoading.value = false;
      }
    };

    watch(() => constructionId.value, async (newVal) => {
      if (newVal) {
        materials.value = [];
        selectedDesignChangeId.value = null;
        loadMaterials();
      } else {
        materials.value = [];
        selectedDesignChangeId.value = null;
      }
    });

    watch(selectedDesignChangeId, () => {
      if (constructionId.value) loadMaterials();
    });

    // 儲存邏輯 (Debounced)
    const saveItem = async (item: MaterialItem) => {
      const id = item.id;
      savingStatus.value[id] = 'saving';
      
      try {
        if (savingStatus.value[id] === 'saving') { 
          // 保存當前編輯的值，避免被後端返回的資料覆蓋
          const currentDetail = { ...item.detail };
          
          const result = await tenderMaterialApi.updateMaterialDetail({
            pccesCode: item.pccesCode || '',
            constructionId: constructionId.value,
            designChangeId: selectedDesignChangeId.value,
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

    // 項次（ref_item_no）編輯：以材料編碼為單位同步更新（同材料編碼的所有葉節點材料列）
    const debouncedItemNoMap = new Map<string, any>();
    const handleItemNoChange = (group: MaterialGroup) => {
      if (!constructionId.value) return;
      const code = group.pccesCode || '';
      if (!code) return;
      if (!debouncedItemNoMap.has(code)) {
        debouncedItemNoMap.set(
          code,
          debounce(async (g: MaterialGroup) => {
            try {
              await tenderMaterialApi.updateMaterialItemNo({
                pccesCode: g.pccesCode,
                constructionId: constructionId.value,
                designChangeId: selectedDesignChangeId.value,
                itemNo: (g.items?.[0]?.itemNo ?? null) as any
              });
              // 同步更新同一材料編碼的所有列（前端顯示一致）
              materials.value.forEach((m) => {
                if (m.pccesCode === g.pccesCode) {
                  m.itemNo = g.items?.[0]?.itemNo ?? null;
                }
              });
              showSuccessToast();
            } catch (e) {
              console.error('Error updating material itemNo:', e);
              toastService.error('儲存項次失敗');
            }
          }, 600)
        );
      }
      debouncedItemNoMap.get(code)(group);
    };
    
    // Checkbox 直接觸發儲存
    const handleCheckboxChange = (item: MaterialItem) => {
       saveItem(item);
    };

    onMounted(async () => {
      if (constructionId.value) {
        loadMaterials();
      }
    });

    // 若此頁被 keep-alive 快取，從「品質抽驗管控表」返回時要重新載入筆數狀態
    onActivated(() => {
      if (constructionId.value) {
        loadMaterials();
      }
    });

    return {
      constructionId,
      selectedDesignChangeId,
      materials,
      filteredMaterials,
      keyword,
      isLoading,
      savingStatus,
      handleTextChange,
      handleItemNoChange,
      handleCheckboxChange,
      saveItem,
      fetchMaterials: loadMaterials,
      groupedMaterials,
      goToQualityControl: (pccesCode: string) => {
        if (pccesCode) {
          router.push({
            path: `/forms/tender-material-settings/${pccesCode}/quality-control`,
            query: { designChangeId: selectedDesignChangeId.value != null ? String(selectedDesignChangeId.value) : undefined }
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
  <div class="tender-material-settings-page">
    <PageHeader
      title="標單材料設定"
      icon="fa fa-cube"
      :breadcrumbs="[
        { text: '表單生成與管理', href: 'javascript:;' },
        { text: '標單材料設定', active: true }
      ]"
    >
      <template #extra>
        <DesignChangeVersionSwitcher
          v-if="constructionId"
          :construction-id="constructionId"
          v-model="selectedDesignChangeId"
        />
      </template>
    </PageHeader>

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
                此頁面的材料資料來源自 <strong>工程項目標單</strong>的<strong>單價分析</strong>。
                系統會自動帶入「單價分析」中被勾選為<strong>材料</strong>的最底層項目。
              </p>
              <p class="mb-0">
                如需新增或修改材料清單，請前往
                <router-link to="/basic/project-item-database" class="alert-link">
                  <i class="fa fa-arrow-right me-1"></i>工程項目標單
                </router-link>
                的「單價分析」分頁勾選材料。
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
                   placeholder="搜尋工項編碼或材料名稱..." 
                   v-model="keyword"
                 >
               </div>
             </div>
             <div class="d-flex gap-2">
               <button class="btn btn-outline-secondary text-nowrap" @click="fetchMaterials">
                 <i class="fa fa-sync me-1"></i>重新整理
               </button>
             </div>
          </div>
        
          <div class="card h-100 border-0 rounded-0">
            <!-- ... options ... -->
            <div class="card-body p-0">
              <CommonTable
                wrapper-class="h-100"
                table-class="table-hover"
                :sticky-header="true"
                :loading="isLoading"
                :empty="groupedMaterials.length === 0"
                :colspan="9"
              >
                <template #head>
                  <tr>
                    <th style="width: 90px;">項次</th>
                    <th style="width: 120px;">工項編碼</th>
                    <th style="min-width: 200px;">材料名稱／數量</th>
                    <th style="width: 200px;">預定進場日期</th>
                    <th class="text-center" style="width: 100px;">取樣試驗</th>
                    <th style="width: 150px;">預定送審日期</th>
                    <th class="text-center" style="width: 100px;">驗廠</th>
                    <th style="min-width: 300px;">送審資料</th>
                    <th class="text-center" style="min-width: 180px;">操作</th>
                  </tr>
                </template>

                <template #empty>
                  <tr>
                    <td colspan="9" class="text-center py-4 text-muted">
                      <div>{{ materials.length === 0 ? '目前尚無資料' : '查無符合條件的資料' }}</div>
                      <div v-if="materials.length === 0" class="small mt-1">
                        請至工程項目標單 &gt; 單價分析 勾選材料
                      </div>
                    </td>
                  </tr>
                </template>

                <template #body>
                  <tr v-for="group in groupedMaterials" :key="group.pccesCode">
                      <!-- 項次 -->
                      <td>
                        <input
                          type="text"
                          class="form-control form-control-sm text-center font-monospace"
                          placeholder="-"
                          v-model="group.items[0].itemNo"
                          @input="handleItemNoChange(group)"
                        />
                      </td>
                      <!-- 編碼 -->
                      <td class="font-monospace fw-bold">{{ group.pccesCode }}</td>
                      <!-- 材料名稱 & 數量 (多筆) -->
                      <td>
                        <div class="fw-bolder fs-6 mb-2">{{ group.name }}</div>
                        <div
                          v-for="(item, idx) in group.items"
                          :key="item.id"
                          class="fw-bold opacity-75 small"
                          :class="{ 'mb-1': idx < group.items.length - 1 }"
                        >
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
                      
                      <!-- 操作：填寫狀況顯示於按鈕下方（同 pccesCode 共用一張管控表） -->
                      <td class="text-center">
                        <div class="d-flex flex-column align-items-center gap-2">
                          <button
                            type="button"
                            class="btn btn-sm btn-outline-primary text-nowrap"
                            @click="goToQualityControl(group.pccesCode)"
                          >
                            <i class="fa fa-list-check me-1"></i>品質抽驗管控表
                          </button>
                          <div class="px-1">
                            <span
                              v-if="(group.items[0]?.qualityControlStandardCount ?? 0) > 0"
                              class="badge rounded-pill bg-success-subtle text-success border border-success-subtle"
                              :title="'已建立 ' + group.items[0].qualityControlStandardCount + ' 筆品質抽驗管控表明細'"
                            >
                              <i class="fa fa-list-check me-1"></i>已建 {{ group.items[0].qualityControlStandardCount }} 筆
                            </span>
                            <span
                              v-else
                              class="badge rounded-pill bg-warning-subtle text-warning border border-warning-subtle"
                            >
                              <i class="fa fa-circle-exclamation me-1"></i>尚未建立管控表
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                </template>
              </CommonTable>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
  </div>
</template>

<style scoped>
.tender-material-settings-page {
  padding: 1rem;
}
.form-check-input {
  cursor: pointer;
}
.table > :not(caption) > * > * {
  padding: 0.8rem 0.5rem;
}
</style>
