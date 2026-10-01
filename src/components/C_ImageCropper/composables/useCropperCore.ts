import { ref, type Ref } from 'vue'
import type { CropOutputFormat, CropResult } from '../types'

interface CropperInstance {
  rotateLeft: () => void
  rotateRight: () => void
  changeScale: (step: number) => void
  refresh: () => void
  getCropChecked: (callback: (canvas: HTMLCanvasElement) => void) => void
}

interface UseCropperCoreOptions {
  format?: Ref<CropOutputFormat>
  quality?: Ref<number>
  maxWidth?: Ref<number>
  maxHeight?: Ref<number>
}

const EXPORT_TIMEOUT_MS = 15_000

/** Manage the vue-cropper instance and serialize a single crop snapshot. */
export function useCropperCore(options: UseCropperCoreOptions = {}) {
  const cropperRef = ref<CropperInstance | null>(null)

  function rotateLeft() {
    cropperRef.value?.rotateLeft()
  }

  function rotateRight() {
    cropperRef.value?.rotateRight()
  }

  function rotate(angle: number) {
    if (!Number.isFinite(angle)) return
    const steps = Math.round(angle / 90)
    const fn = steps > 0 ? rotateRight : rotateLeft
    for (let i = 0; i < Math.abs(steps); i++) fn()
  }

  function zoom(scale: number) {
    if (!Number.isFinite(scale) || scale === 0) return
    cropperRef.value?.changeScale(scale > 0 ? 1 : -1)
  }

  function reset() {
    cropperRef.value?.refresh()
  }

  function constrainSize(width: number, height: number) {
    const maxWidth = options.maxWidth?.value ?? 0
    const maxHeight = options.maxHeight?.value ?? 0
    const ratio = Math.min(
      1,
      maxWidth > 0 ? maxWidth / width : 1,
      maxHeight > 0 ? maxHeight / height : 1
    )
    return {
      width: Math.max(1, Math.round(width * ratio)),
      height: Math.max(1, Math.round(height * ratio)),
    }
  }

  function getCropResult(): Promise<CropResult> {
    return new Promise((resolve, reject) => {
      const cropper = cropperRef.value
      if (!cropper) {
        reject(new Error('Cropper not initialized'))
        return
      }

      const format = options.format?.value ?? 'png'
      const quality = Math.min(1, Math.max(0, options.quality?.value ?? 0.92))
      const mime = format === 'jpeg' ? 'image/jpeg' : `image/${format}`
      let settled = false
      const timeout = setTimeout(
        () => fail(new Error('Crop result timed out')),
        EXPORT_TIMEOUT_MS
      )

      function fail(error: unknown) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        reject(error instanceof Error ? error : new Error(String(error)))
      }

      function complete(result: CropResult) {
        if (settled) return
        settled = true
        clearTimeout(timeout)
        resolve(result)
      }

      try {
        cropper.getCropChecked(source => {
          if (settled) return
          try {
            if (!source.width || !source.height)
              throw new Error('Crop result is empty')
            const { width, height } = constrainSize(source.width, source.height)
            let output = source
            if (width !== source.width || height !== source.height) {
              output = document.createElement('canvas')
              output.width = width
              output.height = height
              const context = output.getContext('2d')
              if (!context) throw new Error('Canvas 2D context unavailable')
              context.drawImage(source, 0, 0, width, height)
            }
            const base64 = output.toDataURL(mime, quality)
            output.toBlob(
              blob => {
                if (!blob) {
                  fail(new Error('Crop result could not be encoded'))
                  return
                }
                complete({ base64, blob, width, height, format })
              },
              mime,
              quality
            )
          } catch (error) {
            fail(error)
          }
        })
      } catch (error) {
        fail(error)
      }
    })
  }

  return {
    cropperRef,
    rotate,
    rotateLeft,
    rotateRight,
    zoom,
    reset,
    getCropResult,
  }
}
