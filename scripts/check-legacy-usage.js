import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const packageName = '@robot-admin/naive-ui-components'
const components = ['C_Date', 'C_FormSearch', 'C_Menu']
const normalize = name => name.replace(/[-_]/g, '').toLowerCase()
const dateModes = {
  singleDate: 'date',
  singleDateTime: 'datetime',
  dateRange: 'daterange',
  dateTimeRange: 'datetimerange',
  smartRange: 'smart-range',
}
const legacyExports = {
  registerRenderer:
    'createFormRendererRegistry().register；由应用 provide 或 formRenderers 持有 registry',
  unregisterRenderer: '同一应用 registry.unregister 或 register 返回的注销函数',
  TableEditProps: 'TableConfig<Row>["edit"]；组件通过 config.edit 配置',
  TableExpandProps:
    'TableConfig<Row, Child>["expand"]；组件通过 config.expand 配置',
  TableSelectionProps:
    'TableConfig<Row, Child>["selection"]；组件通过 config.selection 配置',
}
const componentName = name =>
  components.find(item => normalize(item) === normalize(name))
const isPackage = name =>
  name === packageName ||
  components
    .concat('C_Form', 'C_Table')
    .some(item => name === `${packageName}/${item}`)

const migration = (component, rawName) => {
  const name = normalize(rawName.replace(/^(?:onUpdate:|update:)/, ''))
  if (component === 'C_Date') {
    const legacy = Object.keys(dateModes).find(key => normalize(key) === name)
    if (legacy)
      return `v-model / modelValue + mode="${dateModes[legacy]}"；更新事件使用 update:modelValue`
  }
  if (component === 'C_FormSearch' && name === 'formparams')
    return 'v-model / modelValue；单向输入仍可只传 :model-value'
  if (component === 'C_Menu' && name === 'value')
    return 'v-model / modelValue；更新事件使用 update:modelValue'
}

const staticName = node => {
  if (!node) return undefined
  if (ts.isIdentifier(node) || ts.isStringLiteralLike(node)) return node.text
  if (ts.isComputedPropertyName(node))
    return ts.isStringLiteralLike(node.expression)
      ? node.expression.text
      : undefined
}

const unwrap = node => {
  while (
    node &&
    (ts.isParenthesizedExpression(node) ||
      ts.isAsExpression(node) ||
      ts.isSatisfiesExpression(node) ||
      ts.isNonNullExpression(node))
  )
    node = node.expression
  return node
}

const scopedTemplateNames = expression => {
  const parsed = ts.createSourceFile(
    'scope.ts',
    `(${expression}) => {}`,
    ts.ScriptTarget.Latest,
    true
  )
  const names = []
  const collect = node => {
    if (ts.isIdentifier(node)) names.push(normalize(node.text))
    else if (ts.isBindingElement(node)) collect(node.name)
    else if (ts.isObjectBindingPattern(node) || ts.isArrayBindingPattern(node))
      node.elements.forEach(collect)
  }
  const arrow = parsed.statements[0]?.expression
  if (arrow && ts.isArrowFunction(arrow))
    arrow.parameters.forEach(parameter => collect(parameter.name))
  return names
}

// 单文件绑定器仅用于区分 import 与同名局部变量；不加载或执行被检查项目。
const scriptContext = (code, filename) => {
  const source = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    /[jt]sx$/.test(filename) ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  const host = {
    getSourceFile: name => (name === filename ? source : undefined),
    getDefaultLibFileName: () => '',
    writeFile() {},
    getCurrentDirectory: () => '',
    getDirectories: () => [],
    fileExists: name => name === filename,
    readFile: name => (name === filename ? code : undefined),
    getCanonicalFileName: name => name,
    useCaseSensitiveFileNames: () => true,
    getNewLine: () => '\n',
  }
  const program = ts.createProgram(
    [filename],
    { noResolve: true, noLib: true },
    host
  )
  const checker = program.getTypeChecker()
  const imports = new Map()
  const names = new Map()
  for (const statement of source.statements) {
    if (!ts.isImportDeclaration(statement) || !statement.importClause) continue
    const module = statement.moduleSpecifier.text
    const clause = statement.importClause
    const add = (local, exported, typeOnly = false) => {
      const binding = { module, exported, typeOnly }
      imports.set(checker.getSymbolAtLocation(local), binding)
      names.set(normalize(local.text), binding)
    }
    if (clause.name) add(clause.name, 'default', clause.isTypeOnly)
    if (clause.namedBindings && ts.isNamespaceImport(clause.namedBindings))
      add(clause.namedBindings.name, '*', clause.isTypeOnly)
    if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
      for (const item of clause.namedBindings.elements)
        add(
          item.name,
          (item.propertyName ?? item.name).text,
          clause.isTypeOnly || item.isTypeOnly
        )
    }
  }
  const binding = node => {
    node = unwrap(node)
    if (ts.isIdentifier(node))
      return imports.get(checker.getSymbolAtLocation(node))
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node)
    ) {
      const parent = binding(node.expression)
      if (parent?.exported === '*')
        return {
          ...parent,
          exported: ts.isPropertyAccessExpression(node)
            ? node.name.text
            : staticName(node.argumentExpression),
        }
    }
  }
  return { source, checker, names, binding }
}

/** 只检查可静态确定的入口；动态项单列，绝不修改消费源码。 */
export function auditLegacySource(source, filename, options = {}) {
  const result = { findings: [], unverified: [], errors: [] }
  const position = offset => {
    const before = source.slice(0, offset).split('\n')
    return {
      file: filename,
      line: before.length,
      column: before.at(-1).length + 1,
    }
  }
  const add = (list, offset, details) =>
    result[list].push({ ...position(offset), ...details })
  const unknown = (offset, message) => add('unverified', offset, { message })
  const checkProp = (component, name, offset) => {
    const replacement = migration(component, name)
    if (replacement)
      add('findings', offset, {
        rule: 'legacy-prop',
        component,
        legacy: name,
        replacement,
      })
  }
  let code = source
  let template
  let scriptFilename = filename
  if (filename.endsWith('.vue')) {
    const parsed = parse(source, { filename })
    for (const error of parsed.errors)
      add('errors', error.loc?.start?.offset ?? 0, {
        message: String(error.message ?? error),
      })
    const blocks = [
      parsed.descriptor.script,
      parsed.descriptor.scriptSetup,
    ].filter(Boolean)
    code = source.replace(/[^\r\n]/g, ' ')
    for (const block of blocks) {
      if (block.src)
        unknown(
          block.loc.start.offset,
          '外部 script src 未解析；请同时检查其源文件'
        )
      code =
        code.slice(0, block.loc.start.offset) +
        block.content +
        code.slice(block.loc.end.offset)
    }
    scriptFilename = `${filename}.${blocks.some(block => block.lang === 'tsx' || block.lang === 'jsx') ? 'tsx' : 'ts'}`
    template = parsed.descriptor.template
    if (template?.lang && template.lang !== 'html')
      unknown(template.loc.start.offset, '非 HTML 模板需要人工检查')
  }
  const context = scriptContext(code, scriptFilename)
  const { source: script, binding, checker, names } = context
  for (const error of script.parseDiagnostics)
    add('errors', error.start ?? 0, {
      message: ts.flattenDiagnosticMessageText(error.messageText, '\n'),
    })
  const exported = node => {
    const entry = binding(node)
    if (entry && isPackage(entry.module) && !entry.typeOnly)
      return entry.exported
    if (
      options.globalComponents &&
      ts.isIdentifier(node) &&
      !checker.getSymbolAtLocation(node)
    )
      return componentName(node.text)
  }
  const checkExport = (name, offset) => {
    if (Object.hasOwn(legacyExports, name))
      add('findings', offset, {
        rule: 'legacy-export',
        legacy: name,
        replacement: legacyExports[name],
      })
  }
  const checkObject = (component, expression, offsetOf) => {
    expression = unwrap(expression)
    if (!expression || expression.kind === ts.SyntaxKind.NullKeyword) return
    if (!ts.isObjectLiteralExpression(expression))
      return unknown(offsetOf(expression), `${component} 的动态 props 未解析`)
    for (const property of expression.properties) {
      const name = staticName(property.name)
      if (name) checkProp(component, name, offsetOf(property))
      else unknown(offsetOf(property), `${component} 的展开或计算属性未解析`)
    }
  }
  const isRender = node => {
    const entry = binding(node)
    if (
      entry?.module === 'vue' &&
      ['h', 'createVNode'].includes(entry.exported)
    )
      return true
    return (
      options.globalComponents &&
      ts.isIdentifier(node) &&
      node.text === 'h' &&
      !checker.getSymbolAtLocation(node)
    )
  }
  const visit = node => {
    if (ts.isImportSpecifier(node)) {
      const entry = binding(node.name)
      if (entry && isPackage(entry.module))
        checkExport(entry.exported, node.getStart(script))
    }
    if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      isPackage(node.moduleSpecifier.text) &&
      node.exportClause &&
      ts.isNamedExports(node.exportClause)
    ) {
      for (const item of node.exportClause.elements)
        checkExport(
          (item.propertyName ?? item.name).text,
          item.getStart(script)
        )
    }
    if (
      ts.isPropertyAccessExpression(node) ||
      ts.isElementAccessExpression(node) ||
      ts.isQualifiedName(node)
    ) {
      const entry = ts.isQualifiedName(node)
        ? binding(node.left)
        : binding(node)
      if (entry && isPackage(entry.module))
        checkExport(
          ts.isQualifiedName(node) && entry.exported === '*'
            ? node.right.text
            : entry.exported,
          node.getStart(script)
        )
    }
    if (
      ts.isCallExpression(node) &&
      isRender(node.expression) &&
      node.arguments[0]
    ) {
      const component = exported(node.arguments[0])
      if (components.includes(component))
        checkObject(component, node.arguments[1], prop => prop.getStart(script))
    }
    if (
      ts.isCallExpression(node) &&
      [ts.SyntaxKind.ImportKeyword, ts.SyntaxKind.Identifier].includes(
        node.expression.kind
      )
    ) {
      const name = node.expression.getText(script)
      const module = node.arguments[0]
      if (
        ['import', 'require'].includes(name) &&
        module &&
        ts.isStringLiteralLike(module) &&
        isPackage(module.text)
      )
        unknown(
          node.getStart(script),
          '动态 import / require 的组件库绑定未解析'
        )
    }
    if (ts.isJsxSelfClosingElement(node) || ts.isJsxOpeningElement(node)) {
      const component = exported(node.tagName)
      if (components.includes(component)) {
        for (const prop of node.attributes.properties) {
          if (ts.isJsxAttribute(prop))
            checkProp(
              component,
              prop.name.getText(script),
              prop.getStart(script)
            )
          else
            checkObject(component, prop.expression, item =>
              item.getStart(script)
            )
        }
      }
    }
    ts.forEachChild(node, visit)
  }
  visit(script)
  const templateComponent = tag => {
    const [local, member] = tag.split('.')
    const entry = names.get(normalize(local))
    if (entry)
      return isPackage(entry.module) && !entry.typeOnly
        ? entry.exported === '*'
          ? member
          : entry.exported
        : undefined
    // 本地声明优先于显式启用的自动导入组件名。
    const declared = checker
      .getSymbolsInScope(script, ts.SymbolFlags.Value | ts.SymbolFlags.Alias)
      .some(symbol => normalize(symbol.name) === normalize(local))
    return options.globalComponents && !declared && !member
      ? componentName(tag)
      : undefined
  }
  const visitTemplate = (node, inherited = []) => {
    if (!node) return
    let scoped = inherited
    if (node.type === 1) {
      const loop = node.props.find(
        prop => prop.type === 7 && prop.name === 'for'
      )?.forParseResult
      if (loop)
        scoped = [
          ...scoped,
          ...['value', 'key', 'index'].flatMap(key =>
            scopedTemplateNames(loop[key]?.content ?? '')
          ),
        ]
      const shadowed = scoped.includes(normalize(node.tag.split('.')[0]))
      const component = shadowed ? undefined : templateComponent(node.tag)
      if (shadowed && templateComponent(node.tag))
        unknown(
          node.loc.start.offset,
          '组件名来自 v-for / slot 局部绑定，未按组件库入口判断'
        )
      if (components.includes(component))
        for (const prop of node.props) {
          if (prop.type === 6)
            checkProp(component, prop.name, prop.loc.start.offset)
          if (prop.type !== 7 || !['bind', 'model', 'on'].includes(prop.name))
            continue
          if (
            prop.arg?.isStatic &&
            (prop.name !== 'on' || prop.arg.content.startsWith('update:'))
          )
            checkProp(component, prop.arg.content, prop.loc.start.offset)
          else if (
            (prop.arg && !prop.arg.isStatic) ||
            (prop.name === 'on' && !prop.arg)
          )
            unknown(
              prop.loc.start.offset,
              `${component} 的动态属性或事件未解析`
            )
          else if (prop.name === 'bind' && prop.exp) {
            const expression = ts.createSourceFile(
              'props.ts',
              `(${prop.exp.content})`,
              ts.ScriptTarget.Latest,
              true
            )
            for (const error of expression.parseDiagnostics)
              add(
                'errors',
                prop.exp.loc.start.offset + Math.max(0, (error.start ?? 1) - 1),
                {
                  message: ts.flattenDiagnosticMessageText(
                    error.messageText,
                    '\n'
                  ),
                }
              )
            checkObject(
              component,
              expression.statements[0]?.expression,
              item =>
                prop.exp.loc.start.offset +
                Math.max(0, item.getStart(expression) - 1)
            )
          }
        }
      if (node.tag === 'component')
        unknown(node.loc.start.offset, '动态 component :is 未解析')
      const slot = node.props.find(
        prop => prop.type === 7 && prop.name === 'slot'
      )
      if (slot?.exp)
        scoped = [...scoped, ...scopedTemplateNames(slot.exp.content)]
    }
    for (const child of node.children ?? []) visitTemplate(child, scoped)
  }
  if (template && (!template.lang || template.lang === 'html'))
    visitTemplate(template.ast)
  return result
}

const excluded = new Set([
  'node_modules',
  'dist',
  'dist-ssr',
  'coverage',
  '.git',
  '.output',
  '.nuxt',
])
const sourceFile = name =>
  /\.(?:vue|[cm]?[jt]sx?)$/.test(name) && !/\.d\.[cm]?ts$/.test(name)

/** 遍历指定源码目录，不追踪符号链接或扫描构建产物。 */
export function auditLegacyDirectory(target, options = {}) {
  const files = []
  const collect = entry => {
    const stat = fs.lstatSync(entry)
    if (stat.isSymbolicLink())
      throw new Error(`检查入口不能是符号链接：${entry}`)
    if (!stat.isDirectory()) {
      if (sourceFile(entry)) files.push(entry)
      return
    }
    for (const child of fs.readdirSync(entry, { withFileTypes: true })) {
      if (!child.isSymbolicLink() && !excluded.has(child.name))
        collect(path.join(entry, child.name))
    }
  }
  collect(path.resolve(target))
  if (!files.length) throw new Error(`没有找到可检查的源码：${target}`)
  const report = {
    files: files.length,
    findings: [],
    unverified: [],
    errors: [],
  }
  for (const file of files.sort()) {
    const result = auditLegacySource(
      fs.readFileSync(file, 'utf8'),
      file,
      options
    )
    for (const kind of ['findings', 'unverified', 'errors'])
      report[kind].push(...result[kind])
  }
  return report
}

/** 默认只报告；strict 仅阻断已确认的旧 API，解析错误始终失败。 */
export function runLegacyAudit(args) {
  const flags = new Set(args.filter(arg => arg.startsWith('--')))
  const targets = args.filter(arg => !arg.startsWith('--'))
  if (
    targets.length !== 1 ||
    [...flags].some(
      flag => !['--strict', '--json', '--global-components'].includes(flag)
    )
  )
    throw new Error(
      '用法：bun scripts/check-legacy-usage.js <源码路径> [--global-components] [--strict] [--json]'
    )
  const report = auditLegacyDirectory(targets[0], {
    globalComponents: flags.has('--global-components'),
  })
  if (flags.has('--json')) console.log(JSON.stringify(report, null, 2))
  else {
    for (const kind of ['findings', 'unverified', 'errors'])
      for (const item of report[kind])
        console.log(
          `${item.file}:${item.line}:${item.column} [${kind}] ${item.legacy ? `${item.component ?? 'export'}.${item.legacy} → ${item.replacement}` : item.message}`
        )
    console.log(
      `检查 ${report.files} 个文件；旧 API ${report.findings.length} 项；未静态验证 ${report.unverified.length} 项；解析错误 ${report.errors.length} 项。未解析的包装/转导出模块与运行时配置需人工核对。`
    )
  }
  return report.errors.length
    ? 2
    : flags.has('--strict') && report.findings.length
      ? 1
      : 0
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  try {
    process.exitCode = runLegacyAudit(process.argv.slice(2))
  } catch (error) {
    console.error(error.message)
    process.exitCode = 2
  }
}
