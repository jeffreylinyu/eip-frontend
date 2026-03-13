# 相關文件 Modal 共用組件規格

## 目的

全專案通用的「相關文件」彈窗：**監造 A 系列、營造 O 系列**，以及之後新增的任何相關文件／附件彈窗，都應使用本組件。統一「上傳」「下載全部」按鈕位置與版面，各頁面僅需傳入資料與回調以接各自的 API。

## 組件名稱

`RelatedDocumentsModal.vue`

## 版面結構（由上而下，固定）

1. **操作列**（固定一列）
   - `[上傳]` 按鈕（可隱藏）
   - `[下載全部]` 按鈕（可隱藏，無內容時可不顯示或禁用）
2. **上傳中…** 提示（當 `uploading === true`）
3. **關聯公文** 區塊
   - 有資料：列表（文號/檔名、主旨）+ 每筆：預覽、下載、取消關聯
   - 無資料且 `showSelectDocButton`：顯示「選擇公文」按鈕
4. **額外區塊**（slot，選用）
   - 例如 A-7／O-4 職安的「工程案勞安證照」，或各表單自訂區塊
5. **上傳附件** 區塊
   - 列表（檔名、大小）+ 每筆：預覽、下載、刪除

## Props

| 名稱 | 型別 | 預設 | 說明 |
|------|------|------|------|
| show | boolean | - | 是否顯示 Modal |
| title | string | '相關文件' | 標題 |
| loading | boolean | false | 載入中（顯示 spinner） |
| linkedDocs | array | [] | 關聯公文列表，每項需有 id, documentNumber/fileName, subject?, fileUrl? |
| attachments | array | [] | 附件列表，每項需有 id, fileName, fileSize |
| uploading | boolean | false | 上傳中 |
| downloadingAll | boolean | false | 下載全部中 |
| showLinkedSection | boolean | true | 是否顯示關聯公文區塊 |
| showUpload | boolean | true | 是否顯示上傳按鈕 |
| showDownloadAll | boolean | true | 是否顯示下載全部按鈕 |
| showSelectDocButton | boolean | false | 無關聯公文時是否顯示「選擇公文」按鈕 |
| uploadLabel | string | '上傳檔案' | 上傳按鈕文字 |
| uploadAccept | string | '' | input file accept（例：'.pdf,application/pdf'） |
| downloadAllLabel | string | '下載全部' | 下載全部按鈕文字 |
| modalClass | string | 'a4-date-modal-dark' | Modal 根 class |

## 事件（Emits）

| 事件 | 參數 | 說明 |
|------|------|------|
| update:show | boolean | 關閉/開啟時同步 |
| upload | FileList | 使用者選檔後觸發，父層負責呼叫上傳 API |
| downloadAll | - | 父層負責下載全部 |
| unlinkDoc | doc | 取消關聯該公文 |
| previewDoc | doc | 預覽公文 |
| downloadDoc | doc | 下載公文 |
| previewAtt | att | 預覽附件 |
| downloadAtt | att | 下載附件 |
| deleteAtt | att | 刪除附件 |
| selectDoc | - | 點擊「選擇公文」時觸發，父層開啟公文選擇器 |

## Slots

| 名稱 | 說明 |
|------|------|
| extra | 關聯公文與附件之間插入的區塊（如勞安證照列表） |

## 資料型別（最小介面）

- **LinkedDoc**：`{ id: number; documentNumber?: string; fileName?: string; subject?: string; fileUrl?: string }`
- **Attachment**：`{ id: number; fileName: string; fileSize: number }`（父層可傳入更多欄位，組件只使用這三個）

## 使用方

- **監造 A 系列**：DocumentShelf（A-1/A-2/A-6）、FormA4Download、FormA5Download、FormCommencementReport、FormA7Download（開竣停工 + 職安，職安可使用 slot extra）
- **營造 O 系列**：各 O 系列表單的相關文件／附件彈窗（依需求接不同 API）
- **其餘**：之後新增的任何「關聯公文 + 上傳附件」彈窗，皆應優先採用本組件
