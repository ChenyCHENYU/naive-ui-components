import { ref, computed, watch, onBeforeUnmount, type Ref } from 'vue'
import QRCode from 'qrcode'
import { createQRCodeAbortError, drawLogo } from './drawLogo'
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
  let disposed = false
  let renderController: AbortController | undefined
  const activeTasks = new Set<AbortController>()

  function beginTask() {
    if (disposed) throw createQRCodeAbortError()
    const controller = new AbortController()
    activeTasks.add(controller)
    return controller
  }

  function assertActive(signal: AbortSignal) {
    if (disposed || signal.aborted) throw createQRCodeAbortError()
  }

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

  /** 渲染及导出各自保存一份输入，等待 Logo 时不会混入后续配置。 */
  function captureOptions() {
    const logo = options.logo.value
    return {
      value: options.value.value,
      settings: qrOptions.value,
      size: options.size.value,
      mode: options.mode.value,
      logo: logo ? { ...logo } : undefined,
    }
  }
  type QRCodeSnapshot = ReturnType<typeof captureOptions>

  async function createCanvas(snapshot: QRCodeSnapshot, signal: AbortSignal) {
    assertActive(signal)
    const canvas = document.createElement('canvas')
    await QRCode.toCanvas(canvas, snapshot.value, snapshot.settings)
    assertActive(signal)
    if (snapshot.logo)
      await drawLogo(canvas, snapshot.logo, snapshot.size, signal)
    assertActive(signal)
    return canvas
  }

  async function createSvg(snapshot: QRCodeSnapshot, signal: AbortSignal) {
    if (snapshot.logo) {
      const canvas = await createCanvas(snapshot, signal)
      const raster = canvas.toDataURL('image/png')
      return `<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 ${canvas.width} ${canvas.height}"><image href="${raster}" width="100%" height="100%"/></svg>`
    }
    const svg = await QRCode.toString(snapshot.value, {
      ...snapshot.settings,
      type: 'svg',
    })
    assertActive(signal)
    return svg
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

  async function renderCurrent(
    version: number,
    snapshot: QRCodeSnapshot,
    signal: AbortSignal
  ) {
    if (snapshot.mode === 'canvas') {
      const output = await createCanvas(snapshot, signal)
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

    const svg = await createSvg(snapshot, signal)
    if (version !== renderVersion) return
    svgHtml.value = svg
    svgTrusted.value = Boolean(snapshot.logo)
    clearCanvas()
  }

  async function render() {
    if (disposed) return
    const version = ++renderVersion
    renderController?.abort()
    renderController = undefined
    if (!options.value.value) {
      clearVisual()
      error.value = null
      loading.value = false
      return
    }
    const controller = beginTask()
    renderController = controller
    const snapshot = captureOptions()
    loading.value = true
    error.value = null
    try {
      await renderCurrent(version, snapshot, controller.signal)
    } catch (e) {
      if (version !== renderVersion) return
      error.value = e instanceof Error ? e : new Error(String(e))
      clearVisual()
    } finally {
      activeTasks.delete(controller)
      if (renderController === controller) renderController = undefined
      if (version === renderVersion) loading.value = false
    }
  }

  async function toDataURL(
    type: ExportType = 'png',
    quality = 0.92
  ): Promise<string> {
    const controller = beginTask()
    const snapshot = captureOptions()
    try {
      if (type === 'svg') {
        const svgStr = await createSvg(snapshot, controller.signal)
        return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgStr)}`
      }
      const tempCanvas = await createCanvas(snapshot, controller.signal)
      const mimeType = type === 'jpeg' ? 'image/jpeg' : 'image/png'
      return tempCanvas.toDataURL(mimeType, quality)
    } finally {
      activeTasks.delete(controller)
    }
  }

  async function download(filename = 'qrcode', type: ExportType = 'png') {
    const dataUrl = await toDataURL(type)
    if (disposed) throw createQRCodeAbortError()
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
    disposed = true
    renderVersion++
    activeTasks.forEach(controller => controller.abort())
    activeTasks.clear()
    renderController = undefined
    loading.value = false
  })

  return { svgHtml, svgTrusted, error, loading, render, toDataURL, download }
}
