/**
 * 构建后校验公共 JS / DTS 入口，防止内部同名入口覆盖 package.json 指向的根声明。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const rootTypes = fs.readFileSync(
  path.join(root, packageJson.types.replace('./', '')),
  'utf8'
)
const distDir = path.join(root, 'dist')
const componentNames = fs
  .readdirSync(path.join(root, 'src', 'components'), { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('C_'))
  .map(entry => entry.name)
  .sort()

const requiredRootExports = [
  ...componentNames,
  'CascadeItem',
  'CaptchaVerifier',
  'verifyCaptchaProof',
  'createMenuOptions',
  'FieldPath',
  'TableInstance',
  'useCForm',
  'useTableQuery',
  'validateTableRowKeys',
]
const missingExports = requiredRootExports.filter(
  exportName => !rootTypes.includes(exportName)
)

if (missingExports.length > 0) {
  console.error(`❌ 根声明入口缺少导出: ${missingExports.join(', ')}`)
  process.exit(1)
}

const missingEntries = componentNames.flatMap(name =>
  ['js', 'cjs', 'css', 'd.ts', 'd.cts']
    .map(extension => path.join(distDir, `${name}.${extension}`))
    .filter(file => !fs.existsSync(file))
)
for (const asset of [
  'C_Form.base.css',
  'C_Table.base.css',
]) {
  const filename = path.join(distDir, asset)
  if (!fs.existsSync(filename)) missingEntries.push(filename)
}
for (const asset of [
  'images/marker-icon-2x.png',
  'images/marker-icon.png',
  'images/marker-shadow.png',
]) {
  const filename = path.join(distDir, asset)
  if (!fs.existsSync(filename)) missingEntries.push(filename)
}
if (missingEntries.length > 0) {
  console.error(`❌ 组件产物入口缺失:\n${missingEntries.join('\n')}`)
  process.exit(1)
}

for (const name of componentNames) {
  const declaration = fs.readFileSync(path.join(distDir, `${name}.d.ts`), 'utf8')
  if (!declaration.includes(name)) {
    console.error(`❌ ${name} 子路径声明未导出同名组件`)
    process.exit(1)
  }
  if (declaration.includes('naive-ui/es')) {
    console.error(`Published declaration ${name}.d.ts uses a Naive UI internal path`)
    process.exit(1)
  }
}

if (Object.keys(packageJson.exports).some(key => key.startsWith('./_'))) {
  console.error('❌ 内部下划线入口不应出现在 package exports 中')
  process.exit(1)
}
if (
  ['js', 'cjs', 'd.ts', 'd.cts'].some(extension =>
    fs.existsSync(path.join(distDir, `_shared.${extension}`))
  )
) {
  console.error('❌ Internal _shared modules must not be emitted as package entries')
  process.exit(1)
}

const require = createRequire(import.meta.url)
// Use leaf components for Node runtime smoke tests. Browser-only editor CSS is
// intentionally validated by the bundler build, not imported by plain Node.
const esmDate = await import(pathToFileURL(path.join(distDir, 'C_Date.js')).href)
const esmForm = await import(pathToFileURL(path.join(distDir, 'C_Form.js')).href)
const esmEditor = await import(
  pathToFileURL(path.join(distDir, 'C_Editor.js')).href
)
const esmCaptcha = await import(
  pathToFileURL(path.join(distDir, 'C_Captcha.js')).href
)
const cjsTime = require(path.join(distDir, 'C_Time.cjs'))
const cjsTable = require(path.join(distDir, 'C_Table.cjs'))
const cjsMarkdown = require(path.join(distDir, 'C_Markdown.cjs'))
const esmRoot = await import(pathToFileURL(path.join(distDir, 'index.js')).href)
const cjsRoot = require(path.join(distDir, 'index.cjs'))
if (
  !esmDate.C_Date ||
  !esmForm.C_Form ||
  !esmEditor.C_Editor ||
  !esmCaptcha.C_Captcha ||
  !cjsTime.C_Time ||
  !cjsTable.C_Table ||
  !cjsMarkdown.C_Markdown ||
  !esmRoot.C_Table ||
  !esmRoot.C_Form ||
  !cjsRoot.C_Table ||
  !cjsRoot.C_Form
) {
  console.error('❌ ESM/CJS 消费冒烟测试失败')
  process.exit(1)
}

const captchaHtml = await renderToString(
  createSSRApp({ render: () => h(esmCaptcha.C_Captcha) })
)
if (
  !captchaHtml.includes('<button') ||
  !captchaHtml.includes('aria-label=') ||
  captchaHtml.includes('vue3-puzzle-vcode')
) {
  console.error('❌ Captcha SSR/accessibility consumer smoke test failed')
  process.exit(1)
}

console.log(`✅ ${componentNames.length} component JS / CJS / DTS entries are valid.`)
