import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

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

const source = files.map(filename => fs.readFileSync(filename, 'utf8')).join('\n')
const count = pattern => source.match(pattern)?.length ?? 0
const unsafeAnyCount = count(/\bany\b/g)
const consoleCallCount = count(/console\.(?:log|warn|error|debug)\s*\(/g)
const failures = []

if (unsafeAnyCount > 273) {
  failures.push(`unsafe any baseline increased: ${unsafeAnyCount} > 273`)
}
if (consoleCallCount > 24) {
  failures.push(`console side-effect baseline increased: ${consoleCallCount} > 24`)
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
  `Source quality budget passed: ${unsafeAnyCount} any references, ${consoleCallCount} console calls, no suppressions or dynamic evaluation.`
)
