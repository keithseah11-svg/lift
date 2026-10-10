/**
 * Saves a file. On iPhone this opens the share sheet (Save to Files, AirDrop,
 * Mail…); elsewhere it falls back to a normal download.
 */
export async function saveFile(data: ArrayBuffer | Blob, fileName: string, mimeType: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType })
  const file = new File([blob], fileName, { type: mimeType })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') return 'cancelled'
      // Fall through to a download if sharing fails for another reason.
    }
  }

  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
  return 'downloaded'
}

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

/** Ask the browser not to evict our data under storage pressure. */
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (!navigator.storage?.persist) return false
    if (await navigator.storage.persisted()) return true
    return await navigator.storage.persist()
  } catch {
    return false
  }
}
