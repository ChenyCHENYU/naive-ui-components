import { cloneData, parseDataPath } from '../../utils/data'
import type { SearchFieldType, SearchFormItem } from './types'

interface SearchValueField {
  type: SearchFieldType
  defaultValue?: unknown
  attrs?: Record<string, unknown>
  fixed?: boolean
  disabled?: boolean
  readonly?: boolean
}

function acceptsPreset(
  field: SearchValueField & { prop: string; show?: boolean },
  values: object
): boolean {
  return (
    field.show !== false &&
    field.type !== 'spacer' &&
    !isSearchFieldLocked(field) &&
    !['pageNum', 'pageSize'].includes(field.prop) &&
    Object.prototype.hasOwnProperty.call(values, field.prop)
  )
}

/** 预设只更新已声明的可编辑条件；先准备独立副本，任何错误都不部分写入。 */
export function mergeSearchPreset<T extends object>(
  current: T,
  fields: readonly SearchFormItem<T>[],
  values: Partial<T>
): T {
  if (!values || typeof values !== 'object' || Array.isArray(values))
    throw new TypeError('搜索预设必须是字段值对象')
  const next = cloneData(current)
  const target = next as Record<string, unknown>
  for (const field of fields) {
    if (!acceptsPreset(field, values)) continue
    parseDataPath(field.prop)
    target[field.prop] = cloneData(
      normalizeSearchFieldValue(
        field,
        (values as Record<string, unknown>)[field.prop],
        target[field.prop]
      )
    )
  }
  return next
}

const isMultiple = (field: SearchValueField): boolean =>
  field.type === 'select' && field.attrs?.multiple === true

const preservesClearedValue = (field: SearchValueField): boolean =>
  ['select', 'number'].includes(field.type) && field.attrs?.clearable === false

/** 与控件渲染和历史选择共用防写边界，不能由 v-bind 的事件绕过。 */
export function isSearchFieldLocked(field: SearchValueField): boolean {
  return !!(
    field.fixed ||
    field.disabled ||
    field.readonly ||
    field.attrs?.disabled === true ||
    field.attrs?.readonly === true
  )
}

/** 0 和 false 均是有效条件，范围仅在两端都为空时视为空。 */
export function isSearchValueEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.every(isSearchValueEmpty))
  )
}

/** 控件的清空值与重置值共用同一语义，避免字符串/数组模型被写成 null。 */
export function resolveSearchResetValue(
  field: SearchValueField,
  currentValue: unknown
): unknown {
  if (field.fixed) return cloneData(currentValue)
  if (field.defaultValue !== undefined) return cloneData(field.defaultValue)
  if (field.type === 'input') return ''
  if (isMultiple(field)) return []
  // 未配置默认值的旧动态表单仍可关闭清空，重置时保留其当前有效值。
  if (preservesClearedValue(field)) return cloneData(currentValue)
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
  if (isMultiple(field)) return []
  if (preservesClearedValue(field))
    return resolveSearchResetValue(field, currentValue)
  if (field.type === 'custom')
    return resolveSearchResetValue(field, currentValue)
  return null
}
