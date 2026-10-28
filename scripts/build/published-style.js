import fs from 'node:fs'
import path from 'node:path'
import { parse } from 'postcss'

/** 发布 CSS 的显式共享边界；base 入口保持独立展开，完整入口保留原有依赖能力。 */
export const SHARED_COMPONENT_STYLES = Object.freeze({
  C_Form: { imports: ['C_Editor.css'], external: ['C_Editor'] },
  C_Table: { imports: ['C_Form.css'], external: ['C_Form'] },
  C_FormModal: { imports: ['C_Form.css'], external: ['C_Form'] },
  C_DataPicker: { imports: ['C_Table.base.css'], external: ['C_Table'] },
  C_BatchResult: { imports: ['C_Table.base.css'], external: ['C_Table'] },
})

/** 原生相对 @import 由浏览器或消费侧构建器解析，不物理复制同一依赖样式。 */
export function createComponentStyleEntry(name, globalStyle, resolveStyles) {
  const shared = SHARED_COMPONENT_STYLES[name]
  const imports = shared?.imports.map(entry => `@import "./${entry}";`) ?? []
  return [
    ...imports,
    ...(shared ? [] : [globalStyle]),
    ...resolveStyles(new Set(shared?.external ?? [])),
  ]
    .filter(Boolean)
    .join('\n')
}

/** 严格展开本地发布闭包用于体积与完整性检查；所有文件仍计入物理总包预算。 */
export function readPublishedStyle(directory, entry) {
  const rootDirectory = fs.realpathSync(directory)
  const active = new Set()
  const read = filename => {
    const relative = path.relative(rootDirectory, filename)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Published CSS escapes dist: ${relative}`)
    }
    if (!fs.existsSync(filename))
      throw new Error(`Missing published CSS: ${relative}`)
    const real = fs.realpathSync(filename)
    const realRelative = path.relative(rootDirectory, real)
    if (realRelative.startsWith('..') || path.isAbsolute(realRelative))
      throw new Error(`Published CSS symlink escapes dist: ${relative}`)
    if (active.has(real))
      throw new Error(`Circular published CSS import: ${relative}`)
    active.add(real)
    try {
      const css = parse(fs.readFileSync(real, 'utf8'), { from: real })
      let bodyStarted = false
      // replaceWith 会修改 css.nodes，必须遍历原始节点快照。
      for (const node of css.nodes.slice()) {
        if (node.type === 'comment') continue
        if (node.type === 'atrule' && node.name.toLowerCase() === 'charset')
          continue
        if (node.type !== 'atrule' || node.name.toLowerCase() !== 'import') {
          bodyStarted = true
          continue
        }
        if (bodyStarted)
          throw new Error(
            `Published CSS import must precede rules: ${relative}`
          )
        const target = /^(['"])(\.\.?\/[^'"?#]+\.css)\1$/.exec(node.params)?.[2]
        if (!target)
          throw new Error(
            `Unsupported published CSS import in ${relative}: ${node.params}`
          )
        const imported = read(path.resolve(path.dirname(real), target))
        node.replaceWith(...imported.nodes)
      }
      css.walkAtRules(/^import$/i, node => {
        throw new Error(
          `Nested published CSS import in ${relative}: ${node.params}`
        )
      })
      return css
    } finally {
      active.delete(real)
    }
  }
  return read(path.resolve(rootDirectory, entry)).toString()
}
