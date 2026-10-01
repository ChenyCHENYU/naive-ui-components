import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import QRCode from 'qrcode'
import type {
  ErrorCorrectionLevel,
  ExportType,
  LogoOptions,
  RenderMode,
} from '../types'

interface UseQRCodeOptions {
  value: Ref<string>
  size: Ref<number>
  color: Ref<string>
  bgColor: Ref<string>
  errorCorrectionLevel: Ref<ErrorCorrectionLevel>
  margin: Ref<number>
  mode: Ref<RenderMode>
  logo: Ref<LogoOptions | undefined>
}

function drawLogo(
  canvas: HTMLCanvasElement,
  logo: LogoOptions,
  qrSize: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return reject(new Error('Canvas context 不可用'))

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const ratio = Math.min(0.3, Math.max(0.05, logo.size ?? 0.2))
      const logoSize = Math.floor(qrSize * ratio)
      const padding = Math.max(0, logo.padding ?? 4)
      const borderRadius = Math.min(
        logoSize / 2,
        Math.max(0, logo.borderRadius ?? 4)
      )

      const x = (canvas.width - logoSize) / 2
      const y = (canvas.height - logoSize) / 2

      ctx.save()
      const bgX = x - padding
      const bgY = y - padding
      const bgSize = logoSize + padding * 2
      const r = borderRadius + padding

      ctx.beginPath()
      ctx.moveTo(bgX + r, bgY)
      ctx.arcTo(bgX + bgSize, bgY, bgX + bgSize, bgY + bgSize, r)
      ctx.arcTo(bgX + bgSize, bgY + bgSize, bgX, bgY + bgSize, r)
      ctx.arcTo(bgX, bgY + bgSize, bgX, bgY, r)
      ctx.arcTo(bgX, bgY, bgX + bgSize, bgY, r)
      ctx.closePath()
      ctx.fillStyle = logo.bgColor ?? '#ffffff'
      ctx.fill()

      ctx.beginPath()
      ctx.moveTo(x + borderRadius, y)
      ctx.arcTo(x + logoSize, y, x + logoSize, y + logoSize, borderRadius)
      ctx.arcTo(x + logoSize, y + logoSize, x, y + logoSize, borderRadius)
      ctx.arcTo(x, y + logoSize, x, y, borderRadius)
      ctx.arcTo(x, y, x + logoSize, y, borderRadius)
      ctx.closePath()
      ctx.clip()
      ctx.drawImage(img, x, y, logoSize, logoSize)
      ctx.restore()

      resolve()
    }
    img.onerror = () => reject(new Error(`Logo 加载失败: ${logo.src}`))
    img.src = logo.src
  })
}

/**
 *
 */
export function useQRCode(
  canvasRef: Ref<HTMLCanvasElement | null>,
  options: UseQRCodeOptions
) {
  const svgHtml = ref('')
  const svgTrusted = ref(false)
  const error = ref<Error | null>(null)
  const loading = ref(false)
  let renderVersion = 0

  const effectiveLevel = computed<ErrorCorrectionLevel>(() => {
    if (options.logo.value) {
      const level = options.errorCorrectionLevel.value
      if (level === 'L' || level === 'M') return 'Q'
      return level
    }
    return options.errorCorrectionLevel.value
  })

  const qrOptions = computed(() => ({
    width: options.size.value,
    margin: options.margin.value,
    errorCorrectionLevel: effectiveLevel.value,
    color: {
      dark: options.color.value,
      light: options.bgColor.value,
    },
  }))

  async function createCanvas() {
    const canvas = document.createElement('canvas')
    const { value } = options.value
    const settings = qrOptions.value
    const logo = options.logo.value
    const size = options.size.value
    await QRCode.toCanvas(canvas, value, settings)
    if (logo) {
      await drawLogo(canvas, logo, size)
    }
    return canvas
  }

  async function createSvg() {
    if (options.logo.value) {
      const canvas = await createCanvas()
      const raster = canvas.toDataURL('image/png')
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${raster}" width="100%" height="100%"/></svg>`
    }
    return QRCode.toString(options.value.value, {
      ...qrOptions.value,
      type: 'svg',
    })
  }

  function clearCanvas() {
    const canvas = canvasRef.value
    if (!canvas) return
    canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height)
    canvas.width = 0
    canvas.height = 0
  }

  function clearVisual() {
    svgHtml.value = ''
    svgTrusted.value = false
    clearCanvas()
  }

  async function renderCurrent(version: number) {
    if (options.mode.value === 'canvas') {
      const output = await createCanvas()
      if (version !== renderVersion) return
      const canvas = canvasRef.value
      if (!canvas) return
      canvas.width = output.width
      canvas.height = output.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Canvas context 不可用')
      context.drawImage(output, 0, 0)
      svgHtml.value = ''
      svgTrusted.value = false
      return
    }

    const svg = await createSvg()
    if (version !== renderVersion) return
    svgHtml.value = svg
    svgTrusted.value = Boolean(options.logo.value)
    clearCanvas()
  }

  async function render() {
    const version = ++renderVersion
    if (!options.value.value) {
      clearVisual()
      error.value = null
      loading.value = false
      return
    }
    loading.value = true
    error.value = null
    try {
      await renderCurrent(version)
    } catch (e) {
      if (version !== renderVersion) return
      error.value = e instanceof Error ? e : new Error(String(e))
      clearVisual()
    } finally {
      if (version === renderVersion) loading.value = false
    }
  }

  async function toDataURL(
    type: ExportType = 'png',
    quality = 0.92
  ): Promise<string> {
    if (type === 'svg') {
      const svgStr = await createSvg()
      return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
    }
    const tempCanvas = await createCanvas()
    const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png'
    return tempCanvas.toDataURL(mimeType, quality)
  }

  async function download(filename = 'qrcode', type: ExportType = 'png') {
    const dataUrl = await toDataURL(type)
    const link = document.createElement('a')
    link.download = `${filename}.${type}`
    link.href = dataUrl
    document.body.appendChild(link)
    link.click()
    link.remove()
  }

  watch(
    [
      options.value,
      options.size,
      options.color,
      options.bgColor,
      options.errorCorrectionLevel,
      options.margin,
      options.mode,
      options.logo,
    ],
    () => render(),
    { deep: true }
  )

  onBeforeUnmount(() => {
    renderVersion++
  })

  return { svgHtml, svgTrusted, error, loading, render, toDataURL, download }
}
