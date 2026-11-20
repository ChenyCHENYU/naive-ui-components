import { getPickerValue } from './source'
import type { DataPickerSourceInput } from './types'

/** 本地候选沿用远程选择器的分页和名称回显协议。 */
export interface LocalDataPickerSourceOptions<T extends object> extends Pick<
  DataPickerSourceInput<T>,
  'rowKey' | 'label' | 'value' | 'debounce' | 'minChars'
> {
  rows: readonly T[]
  /** 默认按名称搜索，需要匹配编码等字段时返回对应文本。 */
  searchText?: (row: T) => string
  /** 粘贴编码与提交值不一致时提供精确文本映射。 */
  code?: (row: T) => string
}

/** 用已有数组构建可搜索、可分页且支持初值回显的候选源。 */
export function createLocalDataPickerSource<T extends object>({
  rows,
  searchText,
  code,
  ...identity
}: LocalDataPickerSourceOptions<T>): DataPickerSourceInput<T> {
  const getSearchText = searchText ?? identity.label
  const source: DataPickerSourceInput<T> = {
    ...identity,
    request: async ({ page, pageSize, search, signal }) => {
      signal.throwIfAborted()
      const keyword = search.trim().toLowerCase()
      const matched = keyword
        ? rows.filter(row => getSearchText(row).toLowerCase().includes(keyword))
        : rows
      const start = (page - 1) * pageSize
      return {
        rows: matched.slice(start, start + pageSize),
        total: matched.length,
      }
    },
    resolve: async (values, signal) => {
      signal.throwIfAborted()
      const selected = new Set(values)
      return rows.filter(row => selected.has(getPickerValue(identity, row)))
    },
  }
  if (code) {
    source.resolveCodes = async (codes, signal) => {
      signal.throwIfAborted()
      const requested = new Set(codes)
      const matched = new Map<string, T>()
      for (const row of rows) {
        const value = code(row)
        if (!requested.has(value)) continue
        if (matched.has(value))
          throw new TypeError('[C_DataPicker] 粘贴编码必须唯一')
        matched.set(value, row)
      }
      return matched
    }
  }
  return source
}
