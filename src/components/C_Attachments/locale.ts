import type { ComponentLocale } from '../../core/contracts'
import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'attachments.title': '附件资料',
  'attachments.preview': '附件预览',
  'attachments.upload': '添加附件',
  'attachments.download': '下载',
  'attachments.remove': '移除',
  'attachments.list': '附件列表',
  'attachments.category': '附件分类',
  'attachments.allCategories': '全部分类',
  'attachments.choose': '选择附件后预览',
  'attachments.empty': '暂无附件',
  'attachments.loading': '正在加载预览…',
  'attachments.previewUnavailable': '此附件暂无预览',
  'attachments.previewFailed': '附件预览失败',
  'attachments.status.pending': '等待上传',
  'attachments.status.validating': '校验中',
  'attachments.status.hashing': '校验计算中',
  'attachments.status.uploading': '上传中',
  'attachments.status.success': '已上传',
  'attachments.status.error': '上传失败',
  'attachments.status.paused': '已暂停',
  'attachments.status.instant': '已上传',
})
const ENGLISH = Object.freeze({
  'attachments.title': 'Attachments',
  'attachments.preview': 'Attachment preview',
  'attachments.upload': 'Add attachment',
  'attachments.download': 'Download',
  'attachments.remove': 'Remove',
  'attachments.list': 'Attachment list',
  'attachments.category': 'Attachment category',
  'attachments.allCategories': 'All categories',
  'attachments.choose': 'Select an attachment to preview',
  'attachments.empty': 'No attachments',
  'attachments.loading': 'Loading preview…',
  'attachments.previewUnavailable': 'Preview unavailable for this attachment',
  'attachments.previewFailed': 'Could not load attachment preview',
  'attachments.status.pending': 'Waiting to upload',
  'attachments.status.validating': 'Validating',
  'attachments.status.hashing': 'Calculating checksum',
  'attachments.status.uploading': 'Uploading',
  'attachments.status.success': 'Uploaded',
  'attachments.status.error': 'Upload failed',
  'attachments.status.paused': 'Paused',
  'attachments.status.instant': 'Uploaded',
})

export const useAttachmentsLocale = (
  local: () => ComponentLocale | undefined
) => useScopedComponentLocale(CHINESE, ENGLISH, local)
