import type { ComponentLocale } from '../../core/contracts'
import { useScopedComponentLocale } from '../_shared/useScopedComponentLocale'

const CHINESE = Object.freeze({
  'changeReview.title': '字段变更审阅',
  'changeReview.table': '字段对照表',
  'changeReview.summary': '{count} 个变更 · 共 {total} 个字段',
  'changeReview.onlyChanged': '仅看变更',
  'changeReview.field': '字段',
  'changeReview.before': '原值',
  'changeReview.after': '建议值',
  'changeReview.status': '变更',
  'changeReview.select': '采纳',
  'changeReview.selectField': '采纳 {field}',
  'changeReview.unchanged': '一致',
  'changeReview.added': '补充',
  'changeReview.removed': '移除',
  'changeReview.changed': '修改',
  'changeReview.missing': '未提供',
  'changeReview.null': '空值',
  'changeReview.noChanges': '没有字段变更',
  'changeReview.empty': '没有可审阅的字段',
  'changeReview.selected': '已选 {count} 项',
  'changeReview.apply': '采纳所选字段',
})
const ENGLISH = Object.freeze({
  'changeReview.title': 'Review field changes',
  'changeReview.table': 'Field comparison',
  'changeReview.summary': '{count} changed · {total} fields',
  'changeReview.onlyChanged': 'Changed fields only',
  'changeReview.field': 'Field',
  'changeReview.before': 'Original value',
  'changeReview.after': 'Proposed value',
  'changeReview.status': 'Change',
  'changeReview.select': 'Accept',
  'changeReview.selectField': 'Accept {field}',
  'changeReview.unchanged': 'Unchanged',
  'changeReview.added': 'Added',
  'changeReview.removed': 'Removed',
  'changeReview.changed': 'Modified',
  'changeReview.missing': 'Not provided',
  'changeReview.null': 'Null',
  'changeReview.noChanges': 'No field changes',
  'changeReview.empty': 'No fields to review',
  'changeReview.selected': '{count} selected',
  'changeReview.apply': 'Accept selected fields',
})

export const useChangeReviewLocale = (
  local: () => ComponentLocale | undefined
) => useScopedComponentLocale(CHINESE, ENGLISH, local)
