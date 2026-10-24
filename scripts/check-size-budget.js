import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')

const budgets = {
  // 组件自身的 scoped 工具类与图标随包发布，免除宿主生成约束。
  // 0.14 的两个完整编辑工作区增加约 20 KB；预算仍约束全部组件及供应商样式。
  // 0.21.1 恢复先前丢失的 Markdown 六套主题，增加约 55 KiB。
  'style.css': { min: 430 * 1024, max: 640 * 1024 },
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
// SheetJS 从外部 CDN 依赖改为随包分发；单列原版运行时，主库预算保持不变。
const sheetJsFiles = files.filter(filename =>
  /^xlsx\d*\.(?:js|cjs)$/.test(path.basename(filename))
)
const sheetJsSize = sheetJsFiles.reduce(
  (sum, filename) => sum + fs.statSync(filename).size,
  0
)
if (sheetJsFiles.length !== 2 || sheetJsSize > 1024 * 1024) {
  failures.push(
    `SheetJS chunks: expected ESM/CJS within 1 MiB, found ${sheetJsFiles.length} files / ${sheetJsSize} bytes`
  )
}
const totalSize = files.reduce(
  (sum, filename) => sum + fs.statSync(filename).size,
  0
)
// 0.20 目录面包屑与 0.21 双格式状态保护/文案/配置入口各保留 48 KiB；
// 独立入口仍受单独的首屏 gzip 预算约束，不能用总预算掩盖懒加载回退。
// 两个发布 CSS 入口恢复约 109 KiB 主题样式，另留序列化保护代码的有限空间。
const totalLimit = 4 * 1024 * 1024 + 224 * 1024
if (totalSize - sheetJsSize > totalLimit) {
  failures.push(
    `dist excluding reviewed SheetJS: ${((totalSize - sheetJsSize) / 1024 / 1024).toFixed(2)} MB > ${(totalLimit / 1024 / 1024).toFixed(2)} MB`
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
