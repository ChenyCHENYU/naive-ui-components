// ESM 写法
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

// 解决 __dirname / __filename 在 ESM 不能直接用的问题
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 组件目录
const componentsDir = path.resolve(__dirname, "../src/components");
const outFile = path.resolve(__dirname, "../src/styles/global.scss");

// 收集各组件的顶层 index.scss（不递归进子目录，避免 mixin 重复注册）
function collectScssFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      // 只取各组件目录下的直属 index.scss
      const scssPath = path.join(fullPath, "index.scss");
      if (fs.existsSync(scssPath)) {
        const relativePath = path
          .relative(path.dirname(outFile), scssPath)
          .replace(/\\/g, "/");
        files.push(relativePath);
      }
    }
  }
  return files;
}

// 生成 global.scss
function generateGlobalScss() {
  const files = collectScssFiles(componentsDir);

  // 先转发 variables.scss（CSS 变量基础层）
  const lines = [`@forward './variables';`];
  // 再转发各组件的 SCSS（@forward 是 barrel 聚合的标准方式，不会产生命名空间冲突）
  lines.push(...files.map((file) => `@forward '${file}';`));

  const content = lines.join("\n");
  fs.writeFileSync(outFile, content);
  console.log(
    `✅ Generated global.scss with ${files.length} SCSS modules + variables`,
  );
}

generateGlobalScss();
