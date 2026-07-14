<template>
  <div class="file-explorer-page fe-dark">
    <PageHeader
      title="檔案總管"
      icon="fa fa-hard-drive"
      :breadcrumbs="[{ text: '檔案總管', active: true }]"
    />

    <div v-if="!hasCurrentProject" class="alert alert-warning">
      請先於上方選擇工程案，再使用檔案總管。
    </div>

    <div v-else class="fe-window" @click="closeContextMenu">
      <!-- ============ 命令列 ============ -->
      <div class="fe-commandbar">
        <template v-if="selection.kind === 'free'">
          <button class="fe-cmd-btn" @click="openCreateFolder(selection.folderId)">
            <i class="bi bi-folder-plus"></i><span>新增資料夾</span>
          </button>
          <button class="fe-cmd-btn" @click="triggerUpload">
            <i class="bi bi-upload"></i><span>上傳檔案</span>
          </button>
          <div class="fe-cmd-sep"></div>
        </template>
        <button class="fe-cmd-btn" @click="refreshAll" title="重新整理">
          <i class="bi bi-arrow-clockwise"></i><span>重新整理</span>
        </button>

        <div class="fe-cmd-spacer"></div>

        <div class="fe-searchbox">
          <i class="bi bi-search"></i>
          <input
            v-model="searchKeyword"
            type="text"
            placeholder="搜尋全部檔案"
            @keyup.enter="doSearch"
          />
          <i
            v-if="selection.kind === 'search'"
            class="bi bi-x-lg fe-search-clear"
            title="離開搜尋"
            @click="exitSearch"
          ></i>
        </div>
        <input ref="uploadInputRef" type="file" multiple class="d-none" @change="onUploadFiles" />
      </div>

      <!-- ============ 位址列 ============ -->
      <div class="fe-addressbar">
        <i class="bi bi-hdd-stack fe-address-icon"></i>
        <template v-if="selection.kind === 'search'">
          <span class="fe-crumb static">搜尋「{{ activeSearchKeyword }}」的結果</span>
        </template>
        <template v-else-if="selection.kind === 'system'">
          <span class="fe-crumb static">系統文件</span>
          <template v-if="currentSystemGroup">
            <i class="bi bi-chevron-right fe-crumb-sep"></i>
            <span class="fe-crumb static">{{ currentSystemGroup }}</span>
          </template>
          <i class="bi bi-chevron-right fe-crumb-sep"></i>
          <span class="fe-crumb static">{{ currentSystemLabel }}</span>
          <span class="fe-readonly-badge"><i class="bi bi-lock-fill me-1"></i>唯讀</span>
          <span v-if="sourceIdFilter" class="fe-filter-chip" title="目前僅顯示指定紀錄的附件">
            <i class="bi bi-funnel-fill me-1"></i>已篩選單筆紀錄的附件
            <i class="bi bi-x-lg fe-filter-clear" title="清除篩選" @click="clearSourceFilter"></i>
          </span>
        </template>
        <template v-else>
          <span class="fe-crumb" @click="selectFree(null)">專案文件</span>
          <template v-for="crumb in freeBreadcrumbs" :key="crumb.id">
            <i class="bi bi-chevron-right fe-crumb-sep"></i>
            <span class="fe-crumb" @click="selectFree(crumb.id)">{{ crumb.name }}</span>
          </template>
        </template>
      </div>

      <!-- ============ 主體 ============ -->
      <div class="fe-body">
        <!-- 左側導覽 -->
        <div class="fe-nav" :style="{ width: navWidth + 'px' }">
          <div class="fe-nav-group">
            <div class="fe-nav-group-title fe-nav-group-title-toggle" @click="systemSectionCollapsed = !systemSectionCollapsed">
              <span class="fe-nav-toggle">
                <i :class="systemSectionCollapsed ? 'bi bi-caret-right-fill' : 'bi bi-caret-down-fill'"></i>
              </span>
              <i class="bi bi-shield-lock me-1"></i>系統文件
            </div>
            <template v-if="!systemSectionCollapsed">
            <template v-for="group in systemGroups" :key="group.label">
              <div class="fe-nav-item fe-nav-subgroup" @click="toggleSystemGroup(group.label)">
                <span class="fe-nav-toggle">
                  <i :class="collapsedSystemGroups.has(group.label) ? 'bi bi-caret-right-fill' : 'bi bi-caret-down-fill'"></i>
                </span>
                <i class="bi bi-collection"></i>
                <span class="fe-nav-label">{{ group.label }}</span>
                <span class="fe-nav-count">{{ group.totalCount }}</span>
              </div>
              <template v-if="!collapsedSystemGroups.has(group.label)">
                <div
                  v-for="node in group.nodes"
                  :key="group.label + '-' + node.sourceType"
                  class="fe-nav-item fe-nav-subitem"
                  :class="{ active: isSystemActive(node.sourceType) }"
                  @click="selectSystem(node.sourceType)"
                >
                  <i class="bi bi-folder-symlink"></i>
                  <span class="fe-nav-label">{{ node.label }}</span>
                  <span class="fe-nav-count">{{ node.fileCount }}</span>
                </div>
              </template>
            </template>
            </template>
          </div>

          <div class="fe-nav-group">
            <div class="fe-nav-group-title fe-nav-group-title-toggle" @click="projectSectionCollapsed = !projectSectionCollapsed">
              <span class="fe-nav-toggle">
                <i :class="projectSectionCollapsed ? 'bi bi-caret-right-fill' : 'bi bi-caret-down-fill'"></i>
              </span>
              <i class="bi bi-folder2-open me-1"></i>專案文件
            </div>
            <template v-if="!projectSectionCollapsed">
              <div
                class="fe-nav-item"
                :class="{ active: isFreeActive(null) }"
                @click="selectFree(null)"
                @contextmenu.prevent.stop="openBlankMenuAt($event, null)"
              >
                <i class="bi bi-house"></i>
                <span class="fe-nav-label">（根目錄）</span>
              </div>
              <div
                v-for="row in visibleFolders"
                :key="row.folder.id"
                class="fe-nav-item"
                :class="{ active: isFreeActive(row.folder.id) }"
                :style="{ paddingLeft: 10 + row.depth * 14 + 'px' }"
                @click="selectFree(row.folder.id)"
                @contextmenu.prevent.stop="openFolderMenuAt($event, row.folder)"
              >
                <span class="fe-nav-toggle" @click.stop="row.hasChildren && toggleExpand(row.folder.id)">
                  <i
                    v-if="row.hasChildren"
                    :class="expandedIds.has(row.folder.id) ? 'bi bi-caret-down-fill' : 'bi bi-caret-right-fill'"
                  ></i>
                </span>
                <i class="bi bi-folder-fill fe-folder-icon"></i>
                <span class="fe-nav-label">{{ row.folder.name }}</span>
              </div>
            </template>
          </div>
        </div>

        <!-- 側邊欄寬度拖曳分隔線（雙擊還原預設寬度） -->
        <div
          class="fe-splitter"
          :class="{ dragging: isResizingNav }"
          title="拖曳調整側邊欄寬度"
          @mousedown.prevent="startNavResize"
          @dblclick="resetNavWidth"
        ></div>

        <!-- 檔案列表 -->
        <div
          class="fe-main"
          @contextmenu.prevent="onBlankContextMenu($event)"
          @click="selectedKey = null"
        >
          <div v-if="selection.kind === 'system'" class="fe-hint">
            <i class="bi bi-info-circle me-1"></i>
            此處檔案由「{{ currentSystemLabel }}」管理，如需新增或刪除請至來源功能；可在檔案上按右鍵「建立捷徑」到專案文件自行整理。
          </div>

          <table class="fe-table">
            <thead>
              <tr>
                <th class="fe-col-name" @click="setSort('name')">
                  名稱 <i v-if="sortKey === 'name'" :class="sortDir === 1 ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
                </th>
                <th v-if="selection.kind === 'search'" class="fe-col-loc">位置</th>
                <th class="fe-col-type">類型</th>
                <th class="fe-col-size" @click="setSort('size')">
                  大小 <i v-if="sortKey === 'size'" :class="sortDir === 1 ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
                </th>
                <th class="fe-col-date" @click="setSort('date')">
                  建立時間 <i v-if="sortKey === 'date'" :class="sortDir === 1 ? 'bi bi-caret-up-fill' : 'bi bi-caret-down-fill'"></i>
                </th>
              </tr>
            </thead>
            <tbody>
              <!-- 子資料夾 -->
              <tr
                v-for="folder in sortedFolders"
                :key="'folder-' + folder.id"
                class="fe-row"
                :class="{ selected: selectedKey === 'folder-' + folder.id }"
                @click.stop="selectedKey = 'folder-' + folder.id"
                @dblclick="selectFree(folder.id)"
                @contextmenu.prevent.stop="openFolderMenuAt($event, folder)"
              >
                <td :colspan="selection.kind === 'search' ? 2 : 1">
                  <i class="bi bi-folder-fill fe-folder-icon me-2"></i>{{ folder.name }}
                </td>
                <td class="fe-muted">資料夾</td>
                <td class="fe-muted"></td>
                <td class="fe-muted">{{ formatDate(folder.createdAt) }}</td>
              </tr>

              <!-- 檔案 -->
              <tr
                v-for="item in sortedItems"
                :key="rowKey(item)"
                class="fe-row"
                :class="{ selected: selectedKey === rowKey(item) }"
                @click.stop="selectedKey = rowKey(item)"
                @dblclick="openFile(item)"
                @contextmenu.prevent.stop="openFileMenuAt($event, item)"
              >
                <td>
                  <i :class="fileIcon(item) + ' me-2'"></i>
                  <span class="fe-file-name">{{ item.fileName }}</span>
                  <i v-if="item.shortcutId != null" class="bi bi-arrow-up-right-square ms-2 fe-shortcut-mark" title="捷徑"></i>
                  <i v-else-if="item.readonly" class="bi bi-lock-fill ms-2 fe-lock-mark" title="系統文件（唯讀）"></i>
                </td>
                <td v-if="selection.kind === 'search'" class="fe-muted">{{ item.sourceLabel }}</td>
                <td class="fe-muted">{{ fileTypeLabel(item) }}</td>
                <td class="fe-muted">{{ formatSize(item.fileSize) }}</td>
                <td class="fe-muted">{{ formatDate(item.createdAt) }}</td>
              </tr>

              <tr v-if="!loading && sortedFolders.length === 0 && sortedItems.length === 0">
                <td :colspan="colCount" class="fe-empty">
                  {{ selection.kind === 'search' ? '找不到符合的檔案' : '此位置沒有檔案' }}
                </td>
              </tr>
              <tr v-if="loading">
                <td :colspan="colCount" class="fe-empty">
                  <span class="spinner-border spinner-border-sm me-2"></span>載入中…
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- ============ 狀態列 ============ -->
      <div class="fe-statusbar">
        <span>{{ statusText }}</span>
      </div>
    </div>

    <!-- ============ 右鍵選單 ============ -->
    <Teleport to="body">
      <div
        v-if="contextMenu.visible"
        class="fe-context-menu fe-dark"
        :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }"
        @click.stop
        @contextmenu.prevent
      >
        <template v-for="(entry, idx) in contextMenu.entries" :key="idx">
          <div v-if="entry.separator" class="fe-menu-sep"></div>
          <div
            v-else
            class="fe-menu-item"
            :class="{ danger: entry.danger }"
            @click="runMenuAction(entry)"
          >
            <i :class="entry.icon" class="fe-menu-icon"></i>
            <span>{{ entry.label }}</span>
          </div>
        </template>
      </div>
    </Teleport>

    <!-- ============ 自製對話框 ============ -->
    <Teleport to="body">
      <!-- 名稱輸入（新增資料夾 / 重新命名） -->
      <div v-if="nameDialog.visible" class="fe-dialog-overlay fe-dark" @mousedown.self="nameDialog.visible = false">
        <div class="fe-dialog fe-dialog-sm">
          <div class="fe-dialog-titlebar">
            <i :class="nameDialog.icon" class="me-2"></i>
            <span>{{ nameDialog.title }}</span>
            <button class="fe-dialog-close" @click="nameDialog.visible = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="fe-dialog-body">
            <div class="fe-dialog-label">{{ nameDialog.label }}</div>
            <input
              ref="nameInputRef"
              v-model="nameDialog.value"
              type="text"
              class="fe-dialog-input"
              @keyup.enter="confirmNameDialog"
              @keyup.esc="nameDialog.visible = false"
            />
          </div>
          <div class="fe-dialog-footer">
            <button class="fe-btn fe-btn-primary" :disabled="!nameDialog.value.trim()" @click="confirmNameDialog">確定</button>
            <button class="fe-btn" @click="nameDialog.visible = false">取消</button>
          </div>
        </div>
      </div>

      <!-- 選擇目的資料夾（搬移 / 建立捷徑） -->
      <div v-if="pickDialog.visible" class="fe-dialog-overlay fe-dark" @mousedown.self="pickDialog.visible = false">
        <div class="fe-dialog fe-dialog-md">
          <div class="fe-dialog-titlebar">
            <i :class="pickDialog.icon" class="me-2"></i>
            <span>{{ pickDialog.title }}</span>
            <button class="fe-dialog-close" @click="pickDialog.visible = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="fe-dialog-body">
            <div class="fe-dialog-label">{{ pickDialog.label }}</div>
            <div class="fe-picktree">
              <div
                class="fe-picktree-item"
                :class="{ selected: pickDialog.selected === null }"
                @click="pickDialog.selected = null"
              >
                <i class="bi bi-house me-2"></i>專案文件（根目錄）
              </div>
              <div
                v-for="row in pickTreeRows"
                :key="row.folder.id"
                class="fe-picktree-item"
                :class="{ selected: pickDialog.selected === row.folder.id, disabled: pickDialog.disabledIds.has(row.folder.id) }"
                :style="{ paddingLeft: 12 + (row.depth + 1) * 18 + 'px' }"
                @click="!pickDialog.disabledIds.has(row.folder.id) && (pickDialog.selected = row.folder.id)"
              >
                <i class="bi bi-folder-fill fe-folder-icon me-2"></i>{{ row.folder.name }}
              </div>
            </div>
          </div>
          <div class="fe-dialog-footer">
            <button class="fe-btn fe-btn-primary" @click="confirmPickDialog">
              {{ pickDialog.confirmText }}
            </button>
            <button class="fe-btn" @click="pickDialog.visible = false">取消</button>
          </div>
        </div>
      </div>

      <!-- 確認（刪除等） -->
      <div v-if="confirmDialog.visible" class="fe-dialog-overlay fe-dark" @mousedown.self="confirmDialog.visible = false">
        <div class="fe-dialog fe-dialog-sm">
          <div class="fe-dialog-titlebar">
            <i class="bi bi-exclamation-triangle-fill me-2 text-warning"></i>
            <span>{{ confirmDialog.title }}</span>
            <button class="fe-dialog-close" @click="confirmDialog.visible = false"><i class="bi bi-x-lg"></i></button>
          </div>
          <div class="fe-dialog-body">
            <div class="fe-confirm-message">{{ confirmDialog.message }}</div>
          </div>
          <div class="fe-dialog-footer">
            <button class="fe-btn" :class="confirmDialog.danger ? 'fe-btn-danger' : 'fe-btn-primary'" @click="runConfirm">
              {{ confirmDialog.confirmText }}
            </button>
            <button class="fe-btn" @click="confirmDialog.visible = false">取消</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useWorkspaceStore } from '@/stores/workspace'
import PageHeader from '@/components/bootstrap/PageHeader.vue'
import toastService from '@/components/bootstrap/ToastService.js'
import {
  getExplorerTree,
  browseSystem,
  browseFolder,
  searchFiles,
  createFolder,
  renameFolder,
  moveFolder,
  deleteFolder,
  uploadFiles,
  renameFile,
  moveFile,
  deleteFile,
  createShortcut,
  deleteShortcut,
  openExplorerFileInNewTab,
  downloadExplorerFileBlob,
  type FileExplorerTree,
  type FileExplorerItem,
  type FolderNode,
  type SystemSourceNode
} from '@/api/fileExplorer'

const router = useRouter()
const route = useRoute()
const workspaceStore = useWorkspaceStore()
const hasCurrentProject = computed(() => !!workspaceStore.currentProject)
const constructionId = computed(() => workspaceStore.currentProject?.id ?? '')

/* ---------------------------- 導覽狀態 ---------------------------- */

type Selection =
  | { kind: 'system'; sourceType: string }
  | { kind: 'free'; folderId: number | null }
  | { kind: 'search' }

const tree = ref<FileExplorerTree>({ system: [], folders: [] })
const selection = ref<Selection>({ kind: 'free', folderId: null })
const items = ref<FileExplorerItem[]>([])
const subFolders = ref<FolderNode[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const activeSearchKeyword = ref('')
const expandedIds = ref<Set<number>>(new Set())
const uploadInputRef = ref<HTMLInputElement | null>(null)
const selectedKey = ref<string | null>(null)

/** deep-link：只顯示指定來源紀錄（sourceId）的檔案，例如某次計劃書送審的附件 */
const sourceIdFilter = ref<string | null>(null)

/* ---------------------------- 側邊欄寬度（可拖曳，記住設定） ---------------------------- */

const NAV_WIDTH_DEFAULT = 265
const NAV_WIDTH_MIN = 180
const NAV_WIDTH_MAX = 520
const NAV_WIDTH_STORAGE_KEY = 'file-explorer-nav-width'

function loadNavWidth(): number {
  const raw = Number(localStorage.getItem(NAV_WIDTH_STORAGE_KEY))
  if (Number.isFinite(raw) && raw >= NAV_WIDTH_MIN && raw <= NAV_WIDTH_MAX) return raw
  return NAV_WIDTH_DEFAULT
}

const navWidth = ref(loadNavWidth())
const isResizingNav = ref(false)
let resizeStartX = 0
let resizeStartWidth = 0

function startNavResize(event: MouseEvent) {
  isResizingNav.value = true
  resizeStartX = event.clientX
  resizeStartWidth = navWidth.value
  document.body.style.cursor = 'col-resize'
  document.body.style.userSelect = 'none'
  window.addEventListener('mousemove', onNavResizeMove)
  window.addEventListener('mouseup', stopNavResize)
}

function onNavResizeMove(event: MouseEvent) {
  const next = resizeStartWidth + (event.clientX - resizeStartX)
  navWidth.value = Math.min(NAV_WIDTH_MAX, Math.max(NAV_WIDTH_MIN, next))
}

function stopNavResize() {
  if (!isResizingNav.value) return
  isResizingNav.value = false
  document.body.style.cursor = ''
  document.body.style.userSelect = ''
  window.removeEventListener('mousemove', onNavResizeMove)
  window.removeEventListener('mouseup', stopNavResize)
  try {
    localStorage.setItem(NAV_WIDTH_STORAGE_KEY, String(navWidth.value))
  } catch {
    /* ignore */
  }
}

function resetNavWidth() {
  navWidth.value = NAV_WIDTH_DEFAULT
  try {
    localStorage.setItem(NAV_WIDTH_STORAGE_KEY, String(NAV_WIDTH_DEFAULT))
  } catch {
    /* ignore */
  }
}

const colCount = computed(() => (selection.value.kind === 'search' ? 5 : 4))

const statusText = computed(() => {
  if (loading.value) return '載入中…'
  const total = sortedFolders.value.length + sortedItems.value.length
  return `${total} 個項目`
})

/* ---------------------------- 樹狀計算 ---------------------------- */

interface FolderRow {
  folder: FolderNode
  depth: number
  hasChildren: boolean
}

const childrenMap = computed(() => {
  const map = new Map<number | null, FolderNode[]>()
  for (const f of tree.value.folders) {
    const key = f.parentId ?? null
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(f)
  }
  return map
})

const visibleFolders = computed<FolderRow[]>(() => {
  const rows: FolderRow[] = []
  const walk = (parentId: number | null, depth: number) => {
    for (const f of childrenMap.value.get(parentId) ?? []) {
      const hasChildren = (childrenMap.value.get(f.id) ?? []).length > 0
      rows.push({ folder: f, depth, hasChildren })
      if (hasChildren && expandedIds.value.has(f.id)) walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
})

/** 全部資料夾（含縮排，供目的資料夾選擇樹） */
const pickTreeRows = computed<FolderRow[]>(() => {
  const rows: FolderRow[] = []
  const walk = (parentId: number | null, depth: number) => {
    for (const f of childrenMap.value.get(parentId) ?? []) {
      rows.push({ folder: f, depth, hasChildren: false })
      walk(f.id, depth + 1)
    }
  }
  walk(null, 0)
  return rows
})

const freeBreadcrumbs = computed<FolderNode[]>(() => {
  if (selection.value.kind !== 'free' || selection.value.folderId == null) return []
  const byId = new Map(tree.value.folders.map((f) => [f.id, f]))
  const chain: FolderNode[] = []
  let cursor = byId.get(selection.value.folderId)
  while (cursor) {
    chain.unshift(cursor)
    cursor = cursor.parentId != null ? byId.get(cursor.parentId) : undefined
  }
  return chain
})

const currentSystemLabel = computed(() => {
  if (selection.value.kind !== 'system') return ''
  const st = selection.value.sourceType
  return tree.value.system.find((s) => s.sourceType === st)?.label ?? st
})

const currentSystemGroup = computed(() => {
  if (selection.value.kind !== 'system') return ''
  const st = selection.value.sourceType
  return tree.value.system.find((s) => s.sourceType === st)?.group ?? ''
})

/* ---------------------------- 系統文件子分類（可收折） ---------------------------- */

interface SystemGroup {
  label: string
  nodes: SystemSourceNode[]
  totalCount: number
}

const systemGroups = computed<SystemGroup[]>(() => {
  const map = new Map<string, SystemSourceNode[]>()
  for (const node of tree.value.system) {
    const key = node.group ?? '其他'
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(node)
  }
  return Array.from(map.entries()).map(([label, nodes]) => ({
    label,
    nodes,
    totalCount: nodes.reduce((sum, n) => sum + n.fileCount, 0)
  }))
})

const collapsedSystemGroups = ref<Set<string>>(new Set())

function toggleSystemGroup(label: string) {
  if (collapsedSystemGroups.value.has(label)) collapsedSystemGroups.value.delete(label)
  else collapsedSystemGroups.value.add(label)
}

/** 兩個頂層區塊（系統文件／專案文件）的收合狀態 */
const systemSectionCollapsed = ref(false)
const projectSectionCollapsed = ref(false)

/* ---------------------------- 排序 ---------------------------- */

type SortKey = 'name' | 'size' | 'date'
const sortKey = ref<SortKey>('name')
const sortDir = ref<1 | -1>(1)

function setSort(key: SortKey) {
  if (sortKey.value === key) sortDir.value = sortDir.value === 1 ? -1 : 1
  else {
    sortKey.value = key
    sortDir.value = 1
  }
}

const sortedFolders = computed(() => {
  const list = [...subFolders.value]
  const dir = sortDir.value
  if (sortKey.value === 'date') {
    list.sort((a, b) => dir * String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? '')))
  } else {
    list.sort((a, b) => dir * a.name.localeCompare(b.name, 'zh-Hant'))
  }
  return list
})

const sortedItems = computed(() => {
  let source = items.value
  if (sourceIdFilter.value != null && selection.value.kind === 'system') {
    source = source.filter((it) => it.sourceId === sourceIdFilter.value)
  }
  const list = [...source]
  const dir = sortDir.value
  list.sort((a, b) => {
    if (sortKey.value === 'size') return dir * (a.fileSize - b.fileSize)
    if (sortKey.value === 'date') return dir * String(a.createdAt ?? '').localeCompare(String(b.createdAt ?? ''))
    return dir * a.fileName.localeCompare(b.fileName, 'zh-Hant')
  })
  return list
})

/* ---------------------------- 載入 ---------------------------- */

async function reloadTree() {
  if (!constructionId.value) return
  try {
    tree.value = await getExplorerTree(constructionId.value)
  } catch (e) {
    console.error('[FileExplorer] 載入樹狀失敗', e)
  }
}

async function reloadContent() {
  if (!constructionId.value) return
  loading.value = true
  selectedKey.value = null
  try {
    if (selection.value.kind === 'system') {
      const result = await browseSystem(constructionId.value, selection.value.sourceType)
      subFolders.value = []
      items.value = result.files
    } else if (selection.value.kind === 'free') {
      const result = await browseFolder(constructionId.value, selection.value.folderId)
      subFolders.value = result.folders
      items.value = result.files
    } else {
      subFolders.value = []
      items.value = await searchFiles(constructionId.value, activeSearchKeyword.value)
    }
  } catch (e) {
    console.error('[FileExplorer] 載入內容失敗', e)
    toastService.error('載入檔案列表失敗')
  } finally {
    loading.value = false
  }
}

async function refreshAll() {
  await Promise.all([reloadTree(), reloadContent()])
}

function isSystemActive(sourceType: string): boolean {
  return selection.value.kind === 'system' && selection.value.sourceType === sourceType
}

function isFreeActive(folderId: number | null): boolean {
  return selection.value.kind === 'free' && selection.value.folderId === folderId
}

function selectSystem(sourceType: string) {
  selection.value = { kind: 'system', sourceType }
  sourceIdFilter.value = null
  reloadContent()
}

function selectFree(folderId: number | null) {
  selection.value = { kind: 'free', folderId }
  sourceIdFilter.value = null
  if (folderId != null) {
    const byId = new Map(tree.value.folders.map((f) => [f.id, f]))
    let cursor = byId.get(folderId)
    while (cursor) {
      expandedIds.value.add(cursor.id)
      cursor = cursor.parentId != null ? byId.get(cursor.parentId) : undefined
    }
  }
  reloadContent()
}

function toggleExpand(folderId: number) {
  if (expandedIds.value.has(folderId)) expandedIds.value.delete(folderId)
  else expandedIds.value.add(folderId)
}

function doSearch() {
  const kw = searchKeyword.value.trim()
  if (!kw) return
  activeSearchKeyword.value = kw
  selection.value = { kind: 'search' }
  reloadContent()
}

function exitSearch() {
  searchKeyword.value = ''
  activeSearchKeyword.value = ''
  selection.value = { kind: 'free', folderId: null }
  reloadContent()
}

/* ---------------------------- 右鍵選單 ---------------------------- */

interface MenuEntry {
  separator?: boolean
  label?: string
  icon?: string
  danger?: boolean
  action?: () => void
}

const contextMenu = reactive({
  visible: false,
  x: 0,
  y: 0,
  entries: [] as MenuEntry[]
})

function showMenu(event: MouseEvent, entries: MenuEntry[]) {
  const menuWidth = 230
  const menuHeight = entries.length * 34 + 12
  contextMenu.entries = entries
  contextMenu.x = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
  contextMenu.y = Math.min(event.clientY, window.innerHeight - menuHeight - 8)
  contextMenu.visible = true
}

function closeContextMenu() {
  contextMenu.visible = false
}

function runMenuAction(entry: MenuEntry) {
  closeContextMenu()
  entry.action?.()
}

function openFileMenuAt(event: MouseEvent, item: FileExplorerItem) {
  selectedKey.value = rowKey(item)
  const entries: MenuEntry[] = [
    { label: '開啟（預覽）', icon: 'bi bi-box-arrow-up-right', action: () => openFile(item) },
    { label: '下載', icon: 'bi bi-download', action: () => downloadFileAction(item) }
  ]
  if (item.readonly && item.sourceRoutePath) {
    entries.push({ separator: true })
    entries.push({ label: `開啟來源（${item.sourceLabel}）`, icon: 'bi bi-signpost', action: () => goSource(item) })
  }
  if (item.shortcutId == null) {
    entries.push({ separator: true })
    entries.push({ label: '建立捷徑到專案文件…', icon: 'bi bi-link-45deg', action: () => openCreateShortcut(item) })
  }
  if (!item.readonly && item.shortcutId == null) {
    entries.push({ separator: true })
    entries.push({ label: '重新命名', icon: 'bi bi-pencil', action: () => openRenameFile(item) })
    entries.push({ label: '搬移到…', icon: 'bi bi-arrows-move', action: () => openMoveFile(item) })
    entries.push({ separator: true })
    entries.push({ label: '刪除', icon: 'bi bi-trash', danger: true, action: () => askDeleteFile(item) })
  }
  if (item.shortcutId != null) {
    entries.push({ separator: true })
    entries.push({ label: '移除捷徑', icon: 'bi bi-x-circle', danger: true, action: () => askDeleteShortcut(item) })
  }
  showMenu(event, entries)
}

function openFolderMenuAt(event: MouseEvent, folder: FolderNode) {
  selectedKey.value = 'folder-' + folder.id
  showMenu(event, [
    { label: '開啟', icon: 'bi bi-folder2-open', action: () => selectFree(folder.id) },
    { separator: true },
    { label: '新增子資料夾…', icon: 'bi bi-folder-plus', action: () => openCreateFolder(folder.id) },
    { label: '重新命名', icon: 'bi bi-pencil', action: () => openRenameFolder(folder) },
    { label: '搬移到…', icon: 'bi bi-arrows-move', action: () => openMoveFolder(folder) },
    { separator: true },
    { label: '刪除', icon: 'bi bi-trash', danger: true, action: () => askDeleteFolder(folder) }
  ])
}

function openBlankMenuAt(event: MouseEvent, folderId: number | null) {
  showMenu(event, [
    { label: '新增資料夾…', icon: 'bi bi-folder-plus', action: () => openCreateFolder(folderId) },
    { label: '上傳檔案…', icon: 'bi bi-upload', action: () => triggerUploadTo(folderId) },
    { separator: true },
    { label: '重新整理', icon: 'bi bi-arrow-clockwise', action: () => refreshAll() }
  ])
}

/** 檔案列表空白處右鍵 */
function onBlankContextMenu(event: MouseEvent) {
  if (selection.value.kind === 'free') {
    openBlankMenuAt(event, selection.value.folderId)
  } else {
    showMenu(event, [
      { label: '重新整理', icon: 'bi bi-arrow-clockwise', action: () => refreshAll() }
    ])
  }
}

function onWindowKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') closeContextMenu()
}

/* ---------------------------- 名稱對話框 ---------------------------- */

type NameDialogMode =
  | { type: 'createFolder'; parentId: number | null }
  | { type: 'renameFolder'; folderId: number }
  | { type: 'renameFile'; fileId: number }

const nameInputRef = ref<HTMLInputElement | null>(null)

const nameDialog = reactive({
  visible: false,
  title: '',
  label: '',
  icon: 'bi bi-folder-plus',
  value: '',
  mode: null as NameDialogMode | null
})

function showNameDialog(mode: NameDialogMode, title: string, label: string, icon: string, initial: string) {
  nameDialog.mode = mode
  nameDialog.title = title
  nameDialog.label = label
  nameDialog.icon = icon
  nameDialog.value = initial
  nameDialog.visible = true
  nextTick(() => {
    nameInputRef.value?.focus()
    nameInputRef.value?.select()
  })
}

function openCreateFolder(parentId: number | null) {
  showNameDialog({ type: 'createFolder', parentId }, '新增資料夾', '資料夾名稱：', 'bi bi-folder-plus', '新增資料夾')
}

function openRenameFolder(folder: FolderNode) {
  showNameDialog({ type: 'renameFolder', folderId: folder.id }, '重新命名資料夾', '新名稱：', 'bi bi-pencil', folder.name)
}

function openRenameFile(item: FileExplorerItem) {
  showNameDialog({ type: 'renameFile', fileId: item.id }, '重新命名檔案', '新名稱：', 'bi bi-pencil', item.fileName)
}

async function confirmNameDialog() {
  const mode = nameDialog.mode
  const value = nameDialog.value.trim()
  if (!mode || !value || !constructionId.value) return
  try {
    if (mode.type === 'createFolder') {
      await createFolder(constructionId.value, value, mode.parentId)
      toastService.success('資料夾已建立')
    } else if (mode.type === 'renameFolder') {
      await renameFolder(constructionId.value, mode.folderId, value)
      toastService.success('資料夾已重新命名')
    } else {
      await renameFile(constructionId.value, mode.fileId, value)
      toastService.success('檔案已重新命名')
    }
    nameDialog.visible = false
    await refreshAll()
  } catch (e) {
    console.error('[FileExplorer] 操作失敗', e)
    toastService.error(extractErrorMessage(e) || '操作失敗，請稍後再試')
  }
}

/* ---------------------------- 目的資料夾對話框 ---------------------------- */

type PickDialogMode =
  | { type: 'moveFolder'; folderId: number }
  | { type: 'moveFile'; fileId: number }
  | { type: 'shortcut'; fileIndexId: number }

const pickDialog = reactive({
  visible: false,
  title: '',
  label: '',
  icon: 'bi bi-arrows-move',
  confirmText: '搬移',
  selected: null as number | null,
  disabledIds: new Set<number>(),
  mode: null as PickDialogMode | null
})

/** 搬移資料夾時，自己與子孫不可作為目的地 */
function descendantIdsOf(folderId: number): Set<number> {
  const result = new Set<number>([folderId])
  const walk = (id: number) => {
    for (const child of childrenMap.value.get(id) ?? []) {
      result.add(child.id)
      walk(child.id)
    }
  }
  walk(folderId)
  return result
}

function openMoveFolder(folder: FolderNode) {
  pickDialog.mode = { type: 'moveFolder', folderId: folder.id }
  pickDialog.title = `搬移「${folder.name}」`
  pickDialog.label = '選擇目的資料夾：'
  pickDialog.icon = 'bi bi-arrows-move'
  pickDialog.confirmText = '搬移'
  pickDialog.selected = null
  pickDialog.disabledIds = descendantIdsOf(folder.id)
  pickDialog.visible = true
}

function openMoveFile(item: FileExplorerItem) {
  pickDialog.mode = { type: 'moveFile', fileId: item.id }
  pickDialog.title = `搬移「${item.fileName}」`
  pickDialog.label = '選擇目的資料夾：'
  pickDialog.icon = 'bi bi-arrows-move'
  pickDialog.confirmText = '搬移'
  pickDialog.selected = null
  pickDialog.disabledIds = new Set()
  pickDialog.visible = true
}

function openCreateShortcut(item: FileExplorerItem) {
  pickDialog.mode = { type: 'shortcut', fileIndexId: item.id }
  pickDialog.title = `建立「${item.fileName}」的捷徑`
  pickDialog.label = '選擇捷徑放置位置：'
  pickDialog.icon = 'bi bi-link-45deg'
  pickDialog.confirmText = '建立捷徑'
  pickDialog.selected = null
  pickDialog.disabledIds = new Set()
  pickDialog.visible = true
}

async function confirmPickDialog() {
  const mode = pickDialog.mode
  if (!mode || !constructionId.value) return
  try {
    if (mode.type === 'moveFolder') {
      await moveFolder(constructionId.value, mode.folderId, pickDialog.selected)
      toastService.success('資料夾已搬移')
    } else if (mode.type === 'moveFile') {
      await moveFile(constructionId.value, mode.fileId, pickDialog.selected)
      toastService.success('檔案已搬移')
    } else {
      await createShortcut(constructionId.value, mode.fileIndexId, pickDialog.selected)
      toastService.success('捷徑已建立，可至專案文件檢視')
    }
    pickDialog.visible = false
    await refreshAll()
  } catch (e) {
    console.error('[FileExplorer] 操作失敗', e)
    toastService.error(extractErrorMessage(e) || '操作失敗，請稍後再試')
  }
}

/* ---------------------------- 確認對話框 ---------------------------- */

const confirmDialog = reactive({
  visible: false,
  title: '',
  message: '',
  confirmText: '確定',
  danger: false,
  onConfirm: null as (() => void | Promise<void>) | null
})

function askConfirm(title: string, message: string, confirmText: string, danger: boolean, onConfirm: () => void | Promise<void>) {
  confirmDialog.title = title
  confirmDialog.message = message
  confirmDialog.confirmText = confirmText
  confirmDialog.danger = danger
  confirmDialog.onConfirm = onConfirm
  confirmDialog.visible = true
}

async function runConfirm() {
  const fn = confirmDialog.onConfirm
  confirmDialog.visible = false
  if (fn) await fn()
}

function askDeleteFolder(folder: FolderNode) {
  askConfirm(
    '刪除資料夾',
    `確定要刪除「${folder.name}」嗎？其中的檔案與子資料夾將一併刪除，此動作無法復原。`,
    '刪除',
    true,
    async () => {
      try {
        await deleteFolder(constructionId.value, folder.id)
        toastService.success('資料夾已刪除')
        await refreshAll()
      } catch (e) {
        console.error('[FileExplorer] 刪除資料夾失敗', e)
        toastService.error('刪除失敗，請稍後再試')
      }
    }
  )
}

function askDeleteFile(item: FileExplorerItem) {
  askConfirm(
    '刪除檔案',
    `確定要刪除「${item.fileName}」嗎？此動作無法復原。`,
    '刪除',
    true,
    async () => {
      try {
        await deleteFile(constructionId.value, item.id)
        toastService.success('檔案已刪除')
        await refreshAll()
      } catch (e) {
        console.error('[FileExplorer] 刪除檔案失敗', e)
        toastService.error('刪除失敗，請稍後再試')
      }
    }
  )
}

function askDeleteShortcut(item: FileExplorerItem) {
  if (item.shortcutId == null) return
  askConfirm(
    '移除捷徑',
    `移除「${item.fileName}」的捷徑？原始檔案不會被刪除。`,
    '移除',
    false,
    async () => {
      try {
        await deleteShortcut(constructionId.value, item.shortcutId!)
        toastService.success('捷徑已移除')
        await reloadContent()
      } catch (e) {
        console.error('[FileExplorer] 移除捷徑失敗', e)
        toastService.error('移除失敗，請稍後再試')
      }
    }
  )
}

/* ---------------------------- 上傳 ---------------------------- */

const uploadTargetFolderId = ref<number | null>(null)

function triggerUpload() {
  if (selection.value.kind !== 'free') return
  uploadTargetFolderId.value = selection.value.folderId
  uploadInputRef.value?.click()
}

function triggerUploadTo(folderId: number | null) {
  uploadTargetFolderId.value = folderId
  uploadInputRef.value?.click()
}

async function onUploadFiles(event: Event) {
  const input = event.target as HTMLInputElement
  const files = Array.from(input.files ?? [])
  input.value = ''
  if (files.length === 0 || !constructionId.value) return
  loading.value = true
  try {
    await uploadFiles(constructionId.value, files, uploadTargetFolderId.value)
    toastService.success(`已上傳 ${files.length} 個檔案`)
    await refreshAll()
  } catch (e) {
    console.error('[FileExplorer] 上傳失敗', e)
    toastService.error('上傳失敗，請稍後再試')
  } finally {
    loading.value = false
  }
}

/* ---------------------------- 開啟 / 下載 / 來源 ---------------------------- */

async function openFile(item: FileExplorerItem) {
  try {
    await openExplorerFileInNewTab(constructionId.value, item.id)
  } catch (e) {
    console.error('[FileExplorer] 開啟檔案失敗', e)
    toastService.error('無法開啟檔案，請稍後再試')
  }
}

async function downloadFileAction(item: FileExplorerItem) {
  try {
    const blob = await downloadExplorerFileBlob(constructionId.value, item.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = item.fileName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  } catch (e) {
    console.error('[FileExplorer] 下載失敗', e)
    toastService.error('下載失敗，請稍後再試')
  }
}

function goSource(item: FileExplorerItem) {
  if (!item.sourceRoutePath) return
  router.push(item.sourceRoutePath)
}

/* ---------------------------- 顯示工具 ---------------------------- */

function rowKey(item: FileExplorerItem): string {
  return item.shortcutId != null ? `shortcut-${item.shortcutId}` : `file-${item.id}`
}

function fileIcon(item: FileExplorerItem): string {
  const name = item.fileName.toLowerCase()
  const ct = (item.contentType ?? '').toLowerCase()
  if (ct.includes('pdf') || name.endsWith('.pdf')) return 'bi bi-file-earmark-pdf fe-icon-pdf'
  if (ct.startsWith('image/') || /\.(png|jpe?g|gif|webp)$/.test(name)) return 'bi bi-file-earmark-image fe-icon-img'
  if (/\.(docx?|odt)$/.test(name)) return 'bi bi-file-earmark-word fe-icon-doc'
  if (/\.(xlsx?|csv|ods)$/.test(name)) return 'bi bi-file-earmark-excel fe-icon-xls'
  if (/\.(pptx?)$/.test(name)) return 'bi bi-file-earmark-ppt fe-icon-ppt'
  if (/\.(zip|rar|7z)$/.test(name)) return 'bi bi-file-earmark-zip fe-icon-zip'
  return 'bi bi-file-earmark fe-icon-file'
}

function fileTypeLabel(item: FileExplorerItem): string {
  if (item.shortcutId != null) return '捷徑'
  const name = item.fileName.toLowerCase()
  const ext = name.includes('.') ? name.substring(name.lastIndexOf('.') + 1).toUpperCase() : ''
  return ext ? `${ext} 檔案` : '檔案'
}

function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return ''
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

function formatDate(value: string | null): string {
  if (!value) return ''
  return value.replace('T', ' ').slice(0, 16)
}

function extractErrorMessage(e: unknown): string {
  const resp = (e as { response?: { data?: { message?: string } } })?.response
  return resp?.data?.message ?? ''
}

/* ---------------------------- 生命週期 ---------------------------- */

/** 解析 deep-link（例如 /file-explorer?sourceType=PLAN_SUBMISSION_P2&sourceId=3）：定位系統節點並篩選來源紀錄 */
function applyDeepLinkFromQuery() {
  const st = String(route.query.sourceType ?? '').trim()
  if (!st) return
  selection.value = { kind: 'system', sourceType: st.toUpperCase() }
  const sid = String(route.query.sourceId ?? '').trim()
  sourceIdFilter.value = sid || null
}

function clearSourceFilter() {
  sourceIdFilter.value = null
}

onMounted(async () => {
  window.addEventListener('keydown', onWindowKeydown)
  window.addEventListener('click', closeContextMenu)
  window.addEventListener('scroll', closeContextMenu, true)
  window.addEventListener('resize', closeContextMenu)
  applyDeepLinkFromQuery()
  if (constructionId.value) {
    await refreshAll()
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', onWindowKeydown)
  window.removeEventListener('click', closeContextMenu)
  window.removeEventListener('scroll', closeContextMenu, true)
  window.removeEventListener('resize', closeContextMenu)
  stopNavResize()
})

watch(constructionId, async (val) => {
  if (val) {
    selection.value = { kind: 'free', folderId: null }
    expandedIds.value = new Set()
    await refreshAll()
  }
})
</script>

<style scoped>
.file-explorer-page {
  padding: 1rem;
}

/* ---------------------------- 色票（仿 Win11 深色檔案總管） ---------------------------- */
.fe-dark {
  --fe-window: #202020;
  --fe-panel: #2b2b2b;
  --fe-panel-2: #262626;
  --fe-border: #3d3d3d;
  --fe-text: #e8e8e8;
  --fe-muted: #9d9d9d;
  --fe-hover: rgba(255, 255, 255, 0.06);
  --fe-selected: rgba(96, 165, 250, 0.18);
  --fe-selected-border: rgba(96, 165, 250, 0.45);
  --fe-accent: #60a5fa;
  --fe-accent-strong: #3b82f6;
  --fe-danger: #f87171;
}

/* ---------------------------- 視窗外框 ---------------------------- */
/* 視窗高度鎖在視口內（扣掉 App 頂欄與 PageHeader），內容超出時由內部窗格各自捲動，不撐長整頁 */
.fe-window {
  display: flex;
  flex-direction: column;
  background: var(--fe-window);
  border: 1px solid var(--fe-border);
  border-radius: 8px;
  overflow: hidden;
  color: var(--fe-text);
  height: calc(100vh - 225px);
  min-height: 420px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.35);
}

/* ---------------------------- 命令列 ---------------------------- */
.fe-commandbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 10px;
  background: var(--fe-panel);
  border-bottom: 1px solid var(--fe-border);
  flex-shrink: 0;
}

.fe-cmd-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: transparent;
  border: none;
  border-radius: 5px;
  color: var(--fe-text);
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.fe-cmd-btn:hover {
  background: var(--fe-hover);
}

.fe-cmd-btn i {
  color: var(--fe-accent);
  font-size: 1rem;
}

.fe-cmd-sep {
  width: 1px;
  height: 22px;
  background: var(--fe-border);
  margin: 0 6px;
}

.fe-cmd-spacer {
  flex: 1;
}

.fe-searchbox {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--fe-panel-2);
  border: 1px solid var(--fe-border);
  border-radius: 5px;
  padding: 5px 10px;
  width: 240px;
}

.fe-searchbox i {
  color: var(--fe-muted);
  font-size: 0.85rem;
}

.fe-searchbox input {
  flex: 1;
  min-width: 0;
  background: transparent;
  border: none;
  outline: none;
  color: var(--fe-text);
  font-size: 0.85rem;
}

.fe-searchbox input::placeholder {
  color: var(--fe-muted);
}

.fe-searchbox:focus-within {
  border-color: var(--fe-accent);
}

.fe-search-clear {
  cursor: pointer;
}

.fe-search-clear:hover {
  color: var(--fe-text);
}

/* ---------------------------- 位址列 ---------------------------- */
.fe-addressbar {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  background: var(--fe-panel-2);
  border-bottom: 1px solid var(--fe-border);
  font-size: 0.85rem;
  flex-wrap: wrap;
  flex-shrink: 0;
}

.fe-address-icon {
  color: var(--fe-accent);
  margin-right: 4px;
}

.fe-crumb {
  padding: 2px 6px;
  border-radius: 4px;
  cursor: pointer;
  white-space: nowrap;
}

.fe-crumb:hover {
  background: var(--fe-hover);
}

.fe-crumb.static {
  cursor: default;
}

.fe-crumb.static:hover {
  background: transparent;
}

.fe-crumb-sep {
  font-size: 0.65rem;
  color: var(--fe-muted);
}

.fe-readonly-badge {
  margin-left: 10px;
  padding: 1px 8px;
  border: 1px solid var(--fe-border);
  border-radius: 10px;
  font-size: 0.72rem;
  color: var(--fe-muted);
}

.fe-filter-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-left: 8px;
  padding: 1px 8px;
  border: 1px solid var(--fe-selected-border);
  background: var(--fe-selected);
  border-radius: 10px;
  font-size: 0.72rem;
  color: var(--fe-accent);
}

.fe-filter-clear {
  cursor: pointer;
  margin-left: 2px;
  font-size: 0.65rem;
}

.fe-filter-clear:hover {
  color: var(--fe-text);
}

/* ---------------------------- 卷軸（仿 Win11 細卷軸） ---------------------------- */
.fe-nav,
.fe-main,
.fe-picktree {
  /* Firefox */
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.25) transparent;
}

.fe-nav::-webkit-scrollbar,
.fe-main::-webkit-scrollbar,
.fe-picktree::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.fe-nav::-webkit-scrollbar-track,
.fe-main::-webkit-scrollbar-track,
.fe-picktree::-webkit-scrollbar-track {
  background: transparent;
}

/* 透明外框＋content-box 裁切：滑塊視覺上僅 4px 細、且與內容保留間距 */
.fe-nav::-webkit-scrollbar-thumb,
.fe-main::-webkit-scrollbar-thumb,
.fe-picktree::-webkit-scrollbar-thumb {
  background-color: rgba(255, 255, 255, 0.22);
  border-radius: 10px;
  border: 3px solid transparent;
  background-clip: content-box;
}

.fe-nav::-webkit-scrollbar-thumb:hover,
.fe-main::-webkit-scrollbar-thumb:hover,
.fe-picktree::-webkit-scrollbar-thumb:hover {
  background-color: rgba(255, 255, 255, 0.38);
}

.fe-nav::-webkit-scrollbar-corner,
.fe-main::-webkit-scrollbar-corner,
.fe-picktree::-webkit-scrollbar-corner {
  background: transparent;
}

/* ---------------------------- 主體 ---------------------------- */
.fe-body {
  display: flex;
  flex: 1;
  min-height: 0; /* 讓子窗格能在 flex 內縮小並各自出現卷軸 */
}

/* 左側導覽（獨立卷軸；寬度由拖曳分隔線控制） */
.fe-nav {
  flex-shrink: 0;
  background: var(--fe-panel-2);
  padding: 8px 6px;
  overflow-y: auto;
  min-height: 0;
}

/* 側邊欄寬度拖曳分隔線（中央 1px 分隔線，hover/拖曳時加亮） */
.fe-splitter {
  width: 5px;
  flex-shrink: 0;
  cursor: col-resize;
  background: linear-gradient(to right, transparent 2px, var(--fe-border) 2px, var(--fe-border) 3px, transparent 3px);
  transition: background-color 0.12s ease;
}

.fe-splitter:hover,
.fe-splitter.dragging {
  background: var(--fe-accent);
}

.fe-nav-group + .fe-nav-group {
  margin-top: 14px;
}

.fe-nav-group-title {
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--fe-muted);
  padding: 2px 8px 6px;
  letter-spacing: 0.03em;
}

.fe-nav-group-title-toggle {
  cursor: pointer;
  border-radius: 5px;
  user-select: none;
}

.fe-nav-group-title-toggle:hover {
  color: var(--fe-text);
  background: var(--fe-hover);
}

.fe-nav-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 10px;
  border-radius: 5px;
  font-size: 0.86rem;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
}

.fe-nav-item:hover {
  background: var(--fe-hover);
}

.fe-nav-item.active {
  background: var(--fe-selected);
  border-color: var(--fe-selected-border);
}

.fe-nav-item > i {
  color: var(--fe-accent);
  flex-shrink: 0;
}

.fe-nav-label {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fe-nav-count {
  margin-left: auto;
  font-size: 0.72rem;
  color: var(--fe-muted);
  background: var(--fe-panel);
  border: 1px solid var(--fe-border);
  border-radius: 9px;
  padding: 0 7px;
}

.fe-nav-toggle {
  width: 14px;
  display: inline-flex;
  justify-content: center;
  font-size: 0.6rem;
  color: var(--fe-muted);
  flex-shrink: 0;
}

.fe-folder-icon {
  color: #eab308;
}

/* 系統文件子分類（可收折群組） */
.fe-nav-subgroup {
  font-weight: 600;
  color: var(--fe-muted);
}

.fe-nav-subgroup:hover {
  color: var(--fe-text);
}

.fe-nav-subitem {
  padding-left: 26px;
}

/* 檔案列表（獨立卷軸） */
.fe-main {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  padding-bottom: 40px; /* 讓空白處右鍵有落點 */
}

.fe-hint {
  margin: 10px 12px 0;
  padding: 7px 12px;
  background: rgba(96, 165, 250, 0.08);
  border: 1px solid rgba(96, 165, 250, 0.25);
  border-radius: 6px;
  font-size: 0.8rem;
  color: var(--fe-muted);
}

.fe-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.86rem;
  margin-top: 6px;
}

.fe-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: var(--fe-window);
  color: var(--fe-muted);
  font-weight: 500;
  font-size: 0.78rem;
  text-align: left;
  padding: 6px 12px;
  border-bottom: 1px solid var(--fe-border);
  cursor: pointer;
  user-select: none;
  white-space: nowrap;
}

.fe-table thead th:hover {
  color: var(--fe-text);
}

.fe-col-name { width: 44%; }
.fe-col-loc { width: 14%; }
.fe-col-type { width: 12%; }
.fe-col-size { width: 10%; }
.fe-col-date { width: 20%; }

.fe-row td {
  padding: 6px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 0;
}

.fe-row {
  cursor: default;
  user-select: none;
}

.fe-row:hover {
  background: var(--fe-hover);
}

.fe-row.selected {
  background: var(--fe-selected);
  outline: 1px solid var(--fe-selected-border);
  outline-offset: -1px;
}

.fe-muted {
  color: var(--fe-muted);
}

.fe-empty {
  text-align: center;
  color: var(--fe-muted);
  padding: 40px 0 !important;
}

.fe-shortcut-mark {
  color: var(--fe-accent);
  font-size: 0.78rem;
}

.fe-lock-mark {
  color: var(--fe-muted);
  font-size: 0.75rem;
}

.fe-icon-pdf { color: #f87171; }
.fe-icon-img { color: #4ade80; }
.fe-icon-doc { color: #60a5fa; }
.fe-icon-xls { color: #34d399; }
.fe-icon-ppt { color: #fb923c; }
.fe-icon-zip { color: #a78bfa; }
.fe-icon-file { color: var(--fe-muted); }

/* ---------------------------- 狀態列 ---------------------------- */
.fe-statusbar {
  padding: 4px 12px;
  border-top: 1px solid var(--fe-border);
  background: var(--fe-panel);
  font-size: 0.76rem;
  color: var(--fe-muted);
  flex-shrink: 0;
}

/* ---------------------------- 右鍵選單 ---------------------------- */
.fe-context-menu {
  position: fixed;
  z-index: 3000;
  min-width: 210px;
  background: var(--fe-panel);
  border: 1px solid var(--fe-border);
  border-radius: 8px;
  padding: 5px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
  color: var(--fe-text);
  font-size: 0.85rem;
}

.fe-menu-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 7px 12px;
  border-radius: 5px;
  cursor: pointer;
  white-space: nowrap;
}

.fe-menu-item:hover {
  background: var(--fe-hover);
}

.fe-menu-item.danger {
  color: var(--fe-danger);
}

.fe-menu-icon {
  width: 16px;
  text-align: center;
  color: var(--fe-accent);
}

.fe-menu-item.danger .fe-menu-icon {
  color: var(--fe-danger);
}

.fe-menu-sep {
  height: 1px;
  background: var(--fe-border);
  margin: 4px 8px;
}

/* ---------------------------- 對話框 ---------------------------- */
.fe-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 2900;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.fe-dialog {
  background: var(--fe-window);
  border: 1px solid var(--fe-border);
  border-radius: 8px;
  box-shadow: 0 16px 48px rgba(0, 0, 0, 0.55);
  color: var(--fe-text);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.fe-dialog-sm { width: 380px; }
.fe-dialog-md { width: 460px; }

.fe-dialog-titlebar {
  display: flex;
  align-items: center;
  padding: 10px 14px;
  background: var(--fe-panel);
  border-bottom: 1px solid var(--fe-border);
  font-size: 0.9rem;
  font-weight: 600;
}

.fe-dialog-titlebar > i {
  color: var(--fe-accent);
}

.fe-dialog-close {
  margin-left: auto;
  background: transparent;
  border: none;
  color: var(--fe-muted);
  border-radius: 4px;
  padding: 3px 8px;
  cursor: pointer;
}

.fe-dialog-close:hover {
  background: rgba(248, 113, 113, 0.8);
  color: #fff;
}

.fe-dialog-body {
  padding: 16px 16px 6px;
}

.fe-dialog-label {
  font-size: 0.82rem;
  color: var(--fe-muted);
  margin-bottom: 6px;
}

.fe-dialog-input {
  width: 100%;
  background: var(--fe-panel-2);
  border: 1px solid var(--fe-border);
  border-radius: 5px;
  color: var(--fe-text);
  font-size: 0.88rem;
  padding: 7px 10px;
  outline: none;
}

.fe-dialog-input:focus {
  border-color: var(--fe-accent);
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.15);
}

.fe-confirm-message {
  font-size: 0.87rem;
  line-height: 1.6;
  padding-bottom: 6px;
  word-break: break-all;
}

.fe-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 16px 14px;
}

.fe-btn {
  min-width: 84px;
  padding: 6px 14px;
  background: var(--fe-panel);
  border: 1px solid var(--fe-border);
  border-radius: 5px;
  color: var(--fe-text);
  font-size: 0.85rem;
  cursor: pointer;
}

.fe-btn:hover {
  background: var(--fe-hover);
}

.fe-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.fe-btn-primary {
  background: var(--fe-accent-strong);
  border-color: var(--fe-accent-strong);
  color: #fff;
}

.fe-btn-primary:hover:not(:disabled) {
  background: var(--fe-accent);
}

.fe-btn-danger {
  background: #dc2626;
  border-color: #dc2626;
  color: #fff;
}

.fe-btn-danger:hover {
  background: var(--fe-danger);
}

/* 目的資料夾選擇樹 */
.fe-picktree {
  max-height: 260px;
  overflow-y: auto;
  border: 1px solid var(--fe-border);
  border-radius: 6px;
  background: var(--fe-panel-2);
  padding: 5px;
}

.fe-picktree-item {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-radius: 5px;
  font-size: 0.86rem;
  cursor: pointer;
  user-select: none;
  border: 1px solid transparent;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fe-picktree-item:hover {
  background: var(--fe-hover);
}

.fe-picktree-item.selected {
  background: var(--fe-selected);
  border-color: var(--fe-selected-border);
}

.fe-picktree-item.disabled {
  opacity: 0.35;
  cursor: not-allowed;
}
</style>
