import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { readPublishedStyle } from './build/published-style.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const distDir = path.join(root, 'dist')

const budgets = {
  // 组件自身的 scoped 工具类与图标随包发布，免除宿主生成约束。
  // 0.14 的两个完整编辑工作区增加约 20 KB；预算仍约束全部组件及供应商样式。
  // 0.21.1 恢复先前丢失的 Markdown 六套主题，增加约 55 KiB。
  // 0.32 的独立建议输入和选择面板状态增加少量样式，保留约 5 KiB 余量。
  // 0.36 补齐并隔离流程 SDK 必需的定位样式，增加约 5.3 KiB。
  // 0.37 公共变量优先/私有主题兜底的显式 CSS 增加约 26 KiB。
  'style.css': { min: 430 * 1024, max: 688 * 1024 },
  'C_Form.base.css': { min: 20 * 1024, max: 45 * 1024 },
  'C_Form.css': { min: 80 * 1024, max: 120 * 1024 },
  // 0.40 的 inline 模式字面量产生两条 scoped 工具类，闭包实增 84 B；保留 1 KiB 有界余量。
  'C_Table.base.css': { min: 30 * 1024, max: 67 * 1024 },
  'C_Table.css': { min: 90 * 1024, max: 148 * 1024 },
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
  // 单组件约束完整可用 CSS 闭包；总包预算下方仍按原口径计入每份物理文件。
  const size = Buffer.byteLength(readPublishedStyle(distDir, relativePath))
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
// 0.31.4 的交互修复与 Node 20 入口兼容使双格式产物增加约 3 KiB。
// 0.32 新增远程候选、建议输入与实体选择工作流及声明约 91 KiB，新增限额 100 KiB。
// 0.33 的树路径/字段设置/分组编辑增加约 75 KiB 双格式运行时与声明；只调整物理产物总量。
// 0.34 的节点状态和组织图增加约 22 KiB 双格式产物；消耗既有余量后追加 16 KiB。
// 0.36 人员选择、端口/分支校验、声明和流程基础 CSS 共约 96.1 KiB，追加 100 KiB。
// 每个公开入口的首屏/按需加载预算保持不变，由 check:consumer-size 独立约束。
// 0.37 相对官方 0.36.0 增加约 118.7 KiB（CSS 约 69.2 KiB）；消耗既有余量并追加 116 KiB。
// 0.37.2 缩列展示、右区投影和偏好范围隔离相对官方 0.37.1 净增 8416 B；
// 消耗原余量 554 B 后追加 8 KiB。表格基础样式闭包仅增加 424 B，限额追加 1 KiB；
// 首屏/按需 gzip、懒加载和性能限额保持不变。
// 0.38 扁平色板配置、原生映射与遗漏区域的语义样式相对官方 0.37.2 增加约 11.8 KiB；
// 仅为双格式物理产物追加 16 KiB，原有 CSS 闭包及首屏/按需加载限额保持不变。
// 0.40 常显录入、会话保护、按需候选渲染和菜单边界相对官方 0.39.0 增加 8625 B；
// 消耗既有余量后，为 ESM/CJS、声明与物理 CSS 追加 8 KiB。首屏/首开预算保持不变。
// 0.40.2 为异步选项所有权修复与默认文案国际化追加 3 KiB 物理产物空间；
// 最终测量超出旧总量 2064 B，组件首屏/首开及 CSS 限额均保持原值。
// 0.40.3 的请求/日历会话保护、键盘边界和上传局部文案追加 6 KiB 双格式空间；
// 组件首屏/首开与 CSS 限额保持不变，上传文案不进入无关入口。
const totalLimit = 4 * 1024 * 1024 + 681 * 1024
if (totalSize - sheetJsSize > totalLimit) {
  failures.push(
    `dist excluding reviewed SheetJS: ${totalSize - sheetJsSize} bytes > ${totalLimit} bytes`
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
