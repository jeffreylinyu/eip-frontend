# 工程材料抽查標準表 API 文檔

## 概述

工程材料抽查標準表（`construction_material_standard`）用於儲存特定工程中每個材料（`pccesCode`）的抽查標準資料。此表與系統層級的材料抽查標準表（`pcces_material_standard`）類似，但屬於工程專案層級，可針對特定工程進行客製化調整。

## 資料表結構

### 表名：`construction_material_standard`

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | Integer | 主鍵，自動遞增 |
| `pcces_code` | String | PCCES 編碼（與 `contract_version_id` 組成複合鍵） |
| `contract_version_id` | String | 合約版本 ID（外鍵關聯到 `contract_version`） |
| `item_no` | Integer | 項次（排序用） |
| `item_name` | String | 材料名稱 |
| `check_standard` | TEXT | 抽查標準 |
| `check_method` | String | 抽查方法 |
| `apply_first_level` | String | 一級辦理時機 |
| `feq_check_first_level` | String | 一級試驗頻率 |
| `check_ratio_second_level` | String | 二級抽驗比例(%) |
| `failure_handle` | TEXT | 不合格處理(量化) |
| `is_active` | Boolean | 是否啟用（預設：true） |
| `created_at` | Timestamp | 建立時間（自動設定） |
| `updated_at` | Timestamp | 更新時間（自動設定） |

## API 端點

### 基礎路徑
所有 API 端點都在 `/construction/material-detail` 路徑下。

---

## 1. 查詢工程材料抽查標準

### `GET /construction/material-detail/standards`

查詢特定工程中某個材料的抽查標準明細。

**權限要求**：需要認證（`@AuthenticationPrincipal`）

**請求參數**：

| 參數名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `pccesCode` | String | 是 | PCCES 編碼 |
| `contractVersionId` | String | 是 | 合約版本 ID |

**請求範例**：
```http
GET /construction/material-detail/standards?pccesCode=0231902213&contractVersionId=version-uuid-123
```

**回應格式**：
```json
{
  "code": 200,
  "message": "取得材料抽查標準明細成功",
  "data": [
    {
      "id": 1,
      "itemNo": 1,
      "itemName": "水泥",
      "checkStandard": "符合 CNS 61 規範",
      "checkMethod": "試驗",
      "applyFirstLevel": "進場時",
      "feqCheckFirstLevel": "每批",
      "checkRatioSecondLevel": "10%",
      "failureHandle": "退貨",
      "isActive": true
    },
    {
      "id": 2,
      "itemNo": 2,
      "itemName": "水泥",
      "checkStandard": "符合 CNS 61 規範（補充）",
      "checkMethod": "檢驗",
      "applyFirstLevel": "進場時",
      "feqCheckFirstLevel": "每批",
      "checkRatioSecondLevel": "10%",
      "failureHandle": "退貨",
      "isActive": true
    }
  ]
}
```

**注意事項**：
- 回傳結果會按照 `item_no` 欄位升序排序
- 如果該 `pccesCode` 和 `contractVersionId` 組合沒有對應的抽查標準，會回傳空陣列
- 此 API 查詢的是工程層級的材料抽查標準（`construction_material_standard` 表）

---

## 2. 複製材料抽查標準（覆蓋式）

### `POST /construction/material-detail/standards/copy`

從系統層級的材料抽查標準表（`pcces_material_standard`）複製資料到工程層級的材料抽查標準表（`construction_material_standard`）。

**權限要求**：需要認證（`@AuthenticationPrincipal`）

**請求參數**：

| 參數名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `pccesCode` | String | 是 | 目標材料的 PCCES 編碼 |
| `contractVersionId` | String | 是 | 合約版本 ID |

**請求 Body**：
```json
{
  "sourcePccesCode": "0231902213"
}
```

**欄位說明**：

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `sourcePccesCode` | String | 是 | 來源材料的 PCCES 編碼（從系統層級材料標準表複製） |

**請求範例**：
```http
POST /construction/material-detail/standards/copy?pccesCode=0231902213&contractVersionId=version-uuid-123
Content-Type: application/json

{
  "sourcePccesCode": "0231902213"
}
```

**回應格式**：
```json
{
  "code": 200,
  "message": "複製材料抽查標準成功",
  "data": [
    {
      "id": 1,
      "itemNo": 1,
      "itemName": "水泥",
      "checkStandard": "符合 CNS 61 規範",
      "checkMethod": "試驗",
      "applyFirstLevel": "進場時",
      "feqCheckFirstLevel": "每批",
      "checkRatioSecondLevel": "10%",
      "failureHandle": "退貨",
      "isActive": true
    }
  ]
}
```

**覆蓋邏輯**：
- 此 API 採用**覆蓋式複製**（Overwrite）策略
- 執行時會先刪除該 `pccesCode` + `contractVersionId` 組合的所有現有記錄
- 然後從系統層級材料標準表（`pcces_material_standard`）查詢 `sourcePccesCode` 對應的所有記錄
- 將查詢到的記錄複製到工程層級材料標準表（`construction_material_standard`）
- 如果系統層級有多筆記錄（多個 `item_no`），會全部複製

**資料來源優先順序**：
- 系統會優先查詢 `dataSource` 為 "第一資料來源" 的記錄
- 如果沒有找到，則查詢所有 `dataSource` 的記錄

**注意事項**：
- 複製後，工程層級的資料與系統層級資料完全獨立，後續修改不會互相影響
- 如果 `sourcePccesCode` 在系統層級不存在，會回傳空陣列（不會報錯）

---

## 3. 更新單筆材料抽查標準

### `PUT /construction/material-detail/standards/{standardId}`

更新工程層級材料抽查標準的單筆記錄。

**權限要求**：需要認證（`@AuthenticationPrincipal`）

**路徑參數**：

| 參數名稱 | 類型 | 說明 |
|---------|------|------|
| `standardId` | Integer | 材料抽查標準記錄 ID |

**請求參數**：

| 參數名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `pccesCode` | String | 是 | PCCES 編碼（用於驗證） |
| `contractVersionId` | String | 是 | 合約版本 ID（用於驗證） |

**請求 Body**：
```json
{
  "itemNo": 1,
  "itemName": "水泥（更新）",
  "checkStandard": "符合 CNS 61 規範（更新版）",
  "checkMethod": "試驗與檢驗",
  "applyFirstLevel": "進場時",
  "feqCheckFirstLevel": "每批",
  "checkRatioSecondLevel": "10%",
  "failureHandle": "退貨或更換",
  "isActive": true
}
```

**欄位說明**：

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `itemNo` | Integer | 否 | 項次（排序用） |
| `itemName` | String | 否 | 材料名稱 |
| `checkStandard` | String | 否 | 抽查標準 |
| `checkMethod` | String | 否 | 抽查方法 |
| `applyFirstLevel` | String | 否 | 一級辦理時機 |
| `feqCheckFirstLevel` | String | 否 | 一級試驗頻率 |
| `checkRatioSecondLevel` | String | 否 | 二級抽驗比例(%) |
| `failureHandle` | String | 否 | 不合格處理(量化) |
| `isActive` | Boolean | 否 | 是否啟用 |

**請求範例**：
```http
PUT /construction/material-detail/standards/1?pccesCode=0231902213&contractVersionId=version-uuid-123
Content-Type: application/json

{
  "checkStandard": "符合 CNS 61 規範（更新版）",
  "checkMethod": "試驗與檢驗"
}
```

**回應格式**：
```json
{
  "code": 200,
  "message": "更新材料抽查標準明細成功",
  "data": {
    "id": 1,
    "itemNo": 1,
    "itemName": "水泥",
    "checkStandard": "符合 CNS 61 規範（更新版）",
    "checkMethod": "試驗與檢驗",
    "applyFirstLevel": "進場時",
    "feqCheckFirstLevel": "每批",
    "checkRatioSecondLevel": "10%",
    "failureHandle": "退貨或更換",
    "isActive": true
  }
}
```

**注意事項**：
- 所有欄位都是可選的，只會更新提供的欄位
- 系統會驗證 `standardId` 是否屬於指定的 `pccesCode` + `contractVersionId` 組合
- 如果記錄不存在或驗證失敗，會回傳錯誤

---

## 資料模型

### ConstructionMaterialStandardEntity

```kotlin
data class ConstructionMaterialStandardEntity(
    val id: Int? = null,
    val pccesCode: String,
    val contractVersionId: String,
    var itemNo: Int? = null,
    var itemName: String? = null,
    var checkStandard: String? = null,
    var checkMethod: String? = null,
    var applyFirstLevel: String? = null,
    var feqCheckFirstLevel: String? = null,
    var checkRatioSecondLevel: String? = null,
    var failureHandle: String? = null,
    var isActive: Boolean = true,
    val createdAt: LocalDateTime? = null,
    val updatedAt: LocalDateTime? = null
)
```

### ConstructionMaterialStandardResponse

```kotlin
data class ConstructionMaterialStandardResponse(
    val id: Int?,
    val itemNo: Int?,
    val itemName: String?,
    val checkStandard: String?,
    val checkMethod: String?,
    val applyFirstLevel: String?,
    val feqCheckFirstLevel: String?,
    val checkRatioSecondLevel: String?,
    val failureHandle: String?,
    val isActive: Boolean
)
```

### ConstructionMaterialStandardCopyRequest

```kotlin
data class ConstructionMaterialStandardCopyRequest(
    val sourcePccesCode: String
)
```

### ConstructionMaterialStandardUpdateRequest

```kotlin
data class ConstructionMaterialStandardUpdateRequest(
    val itemNo: Int? = null,
    val itemName: String? = null,
    val checkStandard: String? = null,
    val checkMethod: String? = null,
    val applyFirstLevel: String? = null,
    val feqCheckFirstLevel: String? = null,
    val checkRatioSecondLevel: String? = null,
    val failureHandle: String? = null,
    val isActive: Boolean? = null
)
```

---

## 功能說明

### 與系統層級材料標準的關係

1. **系統層級**（`pcces_material_standard`）：
   - 儲存所有工程共用的材料抽查標準
   - 透過 `GET /standard/material/by-pcces-code/{pccesCode}` 查詢

2. **工程層級**（`construction_material_standard`）：
   - 儲存特定工程的材料抽查標準（可客製化）
   - 透過 `POST /construction/material-detail/standards/copy` 從系統層級複製
   - 複製後可獨立修改，不會影響系統層級資料

### 複製邏輯

- 使用 `POST /construction/material-detail/standards/copy` 時，系統會：
  1. 先刪除該 `pccesCode` + `contractVersionId` 的所有現有記錄
  2. 從系統層級查詢 `sourcePccesCode` 的所有記錄（按 `item_no` 排序）
  3. 將查詢到的記錄複製到工程層級
  4. 回傳複製後的記錄列表

### 資料來源優先順序

系統層級材料標準查詢時，會優先選擇：
1. `dataSource = "第一資料來源"` 的記錄
2. 如果沒有，則查詢所有 `dataSource` 的記錄

---

## 使用範例

### 範例 1：查詢工程材料抽查標準

```bash
curl -X GET "http://localhost:8080/construction/material-detail/standards?pccesCode=0231902213&contractVersionId=version-uuid-123" \
  -H "Authorization: Bearer {token}"
```

### 範例 2：複製材料抽查標準

```bash
curl -X POST "http://localhost:8080/construction/material-detail/standards/copy?pccesCode=0231902213&contractVersionId=version-uuid-123" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "sourcePccesCode": "0231902213"
  }'
```

### 範例 3：更新材料抽查標準

```bash
curl -X PUT "http://localhost:8080/construction/material-detail/standards/1?pccesCode=0231902213&contractVersionId=version-uuid-123" \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "checkStandard": "符合 CNS 61 規範（更新版）",
    "checkMethod": "試驗與檢驗"
  }'
```

---

## 相關檔案

- **Controller**: `ConstructionMaterialDetailController.kt`
- **Service**: `ConstructionMaterialDetailService.kt`
- **Repository**: `ConstructionMaterialStandardRepository.kt`
- **Entity**: `ConstructionMaterialStandardEntity.kt`
- **Request Model**: `ConstructionMaterialStandardRequest.kt`
- **Response Model**: `ConstructionMaterialStandardResponse.kt`

---

## 與施工大項抽查標準的對應關係

此 API 設計與「施工大項抽查標準」API（`/construction-major-items/{id}/standards`）類似：

| 功能 | 施工大項 | 工程材料 |
|------|---------|---------|
| 查詢 | `GET /construction-major-items/{id}/standards` | `GET /construction/material-detail/standards?pccesCode=xxx&contractVersionId=xxx` |
| 複製 | `POST /construction-major-items/{id}/standards/copy` | `POST /construction/material-detail/standards/copy?pccesCode=xxx&contractVersionId=xxx` |
| 更新 | `PATCH /construction-major-items/{id}/standards/{standardId}` | `PUT /construction/material-detail/standards/{standardId}?pccesCode=xxx&contractVersionId=xxx` |

**差異說明**：
- 施工大項使用單一 `id`（UUID）作為路徑參數
- 工程材料使用 `pccesCode + contractVersionId` 作為查詢參數（因為材料是透過 `pccesCode + contractVersionId` 識別，而非單一 ID）
