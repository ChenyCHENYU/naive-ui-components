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

// 递归收集所有 index.scss
function collectScssFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(collectScssFiles(fullPath));
    } else if (stat.isFile() && item === "index.scss") {
      const relativePath = path.relative(path.dirname(outFile), fullPath).replace(/\\/g, "/");
      files.push(relativePath);
    }
  }
  return files;
}

// 生成 global.scss
function generateGlobalScss() {
  const files = collectScssFiles(componentsDir);
  const content = files.map(file => `@forward '${file}';`).join("\n");
  fs.writeFileSync(outFile, content);
  console.log(`✅ Generated global.scss with ${files.length} SCSS modules`);
}

generateGlobalScss();