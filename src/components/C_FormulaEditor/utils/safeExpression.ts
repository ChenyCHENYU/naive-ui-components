/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2026-10-07
 * @Description: 有界公式语言的唯一词法、语法与安全求值实现
 * Copyright (c) 2026 by CHENY, All Rights Reserved.
 */
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

type ExpressionNode =
  | { kind: 'literal'; value: Primitive }
  | { kind: 'variable' | 'identifier'; name: string }
  | {
      kind: 'binary'
      operator: string
      left: ExpressionNode
      right: ExpressionNode
    }
  | { kind: 'unary'; operator: string; value: ExpressionNode }
  | {
      kind: 'conditional'
      condition: ExpressionNode
      truthy: ExpressionNode
      falsy: ExpressionNode
    }
  | { kind: 'call'; name: string; args: ExpressionNode[] }

/** 一个语法树同时用于校验和求值；条件分支按需计算。 */
class SafeExpressionParser {
  private cursor = 0
  private nestingDepth = 0
  constructor(private readonly tokens: Token[]) {}

  /** 解析完整输入，禁止忽略尾部表达式。 */
  parse(): ExpressionNode {
    const result = this.parseConditional()
    this.expect('eof')
    return result
  }
  /** 当前词元。 */
  private current(): Token {
    return this.tokens[this.cursor]
  }
  /** 消费当前词元。 */
  private advance(): Token {
    return this.tokens[this.cursor++]
  }
  /** 尝试消费指定符号。 */
  private consume(value: string): boolean {
    if (this.current().value !== value) return false
    this.advance()
    return true
  }
  /** 消费必需词元并报告实际错误位置。 */
  private expect(type: Token['type'], value?: string): Token {
    const token = this.current()
    if (token.type !== type || (value !== undefined && token.value !== value))
      throw new Error(`第 ${token.position + 1} 个字符处应为 ${value ?? type}`)
    return this.advance()
  }
  /** 三元条件表达式保持右结合，并限制嵌套。 */
  private parseConditional(): ExpressionNode {
    if (++this.nestingDepth > MAX_NESTING_DEPTH)
      throw new Error(`公式嵌套不能超过 ${MAX_NESTING_DEPTH} 层`)
    try {
      const condition = this.parseOr()
      if (!this.consume('?')) return condition
      const truthy = this.parseConditional()
      this.expect('operator', ':')
      return {
        kind: 'conditional',
        condition,
        truthy,
        falsy: this.parseConditional(),
      }
    } finally {
      this.nestingDepth--
    }
  }
  /** 按优先级构造左结合二元表达式。 */
  private parseBinary(
    next: () => ExpressionNode,
    operators: readonly string[]
  ): ExpressionNode {
    let left = next()
    while (operators.includes(this.current().value)) {
      const operator = this.advance().value
      left = { kind: 'binary', operator, left, right: next() }
    }
    return left
  }
  /** 逻辑或。 */
  private parseOr(): ExpressionNode {
    return this.parseBinary(() => this.parseAnd(), ['OR'])
  }
  /** 逻辑与。 */
  private parseAnd(): ExpressionNode {
    return this.parseBinary(() => this.parseEquality(), ['AND'])
  }
  /** 相等比较。 */
  private parseEquality(): ExpressionNode {
    return this.parseBinary(() => this.parseComparison(), ['==', '!='])
  }
  /** 大小比较。 */
  private parseComparison(): ExpressionNode {
    return this.parseBinary(() => this.parseAdditive(), ['>', '>=', '<', '<='])
  }
  /** 加减法。 */
  private parseAdditive(): ExpressionNode {
    return this.parseBinary(() => this.parseMultiplicative(), ['+', '-'])
  }
  /** 乘除与余数。 */
  private parseMultiplicative(): ExpressionNode {
    return this.parseBinary(() => this.parseUnary(), ['*', '/', '%'])
  }
  /** 用迭代消费一元符号，避免连续 NOT 或负号造成调用栈溢出。 */
  private parseUnary(): ExpressionNode {
    const operators: string[] = []
    while (
      ['-', '+', 'NOT'].includes(this.current().value) &&
      !(
        this.current().value === 'NOT' &&
        this.tokens[this.cursor + 1]?.value === '('
      )
    ) {
      operators.push(this.advance().value)
      if (operators.length > MAX_NESTING_DEPTH)
        throw new Error(`一元运算不能超过 ${MAX_NESTING_DEPTH} 层`)
    }
    let value = this.parsePrimary()
    for (const operator of operators.reverse())
      value = { kind: 'unary', operator, value }
    return value
  }
  /** 字面值、引用、括号或函数。 */
  private parsePrimary(): ExpressionNode {
    const token = this.current()
    if (token.type === 'number' || token.type === 'string') {
      this.advance()
      return {
        kind: 'literal',
        value: token.type === 'number' ? Number(token.value) : token.value,
      }
    }
    if (token.type === 'variable') {
      this.advance()
      return { kind: 'variable', name: token.value }
    }
    if (
      token.type === 'identifier' ||
      (token.type === 'operator' && ['AND', 'OR', 'NOT'].includes(token.value))
    ) {
      this.advance()
      const name = token.value.toUpperCase()
      if (name === 'TRUE' || name === 'FALSE')
        return { kind: 'literal', value: name === 'TRUE' }
      if (this.consume('(')) return this.parseFunction(name, token)
      if (name === 'NOT')
        return { kind: 'unary', operator: 'NOT', value: this.parseUnary() }
      if (token.type === 'identifier')
        return { kind: 'identifier', name: token.value }
    }
    if (this.consume('(')) {
      const value = this.parseConditional()
      this.expect('punctuation', ')')
      return value
    }
    throw new Error(`第 ${token.position + 1} 个字符处缺少有效值`)
  }
  /** 函数只允许内置白名单，参数个数在语法阶段检查。 */
  private parseFunction(name: string, token: Token): ExpressionNode {
    if (!Object.prototype.hasOwnProperty.call(FUNCTIONS, name))
      throw new Error(
        `第 ${token.position + 1} 个字符处：未知函数“${token.value}”`
      )
    const args: ExpressionNode[] = []
    if (!this.consume(')')) {
      do {
        args.push(this.parseConditional())
      } while (this.consume(','))
      this.expect('punctuation', ')')
    }
    const [min, max] =
      name === 'IF'
        ? [3, 3]
        : name === 'ROUND'
          ? [1, 2]
          : ['AND', 'OR', 'SUM', 'AVG', 'MAX', 'MIN'].includes(name)
            ? [1, Infinity]
            : [1, 1]
    if (args.length < min || args.length > max)
      throw new Error(
        `第 ${token.position + 1} 个字符处：${name} 需要 ${min === max ? min : `${min}–${max === Infinity ? '多个' : max}`} 个参数`
      )
    return { kind: 'call', name, args }
  }
}

/** 验证存在且仅允许有限的基础类型数据，不读取原型链。 */
function readValue(
  name: string,
  values: Readonly<Record<string, Primitive>>
): Primitive {
  if (
    !Object.prototype.hasOwnProperty.call(values, name) ||
    values[name] == null
  )
    throw new Error(`变量“${name}”缺少样例数据`)
  const value = values[name]
  if (
    !['number', 'string', 'boolean'].includes(typeof value) ||
    (typeof value === 'number' && !Number.isFinite(value))
  )
    throw new Error(`变量“${name}”的数据类型不受支持`)
  return value
}

/** 普通二元运算；逻辑短路由语法树执行器处理。 */
function calculateBinary(
  operator: string,
  left: Primitive,
  right: Primitive
): Primitive {
  switch (operator) {
    case '==':
      return left === right
    case '!=':
      return left !== right
    case '+':
      return toNumber(left) + toNumber(right)
    case '-':
      return toNumber(left) - toNumber(right)
    case '*':
      return toNumber(left) * toNumber(right)
    case '/':
      return toNumber(left) / toNumber(right)
    case '%':
      return toNumber(left) % toNumber(right)
    default:
      if (typeof left === 'boolean' || typeof right === 'boolean')
        throw new Error(`运算符 ${operator} 不支持布尔值`)
      if (operator === '>') return left > right
      if (operator === '>=') return left >= right
      if (operator === '<') return left < right
      return left <= right
  }
}

/** 执行已解析的语法树；IF、三元、AND、OR 均采用真实短路语义。 */
function execute(
  node: ExpressionNode,
  fields: ReadonlyMap<string, string>,
  values: Readonly<Record<string, Primitive>>,
  depth = 0
): Primitive {
  if (depth > MAX_NESTING_DEPTH * 2) throw new Error('公式计算层数超过安全限制')
  const run = (child: ExpressionNode): Primitive =>
    execute(child, fields, values, depth + 1)
  switch (node.kind) {
    case 'literal':
      return node.value
    case 'variable': {
      const field = fields.get(node.name)
      if (!field) throw new Error(`未知变量“${node.name}”`)
      return readValue(field, values)
    }
    case 'identifier':
      return readValue(node.name, values)
    case 'conditional':
      return run(node.condition) ? run(node.truthy) : run(node.falsy)
    case 'unary': {
      const value = run(node.value)
      return node.operator === 'NOT'
        ? !value
        : node.operator === '-'
          ? -toNumber(value)
          : toNumber(value)
    }
    case 'binary': {
      const left = run(node.left)
      if (node.operator === 'AND')
        return Boolean(left) && Boolean(run(node.right))
      if (node.operator === 'OR')
        return Boolean(left) || Boolean(run(node.right))
      return calculateBinary(node.operator, left, run(node.right))
    }
    case 'call':
      if (node.name === 'IF')
        return run(node.args[0]) ? run(node.args[1]) : run(node.args[2])
      if (node.name === 'AND')
        return node.args.every(child => Boolean(run(child)))
      if (node.name === 'OR')
        return node.args.some(child => Boolean(run(child)))
      return FUNCTIONS[node.name](...node.args.map(run))
  }
}

/** 编译一次后可对多组试算值复用，不执行 JavaScript。 */
export function compileSafeExpression(expression: string) {
  const tokens = tokenize(expression)
  const node = new SafeExpressionParser(tokens).parse()
  return {
    tokens,
    evaluate(
      fields: ReadonlyMap<string, string>,
      values: Readonly<Record<string, Primitive>>
    ): Primitive {
      const result = execute(node, fields, values)
      if (typeof result === 'number' && !Number.isFinite(result))
        throw new Error('公式计算结果必须是有限数值')
      return result
    },
  }
}

/** 保持公开求值 API，语法校验与试算使用同一个编译器。 */
export function evaluateSafeExpression(
  expression: string,
  variableFields: ReadonlyMap<string, string>,
  values: Readonly<Record<string, Primitive>>
): Primitive {
  return compileSafeExpression(expression).evaluate(variableFields, values)
}

/** 高亮与引用分析复用相同词法器，字符串中的方括号不会被识别为变量。 */
export function tokenizeSafeExpression(expression: string): Token[] {
  return tokenize(expression)
}
