/**
 * C_FilePreview 常量配置与工具函数
 * 类型定义统一在 ./types.ts
 */
import { type Ref } from 'vue'
import * as XLSX from 'xlsx'
import mammoth from 'mammoth'
import { sanitizeRichHtml } from '../../utils/html'
import type {
  FilePreviewType,
  FilePreviewLimits,
  FileConfig,
  ZoomConfig,
  ExcelRow,
  ExcelCell,
  ExcelColumn,
  ExcelSheet,
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
    const urlPath = url.split('/').pop() || url.split('\\').pop()
    if (urlPath?.includes('.')) {
      const decodedName = decodeURIComponent(urlPath.split('?')[0])
      if (decodedName && decodedName !== url) return decodedName
    }
  } catch (error) {
    console.warn('解析URL文件名失败:', error)
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
export const MAX_EXCEL_PREVIEW_CELLS = 100_000
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

function resolvePreviewLimit(
  value: number | undefined,
  fallback: number,
  name: string
): number {
  if (value === undefined) return fallback
  if (!Number.isSafeInteger(value) || value <= 0)
    throw new Error(`previewLimits.${name} 必须为有限正整数`)
  return value
}

interface ExcelMergeInfo {
  isMain: boolean
  rowspan: number
  colspan: number
}
function createExcelCell(
  cell: XLSX.CellObject | undefined,
  merge?: ExcelMergeInfo
): ExcelCell {
  const span = merge?.isMain ? merge : { rowspan: 1, colspan: 1 }
  return {
    value: cell?.v ?? '',
    displayValue: cell ? (cell.w ?? XLSX.utils.format_cell(cell)) : '',
    type: cell?.t,
    merged: Boolean(merge),
    hidden: Boolean(merge && !merge.isMain),
    rowspan: span.rowspan,
    colspan: span.colspan,
  }
}

function isValidExcelMerge(merge: XLSX.Range, maxRow: number, maxCol: number) {
  const { s, e } = merge
  return (
    [s.r, s.c, e.r, e.c].every(Number.isSafeInteger) &&
    s.r >= 0 &&
    s.c >= 0 &&
    e.r <= maxRow &&
    e.c <= maxCol &&
    e.r >= s.r &&
    e.c >= s.c
  )
}

export const processExcelSheet = (
  worksheet: any,
  merges: any[],
  maxCells = MAX_EXCEL_PREVIEW_CELLS
): { data: ExcelRow[]; columns: ExcelColumn[] } => {
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1:A1')
  const { c: maxCol, r: maxRow } = range.e
  const cellCount = (maxCol + 1) * (maxRow + 1)
  if (
    !Number.isSafeInteger(cellCount) ||
    cellCount < 1 ||
    cellCount >
      resolvePreviewLimit(maxCells, MAX_EXCEL_PREVIEW_CELLS, 'maxCells')
  ) {
    throw new Error(
      `工作表范围超过 ${maxCells.toLocaleString()} 个单元格的预览上限，请下载文件查看`
    )
  }

  const columns: ExcelColumn[] = Array.from({ length: maxCol + 1 }, (_, c) => {
    const cellAddress = XLSX.utils.encode_cell({ r: 0, c })
    const cell = worksheet[cellAddress]
    const columnName = cell ? String(cell.v ?? '').trim() : `列${c + 1}`
    return {
      title: columnName || `列${c + 1}`,
      key: `col_${c}`,
      width: Math.min(Math.max(columnName.length * 12, 80), 200),
    }
  })

  const mergeMap = new Map<string, ExcelMergeInfo>()
  let mergeCellVisits = 0
  merges.forEach(merge => {
    if (!isValidExcelMerge(merge, maxRow, maxCol)) return
    const {
      s: { r: sRow, c: sCol },
      e: { r: eRow, c: eCol },
    } = merge
    mergeCellVisits += (eRow - sRow + 1) * (eCol - sCol + 1)
    if (!Number.isSafeInteger(mergeCellVisits) || mergeCellVisits > cellCount) {
      throw new Error('合并单元格累计范围超过预览上限，请下载文件查看')
    }
    for (let r = sRow; r <= eRow; r++) {
      for (let c = sCol; c <= eCol; c++) {
        mergeMap.set(`${r}-${c}`, {
          isMain: r === sRow && c === sCol,
          rowspan: eRow - sRow + 1,
          colspan: eCol - sCol + 1,
        })
      }
    }
  })

  const data: ExcelRow[] = Array.from({ length: maxRow + 1 }, (_, r) => {
    const row: ExcelRow = {}
    for (let c = 0; c <= maxCol; c++) {
      const cellAddress = XLSX.utils.encode_cell({ r, c })
      const cell = worksheet[cellAddress]
      const mergeInfo = mergeMap.get(`${r}-${c}`)

      row[`col_${c}`] = createExcelCell(cell, mergeInfo)
    }
    return row
  })

  return { data, columns }
}

/* ==================== 文件加载器 ==================== */

/**
 *
 */
export async function loadPdf(file: File): Promise<PdfLoadResult> {
  const fileUrl = URL.createObjectURL(file)
  return {
    url: fileUrl + '#toolbar=1&navpanes=1&scrollbar=1&view=FitH',
    totalPages: 1,
  }
}

/**
 *
 */
export async function loadWord(file: File): Promise<WordLoadResult> {
  const arrayBuffer = await file.arrayBuffer()
  const result = await mammoth.convertToHtml({
    arrayBuffer,
    styleMap: [
      "p[style-name='Heading 1'] => h1:fresh",
      "p[style-name='Heading 2'] => h2:fresh",
      "p[style-name='Heading 3'] => h3:fresh",
      "p[style-name='Title'] => h1.title:fresh",
    ],
  } as any)

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
  const maxBytes = resolvePreviewLimit(
    limits.maxBytes,
    MAX_EXCEL_FILE_BYTES,
    'maxBytes'
  )
  const maxCells = resolvePreviewLimit(
    limits.maxCells,
    MAX_EXCEL_PREVIEW_CELLS,
    'maxCells'
  )
  if (file.size > maxBytes)
    throw new Error(
      `Excel 文件超过 ${formatFileSize(maxBytes)} 的预览上限，请下载文件查看`
    )
  const arrayBuffer = await file.arrayBuffer()
  const workbook = XLSX.read(arrayBuffer, {
    type: 'array',
    cellStyles: true,
    cellFormula: true,
    cellDates: true,
  })

  if (!workbook.SheetNames.length) {
    throw new Error('Excel文件中没有找到工作表')
  }

  const sheets: ExcelSheet[] = workbook.SheetNames.map(name => {
    const worksheet = workbook.Sheets[name]
    const merges = worksheet['!merges'] || []
    return {
      name,
      data: [],
      merges,
      columns: [],
      load: () => processExcelSheet(worksheet, merges, maxCells),
    }
  })

  // 先准备首张表，让错误进入统一预览反馈；其他工作表在切换时才展开。
  Object.assign(sheets[0], sheets[0].load?.())
  return { sheets }
}
