# 前端同步修正清單 - 材料詳細設定 API 變更

## 一、API 變更摘要

### 1.1 列表 API（GET）- 無變更
- **路徑**：`GET /construction/material-detail/list?constructionId=xxx&versionId=xxx`
- **狀態**：✅ 路徑和參數不變
- **Response 結構變更**：⚠️ 需要調整

### 1.2 更新 API（PUT）- 重大變更
- **舊路徑**：`PUT /construction/material-detail/{constructionPccesCodeId}`
- **新路徑**：`PUT /construction/material-detail`（無路徑參數）
- **Request Body 變更**：⚠️ 需要調整

---

## 二、Response DTO 變更

### 2.1 舊的 Response 結構（已廢棄）
```typescript
interface MaterialDetailListResponse {
  constructionPccesCodeId: number;
  pccesCode: string;
  materialName: string;
  unit: string;
  quantity: number;
  itemNo: string;
  materialDetail: MaterialDetailInfo;
}
```

### 2.2 新的 Response 結構
```typescript
interface MaterialListItemDto {
  id: number;              // 工項 ID（原 constructionPccesCodeId）
  itemNo: string | null;   // 項次
  name: string;            // 材料名稱（原 materialName）
  quantity: number;        // 數量
  unit: string | null;     // 單位
  pccesCode: string | null; // PCCES 編號
  detail: MaterialDetailInfo; // 詳細設定（原 materialDetail）
}

interface MaterialDetailInfo {
  id: number | null;       // 如果為 null，表示尚未設定
  isSamplingTest: boolean;
  isFactoryInspection: boolean;
  hasSubcontractorData: boolean;
  hasCatalog: boolean;
  hasTestReport: boolean;
  hasSample: boolean;
  hasOther: boolean;
  plannedSubmissionDate: string | null;
  updatedAt: string | null; // ISO 8601 格式
}
```

### 2.3 欄位對應關係
| 舊欄位 | 新欄位 | 說明 |
|--------|--------|------|
| `constructionPccesCodeId` | `id` | 工項 ID |
| `materialName` | `name` | 材料名稱 |
| `materialDetail` | `detail` | 詳細設定 |
| - | `itemNo` | 新增：項次 |

---

## 三、Request DTO 變更

### 3.1 舊的 Request（已廢棄）
```typescript
// 路徑參數：constructionPccesCodeId
PUT /construction/material-detail/123

// Request Body
interface ConstructionMaterialDetailRequest {
  isSamplingTest: boolean;
  isFactoryInspection: boolean;
  hasSubcontractorData: boolean;
  hasCatalog: boolean;
  hasTestReport: boolean;
  hasSample: boolean;
  hasOther: boolean;
  plannedSubmissionDate: string | null;
}
```

### 3.2 新的 Request
```typescript
// 無路徑參數
PUT /construction/material-detail

// Request Body
interface UpdateMaterialDetailRequest {
  pccesCode: string;              // 新增：PCCES 編號
  contractVersionId: string;       // 新增：版本 ID
  detail: ConstructionMaterialDetailRequest; // 詳細設定（結構不變）
}
```

---

## 四、前端需要修正的項目

### 4.1 TypeScript 型別定義

#### ✅ 需要新增/更新
```typescript
// 新增 MaterialListItemDto
interface MaterialListItemDto {
  id: number;
  itemNo: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  pccesCode: string | null;
  detail: MaterialDetailInfo;
}

// 新增 UpdateMaterialDetailRequest
interface UpdateMaterialDetailRequest {
  pccesCode: string;
  contractVersionId: string;
  detail: ConstructionMaterialDetailRequest;
}

// MaterialDetailInfo 保持不變（如果已存在）
interface MaterialDetailInfo {
  id: number | null;
  isSamplingTest: boolean;
  isFactoryInspection: boolean;
  hasSubcontractorData: boolean;
  hasCatalog: boolean;
  hasTestReport: boolean;
  hasSample: boolean;
  hasOther: boolean;
  plannedSubmissionDate: string | null;
  updatedAt: string | null;
}
```

#### ⚠️ 需要移除/標記為廢棄
```typescript
// 標記為廢棄
@deprecated 請使用 MaterialListItemDto
interface MaterialDetailListResponse {
  // ...
}
```

---

### 4.2 API 呼叫方式修正

#### ✅ GET 列表 API（Response 結構調整）
```typescript
// 舊的寫法
const response = await fetch(
  `/construction/material-detail/list?constructionId=${constructionId}&versionId=${versionId}`
);
const data: BaseResponse<MaterialDetailListResponse[]> = await response.json();

// 使用舊結構
data.data.forEach(item => {
  console.log(item.constructionPccesCodeId); // ❌ 已變更
  console.log(item.materialName);            // ❌ 已變更
  console.log(item.materialDetail);          // ❌ 已變更
});

// 新的寫法
const response = await fetch(
  `/construction/material-detail/list?constructionId=${constructionId}&versionId=${versionId}`
);
const data: BaseResponse<MaterialListItemDto[]> = await response.json();

// 使用新結構
data.data.forEach(item => {
  console.log(item.id);           // ✅ 使用 id
  console.log(item.name);         // ✅ 使用 name
  console.log(item.detail);       // ✅ 使用 detail
  console.log(item.itemNo);       // ✅ 新增：項次
  console.log(item.pccesCode);    // ✅ 新增：PCCES 編號
});
```

#### ⚠️ PUT 更新 API（重大變更）
```typescript
// 舊的寫法
const updateMaterialDetail = async (
  constructionPccesCodeId: number,
  detail: ConstructionMaterialDetailRequest
) => {
  const response = await fetch(
    `/construction/material-detail/${constructionPccesCodeId}`, // ❌ 路徑已變更
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(detail) // ❌ Request Body 結構已變更
    }
  );
  return response.json();
};

// 新的寫法
const updateMaterialDetail = async (
  pccesCode: string,
  contractVersionId: string,
  detail: ConstructionMaterialDetailRequest
) => {
  const response = await fetch(
    `/construction/material-detail`, // ✅ 無路徑參數
    {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({        // ✅ 新的 Request Body 結構
        pccesCode,
        contractVersionId,
        detail
      })
    }
  );
  return response.json();
};
```

---

### 4.3 UI/UX 調整建議

#### 4.3.1 列表顯示
- **相同 pccesCode 的材料會顯示相同的詳細設定**
- 建議在 UI 上：
  - 顯示所有材料項次（即使 pccesCode 相同）
  - 標示哪些材料共用設定（例如：顯示「與其他 X 項共用設定」）
  - 使用視覺提示（如圖示或顏色）標示共用關係

#### 4.3.2 編輯行為提示
- **重要**：編輯一個材料的詳細設定時，會影響所有相同 pccesCode 的材料
- 建議：
  - 編輯前顯示確認對話框：「此設定將套用到所有相同材料編號（pccesCode）的項目，是否繼續？」
  - 列出會受影響的所有材料項次
  - 編輯後顯示成功訊息：「已更新 X 個相同材料編號的設定」

#### 4.3.3 資料顯示
```typescript
// 範例：顯示材料列表
const MaterialList = ({ materials }: { materials: MaterialListItemDto[] }) => {
  // 根據 pccesCode 分組，顯示共用關係
  const groupedByPccesCode = materials.reduce((acc, item) => {
    const key = item.pccesCode || 'unknown';
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, MaterialListItemDto[]>);

  return (
    <div>
      {materials.map(item => {
        const sameCodeItems = groupedByPccesCode[item.pccesCode || ''] || [];
        const isShared = sameCodeItems.length > 1;
        
        return (
          <div key={item.id}>
            <div>
              <span>{item.itemNo}</span>
              <span>{item.name}</span>
              <span>{item.quantity} {item.unit}</span>
              {isShared && (
                <Badge>與其他 {sameCodeItems.length - 1} 項共用設定</Badge>
              )}
            </div>
            <MaterialDetailForm 
              detail={item.detail}
              onSave={(detail) => handleSave(item.pccesCode, item.contractVersionId, detail)}
            />
          </div>
        );
      })}
    </div>
  );
};
```

---

### 4.4 編輯表單修正

```typescript
// 舊的編輯邏輯
const handleEdit = async (materialId: number, formData: ConstructionMaterialDetailRequest) => {
  await updateMaterialDetail(materialId, formData); // ❌ 使用 materialId
};

// 新的編輯邏輯
const handleEdit = async (
  material: MaterialListItemDto,  // 需要完整的材料資訊
  formData: ConstructionMaterialDetailRequest
) => {
  // 需要取得 contractVersionId
  const contractVersionId = material.contractVersionId || await getCurrentVersionId();
  
  // 確認對話框
  const affectedItems = materials.filter(
    m => m.pccesCode === material.pccesCode && m.id !== material.id
  );
  
  if (affectedItems.length > 0) {
    const confirmed = await showConfirmDialog(
      `此設定將套用到 ${affectedItems.length + 1} 個相同材料編號的項目：\n` +
      affectedItems.map(item => `- ${item.itemNo} ${item.name}`).join('\n') +
      `\n是否繼續？`
    );
    
    if (!confirmed) return;
  }
  
  await updateMaterialDetail(
    material.pccesCode!,  // ✅ 使用 pccesCode
    contractVersionId,    // ✅ 使用 contractVersionId
    formData
  );
};
```

---

### 4.5 需要取得的額外資訊

#### 問題：如何取得 `contractVersionId`？

**方案 1**：從列表 API 的 Response 中取得
- 需要後端在 `MaterialListItemDto` 中新增 `contractVersionId` 欄位

**方案 2**：從其他 API 取得
- 使用現有的版本查詢 API

**方案 3**：從 URL 參數或 Context 取得
- 如果前端已經有 `versionId`，可以直接使用

**建議**：在 `MaterialListItemDto` 中新增 `contractVersionId` 欄位，方便前端使用。

---

## 五、檢查清單

### 5.1 必須修正
- [ ] 更新 TypeScript 型別定義
- [ ] 修正 GET API 的 Response 處理（欄位名稱變更）
- [ ] 修正 PUT API 的呼叫方式（路徑和 Request Body）
- [ ] 更新編輯表單的提交邏輯（使用 pccesCode + contractVersionId）

### 5.2 建議修正
- [ ] 新增共用設定的視覺提示
- [ ] 新增編輯前的確認對話框
- [ ] 新增編輯後的成功訊息（顯示影響範圍）
- [ ] 優化列表顯示（標示共用關係）

### 5.3 測試項目
- [ ] 測試列表 API 是否正常顯示
- [ ] 測試編輯單一材料是否正確更新所有相同 pccesCode 的材料
- [ ] 測試新增材料詳細設定是否正確建立
- [ ] 測試相同 pccesCode 的材料是否顯示相同的詳細設定

---

## 六、範例程式碼

### 6.1 完整的 API Service
```typescript
// materialDetailService.ts
interface MaterialListItemDto {
  id: number;
  itemNo: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  pccesCode: string | null;
  contractVersionId?: string; // 建議後端新增此欄位
  detail: MaterialDetailInfo;
}

interface UpdateMaterialDetailRequest {
  pccesCode: string;
  contractVersionId: string;
  detail: ConstructionMaterialDetailRequest;
}

export const materialDetailService = {
  // 取得材料列表
  async getList(constructionId: string, versionId?: string): Promise<MaterialListItemDto[]> {
    const params = new URLSearchParams({ constructionId });
    if (versionId) params.append('versionId', versionId);
    
    const response = await fetch(`/construction/material-detail/list?${params}`);
    const result = await response.json();
    return result.data;
  },
  
  // 更新材料詳細設定
  async update(
    pccesCode: string,
    contractVersionId: string,
    detail: ConstructionMaterialDetailRequest
  ): Promise<MaterialDetailInfo> {
    const response = await fetch('/construction/material-detail', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pccesCode, contractVersionId, detail })
    });
    const result = await response.json();
    return result.data;
  }
};
```

### 6.2 React Hook 範例
```typescript
// useMaterialDetail.ts
export const useMaterialDetail = (constructionId: string, versionId?: string) => {
  const [materials, setMaterials] = useState<MaterialListItemDto[]>([]);
  const [loading, setLoading] = useState(false);
  
  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const data = await materialDetailService.getList(constructionId, versionId);
      setMaterials(data);
    } finally {
      setLoading(false);
    }
  };
  
  const updateDetail = async (
    pccesCode: string,
    contractVersionId: string,
    detail: ConstructionMaterialDetailRequest
  ) => {
    // 找出會受影響的材料
    const affectedItems = materials.filter(m => m.pccesCode === pccesCode);
    
    if (affectedItems.length > 1) {
      const confirmed = window.confirm(
        `此設定將套用到 ${affectedItems.length} 個相同材料編號的項目，是否繼續？`
      );
      if (!confirmed) return;
    }
    
    await materialDetailService.update(pccesCode, contractVersionId, detail);
    await fetchMaterials(); // 重新載入列表
  };
  
  useEffect(() => {
    fetchMaterials();
  }, [constructionId, versionId]);
  
  return { materials, loading, updateDetail, refresh: fetchMaterials };
};
```

---

## 七、後端建議補充

### 7.1 建議在 MaterialListItemDto 中新增欄位
```kotlin
data class MaterialListItemDto(
    val id: Int,
    val itemNo: String?,
    val name: String,
    val quantity: Double,
    val unit: String?,
    val pccesCode: String?,
    val contractVersionId: String,  // 新增：方便前端使用
    val detail: MaterialDetailInfo
)
```

這樣前端就不需要額外查詢 `contractVersionId`。

---

## 八、遷移步驟建議

1. **階段一**：更新型別定義和 API Service
   - 新增新的 TypeScript 型別
   - 更新 API Service 方法
   - 保持舊的程式碼（標記為廢棄）

2. **階段二**：逐步遷移 UI 元件
   - 先遷移列表顯示
   - 再遷移編輯表單
   - 測試每個功能

3. **階段三**：清理舊程式碼
   - 移除廢棄的型別和函數
   - 更新所有引用

---

## 九、注意事項

1. **向後兼容**：如果前端尚未更新，舊的 API 呼叫會失敗
2. **資料一致性**：編輯時要提醒用戶會影響多個項目
3. **錯誤處理**：處理 `pccesCode` 為 null 的情況
4. **版本管理**：確保 `contractVersionId` 正確傳遞

