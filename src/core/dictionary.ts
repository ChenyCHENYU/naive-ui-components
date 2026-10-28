/**
 * 字典值协议与纯转换工具。数据缓存、请求与租户隔离由应用 Provider 负责。
 * 此模块不依赖 Vue、UI、DOM 或任何表格实现，可用于导入、导出和适配层。
 */
export type DictionaryValue = string | number | boolean

export interface DictionaryOption {
  value: DictionaryValue
  label: string
  disabled?: boolean
}

export interface DictionarySource {
  getOptions(): readonly DictionaryOption[]
  load?(context: { signal: AbortSignal }): Promise<readonly DictionaryOption[]>
  subscribe?(listener: () => void): () => void
}

export interface DictionaryProvider {
  getDictionary(name: string): DictionarySource | undefined
}

export type DictionaryBinding = string | DictionarySource

export type DictionaryParseResult =
  | { ok: true; value: DictionaryValue }
  | { ok: false; reason: 'unknown' | 'ambiguous'; input: unknown }

/** 每份选项快照只建一次索引，表格单元格解析不重复遍历整份字典。 */
export function createDictionaryLabelResolver(
  options: readonly DictionaryOption[]
) {
  const labels = new Map<DictionaryValue, string>()
  for (const option of options)
    if (!labels.has(option.value)) labels.set(option.value, option.label)
  return (value: unknown): string =>
    labels.get(value as DictionaryValue) ?? String(value ?? '')
}

/** 原值比较保留 boolean、数值和带前导零的字符串编码，不回写展示标签。 */
export function getDictionaryLabel(
  value: unknown,
  options: readonly DictionaryOption[]
): string {
  return (
    options.find(option => Object.is(option.value, value))?.label ??
    String(value ?? '')
  )
}

/** 原码优先于标签；多义标签或字符串化编码必须交由使用侧明确处理。 */
export function parseDictionaryValue(
  input: unknown,
  options: readonly DictionaryOption[]
): DictionaryParseResult {
  const exact = options.find(option => Object.is(option.value, input))
  if (exact) return { ok: true, value: exact.value }
  if (typeof input !== 'string') return { ok: false, reason: 'unknown', input }
  const codes = options.filter(option => String(option.value) === input)
  const matches = codes.length
    ? codes
    : options.filter(option => option.label === input)
  if (matches.length === 1) return { ok: true, value: matches[0]!.value }
  return { ok: false, reason: matches.length ? 'ambiguous' : 'unknown', input }
}

/** Naive 选项控件只接受 string/number；完整编码避免 false 与 "false" 相互碰撞。 */
export function encodeDictionaryControlValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(encodeDictionaryControlValue)
  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return JSON.stringify([typeof value, value])
  }
  return value
}

/** 仅解码本模块生成的控件值，业务模型始终保存原始类型。 */
export function decodeDictionaryControlValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeDictionaryControlValue)
  if (typeof value !== 'string') return value
  try {
    const parsed: unknown = JSON.parse(value)
    if (
      Array.isArray(parsed) &&
      parsed.length === 2 &&
      ['string', 'number', 'boolean'].includes(parsed[0]) &&
      typeof parsed[1] === parsed[0]
    )
      return parsed[1]
  } catch {
    // 不把未编码的控件值或非法 JSON 强制转换为数字/布尔值。
  }
  return value
}

/** 生成控件快照；原 Provider 的数组与选项不会被控件修改。 */
export function toDictionaryControlOptions(
  options: readonly DictionaryOption[]
) {
  return options.map(option => ({
    ...option,
    value: encodeDictionaryControlValue(option.value) as string,
  }))
}
