/**
 * 後端以 401 回傳「視角／表單歸屬不符」時，不應當成登入過期而清 token。
 * 與 `api/http.ts` 攔截器、`blobDownload` 共用。
 */
export function isPerspectiveOrPermission401Payload(data: unknown): boolean {
  const msg =
    data && typeof data === 'object'
      ? String(
          (data as Record<string, unknown>).message ??
            (data as Record<string, unknown>).error ??
            ''
        )
      : ''
  if (!msg) return false
  return (
    msg.includes('僅供營造') ||
    msg.includes('僅供監造') ||
    msg.includes('營造端') ||
    msg.includes('營造視角') ||
    msg.includes('監造使用') ||
    msg.includes('無權以此視角') ||
    msg.includes('無效視角') ||
    msg.includes('此 API 僅供')
  )
}

/**
 * Axios 錯誤在 responseType 為 blob / arraybuffer 時，401 body 可能是 Blob 或 ArrayBuffer，需先解成 JSON 再判斷訊息。
 */
export async function parseAxios401ResponseData(data: unknown): Promise<unknown> {
  if (data == null) return data

  if (typeof Blob !== 'undefined' && data instanceof Blob) {
    try {
      const text = await data.text()
      try {
        return JSON.parse(text) as unknown
      } catch {
        return { message: text }
      }
    } catch {
      return null
    }
  }

  if (data instanceof ArrayBuffer) {
    try {
      const text = new TextDecoder('utf-8').decode(data)
      try {
        return JSON.parse(text) as unknown
      } catch {
        return { message: text }
      }
    } catch {
      return null
    }
  }

  if (typeof data === 'string') {
    try {
      return JSON.parse(data) as unknown
    } catch {
      return { message: data }
    }
  }

  return data
}
