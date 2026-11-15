import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

/** Count type syntax only; comments, strings and static HTML are not assertions. */
function countTypes(code, filename) {
  const ast = ts.createSourceFile(
    filename,
    code,
    ts.ScriptTarget.Latest,
    true,
    filename.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  )
  let count = 0
  const visit = node => {
    if (node.kind === ts.SyntaxKind.AnyKeyword) count++
    ts.forEachChild(node, visit)
  }
  visit(ast)
  return count
}

/** Inspect bindings, dynamic arguments and interpolations from Vue's parsed template. */
function countTemplateTypes(node, filename) {
  let count = 0
  const expression = (code, parameters = false) => {
    if (typeof code === 'string')
      count += countTypes(
        parameters ? `(${code}) => {}` : `(${code})`,
        filename
      )
  }
  // Interpolations contain an expression node; ordinary text/comments contain strings.
  if (node.content && typeof node.content === 'object')
    expression(node.content.content)
  for (const prop of node.props ?? []) {
    // Slot bindings are function parameters, including typed destructuring.
    expression(prop.exp?.content, prop.name === 'slot')
    if (prop.arg?.isStatic === false) expression(prop.arg.content)
  }
  for (const child of node.children ?? [])
    count += countTemplateTypes(child, filename)
  return count
}

export function countExplicitAny(source, filename) {
  if (!filename.endsWith('.vue')) return countTypes(source, filename)
  const { descriptor, errors } = parse(source, { filename })
  if (errors.length)
    throw new SyntaxError(`Cannot inspect ${filename}: ${errors.join('; ')}`)
  const scriptCount = [descriptor.script, descriptor.scriptSetup].reduce(
    (count, block) =>
      count +
      (block
        ? countTypes(
            block.content,
            block.lang === 'tsx' ? `${filename}.tsx` : filename
          )
        : 0),
    0
  )
  const generic = descriptor.scriptSetup?.attrs.generic
  return (
    scriptCount +
    (typeof generic === 'string'
      ? countTypes(`type Generic<${generic}> = unknown`, filename)
      : 0) +
    (descriptor.template?.ast
      ? countTemplateTypes(descriptor.template.ast, filename)
      : 0)
  )
}
