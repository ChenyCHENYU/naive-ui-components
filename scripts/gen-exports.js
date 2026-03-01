
/**
 * 构建后自动更新 package.json 的 exports 映射
 * 使用 Node.js subpath patterns（通配符 *）统一匹配所有 C_ 组件
 * 无需逐个枚举 — 新增组件自动被覆盖
 */
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distDir = path.resolve(__dirname, '../dist')
const pkgPath = path.resolve(__dirname, '../package.json')

const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

// 统计组件数量（仅用于日志）
const componentNames = fs
  .readdirSync(distDir)
  .filter(f => /^C_[A-Za-z]+\.js$/.test(f))
  .map(f => f.replace('.js', ''))
  .sort()

// 使用 subpath patterns —— 一条通配规则覆盖所有 C_* 组件
pkg.exports = {
  '.': {
    types: './dist/index.d.ts',
    import: './dist/index.js',
    require: './dist/index.cjs',
  },
  './style.css': './dist/style.css',
  './resolver': {
    types: './dist/resolver.d.ts',
    import: './dist/resolver.js',
    require: './dist/resolver.cjs',
  },
  './C_*': {
    types: './dist/C_*.d.ts',
    import: './dist/C_*.js',
    require: './dist/C_*.cjs',
  },
  './C_*/style.css': './dist/C_*.css',
}

pkg.sideEffects = ['dist/style.css', 'dist/C_*.css']

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(
  `✅ Updated package.json exports: ${componentNames.length} components (wildcard pattern) + main entry + style.css`
)
