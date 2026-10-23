/**
 * C_FilePreview 文件预览组件类型定义
 */

/** 支持的文件类型 */
export type FilePreviewType = 'pdf' | 'word' | 'excel' | 'unknown'

/** 文件类型配置 */
export interface FileConfig {
  tagType: 'default' | 'primary' | 'info' | 'success' | 'warning' | 'error'
  icon: string
  color: string
}

/** 缩放配置 */
export interface ZoomConfig {
  min: number
  max: number
  step: number
  default: number
}

/** Excel 单元格 */
export interface ExcelCell {
  value: unknown
  /** 保留工作簿格式，不将文本编号或小数强制数值化。 */
  displayValue?: string
  type?: string
  rowspan?: number
  colspan?: number
  merged?: boolean
  hidden?: boolean
  style?: any
}

/** Excel 行数据 */
export interface ExcelRow {
  [key: string]: ExcelCell
}

/** Excel 列配置 */
export interface ExcelColumn {
  title: string
  key: string
  width: number
}

/** Excel 工作表 */
export interface ExcelSheet {
  name: string
  data: ExcelRow[]
  merges: any[]
  columns: ExcelColumn[]
  /** 按需展开工作表，避免首次预览创建整个工作簿的单元格对象。 */
  load?: () => { data: ExcelRow[]; columns: ExcelColumn[] }
}

/** Word 文档标题 */
export interface DocHeading {
  id: string
  text: string
  level: number
}

/** Excel 预览资源预算，必须为有限正整数。 */
export interface FilePreviewLimits {
  /** 文件字节上限，默认 32 MiB。 */
  maxBytes?: number
  /** 单个工作表展开的单元格上限，默认 100000。 */
  maxCells?: number
}

/** 文件预览组件 Props */
export interface FilePreviewProps {
  previewLimits?: FilePreviewLimits
  file?: File
  url?: string
  fileName?: string
  autoPreview?: boolean
  /** 在容器中直接阅读文档，默认保留原有弹窗模式。 */
  inline?: boolean
}

/** 文件加载结果 — PDF */
export interface PdfLoadResult {
  url: string
  totalPages: number
}

/** 文件加载结果 — Word */
export interface WordLoadResult {
  content: string
  headings: DocHeading[]
}

/** 文件加载结果 — Excel */
export interface ExcelLoadResult {
  sheets: ExcelSheet[]
}
