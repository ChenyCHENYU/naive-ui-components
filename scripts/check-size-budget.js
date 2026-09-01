import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')

const budgets = {
  'style.css': { min: 500 * 1024, max: 650 * 1024 },
  'C_Form.base.css': { min: 20 * 1024, max: 45 * 1024 },
  'C_Form.css': { min: 80 * 1024, max: 120 * 1024 },
  'C_Table.base.css': { min: 30 * 1024, max: 65 * 1024 },
  'C_Table.css': { min: 90 * 1024, max: 140 * 1024 },
}

const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const filename = path.join(directory, entry.name)
    return entry.isDirectory() ? walk(filename) : [filename]
  })

const failures = []
for (const [relativePath, { min, max }] of Object.entries(budgets)) {
  const filename = path.join(distDir, relativePath)
  if (!fs.existsSync(filename)) {
    failures.push(`${relativePath}: missing`)
    continue
  }
  const size = fs.statSync(filename).size
  if (size < min || size > max) {
    failures.push(
      `${relativePath}: ${(size / 1024).toFixed(1)} KB outside ${(min / 1024).toFixed(1)}-${(max / 1024).toFixed(1)} KB`
    )
  }
}

const files = walk(distDir)
const totalSize = files.reduce((sum, filename) => sum + fs.statSync(filename).size, 0)
const totalLimit = 4 * 1024 * 1024
if (totalSize > totalLimit) {
  failures.push(
    `dist total: ${(totalSize / 1024 / 1024).toFixed(2)} MB > ${(totalLimit / 1024 / 1024).toFixed(2)} MB`
  )
}

const sourceMaps = files.filter(filename => filename.endsWith('.map'))
if (sourceMaps.length > 0) {
  failures.push(`source maps must not be published: ${sourceMaps.length} found`)
}

if (failures.length > 0) {
  console.error(`Package size budget failed:\n${failures.join('\n')}`)
  process.exit(1)
}

console.log(
  `Package size budget passed: ${files.length} files, ${(totalSize / 1024 / 1024).toFixed(2)} MB.`
)
