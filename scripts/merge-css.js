/**
 * 合并 CSS：将所有 SFC scoped 样式 + 全局 SCSS 编译产物合并为 dist/style.css
 * 构建流程：tsdown → sass CLI → merge-css.js
 *
 * 最终产物:
 *   dist/style.css — 消费者唯一需要导入的样式文件
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");

// 1. 收集 SFC scoped CSS（tsdown 产出的 C_*.css 文件）
const sfcCssFiles = fs
  .readdirSync(distDir)
  .filter((f) => f.startsWith("C_") && f.endsWith(".css"))
  .sort()
  .map((f) => path.join(distDir, f));

// 2. 读取全局 SCSS 编译产物
const globalScssFile = path.join(distDir, "global-scss.css");
const globalScss = fs.existsSync(globalScssFile)
  ? fs.readFileSync(globalScssFile, "utf-8")
  : "";

// 3. 合并：全局变量/样式在前，SFC scoped 在后
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

// 4. 清理中间文件
fs.unlinkSync(globalScssFile);
for (const file of sfcCssFiles) {
  fs.unlinkSync(file);
}

const sizeKB = (Buffer.byteLength(merged) / 1024).toFixed(1);
console.log(
  `✅ Merged ${sfcCssFiles.length} SFC CSS + global SCSS → dist/style.css (${sizeKB} KB)`,
);
