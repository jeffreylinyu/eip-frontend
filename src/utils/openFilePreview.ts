import { downloadBlobAsFile } from '@/api/forms'

const PREVIEW_TYPE_PREFIXES = ['image/', 'text/']
const PREVIEW_MIME_TYPES = new Set([
  'application/pdf',
  'application/json',
  'application/xml',
  'image/svg+xml',
])
const PREVIEW_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.gif',
  '.webp',
  '.svg',
  '.pdf',
  '.txt',
  '.htm',
  '.html',
])

export interface OpenFilePreviewOptions {
  url?: string | null
  blob?: Blob | null
  fileName?: string | null
  contentType?: string | null
  fetchBlob?: () => Promise<Blob>
}

/** 是否可在瀏覽器新分頁內嵌預覽（圖片、PDF、文字等） */
export function canBrowserPreview(
  contentType?: string | null,
  fileName?: string | null,
): boolean {
  const type = (contentType || '').toLowerCase().trim()
  if (type) {
    if (PREVIEW_TYPE_PREFIXES.some((p) => type.startsWith(p))) return true
    if (PREVIEW_MIME_TYPES.has(type)) return true
  }
  const name = (fileName || '').toLowerCase()
  const dot = name.lastIndexOf('.')
  if (dot >= 0) {
    return PREVIEW_EXTENSIONS.has(name.slice(dot))
  }
  return false
}

function inferContentType(fileName?: string | null, contentType?: string | null): string {
  const type = (contentType || '').trim()
  if (type) return type
  const name = (fileName || '').toLowerCase()
  if (name.endsWith('.pdf')) return 'application/pdf'
  if (name.endsWith('.png')) return 'image/png'
  if (name.endsWith('.jpg') || name.endsWith('.jpeg')) return 'image/jpeg'
  if (name.endsWith('.gif')) return 'image/gif'
  if (name.endsWith('.webp')) return 'image/webp'
  if (name.endsWith('.svg')) return 'image/svg+xml'
  if (name.endsWith('.txt')) return 'text/plain'
  if (name.endsWith('.html') || name.endsWith('.htm')) return 'text/html'
  return 'application/octet-stream'
}

async function sniffMimeTypeFromBlob(blob: Blob): Promise<string | null> {
  try {
    // 只讀前幾個 bytes 即可判斷常見格式
    const head = await blob.slice(0, 32).arrayBuffer()
    const bytes = new Uint8Array(head)

    const toStr = (start: number, length: number) =>
      String.fromCharCode(...bytes.slice(start, start + length))

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      bytes.length >= 8 &&
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    ) {
      return 'image/png'
    }

    // JPEG: FF D8 FF
    if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      return 'image/jpeg'
    }

    // GIF: GIF87a / GIF89a
    if (bytes.length >= 6) {
      const sig6 = toStr(0, 6)
      if (sig6 === 'GIF87a' || sig6 === 'GIF89a') return 'image/gif'
    }

    // WEBP: RIFF....WEBP
    if (bytes.length >= 12) {
      const sig4 = toStr(0, 4)
      const sig8 = toStr(8, 4)
      if (sig4 === 'RIFF' && sig8 === 'WEBP') return 'image/webp'
    }

    // PDF: %PDF-
    if (bytes.length >= 5) {
      const sig5 = toStr(0, 5)
      if (sig5 === '%PDF-') return 'application/pdf'
    }

    // SVG: 看起始是否為 <svg
    // 直接轉字串可能含亂碼，但前 32 bytes 通常足夠判斷
    const asText = (() => {
      try {
        return new TextDecoder('utf-8').decode(bytes)
      } catch {
        return ''
      }
    })()
    if (asText.trimStart().toLowerCase().startsWith('<svg')) {
      return 'image/svg+xml'
    }
  } catch {
    // ignore
  }
  return null
}

async function resolveBlob(opts: OpenFilePreviewOptions): Promise<Blob> {
  if (opts.blob && opts.blob.size > 0) return opts.blob
  if (opts.fetchBlob) {
    const blob = await opts.fetchBlob()
    if (blob instanceof Blob && blob.size > 0) return blob
    throw new Error('empty blob')
  }
  if (opts.url) {
    const res = await fetch(opts.url, { credentials: 'include' })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const blob = await res.blob()
    if (blob.size > 0) return blob
    throw new Error('empty blob')
  }
  throw new Error('no file source')
}

function openBlobInNewTab(blob: Blob, contentType: string): boolean {
  const typed = blob.type ? blob : new Blob([blob], { type: contentType })
  const objectUrl = URL.createObjectURL(typed)

  // 注意：此函式目前仍可能在 await 後才呼叫（如果你從外層先 await 再呼叫它）。
  // 因此本專案改由 openFilePreviewOrDownload 先同步 window.open('') 再 fetch blob，
  // 這裡保留簡化版作為後備使用。
  const win = window.open('', '_blank', 'noopener,noreferrer')
  if (!win) {
    URL.revokeObjectURL(objectUrl)
    return false
  }

  try {
    win.location.href = objectUrl
  } catch {
    URL.revokeObjectURL(objectUrl)
    return false
  }

  window.setTimeout(() => {
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {
      /* ignore */
    }
  }, 10000)

  return true
}

function openBlobPreviewInModal(blob: Blob, contentType: string, fileName: string): void {
  const typed = blob.type ? blob : new Blob([blob], { type: contentType })
  const objectUrl = URL.createObjectURL(typed)
  const type = (contentType || typed.type || '').toLowerCase()
  const isImage = type.startsWith('image/')
  const isPdf = type === 'application/pdf' || fileName.toLowerCase().endsWith('.pdf')

  const overlay = document.createElement('div')
  overlay.setAttribute('data-preview-modal', '1')
  overlay.style.position = 'fixed'
  overlay.style.inset = '0'
  overlay.style.background = 'rgba(0,0,0,0.55)'
  overlay.style.zIndex = '20000'
  overlay.style.display = 'flex'
  overlay.style.alignItems = 'center'
  overlay.style.justifyContent = 'center'

  const modal = document.createElement('div')
  modal.style.width = '92vw'
  modal.style.height = '88vh'
  modal.style.background = '#0f172a'
  modal.style.border = '1px solid rgba(255,255,255,0.14)'
  modal.style.borderRadius = '12px'
  modal.style.boxShadow = '0 18px 50px rgba(0,0,0,0.4)'
  modal.style.overflow = 'hidden'
  modal.style.display = 'flex'
  modal.style.flexDirection = 'column'

  const header = document.createElement('div')
  header.style.padding = '0.75rem 1rem'
  header.style.display = 'flex'
  header.style.alignItems = 'center'
  header.style.justifyContent = 'space-between'
  header.style.gap = '1rem'
  header.style.borderBottom = '1px solid rgba(255,255,255,0.12)'

  const title = document.createElement('div')
  title.style.color = 'rgba(226,232,240,0.95)'
  title.style.fontWeight = '700'
  title.textContent = fileName

  const closeBtn = document.createElement('button')
  closeBtn.type = 'button'
  closeBtn.textContent = '關閉'
  closeBtn.style.background = 'rgba(148,163,184,0.12)'
  closeBtn.style.color = 'rgba(226,232,240,0.95)'
  closeBtn.style.border = '1px solid rgba(148,163,184,0.25)'
  closeBtn.style.borderRadius = '8px'
  closeBtn.style.padding = '0.4rem 0.7rem'
  closeBtn.style.cursor = 'pointer'
  closeBtn.style.whiteSpace = 'nowrap'

  const revoke = () => {
    try {
      URL.revokeObjectURL(objectUrl)
    } catch {
      /* ignore */
    }
  }

  let cleanup = () => {
    try {
      overlay.remove()
    } catch {
      /* ignore */
    }
    revoke()
  }

  closeBtn.onclick = cleanup

  const content = document.createElement('div')
  content.style.flex = '1'
  content.style.minHeight = '0'
  content.style.display = 'flex'
  content.style.alignItems = 'center'
  content.style.justifyContent = 'center'
  content.style.background = 'rgba(2,6,23,0.35)'

  if (isImage && !isPdf) {
    const img = document.createElement('img')
    img.src = objectUrl
    img.alt = fileName
    img.style.maxWidth = '96%'
    img.style.maxHeight = '96%'
    img.style.objectFit = 'contain'
    content.appendChild(img)
  } else if (isPdf) {
    const iframe = document.createElement('iframe')
    iframe.src = objectUrl
    iframe.title = fileName
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = '0'
    content.appendChild(iframe)
  } else {
    const iframe = document.createElement('iframe')
    iframe.src = objectUrl
    iframe.title = fileName
    iframe.style.width = '100%'
    iframe.style.height = '100%'
    iframe.style.border = '0'
    content.appendChild(iframe)
  }

  header.appendChild(title)
  header.appendChild(closeBtn)
  modal.appendChild(header)
  modal.appendChild(content)
  overlay.appendChild(modal)
  document.body.appendChild(overlay)

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') cleanup()
  }
  window.addEventListener('keydown', onKeyDown)
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) cleanup()
  })

  // 垃圾回收：關閉後移除監聽
  const oldCleanup = cleanup
  cleanup = () => {
    window.removeEventListener('keydown', onKeyDown)
    oldCleanup()
  }
}

/**
 * 可預覽的檔案 → 新分頁開啟；否則詢問是否下載。
 * 優先使用 fetchBlob（避免 signed URL 的 Content-Disposition: attachment 強制下載）。
 */
export async function openFilePreviewOrDownload(opts: OpenFilePreviewOptions): Promise<void> {
  const fileName = opts.fileName?.trim() || 'download'
  const contentType = inferContentType(fileName, opts.contentType)
  const previewable = canBrowserPreview(contentType, fileName)

  try {
    // 先把 blob 拿到，讓我們能依 blob.type 決定是否能預覽。
    // 這可以避免 fileName/objectName 無副檔名導致誤判為不可預覽。
    const blob = await resolveBlob(opts)
    const sniffed = await sniffMimeTypeFromBlob(blob)
    const effectiveType = (sniffed || blob.type || contentType).toLowerCase()
    const canPreviewByBlob =
      effectiveType.startsWith('image/') ||
      effectiveType === 'image/svg+xml' ||
      effectiveType === 'application/pdf' ||
      effectiveType.startsWith('text/')

    if (previewable || canPreviewByBlob) {
      // 優先同頁預覽，避免 popup blocker / 另存視窗失敗造成下載體驗。
      openBlobPreviewInModal(blob, effectiveType, fileName)
      return
    }

    const ok = window.confirm(`「${fileName}」無法在瀏覽器中預覽，是否要下載？`)
    if (!ok) return
    downloadBlobAsFile(blob, fileName)
  } catch (e) {
    console.warn('[openFilePreviewOrDownload] failed', e)
    // 最後兜底：嘗試走下載（可能成功）
    try {
      const blob = await resolveBlob(opts)
      const ok = window.confirm(`「${fileName}」是否要下載？`)
      if (!ok) return
      downloadBlobAsFile(blob, fileName)
    } catch {
      window.alert('操作失敗，請稍後再試')
    }
  }
}

/** 本地 File（尚未上傳）預覽或下載 */
export function openLocalFilePreviewOrDownload(file: File): Promise<void> {
  return openFilePreviewOrDownload({
    blob: file,
    fileName: file.name,
    contentType: file.type,
  })
}
