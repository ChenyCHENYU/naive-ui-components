/*
 * @Author: ChenYu ycyplus@gmail.com
 * @Date: 2025-08-15 16:59:25
 * @LastEditors: ChenYu ycyplus@gmail.com
 * @LastEditTime: 2025-08-15 16:59:33
 * @FilePath: \naive-ui-components\scripts\watch-global-scss.js
 * @Description: 开发模式下监听 SCSS 文件变动并自动重新生成 global.scss
 * Copyright (c) 2025 by CHENY, All Rights Reserved 😎.
 */
import fs from 'fs'
import chokidar from 'chokidar'
import { fileURLToPath } from 'url'

const componentsDir = fileURLToPath(
  new URL('../src/components', import.meta.url)
)
const outFile = fileURLToPath(
  new URL('../src/styles/global.scss', import.meta.url)
)

function generateGlobalScss() {
  const content = "@forward './variables';\n"
  fs.writeFileSync(outFile, content)
  console.log('✅ Updated global.scss with shared variables only')
}

generateGlobalScss()

const watcher = chokidar.watch(componentsDir, { ignoreInitial: true })
watcher.on('add', p => {
  if (p.endsWith('index.scss')) generateGlobalScss()
})
watcher.on('unlink', p => {
  if (p.endsWith('index.scss')) generateGlobalScss()
})
