// scripts/gen-global-scss.js
const fs = require("fs");
const path = require("path");

// 组件目录（假设放在 src/components 下）
const componentsDir = path.resolve(__dirname, "../src/components");
const outFile = path.resolve(__dirname, "../src/styles/global.scss");

// 遍历 components，找到 index.scss
function collectScssFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files = files.concat(collectScssFiles(fullPath));
    } else if (stat.isFile() && item === "index.scss") {
      // 转换成相对路径（Sass 可用）
      const relativePath = path.relative(path.dirname(outFile), fullPath).replace(/\\/g, "/");
      files.push(relativePath);
    }
  }
  return files;
}

const files = collectScssFiles(componentsDir);

// 生成 global.scss 内容
const content = files
  .map(file => `@forward '${file}';`)
  .join("\n");

// 写入文件
fs.writeFileSync(outFile, content);

console.log(`✅ Generated global.scss with ${files.length} component styles`);