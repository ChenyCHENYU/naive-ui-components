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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

// 1. 收集 SFC scoped CSS（tsdown 产出的 C_*.css 文件）
// 注意：esm 和 cjs 格式各产出一份 CSS（内容相同，hash不同），需去重只取一份
const allCssFiles = fs
  .readdirSync(distDir)
  .filter(f => f.startsWith('C_') && f.endsWith('.css'))
  .sort()

// 按组件名去重：提取 "C_ActionBar" 部分，每个组件只取第一个
const seen = new Set()
const sfcCssFiles = allCssFiles
  .filter(f => {
    const compName = f.replace(/-[^.]+\.css$/, '')
    if (seen.has(compName)) return false
    seen.add(compName)
    return true
  })
  .map(f => path.join(distDir, f))

// 2. 读取全局 SCSS 编译产物
const globalScssFile = path.join(distDir, "global-scss.css");
const globalScss = fs.existsSync(globalScssFile)
  ? fs.readFileSync(globalScssFile, "utf-8")
  : "";

// 3. 保留每个组件的独立 CSS（去 hash 重命名为 C_Table.css 等）
for (const file of sfcCssFiles) {
  const basename = path.basename(file); // C_Table-tbUx-R4H.css
  const compName = basename.replace(/-[^.]+\.css$/, ".css"); // C_Table.css
  const destFile = path.join(distDir, compName);
  fs.copyFileSync(file, destFile);
}

// 4. 合并全量：全局变量/样式在前，SFC scoped 在后
const parts = [];
if (globalScss) {
  parts.push(`/* ========== Global SCSS Styles ========== */`);
  parts.push(globalScss);
}
if (sfcCssFiles.length > 0) {
  parts.push(`\n/* ========== SFC Scoped Styles ========== */`);
  for (const file of sfcCssFiles) {
    const name = path.basename(file);
    parts.push(`\n/* --- ${name} --- */`);
    parts.push(fs.readFileSync(file, "utf-8"));
  }
}

const merged = parts.join("\n");
const outFile = path.join(distDir, "style.css");
fs.writeFileSync(outFile, merged);

// 5. 清理中间的 hash 文件（保留无 hash 的独立 CSS 和全量 style.css）
fs.unlinkSync(globalScssFile);
const allCssToClean = fs
  .readdirSync(distDir)
  .filter(
    f =>
      f.startsWith('C_') &&
      f.endsWith('.css') &&
      /-[a-zA-Z0-9_-]+\.css$/.test(f)
  )
  .map(f => path.join(distDir, f))
for (const file of allCssToClean) {
  fs.unlinkSync(file)
}

const sizeKB = (Buffer.byteLength(merged) / 1024).toFixed(1);
console.log(
  `✅ Merged ${sfcCssFiles.length} SFC CSS + global SCSS → dist/style.css (${sizeKB} KB)`,
);
console.log(
  `✅ Preserved ${sfcCssFiles.length} individual component CSS files for on-demand import`
)
