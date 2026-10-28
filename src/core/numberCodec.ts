/** 数值的编辑/显示边界；不承担业务校验、单位换算或税费计算。 */
export interface ValueCodec<T> {
  parse(input: unknown): T
  format(value: T): string
}

export interface NumberCodecOptions {
  /** 精确小数保留十进制字符串；number 模式拒绝不能往返的数值。 */
  storage?: 'number' | 'decimal-string'
  /** 仅控制显示的 HALF_UP 舍入，不修改存储值；0 是有效精度。 */
  fractionDigits?: number
  useGrouping?: boolean
  emptyText?: string
  prefix?: string
  suffix?: string
}

const DECIMAL = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/
const MAX_DIGITS = 1000

/** 有限 number 的科学计数法是运行时表示，不当作用户字符串的隐式语法。 */
function numberText(value: number): string {
  if (!Number.isFinite(value)) throw new TypeError('数值必须有限')
  const text = String(value)
  if (!text.includes('e')) return text
  const [mantissa, exponent] = text.split('e')
  const negative = mantissa.startsWith('-')
  const [whole, fraction = ''] = mantissa.replace(/^-/, '').split('.')
  const digits = whole + fraction
  const point = whole.length + Number(exponent)
  const unsigned =
    point <= 0
      ? `0.${'0'.repeat(-point)}${digits}`
      : point >= digits.length
        ? digits + '0'.repeat(point - digits.length)
        : `${digits.slice(0, point)}.${digits.slice(point)}`
  return negative ? `-${unsigned}` : unsigned
}

/** 只规范显式数值字段；编码字段应保留文本，不应交给数值 codec。 */
function normalizeDecimal(text: string): string {
  const negative = text.startsWith('-')
  const [whole = '', fraction = ''] = text.replace(/^[+-]/, '').split('.')
  const integer = whole.replace(/^0+(?=\d)/, '') || '0'
  const tail = fraction.replace(/0+$/, '')
  const unsigned = integer + (tail ? `.${tail}` : '')
  return negative && unsigned !== '0' ? `-${unsigned}` : unsigned
}

function decimalText(input: unknown): string | null {
  if (input == null) return null
  if (typeof input !== 'number' && typeof input !== 'string')
    throw new TypeError('数值必须是十进制文本或有限数字')
  const text = typeof input === 'number' ? numberText(input) : input.trim()
  if (text === '') return null
  if (text.length > MAX_DIGITS || !DECIMAL.test(text))
    throw new TypeError('请输入长度不超过 1000 位的普通十进制数')
  return normalizeDecimal(text)
}

/** 十进制 HALF_UP：整个运算不先经 Number，负数中点同样远离零。 */
function roundDecimal(text: string, digits: number): string {
  const negative = text.startsWith('-')
  const [integer, fraction = ''] = text.replace(/^-/, '').split('.')
  const kept = fraction.slice(0, digits).padEnd(digits, '0')
  let scaled = BigInt(integer + kept)
  if (fraction.length > digits && fraction[digits] >= '5') scaled += 1n
  const raw = scaled.toString().padStart(digits + 1, '0')
  const rounded = digits
    ? `${raw.slice(0, -digits)}.${raw.slice(-digits)}`
    : raw
  return negative && scaled !== 0n ? `-${rounded}` : rounded
}

export function createNumberCodec(
  options: NumberCodecOptions & { storage: 'decimal-string' }
): ValueCodec<string | null>
export function createNumberCodec(
  options?: NumberCodecOptions & { storage?: 'number' }
): ValueCodec<number | null>
export function createNumberCodec(
  options: NumberCodecOptions
): ValueCodec<number | string | null>
/** 生成可由表单、查询和网格 valueParser/valueFormatter 共用的纯函数。 */
export function createNumberCodec(
  options: NumberCodecOptions = {}
): ValueCodec<number | string | null> {
  const settings = { ...options }
  const digits = settings.fractionDigits
  if (
    digits !== undefined &&
    (!Number.isInteger(digits) || digits < 0 || digits > 100)
  )
    throw new RangeError('fractionDigits 必须是 0 到 100 的整数')
  if (
    settings.storage !== undefined &&
    !['number', 'decimal-string'].includes(settings.storage)
  )
    throw new TypeError('未知的数值存储类型')

  return {
    parse(input) {
      if (
        typeof input === 'number' &&
        Number.isInteger(input) &&
        !Number.isSafeInteger(input)
      )
        throw new RangeError(
          '精确数值必须传原始文本，不能从不安全的 number 恢复精度'
        )
      const text = decimalText(input)
      if (text === null || settings.storage === 'decimal-string') return text
      const value = Number(text)
      if (
        !Number.isFinite(value) ||
        (Number.isInteger(value) && !Number.isSafeInteger(value)) ||
        decimalText(value) !== text
      )
        throw new RangeError('数值不能安全转换为 number，请使用 decimal-string')
      return value
    },
    format(input) {
      const text = decimalText(input)
      if (text === null) return settings.emptyText ?? '—'
      let displayed = digits === undefined ? text : roundDecimal(text, digits)
      if (settings.useGrouping) {
        const [integer, fraction] = displayed.split('.')
        displayed =
          integer.replace(/\B(?=(\d{3})+(?!\d))/g, ',') +
          (fraction === undefined ? '' : `.${fraction}`)
      }
      return `${settings.prefix ?? ''}${displayed}${settings.suffix ?? ''}`
    },
  }
}
