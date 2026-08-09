/**
 * 构建后校验公共 JS / DTS 入口，防止内部同名入口覆盖 package.json 指向的根声明。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const packageJson = JSON.parse(
  fs.readFileSync(path.join(root, 'package.json'), 'utf8')
)
const rootTypes = fs.readFileSync(
  path.join(root, packageJson.types.replace('./', '')),
  'utf8'
)
const menuTypes = fs.readFileSync(
  path.join(root, 'dist', 'C_Menu.d.ts'),
  'utf8'
)

const requiredRootExports = ['C_Table', 'CascadeItem', 'createMenuOptions']
const missingExports = requiredRootExports.filter(
  exportName => !rootTypes.includes(exportName)
)

if (missingExports.length > 0) {
  console.error(`❌ 根声明入口缺少导出: ${missingExports.join(', ')}`)
  process.exit(1)
}

if (!menuTypes.includes('createMenuOptions')) {
  console.error('❌ C_Menu 子路径声明缺少 createMenuOptions')
  process.exit(1)
}

if (Object.keys(packageJson.exports).some(key => key.startsWith('./_'))) {
  console.error('❌ 内部下划线入口不应出现在 package exports 中')
  process.exit(1)
}

console.log('✅ Public JS / DTS entries are valid.')
