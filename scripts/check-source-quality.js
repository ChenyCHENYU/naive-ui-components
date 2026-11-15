import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { countExplicitAny } from './source-quality-metrics.js'

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
// 脚本与模板表达式都纳入类型预算；注释、字符串和静态 HTML 不计入。
const componentCounts = new Map()
let unsafeAnyCount = 0
for (const filename of files) {
  const actual = countExplicitAny(fs.readFileSync(filename, 'utf8'), filename)
  const component = path.relative(sourceRoot, filename).split(path.sep)[1]
  unsafeAnyCount += actual
  componentCounts.set(component, (componentCounts.get(component) ?? 0) + actual)
}
const consoleCallCount = count(/console\.(?:log|warn|error|debug)\s*\(/g)
const failures = []

if (unsafeAnyCount > 102) {
  failures.push(`unsafe any baseline increased: ${unsafeAnyCount} > 102`)
}
if (consoleCallCount > 14) {
  failures.push(
    `console side-effect baseline increased: ${consoleCallCount} > 14`
  )
}
for (const [component, budget] of Object.entries({
  // 基线包含模板断言；收紧到当前实际值，保留第三方边界而不留回涨余量。
  C_Table: 15,
  C_Form: 13,
  C_AntV: 34,
  C_WorkFlow: 0,
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
