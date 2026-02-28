/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-15 16:59:25
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-08-15 16:59:33
 * @FilePath: \naive-ui-components\scripts\watch-global-scss.js
 * @Description: 开发模式下监听 SCSS 文件变动并自动重新生成 global.scss
 * Copyright (c) 2025 by CHENY, All Rights Reserved 😎.
 */
import fs from "fs";
import path from "path";
import chokidar from "chokidar";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const componentsDir = path.resolve(__dirname, "../src/components");
const outFile = path.resolve(__dirname, "../src/styles/global.scss");

// 只取各组件目录下的直属 index.scss（不递归进子目录，避免 mixin 重复注册）
function collectScssFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
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

function generateGlobalScss() {
  const files = collectScssFiles(componentsDir);

  // 先转发 variables.scss（CSS 变量基础层）
  const lines = [`@forward './variables';`];
  // 再转发各组件的 SCSS（@forward 是 barrel 聚合的标准方式，不会产生命名空间冲突）
  lines.push(...files.map((file) => `@forward '${file}';`));

  const content = lines.join("\n");
  fs.writeFileSync(outFile, content);
  console.log(
    `✅ Updated global.scss with ${files.length} SCSS modules + variables`,
  );
}

generateGlobalScss();

const watcher = chokidar.watch(componentsDir, { ignoreInitial: true });
watcher.on("add", (p) => {
  if (p.endsWith("index.scss")) generateGlobalScss();
});
watcher.on("unlink", (p) => {
  if (p.endsWith("index.scss")) generateGlobalScss();
});
