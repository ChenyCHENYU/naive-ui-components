import type { Ref } from 'vue'
import type { ExportOptions, WatermarkConfig } from '../types'

interface UseSignatureExportOptions {
  canvasRef: Ref<HTMLCanvasElement | null>
  watermark?: Ref<Partial<WatermarkConfig>>
}

export function useSignatureExport(options: UseSignatureExportOptions) {
  const { canvasRef, watermark } = options

  const getWatermarkPosition = (
    canvas: HTMLCanvasElement,
    textWidth: number,
    fontSize: number,
    position: string
  ): { x: number; y: number } => {
    const padding = 10
    const positions = {
      'top-left': { x: padding, y: fontSize + padding },
      'top-right': { x: canvas.width - textWidth - padding, y: fontSize + padding },
      'bottom-left': { x: padding, y: canvas.height - padding },
      'bottom-right': { x: canvas.width - textWidth - padding, y: canvas.height - padding },
    }
    return positions[position as keyof typeof positions] || positions['bottom-right']
  }

  const drawWatermark = (canvas: HTMLCanvasElement, text: string): void => {
    const ctx = canvas.getContext('2d')
    if (!ctx || !watermark?.value?.show) return
    const config = {
      fontSize: watermark.value.fontSize || 12,
      color: watermark.value.color || '#999999',
      position: watermark.value.position || 'bottom-right',
    }
    ctx.save()
    ctx.font = `${config.fontSize}px Arial`
    ctx.fillStyle = config.color
    ctx.textBaseline = 'bottom'
    const textWidth = ctx.measureText(text).width
    const { x, y } = getWatermarkPosition(canvas, textWidth, config.fontSize, config.position)
    ctx.fillText(text, x, y)
    ctx.restore()
  }

  const createTempCanvas = (
    sourceCanvas: HTMLCanvasElement,
    includeBackground: boolean,
    backgroundColor: string
  ) => {
    const tempCanvas = document.createElement('canvas')
    tempCanvas.width = sourceCanvas.width
    tempCanvas.height = sourceCanvas.height
    const tempCtx = tempCanvas.getContext('2d')
    if (!tempCtx) throw new Error('无法创建临时 Canvas')
    if (includeBackground) {
      tempCtx.fillStyle = backgroundColor
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height)
    }
    tempCtx.drawImage(sourceCanvas, 0, 0)
    return { canvas: tempCanvas, ctx: tempCtx }
  }

  const prepareExportCanvas = (canvas: HTMLCanvasElement, options: ExportOptions): HTMLCanvasElement => {
    const { includeBackground = false, backgroundColor = '#FFFFFF', includeWatermark = false } = options
    const { canvas: tempCanvas } = createTempCanvas(canvas, includeBackground, backgroundColor)
    if (includeWatermark && watermark?.value?.show && watermark.value.text) {
      drawWatermark(tempCanvas, watermark.value.text)
    }
    return tempCanvas
  }

  const exportToBlob = (canvas: HTMLCanvasElement, quality: number): Promise<Blob> => {
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('导出失败'))),
        'image/png',
        quality
      )
    })
  }

  const exportSignature = async (options: ExportOptions = {}): Promise<string | Blob> => {
    const canvas = canvasRef.value
    if (!canvas) throw new Error('Canvas 未初始化')
    const { format = 'png', quality = 0.92 } = options
    if (format === 'svg') {
      return 'data:image/svg+xml;charset=utf-8,<svg xmlns="http://www.w3.org/2000/svg"><text>SVG export placeholder</text></svg>'
    }
    const tempCanvas = prepareExportCanvas(canvas, options)
    if (format === 'blob') return exportToBlob(tempCanvas, quality)
    const mimeType = format === 'jpeg' ? 'image/jpeg' : 'image/png'
    return tempCanvas.toDataURL(mimeType, quality)
  }

  const download = async (filename = 'signature', options: ExportOptions = {}): Promise<void> => {
    const format = options.format || 'png'
    const result = await exportSignature({ ...options, format })
    if (result instanceof Blob) {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = `${filename}.${format}`
      link.click()
      URL.revokeObjectURL(url)
    } else if (typeof result === 'string') {
      const link = document.createElement('a')
      link.href = result
      link.download = `${filename}.${format}`
      link.click()
    }
  }

  const loadImage = async (imageUrl: string): Promise<void> => {
    const canvas = canvasRef.value
    if (!canvas) throw new Error('Canvas 未初始化')
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('无法获取 Canvas 上下文')
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height)
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        resolve()
      }
      img.onerror = () => reject(new Error(`图片加载失败: ${imageUrl}`))
      img.src = imageUrl
    })
  }

  return { exportSignature, download, loadImage }
}
