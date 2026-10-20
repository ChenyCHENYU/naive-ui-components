import { cloneData } from '../../utils/data'
import type { SearchFieldType } from './types'

interface SearchValueField {
  type: SearchFieldType
  defaultValue?: unknown
  attrs?: Record<string, unknown>
}

/** 控件的清空值与重置值共用同一语义，避免字符串/数组模型被写成 null。 */
export function resolveSearchResetValue(
  field: SearchValueField,
  currentValue: unknown
): unknown {
  if (field.defaultValue !== undefined) return cloneData(field.defaultValue)
  if (field.type === 'input') return ''
  if (field.type === 'select' && field.attrs?.multiple === true) return []
  // 未配置默认值的旧动态表单仍可关闭清空，重置时保留其当前有效值。
  if (field.type === 'select' && field.attrs?.clearable === false)
    return cloneData(currentValue)
  return null
}

/** 原生控件清空多选时可能发布 null，业务数组保持为空数组。 */
export function normalizeSearchFieldValue(
  field: SearchValueField,
  value: unknown,
  currentValue: unknown
): unknown {
  if (value !== null && value !== undefined) return value
  if (field.type === 'input') return ''
  if (field.type === 'select' && field.attrs?.multiple === true) return []
  if (field.type === 'select' && field.attrs?.clearable === false)
    return resolveSearchResetValue(field, currentValue)
  return null
}
