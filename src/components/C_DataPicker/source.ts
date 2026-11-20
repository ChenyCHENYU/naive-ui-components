import { validateTableRowKeys } from '../C_Table/helpers'
import type { DataPickerSourceInput, DataPickerValue } from './types'

/** 保留原始编码类型，排除 NaN 和无穷大。 */
export function isPickerValue(value: unknown): value is DataPickerValue {
  return (
    typeof value === 'string' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

/** 表单与搜索自定义字段共用选择器的值边界。 */
export function normalizePickerFieldValue(
  value: unknown
): DataPickerValue | DataPickerValue[] | null {
  if (isPickerValue(value)) return value
  return Array.isArray(value) && value.every(isPickerValue) ? value : null
}

/** Validate the identity before passing it to the table selection API. */
export function getPickerRowKey<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'rowKey'>,
  row: T
): DataPickerValue {
  const key =
    typeof source.rowKey === 'function'
      ? source.rowKey(row)
      : row[source.rowKey]
  if (!isPickerValue(key))
    throw new TypeError('[C_DataPicker] rowKey 必须为字符串或有限数值')
  return key
}

/** Explicit business values preserve their separate mapping. */
export function getPickerValue<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'rowKey' | 'value'>,
  row: T
): DataPickerValue {
  return source.value === undefined
    ? getPickerRowKey(source, row)
    : source.value(row)
}

function validatePickerBusinessValues<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'value'>,
  rows: readonly T[]
): void {
  // 默认业务值与行键相同，行键检查已验证类型、缺失与重复。
  if (source.value === undefined) return
  const values = new Set<DataPickerValue>()
  for (const row of rows) {
    const value = source.value(row)
    if (!isPickerValue(value) || values.has(value))
      throw new TypeError('[C_DataPicker] 业务值必须为唯一的字符串或有限数值')
    values.add(value)
  }
}

/** Reject malformed pages and duplicate identities before they reach selection. */
export function validatePickerPage<T extends object>(
  source: Pick<DataPickerSourceInput<T>, 'rowKey' | 'value'>,
  result: { rows: T[]; total: number },
  pageSize: number
): void {
  if (
    !Array.isArray(result.rows) ||
    !Number.isSafeInteger(result.total) ||
    result.total < 0
  ) {
    throw new TypeError(
      '[C_DataPicker] request 必须返回 rows 数组和非负安全整数 total'
    )
  }
  if (result.rows.length > pageSize || result.rows.length > result.total) {
    throw new TypeError('[C_DataPicker] rows 超过请求的分页或 total 范围')
  }
  if (
    validateTableRowKeys(result.rows, row => getPickerRowKey(source, row))
      .length
  ) {
    throw new TypeError('[C_DataPicker] rowKey 不得缺失或重复')
  }
  validatePickerBusinessValues(source, result.rows)
}
