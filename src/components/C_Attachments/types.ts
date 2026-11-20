import type { ComponentLocale } from '../../core/contracts'
import type { ComponentDensity } from '../../core/density'
import type { UploadFileStatus } from '../C_Upload/types'
import type { FilePreviewLimits } from '../C_FilePreview/types'

export type AttachmentKey = string | number
export type AttachmentKind =
  'image' | 'video' | 'audio' | 'document' | 'unknown'
export type AttachmentMediaKind = Extract<
  AttachmentKind,
  'image' | 'audio' | 'video'
>

export interface AttachmentItem {
  id: AttachmentKey
  name: string
  category?: string
  description?: string
  /** MIME 类型。省略时从 File 或文件名判断预览方式。 */
  type?: string
  size?: number
  status?: UploadFileStatus
  percent?: number
  url?: string
  file?: File
}

export interface AttachmentsProps<T extends AttachmentItem = AttachmentItem> {
  items: readonly T[]
  title?: string
  uploadable?: boolean
  downloadable?: boolean
  removable?: boolean
  /** 暂停变更操作，仍可选择和预览已有关联资料。 */
  disabled?: boolean
  previewLimits?: FilePreviewLimits
  density?: ComponentDensity
  locale?: ComponentLocale
}

export interface AttachmentsEmits<T extends AttachmentItem = AttachmentItem> {
  upload: []
  download: [item: T]
  remove: [item: T]
}
