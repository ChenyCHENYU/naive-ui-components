import type { ComponentLocale, ComponentLocaleName } from './contracts'

const ZH_CN_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
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
  'common.loading': '正在加载',
  'table.loading': '正在加载数据',
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
  'breadcrumb.label': '面包屑',
  'breadcrumb.expandPath': '展开完整路径',
  'breadcrumb.fullPath': '完整路径',
  'breadcrumb.directoryPages': '目录页面',
  'breadcrumb.pageCount': '{count} 个页面',
  'breadcrumb.current': '当前',
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
})

const EN_US_MESSAGES: Readonly<Record<string, string>> = Object.freeze({
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
  'common.loading': 'Loading',
  'table.loading': 'Loading data',
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
  'breadcrumb.label': 'Breadcrumb',
  'breadcrumb.expandPath': 'Show full path',
  'breadcrumb.fullPath': 'Full path',
  'breadcrumb.directoryPages': 'Directory pages',
  'breadcrumb.pageCount': '{count} pages',
  'breadcrumb.current': 'Current',
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
})

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

/** Read only an own message entry; prototype names remain ordinary translation keys. */
function getMessage(
  messages: Readonly<Record<string, string>> | undefined,
  key: string
): string | undefined {
  return messages && Object.prototype.hasOwnProperty.call(messages, key)
    ? messages[key]
    : undefined
}

function getBuiltInMessages(
  locale: ComponentLocaleName | undefined
): Readonly<Record<string, string>> {
  return locale === 'en-US' ? EN_US_MESSAGES : ZH_CN_MESSAGES
}

/** Translate without framework providers, global state, DOM or UI dependencies. */
export function translateComponentMessage(
  key: string,
  local: ComponentLocale = {},
  global: ComponentLocale = {},
  params?: Record<string, string | number>
): string {
  const custom = local.t ?? global.t
  if (custom) return custom(key, params)
  const builtIn = getBuiltInMessages(local.locale ?? global.locale)
  const template =
    getMessage(local.messages, key) ??
    getMessage(global.messages, key) ??
    getMessage(builtIn, key) ??
    key
  return interpolate(template, params)
}
