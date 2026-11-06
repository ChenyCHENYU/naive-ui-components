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
const booleanTokenPrefix = '__c_option_boolean_'

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

function createOptionValueCodec(falseToken: string, trueToken: string) {
  const encode = (value: unknown): NativeValue | null => {
    if (typeof value === 'boolean') return value ? trueToken : falseToken
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
    if (value === falseToken) return false
    if (value === trueToken) return true
    return value
  }
  return {
    encode,
    fallbackOption: (value: NativeValue) => {
      const original = decode(value)
      return { value, label: String(original), [rawOptionValue]: original }
    },
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

/** 把选项与选中值分开绑定，选中值变化时复用原生选项。 */
export function createOptionValueBinder(
  list: readonly OptionInput[] | undefined
) {
  const occupied = new Set<string>()
  let hasBooleanOptions = false
  const options = list?.map(option => {
    const value = option.value ?? option.label ?? option.labelDefault
    if (typeof value === 'string' && value.startsWith(booleanTokenPrefix))
      occupied.add(value)
    if (typeof value === 'boolean') hasBooleanOptions = true
    return {
      ...option,
      label: option.label ?? option.labelDefault ?? '',
      value:
        typeof value === 'string' || typeof value === 'number'
          ? value
          : undefined,
      [rawOptionValue]: value,
    }
  })
  const tokenFor = (value: boolean, selected?: ReadonlySet<unknown>) => {
    let token = `${booleanTokenPrefix}${value}__`
    while (occupied.has(token) || selected?.has(token)) token += '_'
    return token
  }
  const defaultFalseToken = tokenFor(false)
  const defaultTrueToken = tokenFor(true)

  const bindTokens = (falseToken: string, trueToken: string) => {
    const codec = createOptionValueCodec(falseToken, trueToken)
    const nativeOptions = hasBooleanOptions
      ? options?.map(option => {
          const original = option[rawOptionValue]
          return typeof original === 'boolean'
            ? { ...option, value: original ? trueToken : falseToken }
            : option
        })
      : options
    return { falseToken, trueToken, codec, nativeOptions }
  }
  let binding: ReturnType<typeof bindTokens> | undefined

  return (modelValue: unknown) => {
    const selected = new Set(
      Array.isArray(modelValue) ? modelValue : [modelValue]
    )
    const falseToken = selected.has(defaultFalseToken)
      ? tokenFor(false, selected)
      : defaultFalseToken
    const trueToken = selected.has(defaultTrueToken)
      ? tokenFor(true, selected)
      : defaultTrueToken
    // 自由输入或外部模型碰巧使用内部编码时，重新给布尔值选一个编码。
    if (binding?.falseToken !== falseToken || binding.trueToken !== trueToken)
      binding = bindTokens(falseToken, trueToken)
    const { encode, decode, fallbackOption } = binding.codec
    return {
      options: binding.nativeOptions,
      value: Array.isArray(modelValue)
        ? modelValue
            .map(encode)
            .filter((value): value is NativeValue => value !== null)
        : encode(modelValue),
      fallbackOption,
      decode,
    }
  }
}

/** 原生选项控件不接受 boolean；仅编码 boolean，数字与字符串保持原样。 */
export function createOptionValueBinding(
  list: readonly OptionInput[] | undefined,
  modelValue: unknown
) {
  return createOptionValueBinder(list)(modelValue)
}
