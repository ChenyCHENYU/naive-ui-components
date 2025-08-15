/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-15 16:59:25
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-08-15 16:59:33
 * @FilePath: \naive-ui-components\scripts\watch-global-scss.js
 * @Description:
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

function collectScssFiles(dir) {
  let files = [];
  const items = fs.readdirSync(dir);
  for (const item of items) {
    const fullPath = path.join(dir, item);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      files = files.concat(collectScssFiles(fullPath));
    } else if (stat.isFile() && item === "index.scss") {
      const relativePath = path
        .relative(path.dirname(outFile), fullPath)
        .replace(/\\/g, "/");
      files.push(relativePath);
    }
  }
  return files;
}

function generateGlobalScss() {
  const files = collectScssFiles(componentsDir);
  const content = files.map((file) => `@forward '${file}';`).join("\n");
  fs.writeFileSync(outFile, content);
  console.log(`✅ Updated global.scss with ${files.length} SCSS modules`);
}

generateGlobalScss();

const watcher = chokidar.watch(componentsDir, { ignoreInitial: true });
watcher.on("add", (p) => {
  if (p.endsWith("index.scss")) generateGlobalScss();
});
watcher.on("unlink", (p) => {
  if (p.endsWith("index.scss")) generateGlobalScss();
});
