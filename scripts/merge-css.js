/**
 * 合并 CSS：将所有 SFC scoped 样式 + 全局 SCSS 编译产物合并为 dist/style.css
 * 同时保留每个组件的独立 CSS 文件（去 hash 重命名），支持按需导入
 *
 * 构建流程：tsdown → sass CLI → merge-css.js
 *
 * 最终产物:
 *   dist/style.css          — 全量样式（一行导入全部）
 *   dist/C_Table.css         — 组件独立样式（按需导入）
 *   dist/C_Form.css          — ...
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { getRelativeCssAssets, LEAFLET_IMAGE_FILES } from "./leaflet-assets.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const componentsDir = path.resolve(__dirname, '../src/components')
const componentNames = fs
  .readdirSync(componentsDir, { withFileTypes: true })
  .filter(entry => entry.isDirectory() && entry.name.startsWith('C_'))
  .map(entry => entry.name)
  .sort()
const stableCssEntries = new Set(
  componentNames.flatMap(componentName => [
    `${componentName}.css`,
    `${componentName}.base.css`,
    `${componentName}.full.css`,
  ])
)

// 1. 收集 SFC scoped CSS。双格式产物内容相同，按组件名去重。
// 共享 chunk 偶尔以 composable 命名，必须显式归属到公共组件样式入口。
const cssChunkAliases = {
  useTableQuery: 'C_Table',
}
const originalCssFiles = fs
  .readdirSync(distDir)
  .filter(
    filename =>
      filename.endsWith('.css') &&
      filename !== 'global-scss.css' &&
      filename !== 'style.css' &&
      !stableCssEntries.has(filename)
  )
  .sort()
if (originalCssFiles.length === 0) {
  const intermediateGlobalStyle = path.join(distDir, 'global-scss.css')
  if (fs.existsSync(intermediateGlobalStyle)) {
    fs.unlinkSync(intermediateGlobalStyle)
  }
  console.log(
    'No fresh bundled CSS chunks found; kept the finalized dist entries unchanged.'
  )
  process.exit(0)
}
const getComponentName = filename => {
  const base = filename.replace(/-[^.]+\.css$/, '')
  if (base.startsWith('C_')) return base
  return cssChunkAliases[base]
}
const componentCssSources = new Map()
for (const filename of originalCssFiles) {
  const componentName = getComponentName(filename)
  if (!componentName || componentCssSources.has(componentName)) continue
  componentCssSources.set(
    componentName,
    fs.readFileSync(path.join(distDir, filename), 'utf8')
  )
}

const vendorStyles = {
  C_Captcha: ['vue3-puzzle-vcode/dist/main.css'],
  C_Code: ['highlight.js/styles/github.css'],
  C_Editor: ['@wangeditor-next/editor/dist/css/style.css'],
  C_Guide: ['driver.js/dist/driver.css'],
  C_Map: ['leaflet/dist/leaflet.css'],
  C_Markdown: ['md-editor-v3/lib/style.css'],
  C_VideoPlayer: ['xgplayer/dist/index.min.css'],
}
const fullStyleDependencies = {
  C_Form: ['C_Editor'],
  C_Table: ['C_Form'],
}
const baseStyleDependencies = {
  C_Table: ['C_Form'],
}
const readVendorStyle = packagePath => {
  const filename = path.resolve(__dirname, '../node_modules', packagePath)
  if (!fs.existsSync(filename)) {
    throw new Error(`Missing vendor style: ${packagePath}`)
  }
  return fs.readFileSync(filename, 'utf8')
}

const leafletImageDir = path.resolve(
  __dirname,
  '../node_modules/leaflet/dist/images'
)
const outputImageDir = path.join(distDir, 'images')
fs.mkdirSync(outputImageDir, { recursive: true })
const leafletCss = readVendorStyle('leaflet/dist/leaflet.css')
const untrackedLeafletAssets = getRelativeCssAssets(leafletCss)
  .filter(asset => asset.startsWith('images/'))
  .map(asset => path.basename(asset))
  .filter(filename => !LEAFLET_IMAGE_FILES.includes(filename))
if (untrackedLeafletAssets.length > 0) {
  throw new Error(
    `Untracked Leaflet assets: ${[...new Set(untrackedLeafletAssets)].join(', ')}`
  )
}
for (const filename of LEAFLET_IMAGE_FILES) {
  fs.copyFileSync(
    path.join(leafletImageDir, filename),
    path.join(outputImageDir, filename)
  )
}
const resolveComponentStyles = (
  componentName,
  dependencies = fullStyleDependencies,
  visited = new Set()
) => {
  if (visited.has(componentName)) return []
  visited.add(componentName)
  const parts = []
  for (const dependency of dependencies[componentName] || []) {
    parts.push(...resolveComponentStyles(dependency, dependencies, visited))
  }
  for (const vendorStyle of vendorStyles[componentName] || []) {
    parts.push(readVendorStyle(vendorStyle))
  }
  const ownStyle = componentCssSources.get(componentName)
  if (ownStyle) parts.push(ownStyle)
  return parts
}

// 2. 读取全局 SCSS 编译产物
const globalScssFile = path.join(distDir, "global-scss.css");
const globalScss = fs.existsSync(globalScssFile)
  ? fs.readFileSync(globalScssFile, "utf-8")
  : "";

// 3. 为所有公共组件生成稳定 CSS 入口；无样式组件生成空入口，保证 resolver 可用。
for (const componentName of componentNames) {
  const content = resolveComponentStyles(componentName).join('\n')
  fs.writeFileSync(
    path.join(distDir, `${componentName}.css`),
    content || `/* ${componentName} has no component-specific styles. */\n`
  )
}

// Form and Table historically bundle transitive editor styles. Keep that
// compatible entry, while exposing a smaller opt-in entry for consumers that
// render custom fields/editors and already own those styles.
for (const componentName of ['C_Form', 'C_Table']) {
  const baseContent = resolveComponentStyles(
    componentName,
    baseStyleDependencies
  ).join('\n')
  fs.writeFileSync(path.join(distDir, `${componentName}.base.css`), baseContent)
  const staleFullEntry = path.join(distDir, `${componentName}.full.css`)
  if (fs.existsSync(staleFullEntry)) fs.unlinkSync(staleFullEntry)
}

// 4. 合并全量：全局变量/样式在前，SFC scoped 在后
const parts = [];
if (globalScss) {
  parts.push(`/* ========== Global SCSS Styles ========== */`);
  parts.push(globalScss);
}
const globalVendorStyles = [...new Set(Object.values(vendorStyles).flat())]
if (globalVendorStyles.length > 0) {
  parts.push(`\n/* ========== Vendor Component Styles ========== */`)
  globalVendorStyles.forEach(vendorStyle => {
    parts.push(readVendorStyle(vendorStyle))
  })
}
if (componentCssSources.size > 0) {
  parts.push(`\n/* ========== SFC Scoped Styles ========== */`);
  for (const [componentName, content] of componentCssSources) {
    parts.push(`\n/* --- ${componentName} --- */`);
    parts.push(content);
  }
}

const merged = parts.join("\n");
const outFile = path.join(distDir, "style.css");
fs.writeFileSync(outFile, merged);

// 5. 清理中间的 hash 文件（保留无 hash 的独立 CSS 和全量 style.css）
fs.unlinkSync(globalScssFile);
for (const filename of originalCssFiles) {
  const file = path.join(distDir, filename)
  if (fs.existsSync(file)) fs.unlinkSync(file)
}

const sizeKB = (Buffer.byteLength(merged) / 1024).toFixed(1);
console.log(
  `✅ Merged ${componentCssSources.size} SFC CSS + vendor/global styles → dist/style.css (${sizeKB} KB)`,
);
console.log(
  `✅ Generated ${componentNames.length} stable component CSS entries for on-demand import`
)
