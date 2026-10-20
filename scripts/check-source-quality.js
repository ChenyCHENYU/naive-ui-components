import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceRoot = path.join(root, 'src')
const files = []

const collect = directory => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name)
    if (entry.isDirectory()) collect(filename)
    else if (/\.(?:ts|vue)$/.test(entry.name)) files.push(filename)
  }
}
collect(sourceRoot)

const source = files
  .map(filename => fs.readFileSync(filename, 'utf8'))
  .join('\n')
const count = pattern => source.match(pattern)?.length ?? 0
// 使用语法树只统计显式 any 类型，避免把注释和字符串中的 any 计入预算。
const componentCounts = new Map()
let unsafeAnyCount = 0
for (const filename of files) {
  let code = fs.readFileSync(filename, 'utf8')
  if (filename.endsWith('.vue')) {
    const { descriptor } = parse(code, { filename })
    code = [descriptor.script?.content, descriptor.scriptSetup?.content]
      .filter(Boolean)
      .join('\n')
  }
  const ast = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS
  )
  const component = path.relative(sourceRoot, filename).split(path.sep)[1]
  const visit = node => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) {
      unsafeAnyCount++
      componentCounts.set(component, (componentCounts.get(component) ?? 0) + 1)
    }
    ts.forEachChild(node, visit)
  }
  visit(ast)
}
const consoleCallCount = count(/console\.(?:log|warn|error|debug)\s*\(/g)
const failures = []

if (unsafeAnyCount > 157) {
  failures.push(`unsafe any baseline increased: ${unsafeAnyCount} > 157`)
}
if (consoleCallCount > 15) {
  failures.push(
    `console side-effect baseline increased: ${consoleCallCount} > 15`
  )
}
for (const [component, budget] of Object.entries({
  C_Table: 34,
  C_Form: 13,
  C_AntV: 34,
  C_WorkFlow: 12,
})) {
  const actual = componentCounts.get(component) ?? 0
  if (actual > budget)
    failures.push(`${component} any baseline increased: ${actual} > ${budget}`)
}
if (/@ts-(?:ignore|nocheck)/.test(source)) {
  failures.push('TypeScript suppression comments are not allowed')
}
if (/\beval\s*\(|new\s+Function\s*\(/.test(source)) {
  failures.push('Dynamic JavaScript evaluation is not allowed')
}

if (failures.length > 0) {
  console.error(`Source quality budget failed:\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(
  `Source quality budget passed: ${unsafeAnyCount} explicit any types, ${consoleCallCount} console calls, no suppressions or dynamic evaluation.`
)
