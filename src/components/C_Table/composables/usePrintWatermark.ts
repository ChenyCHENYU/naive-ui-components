/*
 * @Description: 打印水印组合工具 - 封装 printJS 和 html2canvas
 * @Migration: naive-ui-components 组件库迁移版本（从 @/hooks/usePrintWatermark 迁移）
 * Copyright (c) 2025 by CHENY, All Rights Reserved.
 */

import { ref, nextTick } from 'vue'
import { useMessage as _useNaiveMessage } from 'naive-ui'
import html2canvas from 'html2canvas'
import printJS from 'print-js'

/* ================= 类型定义 ================= */

/** 消息提示 API 接口 */
interface MessageApi {
  success: (msg: string) => void
  error: (msg: string) => void
  warning: (msg: string) => void
}

export interface WatermarkConfig {
  text: string
  textSize?: number
  textColor?: string
  font?: string
  opacity?: number
  rotate?: number
  position?: 'center' | 'repeat' | 'corner' | 'diagonal'
  xGap?: number
  yGap?: number
}

export interface CaptureConfig {
  scale?: number
  quality?: number
  format?: 'png' | 'jpeg' | 'webp'
  backgroundColor?: string
  logging?: boolean
  allowTaint?: boolean
  useCORS?: boolean
}

export interface PrintConfig {
  orientation?: 'portrait' | 'landscape'
  paperSize?: 'A4' | 'A3' | 'Letter' | string
  margin?: string
  style?: string
  header?: string
  footer?: string
  showModal?: boolean
  modalMessage?: string
  onLoadingStart?: () => void
  onLoadingEnd?: () => void
  onPrintDialogClose?: () => void
}

export interface PrintWatermarkOptions {
  watermark?: WatermarkConfig
  capture?: CaptureConfig
  print?: PrintConfig
}

/* ================= 默认配置 ================= */
const DEFAULT_WATERMARK: Required<WatermarkConfig> = {
  text: 'Robot Admin',
  textSize: 16,
  textColor: 'rgba(128, 128, 128, 0.3)',
  font: 'Microsoft JhengHei',
  opacity: 0.3,
  rotate: -20,
  position: 'repeat',
  xGap: 200,
  yGap: 120,
}

const DEFAULT_CAPTURE: Required<Omit<CaptureConfig, 'dpi'>> = {
  scale: 1,
  quality: 0.92,
  format: 'png',
  backgroundColor: '#ffffff',
  logging: false,
  allowTaint: true,
  useCORS: true,
}

const DEFAULT_PRINT: Required<
  Omit<PrintConfig, 'onPrintDialogOpen' | 'onError'>
> = {
  orientation: 'portrait',
  paperSize: 'A4',
  margin: '10mm 10mm 0 10mm',
  style:
    '@page { margin: 10mm 10mm 0 10mm; } @media print { body { margin: 0; } }',
  header: '',
  footer: '',
  showModal: false,
  modalMessage: '正在准备打印...',
  onLoadingStart: () => {},
  onLoadingEnd: () => {},
  onPrintDialogClose: () => {},
}

/* ================= 水印绘制函数 ================= */

/**
 *
 */
function drawCenterWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: Required<WatermarkConfig>
) {
  ctx.save()
  ctx.translate(width / 2, height / 2)
  ctx.rotate((config.rotate * Math.PI) / 180)
  ctx.fillText(config.text, 0, 0)
  ctx.restore()
}

/**
 *
 */
function drawCornerWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: Required<WatermarkConfig>
) {
  const offset = 50
  const corners = [
    [offset, offset],
    [width - offset, offset],
    [offset, height - offset],
    [width - offset, height - offset],
  ]

  corners.forEach(([x, y]) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate((config.rotate * Math.PI) / 180)
    ctx.fillText(config.text, 0, 0)
    ctx.restore()
  })
}

/**
 *
 */
function drawDiagonalWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: Required<WatermarkConfig>
) {
  const diagonal = Math.sqrt(width * width + height * height)
  const centerX = width / 2
  const centerY = height / 2

  ctx.save()
  ctx.translate(centerX, centerY)
  ctx.rotate(Math.atan2(height, width))

  const count = Math.floor(diagonal / config.xGap)
  const start = -diagonal / 2

  for (let i = 0; i <= count; i++) {
    const x = start + i * config.xGap
    ctx.fillText(config.text, x, 0)
  }

  ctx.restore()
}

/**
 *
 */
function drawRepeatWatermark(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  config: Required<WatermarkConfig>
) {
  const cols = Math.ceil(width / config.xGap) + 1
  const rows = Math.ceil(height / config.yGap) + 1

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = col * config.xGap + config.xGap / 2
      const y = row * config.yGap + config.yGap / 2

      ctx.save()
      ctx.translate(x, y)
      ctx.rotate((config.rotate * Math.PI) / 180)
      ctx.fillText(config.text, 0, 0)
      ctx.restore()
    }
  }
}

/**
 *
 */
function drawWatermark(
  canvas: HTMLCanvasElement,
  config: WatermarkConfig
): HTMLCanvasElement {
  const ctx = canvas.getContext('2d')
  if (!ctx) return canvas

  const finalConfig = { ...DEFAULT_WATERMARK, ...config }
  const { width, height } = canvas

  ctx.save()
  ctx.globalAlpha = finalConfig.opacity
  ctx.font = `${finalConfig.textSize}px ${finalConfig.font}`
  ctx.fillStyle = finalConfig.textColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  const drawFunctions = {
    center: drawCenterWatermark,
    corner: drawCornerWatermark,
    diagonal: drawDiagonalWatermark,
    repeat: drawRepeatWatermark,
  }

  const drawFunction =
    drawFunctions[finalConfig.position] || drawFunctions.repeat
  drawFunction(ctx, width, height, finalConfig)

  ctx.restore()
  return canvas
}

/* ================= 截图函数 ================= */

/**
 *
 */
async function captureElement(
  element: HTMLElement,
  config: CaptureConfig = {}
): Promise<HTMLCanvasElement> {
  const finalConfig = { ...DEFAULT_CAPTURE, ...config }

  return await html2canvas(element, {
    logging: finalConfig.logging,
    scale: finalConfig.scale,
    allowTaint: finalConfig.allowTaint,
    useCORS: finalConfig.useCORS,
    backgroundColor: finalConfig.backgroundColor,
    onclone: clonedDoc => {
      const clonedElement = clonedDoc.body
      clonedElement.style.transform = 'scale(1)'
    },
  })
}

/**
 *
 */
function canvasToDataURL(
  canvas: HTMLCanvasElement,
  format: 'png' | 'jpeg' | 'webp' = 'png',
  quality: number = 0.92
): string {
  const mimeType = `image/${format}`
  return format === 'png'
    ? canvas.toDataURL(mimeType)
    : canvas.toDataURL(mimeType, quality)
}

/**
 *
 */
function downloadCanvas(
  canvas: HTMLCanvasElement,
  filename: string = `screenshot-${new Date().toISOString().slice(0, 10)}.png`,
  format: 'png' | 'jpeg' | 'webp' = 'png'
) {
  const dataURL = canvasToDataURL(canvas, format)
  const link = document.createElement('a')
  link.download = filename
  link.href = dataURL
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/* ================= 打印函数 ================= */

let focusInterval: ReturnType<typeof setInterval> | null = null

/**
 *
 */
function startFocusKeep() {
  focusInterval = setInterval(() => {
    window.dispatchEvent(new Event('focus'))
  }, 500)
}

/**
 *
 */
function stopFocusKeep() {
  if (focusInterval) {
    clearInterval(focusInterval)
    focusInterval = null
  }
}

/**
 *
 */
function printImage(
  imageDataURL: string,
  config: PrintConfig = {}
): Promise<void> {
  const finalConfig = { ...DEFAULT_PRINT, ...config }

  return new Promise<void>((resolve, reject) => {
    try {
      startFocusKeep()
      finalConfig.onLoadingStart?.()

      printJS({
        printable: imageDataURL,
        type: 'image',
        style: finalConfig.style,
        showModal: finalConfig.showModal,
        modalMessage: finalConfig.modalMessage,
        onLoadingEnd: finalConfig.onLoadingEnd,
        onPrintDialogClose: () => {
          stopFocusKeep()
          finalConfig.onPrintDialogClose?.()
          resolve()
        },
      })
    } catch (error) {
      stopFocusKeep()
      reject(error)
    }
  })
}

/* ================= 合并打印辅助函数 ================= */

/**
 *
 */
function calculateMergedCanvasSize(
  canvases: HTMLCanvasElement[],
  orientation: 'horizontal' | 'vertical',
  spacing: number
) {
  let totalWidth = 0
  let totalHeight = 0

  canvases.forEach(canvas => {
    const { width, height } = canvas

    if (orientation === 'horizontal') {
      totalWidth += width
      totalHeight = Math.max(totalHeight, height)
    } else {
      totalWidth = Math.max(totalWidth, width)
      totalHeight += height
    }
  })

  const spacingTotal = (canvases.length - 1) * spacing
  if (orientation === 'horizontal') {
    totalWidth += spacingTotal
  } else {
    totalHeight += spacingTotal
  }

  return { totalWidth, totalHeight }
}

/**
 *
 */
function createMergedCanvas(
  canvases: HTMLCanvasElement[],
  options: {
    orientation: 'horizontal' | 'vertical'
    spacing: number
    backgroundColor: string
    totalWidth: number
    totalHeight: number
  }
): HTMLCanvasElement {
  const { orientation, spacing, backgroundColor, totalWidth, totalHeight } =
    options

  const mergedCanvas = document.createElement('canvas')
  mergedCanvas.width = totalWidth
  mergedCanvas.height = totalHeight

  const ctx = mergedCanvas.getContext('2d')
  if (!ctx) throw new Error('无法创建画布上下文')

  ctx.fillStyle = backgroundColor
  ctx.fillRect(0, 0, totalWidth, totalHeight)

  let currentX = 0
  let currentY = 0

  canvases.forEach(canvas => {
    ctx.drawImage(canvas, currentX, currentY)

    if (orientation === 'horizontal') {
      currentX += canvas.width + spacing
    } else {
      currentY += canvas.height + spacing
    }
  })

  return mergedCanvas
}

/**
 *
 */
function validateAndGetMergeOptions(
  elements: HTMLElement[],
  mergeOptions: {
    orientation?: 'horizontal' | 'vertical'
    spacing?: number
    backgroundColor?: string
  },
  message: MessageApi
) {
  if (!elements.length) {
    message.warning('没有要打印的元素')
    return null
  }

  return {
    orientation: mergeOptions.orientation || 'vertical',
    spacing: mergeOptions.spacing || 20,
    backgroundColor: mergeOptions.backgroundColor || '#ffffff',
  }
}

/**
 *
 */
async function captureAndMergeCanvas(
  elements: HTMLElement[],
  options: PrintWatermarkOptions,
  validatedOptions: {
    orientation: 'horizontal' | 'vertical'
    spacing: number
    backgroundColor: string
  },
  updateProgress: (value: number) => void
): Promise<HTMLCanvasElement> {
  const { orientation, spacing, backgroundColor } = validatedOptions

  updateProgress(10)
  const canvases = await Promise.all(
    elements.map(element => captureElement(element, options.capture))
  )

  updateProgress(50)
  const { totalWidth, totalHeight } = calculateMergedCanvasSize(
    canvases,
    orientation,
    spacing
  )

  updateProgress(60)
  return createMergedCanvas(canvases, {
    orientation,
    spacing,
    backgroundColor,
    totalWidth,
    totalHeight,
  })
}

/**
 *
 */
async function addWatermarkAndPrint(
  mergedCanvas: HTMLCanvasElement,
  options: PrintWatermarkOptions,
  elementsCount: number,
  updateProgress: (value: number) => void,
  message: MessageApi
): Promise<void> {
  updateProgress(70)

  if (options.watermark) {
    drawWatermark(mergedCanvas, options.watermark)
  }

  updateProgress(90)
  const imageUrl = canvasToDataURL(
    mergedCanvas,
    options.capture?.format,
    options.capture?.quality
  )
  await printImage(imageUrl, options.print)

  updateProgress(100)
  message.success(`合并打印完成，共合并 ${elementsCount} 个元素`)
}

/* ================= 主要的 Composable ================= */

/**
 *
 */
export function usePrintWatermark() {
  /* NOTE: useMessage() requires naive-ui provider context; caller must ensure NMessageProvider is present */
  let message: MessageApi
  try {
    message = _useNaiveMessage()
  } catch {
    message = {
      success: (msg: string) => console.log('[PrintWatermark]', msg),
      error: (msg: string) => console.error('[PrintWatermark]', msg),
      warning: (msg: string) => console.warn('[PrintWatermark]', msg),
    }
  }
  const loading = ref(false)
  const progress = ref(0)

  const updateProgress = (value: number) => {
    progress.value = Math.max(0, Math.min(100, value))
  }

  const captureWithWatermark = async (
    element: HTMLElement,
    options: PrintWatermarkOptions = {}
  ): Promise<string> => {
    try {
      updateProgress(0)
      updateProgress(30)
      const canvas = await captureElement(element, options.capture)

      updateProgress(60)
      if (options.watermark) {
        drawWatermark(canvas, options.watermark)
      }

      updateProgress(90)
      const format = options.capture?.format || 'png'
      const quality = options.capture?.quality || 0.92
      const dataURL = canvasToDataURL(canvas, format, quality)

      updateProgress(100)
      return dataURL
    } catch (error) {
      console.error('截图失败:', error)
      throw new Error(
        `截图失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
    }
  }

  const printWithWatermark = async (
    element: HTMLElement,
    options: PrintWatermarkOptions = {}
  ): Promise<void> => {
    loading.value = true
    updateProgress(0)

    try {
      await nextTick()
      const imageDataURL = await captureWithWatermark(element, options)
      updateProgress(95)
      await printImage(imageDataURL, options.print)
      updateProgress(100)
      message.success('打印完成')
    } catch (error) {
      console.error('打印失败:', error)
      message.error(
        `打印失败: ${error instanceof Error ? error.message : '未知错误'}`
      )
      throw error
    } finally {
      loading.value = false
      updateProgress(0)
    }
  }

  const downloadScreenshot = async (
    element: HTMLElement,
    filename?: string,
    options: PrintWatermarkOptions = {}
  ): Promise<void> => {
    loading.value = true

    try {
      await nextTick()
      const canvas = await captureElement(element, options.capture)

      if (options.watermark) {
        drawWatermark(canvas, options.watermark)
      }

      const format = options.capture?.format || 'png'
      const defaultFilename = `screenshot-${new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, '-')}.${format}`

      downloadCanvas(canvas, filename || defaultFilename, format)
      message.success('下载完成')
    } catch (error) {
      console.error('下载失败:', error)
      message.error('下载失败')
      throw error
    } finally {
      loading.value = false
    }
  }

  const quickPrint = async (
    element: HTMLElement,
    watermarkText: string = 'Robot Admin'
  ): Promise<void> => {
    return printWithWatermark(element, {
      watermark: {
        text: watermarkText,
        position: 'repeat',
        textColor: 'rgba(128, 128, 128, 0.3)',
      },
    })
  }

  const batchCapture = async (
    elements: HTMLElement[],
    options: PrintWatermarkOptions = {}
  ): Promise<string[]> => {
    const total = elements.length
    updateProgress(10)

    const capturePromises = elements.map(async (element, index) => {
      const url = await captureWithWatermark(element, options)
      updateProgress(10 + ((index + 1) / total) * 70)
      return url
    })

    return Promise.all(capturePromises)
  }

  const serialPrint = async (
    imageUrls: string[],
    printConfig: PrintConfig = {}
  ): Promise<void> => {
    await imageUrls.reduce(async (prevPromise, imageUrl, index) => {
      await prevPromise
      await printImage(imageUrl, printConfig)

      if (index < imageUrls.length - 1) {
        await new Promise<void>(resolve => {
          setTimeout(() => resolve(), 1000)
        })
      }
    }, Promise.resolve())
  }

  const batchPrint = async (
    elements: HTMLElement[],
    options: PrintWatermarkOptions = {}
  ): Promise<void> => {
    if (!elements.length) {
      message.warning('没有要打印的元素')
      return
    }

    loading.value = true

    try {
      updateProgress(0)
      const imageUrls = await batchCapture(elements, options)
      updateProgress(80)
      await serialPrint(imageUrls, options.print)
      updateProgress(100)
      message.success(`批量打印完成，共 ${elements.length} 个元素`)
    } catch (error) {
      console.error('批量打印失败:', error)
      message.error('批量打印失败')
      throw error
    } finally {
      loading.value = false
      updateProgress(0)
    }
  }

  const mergePrint = async (
    elements: HTMLElement[],
    options: PrintWatermarkOptions = {},
    mergeOptions: {
      orientation?: 'horizontal' | 'vertical'
      spacing?: number
      backgroundColor?: string
    } = {}
  ): Promise<void> => {
    const validatedOptions = validateAndGetMergeOptions(
      elements,
      mergeOptions,
      message
    )
    if (!validatedOptions) return

    loading.value = true

    try {
      const mergedCanvas = await captureAndMergeCanvas(
        elements,
        options,
        validatedOptions,
        updateProgress
      )
      await addWatermarkAndPrint(
        mergedCanvas,
        options,
        elements.length,
        updateProgress,
        message
      )
    } catch (error) {
      console.error('合并打印失败:', error)
      message.error('合并打印失败')
      throw error
    } finally {
      loading.value = false
      updateProgress(0)
    }
  }

  const createPreset = (name: string, options: PrintWatermarkOptions) => {
    return {
      use: (element: HTMLElement) => printWithWatermark(element, options),
      download: (element: HTMLElement, filename?: string) =>
        downloadScreenshot(element, filename, options),
    }
  }

  return {
    loading,
    progress,

    captureWithWatermark,
    printWithWatermark,
    downloadScreenshot,
    quickPrint,
    batchCapture,
    batchPrint,
    mergePrint,

    createPreset,
    updateProgress,

    utils: {
      captureElement,
      drawWatermark,
      canvasToDataURL,
      downloadCanvas,
      printImage,
    },
  }
}

/* ================= 预设配置 ================= */
export const printPresets = {
  table: {
    watermark: {
      text: 'Robot Admin - 数据表格',
      position: 'repeat' as const,
      textColor: 'rgba(100, 100, 100, 0.25)',
      textSize: 14,
      xGap: 250,
      yGap: 120,
    },
    capture: {
      scale: 1.2,
    },
    print: {
      orientation: 'landscape' as const,
      style: '@page { margin: 8mm; } body { font-family: Arial, sans-serif; }',
    },
  },

  form: {
    watermark: {
      text: 'Robot Admin - 表单数据',
      position: 'diagonal' as const,
      textColor: 'rgba(150, 150, 150, 0.2)',
      textSize: 16,
    },
    print: {
      orientation: 'portrait' as const,
    },
  },

  report: {
    watermark: {
      text: 'Robot Admin - 机密报告',
      position: 'center' as const,
      textColor: 'rgba(200, 50, 50, 0.15)',
      textSize: 24,
    },
    capture: {
      quality: 0.95,
      format: 'png' as const,
    },
  },
} as const

/* ================= 工具函数导出 ================= */
export {
  drawWatermark,
  captureElement,
  canvasToDataURL,
  downloadCanvas,
  printImage,
}
