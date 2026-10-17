import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const declarationTarget = (filename, specifier) => {
  const target = path.resolve(path.dirname(filename), specifier)
  if (/\.d\.(?:ts|mts|cts)$/.test(target)) return target
  if (target.endsWith('.cjs')) return target.slice(0, -4) + '.d.cts'
  if (target.endsWith('.mjs')) return target.slice(0, -4) + '.d.mts'
  if (target.endsWith('.js')) return target.slice(0, -3) + '.d.ts'
  return `${target}.d.ts`
}

/** Follow both declaration formats; public barrels may forward to shared chunks. */
export function assertDeclarationBoundary(distDir, entryNames) {
  const visited = new Set()
  const queue = entryNames.flatMap(name =>
    ['d.ts', 'd.cts'].map(extension =>
      path.join(distDir, `${name}.${extension}`)
    )
  )
  while (queue.length > 0) {
    const filename = queue.pop()
    if (visited.has(filename)) continue
    visited.add(filename)
    const relative = path.relative(distDir, filename)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new Error(`Published declaration escapes dist: ${relative}`)
    }
    if (!fs.existsSync(filename)) {
      throw new Error(`Missing reachable declaration: ${relative}`)
    }
    const source = fs.readFileSync(filename, 'utf8')
    for (const { fileName: specifier } of ts.preProcessFile(source, true)
      .importedFiles) {
      if (/^naive-ui\/(?:es|lib)(?:\/|$)/.test(specifier)) {
        throw new Error(
          `${relative} uses a Naive UI internal path: ${specifier}`
        )
      }
      if (specifier.startsWith('.')) {
        queue.push(declarationTarget(filename, specifier))
      }
    }
  }
  return visited.size
}
