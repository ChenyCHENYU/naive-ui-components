/** 受控选项状态：组件只呈现传入值，不识别数据来源或管理外部请求。 */
export interface OptionsState {
  loading?: boolean
  error?: unknown
  retry?: () => void | Promise<unknown>
}

interface OptionInput {
  value?: string | number | boolean
  label?: string
  labelDefault?: string
  disabled?: boolean
}

type NativeValue = string | number
type OptionValue = NativeValue | boolean
const rawOptionValue = Symbol('c-option-value')

/** 无布尔值的普通选项无需创建编码映射。 */
export function needsOptionValueBinding(
  list: readonly OptionInput[] | undefined,
  value: unknown
): boolean {
  const values = Array.isArray(value) ? value : [value]
  return (
    values.some(item => typeof item === 'boolean') ||
    list?.some(option => typeof option.value === 'boolean') === true
  )
}

/** 原生选项控件不接受 boolean；仅编码 boolean，数字与字符串保持原样。 */
export function createOptionValueBinding(
  list: readonly OptionInput[] | undefined,
  modelValue: unknown
) {
  const values = list?.map(
    option => option.value ?? option.label ?? option.labelDefault
  )
  const modelValues = Array.isArray(modelValue) ? modelValue : [modelValue]
  const occupied = new Set([...(values ?? []), ...modelValues])
  const booleans = new Map<boolean, string>()
  for (const value of [false, true]) {
    let token = `__c_option_boolean_${value}__`
    while (occupied.has(token)) token += '_'
    booleans.set(value, token)
    occupied.add(token)
  }
  const encode = (value: unknown): NativeValue | null => {
    if (typeof value === 'boolean') return booleans.get(value)!
    return typeof value === 'string' || typeof value === 'number' ? value : null
  }
  const decode = (value: NativeValue, option?: unknown): OptionValue => {
    // 自由输入的新选项没有组件生成的标记，即使文字像内部 token 也保留字符串。
    if (option !== undefined) {
      if (
        option &&
        typeof option === 'object' &&
        Object.prototype.hasOwnProperty.call(option, rawOptionValue)
      ) {
        const original = (option as Record<symbol, unknown>)[rawOptionValue]
        if (typeof original === 'boolean') return original
      }
      return value
    }
    if (value === booleans.get(false)) return false
    if (value === booleans.get(true)) return true
    return value
  }
  return {
    options: list?.map((option, index) => ({
      ...option,
      label: option.label ?? option.labelDefault ?? '',
      value: encode(values![index]) ?? undefined,
      [rawOptionValue]: values![index],
    })),
    value: Array.isArray(modelValue)
      ? modelValue
          .map(encode)
          .filter((value): value is NativeValue => value !== null)
      : encode(modelValue),
    fallbackOption: (value: NativeValue) => ({
      value,
      label: String(decode(value)),
      [rawOptionValue]: decode(value),
    }),
    decode: (value: NativeValue | NativeValue[] | null, selected?: unknown) =>
      Array.isArray(value)
        ? value.map((entry, index) =>
            decode(entry, Array.isArray(selected) ? selected[index] : undefined)
          )
        : value === null
          ? null
          : decode(value, selected),
  }
}
