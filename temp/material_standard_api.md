# 材料抽查標準表 API 文檔

## 概述

材料抽查標準表（`pcces_material_standard`）用於儲存 PCCES 材料類別的抽查標準資料，包括抽查標準、抽查方法、一級/二級抽驗設定等資訊。

## 資料表結構

### 表名：`pcces_material_standard`

| 欄位名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | Integer | 主鍵，自動遞增 |
| `pcces_code` | String | PCCES 編碼（唯一識別） |
| `item_name` | String | 材料名稱 |
| `data_source` | String | 資料來源 |
| `check_standard` | TEXT | 抽查標準 |
| `check_method` | String | 抽查方法 |
| `apply_first_level` | String | 一級辦理時機 |
| `feq_check_first_level` | String | 一級試驗頻率 |
| `check_ratio_second_level` | String | 二級抽驗比例(%) |
| `failure_handle` | TEXT | 不合格處理(量化) |
| `is_active` | Boolean | 是否啟用（預設：true） |
| `created_at` | Timestamp | 建立時間（自動設定） |
| `updated_at` | Timestamp | 更新時間（自動設定） |
| `data_source` | String | 資料來源 |

## API 端點

### 基礎路徑
所有 API 端點都在 `/standard` 路徑下。

---

## 1. 查詢材料標準列表

### `GET /standard/material`

查詢材料抽查標準列表，支援關鍵字搜尋和分頁。

**權限要求**：無（公開查詢）

**請求參數**：

| 參數名稱 | 類型 | 必填 | 預設值 | 說明 |
|---------|------|------|--------|------|
| `keyword` | String | 否 | `""` | 搜尋關鍵字（搜尋材料名稱或 PCCES 編碼） |
| `page` | Integer | 否 | `0` | 頁碼（從 0 開始） |
| `size` | Integer | 否 | `10` | 每頁筆數 |

**請求範例**：
```http
GET /standard/material?keyword=水泥&page=0&size=10
```

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "content": [
      {
        "id": 1,
        "pccesCode": "0231902213",
        "itemName": "水泥",
        "dataSource": null,
        "checkStandard": "符合 CNS 61 規範",
        "checkMethod": "試驗",
        "applyFirstLevel": "進場時",
        "feqCheckFirstLevel": "每批",
        "checkRatioSecondLevel": "10%",
        "failureHandle": "退貨",
        "isActive": true
      }
    ],
    "totalElements": 100,
    "totalPages": 10,
    "size": 10,
    "number": 0
  }
}
```

---

## 2. 建立材料標準

### `POST /standard/material`

建立新的材料抽查標準記錄。

**權限要求**：ADMIN 或 SUPER_ADMIN

**請求 Body**：
```json
{
  "pccesCode": "0231902213",
  "itemName": "水泥",
  "checkStandard": "符合 CNS 61 規範",
  "checkMethod": "試驗",
  "applyFirstLevel": "進場時",
  "feqCheckFirstLevel": "每批",
  "checkRatioSecondLevel": "10%",
  "failureHandle": "退貨"
}
```

**欄位說明**：

| 欄位名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `pccesCode` | String | 是 | PCCES 編碼 |
| `itemName` | String | 否 | 材料名稱 |
| `checkStandard` | String | 否 | 抽查標準 |
| `checkMethod` | String | 否 | 抽查方法 |
| `applyFirstLevel` | String | 否 | 一級辦理時機 |
| `feqCheckFirstLevel` | String | 否 | 一級試驗頻率 |
| `checkRatioSecondLevel` | String | 否 | 二級抽驗比例(%) |
| `failureHandle` | String | 否 | 不合格處理(量化) |

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": {
    "id": 1,
    "pccesCode": "0231902213",
    "itemName": "水泥",
    "checkStandard": "符合 CNS 61 規範",
    "checkMethod": "試驗",
    "applyFirstLevel": "進場時",
    "feqCheckFirstLevel": "每批",
    "checkRatioSecondLevel": "10%",
    "failureHandle": "退貨",
    "isActive": true
  }
}
```

---

## 3. 更新材料標準

### `PUT /standard/material/{id}`

更新現有的材料抽查標準記錄。

**權限要求**：ADMIN 或 SUPER_ADMIN

**路徑參數**：

| 參數名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | Integer | 材料標準記錄 ID |

**請求 Body**：
與建立 API 相同，所有欄位都是可選的（只更新提供的欄位）。

**回應格式**：
與建立 API 相同。

---

## 4. 刪除材料標準

### `DELETE /standard/material/{id}`

軟刪除材料抽查標準記錄（將 `isActive` 設為 `false`）。

**權限要求**：ADMIN 或 SUPER_ADMIN

**路徑參數**：

| 參數名稱 | 類型 | 說明 |
|---------|------|------|
| `id` | Integer | 材料標準記錄 ID |

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": true
}
```

---

## 5. 檔案上傳匯入材料標準

### `POST /standard/import-files`

透過檔案上傳匯入材料標準的 JSON 檔案（與施工流程標準表使用相同的匯入方式）。

**權限要求**：ADMIN 或 SUPER_ADMIN

**請求格式**：`multipart/form-data`

**請求參數**：

| 參數名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `files` | MultipartFile[] | 是 | JSON 檔案列表（可上傳多個檔案） |
| `dataSource` | String | 是 | 資料來源標識 |

**請求範例**：
```bash
curl -X POST "http://localhost:8080/standard/import-files" \
  -H "Authorization: Bearer {token}" \
  -F "files=@0231902213.json" \
  -F "files=@0231902214.json" \
  -F "dataSource=系統匯入"
```

**JSON 檔案格式**：

檔案命名規則：`{pccesCode}.json`（例如：`0231902213.json`）

檔案內容格式：
```json
{
  "itemName": "水泥",
  "抽查標準": "符合 CNS 61 規範",
  "抽查方法": "試驗",
  "一級辦理時機": "進場時",
  "一級試驗頻率": "每批",
  "二級抽驗比例(%)": "10%",
  "不合格處理(量化)": "退貨"
}
```

**欄位對應**：

| JSON 欄位 | 資料庫欄位 | 說明 |
|---------|-----------|------|
| `itemName` | `item_name` | 材料名稱 |
| `抽查標準` | `check_standard` | 抽查標準 |
| `抽查方法` | `check_method` | 抽查方法 |
| `一級辦理時機` | `apply_first_level` | 一級辦理時機 |
| `一級試驗頻率` | `feq_check_first_level` | 一級試驗頻率 |
| `二級抽驗比例(%)` | `check_ratio_second_level` | 二級抽驗比例 |
| `不合格處理(量化)` | `failure_handle` | 不合格處理方式 |

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": 2
}
```

**注意事項**：
- 檔案名稱必須是 `{pccesCode}.json` 格式，檔案名稱（不含副檔名）會作為 `pccesCode` 使用
- 只會處理 `.json` 副檔名的檔案
- 系統會自動判斷檔案類型（材料標準或施工流程標準），根據 JSON 內容結構自動識別
- 如果檔案解析失敗，會跳過該檔案並繼續處理其他檔案
- 匯入時會自動設定 `isActive = true`
- 可以一次上傳多個檔案進行批次匯入

---

## 6. 從資料夾匯入材料標準（舊版方式，仍保留）

### `GET /migration/importStandards`

從本地資料夾匯入材料標準的 JSON 檔案（舊版匯入方式，建議使用檔案上傳方式）。

**權限要求**：ADMIN 或 SUPER_ADMIN + Secret Key

**請求參數**：

| 參數名稱 | 類型 | 必填 | 說明 |
|---------|------|------|------|
| `secretKey` | String | 是 | 遷移密鑰（需與系統配置一致） |
| `materialPath` | String | 否 | 材料標準 JSON 檔案所在資料夾路徑 |

**請求範例**：
```http
GET /migration/importStandards?secretKey=your_secret_key&materialPath=C:/data/materials
```

**JSON 檔案格式**：與檔案上傳方式相同

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": "Imported 50 materials. "
}
```

---

## 7. 根據 PCCES 編碼查詢材料標準

### `GET /standard/material/by-pcces-code/{pccesCode}`

根據 PCCES 編碼查詢材料抽查標準列表。

**權限要求**：無（公開查詢）

**路徑參數**：

| 參數名稱 | 類型 | 說明 |
|---------|------|------|
| `pccesCode` | String | PCCES 編碼 |

**請求範例**：
```http
GET /standard/material/by-pcces-code/0231902213
```

**回應格式**：
```json
{
  "code": 200,
  "message": "Success",
  "data": [
    {
      "id": 1,
      "pccesCode": "0231902213",
      "itemName": "水泥",
      "itemNo": 1,
      "dataSource": null,
      "checkStandard": "符合 CNS 61 規範",
      "checkMethod": "試驗",
      "applyFirstLevel": "進場時",
      "feqCheckFirstLevel": "每批",
      "checkRatioSecondLevel": "10%",
      "failureHandle": "退貨",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00",
      "updatedAt": "2024-01-01T00:00:00"
    }
  ]
}
```

**注意事項**：
- 回傳結果會按照 `item_no` 欄位升序排序
- 如果該 `pccesCode` 沒有對應的材料標準，會回傳空陣列
- 此 API 主要用於查詢系統層級的材料標準資料（`pcces_material_standard` 表）

---

## 資料模型

### PccesMaterialStandardEntity

```kotlin
data class PccesMaterialStandardEntity(
    val id: Int? = null,
    val pccesCode: String? = null,
    var itemName: String? = null,
    var dataSource: String? = null,
    var checkStandard: String? = null,
    var checkMethod: String? = null,
    var applyFirstLevel: String? = null,
    var feqCheckFirstLevel: String? = null,
    var checkRatioSecondLevel: String? = null,
    var failureHandle: String? = null,
    var isActive: Boolean = true
)
```

### PccesMaterialStandardRequest

```kotlin
data class PccesMaterialStandardRequest(
    val pccesCode: String?,
    val itemName: String?,
    val checkStandard: String?,
    val checkMethod: String?,
    val applyFirstLevel: String?,
    val feqCheckFirstLevel: String?,
    val checkRatioSecondLevel: String?,
    val failureHandle: String?
)
```

---

## 功能說明

### 匯入方式

1. **檔案上傳匯入（推薦）**：使用 `POST /standard/import-files` API
   - 支援透過 `MultipartFile` 上傳 JSON 檔案
   - 可一次上傳多個檔案進行批次匯入
   - 系統會自動判斷檔案類型（材料標準或施工流程標準）
   - 與施工流程標準表使用相同的匯入方式

2. **資料夾匯入（舊版）**：使用 `GET /migration/importStandards` API
   - 從本地資料夾讀取 JSON 檔案
   - 需要提供伺服器端資料夾路徑
   - 建議使用檔案上傳方式替代

---

## 使用範例

### 範例 1：查詢材料標準

```bash
curl -X GET "http://localhost:8080/standard/material?keyword=水泥&page=0&size=10"
```

### 範例 2：建立材料標準

```bash
curl -X POST "http://localhost:8080/standard/material" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "pccesCode": "0231902213",
    "itemName": "水泥",
    "checkStandard": "符合 CNS 61 規範",
    "checkMethod": "試驗",
    "applyFirstLevel": "進場時",
    "feqCheckFirstLevel": "每批",
    "checkRatioSecondLevel": "10%",
    "failureHandle": "退貨"
  }'
```

### 範例 3：更新材料標準

```bash
curl -X PUT "http://localhost:8080/standard/material/1" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer {token}" \
  -d '{
    "checkStandard": "符合 CNS 61 規範（更新版）",
    "checkMethod": "試驗與檢驗"
  }'
```

### 範例 4：檔案上傳匯入（推薦）

```bash
curl -X POST "http://localhost:8080/standard/import-files" \
  -H "Authorization: Bearer {token}" \
  -F "files=@0231902213.json" \
  -F "files=@0231902214.json" \
  -F "dataSource=系統匯入"
```

### 範例 5：從資料夾匯入（舊版方式）

```bash
curl -X GET "http://localhost:8080/migration/importStandards?secretKey=your_secret_key&materialPath=C:/data/materials" \
  -H "Authorization: Bearer {token}"
```

---

## 相關檔案

- **Controller**: `StandardMaintenanceController.kt`
- **Service**: `StandardService.kt`
- **Repository**: `PccesMaterialStandardRepository.kt`
- **Entity**: `PccesMaterialStandardEntity.kt`
- **Request Model**: `PccesMaterialStandardRequest.kt`
