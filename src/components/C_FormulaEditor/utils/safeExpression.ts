type Primitive = number | string | boolean

type Token = {
  type:
    | 'number'
    | 'string'
    | 'variable'
    | 'identifier'
    | 'operator'
    | 'punctuation'
    | 'eof'
  value: string
  position: number
}

type FormulaFunction = (...args: Primitive[]) => Primitive

const MAX_EXPRESSION_LENGTH = 10_000
const MAX_TOKEN_COUNT = 5_000
const MAX_NESTING_DEPTH = 100

const FUNCTIONS: Readonly<Record<string, FormulaFunction>> = Object.freeze({
  IF: (condition, truthy, falsy) => (condition ? truthy : falsy),
  AND: (...args) => args.every(Boolean),
  OR: (...args) => args.some(Boolean),
  NOT: value => !value,
  SUM: (...args) =>
    args.reduce<number>((total, value) => total + toNumber(value), 0),
  AVG: (...args) =>
    args.length
      ? args.reduce<number>((total, value) => total + toNumber(value), 0) /
        args.length
      : 0,
  MAX: (...args) => Math.max(...args.map(toNumber)),
  MIN: (...args) => Math.min(...args.map(toNumber)),
  ABS: value => Math.abs(toNumber(value)),
  ROUND: (value, digits = 0) => {
    const safeDigits = Math.min(100, Math.max(0, Math.trunc(toNumber(digits))))
    const factor = 10 ** safeDigits
    return Math.round(toNumber(value) * factor) / factor
  },
  CEIL: value => Math.ceil(toNumber(value)),
  FLOOR: value => Math.floor(toNumber(value)),
})

function toNumber(value: Primitive): number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    throw new Error(`无法将“${String(value)}”转换为有限数值`)
  }
  return numberValue
}

// eslint-disable-next-line complexity -- 词法器按互斥词元类型分派，分支数不代表执行路径嵌套。
function tokenize(expression: string): Token[] {
  if (expression.length > MAX_EXPRESSION_LENGTH) {
    throw new Error(`公式长度不能超过 ${MAX_EXPRESSION_LENGTH} 个字符`)
  }

  const tokens: Token[] = []
  let position = 0

  const push = (token: Token) => {
    tokens.push(token)
    if (tokens.length > MAX_TOKEN_COUNT) {
      throw new Error(`公式不能超过 ${MAX_TOKEN_COUNT} 个词元`)
    }
  }

  while (position < expression.length) {
    const char = expression[position]
    if (/\s/.test(char)) {
      position += 1
      continue
    }

    const remaining = expression.slice(position)
    const numberMatch = /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/i.exec(
      remaining
    )
    if (numberMatch) {
      push({ type: 'number', value: numberMatch[0], position })
      position += numberMatch[0].length
      continue
    }

    if (char === '[') {
      const end = expression.indexOf(']', position + 1)
      if (end === -1) throw new Error(`第 ${position + 1} 个字符处缺少 ]`)
      const name = expression.slice(position + 1, end).trim()
      if (!name) throw new Error(`第 ${position + 1} 个字符处的变量名不能为空`)
      push({ type: 'variable', value: name, position })
      position = end + 1
      continue
    }

    if (char === '"' || char === "'") {
      const quote = char
      const start = position
      let value = ''
      let closed = false
      position += 1
      while (position < expression.length) {
        const current = expression[position]
        if (current === quote) {
          closed = true
          position += 1
          break
        }
        if (current === '\\') {
          position += 1
          // eslint-disable-next-line max-depth -- 转义字符必须在有界字符串扫描中检查边界。
          if (position >= expression.length) break
          const escaped = expression[position]
          value +=
            ({ n: '\n', r: '\r', t: '\t' } as Record<string, string>)[
              escaped
            ] ?? escaped
        } else {
          value += current
        }
        position += 1
      }
      if (!closed) throw new Error(`第 ${start + 1} 个字符处的字符串未闭合`)
      push({ type: 'string', value, position: start })
      continue
    }

    const twoCharacterOperator = expression.slice(position, position + 2)
    if (['>=', '<=', '==', '!='].includes(twoCharacterOperator)) {
      push({ type: 'operator', value: twoCharacterOperator, position })
      position += 2
      continue
    }

    if ('+-*/%><?:'.includes(char)) {
      push({ type: 'operator', value: char, position })
      position += 1
      continue
    }

    if ('(),'.includes(char)) {
      push({ type: 'punctuation', value: char, position })
      position += 1
      continue
    }

    const identifierMatch = /^[A-Za-z_][A-Za-z0-9_]*/.exec(remaining)
    if (identifierMatch) {
      const value = identifierMatch[0]
      const upperValue = value.toUpperCase()
      push({
        type: ['AND', 'OR', 'NOT'].includes(upperValue)
          ? 'operator'
          : 'identifier',
        value: ['AND', 'OR', 'NOT'].includes(upperValue) ? upperValue : value,
        position,
      })
      position += value.length
      continue
    }

    throw new Error(`第 ${position + 1} 个字符“${char}”不受支持`)
  }

  tokens.push({ type: 'eof', value: '', position })
  return tokens
}

class SafeExpressionParser {
  private cursor = 0
  private nestingDepth = 0

  constructor(
    private readonly tokens: Token[],
    private readonly variableFields: ReadonlyMap<string, string>,
    private readonly values: Readonly<Record<string, Primitive>>
  ) {}

  parse(): Primitive {
    const result = this.parseConditional()
    this.expect('eof')
    return result
  }

  private current(): Token {
    return this.tokens[this.cursor]
  }

  private advance(): Token {
    const token = this.current()
    this.cursor += 1
    return token
  }

  private matches(value: string): boolean {
    return this.current().value === value
  }

  private consume(value: string): boolean {
    if (!this.matches(value)) return false
    this.advance()
    return true
  }

  private expect(type: Token['type'], value?: string): Token {
    const token = this.current()
    if (token.type !== type || (value !== undefined && token.value !== value)) {
      const expected = value ?? type
      throw new Error(`第 ${token.position + 1} 个字符处应为 ${expected}`)
    }
    return this.advance()
  }

  private parseConditional(): Primitive {
    this.nestingDepth += 1
    if (this.nestingDepth > MAX_NESTING_DEPTH) {
      throw new Error(`公式嵌套不能超过 ${MAX_NESTING_DEPTH} 层`)
    }
    try {
      const condition = this.parseOr()
      if (!this.consume('?')) return condition
      const truthy = this.parseConditional()
      this.expect('operator', ':')
      const falsy = this.parseConditional()
      return condition ? truthy : falsy
    } finally {
      this.nestingDepth -= 1
    }
  }

  private parseOr(): Primitive {
    let value = this.parseAnd()
    while (this.consume('OR'))
      value = Boolean(value) || Boolean(this.parseAnd())
    return value
  }

  private parseAnd(): Primitive {
    let value = this.parseEquality()
    while (this.consume('AND'))
      value = Boolean(value) && Boolean(this.parseEquality())
    return value
  }

  private parseEquality(): Primitive {
    let value = this.parseComparison()
    while (this.matches('==') || this.matches('!=')) {
      const operator = this.advance().value
      const right = this.parseComparison()
      value = operator === '==' ? value === right : value !== right
    }
    return value
  }

  private parseComparison(): Primitive {
    let value = this.parseAdditive()
    while (['>', '>=', '<', '<='].includes(this.current().value)) {
      const operator = this.advance().value
      const right = this.parseAdditive()
      if (typeof value === 'boolean' || typeof right === 'boolean') {
        throw new Error(`运算符 ${operator} 不支持布尔值`)
      }
      if (operator === '>') value = value > right
      else if (operator === '>=') value = value >= right
      else if (operator === '<') value = value < right
      else value = value <= right
    }
    return value
  }

  private parseAdditive(): Primitive {
    let value = this.parseMultiplicative()
    while (this.matches('+') || this.matches('-')) {
      const operator = this.advance().value
      const right = this.parseMultiplicative()
      value =
        operator === '+'
          ? toNumber(value) + toNumber(right)
          : toNumber(value) - toNumber(right)
    }
    return value
  }

  private parseMultiplicative(): Primitive {
    let value = this.parseUnary()
    while (['*', '/', '%'].includes(this.current().value)) {
      const operator = this.advance().value
      const right = toNumber(this.parseUnary())
      const left = toNumber(value)
      if (operator === '*') value = left * right
      else if (operator === '/') value = left / right
      else value = left % right
    }
    return value
  }

  private parseUnary(): Primitive {
    if (this.consume('-')) return -toNumber(this.parseUnary())
    if (this.consume('+')) return toNumber(this.parseUnary())
    if (this.consume('NOT')) return !this.parseUnary()
    return this.parsePrimary()
  }

  // eslint-disable-next-line complexity -- 基础表达式的互斥语法分派集中在此处便于安全审计。
  private parsePrimary(): Primitive {
    const token = this.current()
    if (
      token.type === 'operator' &&
      ['AND', 'OR'].includes(token.value) &&
      this.tokens[this.cursor + 1]?.value === '('
    ) {
      this.advance()
      this.advance()
      return this.callFunction(token.value, token)
    }
    if (token.type === 'number') {
      this.advance()
      return Number(token.value)
    }
    if (token.type === 'string') {
      this.advance()
      return token.value
    }
    if (token.type === 'variable') {
      this.advance()
      const field = this.variableFields.get(token.value)
      if (!field) throw new Error(`未知变量“${token.value}”`)
      return this.readValue(field, token)
    }
    if (token.type === 'identifier') {
      this.advance()
      const upperValue = token.value.toUpperCase()
      if (upperValue === 'TRUE') return true
      if (upperValue === 'FALSE') return false
      if (this.consume('(')) return this.callFunction(upperValue, token)
      return this.readValue(token.value, token)
    }
    if (this.consume('(')) {
      const value = this.parseConditional()
      this.expect('punctuation', ')')
      return value
    }
    throw new Error(`第 ${token.position + 1} 个字符处缺少有效值`)
  }

  private readValue(field: string, token: Token): Primitive {
    if (!Object.prototype.hasOwnProperty.call(this.values, field)) {
      throw new Error(`变量“${token.value}”缺少样例数据`)
    }
    const value = this.values[field]
    if (!['number', 'string', 'boolean'].includes(typeof value)) {
      throw new Error(`变量“${token.value}”的数据类型不受支持`)
    }
    return value
  }

  private callFunction(name: string, token: Token): Primitive {
    const fn = FUNCTIONS[name]
    if (!fn) throw new Error(`未知函数“${token.value}”`)
    const args: Primitive[] = []
    if (!this.consume(')')) {
      do {
        args.push(this.parseConditional())
      } while (this.consume(','))
      this.expect('punctuation', ')')
    }
    return fn(...args)
  }
}

/**
 * Evaluate the component's small formula language without dynamic code execution,
 * object traversal, or access to caller-provided functions.
 */
export function evaluateSafeExpression(
  expression: string,
  variableFields: ReadonlyMap<string, string>,
  values: Readonly<Record<string, Primitive>>
): Primitive {
  const result = new SafeExpressionParser(
    tokenize(expression),
    variableFields,
    values
  ).parse()
  if (typeof result === 'number' && !Number.isFinite(result)) {
    throw new Error('公式计算结果必须是有限数值')
  }
  return result
}
