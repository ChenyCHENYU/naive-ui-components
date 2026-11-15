import { getCurrentInstance, inject } from 'vue'
import { COMPONENT_LOCALE_KEY } from '../../context'
import { translateComponentMessage } from '../../core/locale'
import type { ComponentLocale } from '../../core/contracts'

// 上传默认文案只随上传入口加载；业务覆盖仍使用同一语言协议。
const ZH_MESSAGES = Object.freeze({
  'upload.status.pending': '等待上传',
  'upload.status.validating': '校验文件…',
  'upload.status.hashing': '计算校验…',
  'upload.status.uploading': '上传中…',
  'upload.status.success': '上传成功',
  'upload.status.error': '上传失败',
  'upload.status.paused': '已暂停',
  'upload.status.instant': '秒传成功',
  'upload.dropHere': '释放文件到此处',
  'upload.chooseOrDrop': '点击或拖拽文件到此区域上传',
  'upload.pastePrefix': '，支持 ',
  'upload.pasteSuffix': ' 粘贴',
  'upload.totalProgress': '总进度',
  'upload.chunkProgress': '分片 {uploaded}/{total}',
  'upload.retry': '重试上传',
  'upload.remove': '移除文件',
})

const EN_MESSAGES = Object.freeze({
  'upload.status.pending': 'Waiting to upload',
  'upload.status.validating': 'Validating file…',
  'upload.status.hashing': 'Calculating checksum…',
  'upload.status.uploading': 'Uploading…',
  'upload.status.success': 'Uploaded',
  'upload.status.error': 'Upload failed',
  'upload.status.paused': 'Paused',
  'upload.status.instant': 'Instant upload complete',
  'upload.dropHere': 'Drop files here',
  'upload.chooseOrDrop': 'Click or drag files here to upload',
  'upload.pastePrefix': '; paste with ',
  'upload.pasteSuffix': '',
  'upload.totalProgress': 'Total progress',
  'upload.chunkProgress': 'Chunks {uploaded}/{total}',
  'upload.retry': 'Retry upload',
  'upload.remove': 'Remove file',
})

/** 绑定当前应用的语言覆盖，上传默认词表仅随本组件入口加载。 */
export function useUploadLocale() {
  const application = getCurrentInstance()
    ? inject(COMPONENT_LOCALE_KEY, {})
    : {}
  const defaults: ComponentLocale = {
    get locale() {
      return application.locale
    },
    get messages() {
      return application.locale === 'en-US' ? EN_MESSAGES : ZH_MESSAGES
    },
  }
  return {
    // 组件内默认值放在最低层，保留应用 messages/t 的既有优先级。
    t: (key: string, params?: Record<string, string | number>): string =>
      translateComponentMessage(key, application, defaults, params),
  }
}
