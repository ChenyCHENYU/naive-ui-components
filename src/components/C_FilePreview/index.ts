export { default as C_FilePreview } from './index.vue'
export type {
  FilePreviewType,
  FileConfig,
  ZoomConfig,
  ExcelCell,
  ExcelRow,
  ExcelColumn,
  ExcelSheet,
  DocHeading,
  FilePreviewProps,
  FilePreviewLimits,
  PdfLoadResult,
  WordLoadResult,
  ExcelLoadResult,
} from './types'
export { useFilePreview } from './composables/useFilePreview'
export { useFullscreen } from './composables/useFullscreen'
