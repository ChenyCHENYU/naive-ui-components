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
  type?: unknown
  children?: unknown
}

/** 只有原生 group 节点递归；业务记录自身的 children 字段不改变选项身份。 */
function groupChildren(
  option: OptionInput
): readonly OptionInput[] | undefined {
  return option.type === 'group' && Array.isArray(option.children)
    ? option.children
    : undefined
}

/** 组选项不参与值绑定，只返回原始叶项，保留业务记录身份。 */
export function flattenOptionItems<T extends OptionInput>(
  list: readonly T[]
): T[] {
  const leaves: T[] = []
  const visit = (items: readonly T[]) => {
    for (const option of items) {
      const children = groupChildren(option)
      if (children) visit(children as readonly T[])
      else leaves.push(option)
    }
  }
  visit(list)
  return leaves
}

function hasBooleanOption(list: readonly OptionInput[]): boolean {
  return list.some(option => {
    const children = groupChildren(option)
    return children
      ? hasBooleanOption(children)
      : typeof option.value === 'boolean'
  })
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
    (list && hasBooleanOption(list)) === true
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
  const fallbackOption = (value: NativeValue) => {
    const original = decode(value)
    return { value, label: String(original), [rawOptionValue]: original }
  }
  const resolveFallbackOption = (supplied: unknown) => {
    if (supplied === false) return false
    if (typeof supplied !== 'function') return fallbackOption
    return (value: NativeValue) => {
      const option: unknown = supplied(value)
      return {
        ...fallbackOption(value),
        ...(option && typeof option === 'object' ? option : {}),
        value,
        [rawOptionValue]: decode(value),
      }
    }
  }
  return {
    encode,
    fallbackOption,
    resolveFallbackOption,
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

function mapOption(option: OptionInput) {
  const value = option.value ?? option.label ?? option.labelDefault
  return {
    ...option,
    label: option.label ?? option.labelDefault ?? '',
    value:
      typeof value === 'string' || typeof value === 'number'
        ? value
        : undefined,
    [rawOptionValue]: value,
  }
}

/** 提前收集所有叶项与占用编码，分组标题不作为业务值。 */
function prepareOptions(list: readonly OptionInput[] | undefined) {
  const occupied = new Set<string>()
  let hasBooleanOptions = false
  const leaves = list ? flattenOptionItems(list) : []
  const mapped = new Map<
    OptionInput,
    { label: string; value: NativeValue | undefined; [rawOptionValue]: unknown }
  >()
  for (const option of leaves) {
    const mappedOption = mapOption(option)
    const value = mappedOption[rawOptionValue]
    if (typeof value === 'string' && value.startsWith(booleanTokenPrefix))
      occupied.add(value)
    if (typeof value === 'boolean') hasBooleanOptions = true
    mapped.set(option, mappedOption)
  }
  return { occupied, hasBooleanOptions, mapped }
}

/** 把选项与选中值分开绑定，选中值变化时复用原生选项。 */
export function createOptionValueBinder(
  list: readonly OptionInput[] | undefined
) {
  const { occupied, hasBooleanOptions, mapped } = prepareOptions(list)
  const tokenFor = (value: boolean, selected?: ReadonlySet<unknown>) => {
    let token = `${booleanTokenPrefix}${value}__`
    while (occupied.has(token) || selected?.has(token)) token += '_'
    return token
  }
  const defaultFalseToken = tokenFor(false)
  const defaultTrueToken = tokenFor(true)

  const bindTokens = (falseToken: string, trueToken: string) => {
    const codec = createOptionValueCodec(falseToken, trueToken)
    const mapOptions = (
      entries: readonly OptionInput[]
    ): Array<{ label: string; value?: NativeValue; children?: unknown }> =>
      entries.map(entry => {
        const children = groupChildren(entry)
        if (children)
          return {
            ...entry,
            value: undefined,
            label: entry.label ?? entry.labelDefault ?? '',
            children: mapOptions(children),
          }
        const option = mapped.get(entry)!
        if (hasBooleanOptions) {
          const original = option[rawOptionValue]
          return typeof original === 'boolean'
            ? { ...option, value: original ? trueToken : falseToken }
            : option
        }
        return option
      })
    const nativeOptions = list ? mapOptions(list) : undefined
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
    const { encode, decode, fallbackOption, resolveFallbackOption } =
      binding.codec
    return {
      options: binding.nativeOptions,
      value: Array.isArray(modelValue)
        ? modelValue
            .map(encode)
            .filter((value): value is NativeValue => value !== null)
        : encode(modelValue),
      fallbackOption,
      resolveFallbackOption,
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
