/**
 * 根据 dist/ 产物自动更新 package.json 的 exports 映射
 * 在 build 的最后一步执行，确保 subpath exports 与产物同步
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distDir = path.resolve(__dirname, "../dist");
const pkgPath = path.resolve(__dirname, "../package.json");

const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf-8"));

// 收集所有组件入口（有 .js + .d.ts + .cjs + .d.cts 的完整 C_ 开头文件）
const componentNames = fs
  .readdirSync(distDir)
  .filter((f) => /^C_[A-Za-z]+\.js$/.test(f))
  .map((f) => f.replace(".js", ""))
  .sort();

// 构建 exports 映射
const exports = {
  // 主入口
  ".": {
    types: "./dist/index.d.ts",
    import: "./dist/index.js",
    require: "./dist/index.cjs",
  },
  // 全局样式
  "./style.css": "./dist/style.css",
};

// 每个组件的 subpath export
for (const name of componentNames) {
  const hasEsmDts = fs.existsSync(path.join(distDir, `${name}.d.ts`));
  const hasCjs = fs.existsSync(path.join(distDir, `${name}.cjs`));

  const entry = {};
  if (hasEsmDts) entry.types = `./dist/${name}.d.ts`;
  entry.import = `./dist/${name}.js`;
  if (hasCjs) entry.require = `./dist/${name}.cjs`;

  exports[`./${name}`] = entry;
}

pkg.exports = exports;

// 更新 sideEffects（style.css 是唯一有副作用的文件）
pkg.sideEffects = ["dist/style.css"];

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + "\n");
console.log(
  `✅ Updated package.json exports: ${componentNames.length} component subpaths + main entry + style.css`,
);
