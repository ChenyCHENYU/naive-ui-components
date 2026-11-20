import type { AttachmentItem, AttachmentKind } from './types'

const documentExtensions = /\.(?:docx|pdf|xls|xlsx)$/i
const mediaExtensions = [
  ['image', /\.(?:avif|bmp|gif|ico|jpe?g|png|svg|webp)$/i],
  ['audio', /\.(?:aac|flac|m4a|mp3|oga|opus|wav)$/i],
  ['video', /\.(?:m4v|mov|mp4|ogv|webm)$/i],
] as const

/** 根据原始文件名复用文档预览支持的格式，媒体可由 MIME 类型识别。 */
export function resolveAttachmentKind(item: AttachmentItem): AttachmentKind {
  const { file, name, type } = item
  const fileName = file ? file.name : name
  if (documentExtensions.test(fileName)) return 'document'
  const mime = (type || (file ? file.type : '')).toLowerCase()
  const match = mediaExtensions.find(([kind]) => mime.startsWith(`${kind}/`))
  if (match) return match[0]
  return (
    mediaExtensions.find(([, extension]) => extension.test(fileName))?.[0] ??
    'unknown'
  )
}
