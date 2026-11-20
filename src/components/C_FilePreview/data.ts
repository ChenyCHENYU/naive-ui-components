/**
 * C_FilePreview 常量配置与工具函数
 * 类型定义统一在 ./types.ts
 */
import { type Ref } from 'vue'
import { MAX_EXCEL_PREVIEW_CELLS, resolvePreviewLimit } from './previewLimits'
import type {
  FilePreviewType,
  FilePreviewLimits,
  FileConfig,
  ZoomConfig,
  DocHeading,
  PdfLoadResult,
  WordLoadResult,
  ExcelLoadResult,
} from './types'

/* ==================== 常量配置 ==================== */

export const FILE_TYPE_MAP: Record<string, FilePreviewType> = {
  pdf: 'pdf',
  doc: 'word',
  docx: 'word',
  xls: 'excel',
  xlsx: 'excel',
}

export const FILE_CONFIGS: Record<string, FileConfig> = {
  pdf: {
    tagType: 'error',
    icon: 'ic:outline-picture-as-pdf',
    color: '#dc2626',
  },
  word: { tagType: 'info', icon: 'ic:outline-description', color: '#2563eb' },
  excel: { tagType: 'success', icon: 'ic:outline-grid-on', color: '#16a34a' },
  unknown: {
    tagType: 'default',
    icon: 'ic:outline-insert-drive-file',
    color: '#6b7280',
  },
}

export const ZOOM_CONFIGS: Record<string, ZoomConfig> = {
  pdf: { min: 0.5, max: 3, step: 0.25, default: 1 },
  word: { min: 50, max: 200, step: 10, default: 100 },
}

export const PAGE_SIZE_OPTIONS = [20, 50, 100, 200]

export const FULLSCREEN_EVENTS = [
  'fullscreenchange',
  'webkitfullscreenchange',
  'mozfullscreenchange',
  'MSFullscreenChange',
]

/* ==================== 文件信息工具函数 ==================== */

export const extractFileNameFromUrl = (url: string): string => {
  try {
    const path = new URL(url, 'https://preview.invalid').pathname
    const name = decodeURIComponent(path.slice(path.lastIndexOf('/') + 1))
    if (name.includes('.')) return name
  } catch {
    // 无法从 URL 判断类型时，由调用方提供文件名。
  }
  return '未知文件'
}

export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export const getFileType = (fileName: string): FilePreviewType => {
  if (!fileName || fileName === '未知文件') return 'unknown'
  const ext = fileName.toLowerCase().split('.').pop()
  if (!ext) return 'unknown'
  return FILE_TYPE_MAP[ext] || 'unknown'
}

export const getFileConfig = (fileType: string): FileConfig => {
  return FILE_CONFIGS[fileType] || FILE_CONFIGS.unknown
}

/* ==================== 缩放工具 ==================== */

export const createZoomHandler = (
  valueRef: Ref<number>,
  config: ZoomConfig
) => {
  return (action: 'in' | 'out' | 'reset') => {
    const { min, max, step, default: defaultValue } = config
    switch (action) {
      case 'reset':
        valueRef.value = defaultValue
        break
      case 'in':
        if (valueRef.value < max) valueRef.value += step
        break
      case 'out':
        if (valueRef.value > min) valueRef.value -= step
        break
    }
  }
}

/* ==================== Excel 工具函数 ==================== */

export const getColumnLetter = (index: number): string => {
  let result = ''
  while (index >= 0) {
    result = String.fromCharCode(65 + (index % 26)) + result
    index = Math.floor(index / 26) - 1
  }
  return result
}

/** 已格式化单元格优先使用 displayValue；原始文本与数值均不隐式改写。 */
export const formatCellValue = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value)
}

/** 预览安全预算；超限明确告知下载阅读，不截断后假装完整展示。 */
export const MAX_EXCEL_FILE_BYTES = 32 * 1024 * 1024

// eslint-disable-next-line complexity -- 单元格分类规则保持扁平分支更便于审计顺序。
export const getCellClass = (value: any): string => {
  if (value === null || value === undefined || value === '') return 'cell-empty'
  const strValue = String(value).trim()

  if (!isNaN(Number(strValue)) && strValue !== '') return 'cell-number'
  if (strValue.match(/[■▬▪▫─━]/)) return 'cell-gantt'
  if (
    strValue.match(/^\d{4}[-/]\d{2}[-/]\d{2}/) ||
    strValue.match(/^\d{2}[-/]\d{2}[-/]\d{4}/)
  )
    return 'cell-date'
  if (['true', 'false'].includes(strValue.toLowerCase())) return 'cell-boolean'
  return strValue.length > 20 ? 'cell-text cell-long' : 'cell-text'
}

function excelByteLimit(limits?: FilePreviewLimits): number {
  return resolvePreviewLimit(limits?.maxBytes, MAX_EXCEL_FILE_BYTES, 'maxBytes')
}

function assertExcelByteLimit(size: number, maxBytes: number): void {
  if (size > maxBytes)
    throw new Error(
      `Excel 文件超过 ${formatFileSize(maxBytes)} 的预览上限，请下载文件查看`
    )
}

/** 限制实际读取的文件字节，避免把超限响应完整缓存在内存里。 */
export async function readExcelPreviewBlob(
  response: Response,
  limits?: FilePreviewLimits
): Promise<Blob> {
  const { body, headers } = response
  if (!body) return response.blob()

  const reader = body.getReader()
  try {
    const maxBytes = excelByteLimit(limits)
    const encoding = headers.get('content-encoding')?.toLowerCase()
    // 跨域可能隐藏编码头。压缩响应的 Content-Length 表示传输大小。
    if (encoding === 'identity' || (!encoding && response.type !== 'cors'))
      assertExcelByteLimit(Number(headers.get('content-length')), maxBytes)

    const chunks: BlobPart[] = []
    let size = 0
    while (true) {
      // eslint-disable-next-line no-await-in-loop -- 按顺序读取并在超限时取消余下数据。
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      assertExcelByteLimit(size, maxBytes)
      chunks.push(value)
    }
    return new Blob(chunks, { type: headers.get('content-type') ?? '' })
  } catch (error) {
    void reader.cancel().catch(() => {})
    throw error
  } finally {
    reader.releaseLock()
  }
}

/* ==================== 文件加载器 ==================== */

/** PDF 嵌入地址的内容类型由预览器决定，与上传文件或响应声明的类型无关。 */
export async function loadPdf(file: File): Promise<PdfLoadResult> {
  const pdf =
    file.type === 'application/pdf'
      ? file
      : new Blob([file], { type: 'application/pdf' })
  const fileUrl = URL.createObjectURL(pdf)
  return {
    url: fileUrl + '#toolbar=1&navpanes=1&scrollbar=1&view=FitH',
    totalPages: 1,
  }
}

/**
 *
 */
export async function loadWord(file: File): Promise<WordLoadResult> {
  const [arrayBuffer, { default: mammoth }, { sanitizeRichHtml }] =
    await Promise.all([
      file.arrayBuffer(),
      import('mammoth'),
      import('../../utils/html'),
    ])
  const result = await mammoth.convertToHtml(
    { arrayBuffer },
    {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1.title:fresh",
      ],
    }
  )

  const headings: DocHeading[] = []

  /* 提取标题并注入 id */
  const tempDiv = document.createElement('div')
  tempDiv.innerHTML = sanitizeRichHtml(result.value)
  const headingElements = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6')

  Array.from(headingElements).forEach((el, index) => {
    const id = `heading-${index}`
    const level = parseInt(el.tagName.charAt(1))
    const text = el.textContent || ''

    el.id = id
    headings.push({ id, text, level })
  })

  return { content: tempDiv.innerHTML, headings }
}

/**
 *
 */
export async function loadExcel(
  file: File,
  limits: FilePreviewLimits = {}
): Promise<ExcelLoadResult> {
  const maxBytes = excelByteLimit(limits)
  const maxCells = resolvePreviewLimit(
    limits.maxCells,
    MAX_EXCEL_PREVIEW_CELLS,
    'maxCells'
  )
  assertExcelByteLimit(file.size, maxBytes)
  const [arrayBuffer, { readExcelWorkbook }] = await Promise.all([
    file.arrayBuffer(),
    import('./excel'),
  ])
  return readExcelWorkbook(arrayBuffer, maxCells)
}
