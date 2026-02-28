/**
 * 检测组件库 barrel re-exports 是否存在命名冲突
 * 运行: bun run check:exports
 *
 * 原理：解析每个组件 index.ts 的导出名称，找出跨组件重名
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const componentsDir = path.resolve(__dirname, "../src/components");

// 收集每个组件的导出名
const exportMap = new Map(); // name → [component1, component2, ...]

for (const dir of fs.readdirSync(componentsDir).sort()) {
  const fullDir = path.join(componentsDir, dir);
  if (!fs.statSync(fullDir).isDirectory()) continue;

  const indexPath = path.join(fullDir, "index.ts");
  if (!fs.existsSync(indexPath)) continue;

  const content = fs.readFileSync(indexPath, "utf-8");
  const exports = new Set();

  // 匹配 export { X, Y as Z } from ...
  const namedRe = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  for (const match of content.matchAll(namedRe)) {
    const names = match[1].split(",").map((s) => {
      const trimmed = s.trim();
      // 处理 "X as Y" 形式，取别名 Y
      const asMatch = trimmed.match(/\w+\s+as\s+(\w+)/);
      return asMatch ? asMatch[1] : trimmed.split(/\s/)[0];
    });
    names.filter(Boolean).forEach((n) => exports.add(n));
  }

  // 匹配 export { default as X }
  const defaultAsRe = /export\s+\{\s*default\s+as\s+(\w+)\s*\}/g;
  for (const match of content.matchAll(defaultAsRe)) {
    exports.add(match[1]);
  }

  // 匹配 export const/function/class X
  const declRe = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  for (const match of content.matchAll(declRe)) {
    exports.add(match[1]);
  }

  // 匹配 export type X = ...
  const typeRe = /export\s+type\s+(\w+)\s*[=<{]/g;
  for (const match of content.matchAll(typeRe)) {
    exports.add(match[1]);
  }

  // 匹配 export * from "..." — 需要递归解析目标文件
  const starRe = /export\s+\*\s+from\s+["']([^"']+)["']/g;
  for (const match of content.matchAll(starRe)) {
    const target = match[1];
    const resolvedTarget = resolveImportPath(fullDir, target);
    if (resolvedTarget) {
      const targetExports = getFileExports(resolvedTarget);
      targetExports.forEach((n) => exports.add(n));
    }
  }

  for (const name of exports) {
    if (!exportMap.has(name)) exportMap.set(name, []);
    exportMap.get(name).push(dir);
  }
}

function resolveImportPath(baseDir, importPath) {
  const extensions = [".ts", ".tsx", "/index.ts", ".js", "/index.js"];
  const base = path.resolve(baseDir, importPath);
  for (const ext of extensions) {
    const fullPath = base + ext;
    if (fs.existsSync(fullPath)) return fullPath;
  }
  if (fs.existsSync(base) && fs.statSync(base).isFile()) return base;
  return null;
}

function getFileExports(filePath) {
  const exports = new Set();
  if (!fs.existsSync(filePath)) return exports;
  const content = fs.readFileSync(filePath, "utf-8");

  const namedRe = /export\s+(?:type\s+)?\{([^}]+)\}/g;
  for (const match of content.matchAll(namedRe)) {
    match[1]
      .split(",")
      .map((s) => {
        const trimmed = s.trim();
        const asMatch = trimmed.match(/\w+\s+as\s+(\w+)/);
        return asMatch ? asMatch[1] : trimmed.split(/\s/)[0];
      })
      .filter(Boolean)
      .forEach((n) => exports.add(n));
  }

  const declRe = /export\s+(?:const|let|var|function|class)\s+(\w+)/g;
  for (const match of content.matchAll(declRe)) {
    exports.add(match[1]);
  }

  const typeRe = /export\s+type\s+(\w+)\s*[=<{]/g;
  for (const match of content.matchAll(typeRe)) {
    exports.add(match[1]);
  }

  return exports;
}

// 找出冲突
const conflicts = [];
for (const [name, components] of exportMap) {
  if (components.length > 1) {
    conflicts.push({ name, components });
  }
}

// 输出结果
if (conflicts.length === 0) {
  console.log("✅ No export conflicts detected across all components.");
  process.exit(0);
} else {
  console.error(`❌ Found ${conflicts.length} export name conflict(s):\n`);
  for (const { name, components } of conflicts) {
    console.error(`  "${name}" is exported by: ${components.join(", ")}`);
  }
  process.exit(1);
}
