import {
  getCurrentInstance,
  inject,
  toValue,
  type InjectionKey,
  type MaybeRefOrGetter,
} from 'vue'
import { useDialog, useMessage } from 'naive-ui'

export interface ConfirmOptions {
  title: string
  content: string
  positiveText?: string
  negativeText?: string
  type?: 'warning' | 'error' | 'info' | 'success'
}

export interface ComponentFeedback {
  success?: (message: string) => void
  error?: (message: string, cause?: unknown) => void
  warning?: (message: string) => void
  info?: (message: string) => void
  confirm?: (options: ConfirmOptions) => boolean | Promise<boolean>
}

export type ComponentLocaleName = 'zh-CN' | 'en-US'

export interface ComponentLocale {
  locale?: ComponentLocaleName
  messages?: Record<string, string>
  t?: (key: string, params?: Record<string, string | number>) => string
}

export const COMPONENT_FEEDBACK_KEY: InjectionKey<ComponentFeedback> = Symbol(
  'robot-component-feedback'
)
export const COMPONENT_LOCALE_KEY: InjectionKey<ComponentLocale> = Symbol(
  'robot-component-locale'
)

const ZH_CN_MESSAGES: Record<string, string> = {
  'common.confirm': '确定',
  'common.cancel': '取消',
  'common.save': '保存',
  'common.submit': '提交',
  'common.reset': '重置',
  'common.retry': '重试',
  'common.edit': '编辑',
  'common.detail': '详情',
  'common.delete': '删除',
  'common.select': '选择',
  'common.print': '打印',
  'table.loadFailed': '数据加载失败',
  'table.deleteTitle': '确认删除',
  'table.deleteContent': '确定要删除这条记录吗？',
  'table.deleteSuccess': '删除成功',
  'table.deleteFailed': '删除失败',
  'table.detailFailed': '获取详情失败',
  'table.moreActions': '更多操作',
  'table.actionFailed': '{action}失败',
  'table.cancelSelection': '取消选择',
  'table.columnSettings': '列设置',
  'table.export': '导出',
  'table.settings': '表格设置',
  'table.selectedCount': '已选择 {count} 项',
  'table.addRow': '增行',
  'table.insertRow': '插行',
  'table.deleteRow': '删除行',
  'table.copyRow': '复制行',
  'table.moveUp': '上移',
  'table.moveDown': '下移',
  'table.addRowSuccess': '添加行成功',
  'table.insertRowSuccess': '插入行成功',
  'table.deleteRowSuccess': '删除行成功',
  'table.copyRowSuccess': '复制行成功',
  'table.moveUpSuccess': '行已上移',
  'table.moveDownSuccess': '行已下移',
  'table.selectRowFirst': '请先选择一行数据',
  'table.selectDeleteRowFirst': '请先选择要删除的行',
  'table.selectCopyRowFirst': '请先选择要复制的行',
  'table.firstRow': '已经是第一行',
  'table.lastRow': '已经是最后一行',
  'table.deleteRowContent': '确定要删除选中的行吗？此操作不可撤销。',
  'table.confirmDeleteRow': '确认删除',
  'table.printTargetMissing': '打印元素未找到',
  'table.downloadTargetMissing': '下载元素未找到',
  'table.invalidRowKeys': '表格存在 {count} 个缺失或重复的行键',
  'form.required': '{label}不能为空',
  'search.valueRequired': '请输入搜索内容，或选择筛选条件',
  'search.failed': '搜索失败',
  'captcha.trigger': '点击进行人机验证',
  'captcha.verifying': '正在验证…',
  'captcha.success': '验证成功',
  'captcha.failed': '验证失败，请重试',
  'captcha.reset': '重新验证',
  'captcha.puzzleFailed': '拼图验证失败',
  'captcha.verifyFailed': '服务端验证失败',
  'captcha.loadFailed': '验证码加载失败',
}

const EN_US_MESSAGES: Record<string, string> = {
  'common.confirm': 'Confirm',
  'common.cancel': 'Cancel',
  'common.save': 'Save',
  'common.submit': 'Submit',
  'common.reset': 'Reset',
  'common.retry': 'Retry',
  'common.edit': 'Edit',
  'common.detail': 'Details',
  'common.delete': 'Delete',
  'common.select': 'Select',
  'common.print': 'Print',
  'table.loadFailed': 'Failed to load data',
  'table.deleteTitle': 'Confirm deletion',
  'table.deleteContent': 'Are you sure you want to delete this record?',
  'table.deleteSuccess': 'Deleted successfully',
  'table.deleteFailed': 'Delete failed',
  'table.detailFailed': 'Failed to load details',
  'table.moreActions': 'More actions',
  'table.actionFailed': '{action} failed',
  'table.cancelSelection': 'Clear selection',
  'table.columnSettings': 'Column settings',
  'table.export': 'Export',
  'table.settings': 'Table settings',
  'table.selectedCount': '{count} selected',
  'table.addRow': 'Add row',
  'table.insertRow': 'Insert row',
  'table.deleteRow': 'Delete row',
  'table.copyRow': 'Copy row',
  'table.moveUp': 'Move up',
  'table.moveDown': 'Move down',
  'table.addRowSuccess': 'Row added',
  'table.insertRowSuccess': 'Row inserted',
  'table.deleteRowSuccess': 'Row deleted',
  'table.copyRowSuccess': 'Row copied',
  'table.moveUpSuccess': 'Row moved up',
  'table.moveDownSuccess': 'Row moved down',
  'table.selectRowFirst': 'Select a row first',
  'table.selectDeleteRowFirst': 'Select a row to delete first',
  'table.selectCopyRowFirst': 'Select a row to copy first',
  'table.firstRow': 'This is already the first row',
  'table.lastRow': 'This is already the last row',
  'table.deleteRowContent':
    'Are you sure you want to delete the selected row? This cannot be undone.',
  'table.confirmDeleteRow': 'Delete row',
  'table.printTargetMissing': 'Print target was not found',
  'table.downloadTargetMissing': 'Download target was not found',
  'table.invalidRowKeys': '{count} table row keys are missing or duplicated',
  'form.required': '{label} is required',
  'search.valueRequired': 'Enter a search term or choose a filter',
  'search.failed': 'Search failed',
  'captcha.trigger': 'Click to verify',
  'captcha.verifying': 'Verifying…',
  'captcha.success': 'Verified',
  'captcha.failed': 'Verification failed. Try again.',
  'captcha.reset': 'Verify again',
  'captcha.puzzleFailed': 'Puzzle verification failed',
  'captcha.verifyFailed': 'Server verification failed',
  'captcha.loadFailed': 'Failed to load captcha',
}

const interpolate = (
  template: string,
  params?: Record<string, string | number>
): string =>
  params
    ? template.replace(/\{([^{}]+)\}/g, (match, key: string) =>
        Object.prototype.hasOwnProperty.call(params, key)
          ? String(params[key])
          : match
      )
    : template

/** Resolve component messages from local, global, then built-in dictionaries. */
export function useComponentLocale(
  local?: MaybeRefOrGetter<ComponentLocale | undefined>
) {
  const instance = getCurrentInstance()
  const global = instance ? inject(COMPONENT_LOCALE_KEY, {}) : {}

  /* eslint-disable complexity -- Precedence is intentionally centralized for all component messages. */
  const translate = (
    key: string,
    params?: Record<string, string | number>
  ): string => {
    const current = toValue(local) ?? {}
    const custom = current.t ?? global.t
    if (custom) return custom(key, params)
    const locale = current.locale ?? global.locale ?? 'zh-CN'
    const builtIn = locale === 'en-US' ? EN_US_MESSAGES : ZH_CN_MESSAGES
    const template =
      current.messages?.[key] ?? global.messages?.[key] ?? builtIn[key] ?? key
    return interpolate(template, params)
  }
  /* eslint-enable complexity */

  return { t: translate }
}

/** Reuse Naive providers when present and safely degrade to injected/no-op feedback. */
export function useComponentFeedback(
  local?: MaybeRefOrGetter<ComponentFeedback | undefined>
): Required<ComponentFeedback> {
  const instance = getCurrentInstance()
  const global = instance ? inject(COMPONENT_FEEDBACK_KEY, {}) : {}
  let message: ReturnType<typeof useMessage> | null = null
  let dialog: ReturnType<typeof useDialog> | null = null

  if (instance) {
    try {
      message = useMessage()
    } catch {
      message = null
    }
    try {
      dialog = useDialog()
    } catch {
      dialog = null
    }
  }

  const adapter = () => toValue(local) ?? global
  const notify = (
    type: 'success' | 'error' | 'warning' | 'info',
    text: string,
    cause?: unknown
  ) => {
    const handler = adapter()[type]
    if (handler) handler(text, cause)
    else message?.[type](text)
  }

  const confirm = async (options: ConfirmOptions): Promise<boolean> => {
    const customConfirm = adapter().confirm
    if (customConfirm) return (await customConfirm(options)) !== false
    if (!dialog) {
      return typeof window !== 'undefined' &&
        typeof window.confirm === 'function'
        ? window.confirm(`${options.title}\n${options.content}`)
        : false
    }

    return new Promise(resolve => {
      let settled = false
      const finish = (value: boolean) => {
        if (settled) return
        settled = true
        resolve(value)
      }
      const method = options.type ?? 'warning'
      dialog[method]({
        title: options.title,
        content: options.content,
        positiveText: options.positiveText,
        negativeText: options.negativeText,
        onPositiveClick: () => finish(true),
        onNegativeClick: () => finish(false),
        onClose: () => finish(false),
      })
    })
  }

  return {
    success: text => notify('success', text),
    error: (text, cause) => notify('error', text, cause),
    warning: text => notify('warning', text),
    info: text => notify('info', text),
    confirm,
  }
}
