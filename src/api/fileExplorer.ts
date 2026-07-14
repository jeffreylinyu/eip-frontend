import http from '@/api/http'

/* ---------------------------- 型別 ---------------------------- */

export interface SystemSourceNode {
  sourceType: string
  label: string
  routePath: string | null
  fileCount: number
  /** 左側樹子分類（可收折群組），例如「書架文件」「公文」「計劃書送審」 */
  group: string | null
}

export interface FolderNode {
  id: number
  parentId: number | null
  name: string
  createdBy: string | null
  createdAt: string | null
}

export interface FileExplorerItem {
  /** file_index id（捷徑列亦為其指向檔案的 id） */
  id: number
  /** 此列為捷徑時的捷徑 id */
  shortcutId: number | null
  fileName: string
  fileSize: number
  contentType: string | null
  sourceType: string
  sourceLabel: string
  sourceRoutePath: string | null
  sourceId: string | null
  uploadedBy: string | null
  createdAt: string | null
  /** 系統文件為唯讀 */
  readonly: boolean
}

export interface FileExplorerTree {
  system: SystemSourceNode[]
  folders: FolderNode[]
}

export interface FileExplorerBrowse {
  folders: FolderNode[]
  files: FileExplorerItem[]
}

function base(constructionId: string): string {
  return `/management/constructions/${encodeURIComponent(constructionId)}/file-explorer`
}

function unwrap<T>(data: unknown): T | null {
  if (data && typeof data === 'object' && 'data' in (data as Record<string, unknown>)) {
    return ((data as Record<string, unknown>).data as T) ?? null
  }
  return (data as T) ?? null
}

/* ---------------------------- 瀏覽 ---------------------------- */

export async function getExplorerTree(constructionId: string): Promise<FileExplorerTree> {
  const data = await http.get(`${base(constructionId)}/tree`)
  return unwrap<FileExplorerTree>(data) ?? { system: [], folders: [] }
}

export async function browseSystem(constructionId: string, sourceType: string): Promise<FileExplorerBrowse> {
  const data = await http.get(`${base(constructionId)}/browse`, { params: { type: 'system', sourceType } })
  return unwrap<FileExplorerBrowse>(data) ?? { folders: [], files: [] }
}

export async function browseFolder(constructionId: string, folderId: number | null): Promise<FileExplorerBrowse> {
  const params: Record<string, unknown> = { type: 'free' }
  if (folderId != null) params.folderId = folderId
  const data = await http.get(`${base(constructionId)}/browse`, { params })
  return unwrap<FileExplorerBrowse>(data) ?? { folders: [], files: [] }
}

export async function searchFiles(constructionId: string, keyword: string): Promise<FileExplorerItem[]> {
  const data = await http.get(`${base(constructionId)}/search`, { params: { keyword } })
  return unwrap<FileExplorerItem[]>(data) ?? []
}

/* ---------------------------- 資料夾 ---------------------------- */

export async function createFolder(
  constructionId: string,
  name: string,
  parentId: number | null
): Promise<FolderNode | null> {
  const data = await http.post(`${base(constructionId)}/folders`, { name, parentId })
  return unwrap<FolderNode>(data)
}

export async function renameFolder(constructionId: string, folderId: number, name: string): Promise<FolderNode | null> {
  const data = await http.put(`${base(constructionId)}/folders/${folderId}`, { name })
  return unwrap<FolderNode>(data)
}

export async function moveFolder(
  constructionId: string,
  folderId: number,
  parentId: number | null
): Promise<FolderNode | null> {
  const body = parentId == null ? { moveToRoot: true } : { parentId }
  const data = await http.put(`${base(constructionId)}/folders/${folderId}`, body)
  return unwrap<FolderNode>(data)
}

export async function deleteFolder(constructionId: string, folderId: number): Promise<void> {
  await http.delete(`${base(constructionId)}/folders/${folderId}`)
}

/* ---------------------------- 檔案（自由區） ---------------------------- */

export async function uploadFiles(
  constructionId: string,
  files: File[],
  folderId: number | null
): Promise<FileExplorerItem[]> {
  const formData = new FormData()
  files.forEach((f) => formData.append('files', f))
  const url = folderId != null ? `${base(constructionId)}/files?folderId=${folderId}` : `${base(constructionId)}/files`
  const data = await http.post(url, formData)
  return unwrap<FileExplorerItem[]>(data) ?? []
}

export async function renameFile(
  constructionId: string,
  fileId: number,
  fileName: string
): Promise<FileExplorerItem | null> {
  const data = await http.put(`${base(constructionId)}/files/${fileId}`, { fileName })
  return unwrap<FileExplorerItem>(data)
}

export async function moveFile(
  constructionId: string,
  fileId: number,
  folderId: number | null
): Promise<FileExplorerItem | null> {
  const body = folderId == null ? { moveToRoot: true } : { folderId }
  const data = await http.put(`${base(constructionId)}/files/${fileId}`, body)
  return unwrap<FileExplorerItem>(data)
}

export async function deleteFile(constructionId: string, fileId: number): Promise<void> {
  await http.delete(`${base(constructionId)}/files/${fileId}`)
}

/* ---------------------------- 捷徑 ---------------------------- */

export async function createShortcut(
  constructionId: string,
  fileIndexId: number,
  folderId: number | null
): Promise<FileExplorerItem | null> {
  const data = await http.post(`${base(constructionId)}/shortcuts`, { fileIndexId, folderId })
  return unwrap<FileExplorerItem>(data)
}

export async function deleteShortcut(constructionId: string, shortcutId: number): Promise<void> {
  await http.delete(`${base(constructionId)}/shortcuts/${shortcutId}`)
}

/* ---------------------------- 預覽 / 下載 ---------------------------- */

export async function getExplorerFileUrl(constructionId: string, fileId: number): Promise<string> {
  const data = await http.get(`${base(constructionId)}/files/${fileId}/file-url`)
  const body = unwrap<Record<string, unknown>>(data)
  if (body && typeof body.fileUrl === 'string' && body.fileUrl.trim()) return body.fileUrl.trim()
  return ''
}

export async function downloadExplorerFileBlob(constructionId: string, fileId: number): Promise<Blob> {
  const raw = await http.get(`${base(constructionId)}/files/${fileId}/download`, { responseType: 'blob' })
  const blob = raw as unknown as Blob
  if (!(blob instanceof Blob) || blob.size === 0) {
    throw new Error('無法載入檔案內容')
  }
  return blob
}

function openUrlInNewTab(url: string) {
  const a = document.createElement('a')
  a.href = url
  a.target = '_blank'
  a.rel = 'noopener noreferrer'
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/** 在新分頁開啟檔案：優先 Signed URL，失敗時 JWT 下載 blob（與公文中心相同模式） */
export async function openExplorerFileInNewTab(constructionId: string, fileId: number): Promise<void> {
  let signed = ''
  try {
    signed = await getExplorerFileUrl(constructionId, fileId)
  } catch {
    signed = ''
  }
  if (signed) {
    openUrlInNewTab(signed)
    return
  }
  const blob = await downloadExplorerFileBlob(constructionId, fileId)
  const blobUrl = URL.createObjectURL(blob)
  openUrlInNewTab(blobUrl)
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 120_000)
}
