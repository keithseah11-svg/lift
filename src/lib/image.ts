import { fitWithin } from '../domain/photos'

export const PHOTO_MAX_SIDE = 1600
const JPEG_QUALITY = 0.82

async function decode(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if ('createImageBitmap' in window) {
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' })
      return { source: bmp, width: bmp.width, height: bmp.height, close: () => bmp.close() }
    } catch {
      // Fall back to <img> (older Safari, unusual formats).
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    return { source: img, width: img.naturalWidth, height: img.naturalHeight, close: () => {} }
  } finally {
    URL.revokeObjectURL(url)
  }
}

/**
 * Resizes a camera photo (often 3–5 MB) to at most 1600 px on the long side
 * and re-encodes it as JPEG (~200–400 KB), keeping storage on the phone small.
 */
export async function compressPhoto(file: Blob): Promise<{ blob: Blob; width: number; height: number }> {
  const img = await decode(file)
  try {
    const { width, height } = fitWithin(img.width, img.height, PHOTO_MAX_SIDE)
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas is not available')
    ctx.drawImage(img.source, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('Could not encode the photo')
    return { blob, width, height }
  } finally {
    img.close()
  }
}
